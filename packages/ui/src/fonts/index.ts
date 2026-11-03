import localFont from "next/font/local";

/** Open Sauce One, the MMJ brand typeface. Put `openSauce.variable` on <html>. */
export const openSauce = localFont({
  src: [
    { path: "./open-sauce-one-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./open-sauce-one-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./open-sauce-one-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./open-sauce-one-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-open-sauce",
  display: "swap",
});
