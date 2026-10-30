import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CRM & Loyalty — Mukund Maid Jewellers",
  description: "MMJ customer relationships and loyalty",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
