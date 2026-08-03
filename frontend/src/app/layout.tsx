import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { LocationProvider } from "@/context/location-context";
import { Chatbot } from "@/components/site/chatbot";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      // Anchor links glide, but route changes still jump straight to the top:
      // Next only suspends `scroll-behavior` during navigation when asked to.
      data-scroll-behavior="smooth"
      className={`${interSans.variable} ${geistMono.variable} h-full scroll-smooth antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <LocationProvider>{children}</LocationProvider>
        <Chatbot />
      </body>
    </html>
  );
}
