type GoogleMapEmbedProps = {
  latitude?: number | null;
  longitude?: number | null;
  zoom?: number;
  height?: number | string;
  title?: string;
  className?: string;
};

export function GoogleMapEmbed({
  latitude,
  longitude,
  zoom = 16,
  height = 400,
  title = "Location map",
  className = "",
}: GoogleMapEmbedProps) {
  if (typeof latitude !== "number" || typeof longitude !== "number") return null;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const coordinates = `${latitude},${longitude}`;
  const src = `https://www.google.com/maps?q=${coordinates}&z=${zoom}&output=embed&ll=${coordinates}`;

  return (
    <iframe
      title={title}
      src={src}
      width="100%"
      height={height}
      style={{ border: 0 }}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      className={className}
    />
  );
}
