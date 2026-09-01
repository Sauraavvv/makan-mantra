import { NextRequest, NextResponse } from "next/server";
import {
  getAuthDbErrorMessage,
  getPropertySubmissionsCollection,
  getUsersCollection,
} from "@/lib/auth/db";
import { getLiveSession } from "@/lib/auth/session";
import { sendPropertyConfirmationEmail } from "@/lib/auth/email";
import { normalizeEmail } from "@/lib/auth/normalize";
import {
  createSetPasswordToken,
  randomPassword,
  setPasswordUrl,
} from "@/lib/auth/set-password";
import bcrypt from "bcryptjs";
import {
  markAssetsSaved,
  verifyAsset,
  UPLOAD_FOLDER,
  type UploadedAsset,
} from "@/lib/cloudinary";
import { PROPERTY_TYPES } from "@/lib/constants/propertyTypes";
import { insertWithPid } from "@/lib/property-id";

const LISTING_TYPES = ["buy", "rent"] as const;
// A submission that came through the assistant, so the desk that gets it
// knows no photos were possible and the owner has not seen the wizard.
const SOURCES = ["banner", "post_property_page", "chatbot"] as const;
const USER_TYPES = ["owner", "builder", "broker"] as const;

const MAX_FILES = 6;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const MAX_VIDEO_BYTES = 8 * 1024 * 1024;
const MAX_TOTAL_BYTES = 10 * 1024 * 1024;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[6-9]\d{9}$/;

function text(form: FormData, key: string) {
  return String(form.get(key) || "").trim();
}

