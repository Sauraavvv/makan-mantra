import { notFound } from "next/navigation";
import { Metadata } from "next";
import { ChevronRight, Home, MapPin } from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { Badge } from "@/components/ui/badge";
import { stateExploreHref } from "@/lib/state-routes";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function getStatePage(slug: string) {
  try {
    const res = await fetch(`${API}/state-pages/${slug}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ state: string; slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = await getStatePage(slug);
  if (!page) return { title: "Page Not Found" };
  return {
    title: page.seo.meta_title,
    description: page.seo.meta_description || page.seo.on_page_title,
    keywords: page.seo.keywords,
  };
}

export default async function LocationSlugPage({ params }: { params: Promise<{ state: string; slug: string }> }) {
  const { state: stateSlug, slug } = await params;
  const page = await getStatePage(slug);
  if (!page) notFound();

  const stateName = page.location.state || page.location_name;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      {/* Breadcrumb */}
      <nav className="border-b border-border bg-card/40">
        <ol className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
          <li>
            <Link href="/" className="flex items-center gap-1 hover:text-foreground">
              <Home className="h-3.5 w-3.5" /> India
            </Link>
          </li>
          <ChevronRight className="h-3.5 w-3.5" />
          <li>
            <Link href={stateExploreHref(stateName)} className="hover:text-foreground">{stateName}</Link>
          </li>
          <ChevronRight className="h-3.5 w-3.5" />
          <li className="font-medium text-foreground">{page.seo.on_page_title}</li>
        </ol>
      </nav>

      {/* Hero */}
      <section className="border-b border-border bg-gradient-to-br from-primary/5 via-background to-saffron/5">
        <div className="mx-auto max-w-7xl px-4 py-8 md:py-12">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            {page.seo.on_page_title}
          </h1>
          {page.seo.on_page_description && (
            <p className="mt-3 max-w-2xl text-muted-foreground">{page.seo.on_page_description}</p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="secondary" className="capitalize">{page.property_type.replace(/_/g, " ")}</Badge>
            <Badge variant="secondary" className="capitalize">{page.listing_type}</Badge>
            <Badge variant="secondary">{stateName}</Badge>
          </div>
        </div>
      </section>

      {/* Properties section */}
      <main className="mx-auto w-full max-w-7xl px-4 py-8">
        <div className="rounded-xl border border-dashed border-border p-16 text-center text-muted-foreground">
          <MapPin className="mx-auto mb-3 h-10 w-10 opacity-30" />
          <p className="font-medium">Properties coming soon</p>
          <p className="mt-1 text-sm">
            {page.seo.on_page_title} listings will appear here once property data is connected.
          </p>
        </div>
      </main>

      {/* SEO keywords */}
      {page.seo.keywords?.length > 0 && (
        <section className="border-t border-border bg-card/40">
          <div className="mx-auto max-w-7xl px-4 py-8">
            <h2 className="mb-3 text-sm font-semibold">Popular searches</h2>
            <div className="flex flex-wrap gap-2">
              {page.seo.keywords.map((k: string) => (
                <Badge key={k} variant="secondary" className="cursor-pointer hover:bg-accent">{k}</Badge>
              ))}
            </div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}
