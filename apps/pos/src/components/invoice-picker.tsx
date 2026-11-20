"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ReceiptText, Search } from "lucide-react";
import { useApi } from "@webfudge/auth/components";
import { Input, Spinner, cn } from "@webfudge/ui";
import type { InvoiceSummary, Page } from "@webfudge/utils/api";
import { formatDate, formatINR } from "@webfudge/utils/formatters";

/**
 * Finds a paid invoice by number, customer name or mobile. Suggestions drop down
 * as you type, styled like the customer picker; arrow keys and Enter choose.
 */
export function InvoicePicker({ onChoose, placeholder = "Invoice number, customer name or mobile" }: { onChoose: (invoice: InvoiceSummary) => void; placeholder?: string }) {
  const api = useApi();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<InvoiceSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const box = useRef<HTMLDivElement>(null);
  const typed = query.trim();

  useEffect(() => {
    if (typed.length < 2) return;
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      api
        .get<Page<InvoiceSummary>>(`/sales/invoices?status=paid&pageSize=12&q=${encodeURIComponent(typed)}`)
        .then(({ data }) => {
          if (!active) return;
          setResults(data);
          setHighlight(data.length ? 0 : -1);
        })
        .catch(() => active && setResults([]))
        .finally(() => active && setLoading(false));
    }, 200);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [api, typed]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (box.current && !box.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function choose(invoice: InvoiceSummary) {
    setOpen(false);
    setQuery("");
    onChoose(invoice);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open || !results.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlight((index) => (index + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((index) => (index <= 0 ? results.length - 1 : index - 1));
    } else if (event.key === "Enter" && highlight >= 0) {
      event.preventDefault();
      choose(results[highlight]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={box} className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-3.5 z-10 size-4 -translate-y-1/2 text-gray-400" aria-hidden />
      <Input
        id="invoice-search"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls="invoice-suggestions"
        className="pl-10"
      />
      {loading && <Spinner className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-navy" />}
      {open && typed.length >= 2 && !loading && (
        <ul id="invoice-suggestions" role="listbox" className="absolute z-30 mt-1.5 max-h-80 w-full overflow-y-auto rounded-xl border border-gray-100 bg-white py-1.5 shadow-xl">
          {results.map((invoice, index) => (
            <li key={invoice.id} role="option" aria-selected={index === highlight}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setHighlight(index)}
                onClick={() => choose(invoice)}
                className={cn("flex w-full items-center gap-3 px-4 py-2.5 text-left", index === highlight ? "bg-navy-soft" : "hover:bg-gray-50")}
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gold-soft text-gold-deep">
                  <ReceiptText className="size-4" aria-hidden />
                </span>
                <span className="grid min-w-0 flex-1 leading-tight">
                  <span className="truncate font-mono text-[13.5px] font-semibold text-ink">{invoice.number}</span>
                  <span className="truncate text-[13px] text-ash">
                    {invoice.customer.name} · {invoice.customer.phone} · {formatDate(invoice.invoiceDate)}
                  </span>
                </span>
                <span className="grid shrink-0 text-right leading-tight">
                  <span className="text-sm font-semibold text-ink tabular-nums">{formatINR(invoice.total)}</span>
                  <span className="text-[11.5px] text-ash">
                    {invoice.pieces} {invoice.pieces === 1 ? "piece" : "pieces"}
                  </span>
                </span>
              </button>
            </li>
          ))}
          {!results.length && <li className="px-4 py-3 text-[13.5px] text-ash">No paid invoice matches “{typed}”.</li>}
        </ul>
      )}
    </div>
  );
}
