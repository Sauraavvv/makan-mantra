"use client";

import { useMemo, useState } from "react";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { STATES, calcStampDuty } from "./data";

function formatINR(n: number) {
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)} Cr`;
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(2)} L`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function formatINRFull(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

// Bar showing cost breakdown
function CostBar({ stampDuty, registration, propertyValue }: { stampDuty: number; registration: number; propertyValue: number }) {
  const total = stampDuty + registration;
  const sdPct = (stampDuty / total) * 100;
  const regPct = 100 - sdPct;
  const totalPct = ((total / propertyValue) * 100).toFixed(2);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Total cost as % of property value</span>
        <span className="font-bold text-primary">{totalPct}%</span>
      </div>
      <div className="flex h-5 w-full overflow-hidden rounded-full">
        <div className="h-full bg-primary transition-all" style={{ width: `${sdPct}%` }} />
        <div className="h-full bg-orange-400 transition-all" style={{ width: `${regPct}%` }} />
      </div>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-primary" />Stamp duty</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-orange-400" />Registration</span>
      </div>
    </div>
  );
}

export function StampDutyCalculator() {
  const [propertyValue, setPropertyValue] = useState("");
  const [selectedState, setSelectedState] = useState(STATES[0].name);
  const [gender, setGender] = useState<"male" | "female">("male");

  const value = parseFloat(propertyValue.replace(/,/g, "")) || 0;
  const state = STATES.find((s) => s.name === selectedState)!;

  const result = useMemo(() => {
    if (!value || value <= 0) return null;
    return calcStampDuty(value, state, gender);
  }, [value, state, gender]);

  const stampRate = typeof state[gender] === "number"
    ? `${state[gender]}%`
    : "Slab-based";

  return (
    <div className="flex min-h-screen flex-col bg-secondary">
      <Header />

      <main className="flex-1 px-4 py-8">
        <div className="mx-auto max-w-4xl">
          {/* Title */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold md:text-3xl">Stamp Duty Calculator</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Estimate stamp duty &amp; registration charges for your property purchase.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
            {/* Inputs */}
            <div className="space-y-5">
              <div className="rounded-2xl border border-border bg-background p-6 space-y-5">
                <h2 className="font-semibold">Property details</h2>

                {/* Property value */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Property value</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
                    <input
                      type="text"
                      placeholder="e.g. 5000000"
                      value={propertyValue}
                      onChange={(e) => setPropertyValue(e.target.value.replace(/[^0-9]/g, ""))}
                      className="h-11 w-full rounded-lg border border-border bg-muted pl-7 pr-4 text-sm font-semibold outline-none focus:border-primary"
                    />
                  </div>
                  {value > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">{formatINR(value)}</p>
                  )}
                </div>

                {/* State */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium">State / UT</label>
                  <select
                    value={selectedState}
                    onChange={(e) => setSelectedState(e.target.value)}
                    className="h-11 w-full rounded-lg border border-border bg-muted px-3 text-sm outline-none focus:border-primary"
                  >
                    {STATES.map((s) => (
                      <option key={s.name} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {/* Gender */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Buyer</label>
                  <div className="flex gap-3">
                    {(["male", "female"] as const).map((g) => (
                      <button
                        key={g}
                        onClick={() => setGender(g)}
                        className={`flex-1 rounded-lg border py-2.5 text-sm font-medium capitalize transition ${
                          gender === g
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-muted text-muted-foreground hover:border-primary/50"
                        }`}
                      >
                        {g === "male" ? "👨 Male" : "👩 Female"}
                      </button>
                    ))}
                  </div>
                  {stampRate !== typeof state[gender === "male" ? "female" : "male"] && (
                    <p className="mt-1.5 text-xs text-green-600">
                      {typeof state.male === "number" && typeof state.female === "number" && state.female < state.male
                        ? `Women get ${(state.male as number) - (state.female as number)}% concession in ${selectedState}`
                        : ""}
                    </p>
                  )}
                </div>

                {/* Rate info */}
                <div className="rounded-lg bg-muted px-4 py-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Stamp duty rate</span>
                    <span className="font-semibold">{stampRate}</span>
                  </div>
                  <div className="mt-1 flex justify-between">
                    <span className="text-muted-foreground">Registration charge</span>
                    <span className="font-semibold">{state.registration}%{state.registrationCap ? ` (max ${formatINR(state.registrationCap)})` : ""}</span>
                  </div>
                  {state.note && (
                    <p className="mt-2 text-xs text-muted-foreground border-t border-border pt-2">{state.note}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Result */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-background p-6">
                <h2 className="mb-4 font-semibold">Cost breakdown</h2>

                {result ? (
                  <div className="space-y-4">
                    <div className="space-y-3">
                      {[
                        { label: "Property value", value: formatINRFull(value), muted: true },
                        { label: "Stamp duty", value: formatINRFull(result.stampDuty), color: "text-primary" },
                        { label: "Registration charge", value: formatINRFull(result.registrationCharge), color: "text-orange-500" },
                      ].map(({ label, value: val, muted, color }) => (
                        <div key={label} className="flex items-center justify-between">
                          <span className={`text-sm ${muted ? "text-muted-foreground" : ""}`}>{label}</span>
                          <span className={`text-sm font-semibold ${color || ""}`}>{val}</span>
                        </div>
                      ))}
                      <div className="border-t border-border pt-3 flex items-center justify-between">
                        <span className="font-semibold">Total cost</span>
                        <span className="text-lg font-bold text-foreground">{formatINRFull(value + result.total)}</span>
                      </div>
                    </div>

                    <CostBar stampDuty={result.stampDuty} registration={result.registrationCharge} propertyValue={value} />

                    <div className="rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 px-4 py-3">
                      <p className="text-xs text-green-800 dark:text-green-300">
                        You need to pay <strong>{formatINRFull(result.total)}</strong> extra over property value as government charges.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                    Enter a property value to see the breakdown
                  </div>
                )}
              </div>

              {/* Disclaimer */}
              <p className="text-[11px] text-muted-foreground leading-relaxed px-1">
                * Rates are approximate and based on publicly available data. Actual charges may vary by locality, property type, or recent state amendments. Verify with a legal expert before transacting.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
