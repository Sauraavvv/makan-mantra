const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

/**
 * Builds a delivery URL from a stored `public_id`. Transformations are applied
 * on the fly, so one upload serves every size we need — store the id, not a URL.
 *
 * `q_auto,f_auto` lets Cloudinary pick the quality and hand modern browsers
 * WebP/AVIF, which is the single biggest saving on delivery bandwidth.
 */
export function cldUrl(publicId: string, transform = "q_auto,f_auto") {
  const transformationPath = transform ? `${transform}/` : "";
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transformationPath}${publicId}`;
}

/** Small square preview for cards and the upload tray. */
export function cldThumb(publicId: string, size = 400) {
  return cldUrl(publicId, `w_${size},h_${size},c_fill,q_auto,f_auto`);
}

/** A poster frame grabbed from an uploaded video. */
export function cldVideoPoster(publicId: string, width = 800) {
  return `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/w_${width},q_auto,f_auto/${publicId}.jpg`;
}

export function cldVideoUrl(publicId: string) {
  return `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/q_auto/${publicId}`;
}
