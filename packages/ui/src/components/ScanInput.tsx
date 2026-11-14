"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Gem, ScanLine } from "lucide-react";
import { cn } from "../lib/cn";
import { Button } from "./Button";
import { Spinner } from "./Spinner";

/** One match shown under the scan box while typing. */
export type ScanSuggestion = {
  /** What is sent to onScan when chosen, usually the tag number. */
  code: string;
  title: string;
  /** Second line: design, purity, weight, tray. */
  detail?: string;
  /** Right-hand note, such as the price or a status. */
  aside?: string;
  imageUrl?: string | null;
  /** Shown greyed out and not selectable, with the reason in `aside`. */
  disabled?: boolean;
};

type ScanInputProps = {
  id: string;
  /** Called with the code when the scanner (or a person) presses Enter, or a suggestion is chosen. */
  onScan: (code: string) => void | Promise<void>;
  /**
   * Looks up matches for what has been typed so far. When given, matching
   * pieces appear under the box to pick with the mouse or arrow keys.
   * Scanners are unaffected: they type the whole code and press Enter.
   */
  onSearch?: (query: string) => Promise<ScanSuggestion[]>;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
};

/**
 * Text box for USB and Bluetooth barcode scanners, which type the code and
 * press Enter. Clears itself and keeps focus so the next scan goes straight in.
 */
export function ScanInput({ id, onScan, onSearch, placeholder = "Scan or type a tag, then press Enter", disabled, autoFocus = true, className }: ScanInputProps) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [found, setFound] = useState<{ q: string; items: ScanSuggestion[] } | null>(null);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const input = useRef<HTMLInputElement>(null);
  // Kept in a ref so a new function on every render does not restart the search.
  const search = useRef(onSearch);
  useEffect(() => {
    search.current = onSearch;
  });

  const typed = value.trim();
  const searching = Boolean(onSearch && open && typed.length >= 2 && found?.q !== typed);

  useEffect(() => {
    if (!search.current || typed.length < 2) return;
    let active = true;
    const timer = window.setTimeout(() => {
      search.current?.(typed)
        .then((items) => {
          if (!active) return;
          setFound({ q: typed, items });
          setHighlight(-1);
        })
        .catch(() => active && setFound({ q: typed, items: [] }));
    }, 220);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [typed]);

  const items = typed.length >= 2 && found ? found.items : [];
  const showList = Boolean(onSearch && open && typed.length >= 2 && (items.length > 0 || (found?.q === typed && !busy)));

  async function submit(code = typed) {
    if (!code || busy) return;
    setBusy(true);
    setValue("");
    setFound(null);
    setHighlight(-1);
    try {
      await onScan(code);
    } finally {
      setBusy(false);
      input.current?.focus();
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" && items.length) {
      event.preventDefault();
      setOpen(true);
      setHighlight((index) => {
        let next = index;
        do next = Math.min(next + 1, items.length - 1);
        while (items[next]?.disabled && next < items.length - 1);
        return items[next]?.disabled ? index : next;
      });
    } else if (event.key === "ArrowUp" && items.length) {
      event.preventDefault();
      setHighlight((index) => Math.max(index - 1, -1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      // A highlighted suggestion wins; otherwise the typed code goes in as scanned.
      const pick = highlight >= 0 ? items[highlight] : undefined;
      submit(pick && !pick.disabled ? pick.code : typed);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div
      className={cn("relative flex gap-2", className)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <div className="relative min-w-0 flex-1">
        <ScanLine className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-navy/60" aria-hidden />
        <input
          ref={input}
          id={id}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          autoComplete="off"
          spellCheck={false}
          role={onSearch ? "combobox" : undefined}
          aria-expanded={onSearch ? showList : undefined}
          aria-controls={onSearch ? `${id}-suggestions` : undefined}
          aria-activedescendant={highlight >= 0 ? `${id}-option-${highlight}` : undefined}
          className="h-12 w-full rounded-full border border-navy/40 bg-surface pr-10 pl-12 font-mono text-[15px] tracking-wide text-ink uppercase shadow-sm transition-all placeholder:font-sans placeholder:tracking-normal placeholder:normal-case placeholder:text-gray-400 focus:border-navy focus:ring-2 focus:ring-navy/25 focus:outline-none"
        />
        {searching && <Spinner className="absolute top-1/2 right-4 size-4 -translate-y-1/2 text-navy/60" label="Searching" />}
      </div>
      <Button size="lg" className="rounded-full" onClick={() => submit()} loading={busy} disabled={disabled || !typed}>
        Add
      </Button>

      {showList && (
        <ul id={`${id}-suggestions`} role="listbox" className="absolute top-full right-0 left-0 z-30 mt-1.5 max-h-96 overflow-y-auto rounded-xl border border-gray-100 bg-white py-1.5 shadow-xl">
          {items.map((item, index) => (
            <li key={`${item.code}-${index}`} id={`${id}-option-${index}`} role="option" aria-selected={index === highlight} aria-disabled={item.disabled || undefined}>
              <button
                type="button"
                disabled={item.disabled}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => !item.disabled && setHighlight(index)}
                onClick={() => submit(item.code)}
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-2 text-left",
                  item.disabled ? "cursor-not-allowed opacity-50" : index === highlight ? "bg-navy-soft" : "hover:bg-gray-50",
                )}
              >
                <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50 text-gray-300">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt="" className="size-full object-cover" loading="lazy" />
                  ) : (
                    <Gem className="size-5" aria-hidden />
                  )}
                </span>
                <span className="grid min-w-0 flex-1 leading-tight">
                  <span className="truncate font-mono text-[13.5px] font-semibold text-ink">{item.title}</span>
                  {item.detail && <span className="truncate text-[12.5px] text-ash">{item.detail}</span>}
                </span>
                {item.aside && <span className="shrink-0 text-right text-[12.5px] font-semibold text-navy tabular-nums">{item.aside}</span>}
              </button>
            </li>
          ))}
          {items.length === 0 && <li className="px-4 py-3 text-[13px] text-ash">No piece matches “{typed}”. Press Enter to try it as a tag anyway.</li>}
        </ul>
      )}
    </div>
  );
}
