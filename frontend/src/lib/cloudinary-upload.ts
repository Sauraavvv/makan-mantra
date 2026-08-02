export type CloudinaryAsset = {
  kind: "image" | "video";
  public_id: string;
  url: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
};

type SignResponse = {
  timestamp: number;
  folder: string;
  tags: string;
  signature: string;
  apiKey: string;
  cloudName: string;
};

/**
 * Uploads straight from the browser to Cloudinary using a signature minted by
 * our own API. The file never touches our server, so the serverless request
 * body limit does not apply.
 */
export async function uploadToCloudinary(
  file: File,
  kind: "image" | "video",
  onProgress?: (percent: number) => void,
): Promise<CloudinaryAsset> {
  const signRes = await fetch("/api/cloudinary-sign", { method: "POST" });

  if (!signRes.ok) {
    throw new Error("Uploads are unavailable right now.");
  }

  const sign: SignResponse = await signRes.json();

  const form = new FormData();
  form.append("file", file);
  form.append("api_key", sign.apiKey);
  form.append("timestamp", String(sign.timestamp));
  form.append("signature", sign.signature);
  form.append("folder", sign.folder);
  form.append("tags", sign.tags);

  // XHR rather than fetch — it is the only way to read upload progress.
  const raw = await new Promise<Record<string, unknown>>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${sign.cloudName}/auto/upload`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress?.(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) resolve(body);
        else reject(new Error(body?.error?.message || "Upload failed."));
      } catch {
        reject(new Error("Upload failed."));
      }
    };

    xhr.onerror = () => reject(new Error("Network error during upload."));
    xhr.send(form);
  });

  return {
    kind: raw.resource_type === "video" ? "video" : "image",
    public_id: String(raw.public_id),
    url: String(raw.secure_url),
    width: Number(raw.width) || 0,
    height: Number(raw.height) || 0,
    format: String(raw.format ?? ""),
    bytes: Number(raw.bytes) || 0,
  };
}
