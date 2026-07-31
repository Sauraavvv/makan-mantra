"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { ArrowRight, BedDouble, ChevronDown, Home, LockKeyhole, Mail, MailCheck, MapPin, Menu, Phone, Plus, Search, ShieldCheck, UserRound, X } from "lucide-react";
import { loginAction, registerModalAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useLocation } from "@/context/location-context";
import { DotPattern } from "@/registry/magicui/dot-pattern";
import { stateExploreHref, stateSlug } from "@/lib/state-routes";
import { stateCardImage } from "@/lib/state-images";

const STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh",
  "Assam", "Bihar", "Chandigarh", "Chhattisgarh",
  "Delhi", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand",
  "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland",
  "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

const NAV = [
  { label: "Buy", href: stateExploreHref("Maharashtra"), icon: Home },
  { label: "Rent", href: `${stateExploreHref("Maharashtra")}?listing=rent`, icon: BedDouble },
];

const TOP_STATES = [
  "Maharashtra", "Kerala", "Karnataka", "Haryana", "Telangana",
  "Tamil Nadu", "Gujarat", "Uttar Pradesh", "Rajasthan",
];

const TOP_STATES_SET = new Set(TOP_STATES);
const REST_STATES = STATES.filter((s) => !TOP_STATES_SET.has(s));

