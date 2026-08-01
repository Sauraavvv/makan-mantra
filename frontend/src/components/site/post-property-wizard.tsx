"use client";

import { useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Film,
  Home,
  ImagePlus,
  Mail,
  Phone,
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
import { cn } from "@/lib/utils";

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
const cardClass = "rounded-[28px] border border-border bg-background p-6";
const cardTitleClass = "text-[13px] font-bold uppercase tracking-wide text-muted-foreground";

function formatSize(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.round(bytes / 1024)} KB`;
}

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

  const [step, setStep] = useState(0);

  const [propertyType, setPropertyType] = useState<PropertyType | null>(null);
  const [listingType, setListingType] = useState<ListingChoice>("buy");
  const [details, setDetails] = useState("");

  const [userType, setUserType] = useState<UserTypeChoice>("owner");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");

  const [images, setImages] = useState<File[]>([]);
  const [videos, setVideos] = useState<File[]>([]);
  const files = [...images, ...videos];
  const [createAccount, setCreateAccount] = useState(true);

  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");
  const [error, setError] = useState<string | null>(null);
  const [accountCreated, setAccountCreated] = useState(false);

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

    const current = kind === "image" ? images : videos;
    const other = kind === "image" ? videos : images;
    const next = [...current, ...picked].slice(0, MAX_FILES - other.length);

    if ([...next, ...other].reduce((sum, file) => sum + file.size, 0) > MAX_TOTAL_BYTES) {
      setError("Total upload size must stay under 10MB.");
      return;
    }

    setError(null);
    (kind === "image" ? setImages : setVideos)(next);
    if (inputRef.current) inputRef.current.value = "";
  };

  const removeFile = (kind: "image" | "video", index: number) => {
    (kind === "image" ? setImages : setVideos)((current) =>
      current.filter((_, i) => i !== index),
    );
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
    setImages([]);
    setVideos([]);
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
      files.forEach((file) => payload.append("images", file));

      const res = await fetch("/api/post-property", { method: "POST", body: payload });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Could not publish your property. Please try again.");
        setStatus("idle");
        return;
      }

      setAccountCreated(Boolean(data.account_created));
      resetForm();
      setStatus("success");
    } catch {
      setError("Network error. Please check your connection and try again.");
      setStatus("idle");
    }
  };

  const continueButton = (
    <button
      type="button"
      onClick={goNext}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
    >
      Continue <ArrowRight className="size-4" />
    </button>
  );

  const publishButton = (
    <button
      type="submit"
      disabled={status === "submitting"}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-70"
    >
      <Send className="size-4" />
      {status === "submitting" ? "Publishing..." : "Publish Property"}
    </button>
  );

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

      <p className="flex items-start gap-2 rounded-lg bg-secondary/60 p-3 text-xs leading-relaxed text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
        Keep your phone with you — we will send an OTP to this number to verify your listing.
      </p>
    </>
  );

  const dropBox = (kind: "image" | "video") => {
    const isImage = kind === "image";
    const inputRef = isImage ? imageInputRef : videoInputRef;
    const picked = isImage ? images : videos;
    const full = files.length >= MAX_FILES;
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

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={full}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border bg-secondary/50 text-sm font-medium transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60",
            variant === "compact" ? "min-h-[68px] flex-1" : "h-24",
          )}
        >
          <Icon className="size-5 text-primary" />
          {isImage ? "Upload photos" : "Upload a video"}
          <span className="text-[11px] font-normal text-muted-foreground">
            {isImage ? "JPG or PNG, up to 2MB each" : "MP4 or MOV, up to 8MB"}
          </span>
        </button>

        {picked.length > 0 && (
          <ul className="mt-2 space-y-1.5">
            {picked.map((file, index) => (
              <li
                key={`${file.name}-${index}`}
                className="flex items-center gap-2 rounded-md bg-secondary px-2.5 py-2 text-xs"
              >
                {isImage ? (
                  <ImagePlus className="size-3.5 shrink-0 text-primary" />
                ) : (
                  <Film className="size-3.5 shrink-0 text-primary" />
                )}
                <span className="truncate">{file.name}</span>
                <span className="ml-auto shrink-0 text-muted-foreground">
                  {formatSize(file.size)}
                </span>
                <button
                  type="button"
                  onClick={() => removeFile(kind, index)}
                  aria-label={`Remove ${file.name}`}
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
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

  const feedback = (
    <>
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
      {status === "success" && (
        <p className="text-xs font-medium text-success">
          Your property has been submitted. Our team will review it shortly.
          {accountCreated && " Your MakanMantraa account is ready — you are signed in."}
        </p>
      )}
    </>
  );

  if (variant === "compact") {
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

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submitForm();
          }}
          className="mt-4 flex min-h-0 flex-1 flex-col"
        >
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

      {/* Form — one card per step, opening side by side as steps are completed */}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submitForm();
        }}
        className="mt-10"
      >
        <div className="grid gap-6 lg:grid-cols-3">
          {STEPS.map((item, index) => {
            if (index > step) return null;

            return (
              <section key={item.title} className={`${cardClass} flex flex-col gap-4`}>
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
        </div>

        <div className="mt-4 text-center">{feedback}</div>
      </form>
    </div>
  );
}
