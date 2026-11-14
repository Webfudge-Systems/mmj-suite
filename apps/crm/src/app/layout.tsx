import type { Metadata } from "next";
import { openSauce } from "@webfudge/ui/fonts";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "CRM & Loyalty — MMJ", template: "%s — MMJ CRM" },
  description: "Customers, loyalty points, gold schemes and enquiries for Mukund Maid Jewellers",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={openSauce.variable}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