export async function POST(req: NextRequest) {
  let form: FormData;

  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form submission" }, { status: 400 });
  }

  const propertyType = text(form, "property_type");
  const listingType = text(form, "listing_type");
  const details = text(form, "details");
  const source = text(form, "source");

  const userType = text(form, "user_type");
  const ownerName = text(form, "owner_name");
  const ownerEmail = normalizeEmail(text(form, "owner_email"));
  const ownerPhone = text(form, "owner_phone");
  const wantsAccount = text(form, "create_account") === "true";

  if (!(propertyType in PROPERTY_TYPES)) {
    return NextResponse.json({ error: "Please select a valid property type" }, { status: 400 });
  }

  if (!LISTING_TYPES.includes(listingType as (typeof LISTING_TYPES)[number])) {
    return NextResponse.json({ error: "Please select a valid listing type" }, { status: 400 });
  }

  if (userType && !USER_TYPES.includes(userType as (typeof USER_TYPES)[number])) {
    return NextResponse.json({ error: "Please select who is posting this property" }, { status: 400 });
  }

  if (ownerEmail && !EMAIL_PATTERN.test(ownerEmail)) {
    return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
  }

  if (ownerPhone && !PHONE_PATTERN.test(ownerPhone)) {
    return NextResponse.json(
      { error: "Please enter a valid 10-digit phone number" },
      { status: 400 },
    );
  }

  // The browser uploads to Cloudinary directly and posts back the ids. What it
  // claims about those assets is not trusted — Cloudinary is asked for the real
  // size and dimensions before anything is stored.
  let claimed: { public_id: string; kind: "image" | "video" }[];

  try {
    const raw = JSON.parse(text(form, "media") || "[]");
    claimed = Array.isArray(raw) ? raw : [];
  } catch {
    return NextResponse.json({ error: "Invalid media payload" }, { status: 400 });
  }

  if (claimed.length > MAX_FILES) {
    return NextResponse.json({ error: `You can upload up to ${MAX_FILES} files` }, { status: 400 });
  }

  const media: UploadedAsset[] = [];

  for (const entry of claimed) {
    const kind = entry?.kind === "video" ? "video" : "image";

    if (typeof entry?.public_id !== "string" || !entry.public_id.startsWith(UPLOAD_FOLDER)) {
      return NextResponse.json({ error: "Invalid media reference" }, { status: 400 });
    }

    let asset: UploadedAsset;
    try {
      asset = await verifyAsset(entry.public_id, kind);
    } catch {
      return NextResponse.json({ error: "One of your uploads could not be found" }, { status: 400 });
    }

    const limit = asset.kind === "video" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (asset.bytes > limit) {
      return NextResponse.json(
        { error: `An uploaded ${asset.kind} is larger than ${asset.kind === "video" ? "8MB" : "2MB"}` },
        { status: 400 },
      );
    }

    media.push(asset);
  }

  if (media.reduce((sum, asset) => sum + asset.bytes, 0) > MAX_TOTAL_BYTES) {
    return NextResponse.json({ error: "Total upload size must stay under 10MB" }, { status: 400 });
  }

  try {
    // Must be the live session: a stale cookie would look like "already has an
    // account" and quietly skip creating one, so no link would ever be sent.
    const session = await getLiveSession();
    let userId = session?.userId ?? null;
    let accountCreated = false;
    // Rides along in the confirmation email rather than going out on its own.
    let setPasswordLink: string | undefined;
    // Dev only — lets the flow be walked end to end before a sending domain is
    // verified, the same way the signup OTP falls back to `devOtp`.
    let devSetPasswordUrl: string | undefined;

    // The owner opted in to an account, so create one when the email is new.
    // An existing email is never signed into here — that would need verification.
    if (!session && wantsAccount && ownerEmail && ownerName) {
      const users = await getUsersCollection();
      const existing = await users.findOne({ email: ownerEmail });

      if (!existing) {
        // Nobody chose a password here. A random one keeps the account shaped
        // like every other user, and the emailed link is how the owner replaces
        // it — which is also what proves the mailbox is theirs. No session is
        // handed out before that, so an address cannot be squatted by typing it.
        const setPassword = createSetPasswordToken();

        const created = await users.insertOne({
          name: ownerName,
          email: ownerEmail,
          phone: ownerPhone || null,
          password: await bcrypt.hash(randomPassword(), 12),
          role: "user",
          email_verified: false,
          provider: "post_property",
          set_password_token: setPassword.hash,
          set_password_expires: setPassword.expires,
          created_at: new Date(),
        });

        userId = created.insertedId.toString();
        accountCreated = true;
        setPasswordLink = setPasswordUrl(req.nextUrl.origin, setPassword.token);
      }
    }

    const submissions = await getPropertySubmissionsCollection();

    // A signed-in owner does not retype what we already know about them.
    const contactName = session?.name || ownerName || null;
    const contactEmail = session?.email || ownerEmail || null;

    const { pid, insertedId } = await insertWithPid(submissions, (nextPid) => ({
      pid: nextPid,
      property_type: propertyType,
      listing_type: listingType,
      // The wizard collects location and price inside the free-text `details`
      // field, so there are no separate columns for them any more.
      details: details || null,
      media,
      user_type: userType || null,
      owner_name: contactName,
      owner_email: contactEmail,
      owner_phone: ownerPhone || null,
      account_consent: wantsAccount,
      source: (SOURCES as readonly string[]).includes(source) ? source : "banner",
      user_id: userId,
      user_email: contactEmail,
      status: "pending_review",
      created_at: new Date(),
    }));

    // The assets are spoken for now, so drop the `draft` tag that marks them
    // as sweepable. A failure here is not worth losing the submission over.
    if (media.length > 0) {
      await markAssetsSaved(media, insertedId.toString()).catch(() => {});
    }

    // One receipt per submission, carrying the PID and — for an account opened
    // by this very submission — the set-password link. The listing matters more
    // than the mail: a send failure is logged, never fatal.
    let confirmationEmailSent = false;

    if (contactEmail) {
      try {
        await sendPropertyConfirmationEmail(contactEmail, contactName || "there", {
          pid,
          propertyType:
            PROPERTY_TYPES[propertyType as keyof typeof PROPERTY_TYPES] ?? propertyType,
          listingType: listingType === "rent" ? "For Rent" : "For Sale",
          details: details || null,
          mediaCount: media.length,
          setPasswordLink,
        });
        confirmationEmailSent = true;
      } catch (error) {
        console.error("[post-property] confirmation email failed:", error);
        if (process.env.NODE_ENV !== "production" && setPasswordLink) {
          devSetPasswordUrl = setPasswordLink;
        }
      }
    }

    return NextResponse.json({
      success: true,
      id: insertedId.toString(),
      pid,
      account_created: accountCreated,
      confirmation_email_sent: confirmationEmailSent,
      dev_set_password_url: devSetPasswordUrl,
    });
  } catch (error) {
    return NextResponse.json({ error: getAuthDbErrorMessage(error) }, { status: 503 });
  }
}
