import type { ComponentType, ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { cn } from "../lib/cn";

export type Tone = "neutral" | "navy" | "gold" | "ok" | "warn" | "risk";

const badgeTones: Record<Tone, string> = {
  neutral: "border-gray-200 bg-gray-50 text-gray-700",
  navy: "border-navy-line bg-navy-soft text-navy",
  gold: "border-gold-line bg-gold-soft text-gold-deep",
  ok: "border-ok-line bg-ok-soft text-ok",
  warn: "border-warn-line bg-warn-soft text-warn",
  risk: "border-risk-line bg-risk-soft text-risk",
};

export function Badge({ tone = "neutral", dot, className, children }: { tone?: Tone; dot?: boolean; className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-0.5 text-[11.5px] font-semibold tracking-wide whitespace-nowrap",
        badgeTones[tone],
        className,
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}

type AlertTone = Exclude<Tone, "neutral" | "gold">;

const alertTones: Record<AlertTone, { box: string; icon: ComponentType<{ className?: string }> }> = {
  ok: { box: "border-ok-line bg-ok-soft text-ok", icon: CheckCircle2 },
  warn: { box: "border-warn-line bg-warn-soft text-warn", icon: AlertCircle },
  risk: { box: "border-risk-line bg-risk-soft text-risk", icon: AlertCircle },
  navy: { box: "border-navy-line bg-navy-soft text-navy", icon: Info },
};

type AlertProps = {
  tone?: AlertTone;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export function Alert({ tone = "warn", title, children, className }: AlertProps) {
  const { box, icon: Icon } = alertTones[tone];
  return (
    <div role={tone === "risk" ? "alert" : "status"} className={cn("flex items-start gap-3 rounded-xl border px-4 py-3 text-[13px]", box, className)}>
      <Icon className="mt-0.5 size-[18px] shrink-0" aria-hidden />
      <div className="grid min-w-0 gap-0.5">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="text-ink/80">{children}</div>}
      </div>
    </div>
  );
}

type EmptyStateProps = {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  className?: string;
};

export function EmptyState({ title, description, action, icon: Icon, className }: EmptyStateProps) {
  return (
    <div className={cn("grid justify-items-center gap-1.5 px-6 py-12 text-center", className)}>
      {Icon && (
        <span className="mb-3 grid size-14 place-items-center rounded-2xl bg-navy-soft text-navy">
          <Icon className="size-7" aria-hidden />
        </span>
      )}
      <p className="text-base font-semibold text-ink">{title}</p>
      {description && <p className="max-w-md text-sm leading-relaxed text-ash">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/**
 * Says why a button is still off: one short line per thing left to do. Render
 * it next to a disabled submit button so nobody is left guessing.
 */
export function MissingHints({ items, className }: { items: (string | false | null | undefined)[]; className?: string }) {
  const left = items.filter(Boolean) as string[];
  if (!left.length) return null;
  return (
    <ul className={cn("grid gap-1 text-[12.5px] text-warn", className)} aria-live="polite">
      {left.map((item) => (
        <li key={item} className="flex items-start gap-2">
          <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-warn" aria-hidden />
          {item}
        </li>
      ))}
    </ul>
  );
}
