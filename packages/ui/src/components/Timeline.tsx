import type { ComponentType, ReactNode } from "react";
import { Check, X } from "lucide-react";
import { cn } from "../lib/cn";

type Icon = ComponentType<{ className?: string }>;

export type Step = { key: string; label: ReactNode; icon?: Icon; note?: ReactNode };

/**
 * Where something stands in a fixed flow (received → in work → ready → delivered):
 * finished steps are ticked, the current one is highlighted, the rest are grey.
 * `stopped` shows a cancelled flow with a cross at the step it stopped on.
 */
export function StatusSteps({ steps, current, stopped, className }: { steps: Step[]; current: string; stopped?: ReactNode; className?: string }) {
  const at = Math.max(0, steps.findIndex((step) => step.key === current));
  return (
    <div className={className}>
      <ol className="flex items-start">
        {steps.map((step, index) => {
          const done = index < at || (index === at && index === steps.length - 1 && !stopped);
          const now = index === at && !done;
          const StepIcon = step.icon;
          return (
            <li key={step.key} className="relative flex flex-1 flex-col items-center text-center">
              {index > 0 && <span aria-hidden className={cn("absolute top-5 right-1/2 h-1 w-full -translate-y-1/2 rounded-full", index <= at ? (stopped && index === at ? "bg-risk/40" : "bg-navy") : "bg-gray-200")} />}
              <span
                className={cn(
                  "relative z-10 grid size-10 place-items-center rounded-full border-2 transition-colors",
                  stopped && index === at
                    ? "border-risk bg-risk text-white"
                    : done
                      ? "border-navy bg-navy text-white"
                      : now
                        ? "border-gold bg-gold text-ink shadow-[0_0_0_6px_rgba(233,177,32,0.22)]"
                        : "border-gray-200 bg-white text-gray-400",
                )}
              >
                {stopped && index === at ? <X className="size-5" aria-hidden /> : done ? <Check className="size-5" aria-hidden /> : StepIcon ? <StepIcon className="size-[18px]" /> : <span className="text-sm font-bold">{index + 1}</span>}
              </span>
              <span className={cn("mt-2 px-1 text-[12.5px] leading-tight", now || (stopped && index === at) ? "font-bold text-ink" : done ? "font-semibold text-ink" : "text-gray-500")}>{step.label}</span>
              {step.note && <span className="mt-0.5 px-1 text-[11px] text-ash">{step.note}</span>}
            </li>
          );
        })}
      </ol>
      {stopped && <p className="mt-3 text-center text-[13px] font-semibold text-risk">{stopped}</p>}
    </div>
  );
}

export type ActivityEntry = { at: string; by?: string | null; text: ReactNode; icon?: Icon; tone?: "navy" | "gold" | "ok" | "risk" };

/** A dated history, newest first, with a coloured dot or icon per entry. */
export function ActivityLog({ entries, formatTime, empty = "Nothing yet." }: { entries: ActivityEntry[]; formatTime: (iso: string) => string; empty?: ReactNode }) {
  if (!entries.length) return <p className="text-sm text-ash">{empty}</p>;
  const tones = { navy: "bg-navy text-white", gold: "bg-gold text-ink", ok: "bg-ok text-white", risk: "bg-risk text-white" } as const;
  return (
    <ol className="grid">
      {entries.map((entry, index) => {
        const EntryIcon = entry.icon;
        return (
          <li key={`${entry.at}-${index}`} className="relative grid grid-cols-[28px_1fr] gap-3 pb-5 last:pb-0">
            {index < entries.length - 1 && <span aria-hidden className="absolute top-7 bottom-0 left-[13px] w-0.5 bg-gray-100" />}
            <span className={cn("relative grid size-7 place-items-center rounded-full ring-4 ring-white", tones[entry.tone ?? "navy"])}>
              {EntryIcon ? <EntryIcon className="size-3.5" /> : <span className="size-2 rounded-full bg-current" />}
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="text-sm text-ink">{entry.text}</p>
              <p className="text-[12px] text-ash">
                {formatTime(entry.at)}
                {entry.by ? ` · ${entry.by}` : ""}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
