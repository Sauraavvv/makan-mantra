"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Building2, ChevronRight, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { stateExploreHref } from "@/lib/state-routes";
import { stateCardImage } from "@/lib/state-images";

const INITIAL_VISIBLE = 12;

const STATE_CARDS = [
  { name: "Delhi", details: "Delhi, Noida, Gurgaon" },
  { name: "Maharashtra", details: "Mumbai, Pune, Nagpur" },
  { name: "Karnataka", details: "Bangalore, Mysore, Mangalore" },
  { name: "Telangana", details: "Hyderabad, Warangal, Karimnagar" },
  { name: "Haryana", details: "Gurgaon, Faridabad, Panipat" },
  { name: "West Bengal", details: "Kolkata, Howrah, Durgapur" },
  { name: "Goa", details: "Panaji, Margao, Mapusa" },
  { name: "Gujarat", details: "Ahmedabad, Surat, Vadodara" },
  { name: "Tamil Nadu", details: "Chennai, Coimbatore, Madurai" },
  { name: "Uttar Pradesh", details: "Lucknow, Noida, Varanasi" },
  { name: "Rajasthan", details: "Jaipur, Udaipur, Jodhpur" },
  { name: "Kerala", details: "Kochi, Trivandrum, Kozhikode" },
  { name: "Punjab", details: "Chandigarh, Ludhiana, Amritsar" },
  { name: "Madhya Pradesh", details: "Indore, Bhopal, Gwalior" },
  { name: "Andhra Pradesh", details: "Visakhapatnam, Vijayawada, Guntur" },
  { name: "Arunachal Pradesh", details: "Itanagar, Tawang, Pasighat" },
  { name: "Assam", details: "Guwahati, Dibrugarh, Silchar" },
  { name: "Bihar", details: "Patna, Gaya, Muzaffarpur" },
  { name: "Chhattisgarh", details: "Raipur, Bhilai, Bilaspur" },
  { name: "Himachal Pradesh", details: "Shimla, Manali, Dharamshala" },
  { name: "Jharkhand", details: "Ranchi, Jamshedpur, Dhanbad" },
  { name: "Jammu & Kashmir", details: "Srinagar, Jammu, Gulmarg" },
  { name: "Manipur", details: "Imphal, Thoubal, Bishnupur" },
  { name: "Meghalaya", details: "Shillong, Cherrapunji, Tura" },
  { name: "Mizoram", details: "Aizawl, Lunglei, Champhai" },
  { name: "Nagaland", details: "Kohima, Dimapur, Mokokchung" },
  { name: "Odisha", details: "Bhubaneswar, Cuttack, Puri" },
  { name: "Sikkim", details: "Gangtok, Namchi, Pelling" },
  { name: "Tripura", details: "Agartala, Udaipur, Dharmanagar" },
  { name: "Uttarakhand", details: "Dehradun, Haridwar, Nainital" },
  { name: "Andaman and Nicobar Islands", details: "Sri Vijaya Puram, Havelock, Neil Island" },
  { name: "Chandigarh", details: "Chandigarh, Manimajra, Sector 17" },
  { name: "Ladakh", details: "Leh, Kargil, Nubra" },
  { name: "Lakshadweep", details: "Kavaratti, Agatti, Minicoy" },
  { name: "Puducherry", details: "Puducherry, Karaikal, Mahe" },
];

export function StateExplorer() {
  const [expanded, setExpanded] = useState(false);
  const visibleStates = expanded ? STATE_CARDS : STATE_CARDS.slice(0, INITIAL_VISIBLE);
  const remaining = STATE_CARDS.length - INITIAL_VISIBLE;

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        {visibleStates.map((state) => (
          <Link
            key={state.name}
            href={stateExploreHref(state.name)}
            className="group relative block aspect-[3/2] overflow-hidden rounded-xl border border-border bg-card transition-all hover:-translate-y-0.5"
          >
            <Image
              src={stateCardImage(state.name)}
              alt={`${state.name} — ${state.details}`}
              fill
              sizes="(min-width: 1280px) 17vw, (min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </Link>
        ))}
      </div>

      {remaining > 0 && (
        <div
          className={`mt-6 rounded-2xl bg-secondary px-4 py-4 sm:px-6 ${
            expanded
              ? "flex justify-center"
              : "flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between"
          }`}
        >
          {!expanded && (
            <div className="flex items-center gap-4">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-background text-primary">
                <Building2 className="h-7 w-7" strokeWidth={1.7} />
              </div>
              <div>
                <h3 className="text-base font-bold leading-tight text-foreground md:text-lg">
                  Can&apos;t find your state?
                </h3>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  We&apos;ve got all the States and Union Territories covered.
                </p>
              </div>
            </div>
          )}

          <Button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            className="h-11 w-full shrink-0 gap-2 px-6 text-sm font-bold sm:w-auto"
          >
            {expanded ? (
              <>
                Show Fewer States <ChevronUp className="h-4 w-4" />
              </>
            ) : (
              <>
                View All States &amp; UTs <ChevronRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
