import type { Metadata } from "next";
import { Bokor, Jacquard_12 } from "next/font/google";
import Navbar from "@/components/Navbar";
import "./globals.css";

const jacquard12 = Jacquard_12({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-jacquard-12",
});

const bokor = Bokor({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-bokor",
});

export const metadata: Metadata = {
  title: "Memes as Stained Glass",
  description: "A reading of internet memes through critical-theoretical lenses.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${jacquard12.variable} ${bokor.variable}`}>
      <body className="bg-white text-black font-serif antialiased">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
