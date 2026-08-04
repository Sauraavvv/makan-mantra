import type { Metadata } from "next";
import { Headset, Info } from "lucide-react";
import { ErrorPageView } from "@/components/site/error-page";

export const metadata: Metadata = {
  title: "Gone for Good | Makan Mantraa",
  description: "This page has been permanently removed and is no longer available.",
  // A 410 is a permanent signal — keep it out of the index.
  robots: { index: false, follow: false },
};

export default function GonePage() {
  return (
    <ErrorPageView
      numeral={{ src: "/error-410-numeral.webp", width: 560, height: 265 }}
      illustration={{ src: "/error-410.webp", width: 850, height: 850 }}
      highlight="Gone"
      title="for Good"
      description="This page has been permanently removed and is no longer available."
      note={{
        icon: Info,
        text: "If you believe this is a mistake, please contact our support team.",
      }}
      // TODO: link "Contact Support" once a support route/mailbox exists.
      footnote={{ icon: Headset, children: "Need help? Contact our support team" }}
    />
  );
}
