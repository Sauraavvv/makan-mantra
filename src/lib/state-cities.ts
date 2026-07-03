export const stateCities: Record<string, [string, string, string]> = {
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
  tripura: ["Agartala", "Udaipur", "Dharmanagar"],
  meghalaya: ["Shillong", "Tura", "Jowai"],
  "arunachal pradesh": ["Itanagar", "Naharlagun", "Pasighat"],
  manipur: ["Imphal", "Thoubal", "Bishnupur"],
  mizoram: ["Aizawl", "Lunglei", "Champhai"],
  nagaland: ["Kohima", "Dimapur", "Mokokchung"],
  sikkim: ["Gangtok", "Namchi", "Gyalshing"],
};

export function getStateMeta(state: string | null): {
  label: string;
  from: [string, string, string];
} {
  if (!state) return { label: "India", from: ["Mumbai", "Bangalore", "Delhi"] };
  const key = state.toLowerCase().trim();
  const cities = stateCities[key];
  if (!cities) return { label: "India", from: ["Mumbai", "Bangalore", "Delhi"] };
  const label = state
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return { label, from: cities };
}
