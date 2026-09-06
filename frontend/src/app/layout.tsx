import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { LocationProvider } from "@/context/location-context";
import { resolveLocation } from "@/lib/geo-server";
import { SavedProvider } from "@/context/saved-context";
import { RecentPropertiesProvider } from "@/context/recent-properties-context";
import { SearchHistoryProvider } from "@/context/search-history-context";
import { SessionProvider } from "@/context/session-context";
import { Chatbot } from "@/components/site/chatbot";
import { LocationSuggestion } from "@/components/site/location-suggestion";
import "./globals.css";

const interSans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Makan Mantraa",
  description: "Find properties for sale, rent and PG across India",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Read here rather than in the provider so the server and the first client
  // render agree on the state: the header, the hero and the market snapshot
  // all come out of the first paint already showing it.
  const { initial, edgeState } = await resolveLocation();

  return (
    <html
      lang="en"
      // Anchor links glide, but route changes still jump straight to the top:
      // Next only suspends `scroll-behavior` during navigation when asked to.
      data-scroll-behavior="smooth"
      className={`${interSans.variable} ${geistMono.variable} h-full scroll-smooth antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SessionProvider>
          <SearchHistoryProvider>
            <RecentPropertiesProvider>
              <LocationProvider initial={initial} edgeState={edgeState}>
                <SavedProvider>{children}</SavedProvider>
                <LocationSuggestion />
              </LocationProvider>
            </RecentPropertiesProvider>
          </SearchHistoryProvider>
          {/* Inside the provider: the assistant reads the session to decide
              whether chats are saved, and outside it that read silently
              returns "signed out" for everyone. */}
          <Chatbot />
        </SessionProvider>
      </body>
    </html>
  );
}
