"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { stateExploreHref, stateSlug } from "@/lib/state-routes";
import { useLocation } from "@/context/location-context";
import { stateCardImage } from "@/lib/state-images";

/**
 * The zones states are grouped under here.
 *
 * The country's own administrative zones, which is what a visitor from Kochi
 * means by "South" and a visitor from Guwahati means by "North East" — not
 * anything drawn from our own data, which has no notion of a region.
 */
const REGIONS = ["All", "North", "South", "East", "West", "Central", "North East"] as const;

type Region = (typeof REGIONS)[number];

const STATE_CARDS: Array<{ name: string; details: string; region: Exclude<Region, "All"> }> = [
  { name: "Delhi", details: "Delhi, Noida, Gurgaon", region: "North" },
  { name: "Maharashtra", details: "Mumbai, Pune, Nagpur", region: "West" },
  { name: "Karnataka", details: "Bangalore, Mysore, Mangalore", region: "South" },
  { name: "Telangana", details: "Hyderabad, Warangal, Karimnagar", region: "South" },
  { name: "Haryana", details: "Gurgaon, Faridabad, Panipat", region: "North" },
  { name: "West Bengal", details: "Kolkata, Howrah, Durgapur", region: "East" },
  { name: "Goa", details: "Panaji, Margao, Mapusa", region: "West" },
  { name: "Gujarat", details: "Ahmedabad, Surat, Vadodara", region: "West" },
  { name: "Tamil Nadu", details: "Chennai, Coimbatore, Madurai", region: "South" },
  { name: "Uttar Pradesh", details: "Lucknow, Noida, Varanasi", region: "North" },
  { name: "Rajasthan", details: "Jaipur, Udaipur, Jodhpur", region: "North" },
  { name: "Kerala", details: "Kochi, Trivandrum, Kozhikode", region: "South" },
  { name: "Punjab", details: "Chandigarh, Ludhiana, Amritsar", region: "North" },
  { name: "Madhya Pradesh", details: "Indore, Bhopal, Gwalior", region: "Central" },
  { name: "Andhra Pradesh", details: "Visakhapatnam, Vijayawada, Guntur", region: "South" },
  { name: "Arunachal Pradesh", details: "Itanagar, Tawang, Pasighat", region: "North East" },
  { name: "Assam", details: "Guwahati, Dibrugarh, Silchar", region: "North East" },
  { name: "Bihar", details: "Patna, Gaya, Muzaffarpur", region: "East" },
  { name: "Chhattisgarh", details: "Raipur, Bhilai, Bilaspur", region: "Central" },
  { name: "Himachal Pradesh", details: "Shimla, Manali, Dharamshala", region: "North" },
  { name: "Jharkhand", details: "Ranchi, Jamshedpur, Dhanbad", region: "East" },
  { name: "Jammu & Kashmir", details: "Srinagar, Jammu, Gulmarg", region: "North" },
  { name: "Manipur", details: "Imphal, Thoubal, Bishnupur", region: "North East" },
  { name: "Meghalaya", details: "Shillong, Cherrapunji, Tura", region: "North East" },
  { name: "Mizoram", details: "Aizawl, Lunglei, Champhai", region: "North East" },
  { name: "Nagaland", details: "Kohima, Dimapur, Mokokchung", region: "North East" },
  { name: "Odisha", details: "Bhubaneswar, Cuttack, Puri", region: "East" },
  { name: "Sikkim", details: "Gangtok, Namchi, Pelling", region: "North East" },
  { name: "Tripura", details: "Agartala, Udaipur, Dharmanagar", region: "North East" },
  { name: "Uttarakhand", details: "Dehradun, Haridwar, Nainital", region: "North" },
  // The islands sit with the South, which is the coast they are administered
  // and flown from; a zone of their own would be two tabs holding one card each.
  { name: "Andaman and Nicobar Islands", details: "Sri Vijaya Puram, Havelock, Neil Island", region: "South" },
  { name: "Chandigarh", details: "Chandigarh, Manimajra, Sector 17", region: "North" },
  { name: "Ladakh", details: "Leh, Kargil, Nubra", region: "North" },
  { name: "Lakshadweep", details: "Kavaratti, Agatti, Minicoy", region: "South" },
  { name: "Puducherry", details: "Puducherry, Karaikal, Mahe", region: "South" },
];

