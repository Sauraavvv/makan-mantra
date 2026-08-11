"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  BadgeCheck,
  CalendarDays,
  Camera,
  Loader2,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from "lucide-react";

import { EmailChange } from "@/components/dashboard/email-change";
import { ProfileImageCropper } from "@/components/dashboard/profile-image-cropper";
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
  dateOfBirth: string;
  address: string;
  emailVerified: boolean;
  provider: string;
};

const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "", label: "Prefer not to say" },
];

const PROFILE_ROLES = [
  { value: "broker", label: "Broker" },
  { value: "owner", label: "Owner" },
  { value: "builder", label: "Builder" },
];

const labelClass = "text-sm font-semibold text-foreground";
const fieldBaseClass =
  "h-11 w-full rounded-lg border border-[#e8ecf4] bg-white px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/10";
const fieldClass = `mt-2 ${fieldBaseClass}`;
const fieldIconClass =
  "pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground";

function EditSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 border-b border-[#eef1f6] px-5 py-6 last:border-b-0 sm:px-7">
      <div className="mb-5">
        <h2 className="text-base font-bold leading-6 text-foreground">{title}</h2>
        <p className="mt-1 text-sm leading-5 text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

function StatusRow({
  icon: Icon,
  label,
  status,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  status: string;
  tone: "ok" | "warn" | "muted";
}) {
  const statusClass =
    tone === "ok"
      ? "bg-[#eefbf5] text-[#19956b]"
      : tone === "warn"
        ? "bg-[#fff6e8] text-[#c47a1d]"
        : "bg-muted text-muted-foreground";

  return (
    <div className="flex items-center gap-3 text-sm">
      <Icon className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.9} />
      <span className="min-w-0 flex-1 truncate font-medium text-foreground">{label}</span>
      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${statusClass}`}>
        {status}
      </span>
    </div>
  );
}

export function ProfileForm({ profile }: { profile: Profile }) {
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
  const [dateOfBirth, setDateOfBirth] = useState(profile.dateOfBirth);
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

  const profileRoleLabel =
    PROFILE_ROLES.find((option) => option.value === profileRole)?.label || "Not selected";
  const locationText = [preferredCity, preferredState].filter(Boolean).join(", ") || "Not added";
  const completionFields = [
    profileRole,
    name,
    profile.email,
    phone,
    gender || "answered",
    dateOfBirth,
    preferredState,
    preferredCity,
    address,
    profileImage?.url ?? "",
    profile.emailVerified ? "verified" : "",
  ];
  const profileCompletion = Math.round(
    (completionFields.filter((value) => String(value).trim()).length / completionFields.length) *
      100,
  );

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
        dateOfBirth,
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

  const resetForm = () => {
    setProfileRole(profile.profileRole);
    setProfileImage(profile.profileImage);
    setImageChanged(false);
    setName(profile.name);
    setPhone(profile.phone);
    setAlternatePhone(profile.alternatePhone);
    setGender(profile.gender);
    setDateOfBirth(profile.dateOfBirth);
    setAddress(profile.address);
    setPreferredState(profile.preferredState);
    setPreferredCity(profile.preferredCity);
    setCities([]);
    setCitiesLoading(false);
    setMessage(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  return (
    <div className="w-full xl:flex xl:h-[calc(100vh-120px)] xl:flex-col xl:overflow-hidden">
      <form
        onSubmit={onSubmit}
        className="grid items-start gap-5 xl:min-h-0 xl:flex-1 xl:grid-cols-[minmax(0,1.65fr)_minmax(310px,0.78fr)] xl:overflow-hidden"
      >
        <div className="no-scrollbar min-w-0 overflow-hidden rounded-xl border border-[#e8ecf4] bg-white pb-6 xl:h-full xl:overflow-y-auto">
          <EditSection
            title="Personal information"
            description="This is how your name and identity appear on the app."
          >
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="lg:col-span-2">
                <div className="mb-2">
                  <label htmlFor="profile-name" className={labelClass}>
                    Full name <span className="text-destructive">*</span>
                  </label>
                </div>
                <div className="relative">
                  <UserRound className={fieldIconClass} />
                  <input
                    id="profile-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    autoComplete="name"
                    required
                    className={`${fieldBaseClass} pl-10`}
                    placeholder="Enter your full name"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="profile-role" className={labelClass}>
                  Profile role <span className="text-destructive">*</span>
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
                <div className="mb-2">
                  <label htmlFor="profile-date-of-birth" className={labelClass}>
                    Date of birth
                  </label>
                </div>
                <div className="relative">
                  <CalendarDays className={fieldIconClass} />
                  <input
                    id="profile-date-of-birth"
                    type="date"
                    value={dateOfBirth}
                    max={new Date().toISOString().slice(0, 10)}
                    onChange={(event) => setDateOfBirth(event.target.value)}
                    autoComplete="bday"
                    className={`${fieldBaseClass} pl-10`}
                  />
                </div>
              </div>

              <div className="lg:col-span-2">
                <span className={labelClass}>Gender</span>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  {GENDERS.map((option) => {
                    const selected = gender === option.value;
                    return (
                      <button
                        key={option.value || "empty"}
                        type="button"
                        onClick={() => setGender(option.value)}
                        className={`flex h-11 min-w-0 items-center gap-3 rounded-lg border px-4 text-left text-sm font-semibold transition-colors ${
                          selected
                            ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/10"
                            : "border-[#e8ecf4] bg-white text-foreground hover:bg-muted/40"
                        }`}
                      >
                        <span
                          className={`grid size-5 shrink-0 place-items-center rounded-full border ${
                            selected ? "border-primary" : "border-[#d9dee8]"
                          }`}
                        >
                          {selected && <span className="size-2.5 rounded-full bg-primary" />}
                        </span>
                        <span className="min-w-0 truncate">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </EditSection>

          <EditSection
            title="Contact information"
            description="How we contact you for updates and account security."
          >
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="lg:col-span-2">
                <div className="mb-2 flex items-center gap-2">
                  <label htmlFor="profile-phone" className={labelClass}>
                    Mobile number <span className="text-destructive">*</span>
                  </label>
                  <span className="ml-auto text-xs font-bold text-primary">Verify</span>
                </div>
                <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-3">
                  <div className="mt-0 flex h-11 items-center justify-center rounded-lg border border-[#e8ecf4] bg-white text-sm font-semibold text-foreground">
                    +91
                  </div>
                  <div className="relative">
                    <Phone className={fieldIconClass} />
                    <input
                      id="profile-phone"
                      value={phone}
                      onChange={(event) =>
                        setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))
                      }
                      inputMode="numeric"
                      autoComplete="tel"
                      placeholder="10-digit mobile number"
                      className={`${fieldBaseClass} pl-10`}
                    />
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2">
                <div className="mb-2">
                  <label htmlFor="profile-alternate-phone" className={labelClass}>
                    Alternate phone number{" "}
                    <span className="font-normal text-muted-foreground">(Optional)</span>
                  </label>
                </div>
                <div className="relative">
                  <Phone className={fieldIconClass} />
                  <input
                    id="profile-alternate-phone"
                    value={alternatePhone}
                    onChange={(event) =>
                      setAlternatePhone(event.target.value.replace(/\D/g, "").slice(0, 10))
                    }
                    inputMode="numeric"
                    autoComplete="tel"
                    placeholder="10-digit alternate number"
                    className={`${fieldBaseClass} pl-10`}
                  />
                </div>
              </div>

              <div className="lg:col-span-2">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className={labelClass}>Email address</span>
                  {profile.emailVerified && (
                    <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-[#eefbf5] px-2.5 py-1 text-xs font-bold text-[#19956b]">
                      <BadgeCheck className="size-3.5" strokeWidth={1.9} />
                      Verified
                    </span>
                  )}
                </div>
                <div className="rounded-lg border border-[#e8ecf4] bg-[#fbfcff] px-3 py-3">
                  <EmailChange currentEmail={profile.email} provider={profile.provider} />
                </div>
              </div>
            </div>
          </EditSection>

          <EditSection
            title="Location details"
            description="Your address helps us keep property recommendations relevant."
          >
            <div className="grid gap-5 lg:grid-cols-2">
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
                    <Loader2 className="absolute right-3 top-[18px] size-4 animate-spin text-muted-foreground" />
                  )}
                </div>
                <datalist id="profile-city-options">
                  {matchingCities.map((city) => (
                    <option key={city} value={city} />
                  ))}
                </datalist>
              </div>

              <div className="lg:col-span-2">
                <div className="mb-2 flex items-center gap-3">
                  <label htmlFor="profile-address" className={labelClass}>
                    Address
                  </label>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {Math.min(address.length, 240)}/240
                  </span>
                </div>
                <textarea
                  id="profile-address"
                  value={address}
                  onChange={(event) => setAddress(event.target.value.slice(0, 240))}
                  rows={4}
                  placeholder="House / street, locality, city"
                  className="w-full resize-none rounded-lg border border-[#e8ecf4] bg-white px-3 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/10"
                />
                <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="size-3.5" strokeWidth={1.9} />
                  This is visible only to your account and property workflows.
                </p>
              </div>
            </div>
          </EditSection>

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[#eef1f6] px-5 py-4 sm:px-7">
            <button
              type="button"
              onClick={resetForm}
              disabled={saving || imageUploading}
              className="h-10 rounded-lg px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted/60 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || imageUploading}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-bold text-primary-foreground shadow-[0_12px_28px_rgba(8,27,53,0.18)] transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              Save changes
            </button>

            {message && (
              <p
                className={`basis-full text-right text-sm font-medium ${
                  message.tone === "ok" ? "text-[#19956b]" : "text-destructive"
                }`}
              >
                {message.text}
              </p>
            )}
          </div>
        </div>

        <aside className="min-w-0 xl:h-full xl:overflow-hidden">
          <div className="overflow-hidden rounded-xl border border-[#e8ecf4] bg-white p-5 sm:p-6">
            <div className="flex flex-col items-center text-center">
              <div className="relative size-32 rounded-full bg-primary/10 p-1 shadow-[0_16px_40px_rgba(8,27,53,0.16)]">
                <div className="relative h-full w-full overflow-hidden rounded-full border-4 border-white bg-primary">
                  {profileImage ? (
                    <Image
                      src={profileImage.url}
                      alt={`${name || "User"} profile`}
                      fill
                      sizes="128px"
                      className="object-cover"
                    />
                  ) : (
                    <span className="grid h-full w-full place-items-center text-3xl font-black text-white">
                      {initials}
                    </span>
                  )}
                  {imageUploading && (
                    <span className="absolute inset-0 grid place-items-center bg-[#071a33]/70 text-sm font-bold text-white">
                      {imageProgress}%
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={imageUploading || saving}
                  aria-label="Change profile photo"
                  className="absolute bottom-2 right-2 grid size-9 place-items-center rounded-full border border-[#e8ecf4] bg-white text-foreground shadow-sm transition-colors hover:bg-muted/50 disabled:opacity-60"
                >
                  {imageUploading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Camera className="size-4" strokeWidth={1.9} />
                  )}
                </button>
              </div>

              <h2 className="mt-5 max-w-full truncate text-xl font-black text-foreground">
                {name || "Your profile"}
              </h2>
              <p className="mt-1 max-w-full truncate text-sm text-muted-foreground">{profile.email}</p>

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
                className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#f5f6fb] px-4 text-sm font-bold text-foreground transition-colors hover:bg-[#eceff8] disabled:opacity-60"
              >
                {imageUploading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Camera className="size-4" strokeWidth={1.9} />
                )}
                Change photo
              </button>
              <p className="mt-3 text-xs text-muted-foreground">PNG, JPG or WebP, up to 2 MB.</p>
            </div>

            <div className="mt-7 rounded-xl border border-[#eef1f6] bg-[#fbfcff] p-4">
              <div className="mb-3 flex items-center gap-3">
                <ShieldCheck className="size-4 text-primary" strokeWidth={1.9} />
                <p className="min-w-0 flex-1 truncate text-sm font-bold text-foreground">
                  Profile completion
                </p>
                <span className="shrink-0 text-sm font-black text-foreground">
                  {profileCompletion}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#e8ecf4]">
                <span
                  className="block h-full rounded-full bg-primary"
                  style={{ width: `${Math.max(0, Math.min(100, profileCompletion))}%` }}
                />
              </div>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                Add your details and verification to reach 100%.
              </p>
            </div>

            <div className="mt-6 space-y-4">
              <StatusRow
                icon={Mail}
                label="Email"
                status={profile.emailVerified ? "Verified" : "Unverified"}
                tone={profile.emailVerified ? "ok" : "warn"}
              />
              <StatusRow
                icon={Phone}
                label="Phone"
                status={phone ? "Unverified" : "Missing"}
                tone={phone ? "warn" : "muted"}
              />
              <StatusRow icon={UserRound} label={profileRoleLabel} status="Role" tone="muted" />
              <StatusRow icon={MapPin} label={locationText} status="Location" tone="muted" />
            </div>
          </div>
        </aside>
      </form>

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
