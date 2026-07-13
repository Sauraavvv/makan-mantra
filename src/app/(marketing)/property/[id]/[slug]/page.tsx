"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bath,
  BedDouble,
  Bookmark,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Home,
  MapPin,
  Maximize2,
  Phone,
  Share2,
} from "lucide-react";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { generateProperties } from "@/lib/properties";
import { stateExploreHref } from "@/lib/state-routes";

export default function PropertyDetailPage({ params }: { params: Promise<{ id: string; slug: string }> }) {
  const { id } = use(params);
  const stateFromId = (id.split("-")[0] || "maharashtra").replace(/^\w/, (c) => c.toUpperCase());
  const list = useMemo(() => generateProperties(stateFromId, 36), [stateFromId]);
  const property = list.find((item) => item.id === id) ?? list[0];
  const [active, setActive] = useState(0);
  const gallery = [property.image, ...list.slice(0, 4).map((item) => item.image)];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <nav className="relative z-10 border-b border-border bg-card/40">
        <ol className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
          <li>
            <Link href="/" className="flex items-center gap-1 hover:text-foreground">
              <Home className="h-3.5 w-3.5" /> India
            </Link>
          </li>
          <ChevronRight className="h-3.5 w-3.5" />
          <li>
            <Link href={stateExploreHref(property.state)} className="hover:text-foreground">
              {property.state}
            </Link>
          </li>
          <ChevronRight className="h-3.5 w-3.5" />
          <li className="font-medium text-foreground">{property.title}</li>
        </ol>
      </nav>

      <main className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-6 lg:grid-cols-[1fr_360px]">
        <section>
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="relative aspect-[16/10] bg-muted">
              <img src={gallery[active]} alt={property.title} className="h-full w-full object-cover" />
              <Badge
                className={`absolute left-4 top-4 border-0 font-semibold ${
                  property.listing === "sale"
                    ? "bg-saffron text-saffron-foreground"
                    : "bg-primary text-primary-foreground"
                }`}
              >
                {property.listing === "sale" ? "FOR SALE" : "FOR RENT"}
              </Badge>
              <div className="absolute right-4 top-4 flex gap-2">
                <Button size="icon" variant="secondary" aria-label="Share">
                  <Share2 className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="secondary" aria-label="Save">
                  <Bookmark className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-2 p-2">
              {gallery.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  onClick={() => setActive(index)}
                  className={`aspect-[4/3] overflow-hidden rounded-md border-2 transition ${
                    active === index ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                >
                  <img src={image} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold md:text-3xl">{property.title}</h1>
              <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" /> {property.locality}, {property.city}, {property.state}
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-primary">{property.priceLabel}</div>
              <div className="text-xs text-muted-foreground">
                ₹{Math.round((property.priceValue * 100000) / property.area).toLocaleString("en-IN")} / sq.ft
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Spec icon={BedDouble} label="Bedrooms" value={`${property.beds} Beds`} />
            <Spec icon={Bath} label="Bathrooms" value={`${property.baths} Baths`} />
            <Spec icon={Maximize2} label="Area" value={`${property.area} sq.ft`} />
            <Spec icon={Building2} label="Type" value={property.type} />
          </div>

          <section className="mt-8">
            <h2 className="text-xl font-bold">Overview</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              This beautifully designed {property.bhk} BHK {property.type.toLowerCase()} in{" "}
              {property.locality} offers a blend of comfort and convenience. Located in one of{" "}
              {property.city}&apos;s sought-after neighborhoods, the property features modern interiors,
              natural light, and strong connectivity to schools, hospitals, and business districts.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-bold">Amenities</h2>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
              {[
                "Covered Parking",
                "24/7 Security",
                "Power Backup",
                "Lift",
                "Clubhouse",
                "Swimming Pool",
                "Gymnasium",
                "Children's Play Area",
                "Rain Water Harvesting",
              ].map((amenity) => (
                <div key={amenity} className="flex items-center gap-2 text-foreground/80">
                  <CheckCircle2 className="h-4 w-4 text-success" /> {amenity}
                </div>
              ))}
            </div>
          </section>
        </section>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-primary font-bold text-primary-foreground">
                RK
              </div>
              <div className="min-w-0">
                <div className="font-semibold">Rahul Kumar</div>
                <div className="text-xs text-muted-foreground">Verified Agent · {property.city}</div>
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <Button className="w-full gap-2 bg-saffron text-saffron-foreground hover:bg-saffron/90">
                <Phone className="h-4 w-4" /> Contact Agent
              </Button>
              <Button variant="outline" className="w-full gap-2">
                <Calendar className="h-4 w-4" /> Schedule a visit
              </Button>
            </div>
            <div className="mt-4 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
              Posted {property.posted}. Response usually within 30 mins.
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold">EMI Calculator</h3>
            <div className="mt-3 text-sm">
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Loan amount</span>
                <span>₹{Math.round(property.priceValue * 0.8)} L</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Tenure</span>
                <span>20 yrs</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Rate</span>
                <span>8.5%</span>
              </div>
              <div className="mt-2 flex justify-between border-t border-border pt-2 font-semibold">
                <span>Estimated EMI</span>
                <span className="text-primary">
                  ₹{Math.round(property.priceValue * 0.8 * 100000 * 0.0087).toLocaleString("en-IN")}/mo
                </span>
              </div>
            </div>
          </div>
        </aside>
      </main>

      <Footer />
    </div>
  );
}

function Spec({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BedDouble;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-4 w-4 text-primary" /> {label}
      </div>
      <div className="mt-1 font-semibold">{value}</div>
    </div>
  );
}
