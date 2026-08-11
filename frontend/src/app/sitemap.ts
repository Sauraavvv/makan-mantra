import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "https://makanmantra.com", lastModified: new Date() },
    { url: "https://makanmantra.com/top-builders-in-india", lastModified: new Date() },
  ];
}
