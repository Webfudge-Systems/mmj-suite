"use client";

import { useEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import QRCode from "qrcode";
import type { StockItem, StockLocation } from "@webfudge/utils/api";

/**
 * Printable label sizes. Jewellery shops use either a two-flap "dumbbell" tag
 * that loops through the piece, or a flat sticker. Sizes are in millimetres.
 */
export const TAG_TEMPLATES = {
  dumbbell: { label: "Dumbbell tag, 2 flaps of 30 × 12 mm", width: 90, height: 12 },
  sticker: { label: "Sticker, 50 × 25 mm", width: 50, height: 25 },
} as const;

export type TagTemplate = keyof typeof TAG_TEMPLATES;

function Barcode({ value, height }: { value: string; height: number }) {
  const svg = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (!svg.current) return;
    JsBarcode(svg.current, value, { format: "CODE128", displayValue: false, margin: 0, height: 40, width: 1.4 });
  }, [value]);
  return <svg ref={svg} style={{ height: `${height}mm`, width: "100%" }} preserveAspectRatio="none" aria-label={`Barcode ${value}`} />;
}

const mm = (value: number) => `${value}mm`;

/** One printed tag. Text is kept to what the counter needs: purity, weights, HUID. */
export function TagLabel({ item, template }: { item: StockItem; template: TagTemplate }) {
  const size = TAG_TEMPLATES[template];
  const weights = `G ${item.grossWeight.toFixed(3)} · N ${item.netWeight.toFixed(3)}`;

  if (template === "dumbbell") {
    return (
      <div className="tag-label flex overflow-hidden bg-white text-black" style={{ width: mm(size.width), height: mm(size.height) }}>
        <div className="flex flex-col justify-between px-[1mm] py-[0.5mm]" style={{ width: mm(30) }}>
          <Barcode value={item.tagNumber} height={6.5} />
          <span className="font-mono text-[6.5pt] leading-none font-semibold">{item.tagNumber}</span>
        </div>
        <div style={{ width: mm(30) }} aria-hidden />
        <div className="flex flex-col justify-center gap-[0.4mm] px-[1mm] text-[6pt] leading-none" style={{ width: mm(30) }}>
          <span className="font-semibold">
            {item.purity} {item.huid ? `· ${item.huid}` : ""}
          </span>
          <span className="tabular-nums">{weights}</span>
          <span className="truncate">{item.design?.code}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="tag-label flex flex-col justify-between overflow-hidden bg-white p-[1.5mm] text-black" style={{ width: mm(size.width), height: mm(size.height) }}>
      <div className="flex items-baseline justify-between text-[7pt] leading-none font-semibold">
        <span>MMJ</span>
        <span>
          {item.purity} {item.huid ? `· HUID ${item.huid}` : ""}
        </span>
      </div>
      <Barcode value={item.tagNumber} height={9} />
      <div className="flex items-baseline justify-between text-[6.5pt] leading-none">
        <span className="font-mono font-semibold">{item.tagNumber}</span>
        <span className="tabular-nums">{weights}</span>
      </div>
    </div>
  );
}

/** A tray label: QR code of the tray's full code, plus the code in large type. */
export function TrayLabel({ location }: { location: StockLocation }) {
  const [svg, setSvg] = useState<string>("");
  useEffect(() => {
    let active = true;
    QRCode.toString(location.fullCode, { type: "svg", margin: 0, errorCorrectionLevel: "M" }).then((markup) => active && setSvg(markup));
    return () => {
      active = false;
    };
  }, [location.fullCode]);

  return (
    <div className="tag-label flex items-center gap-[2mm] overflow-hidden bg-white p-[2mm] text-black" style={{ width: mm(50), height: mm(25) }}>
      <div className="size-[21mm] shrink-0" dangerouslySetInnerHTML={{ __html: svg }} />
      <div className="grid min-w-0 gap-[1mm] leading-none">
        <span className="font-mono text-[10pt] font-bold break-all">{location.fullCode}</span>
        {location.name && <span className="truncate text-[7pt]">{location.name}</span>}
      </div>
    </div>
  );
}

/** Lays labels out for the printer: one per page at the label size, the way label printers feed. */
export function PrintSheet({ width, height, children }: { width: number; height: number; children: React.ReactNode }) {
  return (
    <>
      <style>{`@media print { @page { size: ${width}mm ${height}mm; margin: 0; } .tag-label { break-after: page; } }`}</style>
      <div className="flex flex-wrap gap-3 print:block">{children}</div>
    </>
  );
}
