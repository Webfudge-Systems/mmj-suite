import type { ComponentType, ReactNode } from "react";
import { cn } from "../lib/cn";
import { Card } from "./Card";

export type KpiTone = "navy" | "gold" | "ok" | "warn" | "risk";

const tones: Record<KpiTone, { box: string; icon: string; dot: string }> = {
  navy: { box: "bg-navy/[0.08]", icon: "text-navy", dot: "bg-navy" },
  gold: { box: "bg-gold/[0.14]", icon: "text-gold", dot: "bg-gold" },
  ok: { box: "bg-ok/[0.09]", icon: "text-ok", dot: "bg-ok" },
  warn: { box: "bg-warn/[0.09]", icon: "text-warn", dot: "bg-warn" },
  risk: { box: "bg-risk/[0.08]", icon: "text-risk", dot: "bg-risk" },
};

type KpiCardProps = {
  title: ReactNode;
  value: ReactNode;
  /** Small line under the value, with a coloured dot. */
  subtitle?: ReactNode;
  icon?: ComponentType<{ className?: string; strokeWidth?: number }>;
  tone?: KpiTone;
  /** A little shorter, for rows of five or six. */
  compact?: boolean;
  hoverable?: boolean;
  className?: string;
};

/** Shrinks long values (like ₹1,51,925) so they fit beside the corner icon instead of being cut off. */
function valueSize(value: ReactNode, compact?: boolean) {
  const length = typeof value === "string" || typeof value === "number" ? String(value).length : 0;
  if (length > 11) return "text-lg";
  if (length > 9) return "text-xl";
  if (length > 7) return "text-2xl";
  return compact ? "text-3xl" : "text-3xl sm:text-4xl";
}

/**
 * Webfudge-style KPI card: label and big number on the left, and a tinted panel
 * anchored to the bottom-right corner with an oversized icon cropped by the card's edge.
 */
export function KpiCard({ title, value, subtitle, icon: Icon, tone = "navy", compact, hoverable, className }: KpiCardProps) {
  const colors = tones[tone];
  return (
    <Card hoverable={hoverable} className={cn("relative h-full overflow-hidden", compact ? "min-h-[8.5rem] p-5" : "min-h-[10rem] p-6", className)}>
      {Icon && (
        <div
          aria-hidden
          className={cn("absolute right-0 bottom-0 rounded-tl-[1.75rem]", colors.box, compact ? "top-4 w-[31%] max-w-[7rem]" : "top-5 w-[34%] max-w-[8rem]")}
        >
          <Icon className={cn("absolute", colors.icon, compact ? "top-7 left-7 size-28" : "top-9 left-8 size-32")} strokeWidth={2.25} />
        </div>
      )}
      <div className={cn("relative min-w-0", Icon && "pr-[33%]")}>
        <p className="text-sm leading-snug font-medium text-gray-600">{title}</p>
        <p className={cn("mt-2 leading-tight font-bold whitespace-nowrap text-ink tabular-nums", valueSize(value, compact))}>{value}</p>
        {subtitle && (
          <p className="mt-2 flex items-start gap-1.5 text-[13px] leading-snug text-gray-500">
            <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", colors.dot)} aria-hidden />
            <span className="min-w-0">{subtitle}</span>
          </p>
        )}
      </div>
    </Card>
  );
}
