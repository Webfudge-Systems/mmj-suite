"use client";

import { useState, type ComponentType, type ReactNode } from "react";
import { MmjMark } from "../components/MmjMark";
import { cn } from "../lib/cn";

export type NavItem = {
  href: string;
  label: string;
  /** Shown greyed out with a note, for screens planned in a later phase. */
  soon?: boolean;
};

type LinkProps = { href: string; className?: string; children: ReactNode; "aria-current"?: "page" };

type AppShellProps = {
  appName: string;
  nav: NavItem[];
  activeHref: string;
  /** Pass next/link here so navigation stays client-side. */
  LinkComponent?: ComponentType<LinkProps>;
  /** Right side of the top bar: rates, branch, user menu. */
  topBar?: ReactNode;
  /** Bottom of the sidebar: signed-in user and sign out. */
  footer?: ReactNode;
  children: ReactNode;
};

function DefaultLink({ href, className, children, ...rest }: LinkProps) {
  return (
    <a href={href} className={className} {...rest}>
      {children}
    </a>
  );
}

export function Wordmark({ appName }: { appName: string }) {
  return (
    <div className="flex items-center gap-3">
      <MmjMark className="h-10 w-auto shrink-0" />
      <span className="grid leading-tight">
        <span className="text-[14px] font-semibold text-paper">{appName}</span>
        <span className="text-[11px] text-paper/60">Mukund Maid Jewellers</span>
      </span>
    </div>
  );
}

export function AppShell({ appName, nav, activeHref, LinkComponent = DefaultLink, topBar, footer, children }: AppShellProps) {
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => (href === "/" ? activeHref === "/" : activeHref.startsWith(href));

  const sidebar = (
    <nav aria-label={`${appName} sections`} className="flex h-full flex-col gap-6 bg-navy-deep px-4 py-5">
      <Wordmark appName={appName} />
      <ul className="grid gap-0.5">
        {nav.map((item) =>
          item.soon ? (
            <li key={item.href}>
              <span className="flex items-center justify-between rounded-md px-3 py-2 text-[13.5px] text-paper/35">
                {item.label}
                <span className="text-[10px] tracking-wider uppercase">Soon</span>
              </span>
            </li>
          ) : (
            <li key={item.href}>
              <LinkComponent
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={cn(
                  "block rounded-md px-3 py-2 text-[13.5px] transition-colors",
                  isActive(item.href) ? "bg-paper/10 font-semibold text-paper" : "text-paper/75 hover:bg-paper/5 hover:text-paper",
                )}
              >
                {item.label}
              </LinkComponent>
            </li>
          ),
        )}
      </ul>
      {footer && <div className="mt-auto border-t border-paper/10 pt-4">{footer}</div>}
    </nav>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_minmax(0,1fr)] print:block">
      <aside className="sticky top-0 hidden h-dvh overflow-y-auto lg:block print:hidden">{sidebar}</aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <div className="relative h-full w-[260px] max-w-[85vw] overflow-y-auto" onClick={() => setOpen(false)}>
            {sidebar}
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex min-h-14 print:hidden flex-wrap items-center gap-3 border-b border-line bg-surface/95 px-4 py-2 backdrop-blur sm:px-6">
          <button
            type="button"
            className="rounded-md border border-line px-2.5 py-1.5 text-[13px] font-semibold lg:hidden"
            onClick={() => setOpen(true)}
            aria-expanded={open}
          >
            Menu
          </button>
          <div className="min-w-0 flex-1">{topBar}</div>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 print:max-w-none print:p-0">{children}</main>
      </div>
    </div>
  );
}
