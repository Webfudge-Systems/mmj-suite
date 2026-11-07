"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { MmjMark } from "../components/MmjMark";
import { cn } from "../lib/cn";

type IconType = ComponentType<{ className?: string; strokeWidth?: number }>;

export type NavItem = {
  /** Where the item goes. Leave out for a section that opens a sub-menu of `children`. */
  href?: string;
  label: string;
  icon?: IconType;
  /** Shown greyed out with a note, for screens planned in a later phase. */
  soon?: boolean;
  /** Items in the sub-menu this tile opens. */
  children?: NavItem[];
};

type LinkProps = { href: string; className?: string; children: ReactNode; "aria-current"?: "page"; onClick?: () => void; title?: string };

type AppShellProps = {
  appName: string;
  /** The tiles in the sidebar's Navigate grid. */
  nav: NavItem[];
  /** Wide buttons in the sidebar's System section, such as Settings. */
  system?: NavItem[];
  activeHref: string;
  /** Pass next/link here so navigation stays client-side. */
  LinkComponent?: ComponentType<LinkProps>;
  /** A panel in the sidebar under the tiles, such as today's rates. */
  widget?: ReactNode;
  /** Right side of every page header: branch, profile menu. */
  headerExtras?: ReactNode;
  children: ReactNode;
};

export type Crumb = { label: string; href?: string };

type ShellContextValue = {
  appName: string;
  crumbs: Crumb[];
  /** True on a page below a nav item, such as a single invoice. */
  nested: boolean;
  headerExtras?: ReactNode;
  LinkComponent: ComponentType<LinkProps>;
};

const ShellContext = createContext<ShellContextValue | null>(null);

/** The app shell's breadcrumb and header extras, for PageHeader. Null outside an AppShell. */
export function useShell() {
  return useContext(ShellContext);
}

function DefaultLink({ href, className, children, ...rest }: LinkProps) {
  return (
    <a href={href} className={className} {...rest}>
      {children}
    </a>
  );
}

const matches = (href: string, pathname: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));

/** The nav item the page belongs to (longest matching href) and the section holding it. */
function findActive(items: NavItem[], pathname: string) {
  let best: { item: NavItem; section?: NavItem } | null = null;
  const consider = (item: NavItem, section?: NavItem) => {
    if (item.href && !item.soon && matches(item.href, pathname) && (!best || item.href.length > (best.item.href?.length ?? 0))) {
      best = { item, section };
    }
  };
  for (const item of items) {
    consider(item);
    item.children?.forEach((child) => consider(child, item));
  }
  return best as { item: NavItem; section?: NavItem } | null;
}

/** Product name over the company line, as in Webfudge sidebars. */
export function ProductBranding({ appName, className }: { appName: string; className?: string }) {
  return (
    <span className={cn("grid min-w-0 leading-tight", className)}>
      <span className="truncate bg-gradient-to-r from-navy-deep via-navy to-[#3556a8] bg-clip-text text-xl font-bold tracking-tight text-transparent">
        {appName}
      </span>
      <span className="mt-0.5 truncate text-xs font-medium tracking-tight text-gray-500">Mukund Maid Jewellers</span>
    </span>
  );
}

/** The MMJ mark with the product name, for sidebars and slim top bars. */
export function Wordmark({ appName, className }: { appName: string; className?: string }) {
  return (
    <span className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <MmjMark className="h-11 w-auto shrink-0" />
      <ProductBranding appName={appName} />
    </span>
  );
}

function SectionRule({ label }: { label: string }) {
  return (
    <div className="mb-2.5 flex items-center gap-2 px-1">
      <div className="h-px flex-1 bg-gray-200" />
      <span className="text-[10px] font-semibold tracking-wider text-ash uppercase">{label}</span>
      <div className="h-px flex-1 bg-gray-200" />
    </div>
  );
}

/** A Webfudge-style sidebar panel: grey title bar over white content. */
export function SidebarPanel({ title, icon: Icon, action, children }: { title: ReactNode; icon?: IconType; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-300 bg-white shadow-md ring-1 ring-black/[0.04]">
      <div className="flex items-center justify-between gap-2 border-b border-gray-200 bg-gray-50 px-3 py-2.5 text-xs font-semibold text-ink">
        <span className="flex min-w-0 items-center gap-1.5">
          {Icon && <Icon className="size-3.5 shrink-0 text-gray-600" />}
          <span className="truncate">{title}</span>
        </span>
        {action}
      </div>
      {children}
    </div>
  );
}

