import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { LocationProvider } from "@/context/location-context";
import { Chatbot } from "@/components/site/chatbot";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <LocationProvider>{children}</LocationProvider>
        <Chatbot />
      </body>
    </html>
  );
}
