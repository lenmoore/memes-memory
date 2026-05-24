import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <body className="bg-white text-black font-serif antialiased">
        {children}
      </body>
    </html>
  );
}
