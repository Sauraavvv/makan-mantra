"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Building, Building2, BedDouble, Home, Menu, Moon, Plus, Search, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useTheme } from "@/hooks/use-theme";

const NAV = [
  { label: "Buy", href: "/maharashtra", icon: Home },
  { label: "Rent", href: "/maharashtra?listing=rent", icon: BedDouble },
  { label: "PG", href: "/maharashtra?listing=pg", icon: Building },
  { label: "New Projects", href: "/maharashtra?type=new", icon: Building2 },
];

export function Header() {
  const { theme, toggle } = useTheme();
  const [showSearch, setShowSearch] = useState(false);

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
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#0A2036] text-white shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
        <Link href="/" className="flex shrink-0 items-center text-lg font-bold tracking-tight sm:text-xl">
          <span>
            Makan <span className="text-saffron">Mantraa</span>
          </span>
        </Link>

        <form
          className={`relative hidden flex-1 transition-all duration-300 md:block ${
            showSearch
              ? "max-w-md opacity-100"
              : "pointer-events-none max-w-0 overflow-hidden opacity-0"
          }`}
          onSubmit={(event) => event.preventDefault()}
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search city, locality or project..."
            className="h-9 border-white/15 bg-white text-foreground pl-9 shadow-sm focus-visible:ring-white/30"
          />
        </form>

        <nav className="ml-auto hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Button onClick={toggle} variant="ghost" size="icon" aria-label="Toggle theme" className="shrink-0 text-white hover:bg-white/10 hover:text-white">
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        <Button
          className="hidden shrink-0 gap-1 bg-saffron text-saffron-foreground hover:bg-saffron/90 sm:inline-flex"
        >
          <Plus className="h-4 w-4" /> Post Property{" "}
          <span className="ml-1 rounded bg-white/20 px-1 text-[10px] font-bold">FREE</span>
        </Button>

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
              {NAV.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium hover:bg-accent"
                >
                  <item.icon className="h-4 w-4 text-primary" />
                  {item.label}
                </Link>
              ))}
              <Button className="mt-4 w-full gap-1 bg-saffron text-saffron-foreground hover:bg-saffron/90">
                <Plus className="h-4 w-4" /> Post Property FREE
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
