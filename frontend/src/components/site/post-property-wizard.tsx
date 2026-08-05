"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Film,
  Home,
  ImagePlus,
  Mail,
  Phone,
  Plus,
  Send,
  ShieldCheck,
  UserRound,
  Video,
  X,
} from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PROPERTY_TYPES, type PropertyType } from "@/lib/constants/propertyTypes";
import { uploadToCloudinary, type CloudinaryAsset } from "@/lib/cloudinary-upload";
import { cldThumb } from "@/lib/cloudinary-url";
import { cn } from "@/lib/utils";

/**
 * A file the owner picked. Uploading starts immediately so the media is already
 * on Cloudinary by the time they reach the publish button.
 */
type Upload = {
  id: string;
  name: string;
  size: number;
  kind: "image" | "video";
  status: "uploading" | "done" | "error";
  progress: number;
  asset?: CloudinaryAsset;
  error?: string;
};

const LISTING_OPTIONS = [
  { value: "buy", label: "For Sale" },
  { value: "rent", label: "For Rent" },
] as const;

type ListingChoice = (typeof LISTING_OPTIONS)[number]["value"];

const USER_TYPE_OPTIONS = [
  { value: "owner", label: "Owner" },
  { value: "builder", label: "Builder" },
  { value: "broker", label: "Broker" },
] as const;

type UserTypeChoice = (typeof USER_TYPE_OPTIONS)[number]["value"];

const STEPS = [
  {
    icon: Home,
    title: "Property Details",
    copy: "Type, listing and what makes it special",
  },
  {
    icon: UserRound,
    title: "Owner Details",
    copy: "How buyers and our team reach you",
  },
  {
    icon: ImagePlus,
    title: "Photos & Videos",
    copy: "Add photos and a walkthrough video",
  },
];

/** One illustration per step, shown beside the form on wide screens. */
const POSES = [
  {
    src: "/pose-1.webp",
    alt: "Let's get your property listed!",
    width: 651,
    height: 1186,
  },
  {
    src: "/pose-2.webp",
    alt: "Let's add my details so buyers can reach me easily!",
    width: 639,
    height: 1116,
  },
];

const MAX_FILES = 6;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const MAX_VIDEO_BYTES = 8 * 1024 * 1024;
const MAX_TOTAL_BYTES = 10 * 1024 * 1024;

const DETAILS_PLACEHOLDER = [
  "Example:",
  "3 BHK",
  "1200 sq.ft",
  "5th Floor",
  "₹50,00,000",
  "Semi-Furnished",
  "2 Car Parking",
  "Sector 62, Noida, UP",
].join("\n");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[6-9]\d{9}$/;

const labelClass = "mb-1.5 block text-[13px] font-semibold text-primary";
const fieldClass =
  "h-12 w-full rounded-lg border border-border bg-background text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/60 focus:ring-3 focus:ring-primary/15";
const selectClass = `${fieldClass} gap-2 pl-3 pr-2 text-sm data-[size=default]:h-12`;
const cardClass = "rounded-[20px] border border-border bg-background p-6";
const cardTitleClass = "text-[13px] font-bold uppercase tracking-wide text-muted-foreground";

/**
 * Three-step property posting form.
 *
 * `cards` (post-property page) reveals each step as its own card side by side;
 * `compact` (home banner) swaps the steps inside a single card.
 */
