import type { ReactNode } from "react";
import { brand } from "@webfudge/config";
import { cn } from "../lib/cn";

export type PrintSeller = { name: string; tradeName?: string | null; address?: string | null; phone?: string | null; email?: string | null; gstin?: string | null };

/**
 * A full A4 document in the MMJ style shared by the tax invoice: logo header,
 * a title badge, reference strip, the body, signatures and terms at the foot,
 * and the MMJ mark as a faint watermark. Hidden parts of the app shell stay out
 * of print; give the page `@page { size: A4; margin: 12mm }`.
 */
export function PrintSheet({
  logoSrc,
  seller,
  title,
  copy = "Original for recipient",
  facts,
  children,
  signatures,
  terms,
  stamp,
  className,
}: {
  /** The app's copy of the MMJ mark, like /brand/mmj-mark.png. */
  logoSrc: string;
  seller: PrintSeller;
  title: string;
  copy?: string;
  /** Up to three label/value pairs in the strip under the header. */
  facts: { label: string; value: ReactNode }[];
  children: ReactNode;
  /** Left and right signature captions. */
  signatures?: [ReactNode, ReactNode];
  terms?: ReactNode;
  /** A big diagonal stamp, like CANCELLED or USED. */
  stamp?: { text: string; tone?: "risk" | "ok" | "neutral" };
  className?: string;
}) {
  const name = seller.tradeName || seller.name || brand.name;
  const stampTone = { risk: "border-risk/60 text-risk/50", ok: "border-ok/60 text-ok/50", neutral: "border-gray-400/60 text-gray-500/50" }[stamp?.tone ?? "risk"];

  return (
    <article
      className={cn(
        "print-sheet relative mx-auto flex min-h-[297mm] w-[210mm] flex-col overflow-hidden bg-white px-[12mm] py-[11mm] text-[10.5px] leading-snug text-black print:min-h-[273mm] print:w-auto print:p-0",
        className,
      )}
      style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="grid justify-items-center gap-3 opacity-[0.1]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} alt="" className="w-[95mm]" />
          <span className="text-[30px] font-bold tracking-[0.3em] text-navy uppercase">{brand.name}</span>
        </div>
      </div>
      {stamp && (
        <div aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className={cn("-rotate-[24deg] rounded-xl border-[6px] px-8 py-2 text-[60px] font-black tracking-widest", stampTone)}>{stamp.text}</span>
        </div>
      )}

      <div className="relative flex flex-1 flex-col gap-3.5">
        <header className="grid grid-cols-[auto_1fr_auto] items-center gap-4 border-b-[3px] border-gold pb-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} alt={`${brand.name} logo`} className="h-[22mm] w-auto" />
          <div className="grid gap-0.5">
            <span className="text-[20px] leading-tight font-bold tracking-wide text-navy">{name}</span>
            {seller.address && <span>{seller.address}</span>}
            <span>{[seller.phone && `Phone ${seller.phone}`, seller.email, seller.gstin && `GSTIN ${seller.gstin}`].filter(Boolean).join(" · ")}</span>
          </div>
          <div className="grid justify-items-end gap-1 text-right">
            <span className="rounded-md bg-navy px-3 py-1 text-[14px] font-bold tracking-wider text-white uppercase">{title}</span>
            {copy && <span className="text-[9px] font-semibold tracking-wide text-ash uppercase">{copy}</span>}
          </div>
        </header>

        <section className="grid grid-cols-3 gap-2 rounded-md border border-navy/30 px-3 py-2">
          {facts.slice(0, 3).map((fact, index) => (
            <div key={fact.label} className={index === 1 ? "text-center" : index === 2 ? "text-right" : undefined}>
              <span className="block text-[8.5px] font-semibold tracking-wide text-ash uppercase">{fact.label}</span>
              <span className="text-[11.5px] font-bold">{fact.value}</span>
            </div>
          ))}
        </section>

        {children}

        <div className="mt-auto grid gap-3 pt-4">
          {signatures && (
            <div className="grid grid-cols-2 gap-10">
              <div className="grid gap-1">
                <span className="h-12 border-b border-black" />
                <span>{signatures[0]}</span>
              </div>
              <div className="grid justify-items-end gap-1 text-right">
                <span className="font-semibold">For {name}</span>
                <span className="h-9 w-56 border-b border-black" />
                <span>{signatures[1]}</span>
              </div>
            </div>
          )}
          <footer className="grid gap-1 border-t-[3px] border-gold pt-2 text-[8.5px] text-ash">
            {terms && <div>{terms}</div>}
            <p>{[seller.name, seller.address, seller.gstin && `GSTIN ${seller.gstin}`, seller.phone, seller.email].filter(Boolean).join(" · ")}</p>
          </footer>
        </div>
      </div>
    </article>
  );
}

/** A two-column details box inside a PrintSheet (customer, booking details). */
export function PrintBox({ title, rows, className }: { title: string; rows: [string, ReactNode][]; className?: string }) {
  return (
    <dl className={cn("rounded-md border border-navy/30 p-2.5", className)}>
      <p className="mb-1 border-b border-navy/20 pb-1 text-[11px] font-bold text-navy">{title}</p>
      {rows.map(([label, value]) => (
        <div key={label} className="grid grid-cols-[32mm_1fr] gap-2 py-[1.5px]">
          <dt className="font-semibold">{label}</dt>
          <dd>{value === null || value === undefined || value === "" ? "—" : value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Wraps a PrintSheet on screen: grey surround, shadowed page, white on paper. */
export function PrintPreview({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-[var(--radius-panel)] border border-line bg-gray-100 p-4 sm:p-6 print:overflow-visible print:border-0 print:bg-white print:p-0">
      <style>{`@media print { @page { size: A4; margin: 12mm; } }`}</style>
      <div className="mx-auto w-fit shadow-xl print:shadow-none">{children}</div>
    </div>
  );
}
