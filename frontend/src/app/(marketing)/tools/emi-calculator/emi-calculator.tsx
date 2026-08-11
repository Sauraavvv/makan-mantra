"use client";

import Image from "next/image";
import { useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  ArrowRight,
  Briefcase,
  Calculator,
  ChevronUp,
  FileText,
  Home,
  IndianRupee,
  Landmark,
  Percent,
  PieChart,
  Wallet,
} from "lucide-react";

import { Footer } from "@/components/site/footer";
import { Header } from "@/components/site/header";
import { Slider } from "@/components/ui/slider";

const MIN_LOAN = 1_00_000;
const MAX_LOAN = 10_00_00_000;
const MIN_RATE = 1;
const MAX_RATE = 15;
const MIN_TENURE = 1;
const MAX_TENURE = 30;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function calcEMI(principal: number, annualRate: number, tenureMonths: number) {
  if (tenureMonths === 0 || annualRate === 0) return principal / (tenureMonths || 1);
  const monthlyRate = annualRate / 12 / 100;
  const growth = Math.pow(1 + monthlyRate, tenureMonths);
  return (principal * monthlyRate * growth) / (growth - 1);
}

function formatINR(value: number) {
  return `₹ ${Math.round(value).toLocaleString("en-IN")}`;
}

function formatInputAmount(value: number) {
  return Math.round(value).toLocaleString("en-IN");
}

function formatLoanScale(value: number) {
  const crore = value / 1_00_00_000;
  if (crore >= 1) {
    return `${Number(crore.toFixed(2))} Crore`;
  }
  return `${Number((value / 1_00_000).toFixed(2))} Lakh`;
}

type YearRow = {
  year: number;
  principal: number;
  interest: number;
  balance: number;
};

function buildSchedule(principal: number, annualRate: number, tenureMonths: number): YearRow[] {
  const emi = calcEMI(principal, annualRate, tenureMonths);
  const monthlyRate = annualRate / 12 / 100;
  let balance = principal;
  const yearly = new Map<number, { principal: number; interest: number }>();

  for (let month = 1; month <= tenureMonths; month += 1) {
    const interestPart = balance * monthlyRate;
    const principalPart = Math.min(balance, emi - interestPart);
    balance = Math.max(0, balance - principalPart);
    const year = Math.ceil(month / 12);
    const current = yearly.get(year) ?? { principal: 0, interest: 0 };
    current.principal += principalPart;
    current.interest += interestPart;
    yearly.set(year, current);
  }

  let runningBalance = principal;
  return Array.from(yearly.entries()).map(([year, amount]) => {
    runningBalance = Math.max(0, runningBalance - amount.principal);
    return {
      year,
      principal: amount.principal,
      interest: amount.interest,
      balance: runningBalance,
    };
  });
}

function LoanField({
  label,
  value,
  displayValue,
  prefix,
  suffix,
  asideText,
  min,
  max,
  step,
  minLabel,
  maxLabel,
  onInputChange,
  onSliderChange,
}: {
  label: string;
  value: number;
  displayValue: string;
  prefix?: string;
  suffix?: string;
  asideText?: string;
  min: number;
  max: number;
  step: number;
  minLabel: string;
  maxLabel: string;
  onInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSliderChange: (value: number) => void;
}) {
  return (
    <div className="min-w-0">
      <label className="text-xs font-bold text-[#15203f]">{label}</label>
      <div className="mt-2 flex h-11 min-w-0 items-center overflow-hidden rounded-lg border border-border bg-white">
        {prefix && <span className="pl-4 text-sm font-semibold text-[#26324f]">{prefix}</span>}
        <input
          value={displayValue}
          onChange={onInputChange}
          inputMode="decimal"
          aria-label={label}
          className="min-w-0 flex-1 bg-transparent px-3 text-sm font-medium text-[#17213d] outline-none"
        />
        {asideText && (
          <span className="shrink-0 px-4 text-xs font-medium text-muted-foreground">
            {asideText}
          </span>
        )}
        {suffix && (
          <span className="grid h-full shrink-0 place-items-center border-l border-border bg-[#f7f8fb] px-4 text-xs font-medium text-[#303a58]">
            {suffix}
          </span>
        )}
      </div>

      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={(next) => onSliderChange(Array.isArray(next) ? next[0] : next)}
        aria-label={label}
        className="mt-4 [&_[data-slot=slider-range]]:bg-saffron [&_[data-slot=slider-thumb]]:border-saffron"
      />
      <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  );
}

