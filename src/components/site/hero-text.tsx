"use client";

import { useEffect } from "react";
import { ShieldCheck } from "lucide-react";
import { useLocation } from "@/context/location-context";

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { "Accept-Language": "en" } }
    );
    const data = await res.json();
    return data?.address?.state ?? data?.address?.region ?? null;
  } catch {
    return null;
  }
}

export function HeroText() {
  const { meta, setStateByName } = useLocation();

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const state = await reverseGeocode(coords.latitude, coords.longitude);
        setStateByName(state);
      },
      () => {},
      { timeout: 8000 }
    );
  }, []);

  return (
    <>
      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur">
        <ShieldCheck className="h-3.5 w-3.5 text-success" />
        1.2M+ verified listings across {meta.label}
      </div>
      <h1 className="whitespace-nowrap text-center text-[clamp(1.4rem,3.2vw,3.2rem)] font-bold tracking-tight text-white">
        Find your next <span className="text-white">home</span> in{" "}
        <span className="text-saffron">{meta.label}</span>
      </h1>
      <p className="mt-1.5 whitespace-nowrap text-center text-[clamp(0.7rem,1.2vw,1.1rem)] text-white/85">
        Search flats, villas and plots for sale or rent across {meta.label} — from{" "}
        {meta.from[0]}, {meta.from[1]} and {meta.from[2]}.
      </p>
    </>
  );
}