function StateCard({
  state,
  selected,
  onClick,
}: {
  state: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 rounded-xl p-1 text-center transition-all duration-150 hover:scale-105 hover:brightness-95 ${
        selected ? "ring-2 ring-saffron/50" : ""
      }`}
      style={{ backgroundColor: "#F4F4F4" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={stateCardImage(state)}
        alt={state}
        width={150}
        height={100}
        className="aspect-[3/2] w-full rounded-lg object-contain"
      />
    </button>
  );
}

const PROPERTY_GROUPS = {
  sale: [
    { title: "Flats", slug: "flats", label: "Flats" },
    { title: "Villas", slug: "villas", label: "Villas" },
    { title: "Builder Floors", slug: "builder-floors", label: "Builder Floors" },
    { title: "Plots", slug: "plots", label: "Plots" },
    { title: "Office Spaces", slug: "office-spaces", label: "Office Spaces" },
    { title: "Shops", slug: "shops", label: "Shops" },
    { title: "Showrooms", slug: "showrooms", label: "Showrooms" },
  ],
  rent: [
    { title: "Flats", slug: "flats", label: "Flats" },
    { title: "Villas", slug: "villas", label: "Villas" },
    { title: "Builder Floors", slug: "builder-floors", label: "Builder Floors" },
    { title: "PGs", slug: "pgs", label: "PGs" },
    { title: "Office Spaces", slug: "office-spaces", label: "Office Spaces" },
    { title: "Shops", slug: "shops", label: "Shops" },
    { title: "Showrooms", slug: "showrooms", label: "Showrooms" },
  ],
};

type ListingType = keyof typeof PROPERTY_GROUPS;
type AuthMode = "login" | "register" | "verify";

type HeaderProps = {
  showSearchBar?: boolean;
  searchPlaceholder?: string;
};

function statePageHref(state: string, propertySlug: string, listingType: ListingType) {
  return `/${propertySlug}-for-${listingType}-in-${stateSlug(state)}`;
}

export function Header({
  showSearchBar = false,
  searchPlaceholder = "Search city, locality or project...",
}: HeaderProps = {}) {
  const { meta, setStateByName } = useLocation();
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [showSearch, setShowSearch] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [authInitial, setAuthInitial] = useState<{ mode: AuthMode; email?: string; devOtp?: string }>({ mode: "login" });
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filtered = STATES.filter((s) =>
    s.toLowerCase().includes(search.toLowerCase())
  );
  const shouldShowSearch = showSearchBar || showSearch;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const auth = params.get("auth");
    let timeoutId = 0;

    if (auth === "login" || auth === "register" || auth === "verify") {
      timeoutId = window.setTimeout(() => {
        setAuthInitial({
          mode: auth,
          email: params.get("email") || undefined,
          devOtp: params.get("devOtp") || undefined,
        });
        setLoginOpen(true);
      }, 0);

      params.delete("auth");
      params.delete("email");
      params.delete("devOtp");
      const nextQuery = params.toString();
      const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}${window.location.hash}`;
      window.history.replaceState(null, "", nextUrl);
    }

    return () => window.clearTimeout(timeoutId);
  }, []);

  function openAuthModal(mode: AuthMode = "login") {
    setAuthInitial({ mode });
    setLoginOpen(true);
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    const heroSearch = document.getElementById("hero-search");

    if (!heroSearch) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowSearch(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      },
      { threshold: 0 },
    );

    observer.observe(heroSearch);
    return () => observer.disconnect();
  }, []);

  return (
    <>
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#0A2036] text-white shadow-lg shadow-black/10">
      <div className="flex h-16 w-full items-center gap-3 px-4">
        <Link href="/" className="flex shrink-0 items-center text-xl font-bold tracking-tight sm:text-2xl">
          <span>
            Makan <span className="text-saffron">Mantraa</span>
          </span>
        </Link>

        {/* Location dropdown — home page only */}
        {isHome && (
        <div
          ref={dropdownRef}
          className="relative shrink-0"
          onMouseEnter={() => {
            if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
            setDropdownOpen(true);
          }}
          onMouseLeave={() => {
            closeTimerRef.current = setTimeout(() => {
              setDropdownOpen(false);
              setSearch("");
            }, 150);
          }}
        >
          <button
            onClick={() => { setDropdownOpen((o) => !o); setSearch(""); }}
            className="flex h-9 items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 text-sm font-medium text-white transition-colors hover:bg-white/20"
          >
            <MapPin className="h-3.5 w-3.5 text-saffron shrink-0" />
            <span className="max-w-[90px] truncate">{meta.label}</span>
            <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {dropdownOpen && (
            <div className="absolute left-1/2 top-full z-50 -translate-x-1/2 mt-3 w-[min(calc(100vw-2rem),25rem)] overflow-hidden rounded-xl border border-border bg-popover text-foreground shadow-2xl">
              {/* Search */}
              <div className="bg-muted p-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    autoFocus
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search state or UT…"
                    className="h-9 w-full rounded-lg bg-background pl-10 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              {/* Selected + All India */}
              <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
                <span className="truncate text-xs font-semibold text-muted-foreground">
                  Selected: <span className="text-foreground">{meta.label}</span>
                </span>
                <button
                  onClick={() => { setStateByName(null); setDropdownOpen(false); }}
                  className="shrink-0 text-xs font-medium text-primary hover:underline"
                >
                  All India
                </button>
              </div>

              {search ? (
                /* List mode when searching */
                <div className="max-h-72 overflow-y-auto p-1.5">
                  {filtered.map((state) => {
                    const selected = meta.label === state;
                    return (
                      <button
                        key={state}
                        onClick={() => { setStateByName(state); setDropdownOpen(false); }}
                        className={`flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent ${selected ? "bg-saffron/10 font-semibold text-saffron" : "text-foreground"}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={stateCardImage(state)}
                          alt={state}
                          width={42}
                          height={28}
                          className="h-7 w-[42px] shrink-0 rounded object-contain"
                        />
                        <span>{state}</span>
                      </button>
                    );
                  })}
                  {filtered.length === 0 && (
                    <div className="px-3 py-6 text-center text-sm text-muted-foreground">No states found</div>
                  )}
                </div>
              ) : (
                /* Grid mode */
                <div className="flex flex-col" style={{ backgroundColor: "#F4F4F4" }}>
                  {/* Scrollable icon grid */}
                  <div className="max-h-[286px] overflow-y-auto p-1 pt-2 pb-2">
                    <div className="grid grid-cols-3 gap-0.5">
                      {[...TOP_STATES, ...REST_STATES].map((state) => (
                        <StateCard
                          key={state}
                          state={state}
                          selected={meta.label === state}
                          onClick={() => { setStateByName(state); setDropdownOpen(false); }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        )}

        <form
          className={`relative hidden flex-1 transition-all duration-300 md:block ${
            shouldShowSearch
              ? "max-w-md opacity-100"
              : "pointer-events-none max-w-0 overflow-hidden opacity-0"
          }`}
          onSubmit={(event) => event.preventDefault()}
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            className="h-9 border-white/15 bg-white text-foreground pl-9 focus-visible:ring-white/30"
          />
        </form>

        <nav className="ml-auto hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <MegaNavItem
              key={item.label}
              label={item.label}
              href={item.href}
              listingType={item.label === "Rent" ? "rent" : "sale"}
            />
          ))}
        </nav>

        <Button
          className="hidden h-9 shrink-0 gap-1 rounded-full bg-saffron px-4 text-sm font-semibold text-saffron-foreground hover:bg-saffron/90 sm:inline-flex"
        >
          <Plus className="h-4 w-4" /> Post Property{" "}
          <span className="ml-1 rounded bg-white/20 px-1 text-[10px] font-bold">FREE</span>
        </Button>

        <button
          type="button"
          onClick={() => openAuthModal("login")}
          className="hidden h-9 shrink-0 items-center rounded-full border border-white/15 px-4 text-sm font-semibold text-white hover:bg-white/10 md:inline-flex"
        >
          Login
        </button>

        <Sheet>
          <SheetTrigger
            aria-label="Open menu"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-medium text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-white/30 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="right" className="w-80">
            <SheetHeader>
              <SheetTitle>
                Makan <span className="text-saffron">Mantraa</span>
              </SheetTitle>
            </SheetHeader>
            <div className="mt-4 flex flex-col gap-1">
              <button
                type="button"
                onClick={() => openAuthModal("login")}
                className="mb-2 flex w-full items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
              >
                Login
              </button>
              {NAV.map((item) => (
                <MobileNavSection
                  key={item.label}
                  label={item.label}
                  href={item.href}
                  icon={item.icon}
                  listingType={item.label === "Rent" ? "rent" : "sale"}
                />
              ))}
              <Button className="mt-4 w-full gap-1 bg-saffron text-saffron-foreground hover:bg-saffron/90">
                <Plus className="h-4 w-4" /> Post Property FREE
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
    {loginOpen && (
      <LoginModal
        initialMode={authInitial.mode}
        initialEmail={authInitial.email}
        initialDevOtp={authInitial.devOtp}
        onClose={() => setLoginOpen(false)}
      />
    )}
    </>
  );
}

function LoginModal({
  initialMode,
  initialEmail,
  initialDevOtp,
  onClose,
}: {
  initialMode: AuthMode;
  initialEmail?: string;
  initialDevOtp?: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [verifyEmail, setVerifyEmail] = useState(initialEmail || "");
  const [devOtp, setDevOtp] = useState(initialDevOtp || "");
  const [emailWarning, setEmailWarning] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [verifyError, setVerifyError] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const otpInputs = useRef<(HTMLInputElement | null)[]>([]);
  const [loginState, loginActionState, loginPending] = useActionState(loginAction, undefined);
  const [registerState, registerActionState, registerPending] = useActionState(
    async (_previousState: Awaited<ReturnType<typeof registerModalAction>>, formData: FormData) => {
      const result = await registerModalAction(undefined, formData);
      if (result?.success && result.email) {
        setVerifyEmail(result.email);
        setDevOtp(result.devOtp || "");
        setEmailWarning(result.emailWarning || "");
        setOtp(["", "", "", "", "", ""]);
        setVerifyError("");
        setMode("verify");
      }
      return result;
    },
    undefined,
  );
  const isRegister = mode === "register";
  const isVerify = mode === "verify";

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  function handleOtpChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);
    if (value && index < 5) otpInputs.current[index + 1]?.focus();
  }

  function handleOtpKeyDown(index: number, event: React.KeyboardEvent) {
    if (event.key === "Backspace" && !otp[index] && index > 0) {
      otpInputs.current[index - 1]?.focus();
    }
  }

  async function handleOtpSubmit(event: React.FormEvent) {
    event.preventDefault();
    const code = otp.join("");
    if (code.length < 6) return;

    setVerifyError("");
    setVerifyLoading(true);

    const res = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: verifyEmail, otp: code }),
    });
    const data = await res.json();
    setVerifyLoading(false);

    if (!res.ok) {
      setVerifyError(data.error || "Verification failed");
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 px-4 py-6 backdrop-blur-[2px]">
      <button
        type="button"
        aria-label="Close login"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />

      <div className="relative grid max-h-[calc(100vh-3rem)] w-full max-w-5xl overflow-hidden rounded-2xl border border-white/20 bg-background text-foreground shadow-2xl lg:grid-cols-[1fr_430px]">
        <button
          type="button"
          aria-label="Close login"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-full bg-background/80 text-muted-foreground transition hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <section className="relative hidden overflow-hidden bg-[#0A2036] p-10 text-white lg:flex lg:min-h-[560px] lg:flex-col lg:justify-between">
          <DotPattern width={12} height={12} className="[mask-image:radial-gradient(360px_circle_at_center,white,transparent)]" />
          <div className="relative z-10 text-2xl font-bold">
            Makan <span className="text-saffron">Mantraa</span>
          </div>

          <div className="relative z-10 max-w-md">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm text-white/85">
              <ShieldCheck className="h-4 w-4 text-saffron" />
              {isVerify ? "Email verification" : isRegister ? "Verified account access" : "Secure owner and buyer access"}
            </div>
            <h2 className="text-4xl font-bold leading-tight">
              {isVerify
                ? "One quick step to secure your account."
                : isRegister
                  ? "Create an account for your next property move."
                  : "Manage your property journey with confidence."}
            </h2>
            <p className="mt-4 text-sm leading-6 text-white/70">
              {isVerify
                ? "Enter the code sent to your inbox to activate your Makan Mantraa account."
                : isRegister
                  ? "Save searches, post listings, and manage buyer or tenant conversations from one place."
                  : "Sign in to save searches, manage listings, review leads, and continue where you left off."}
            </p>
          </div>

          <p className="relative z-10 text-sm text-white/55">Trusted property access across India.</p>
        </section>

        <section className="overflow-y-auto p-6 sm:p-8 lg:p-10">
          <div className="mb-8 pr-8">
            <p className="mb-2 text-sm font-semibold text-primary">
              {isVerify ? "Check your email" : isRegister ? "Get started" : "Welcome back"}
            </p>
            <h2 className="text-3xl font-bold tracking-tight">
              {isVerify ? "Enter verification code" : isRegister ? "Create your account" : "Sign in to your account"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {isVerify
                ? "We sent a 6-digit code to your email address."
                : isRegister
                  ? "Join Makan Mantraa to manage listings and property searches."
                  : "Access your dashboard, leads, and saved property searches."}
            </p>
          </div>

          {isVerify ? (
            <form onSubmit={handleOtpSubmit} className="space-y-5">
              <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MailCheck className="h-4 w-4 text-primary" />
                  Verification code sent to
                </div>
                <div className="mt-1 break-all font-semibold">{verifyEmail}</div>
              </div>

              {devOtp && (
                <div className="rounded-lg border border-saffron/30 bg-saffron/10 px-3 py-2 text-sm">
                  <div className="font-semibold text-foreground">Dev testing OTP: {devOtp}</div>
                  {emailWarning && (
                    <div className="mt-1 text-xs leading-5 text-muted-foreground">
                      Email was not sent because Resend is in testing mode.
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-between gap-2">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => { otpInputs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(event) => handleOtpChange(index, event.target.value)}
                    onKeyDown={(event) => handleOtpKeyDown(index, event)}
                    className="h-12 w-11 rounded-lg border border-input bg-background text-center text-lg font-bold outline-none transition focus:border-primary focus:ring-3 focus:ring-primary/15"
                  />
                ))}
              </div>

              {verifyError && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {verifyError}
                </div>
              )}

              <button
                type="submit"
                disabled={verifyLoading || otp.join("").length < 6}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-55"
              >
                {verifyLoading ? "Verifying..." : "Verify email"}
                {!verifyLoading && <ArrowRight className="h-4 w-4" />}
              </button>

              <p className="text-center text-sm text-muted-foreground">
                Wrong email?{" "}
                <button
                  type="button"
                  onClick={() => setMode("register")}
                  className="font-semibold text-primary hover:underline"
                >
                  Go back
                </button>
              </p>
            </form>
          ) : (
          <>
          <form action={isRegister ? registerActionState : loginActionState} className="space-y-4">
            {isRegister && (
              <div>
                <label className="mb-1.5 block text-sm font-medium">Full name</label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    name="name"
                    type="text"
                    required
                    placeholder="Saurav Sharma"
                    className="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm outline-none transition focus:border-primary focus:ring-3 focus:ring-primary/15"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium">Email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  className="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm outline-none transition focus:border-primary focus:ring-3 focus:ring-primary/15"
                />
              </div>
            </div>

            {isRegister && (
              <div>
                <label className="mb-1.5 block text-sm font-medium">Mobile number</label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    name="phone"
                    type="tel"
                    required
                    inputMode="numeric"
                    autoComplete="tel"
                    pattern="(\+91[\s-]?)?[6-9][0-9]{9}"
                    title="Enter a 10-digit Indian mobile number"
                    placeholder="9876543210"
                    className="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm outline-none transition focus:border-primary focus:ring-3 focus:ring-primary/15"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium">Password</label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  name="password"
                  type="password"
                  required
                  minLength={isRegister ? 8 : undefined}
                  placeholder={isRegister ? "Min. 8 characters" : "Your password"}
                  className="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm outline-none transition focus:border-primary focus:ring-3 focus:ring-primary/15"
                />
              </div>
            </div>

            {(isRegister ? registerState?.error : loginState?.error) && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {isRegister ? registerState?.error : loginState?.error}
                {!isRegister && loginState?.email && (
                  <button
                    type="button"
                    onClick={() => {
                      setVerifyEmail(loginState.email || "");
                      setDevOtp("");
                      setEmailWarning("");
                      setOtp(["", "", "", "", "", ""]);
                      setVerifyError("");
                      setMode("verify");
                    }}
                    className="ml-1 font-medium underline"
                  >
                    Verify now
                  </button>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isRegister ? registerPending : loginPending}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-55"
            >
              {isRegister
                ? registerPending ? "Creating account..." : "Create account"
                : loginPending ? "Signing in..." : "Sign in"}
              {!(isRegister ? registerPending : loginPending) && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isRegister ? "Already have an account?" : "Don\u0027t have an account?"}{" "}
            <button
              type="button"
              onClick={() => setMode(isRegister ? "login" : "register")}
              className="font-semibold text-primary hover:underline"
            >
              {isRegister ? "Sign in" : "Create one"}
            </button>
          </p>
          </>
          )}
        </section>
      </div>
    </div>
  );
}

function MegaNavItem({
  label,
  href,
  listingType,
}: {
  label: string;
  href: string;
  listingType: ListingType;
}) {
  const actionLabel = listingType === "rent" ? "Rent" : "Sale";

  return (
    <div className="group relative">
      <Link
        href={href}
        className="flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white group-hover:bg-white/10 group-hover:text-white"
      >
        {label}
        <ChevronDown className="h-3.5 w-3.5 transition-transform group-hover:rotate-180" />
      </Link>

      <div className="invisible absolute right-0 top-full z-50 pt-3 opacity-0 transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
        <div className="max-h-[72vh] w-[min(92vw,1040px)] overflow-y-auto rounded-xl border border-border bg-background p-6 text-foreground shadow-2xl">
          <div className="grid gap-x-8 gap-y-7 md:grid-cols-4">
            {PROPERTY_GROUPS[listingType].map((group) => (
              <div key={group.slug}>
                <h3 className="border-b border-border pb-3 text-base font-semibold">
                  {group.title}
                </h3>
                <div className="mt-4 grid gap-3">
                  {TOP_STATES.slice(0, 6).map((state) => (
                    <Link
                      key={`${group.slug}-${state}`}
                      href={statePageHref(state, group.slug, listingType)}
                      className="text-sm text-foreground/80 transition-colors hover:text-primary"
                    >
                      {group.label} for {actionLabel} in {state}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileNavSection({
  label,
  href,
  icon: Icon,
  listingType,
}: {
  label: string;
  href: string;
  icon: typeof Home;
  listingType: ListingType;
}) {
  const firstGroup = PROPERTY_GROUPS[listingType][0];
  const actionLabel = listingType === "rent" ? "Rent" : "Sale";

  return (
    <div className="rounded-lg border border-border">
      <Link
        href={href}
        className="flex items-center gap-3 px-3 py-3 text-sm font-semibold hover:bg-accent"
      >
        <Icon className="h-4 w-4 text-primary" />
        {label}
      </Link>
      <div className="grid gap-2 border-t border-border px-3 py-3">
        {TOP_STATES.slice(0, 6).map((state) => (
          <Link
            key={`${label}-${state}`}
            href={statePageHref(state, firstGroup.slug, listingType)}
            className="text-sm text-muted-foreground hover:text-primary"
          >
            {firstGroup.label} for {actionLabel} in {state}
          </Link>
        ))}
      </div>
    </div>
  );
}
