"use client";

import type { ReactNode } from "react";
import { cn } from "../lib/cn";

export type TabItem<T extends string> = { key: T; label: ReactNode; count?: number };

type TabsProps<T extends string> = {
  tabs: TabItem<T>[];
  active: T;
  onChange: (key: T) => void;
  /** Extra controls on the right of the track (search, filters). */
  actions?: ReactNode;
  label?: string;
  className?: string;
  /**
   * `track` (default): list views on a frosted bar.
   * `pill`: detail-page sections on a white pill track, as on Webfudge CRM detail pages.
   */
  variant?: "track" | "pill";
};

/** Webfudge-style tabs: a frosted track for list views, or a pill track for detail pages. */
export function Tabs<T extends string>({ tabs, active, onChange, actions, label = "Views", className, variant = "track" }: TabsProps<T>) {
  const pill = variant === "pill";
  return (
    <div
      className={cn(
        pill
          ? "flex flex-wrap items-center gap-3"
          : "flex flex-wrap items-center gap-3 rounded-xl border border-white/40 bg-white/70 p-2 shadow-lg backdrop-blur-xl",
        className,
      )}
    >
      <div
        role="tablist"
        aria-label={label}
        className={cn(
          pill
            ? "flex min-h-12 min-w-0 flex-1 items-center gap-1 overflow-x-auto rounded-full border border-gray-200 bg-white px-2 py-1.5 shadow-[0_2px_12px_rgba(15,23,42,0.09),0_1px_3px_rgba(15,23,42,0.05)] [scrollbar-width:none]"
            : "flex min-w-0 flex-1 flex-wrap gap-2",
        )}
      >
        {tabs.map((tab) => {
          const selected = tab.key === active;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onChange(tab.key)}
              className={cn(
                pill
                  ? "flex min-w-[5.5rem] flex-1 basis-0 items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-sm whitespace-nowrap transition-all duration-200"
                  : "flex items-center rounded-lg border px-4 py-2 text-sm font-semibold whitespace-nowrap transition-all duration-300",
                pill
                  ? selected
                    ? "bg-navy font-semibold text-white shadow-sm"
                    : "font-medium text-gray-700 hover:bg-gray-100"
                  : selected
                    ? "border-transparent bg-navy text-white shadow-lg"
                    : "border-gray-100 bg-white text-gray-700 shadow-sm hover:shadow-md",
              )}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className={cn("rounded-full px-2 py-0.5 text-xs font-bold", !pill && "ml-2", selected ? "bg-white/25 text-white" : "bg-gray-100 text-gray-700")}>{tab.count}</span>
              )}
            </button>
          );
        })}
      </div>
      {actions && <div className={cn("flex shrink-0 flex-wrap items-center gap-2", !pill && "border-l border-gray-200/70 pl-3")}>{actions}</div>}
    </div>
  );
}
