import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Announcement } from "@/components/layout/Announcement";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { SearchOverlay } from "@/components/layout/SearchOverlay";
import { Footer } from "@/components/layout/Footer";
import { CartDrawer } from "@/components/commerce/CartDrawer";
import { site } from "@/data/site";

/** Official MMJ brand typeface — Open Sauce One (SemiBold = logo weight). */
const openSauce = localFont({
  src: [
    {
      path: "../fonts/open-sauce-one-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/open-sauce-one-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../fonts/open-sauce-one-latin-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../fonts/open-sauce-one-latin-700-normal.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-open-sauce",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0a2874" },
    { media: "(prefers-color-scheme: dark)", color: "#0a2874" },
  ],
  colorScheme: "light",
};

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — fine gold, diamond & silver jewellery`,
    template: `%s — ${site.shortName}`,
  },
  description: site.description,
  applicationName: site.name,
  keywords: [
    "Mukund Maid Jewellers",
    "MMJ",
    "gold jewellery Rahuri",
    "diamond jewellery Maharashtra",
    "BIS hallmarked jewellery",
    "bridal jewellery",
    "silver ornaments",
    "Ahmednagar jewellers",
  ],
  authors: [{ name: site.name, url: site.url }],
  creator: site.name,
  publisher: site.name,
  category: "shopping",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: `${site.name} — fine gold, diamond & silver jewellery`,
    description: site.description,
    type: "website",
    siteName: site.name,
    locale: "en_IN",
    url: site.url,
    images: [
      {
        url: "/brand/Primary_Logo.png",
        width: 1405,
        height: 1203,
        alt: `${site.name} logo`,
      },
    ],
  },
  twitter: {
    card: "summary",
    title: `${site.name} — fine gold, diamond & silver jewellery`,
    description: site.description,
    images: ["/brand/Primary_Logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  icons: {
    icon: [
      { url: "/favicon/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/favicon/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/favicon/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/favicon/favicon-32x32.png"],
  },
  manifest: "/favicon/site.webmanifest",
  other: {
    "msapplication-TileColor": "#0a2874",
    "msapplication-config": "/favicon/browserconfig.xml",
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "JewelryStore",
  name: site.name,
  alternateName: site.shortName,
  url: site.url,
  logo: `${site.url}/brand/Primary_Logo.png`,
  image: `${site.url}/brand/Primary_Logo.png`,
  description: site.description,
  email: site.email,
  telephone: site.phones[0],
  foundingDate: site.established,
  address: {
    "@type": "PostalAddress",
    streetAddress: site.address.lines.join(", "),
    addressLocality: site.address.city,
    addressRegion: site.address.state,
    postalCode: site.address.pincode,
    addressCountry: "IN",
  },
  openingHours: "Tu-Su 10:00-18:00",
  sameAs: site.social.map((entry) => entry.href),
  priceRange: "₹₹₹",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en-IN"
      data-scroll-behavior="smooth"
      className={openSauce.variable}
    >
      <body className="font-sans antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />

        <a
          href="#main"
          className="eyebrow sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:bg-ink focus:px-5 focus:py-3 focus:text-[10px] focus:text-cream"
        >
          Skip to content
        </a>

        <div className="sticky top-0 z-50">
          <Announcement />
          <Header />
        </div>

        <MobileNav />
        <SearchOverlay />
        <CartDrawer />

        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
