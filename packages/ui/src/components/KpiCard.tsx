import type { ComponentType, ReactNode } from "react";
import { cn } from "../lib/cn";
import { Card } from "./Card";

export type KpiTone = "navy" | "gold" | "ok" | "warn" | "risk";

const tones: Record<KpiTone, { box: string; icon: string; dot: string }> = {
  navy: { box: "bg-navy/10", icon: "text-navy", dot: "bg-navy" },
  gold: { box: "bg-gold/15", icon: "text-gold", dot: "bg-gold" },
  ok: { box: "bg-ok/10", icon: "text-ok", dot: "bg-ok" },
  warn: { box: "bg-warn/10", icon: "text-warn", dot: "bg-warn" },
  risk: { box: "bg-risk/10", icon: "text-risk", dot: "bg-risk" },
};

type KpiCardProps = {
  title: ReactNode;
  value: ReactNode;
  /** Small line under the value, with a coloured dot. */
  subtitle?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  tone?: KpiTone;
  /** Less padding and a smaller corner icon, for rows of five or six. */
  compact?: boolean;
  hoverable?: boolean;
  className?: string;
};

/** Webfudge-style KPI card: label, big number, and an oversized corner icon. */
export function KpiCard({ title, value, subtitle, icon: Icon, tone = "navy", compact, hoverable, className }: KpiCardProps) {
  const colors = tones[tone];
  return (
    <Card hoverable={hoverable} className={cn("flex h-full items-start justify-between overflow-hidden", compact ? "pt-4 pl-5" : "pt-6 pl-6", className)}>
      <div className={cn("min-w-0 flex-1 pr-2", compact ? "pb-4" : "pb-6")}>
        <p className="mb-2 text-sm font-medium text-gray-600">{title}</p>
        <p className={cn("truncate font-bold text-ink tabular-nums", compact ? "text-3xl" : "text-3xl sm:text-4xl")}>{value}</p>
        {subtitle && (
          <p className="mt-2 flex items-center gap-1.5 text-[13px] text-gray-500">
            <span className={cn("size-2 shrink-0 rounded-full", colors.dot)} aria-hidden />
            <span className="truncate">{subtitle}</span>
          </p>
        )}
      </div>
      {Icon && (
        <div className={cn("relative shrink-0 self-start overflow-hidden rounded-2xl rounded-tr-none rounded-bl-none", colors.box, compact ? "size-20" : "size-28")}>
          <Icon className={cn("absolute", colors.icon, compact ? "-right-4 -bottom-4 size-20" : "-right-6 -bottom-6 size-28")} />
        </div>
      )}
    </Card>
  );
}
