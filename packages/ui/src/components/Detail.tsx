import type { ComponentType, ReactNode } from "react";
import { cn } from "../lib/cn";
import { Card } from "./Card";

type Icon = ComponentType<{ className?: string; strokeWidth?: number }>;

/**
 * The top card of a detail page, as on Webfudge CRM accounts: a big icon or
 * photo, the name with status pills, a line of facts, and a headline figure on
 * the right.
 */
export function DetailHero({
  icon: HeroIcon,
  image,
  title,
  badges,
  meta,
  stat,
  className,
}: {
  icon?: Icon;
  image?: ReactNode;
  title: ReactNode;
  badges?: ReactNode;
  meta?: ReactNode;
  stat?: { label: ReactNode; value: ReactNode; note?: ReactNode };
  className?: string;
}) {
  return (
    <Card className={cn("rounded-2xl border-navy-line bg-gradient-to-r from-navy-soft/70 via-white to-gold-soft/50 p-4 sm:p-5", className)}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          {image ?? (
            <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-white text-navy shadow-inner ring-1 ring-navy-line" aria-hidden>
              {HeroIcon && <HeroIcon className="size-8" strokeWidth={1.75} />}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="min-w-0 text-xl font-semibold text-ink md:text-2xl">{title}</h2>
              {badges}
            </div>
            {meta && <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-ash">{meta}</div>}
          </div>
        </div>
        {stat && (
          <div className="flex shrink-0 flex-col gap-0.5 border-t border-gray-100 pt-3 text-left lg:border-t-0 lg:pt-0 lg:text-right">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-gray-500 uppercase">{stat.label}</p>
            <p className="text-2xl font-bold text-ink tabular-nums">{stat.value}</p>
            {stat.note && <p className="text-[13px] text-ash">{stat.note}</p>}
          </div>
        )}
      </div>
    </Card>
  );
}

/** A meta item in the hero: small icon and text. */
export function HeroFact({ icon: FactIcon, children }: { icon?: Icon; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {FactIcon && <FactIcon className="size-3.5 shrink-0 text-gold" />}
      {children}
    </span>
  );
}

/** A loud status pill for a hero, like "Closed" or "Ready to collect". */
export function StatusPill({ tone = "navy", icon: PillIcon, children }: { tone?: "navy" | "gold" | "ok" | "warn" | "risk" | "neutral"; icon?: Icon; children: ReactNode }) {
  const tones = {
    navy: "border-navy bg-navy text-white",
    gold: "border-gold bg-gold text-ink",
    ok: "border-ok bg-ok text-white",
    warn: "border-warn bg-warn text-white",
    risk: "border-risk bg-risk text-white",
    neutral: "border-gray-300 bg-gray-100 text-gray-700",
  } as const;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-bold tracking-wide uppercase shadow-sm", tones[tone])}>
      {PillIcon && <PillIcon className="size-3.5" />}
      {children}
    </span>
  );
}

/** A titled section inside a detail card, with a gold icon and an uppercase title. */
export function InfoSection({ title, icon: SectionIcon, first, action, children, className }: { title: ReactNode; icon?: Icon; first?: boolean; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn(first ? "" : "border-t border-gray-100 pt-5", className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-[13px] font-semibold tracking-wider text-gray-500 uppercase">
          {SectionIcon && <SectionIcon className="size-[18px] shrink-0 text-gold" />}
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

/** One fact: small uppercase label, then the value. Empty values show a dash. */
export function InfoRow({ label, icon: RowIcon, children, className, mono }: { label: ReactNode; icon?: Icon; children?: ReactNode; className?: string; mono?: boolean }) {
  const empty = children === null || children === undefined || children === "" || children === false;
  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex items-center gap-1.5 text-[11.5px] font-semibold tracking-wide text-gray-500 uppercase">
        {RowIcon && <RowIcon className="size-3.5 shrink-0 text-gray-400" />}
        {label}
      </div>
      <div className={cn("mt-1.5 text-[15px] leading-snug", empty ? "text-gray-400" : "font-semibold text-ink", mono && "font-mono")}>{empty ? "—" : children}</div>
    </div>
  );
}

/** Grid for InfoRows: two columns on small screens up, more on wide ones. */
export function InfoGrid({ children, columns = 2, className }: { children: ReactNode; columns?: 2 | 3 | 4; className?: string }) {
  return (
    <div className={cn("grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2", columns === 3 && "lg:grid-cols-3", columns === 4 && "lg:grid-cols-4", className)}>{children}</div>
  );
}
