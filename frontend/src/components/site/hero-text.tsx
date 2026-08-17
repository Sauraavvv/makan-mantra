"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { useLocation } from "@/context/location-context";

const ISO_TO_STATE: Record<string, string> = {
  "IN-AP": "Andhra Pradesh", "IN-AR": "Arunachal Pradesh", "IN-AS": "Assam",
  "IN-BR": "Bihar", "IN-CT": "Chhattisgarh", "IN-GA": "Goa", "IN-GJ": "Gujarat",
  "IN-HR": "Haryana", "IN-HP": "Himachal Pradesh", "IN-JH": "Jharkhand",
  "IN-KA": "Karnataka", "IN-KL": "Kerala", "IN-MP": "Madhya Pradesh",
  "IN-MH": "Maharashtra", "IN-MN": "Manipur", "IN-ML": "Meghalaya",
  "IN-MZ": "Mizoram", "IN-NL": "Nagaland", "IN-OR": "Odisha", "IN-PB": "Punjab",
  "IN-RJ": "Rajasthan", "IN-SK": "Sikkim", "IN-TN": "Tamil Nadu",
  "IN-TG": "Telangana", "IN-TR": "Tripura", "IN-UP": "Uttar Pradesh",
  "IN-UT": "Uttarakhand", "IN-WB": "West Bengal", "IN-CH": "Chandigarh",
  "IN-DL": "Delhi", "IN-JK": "Jammu and Kashmir", "IN-LA": "Ladakh",
  "IN-PY": "Puducherry", "IN-AN": "Andaman and Nicobar Islands",
  "IN-LD": "Lakshadweep",
};

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { "Accept-Language": "en" } }
    );
    const data = await res.json();
    const addr = data?.address;
    if (!addr) return null;

    // most states return address.state directly
    if (addr.state) return addr.state;

    // union territories (Delhi, Chandigarh etc.) only have ISO code
    const isoCode = addr["ISO3166-2-lvl4"] as string | undefined;
    if (isoCode && ISO_TO_STATE[isoCode]) return ISO_TO_STATE[isoCode];

    return null;
  } catch {
    return null;
  }
}

function uniqueLocationNames(...groups: Array<readonly string[] | undefined>) {
  const names: string[] = [];
  const seen = new Set<string>();

  for (const group of groups) {
    for (const value of group ?? []) {
      const name = value.trim();
      const key = name.toLowerCase();
      if (!name || seen.has(key)) continue;

      names.push(name);
      seen.add(key);
    }
  }

  return names;
}

export function HeroText({
  align = "center",
}: {
  align?: "center" | "left";
}) {
  const { meta, setDetectedState } = useLocation();
  const [backendCitiesByState, setBackendCitiesByState] =
    useState<Record<string, string[]>>({});
  const [areaIndex, setAreaIndex] = useState(0);
  const requestedCityStates = useRef(new Set<string>());
  const mounted = useRef(true);

  useEffect(() => {
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (meta.label === "India" || requestedCityStates.current.has(meta.label)) return;
    requestedCityStates.current.add(meta.label);

    void (async () => {
      try {
        const res = await fetch(`/api/cities?state=${encodeURIComponent(meta.label)}`, {
          cache: "no-store",
        });
        if (!res.ok) return;

        const data = (await res.json()) as { cities?: string[]; locations?: string[] };
        const cities = (data.locations ?? data.cities ?? [])
          .filter((city) => typeof city === "string" && city.trim());

        if (mounted.current && cities.length > 0) {
          setBackendCitiesByState((current) => ({ ...current, [meta.label]: cities }));
        }
      } catch {
        // The static city list remains the fallback when the location API is unavailable.
      }
    })();
  }, [meta.label]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const state = await reverseGeocode(coords.latitude, coords.longitude);
        setDetectedState(state);
      },
      () => {},
      { timeout: 8000 }
    );
  }, [setDetectedState]);

  const backendAreas = uniqueLocationNames(backendCitiesByState[meta.label]);
  // Once the shared API responds, it is the sole source for both this rotation
  // and Trending Searches. The static state values are only a loading fallback.
  const areas = backendAreas.length > 0 ? backendAreas : meta.from;
  const activeArea = areas[areaIndex % areas.length] ?? meta.from[0];

  useEffect(() => {
    if (areas.length < 2) return;

    const timer = window.setInterval(() => {
      setAreaIndex((index) => (index + 1) % areas.length);
    }, 2600);

    return () => window.clearInterval(timer);
  }, [areas.length, meta.label]);

  return (
    <>
      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur">
        <ShieldCheck className="h-3.5 w-3.5 text-success" />
        Explore verified listings across {meta.label}
      </div>
      <h1
        className={`whitespace-nowrap text-[clamp(1.4rem,3.2vw,3.2rem)] font-bold tracking-tight text-white ${
          align === "center" ? "text-center" : "text-left"
        }`}
      >
        Find your next <span className="text-white">home</span> in{" "}
        <span className="text-saffron">{meta.label}</span>
      </h1>
      <p
        className={`mt-1.5 whitespace-nowrap text-[clamp(0.7rem,1.2vw,1.1rem)] font-semibold text-white/85 ${
          align === "center" ? "text-center" : "text-left"
        }`}
      >
        Search flats, villas and plots for sale or rent across major areas of {meta.label}
        <span
          aria-hidden="true"
          className="mx-2 inline-block text-2xl leading-none text-saffron drop-shadow-[0_0_5px_rgba(255,122,26,0.9)]"
        >
          •
        </span>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={`${meta.label}-${activeArea}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="inline-block font-semibold text-saffron"
          >
            {activeArea}
          </motion.span>
        </AnimatePresence>
      </p>
    </>
  );
}
