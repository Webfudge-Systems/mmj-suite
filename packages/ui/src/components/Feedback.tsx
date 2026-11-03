import type { ReactNode } from "react";
import { cn } from "../lib/cn";

export type Tone = "neutral" | "navy" | "gold" | "ok" | "warn" | "risk";

const badgeTones: Record<Tone, string> = {
  neutral: "bg-sunk text-ash",
  navy: "bg-navy-soft text-navy",
  gold: "bg-gold-soft text-gold-deep",
  ok: "bg-ok-soft text-ok",
  warn: "bg-warn-soft text-warn",
  risk: "bg-risk-soft text-risk",
};

export function Badge({ tone = "neutral", className, children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap",
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const alertTones: Record<Exclude<Tone, "neutral" | "navy" | "gold">, string> = {
  ok: "border-ok/30 bg-ok-soft text-ok",
  warn: "border-warn/30 bg-warn-soft text-warn",
  risk: "border-risk/30 bg-risk-soft text-risk",
};

type AlertProps = {
  tone?: keyof typeof alertTones;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export function Alert({ tone = "warn", title, children, className }: AlertProps) {
  return (
    <div role={tone === "risk" ? "alert" : "status"} className={cn("grid gap-1 rounded-[var(--radius-control)] border px-4 py-3 text-[13px]", alertTones[tone], className)}>
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className="text-ink/80">{children}</div>}
    </div>
  );
}

type EmptyStateProps = {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("grid justify-items-center gap-2 px-6 py-10 text-center", className)}>
      <p className="text-[15px] font-semibold text-ink">{title}</p>
      {description && <p className="max-w-sm text-[13px] text-ash">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
