"use client";

import { useRef, useState } from "react";
import { CloudUpload, Home, IndianRupee, MapPin, Send, X } from "lucide-react";

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

const MAX_IMAGES = 6;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

const labelClass = "mb-1.5 block text-[13px] font-semibold text-primary";
const fieldClass =
  "h-12 w-full rounded-lg border border-border bg-background text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/60 focus:ring-3 focus:ring-primary/15";

/** The "Post your property" form used on the home banner and the /post-property page. */
export function PostPropertyForm({
  source = "banner",
  className,
}: {
  source?: "banner" | "post_property_page";
  className?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [propertyType, setPropertyType] = useState<PropertyType | null>(null);
  const [listingType, setListingType] = useState<ListingChoice>("buy");
  const [location, setLocation] = useState("");
  const [price, setPrice] = useState("");
  const [details, setDetails] = useState("");
  const [images, setImages] = useState<File[]>([]);

  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");
  const [error, setError] = useState<string | null>(null);

  const addImages = (fileList: FileList | null) => {
    if (!fileList?.length) return;

    const picked = Array.from(fileList);
    const tooLarge = picked.find((file) => file.size > MAX_IMAGE_BYTES);
    if (tooLarge) {
      setError(`"${tooLarge.name}" is larger than 2MB.`);
      return;
    }

    setError(null);
    setImages((current) => [...current, ...picked].slice(0, MAX_IMAGES));
  };

  const removeImage = (index: number) => {
    setImages((current) => current.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setPropertyType(null);
    setListingType("buy");
    setLocation("");
    setPrice("");
    setDetails("");
    setImages([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const submitForm = async () => {
    if (!propertyType) {
      setError("Please select a property type.");
      return;
    }
    if (!location.trim()) {
      setError("Please enter a location.");
      return;
    }
    if (!price.trim() || Number(price) <= 0) {
      setError("Please enter a valid price.");
      return;
    }

    setError(null);
    setStatus("submitting");

    try {
      const payload = new FormData();
      payload.append("property_type", propertyType);
      payload.append("listing_type", listingType);
      payload.append("location", location.trim());
      payload.append("price", price.trim());
      payload.append("details", details.trim());
      payload.append("source", source);
      images.forEach((image) => payload.append("images", image));

      const res = await fetch("/api/post-property", { method: "POST", body: payload });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Could not publish your property. Please try again.");
        setStatus("idle");
        return;
      }

      resetForm();
      setStatus("success");
    } catch {
      setError("Network error. Please check your connection and try again.");
      setStatus("idle");
    }
  };

  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-background p-6 shadow-[0_18px_45px_-20px_rgba(23,23,80,0.45)]",
        className,
      )}
    >
      <h3 className="text-xl font-extrabold tracking-tight text-primary">POST YOUR PROPERTY</h3>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submitForm();
        }}
        className="mt-5 space-y-4"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Property Type</label>
            <Select
              items={PROPERTY_TYPES}
              value={propertyType}
              onValueChange={(value) => setPropertyType(value as PropertyType)}
            >
              <SelectTrigger
                className={`${fieldClass} gap-2 pl-3 pr-2 text-xs data-[size=default]:h-12`}
              >
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
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="pp-location">
              Location
            </label>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary" />
              <input
                id="pp-location"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="Enter Location"
                className={`${fieldClass} pl-9 pr-3`}
              />
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="pp-price">
              Price
            </label>
            <div className="relative">
              <IndianRupee className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary" />
              <input
                id="pp-price"
                type="number"
                min={0}
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                placeholder="Enter Price"
                className={`${fieldClass} pl-9 pr-3`}
              />
            </div>
          </div>
        </div>

        <div>
          <label className={labelClass} htmlFor="pp-details">
            Property Details
          </label>
          <textarea
            id="pp-details"
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            placeholder="Add Details"
            rows={4}
            className={`${fieldClass} h-auto resize-y px-3 py-2`}
          />
        </div>

        <div>
          <label className={labelClass}>Upload Photos</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(event) => addImages(event.target.files)}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-border bg-secondary/60 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            <CloudUpload className="size-4 text-primary" /> Upload Images
          </button>

          {images.length > 0 && (
            <ul className="mt-2 space-y-1.5">
              {images.map((image, index) => (
                <li
                  key={`${image.name}-${index}`}
                  className="flex items-center justify-between gap-2 rounded-md bg-secondary px-2.5 py-1.5 text-xs"
                >
                  <span className="truncate">{image.name}</span>
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    aria-label={`Remove ${image.name}`}
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {error && <p className="text-xs font-medium text-destructive">{error}</p>}
        {status === "success" && (
          <p className="text-xs font-medium text-green-600">
            Your property has been submitted. Our team will review it shortly.
          </p>
        )}

        <button
          type="submit"
          disabled={status === "submitting"}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-70"
        >
          <Send className="size-4" />
          {status === "submitting" ? "Publishing..." : "Publish Property"}
        </button>
      </form>
    </div>
  );
}
