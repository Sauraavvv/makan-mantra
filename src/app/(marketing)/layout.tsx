import { LocationProvider } from "@/context/location-context";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <LocationProvider>{children}</LocationProvider>;
}
