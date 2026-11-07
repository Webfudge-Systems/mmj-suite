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
};

/** Webfudge-style pill tabs on a frosted track. */
export function Tabs<T extends string>({ tabs, active, onChange, actions, label = "Views", className }: TabsProps<T>) {
  return (
    <div className={cn("flex flex-wrap items-center gap-3 rounded-xl border border-white/40 bg-white/70 p-2 shadow-lg backdrop-blur-xl", className)}>
      <div role="tablist" aria-label={label} className="flex min-w-0 flex-1 flex-wrap gap-2">
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
                "flex items-center rounded-lg border px-4 py-2 text-sm font-semibold whitespace-nowrap transition-all duration-300",
                selected
                  ? "border-transparent bg-navy text-white shadow-lg"
                  : "border-gray-100 bg-white text-gray-700 shadow-sm hover:shadow-md",
              )}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className={cn("ml-2 rounded-full px-2 py-0.5 text-xs font-bold", selected ? "bg-white/25 text-white" : "bg-gray-100 text-gray-700")}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2 border-l border-gray-200/70 pl-3">{actions}</div>}
    </div>
  );
}
