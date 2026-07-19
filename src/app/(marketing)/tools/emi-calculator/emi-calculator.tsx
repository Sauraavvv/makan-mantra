"use client";

import { useMemo, useState } from "react";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { Slider } from "@/components/ui/slider";

// ── Helpers ──────────────────────────────────────────────────────────────────

function calcEMI(principal: number, annualRate: number, tenureMonths: number) {
  if (tenureMonths === 0 || annualRate === 0) return principal / (tenureMonths || 1);
  const r = annualRate / 12 / 100;
  const n = tenureMonths;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

function formatINR(n: number) {
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)} Cr`;
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(2)} L`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function formatINRFull(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

// ── Donut chart (pure SVG) ───────────────────────────────────────────────────

function DonutChart({ principal, interest }: { principal: number; interest: number }) {
  const total = principal + interest;
  const pct = principal / total;
  const r = 70;
  const cx = 90;
  const cy = 90;
  const circumference = 2 * Math.PI * r;
  const principalArc = pct * circumference;
  const interestArc = circumference - principalArc;
  const gap = 3;

  return (
    <svg viewBox="0 0 180 180" className="w-full max-w-[180px]">
      {/* Interest arc */}
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke="#f97316"
        strokeWidth={20}
        strokeDasharray={`${interestArc - gap} ${circumference - (interestArc - gap)}`}
        strokeDashoffset={-(principalArc + gap / 2)}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      {/* Principal arc */}
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke="#16a34a"
        strokeWidth={20}
        strokeDasharray={`${principalArc - gap} ${circumference - (principalArc - gap)}`}
        strokeDashoffset={gap / 2}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      <text x={cx} y={cy - 8} textAnchor="middle" className="fill-foreground text-[11px] font-medium" fontSize={11}>
        Total
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" className="fill-foreground font-bold" fontSize={13}>
        {formatINR(total)}
      </text>
    </svg>
  );
}

// ── Amortization table ───────────────────────────────────────────────────────

type YearRow = { year: number; principal: number; interest: number; balance: number };

function buildSchedule(principal: number, annualRate: number, tenureMonths: number): YearRow[] {
  const emi = calcEMI(principal, annualRate, tenureMonths);
  const r = annualRate / 12 / 100;
  let balance = principal;
  const yearMap: Record<number, { principal: number; interest: number }> = {};

  for (let m = 1; m <= tenureMonths; m++) {
    const interestPart = balance * r;
    const principalPart = emi - interestPart;
    balance = Math.max(0, balance - principalPart);
    const year = Math.ceil(m / 12);
    if (!yearMap[year]) yearMap[year] = { principal: 0, interest: 0 };
    yearMap[year].principal += principalPart;
    yearMap[year].interest += interestPart;
  }

  let runningBalance = principal;
  return Object.entries(yearMap).map(([year, data]) => {
    runningBalance = Math.max(0, runningBalance - data.principal);
    return { year: Number(year), principal: data.principal, interest: data.interest, balance: runningBalance };
  });
}

// ── Main component ───────────────────────────────────────────────────────────

export function EMICalculator() {
  const [loanAmount, setLoanAmount] = useState(5000000);      // ₹50L
  const [interestRate, setInterestRate] = useState(8.5);
  const [tenureYears, setTenureYears] = useState(20);

  const tenureMonths = tenureYears * 12;
  const emi = useMemo(() => calcEMI(loanAmount, interestRate, tenureMonths), [loanAmount, interestRate, tenureMonths]);
  const totalPayable = emi * tenureMonths;
  const totalInterest = totalPayable - loanAmount;
  const schedule = useMemo(() => buildSchedule(loanAmount, interestRate, tenureMonths), [loanAmount, interestRate, tenureMonths]);

  return (
    <div className="flex min-h-screen flex-col bg-secondary">
      <Header />

      <main className="flex-1 px-4 py-8">
        <div className="mx-auto max-w-5xl">
          {/* Page title */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold md:text-3xl">EMI Calculator</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Estimate your monthly home loan payment instantly.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1fr_auto]">
            {/* Left — inputs + results */}
            <div className="space-y-5">
              {/* Inputs card */}
              <div className="rounded-2xl border border-border bg-background p-6">
                <h2 className="mb-5 font-semibold">Loan details</h2>

                {/* Loan Amount */}
                <div className="mb-6">
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-sm font-medium">Loan amount</label>
                    <div className="flex items-center gap-1 rounded-lg border border-border bg-muted px-3 py-1">
                      <span className="text-sm text-muted-foreground">₹</span>
                      <input
                        type="number"
                        value={loanAmount}
                        onChange={(e) => setLoanAmount(Math.min(10_00_00_000, Math.max(1_00_000, Number(e.target.value))))}
                        className="w-28 bg-transparent text-right text-sm font-semibold outline-none"
                      />
                    </div>
                  </div>
                  <Slider
                    min={100000}
                    max={100000000}
                    step={100000}
                    value={[loanAmount]}
                    onValueChange={(v) => setLoanAmount(Array.isArray(v) ? v[0] : v)}
                  />
                  <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
                    <span>₹1L</span><span>₹10Cr</span>
                  </div>
                </div>

                {/* Interest Rate */}
                <div className="mb-6">
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-sm font-medium">Interest rate (p.a.)</label>
                    <div className="flex items-center gap-1 rounded-lg border border-border bg-muted px-3 py-1">
                      <input
                        type="number"
                        value={interestRate}
                        step={0.1}
                        onChange={(e) => setInterestRate(Math.min(20, Math.max(1, Number(e.target.value))))}
                        className="w-16 bg-transparent text-right text-sm font-semibold outline-none"
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                  </div>
                  <Slider
                    min={1}
                    max={20}
                    step={0.1}
                    value={[interestRate]}
                    onValueChange={(v) => setInterestRate(Array.isArray(v) ? v[0] : v)}
                  />
                  <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
                    <span>1%</span><span>20%</span>
                  </div>
                </div>

                {/* Tenure */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-sm font-medium">Loan tenure</label>
                    <div className="flex items-center gap-1 rounded-lg border border-border bg-muted px-3 py-1">
                      <input
                        type="number"
                        value={tenureYears}
                        onChange={(e) => setTenureYears(Math.min(30, Math.max(1, Number(e.target.value))))}
                        className="w-12 bg-transparent text-right text-sm font-semibold outline-none"
                      />
                      <span className="text-sm text-muted-foreground">yr</span>
                    </div>
                  </div>
                  <Slider
                    min={1}
                    max={30}
                    step={1}
                    value={[tenureYears]}
                    onValueChange={(v) => setTenureYears(Array.isArray(v) ? v[0] : v)}
                  />
                  <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
                    <span>1 yr</span><span>30 yr</span>
                  </div>
                </div>
              </div>

              {/* Result summary */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Monthly EMI", value: formatINRFull(emi), color: "text-primary" },
                  { label: "Total interest", value: formatINR(totalInterest), color: "text-orange-500" },
                  { label: "Total payable", value: formatINR(totalPayable), color: "text-foreground" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="rounded-2xl border border-border bg-background p-4 text-center">
                    <div className={`text-lg font-bold md:text-xl ${color}`}>{value}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — donut chart */}
            <div className="flex flex-col items-center justify-start gap-4 rounded-2xl border border-border bg-background p-6 lg:w-56">
              <h2 className="self-start font-semibold">Breakup</h2>
              <DonutChart principal={loanAmount} interest={totalInterest} />
              <div className="w-full space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-green-600" />
                    Principal
                  </span>
                  <span className="font-medium">{formatINR(loanAmount)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-orange-500" />
                    Interest
                  </span>
                  <span className="font-medium">{formatINR(totalInterest)}</span>
                </div>
                <div className="mt-2 border-t border-border pt-2 flex items-center justify-between text-sm font-semibold">
                  <span>Total</span>
                  <span>{formatINR(totalPayable)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Amortization schedule */}
          <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-background">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="font-semibold">Yearly amortization schedule</h2>
              <p className="text-xs text-muted-foreground mt-0.5">How your balance reduces year by year</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-6 py-3 text-left font-medium text-muted-foreground">Year</th>
                    <th className="px-6 py-3 text-right font-medium text-muted-foreground">Principal paid</th>
                    <th className="px-6 py-3 text-right font-medium text-muted-foreground">Interest paid</th>
                    <th className="px-6 py-3 text-right font-medium text-muted-foreground">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.map((row, i) => (
                    <tr key={row.year} className={`border-b border-border last:border-0 ${i % 2 === 0 ? "" : "bg-muted/20"}`}>
                      <td className="px-6 py-3 font-medium">Year {row.year}</td>
                      <td className="px-6 py-3 text-right text-green-600 font-medium">{formatINRFull(row.principal)}</td>
                      <td className="px-6 py-3 text-right text-orange-500">{formatINRFull(row.interest)}</td>
                      <td className="px-6 py-3 text-right font-semibold">{formatINRFull(row.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
