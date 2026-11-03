import type { ReactNode } from "react";
import { cn } from "../lib/cn";

type PageHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <header className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="grid min-w-0 gap-1">
        <h1 className="text-2xl font-semibold text-balance text-navy">{title}</h1>
        {description && <p className="max-w-2xl text-sm text-ash">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
