import type { Metadata, Viewport } from "next";
import { openSauce } from "@webfudge/ui/fonts";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Showroom — MMJ",
  description: "The MMJ collection on the showroom tablets",
  applicationName: "MMJ Showroom",
  appleWebApp: { capable: true, title: "MMJ Showroom", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#071c52",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