export function PostPropertyWizard({
  variant = "cards",
  source = "post_property_page",
  className,
}: {
  variant?: "cards" | "compact";
  source?: "banner" | "post_property_page";
  className?: string;
}) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const uploadIdRef = useRef(0);

  const [step, setStep] = useState(0);

  const [propertyType, setPropertyType] = useState<PropertyType | null>(null);
  const [listingType, setListingType] = useState<ListingChoice>("buy");
  const [details, setDetails] = useState("");

  const [userType, setUserType] = useState<UserTypeChoice>("owner");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");

  const [uploads, setUploads] = useState<Upload[]>([]);
  const images = uploads.filter((item) => item.kind === "image");
  const videos = uploads.filter((item) => item.kind === "video");
  const [createAccount, setCreateAccount] = useState(true);

  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");
  const [error, setError] = useState<string | null>(null);
  const [accountCreated, setAccountCreated] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [devSetPasswordUrl, setDevSetPasswordUrl] = useState<string | null>(null);

  // The confirmation art shows briefly, then the card goes back to a blank form.
  useEffect(() => {
    if (status !== "success") return;

    const timer = setTimeout(() => setStatus("idle"), 3000);
    return () => clearTimeout(timer);
  }, [status]);

  const addFiles = (kind: "image" | "video", fileList: FileList | null) => {
    if (!fileList?.length) return;

    const picked = Array.from(fileList);
    const limit = kind === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
    const inputRef = kind === "image" ? imageInputRef : videoInputRef;

    for (const file of picked) {
      if (!file.type.startsWith(`${kind}/`)) {
        setError(`"${file.name}" is not ${kind === "image" ? "an image" : "a video"}.`);
        return;
      }
      if (file.size > limit) {
        setError(`"${file.name}" is larger than ${kind === "image" ? "2MB" : "8MB"}.`);
        return;
      }
    }

    const room = MAX_FILES - uploads.length;
    const accepted = picked.slice(0, room);
    const used = uploads.reduce((sum, item) => sum + item.size, 0);

    if (used + accepted.reduce((sum, file) => sum + file.size, 0) > MAX_TOTAL_BYTES) {
      setError("Total upload size must stay under 10MB.");
      return;
    }

    setError(null);
    if (inputRef.current) inputRef.current.value = "";

    for (const file of accepted) {
      uploadIdRef.current += 1;
      const id = `upload-${uploadIdRef.current}`;

      setUploads((current) => [
        ...current,
        { id, name: file.name, size: file.size, kind, status: "uploading", progress: 0 },
      ]);

      const patch = (changes: Partial<Upload>) =>
        setUploads((current) =>
          current.map((item) => (item.id === id ? { ...item, ...changes } : item)),
        );

      uploadToCloudinary(file, kind, (progress) => patch({ progress }))
        .then((asset) => patch({ status: "done", progress: 100, asset }))
        .catch((uploadError: Error) =>
          patch({ status: "error", error: uploadError.message || "Upload failed." }),
        );
    }
  };

  const removeFile = (id: string) => {
    // The asset keeps its `draft` tag on Cloudinary and is swept up later, so
    // nothing has to be deleted here.
    setUploads((current) => current.filter((item) => item.id !== id));
  };

  const validateStep = (index: number) => {
    if (index === 0 && !propertyType) return "Please select a property type.";

    if (index === 1) {
      if (!ownerName.trim()) return "Please enter your name.";
      if (!EMAIL_PATTERN.test(ownerEmail.trim())) return "Please enter a valid email address.";
      if (!PHONE_PATTERN.test(ownerPhone.trim())) {
        return "Please enter a valid 10-digit phone number.";
      }
    }

    return null;
  };

  const goNext = () => {
    const message = validateStep(step);
    if (message) return setError(message);

    setError(null);
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  };

  const goBack = () => {
    setError(null);
    setStep((current) => Math.max(current - 1, 0));
  };

  const resetForm = () => {
    setStep(0);
    setPropertyType(null);
    setListingType("buy");
    setDetails("");
    setUserType("owner");
    setOwnerName("");
    setOwnerEmail("");
    setOwnerPhone("");
    setUploads([]);
    setCreateAccount(true);
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  const submitForm = async () => {
    for (let index = 0; index < STEPS.length; index += 1) {
      const message = validateStep(index);
      if (message) {
        setStep(index);
        setError(message);
        return;
      }
    }

    if (uploads.some((item) => item.status === "uploading")) {
      setError("Please wait for your uploads to finish.");
      return;
    }

    if (uploads.some((item) => item.status === "error")) {
      setError("Some files failed to upload. Remove them and try again.");
      return;
    }

    setError(null);
    setStatus("submitting");

    try {
      const payload = new FormData();
      payload.append("property_type", propertyType as string);
      payload.append("listing_type", listingType);
      payload.append("details", details.trim());
      payload.append("user_type", userType);
      payload.append("owner_name", ownerName.trim());
      payload.append("owner_email", ownerEmail.trim());
      payload.append("owner_phone", ownerPhone.trim());
      payload.append("create_account", createAccount ? "true" : "false");
      payload.append("source", source);
      payload.append(
        "media",
        JSON.stringify(
          uploads
            .map((item) => item.asset)
            .filter((asset): asset is CloudinaryAsset => Boolean(asset))
            .map(({ public_id, kind }) => ({ public_id, kind })),
        ),
      );

      const res = await fetch("/api/post-property", { method: "POST", body: payload });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Could not publish your property. Please try again.");
        setStatus("idle");
        return;
      }

      setAccountCreated(Boolean(data.account_created));
      setEmailSent(Boolean(data.set_password_email_sent));
      setDevSetPasswordUrl(data.dev_set_password_url || null);
      resetForm();
      setStatus("success");
    } catch {
      setError("Network error. Please check your connection and try again.");
      setStatus("idle");
    }
  };

  // Both buttons render in the same slot. They keep `type="button"` and carry
  // distinct keys so React swaps the element instead of flipping `type` on the
  // node mid-click — that turned one Continue click into a submit.
  const continueButton = (
    <button
      key="continue"
      type="button"
      onClick={goNext}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
    >
      Continue <ArrowRight className="size-4" />
    </button>
  );

  const publishButton = (
    <button
      key="publish"
      type="button"
      onClick={() => void submitForm()}
      disabled={status === "submitting"}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-70"
    >
      <Send className="size-4" />
      {status === "submitting" ? "Publishing..." : "Publish Property"}
    </button>
  );

  /** Enter inside a field advances the wizard; it only publishes on the last step. */
  const handleFormSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (step < STEPS.length - 1) goNext();
    else void submitForm();
  };

  const propertyFields = (
    <>
      <div>
        <label className={labelClass}>Property Type</label>
        <Select
          items={PROPERTY_TYPES}
          value={propertyType}
          onValueChange={(value) => setPropertyType(value as PropertyType)}
        >
          <SelectTrigger className={selectClass}>
            <span className="flex min-w-0 items-center gap-2">
              <Home className="size-4 shrink-0 text-primary" />
              <SelectValue placeholder="Select Property Type" />
            </span>
          </SelectTrigger>
          <SelectContent>
            {Object.entries(PROPERTY_TYPES).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className={labelClass}>Listing Type</label>
        <div className="grid h-12 grid-cols-2 gap-2">
          {LISTING_OPTIONS.map((option) => {
            const active = listingType === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setListingType(option.value)}
                aria-pressed={active}
                className={`rounded-lg border text-sm font-semibold transition-colors ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover:bg-secondary"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className={variant === "compact" ? "flex min-h-0 flex-1 flex-col" : undefined}>
        <label className={labelClass} htmlFor={`pp-details-${variant}`}>
          Property Details
        </label>
        <textarea
          id={`pp-details-${variant}`}
          value={details}
          onChange={(event) => setDetails(event.target.value)}
          placeholder={DETAILS_PLACEHOLDER}
          rows={variant === "compact" ? 6 : 9}
          className={cn(
            fieldClass,
            "resize-y px-3 py-2",
            variant === "compact" ? "min-h-[72px] flex-1" : "h-auto",
          )}
        />
      </div>
    </>
  );

  const ownerFields = (
    <>
      <div>
        <label className={labelClass}>You are</label>
        <div className="grid h-12 grid-cols-3 gap-2">
          {USER_TYPE_OPTIONS.map((option) => {
            const active = userType === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setUserType(option.value)}
                aria-pressed={active}
                className={`rounded-lg border text-sm font-semibold transition-colors ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover:bg-secondary"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor={`pp-owner-name-${variant}`}>
          Full Name
        </label>
        <div className="relative">
          <UserRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary" />
          <input
            id={`pp-owner-name-${variant}`}
            value={ownerName}
            onChange={(event) => setOwnerName(event.target.value)}
            placeholder="Enter your name"
            className={`${fieldClass} pl-9 pr-3`}
          />
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor={`pp-owner-email-${variant}`}>
          Email
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary" />
          <input
            id={`pp-owner-email-${variant}`}
            type="email"
            value={ownerEmail}
            onChange={(event) => setOwnerEmail(event.target.value)}
            placeholder="you@example.com"
            className={`${fieldClass} pl-9 pr-3`}
          />
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor={`pp-owner-phone-${variant}`}>
          Phone Number
        </label>
        <div className="relative">
          <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary" />
          <span className="pointer-events-none absolute left-9 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            +91
          </span>
          <input
            id={`pp-owner-phone-${variant}`}
            inputMode="numeric"
            maxLength={10}
            value={ownerPhone}
            onChange={(event) => setOwnerPhone(event.target.value.replace(/\D/g, "").slice(0, 10))}
            placeholder="10-digit mobile number"
            className={`${fieldClass} pl-[4.25rem] pr-3`}
          />
        </div>
      </div>

      {/* Phone is collected for contact only — verification runs over email. */}
      {/* <p className="flex items-start gap-2 rounded-lg bg-secondary/60 p-3 text-xs leading-relaxed text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
        Keep your phone with you — we will send an OTP to this number to verify your listing.
      </p> */}

      <p className="flex items-start gap-2 rounded-lg bg-secondary/60 p-3 text-xs leading-relaxed text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
        We will email you to confirm this listing. Your number is only used so buyers
        can reach you.
      </p>
    </>
  );

  const dropBox = (kind: "image" | "video") => {
    const isImage = kind === "image";
    const inputRef = isImage ? imageInputRef : videoInputRef;
    const picked = isImage ? images : videos;
    const full = uploads.length >= MAX_FILES;
    const Icon = isImage ? ImagePlus : Video;

    return (
      <div className={variant === "compact" ? "flex min-h-0 flex-1 flex-col" : undefined}>
        <input
          ref={inputRef}
          type="file"
          accept={isImage ? "image/*" : "video/*"}
          multiple={isImage}
          className="hidden"
          onChange={(event) => addFiles(kind, event.target.files)}
        />

        {/* Previews live inside the box so its height never changes. */}
        <div
          className={cn(
            "w-full rounded-xl border border-dashed border-border bg-secondary/50",
            variant === "compact" ? "min-h-[68px] flex-1" : "h-24",
            picked.length === 0 ? "" : "flex items-center gap-2 p-2",
          )}
        >
          {picked.length === 0 ? (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={full}
              className="flex size-full flex-col items-center justify-center gap-1 rounded-xl text-sm font-medium transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Icon className="size-5 text-primary" />
              {isImage ? "Upload photos" : "Upload a video"}
              <span className="text-[11px] font-normal text-muted-foreground">
                {isImage ? "JPG or PNG, up to 2MB each" : "MP4 or MOV, up to 8MB"}
              </span>
            </button>
          ) : (
            <>
              <ul className="flex min-w-0 flex-1 gap-2 overflow-x-auto no-scrollbar">
                {picked.map((item) => (
                  <li key={item.id} className="group relative shrink-0">
                    <span
                      className={cn(
                        "grid size-14 place-items-center overflow-hidden rounded-lg border bg-background",
                        item.status === "error" ? "border-destructive" : "border-border",
                      )}
                      title={item.name}
                    >
                      {item.status === "done" && item.asset && isImage ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={cldThumb(item.asset.public_id, 112)}
                          alt=""
                          className="size-full object-cover"
                        />
                      ) : item.status === "uploading" ? (
                        <span className="text-[11px] font-semibold text-muted-foreground">
                          {item.progress}%
                        </span>
                      ) : item.status === "error" ? (
                        <X className="size-4 text-destructive" />
                      ) : (
                        <Film className="size-4 text-primary" />
                      )}
                    </span>

                    <button
                      type="button"
                      onClick={() => removeFile(item.id)}
                      aria-label={`Remove ${item.name}`}
                      className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:text-foreground"
                    >
                      <X className="size-3" />
                    </button>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={full}
                aria-label={isImage ? "Add more photos" : "Add a video"}
                className="grid size-14 shrink-0 place-items-center rounded-lg border border-dashed border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus className="size-5" />
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  const mediaFields = (
    <>
      {dropBox("image")}
      {dropBox("video")}

      <p className="text-xs text-muted-foreground">
        Up to {MAX_FILES} files in total, 10MB combined.
      </p>

      <label className="flex cursor-pointer items-start gap-2.5 rounded-lg bg-secondary/60 p-3">
        <input
          type="checkbox"
          checked={createAccount}
          onChange={(event) => setCreateAccount(event.target.checked)}
          className="mt-0.5 size-4 shrink-0 accent-[var(--primary)]"
        />
        <span className="text-xs leading-relaxed text-muted-foreground">
          I allow MakanMantraa to create my account with these details so I can track this listing
          and its enquiries.
        </span>
      </label>
    </>
  );

  const stepFields = [propertyFields, ownerFields, mediaFields];

  // The last step fills all three columns, so there is no room for a pose.
  const pose = POSES[step] ?? null;

  const feedback = error ? (
    <p className="text-xs font-medium text-destructive">{error}</p>
  ) : null;

  /* Confirmation art holds the card for a beat, then the form returns to step 1. */
  const successView = (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 py-2">
      <Image
        src="/property-submitted.webp"
        alt="Your property has been submitted. Our team will review it shortly."
        width={941}
        height={1672}
        priority
        className="min-h-0 w-auto max-w-full flex-1 object-contain"
      />

      {accountCreated && (
        <p className="shrink-0 text-center text-xs font-medium text-muted-foreground">
          {emailSent
            ? "Check your email — we sent a link to set your password and activate your MakanMantraa account."
            : "Your account is ready. We could not email your set-password link just now — request a fresh one from the sign-in panel."}
        </p>
      )}

      {devSetPasswordUrl && (
        <a
          href={devSetPasswordUrl}
          className="shrink-0 break-all text-center text-[11px] font-medium text-saffron underline"
        >
          Dev only — open set-password link
        </a>
      )}
    </div>
  );

  if (variant === "compact") {
    if (status === "success") {
      return (
        <div className={cn(cardClass, "flex flex-col lg:h-[600px]", className)}>{successView}</div>
      );
    }

    return (
      <div className={cn(cardClass, "flex flex-col lg:h-[600px]", className)}>
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-xl font-extrabold tracking-tight text-primary">POST YOUR PROPERTY</h3>
          <span className="shrink-0 text-xs font-semibold text-muted-foreground">
            Step {step + 1} of {STEPS.length}
          </span>
        </div>

        <div className="mt-3 flex gap-1.5">
          {STEPS.map((item, index) => (
            <span
              key={item.title}
              className={`h-1 flex-1 rounded-full ${index <= step ? "bg-saffron" : "bg-border"}`}
            />
          ))}
        </div>

        <p className="mt-3 text-[13px] font-bold uppercase tracking-wide text-muted-foreground">
          {step + 1}. {STEPS[step].title}
        </p>

        <form onSubmit={handleFormSubmit} className="mt-4 flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col justify-between gap-4 overflow-y-auto">
            {stepFields[step]}
          </div>

          <div className="mt-4 shrink-0 space-y-3">
            {feedback}

            <div className="flex gap-3">
              {step > 0 && (
                <button
                  type="button"
                  onClick={goBack}
                  className="flex h-12 items-center justify-center gap-2 rounded-lg border border-border px-4 text-sm font-semibold transition-colors hover:bg-secondary"
                >
                  <ArrowLeft className="size-4" /> Back
                </button>
              )}
              <div className="flex-1">
                {step < STEPS.length - 1 ? continueButton : publishButton}
              </div>
            </div>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Steps */}
      <h2 className="text-center text-2xl font-bold md:text-3xl">
        Post Your Property in 3 Simple Steps
      </h2>
      <div className="mx-auto mt-3 h-[3px] w-16 rounded-full bg-saffron" />

      <ol className="mx-auto mt-10 grid max-w-4xl gap-8 sm:grid-cols-3 sm:gap-4">
        {STEPS.map((item, index) => {
          const done = index < step;
          const active = index === step;

          return (
            <li key={item.title} className="relative text-center">
              {index < STEPS.length - 1 && (
                <span
                  className={`absolute left-[calc(50%+2.5rem)] right-[calc(-50%+2.5rem)] top-8 hidden h-px sm:block ${
                    done ? "bg-saffron" : "bg-border"
                  }`}
                />
              )}

              <span
                className={`relative mx-auto grid size-16 place-items-center rounded-full transition-colors ${
                  done || active ? "bg-saffron/15" : "bg-secondary"
                }`}
              >
                <item.icon
                  className={`size-6 ${done || active ? "text-primary" : "text-muted-foreground"}`}
                />
                <span
                  className={`absolute -bottom-1 -right-1 grid size-6 place-items-center rounded-full text-xs font-bold ${
                    done || active
                      ? "bg-primary text-primary-foreground"
                      : "bg-border text-muted-foreground"
                  }`}
                >
                  {done ? <Check className="size-3.5" /> : index + 1}
                </span>
              </span>

              <h3 className={`mt-4 text-sm font-bold ${active ? "" : "text-foreground/80"}`}>
                {item.title}
              </h3>
              <p className="mx-auto mt-1 max-w-[230px] text-xs leading-relaxed text-muted-foreground">
                {item.copy}
              </p>
            </li>
          );
        })}
      </ol>

      {status === "success" ? (
        <div className={cn(cardClass, "mx-auto mt-10 flex h-[460px] max-w-md flex-col")}>
          {successView}
        </div>
      ) : (
      /* Form — one card per step, opening side by side as steps are completed */
      <form onSubmit={handleFormSubmit} className="mt-10">
        <div className="grid gap-6 lg:grid-cols-3">
          {STEPS.map((item, index) => {
            if (index > step) return null;

            return (
              <section key={item.title} className={`${cardClass} relative z-10 flex flex-col gap-4`}>
                <p className={cardTitleClass}>
                  {index + 1}. {item.title}
                </p>

                {stepFields[index]}

                {index === step && (
                  <div className="mt-auto pt-1">
                    {index < STEPS.length - 1 ? continueButton : publishButton}
                  </div>
                )}
              </section>
            );
          })}

          {/* Leans on the open card. The pull-back exactly cancels the grid gap,
              so the figure meets the card edge without disappearing behind it. */}
          {pose && (
            <div
              className={`-ml-6 hidden items-end justify-start lg:flex ${step === 0 ? "lg:col-span-2" : ""}`}
            >
              <Image
                key={pose.src}
                src={pose.src}
                alt={pose.alt}
                width={pose.width}
                height={pose.height}
                priority
                className="h-[520px] w-auto select-none object-contain object-bottom"
              />
            </div>
          )}
        </div>

        <div className="mt-4 text-center">{feedback}</div>
      </form>
      )}
    </div>
  );
}
