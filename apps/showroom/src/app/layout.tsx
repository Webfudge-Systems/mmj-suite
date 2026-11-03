import type { Metadata } from "next";
import { openSauce } from "@webfudge/ui/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Showroom — MMJ",
  description: "Showroom for Mukund Maid Jewellers",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={openSauce.variable}>
      <body>{children}</body>
    </html>
  );
}
