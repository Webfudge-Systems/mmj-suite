"use client";

import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown, ChevronRight, LogOut } from "lucide-react";
import { Card } from "../components/Card";
import { cn } from "../lib/cn";
import { useShell, type Crumb } from "./AppShell";

type PageHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** Replaces the breadcrumb worked out from the sidebar. */
  breadcrumb?: Crumb[];
  /** Shows a Back control. Defaults to on for pages below a sidebar item. */
  showBack?: boolean;
  className?: string;
};

/** Webfudge-style page header: breadcrumb, large title, actions, then branch and profile. */
export function PageHeader({ title, description, actions, breadcrumb, showBack, className }: PageHeaderProps) {
  const shell = useShell();
  const router = useRouter();
  const crumbs = breadcrumb ?? shell?.crumbs ?? [];
  const Link = shell?.LinkComponent;
  const back = showBack ?? shell?.nested ?? false;

  return (
    <Card variant="glass" className={cn("relative z-20 p-5 sm:p-6 print:hidden", className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
        <div className="min-w-0 flex-1">
          {back && (
            <button
              type="button"
              onClick={() => router.back()}
              className="mb-2 inline-flex items-center gap-1.5 rounded-lg py-1 pr-2 text-sm font-medium text-ash transition-colors hover:text-navy"
            >
              <ArrowLeft className="size-4" aria-hidden />
              Back
            </button>
          )}
          {crumbs.length > 0 && (
            <nav aria-label="Breadcrumb" className="mb-2 flex flex-wrap items-center gap-2 text-sm text-ash">
              {crumbs.map((crumb, index) => {
                const last = index === crumbs.length - 1;
                return (
                  <Fragment key={`${crumb.label}-${index}`}>
                    {last || !crumb.href ? (
                      <span className={last ? "font-medium text-ink" : undefined}>{crumb.label}</span>
                    ) : Link ? (
                      <Link href={crumb.href} className="transition-colors hover:text-ink">
                        {crumb.label}
                      </Link>
                    ) : (
                      <a href={crumb.href} className="transition-colors hover:text-ink">
                        {crumb.label}
                      </a>
                    )}
                    {!last && <ChevronRight className="size-4" aria-hidden />}
                  </Fragment>
                );
              })}
            </nav>
          )}
          <h1 className="text-2xl leading-snug font-normal tracking-tight text-balance text-ink sm:text-4xl">{title}</h1>
          {description && <p className="mt-1 max-w-3xl leading-relaxed text-ash">{description}</p>}
        </div>

        {(actions || shell?.headerExtras) && (
          <div className="flex flex-wrap items-center gap-3">
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
            {shell?.headerExtras && (
              <div className={cn("flex items-center gap-3", Boolean(actions) && "sm:border-l sm:border-gray-200/70 sm:pl-3")}>{shell.headerExtras}</div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
}

/** Avatar with the signed-in person's name and role, opening a menu with Sign out. */
export function ProfileMenu({ name, role, detail, onSignOut }: { name: string; role?: string; detail?: string; onSignOut: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  const avatar = (size: string) => (
    <span className={cn("grid shrink-0 place-items-center rounded-full border-2 border-white bg-gradient-to-br from-navy to-navy-deep font-bold text-gold shadow-lg", size)}>
      {initials(name)}
    </span>
  );

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2.5 rounded-xl p-1 pr-2 transition-colors hover:bg-gray-50"
      >
        {avatar("size-10 text-sm")}
        <span className="hidden text-left leading-tight xl:grid">
          <span className="max-w-40 truncate text-sm font-semibold text-ink">{name}</span>
          {role && <span className="text-xs text-ash">{role}</span>}
        </span>
        <ChevronDown className={cn("size-4 text-ash transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <div role="menu" className="absolute top-full right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-gray-100 bg-white p-2 shadow-xl">
          <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
            {avatar("size-11 text-sm")}
            <span className="grid min-w-0 leading-tight">
              <span className="truncate text-sm font-semibold text-ink">{name}</span>
              {role && <span className="text-xs text-ash">{role}</span>}
              {detail && <span className="truncate text-xs text-ash">{detail}</span>}
            </span>
          </div>
          <div className="my-2 h-px bg-gray-100" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-risk transition-colors hover:bg-risk-soft"
          >
            <LogOut className="size-[18px]" aria-hidden />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
