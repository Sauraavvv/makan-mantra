export type Slab = { upTo: number; rate: number };

export type StateData = {
  name: string;
  male: number | Slab[];
  female: number | Slab[];
  registration: number;   // % of property value
  registrationCap?: number; // max registration in ₹ (some states cap it)
  note?: string;
};

function flat(male: number, female?: number, reg = 1, cap?: number, note?: string): StateData {
  return { name: "", male, female: female ?? male, registration: reg, registrationCap: cap, note };
}

// Slab helper: upTo = upper limit in ₹ (Infinity for last slab)
function slabs(male: Slab[], female?: Slab[], reg = 1, note?: string): StateData {
  return { name: "", male, female: female ?? male, registration: reg, note };
}

export const STATES: StateData[] = [
  { ...flat(5, 4, 1, undefined, "Urban areas. Rural rates may differ."), name: "Maharashtra" },
  { ...flat(6, 4, 1), name: "Delhi" },
  { ...flat(7, 6, 1), name: "Uttar Pradesh" },
  { ...flat(7, 5, 1), name: "Haryana" },
  {
    name: "Karnataka",
    male: [
      { upTo: 2000000, rate: 2 },
      { upTo: 4500000, rate: 3 },
      { upTo: Infinity, rate: 5 },
    ],
    female: [
      { upTo: 2000000, rate: 2 },
      { upTo: 4500000, rate: 3 },
      { upTo: Infinity, rate: 5 },
    ],
    registration: 1,
    note: "Slabs: up to ₹20L @ 2%, ₹20L–₹45L @ 3%, above ₹45L @ 5%.",
  },
  { ...flat(7, 7), name: "Tamil Nadu" },
  { ...flat(4, 4, 1, undefined, "Includes all transactions."), name: "Telangana" },
  {
    name: "West Bengal",
    male: [
      { upTo: 2500000, rate: 5 },
      { upTo: 4000000, rate: 6 },
      { upTo: Infinity, rate: 7 },
    ],
    female: [
      { upTo: 2500000, rate: 5 },
      { upTo: 4000000, rate: 6 },
      { upTo: Infinity, rate: 7 },
    ],
    registration: 1,
    note: "Slabs: up to ₹25L @ 5%, ₹25L–₹40L @ 6%, above ₹40L @ 7%.",
  },
  { ...flat(4.9, 4.9, 1), name: "Gujarat" },
  { ...flat(8, 8, 2), name: "Kerala" },
  { ...flat(6, 5, 1), name: "Rajasthan" },
  { ...flat(7.5, 7.5, 1), name: "Madhya Pradesh" },
  { ...flat(6, 5.7, 1, undefined, "Registration is 2% capped at ₹1 lakh."), name: "Bihar" },
  {
    name: "Goa",
    male: [
      { upTo: 5000000, rate: 3.5 },
      { upTo: 7500000, rate: 4 },
      { upTo: Infinity, rate: 4.5 },
    ],
    female: [
      { upTo: 5000000, rate: 3.5 },
      { upTo: 7500000, rate: 4 },
      { upTo: Infinity, rate: 4.5 },
    ],
    registration: 0.5,
    note: "Slabs: up to ₹50L @ 3.5%, ₹50L–₹75L @ 4%, above ₹75L @ 4.5%.",
  },
  { ...flat(5, 4, 1), name: "Himachal Pradesh" },
  { ...flat(5, 4, 1), name: "Odisha" },
  { ...flat(7, 5, 1), name: "Punjab" },
  { ...flat(5, 3.75, 1), name: "Uttarakhand" },
  { ...flat(5, 5, 1), name: "Chhattisgarh" },
  { ...flat(4, 4, 1), name: "Jharkhand" },
  { ...flat(8.25, 8.25, 1), name: "Assam" },
  { ...flat(7, 7, 1), name: "Manipur" },
  { ...flat(9.9, 9.9, 1), name: "Meghalaya" },
  { ...flat(9, 9, 1), name: "Mizoram" },
  { ...flat(8, 8, 1), name: "Nagaland" },
  { ...flat(6, 6, 1), name: "Arunachal Pradesh" },
  { ...flat(5, 5, 1), name: "Sikkim" },
  { ...flat(7, 7, 1), name: "Tripura" },
  { ...flat(5, 5, 1), name: "Jammu & Kashmir" },
  { ...flat(5, 5, 1), name: "Ladakh" },
  { ...flat(6, 4, 1), name: "Chandigarh" },
  { ...flat(5, 5, 1), name: "Puducherry" },
  { ...flat(4, 4, 1), name: "Dadra & Nagar Haveli and Daman & Diu" },
  { ...flat(5, 5, 1), name: "Andaman & Nicobar Islands" },
  { ...flat(2, 2, 1), name: "Lakshadweep" },
  { ...flat(5, 4, 1), name: "Andhra Pradesh" },
];

export function calcStampDuty(value: number, state: StateData, gender: "male" | "female") {
  const rate = state[gender];
  let stampDuty: number;

  if (typeof rate === "number") {
    stampDuty = (value * rate) / 100;
  } else {
    // slab-based
    let remaining = value;
    let prev = 0;
    stampDuty = 0;
    for (const slab of rate) {
      const slabAmount = Math.min(remaining, slab.upTo - prev);
      stampDuty += (slabAmount * slab.rate) / 100;
      remaining -= slabAmount;
      prev = slab.upTo;
      if (remaining <= 0) break;
    }
  }

  const registrationCharge = state.registrationCap
    ? Math.min((value * state.registration) / 100, state.registrationCap)
    : (value * state.registration) / 100;

  return {
    stampDuty: Math.round(stampDuty),
    registrationCharge: Math.round(registrationCharge),
    total: Math.round(stampDuty + registrationCharge),
  };
}
