"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BadgeCheck, Camera, Loader2 } from "lucide-react";

import { EmailChange } from "@/components/dashboard/email-change";
import { ProfileImageCropper } from "@/components/dashboard/profile-image-cropper";
import { useLocation } from "@/context/location-context";
import { useSession } from "@/context/session-context";
import { uploadToCloudinary } from "@/lib/cloudinary-upload";

export type Profile = {
  name: string;
  email: string;
  profileRole: string;
  profileImage: { publicId: string; url: string } | null;
  phone: string;
  alternatePhone: string;
  preferredState: string;
  preferredCity: string;
  gender: string;
  address: string;
  emailVerified: boolean;
  provider: string;
};

const GENDERS = [
  { value: "", label: "Prefer not to answer" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

const PROFILE_ROLES = [
  { value: "broker", label: "Broker" },
  { value: "owner", label: "Owner" },
  { value: "builder", label: "Builder" },
];

const labelClass = "text-sm font-semibold text-foreground";
const fieldClass =
  "mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-saffron";

export function ProfileForm({ profile }: { profile: Profile }) {
  const { setStateByName } = useLocation();
  const { refresh: refreshSession } = useSession();
  const router = useRouter();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [profileRole, setProfileRole] = useState(profile.profileRole);
  const [profileImage, setProfileImage] = useState(profile.profileImage);
  const [imageChanged, setImageChanged] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageProgress, setImageProgress] = useState(0);
  const [cropSource, setCropSource] = useState<{ url: string; fileName: string } | null>(null);
  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone);
  const [alternatePhone, setAlternatePhone] = useState(profile.alternatePhone);
  const [gender, setGender] = useState(profile.gender);
  const [address, setAddress] = useState(profile.address);
  const [preferredState, setPreferredState] = useState(profile.preferredState);
  const [preferredCity, setPreferredCity] = useState(profile.preferredCity);
  const [states, setStates] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const initials = (name.trim() || profile.email)
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  const selectProfileImage = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage({ tone: "error", text: "Choose an image file" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ tone: "error", text: "Profile image must be under 2MB" });
      return;
    }

    setMessage(null);
    setCropSource({ url: URL.createObjectURL(file), fileName: file.name });
  };

  const uploadProfileImage = async (file: File) => {

    setImageUploading(true);
    setImageProgress(0);
    setMessage(null);

    try {
      const asset = await uploadToCloudinary(file, "image", setImageProgress);
      setProfileImage({ publicId: asset.public_id, url: asset.url });
      setImageChanged(true);
    } catch (error) {
      setMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "Could not upload profile image",
      });
    } finally {
      setImageUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  useEffect(() => {
    return () => {
      if (cropSource) URL.revokeObjectURL(cropSource.url);
    };
  }, [cropSource]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch("/api/states", { cache: "no-store" });
        const data = (await response.json()) as { states?: string[] };
        if (!cancelled) setStates(data.states ?? []);
      } catch {
        // The input remains editable when database options are unavailable.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const state = preferredState.trim();
    if (state.length < 3) return;

    let cancelled = false;
    const timeout = window.setTimeout(() => {
      setCitiesLoading(true);
      void (async () => {
        try {
          const response = await fetch(`/api/cities?state=${encodeURIComponent(state)}`, {
            cache: "no-store",
          });
          const data = (await response.json()) as { cities?: string[] };
          if (!cancelled) setCities(data.cities ?? []);
        } catch {
          if (!cancelled) setCities([]);
        } finally {
          if (!cancelled) setCitiesLoading(false);
        }
      })();
    }, 200);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [preferredState]);

  const stateQuery = preferredState.trim().toLowerCase();
  const matchingStates =
    stateQuery.length >= 3
      ? states.filter((state) => state.toLowerCase().includes(stateQuery)).slice(0, 8)
      : [];
  const cityQuery = preferredCity.trim().toLowerCase();
  const matchingCities =
    cityQuery.length >= 3
      ? cities.filter((city) => city.toLowerCase().includes(cityQuery)).slice(0, 8)
      : [];

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const payload: Record<string, unknown> = {
        profileRole,
        name,
        phone,
        alternatePhone,
        gender,
        address,
        preferredState,
        preferredCity,
      };
      if (imageChanged) payload.profileImage = profileImage;

      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        setMessage({ tone: "error", text: data.error ?? "Could not save your changes" });
        return;
      }

      // Keep the header picker and the market snapshot in step with the change.
      setStateByName(preferredState || null);
      setImageChanged(false);
      setMessage({ tone: "ok", text: "Profile updated" });
      await refreshSession();
      router.refresh();
    } catch {
      setMessage({ tone: "error", text: "Could not reach the server" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="flex flex-wrap items-center gap-4 border-b border-border pb-5">
          <div className="relative size-24 shrink-0 overflow-hidden rounded-full bg-[#eef3ff]">
            {profileImage ? (
              <Image
                src={profileImage.url}
                alt={`${name || "User"} profile`}
                fill
                sizes="96px"
                className="object-cover"
              />
            ) : (
              <span className="grid h-full w-full place-items-center text-xl font-bold text-[#315ea8]">
                {initials}
              </span>
            )}
            {imageUploading && (
              <span className="absolute inset-0 grid place-items-center bg-[#071a33]/70 text-xs font-bold text-white">
                {imageProgress}%
              </span>
            )}
          </div>

          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground">Profile photo</p>
            <p className="mt-0.5 text-xs text-muted-foreground">JPG, PNG or WebP up to 2MB</p>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => {
                selectProfileImage(event.target.files?.[0]);
                event.currentTarget.value = "";
              }}
              className="sr-only"
            />
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={imageUploading || saving}
              className="mt-2 inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground transition-colors hover:bg-muted/50 disabled:opacity-60"
            >
              {imageUploading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Camera className="size-4" strokeWidth={1.8} />
              )}
              Upload photo
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label htmlFor="profile-role" className={labelClass}>
              Role
            </label>
            <select
              id="profile-role"
              value={profileRole}
              onChange={(event) => setProfileRole(event.target.value)}
              required
              className={fieldClass}
            >
              <option value="">Select role</option>
              {PROFILE_ROLES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="profile-name" className={labelClass}>
              Full name
            </label>
            <input
              id="profile-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={fieldClass}
            />
          </div>

          <div>
            <label htmlFor="profile-gender" className={labelClass}>
              Gender
            </label>
            <select
              id="profile-gender"
              value={gender}
              onChange={(event) => setGender(event.target.value)}
              className={fieldClass}
            >
              {GENDERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="profile-phone" className={labelClass}>
              Mobile number
            </label>
            <input
              id="profile-phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))}
              inputMode="numeric"
              autoComplete="tel"
              placeholder="10-digit mobile number"
              className={fieldClass}
            />
          </div>

          <div>
            <label htmlFor="profile-alternate-phone" className={labelClass}>
              Alternate phone number <span className="font-normal text-muted-foreground">(Optional)</span>
            </label>
            <input
              id="profile-alternate-phone"
              value={alternatePhone}
              onChange={(event) => setAlternatePhone(event.target.value.replace(/\D/g, "").slice(0, 10))}
              inputMode="numeric"
              autoComplete="tel"
              placeholder="10-digit alternate number"
              className={fieldClass}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="profile-state" className={labelClass}>
              State
            </label>
            <input
              id="profile-state"
              list="profile-state-options"
              value={preferredState}
              onChange={(event) => {
                setPreferredState(event.target.value);
                setPreferredCity("");
                setCities([]);
                setCitiesLoading(false);
              }}
              placeholder="Select or enter state"
              autoComplete="off"
              className={fieldClass}
            />
            <datalist id="profile-state-options">
              {matchingStates.map((state) => (
                <option key={state} value={state} />
              ))}
            </datalist>
          </div>

          <div>
            <label htmlFor="profile-city" className={labelClass}>
              City
            </label>
            <div className="relative">
              <input
                id="profile-city"
                list="profile-city-options"
                value={preferredCity}
                onChange={(event) => setPreferredCity(event.target.value)}
                disabled={!preferredState.trim()}
                placeholder={preferredState.trim() ? "Select or enter city" : "Select state first"}
                autoComplete="off"
                className={`${fieldClass} pr-9 disabled:cursor-not-allowed disabled:bg-muted/40`}
              />
              {citiesLoading && (
                <Loader2 className="absolute right-3 top-[17px] size-4 animate-spin text-muted-foreground" />
              )}
            </div>
            <datalist id="profile-city-options">
              {matchingCities.map((city) => (
                <option key={city} value={city} />
              ))}
            </datalist>
          </div>
        </div>

        <div>
          <label htmlFor="profile-address" className={labelClass}>
            Address
          </label>
          <textarea
            id="profile-address"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            rows={2}
            placeholder="House / street, locality, city"
            className="mt-1 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-saffron"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving || imageUploading}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-saffron px-5 text-sm font-semibold text-saffron-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            Save changes
          </button>

          {message && (
            <p
              className={`text-sm font-medium ${
                message.tone === "ok" ? "text-[#0F8B8D]" : "text-destructive"
              }`}
            >
              {message.text}
            </p>
          )}
        </div>
      </form>

      <div className="border-t border-border pt-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className={labelClass}>Email</span>
          {profile.emailVerified && (
            <span className="flex items-center gap-1 text-xs font-semibold text-[#0F8B8D]">
              <BadgeCheck className="size-4" strokeWidth={1.9} />
              Verified
            </span>
          )}
        </div>
        <EmailChange currentEmail={profile.email} provider={profile.provider} />
      </div>

      {cropSource && (
        <ProfileImageCropper
          sourceUrl={cropSource.url}
          fileName={cropSource.fileName}
          onCancel={() => setCropSource(null)}
          onConfirm={async (file) => {
            await uploadProfileImage(file);
            setCropSource(null);
          }}
        />
      )}
    </div>
  );
}
