import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getLocationPage, LocationPageView, locationPageMetadata } from "@/components/site/location-page";

export async function generateMetadata({ params }: { params: Promise<{ state: string; slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = await getLocationPage(slug);
  if (!page) return { title: "Page Not Found" };
  return locationPageMetadata(page);
}

export default async function LocationPageSlugRoute({ params }: { params: Promise<{ state: string; slug: string }> }) {
  const { slug } = await params;
  const page = await getLocationPage(slug);

  if (!page) {
    notFound();
  }

  return <LocationPageView page={page} />;
}
