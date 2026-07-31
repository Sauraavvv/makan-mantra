import { StampDutyCalculator } from "./stamp-duty-calculator";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Stamp Duty Calculator — Makan Mantraa",
  description: "Calculate stamp duty and registration charges for property purchase across all 36 Indian states and UTs.",
};

export default function StampDutyPage() {
  return <StampDutyCalculator />;
}
