import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "POS & Billing — Mukund Maid Jewellers",
  description: "MMJ point of sale and billing",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