/**
 * Which zone a state belongs to, keyed by slug.
 *
 * Slugged rather than matched by name because the two lists spell one state
 * differently — the picker says "Jammu and Kashmir" and the card below says
 * "Jammu & Kashmir" — and `stateSlug` already folds the ampersand.
 */
const REGION_BY_STATE_SLUG: Record<string, Exclude<Region, "All">> = Object.fromEntries(
  STATE_CARDS.map((state) => [stateSlug(state.name), state.region]),
);

/**
 * Every state and union territory, filtered by zone.
 *
 * This used to show twelve and hide the other twenty-three behind a "Can't find
 * your state?" panel, which asked the visitor to admit the list was too short
 * before it would grow. The zones do that work instead: nothing is hidden, and
 * anyone who knows roughly where they are looking can halve the grid in a click.
 */
export function StateExplorer() {
  const { meta } = useLocation();
  // Held as "which tab was clicked", not "which tab is showing", so the zone
  // can follow the visitor's state until they say otherwise — and then stop.
  // Derived at render rather than synced in an effect: an effect would render
  // the wrong zone once and correct it, which is the flicker it exists to stop.
  const [picked, setPicked] = useState<Region | null>(null);
  const region = picked ?? REGION_BY_STATE_SLUG[stateSlug(meta.label)] ?? "All";
  const visibleStates =
    region === "All" ? STATE_CARDS : STATE_CARDS.filter((state) => state.region === region);

  return (
    <div>
      {/* Wrapping rather than scrolling: seven short pills fit a phone in two
          rows, and a row that scrolls sideways hides the tabs at its end. */}
      <div className="mb-4 flex flex-wrap gap-2">
        {REGIONS.map((name) => {
          const active = region === name;

          return (
            <button
              key={name}
              type="button"
              onClick={() => setPicked(name)}
              aria-pressed={active}
              className={`h-8 rounded-full border px-3.5 text-xs font-semibold transition-colors ${
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-white text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {name}
            </button>
          );
        })}
      </div>

      {/* A named row rather than a picture.
          These used to be 3:2 tiles with the artwork cropped to fill them, back
          when each drawing carried its own state's name. It does not any more —
          the names were lifted out so they could be set at one size — so the
          picture is now shown small and whole, ruled off from the name beside
          it, and the card is as tall as that row needs and no taller. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {visibleStates.map((state) => (
          <Link
            key={state.name}
            href={stateExploreHref(state.name)}
            title={`${state.name} — ${state.details}`}
            /* Pure white, not `bg-card` — that token is a faintly blue
               off-white and the artwork is drawn on plain white, so the icon
               showed as a paler rectangle sitting on the card. For the same
               reason the hover only moves the border: any wash over the card
               would bring the seam straight back, the picture being opaque. */
            className="group flex items-center overflow-hidden rounded-xl border border-border bg-white transition-colors hover:border-primary/50"
          >
            {/* A wide cell for a wide drawing. The artwork is about 1.26:1, so
                a square box sized it by its width and left a third of the
                height empty — 48px of icon needs 60px of room across, not 48. */}
            <span className="grid h-20 w-24 shrink-0 place-items-center border-r border-border">
              <Image
                src={stateCardImage(state.name)}
                alt=""
                width={160}
                height={128}
                className="h-14 w-20 object-contain"
              />
            </span>
            <span className="min-w-0 flex-1 truncate px-3 text-sm font-medium text-foreground">
              {state.name}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
