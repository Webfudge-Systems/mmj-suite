import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../lib/cn";

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  /** "elevated" (default) is the soft-shadow panel; "glass" is the frosted header style; "outlined" is flat. */
  variant?: "elevated" | "glass" | "outlined";
  /** Adds the hover lift used by clickable cards. */
  hoverable?: boolean;
};

const variants = {
  elevated: "border border-gray-100 bg-surface shadow-[var(--shadow-card)]",
  glass: "border border-white/40 bg-white/95 shadow-lg backdrop-blur-xl",
  outlined: "border border-line bg-surface",
};

export function Card({ className, variant = "elevated", hoverable, ...props }: CardProps) {
  return (
    <div
      // min-w-0 lets wide tables scroll inside the card instead of widening the page.
      className={cn(
        "min-w-0 rounded-xl transition-shadow duration-300",
        variants[variant],
        hoverable && "cursor-pointer hover:shadow-[var(--shadow-card-hover)]",
        className,
      )}
      {...props}
    />
  );
}

type CardHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function CardHeader({ title, description, action, className }: CardHeaderProps) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 px-6 py-5", className)}>
      <div className="grid min-w-0 gap-1">
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        {description && <p className="text-sm text-ash">{description}</p>}
      </div>
      {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-6 py-5", className)} {...props} />;
}
