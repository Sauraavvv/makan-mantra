import type { Metadata } from "next";
import { Compass } from "lucide-react";
import { ErrorPageView } from "@/components/site/error-page";

export const metadata: Metadata = {
  title: "Page Not Found | Makan Mantraa",
  description: "The page you are looking for doesn't exist or has been moved.",
};

export default function NotFound() {
  return (
    <ErrorPageView
      numeral={{ src: "/error-404-numeral.webp", width: 600, height: 270 }}
      illustration={{ src: "/error-404.webp", width: 820, height: 870 }}
      highlight="Oops!"
      title="Page Not Found"
      description="The page you're looking for doesn't exist or has been moved."
      footnote={{ icon: Compass, children: "Let's get you back on track" }}
    />
  );
}
