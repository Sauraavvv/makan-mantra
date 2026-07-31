import { EMICalculator } from "./emi-calculator";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "EMI Calculator — Makan Mantraa",
  description: "Calculate your home loan EMI, total interest payable, and month-by-month amortization schedule.",
};

export default function EMICalculatorPage() {
  return <EMICalculator />;
}
