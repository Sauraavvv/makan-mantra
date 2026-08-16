import { STATES } from "@/lib/states";

export const stateCities: Record<string, [string, string, string]> = {
  "andaman and nicobar islands": ["Port Blair", "Havelock Island", "Diglipur"],
  maharashtra: ["Mumbai", "Pune", "Nagpur"],
  delhi: ["Dwarka", "Rohini", "Saket"],
  karnataka: ["Bangalore", "Mysore", "Hubli"],
  "tamil nadu": ["Chennai", "Coimbatore", "Madurai"],
  "uttar pradesh": ["Lucknow", "Noida", "Agra"],
  gujarat: ["Ahmedabad", "Surat", "Vadodara"],
  rajasthan: ["Jaipur", "Udaipur", "Jodhpur"],
  "west bengal": ["Kolkata", "Howrah", "Durgapur"],
  telangana: ["Hyderabad", "Warangal", "Nizamabad"],
  "andhra pradesh": ["Visakhapatnam", "Vijayawada", "Guntur"],
  "madhya pradesh": ["Indore", "Bhopal", "Jabalpur"],
  bihar: ["Patna", "Gaya", "Muzaffarpur"],
  punjab: ["Amritsar", "Ludhiana", "Chandigarh"],
  haryana: ["Gurugram", "Faridabad", "Panipat"],
  kerala: ["Kochi", "Thiruvananthapuram", "Kozhikode"],
  odisha: ["Bhubaneswar", "Cuttack", "Rourkela"],
  jharkhand: ["Ranchi", "Jamshedpur", "Dhanbad"],
  assam: ["Guwahati", "Silchar", "Dibrugarh"],
  uttarakhand: ["Dehradun", "Haridwar", "Nainital"],
  "himachal pradesh": ["Shimla", "Manali", "Dharamshala"],
  chandigarh: ["Sector 17", "Sector 22", "Mohali"],
  goa: ["Panaji", "Margao", "Vasco da Gama"],
  chhattisgarh: ["Raipur", "Bilaspur", "Durg"],
  "jammu and kashmir": ["Jammu", "Srinagar", "Udhampur"],
  "jammu & kashmir": ["Jammu", "Srinagar", "Udhampur"],
  ladakh: ["Leh", "Kargil", "Nubra"],
  lakshadweep: ["Kavaratti", "Agatti", "Minicoy"],
  puducherry: ["Puducherry", "Karaikal", "Mahe"],
  tripura: ["Agartala", "Udaipur", "Dharmanagar"],
  meghalaya: ["Shillong", "Tura", "Jowai"],
  "arunachal pradesh": ["Itanagar", "Naharlagun", "Pasighat"],
  manipur: ["Imphal", "Thoubal", "Bishnupur"],
  mizoram: ["Aizawl", "Lunglei", "Champhai"],
  nagaland: ["Kohima", "Dimapur", "Mokokchung"],
  sikkim: ["Gangtok", "Namchi", "Gyalshing"],
};

/**
 * The canonical spelling of a state, matched however it was written.
 *
 * Title-casing every word instead — which this used to do — turned "Jammu and
 * Kashmir" into "Jammu And Kashmir", a name that matches nothing in `STATES`.
 * Everything keyed on the label then quietly failed: the picker could not tell
 * which tile was the current one, so it never floated it to the top.
 */
function canonicalStateName(state: string) {
  const key = state.toLowerCase().trim();
  return STATES.find((name) => name.toLowerCase() === key) ?? state.trim();
}

export function getStateMeta(state: string | null): {
  label: string;
  from: [string, string, string];
} {
  if (!state) return { label: "India", from: ["Mumbai", "Bangalore", "Delhi"] };
  const key = state.toLowerCase().trim();
  const cities = stateCities[key];
  if (!cities) return { label: "India", from: ["Mumbai", "Bangalore", "Delhi"] };

  return { label: canonicalStateName(state), from: cities };
}
