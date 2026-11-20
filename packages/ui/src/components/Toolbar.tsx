"use client";

import { forwardRef, useEffect, useRef, useState, type ButtonHTMLAttributes, type ComponentType, type ReactNode } from "react";
import { Check, Download, Search, SlidersHorizontal, X } from "lucide-react";
import { cn } from "../lib/cn";

/** Search box for a list toolbar, as on the Webfudge CRM lists. */
export function ToolbarSearch({ value, onChange, placeholder = "Search…", className }: { value: string; onChange: (value: string) => void; placeholder?: string; className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-500" aria-hidden />
      <input
        type="search"
        aria-label={placeholder.replace(/…$/, "")}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-xl border border-gray-300 bg-white pr-8 pl-10 text-sm text-ink shadow-md transition-colors outline-none placeholder:text-gray-400 focus:border-navy/50 focus:ring-2 focus:ring-navy/15 sm:w-64 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button type="button" onClick={() => onChange("")} className="absolute top-1/2 right-2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-ink" aria-label="Clear search">
          <X className="size-3.5" aria-hidden />
        </button>
      )}
    </div>
  );
}

type ToolbarButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: ComponentType<{ className?: string }>;
  /** Spoken and shown on hover. */
  label: string;
  active?: boolean;
  /** A small count on the button, like the number of filters on. */
  count?: number;
};

/** Round icon button for a list toolbar (filter, sort, export, add). */
export const ToolbarButton = forwardRef<HTMLButtonElement, ToolbarButtonProps>(function ToolbarButton({ icon: Icon, label, active, count, className, type, ...props }, ref) {
  return (
    <button
      ref={ref}
      type={type ?? "button"}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "relative grid size-10 shrink-0 place-items-center rounded-full border shadow-md transition-colors disabled:opacity-40",
        active ? "border-navy bg-navy text-white hover:bg-navy-deep" : "border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50",
        className,
      )}
      {...props}
    >
      <Icon className="size-[18px]" aria-hidden />
      {count ? <span className="absolute -top-1 -right-1 grid min-w-5 place-items-center rounded-full bg-gold px-1 text-[10.5px] font-bold text-ink">{count}</span> : null}
    </button>
  );
});

/** A link styled as the toolbar's round button, for "add new" that opens a page. */
export function ToolbarLinkClass(primary = false) {
  return cn(
    "grid size-10 shrink-0 place-items-center rounded-full border shadow-md transition-colors",
    primary ? "border-navy bg-navy text-white hover:bg-navy-deep" : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
  );
}

export type FilterOption = { value: string; label: string };
export type FilterGroup = { key: string; label: string; options: FilterOption[] };

/**
 * A filter button with a small panel of choices. `value` maps each group key to
 * the chosen option ("" for any).
 */
export function ToolbarFilter({ groups, value, onChange }: { groups: FilterGroup[]; value: Record<string, string>; onChange: (value: Record<string, string>) => void }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const active = Object.values(value).filter(Boolean).length;

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (box.current && !box.current.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return (
    <div ref={box} className="relative">
      <ToolbarButton icon={SlidersHorizontal} label="Filter" active={active > 0} count={active} onClick={() => setOpen((current) => !current)} aria-expanded={open} />
      {open && (
        <div className="absolute top-12 right-0 z-30 grid w-72 gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-xl">
          {groups.map((group) => (
            <div key={group.key} className="grid gap-1.5">
              <span className="text-[11.5px] font-bold tracking-wide text-gray-500 uppercase">{group.label}</span>
              <div className="flex flex-wrap gap-1.5">
                {[{ value: "", label: "Any" }, ...group.options].map((option) => {
                  const selected = (value[group.key] ?? "") === option.value;
                  return (
                    <button
                      key={option.value || "any"}
                      type="button"
                      onClick={() => onChange({ ...value, [group.key]: option.value })}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12.5px] font-semibold transition-colors",
                        selected ? "border-navy bg-navy text-white" : "border-gray-200 bg-white text-gray-700 hover:border-gray-300",
                      )}
                    >
                      {selected && <Check className="size-3" aria-hidden />}
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {active > 0 && (
            <button type="button" onClick={() => onChange(Object.fromEntries(groups.map((group) => [group.key, ""])))} className="justify-self-start text-[12.5px] font-semibold text-navy hover:underline">
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Export button: downloads what the list shows as a CSV file. */
export function ToolbarExport({ onExport, label = "Download as CSV" }: { onExport: () => void; label?: string }) {
  return <ToolbarButton icon={Download} label={label} onClick={onExport} />;
}

/** "Showing 12 of 40" under a toolbar. */
export function ResultsCount({ shown, total, noun = "result" }: { shown: number; total?: number; noun?: string }) {
  const plural = (count: number) => `${count} ${count === 1 ? noun : `${noun}s`}`;
  return <p className="px-1 text-[13px] text-ash">{total !== undefined && total !== shown ? `Showing ${shown} of ${plural(total)}` : plural(shown)}</p>;
}

/** Groups toolbar controls on the right of a Tabs track. */
export function ToolbarActions({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>;
}
