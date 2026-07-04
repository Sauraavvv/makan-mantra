"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { stateExploreHref } from "@/lib/state-routes";
import { stateCardImage } from "@/lib/state-images";

const INITIAL_VISIBLE = 14;

const STATE_CARDS = [
  {
    name: "Delhi",
    properties: "160,000+ Properties",
    details: "Delhi, Noida, Gurgaon",
    image: "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=900&auto=format&fit=crop",
  },
  {
    name: "Maharashtra",
    properties: "36,000+ Properties",
    details: "Mumbai, Pune, Nagpur",
    image: "https://images.unsplash.com/photo-1567157577867-05ccb1388e66?w=900&auto=format&fit=crop",
  },
  {
    name: "Karnataka",
    properties: "38,000+ Properties",
    details: "Bangalore, Mysore, Mangalore",
    image: "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=900&auto=format&fit=crop",
  },
  {
    name: "Telangana",
    properties: "21,000+ Properties",
    details: "Hyderabad, Warangal, Karimnagar",
    image: "/hero-home.jpg",
  },
  {
    name: "Haryana",
    properties: "37,000+ Properties",
    details: "Gurgaon, Faridabad, Panipat",
    image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=900&auto=format&fit=crop",
  },
  {
    name: "West Bengal",
    properties: "30,000+ Properties",
    details: "Kolkata, Howrah, Durgapur",
    image: "https://images.unsplash.com/photo-1558431382-27e303142255?w=900&auto=format&fit=crop",
  },
  {
    name: "Goa",
    properties: "33,000+ Properties",
    details: "Panaji, Margao, Mapusa",
    image: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=900&auto=format&fit=crop",
  },
  {
    name: "Gujarat",
    properties: "29,000+ Properties",
    details: "Ahmedabad, Surat, Vadodara",
    image: "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=900&auto=format&fit=crop",
  },
  {
    name: "Tamil Nadu",
    properties: "34,000+ Properties",
    details: "Chennai, Coimbatore, Madurai",
    image: "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=900&auto=format&fit=crop",
  },
  {
    name: "Uttar Pradesh",
    properties: "41,000+ Properties",
    details: "Lucknow, Noida, Varanasi",
    image: "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=900&auto=format&fit=crop",
  },
  {
    name: "Rajasthan",
    properties: "26,000+ Properties",
    details: "Jaipur, Udaipur, Jodhpur",
    image: "https://images.unsplash.com/photo-1599661046827-dacff0c0f09a?w=900&auto=format&fit=crop",
  },
  {
    name: "Kerala",
    properties: "22,000+ Properties",
    details: "Kochi, Trivandrum, Kozhikode",
    image: "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=900&auto=format&fit=crop",
  },
  {
    name: "Punjab",
    properties: "18,000+ Properties",
    details: "Chandigarh, Ludhiana, Amritsar",
    image: "https://images.unsplash.com/photo-1609947017136-9daf32a5eb16?w=900&auto=format&fit=crop",
  },
  {
    name: "Madhya Pradesh",
    properties: "25,000+ Properties",
    details: "Indore, Bhopal, Gwalior",
    image: "https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?w=900&auto=format&fit=crop",
  },
  {
    name: "Andhra Pradesh",
    properties: "19,000+ Properties",
    details: "Visakhapatnam, Vijayawada, Guntur",
    image: "https://images.unsplash.com/photo-1627894483216-2138af692e32?w=900&auto=format&fit=crop",
  },
  {
    name: "Arunachal Pradesh",
    properties: "8,000+ Properties",
    details: "Itanagar, Tawang, Pasighat",
    image: "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=900&auto=format&fit=crop",
  },
  {
    name: "Assam",
    properties: "16,000+ Properties",
    details: "Guwahati, Dibrugarh, Silchar",
    image: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=900&auto=format&fit=crop",
  },
  {
    name: "Bihar",
    properties: "20,000+ Properties",
    details: "Patna, Gaya, Muzaffarpur",
    image: "https://images.unsplash.com/photo-1598091383021-15ddea10925d?w=900&auto=format&fit=crop",
  },
  {
    name: "Chhattisgarh",
    properties: "14,000+ Properties",
    details: "Raipur, Bhilai, Bilaspur",
    image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900&auto=format&fit=crop",
  },
  {
    name: "Himachal Pradesh",
    properties: "11,000+ Properties",
    details: "Shimla, Manali, Dharamshala",
    image: "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=900&auto=format&fit=crop",
  },
  {
    name: "Jharkhand",
    properties: "13,000+ Properties",
    details: "Ranchi, Jamshedpur, Dhanbad",
    image: "https://images.unsplash.com/photo-1518005020951-eccb494ad742?w=900&auto=format&fit=crop",
  },
  {
    name: "Jammu & Kashmir",
    properties: "10,000+ Properties",
    details: "Srinagar, Jammu, Gulmarg",
    image: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=900&auto=format&fit=crop",
  },
  {
    name: "Manipur",
    properties: "7,000+ Properties",
    details: "Imphal, Thoubal, Bishnupur",
    image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900&auto=format&fit=crop",
  },
  {
    name: "Meghalaya",
    properties: "9,000+ Properties",
    details: "Shillong, Cherrapunji, Tura",
    image: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=900&auto=format&fit=crop",
  },
  {
    name: "Mizoram",
    properties: "6,000+ Properties",
    details: "Aizawl, Lunglei, Champhai",
    image: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=900&auto=format&fit=crop",
  },
  {
    name: "Nagaland",
    properties: "6,500+ Properties",
    details: "Kohima, Dimapur, Mokokchung",
    image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900&auto=format&fit=crop",
  },
  {
    name: "Odisha",
    properties: "17,000+ Properties",
    details: "Bhubaneswar, Cuttack, Puri",
    image: "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?w=900&auto=format&fit=crop",
  },
  {
    name: "Sikkim",
    properties: "5,500+ Properties",
    details: "Gangtok, Namchi, Pelling",
    image: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=900&auto=format&fit=crop",
  },
  {
    name: "Tripura",
    properties: "7,500+ Properties",
    details: "Agartala, Udaipur, Dharmanagar",
    image: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=900&auto=format&fit=crop",
  },
  {
    name: "Uttarakhand",
    properties: "12,000+ Properties",
    details: "Dehradun, Haridwar, Nainital",
    image: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=900&auto=format&fit=crop",
  },
];

export function StateExplorer() {
  const [expanded, setExpanded] = useState(false);
  const visibleStates = expanded ? STATE_CARDS : STATE_CARDS.slice(0, INITIAL_VISIBLE);
  const remaining = STATE_CARDS.length - INITIAL_VISIBLE;

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {visibleStates.map((state) => (
          <Link
            key={state.name}
            href={stateExploreHref(state.name)}
            className="group relative min-h-[250px] overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
          >
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
              style={{ backgroundImage: `url(${stateCardImage(state.name) || state.image})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/5" />
            <div className="relative flex h-full min-h-[250px] flex-col justify-end p-4 text-white">
              <h3 className="text-2xl font-bold leading-tight tracking-tight">{state.name}</h3>
              <p className="mt-2 line-clamp-2 text-sm font-medium leading-snug text-white/85">
                {state.details}
              </p>
              <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-white/90 opacity-0 transition-opacity group-hover:opacity-100">
                Explore <ArrowRight className="h-3.5 w-3.5" />
              </div>
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
                Show more states ({remaining}) <ChevronDown className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
