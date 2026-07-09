"use client";

import { useEffect } from "react";
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
