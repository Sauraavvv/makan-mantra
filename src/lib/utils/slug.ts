export function generateSlug(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export function parseLocationSlug(slug: string) {
  const match = slug.match(/^(.+)-in-(.+)$/);
  if (!match) return null;
  return { propertyType: match[1], location: match[2] };
}