function DonutChart({ principal, interest }: { principal: number; interest: number }) {
  const total = principal + interest;
  const principalPercent = total ? (principal / total) * 100 : 0;

  return (
    <div className="relative mx-auto size-[168px] shrink-0">
      <svg
        viewBox="0 0 190 190"
        role="img"
        aria-label="Principal and interest payment breakup"
        className="size-full -rotate-90"
      >
        <circle cx="95" cy="95" r="70" fill="none" stroke="#ff851b" strokeWidth="22" />
        <circle
          cx="95"
          cy="95"
          r="70"
          fill="none"
          stroke="#4d4c9f"
          strokeWidth="22"
          pathLength="100"
          strokeDasharray={`${principalPercent} ${100 - principalPercent}`}
        />
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center">
        <span className="text-[10px] text-muted-foreground">Total Payment</span>
        <strong className="mt-1 text-sm text-foreground">{formatINR(total)}</strong>
      </div>
    </div>
  );
}

function ScheduleTable({
  rows,
  compact = false,
}: {
  rows: Array<YearRow | null>;
  compact?: boolean;
}) {
  return (
    <div className="max-w-full overflow-x-auto">
      <table
        className={`w-full table-fixed text-[11px] ${
          compact ? "min-w-[500px] lg:min-w-0" : "min-w-[680px]"
        }`}
      >
        <colgroup>
          <col className="w-[12%]" />
          <col className="w-[25%]" />
          <col className="w-[25%]" />
          <col className="w-[38%]" />
        </colgroup>
        <thead>
          <tr className="border-b border-border text-muted-foreground">
            <th className="px-3 py-2.5 text-left font-medium">Year</th>
            <th className="px-3 py-2.5 text-right font-medium">Principal Paid</th>
            <th className="px-3 py-2.5 text-right font-medium">Interest Paid</th>
            <th className="px-3 py-2.5 text-right font-medium">Outstanding</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) =>
            row ? (
              <tr key={row.year} className="border-b border-border last:border-b-0">
                <td className="px-3 py-2.5 font-semibold text-foreground">{row.year}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right text-foreground">
                  {formatINR(row.principal)}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right text-foreground">
                  {formatINR(row.interest)}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold text-foreground">
                  {formatINR(row.balance)}
                </td>
              </tr>
            ) : (
              <tr key={`ellipsis-${index}`} className="border-b border-border">
                <td className="px-3 py-2 text-muted-foreground">...</td>
                <td className="px-3 py-2 text-right text-muted-foreground">...</td>
                <td className="px-3 py-2 text-right text-muted-foreground">...</td>
                <td className="px-3 py-2 text-right text-muted-foreground">...</td>
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}

export function EMICalculator() {
  const [loanAmount, setLoanAmount] = useState(50_00_000);
  const [interestRate, setInterestRate] = useState(8.5);
  const [tenureYears, setTenureYears] = useState(20);
  const [loanType, setLoanType] = useState<"home" | "other">("home");
  const [showFullSchedule, setShowFullSchedule] = useState(false);
  const resultRef = useRef<HTMLElement>(null);

  const tenureMonths = tenureYears * 12;
  const emi = useMemo(
    () => calcEMI(loanAmount, interestRate, tenureMonths),
    [interestRate, loanAmount, tenureMonths],
  );
  const totalPayment = emi * tenureMonths;
  const totalInterest = totalPayment - loanAmount;
  const principalPercent = totalPayment ? (loanAmount / totalPayment) * 100 : 0;
  const interestPercent = 100 - principalPercent;
  const schedule = useMemo(
    () => buildSchedule(loanAmount, interestRate, tenureMonths),
    [interestRate, loanAmount, tenureMonths],
  );
  const previewRows: Array<YearRow | null> =
    schedule.length <= 4
      ? schedule
      : [schedule[0], schedule[1], schedule[2], null, schedule[schedule.length - 1]];

  const summary = [
    { label: "Loan Amount", value: formatINR(loanAmount), icon: Wallet, orange: false },
    { label: "Total Interest", value: formatINR(totalInterest), icon: Percent, orange: true },
    { label: "Total Payment", value: formatINR(totalPayment), icon: IndianRupee, orange: true },
    { label: "Principal Amount", value: formatINR(loanAmount), icon: Landmark, orange: true },
  ] as const;

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-[#f6f7fb]">
      <Header />

      <main className="flex-1 px-4 py-6 sm:px-5 lg:py-8">
        <div className="mx-auto w-full max-w-[1250px]">
          <section className="overflow-hidden rounded-lg border border-border bg-white p-4 shadow-sm sm:p-6">
            <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[410px_minmax(0,1fr)]">
              <section className="rounded-lg border border-border bg-white p-5 shadow-sm xl:p-6">
                <header className="flex items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#fff0e6] text-saffron">
                    <FileText className="size-[18px]" strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-[#15203f]">Loan Details</h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Enter the details to calculate your EMI
                    </p>
                  </div>
                </header>

                <div className="mt-6 space-y-7">
                  <LoanField
                    label="Loan Amount"
                    value={loanAmount}
                    displayValue={formatInputAmount(loanAmount)}
                    prefix="₹"
                    asideText={formatLoanScale(loanAmount)}
                    min={MIN_LOAN}
                    max={MAX_LOAN}
                    step={1_00_000}
                    minLabel="₹ 1 Lakh"
                    maxLabel="₹ 10 Crore"
                    onInputChange={(event) => {
                      const value = Number(event.target.value.replace(/\D/g, ""));
                      if (Number.isFinite(value)) {
                        setLoanAmount(clamp(value, MIN_LOAN, MAX_LOAN));
                      }
                    }}
                    onSliderChange={setLoanAmount}
                  />

                  <LoanField
                    label="Interest Rate (p.a.)"
                    value={interestRate}
                    displayValue={interestRate.toFixed(2)}
                    suffix="%"
                    min={MIN_RATE}
                    max={MAX_RATE}
                    step={0.05}
                    minLabel="1%"
                    maxLabel="15%"
                    onInputChange={(event) => {
                      const value = Number(event.target.value);
                      if (Number.isFinite(value)) {
                        setInterestRate(clamp(value, MIN_RATE, MAX_RATE));
                      }
                    }}
                    onSliderChange={setInterestRate}
                  />

                  <LoanField
                    label="Loan Tenure"
                    value={tenureYears}
                    displayValue={String(tenureYears)}
                    suffix={tenureYears === 1 ? "Year" : "Years"}
                    min={MIN_TENURE}
                    max={MAX_TENURE}
                    step={1}
                    minLabel="1 Year"
                    maxLabel="30 Years"
                    onInputChange={(event) => {
                      const value = Number(event.target.value);
                      if (Number.isFinite(value)) {
                        setTenureYears(clamp(Math.round(value), MIN_TENURE, MAX_TENURE));
                      }
                    }}
                    onSliderChange={(value) => setTenureYears(Math.round(value))}
                  />
                </div>

                <div className="mt-6">
                  <span className="text-xs font-bold text-[#15203f]">Loan Type</span>
                  <div className="mt-2 grid grid-cols-2 gap-3" role="group" aria-label="Loan type">
                    <button
                      type="button"
                      aria-pressed={loanType === "home"}
                      onClick={() => setLoanType("home")}
                      className={`flex h-11 min-w-0 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-semibold transition-colors ${
                        loanType === "home"
                          ? "border-saffron bg-[#fff8f3] text-saffron"
                          : "border-border bg-white text-muted-foreground hover:bg-muted/40"
                      }`}
                    >
                      <Home className="size-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
                      <span className="truncate">Home Loan</span>
                    </button>
                    <button
                      type="button"
                      aria-pressed={loanType === "other"}
                      onClick={() => setLoanType("other")}
                      className={`flex h-11 min-w-0 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-semibold transition-colors ${
                        loanType === "other"
                          ? "border-saffron bg-[#fff8f3] text-saffron"
                          : "border-border bg-white text-muted-foreground hover:bg-muted/40"
                      }`}
                    >
                      <Briefcase className="size-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
                      <span className="truncate">Other Loan</span>
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}
                  className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-saffron px-5 text-sm font-bold text-white transition-colors hover:bg-[#ee7113]"
                >
                  <Calculator className="size-4" strokeWidth={2} aria-hidden="true" />
                  Calculate EMI
                </button>
              </section>

              <div className="min-w-0 space-y-4">
                <section
                  ref={resultRef}
                  className="relative min-h-[184px] overflow-hidden rounded-lg bg-[#172451] text-white"
                >
                  <div className="relative z-10 flex min-h-[184px] items-center px-6 py-6 sm:px-7">
                    <div className="max-w-[380px]">
                      <p className="text-sm font-medium text-white/85">Your Monthly EMI</p>
                      <div className="mt-2 h-px w-28 bg-white/60" />
                      <p aria-live="polite" className="mt-4 text-4xl font-bold text-white sm:text-5xl">
                        {formatINR(emi)}
                      </p>
                      <span className="mt-4 inline-flex rounded-full bg-white/10 px-4 py-2 text-xs text-white/85">
                        For {tenureYears} {tenureYears === 1 ? "Year" : "Years"} at{" "}
                        {interestRate.toFixed(2)}% p.a.
                      </span>
                    </div>
                  </div>

                  <div className="absolute inset-y-2 right-3 hidden w-[40%] sm:block">
                    <Image
                      src="/emi-calculator-house.png"
                      alt="Modern home financed with a planned EMI"
                      fill
                      loading="eager"
                      sizes="(min-width: 1280px) 360px, 42vw"
                      className="object-cover object-center"
                    />
                  </div>
                </section>

                <section className="overflow-hidden rounded-lg border border-border bg-white">
                  <header className="flex items-center gap-2 border-b border-border px-5 py-3.5">
                    <span className="grid size-8 place-items-center rounded-lg bg-[#fff0e6] text-saffron">
                      <PieChart className="size-4" strokeWidth={1.8} aria-hidden="true" />
                    </span>
                    <h2 className="text-sm font-bold text-[#15203f]">Loan Summary</h2>
                  </header>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                    {summary.map(({ label, value, icon: Icon, orange }, index) => (
                      <div
                        key={label}
                        className={`flex min-w-0 items-center gap-3 px-4 py-4 ${
                          index > 0 ? "border-t border-border sm:border-l sm:border-t-0" : ""
                        } ${index === 2 ? "sm:border-l-0 sm:border-t lg:border-l lg:border-t-0" : ""}`}
                      >
                        <span
                          className={`grid size-9 shrink-0 place-items-center rounded-lg ${
                            orange
                              ? "bg-[#fff0e6] text-saffron"
                              : "bg-[#f0efff] text-[#4d4c9f]"
                          }`}
                        >
                          <Icon className="size-4" strokeWidth={1.8} aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-[10px] text-muted-foreground">{label}</p>
                          <p className="mt-1 truncate text-xs font-bold text-[#15203f]">{value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="grid grid-cols-1 overflow-hidden rounded-lg border border-border bg-white lg:grid-cols-2">
                  <div className="p-5">
                    <h2 className="text-sm font-bold text-[#15203f]">EMI Break-up</h2>
                    <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row lg:flex-col 2xl:flex-row">
                      <DonutChart principal={loanAmount} interest={totalInterest} />
                      <div className="w-full min-w-0 space-y-4">
                        <div className="flex items-start gap-3">
                          <span className="mt-1 size-2.5 shrink-0 rounded-full bg-[#4d4c9f]" />
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">Principal Amount</p>
                            <p className="mt-1 text-sm font-bold text-[#15203f]">
                              {formatINR(loanAmount)} ({principalPercent.toFixed(1)}%)
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <span className="mt-1 size-2.5 shrink-0 rounded-full bg-[#ff851b]" />
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">Total Interest</p>
                            <p className="mt-1 text-sm font-bold text-[#15203f]">
                              {formatINR(totalInterest)} ({interestPercent.toFixed(1)}%)
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="min-w-0 border-t border-border lg:border-l lg:border-t-0">
                    <header className="px-5 pb-2 pt-5">
                      <h2 className="text-sm font-bold text-[#15203f]">Amortization Preview</h2>
                    </header>
                    <ScheduleTable rows={previewRows} compact />
                    <button
                      type="button"
                      onClick={() => setShowFullSchedule((current) => !current)}
                      aria-expanded={showFullSchedule}
                      className="flex h-12 w-full items-center justify-center gap-2 border-t border-border px-3 text-xs font-bold text-saffron transition-colors hover:bg-[#fff8f3]"
                    >
                      {showFullSchedule ? "Hide Full Amortization Schedule" : "View Full Amortization Schedule"}
                      {showFullSchedule ? (
                        <ChevronUp className="size-4" aria-hidden="true" />
                      ) : (
                        <ArrowRight className="size-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </section>

              </div>
            </div>

            {showFullSchedule && (
              <section className="mt-5 overflow-hidden rounded-lg border border-border bg-white">
                <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
                  <div>
                    <h2 className="text-sm font-bold text-[#15203f]">
                      Full Amortization Schedule
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Complete {tenureYears}-year repayment plan with all yearly entries.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowFullSchedule(false)}
                    aria-label="Collapse full amortization schedule"
                    className="grid size-9 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
                  >
                    <ChevronUp className="size-4" aria-hidden="true" />
                  </button>
                </header>
                <ScheduleTable rows={schedule} />
              </section>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
