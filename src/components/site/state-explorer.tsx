"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { stateExploreHref } from "@/lib/state-routes";
import { stateCardImage } from "@/lib/state-images";

const INITIAL_VISIBLE = 8;

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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
              sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold text-white opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100">
              Explore <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </Link>
        ))}
      </div>

      {remaining > 0 && (
        <div className="mt-6 flex justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={() => setExpanded((current) => !current)}
            className="h-10 gap-2 px-4"
          >
            {expanded ? (
              <>
                Show less <ChevronUp className="h-4 w-4" />
              </>
            ) : (
              <>
                View all states ({remaining}) <ChevronDown className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