const tileBase = "relative flex min-h-[4.5rem] flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-3.5 text-center transition-all duration-200";
const tileIdle = "border-gray-100 bg-white text-ink shadow-[var(--shadow-tile)] hover:border-navy-line hover:shadow-md";
const tileActive = "border-navy/40 bg-navy text-white shadow-[var(--shadow-tile-active)]";

export function AppShell({ appName, nav, system = [], activeHref, LinkComponent = DefaultLink, widget, headerExtras, children }: AppShellProps) {
  const [hidden, setHidden] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [section, setSection] = useState<NavItem | null>(null);

  const active = useMemo(() => findActive([...nav, ...system], activeHref), [nav, system, activeHref]);

  useEffect(() => {
    if (!section && !drawer) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setSection(null);
      setDrawer(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [section, drawer]);

  const shell = useMemo<ShellContextValue>(() => {
    const crumbs: Crumb[] = [{ label: appName, href: "/" }];
    if (active?.section) crumbs.push({ label: active.section.label });
    if (active && active.item.href !== "/") crumbs.push({ label: active.item.label, href: active.item.href });
    if (active?.item.href === "/") crumbs.push({ label: active.item.label, href: "/" });
    return {
      appName,
      crumbs,
      nested: Boolean(active?.item.href && activeHref !== active.item.href),
      headerExtras,
      LinkComponent,
    };
  }, [appName, active, activeHref, headerExtras, LinkComponent]);

  const isTileActive = (item: NavItem) =>
    item.children ? Boolean(active?.section && active.section.label === item.label) : Boolean(item.href && active?.item === item);

  const closeAll = () => {
    setDrawer(false);
    setSection(null);
  };

  const renderTile = (item: NavItem, wide = false) => {
    const Icon = item.icon;
    const on = isTileActive(item);
    const className = cn(tileBase, on ? tileActive : tileIdle, wide && "min-h-0 flex-row gap-2 py-3", item.soon && "cursor-not-allowed opacity-50 hover:border-gray-100 hover:shadow-[var(--shadow-tile)]");
    const content = (
      <>
        {Icon && <Icon className={wide ? "size-5 shrink-0" : "size-6 shrink-0"} strokeWidth={2} />}
        <span className={cn("line-clamp-2 px-0.5 leading-snug font-semibold", wide ? "text-sm" : "text-xs")}>{item.label}</span>
        {item.soon && <span className="text-[9px] font-semibold tracking-wider uppercase">Soon</span>}
      </>
    );
    if (item.soon) {
      return (
        <span key={item.label} className={className} aria-disabled>
          {content}
        </span>
      );
    }
    if (item.children) {
      return (
        <button key={item.label} type="button" className={className} aria-expanded={section?.label === item.label} onClick={() => setSection(item)}>
          {content}
          <ChevronRight className="absolute top-2 right-2 size-3.5 opacity-50" aria-hidden />
        </button>
      );
    }
    return (
      <LinkComponent key={item.label} href={item.href ?? "/"} className={className} aria-current={on ? "page" : undefined} onClick={closeAll}>
        {content}
      </LinkComponent>
    );
  };

  const sidebar = (mobile: boolean) => (
    <nav aria-label={`${appName} sections`} className="flex h-full w-64 flex-col overflow-hidden border-r border-gray-100 bg-white shadow-xl">
      <div className="shrink-0 px-4 pt-4 pb-3">
        <div className="flex items-center justify-between gap-2">
          <LinkComponent href="/" className="min-w-0 flex-1" onClick={closeAll}>
            <Wordmark appName={appName} />
          </LinkComponent>
          <button
            type="button"
            onClick={() => (mobile ? setDrawer(false) : setHidden(true))}
            className="shrink-0 rounded-lg p-2 text-ink transition-colors hover:bg-gray-50"
            aria-label={mobile ? "Close menu" : "Hide sidebar"}
          >
            {mobile ? <X className="size-5" strokeWidth={1.75} /> : <PanelLeftClose className="size-5" strokeWidth={1.75} />}
          </button>
        </div>
        <div className="mt-3 h-px w-full bg-gradient-to-r from-transparent via-gold/70 to-transparent" aria-hidden />
      </div>

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
        <div className="px-3 pt-2 pb-2">
          <SectionRule label="Navigate" />
          <div className="grid grid-cols-2 gap-2.5">{nav.map((item) => renderTile(item))}</div>
        </div>

        {widget && <div className="px-3 py-2">{widget}</div>}

        {system.length > 0 && (
          <div className="grid gap-2 px-3 pt-2 pb-4">
            <SectionRule label="System" />
            {system.map((item) => renderTile(item, true))}
          </div>
        )}
      </div>
    </nav>
  );

  const topBar = (
    <div className="flex shrink-0 items-center gap-1 border-b border-gray-100 bg-white px-3 py-2 print:hidden">
      <button
        type="button"
        onClick={() => (window.matchMedia("(min-width: 1024px)").matches ? setHidden(false) : setDrawer(true))}
        className="rounded-lg p-2 text-ink transition-colors hover:bg-gray-50"
        aria-label="Open menu"
      >
        <PanelLeftOpen className="size-5" strokeWidth={1.75} />
      </button>
      <LinkComponent href="/" className="ml-1 min-w-0">
        <span className="flex items-center gap-2">
          <MmjMark className="h-8 w-auto shrink-0" />
          <span className="truncate text-sm font-bold text-navy">{appName}</span>
        </span>
      </LinkComponent>
    </div>
  );

  return (
    <ShellContext.Provider value={shell}>
      <div className="flex h-dvh flex-col overflow-hidden bg-white print:block print:h-auto print:overflow-visible">
        <div className={cn(!hidden && "lg:hidden")}>{topBar}</div>
        <div className="flex min-h-0 flex-1 overflow-hidden print:block print:overflow-visible">
          {!hidden && <aside className="z-20 hidden shrink-0 lg:block print:hidden">{sidebar(false)}</aside>}
          <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-white print:overflow-visible">
            <div className="p-4 md:p-6 print:p-0">{children}</div>
          </main>
        </div>

        {drawer && (
          <div className="fixed inset-0 z-40 lg:hidden print:hidden">
            <button type="button" aria-label="Close menu" className="absolute inset-0 bg-black/40" onClick={() => setDrawer(false)} />
            <div className="relative h-full w-64 max-w-[85vw]">{sidebar(true)}</div>
          </div>
        )}

        {section && (
          <div className="fixed inset-0 z-50 print:hidden">
            <button type="button" aria-label="Close sub-menu" className="absolute inset-0 bg-black/25" onClick={() => setSection(null)} />
            <div
              role="dialog"
              aria-label={section.label}
              className="absolute top-4 right-4 bottom-4 flex w-80 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 p-4">
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setSection(null)} className="rounded-lg p-1 transition-colors hover:bg-gray-200" aria-label="Back">
                    <ChevronLeft className="size-5 text-gray-600" />
                  </button>
                  <div>
                    <h2 className="text-lg font-semibold text-ink">{section.label}</h2>
                    <p className="text-sm text-ash">Navigation</p>
                  </div>
                </div>
                <button type="button" onClick={() => setSection(null)} className="rounded-lg p-2 transition-colors hover:bg-gray-200" aria-label="Close">
                  <X className="size-5 text-gray-600" />
                </button>
              </div>
              <div className="grid content-start gap-2 overflow-y-auto p-4">
                {section.children?.map((child) => {
                  const Icon = child.icon;
                  const on = active?.item === child;
                  if (child.soon || !child.href) {
                    return (
                      <span key={child.label} className="flex items-center gap-3 rounded-lg p-3 text-gray-400" aria-disabled>
                        {Icon && <Icon className="size-4" />}
                        <span className="flex-1 text-sm font-medium">{child.label}</span>
                        <span className="text-[10px] font-semibold tracking-wider uppercase">Soon</span>
                      </span>
                    );
                  }
                  return (
                    <LinkComponent
                      key={child.label}
                      href={child.href}
                      onClick={closeAll}
                      aria-current={on ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border p-3 transition-colors duration-150",
                        on ? "border-navy-line bg-navy-soft text-navy" : "border-transparent text-gray-700 hover:bg-gray-50 hover:text-ink",
                      )}
                    >
                      {Icon && <Icon className="size-4" />}
                      <span className="text-sm font-medium">{child.label}</span>
                    </LinkComponent>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </ShellContext.Provider>
  );
}
