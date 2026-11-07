import type { ReactNode } from "react";
import { MmjMark } from "../components/MmjMark";
import { ProductBranding } from "./AppShell";

type LoginLayoutProps = {
  appName: string;
  /** One line under "Welcome back". */
  tagline: string;
  /** A sentence or two of detail under the tagline. */
  detail?: string;
  /** Three short facts shown as tiles on the brand panel. */
  features?: { value: string; label: string }[];
  /** Heading above the form. */
  heading?: string;
  /** Line under the heading. */
  intro?: ReactNode;
  children: ReactNode;
  /** Small print under the form. */
  footer?: ReactNode;
};

/** Webfudge-style split sign-in screen: brand panel on the left, form on the right. */
export function LoginLayout({ appName, tagline, detail, features = [], heading = "Sign in", intro, children, footer }: LoginLayoutProps) {
  return (
    <div className="flex min-h-dvh bg-white">
      <div className="relative hidden flex-col justify-center overflow-hidden bg-gradient-to-br from-navy to-navy-deep px-16 py-20 lg:flex lg:w-1/2">
        <div className="pointer-events-none absolute -top-24 -right-24 size-96 rounded-full bg-gold/10 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-32 -left-20 size-96 rounded-full bg-white/5 blur-3xl" aria-hidden />
        <div className="absolute top-8 left-8 z-10 flex items-center gap-3">
          <MmjMark className="h-11 w-auto" />
          <span className="text-xl font-bold tracking-tight text-white">Mukund Maid Jewellers</span>
        </div>
        <div className="relative max-w-lg">
          <div className="mb-8">
            <p className="text-lg leading-tight font-bold text-gold">{appName}</p>
            <p className="mt-0.5 text-xs text-white/70">Mukund Maid Jewellers · Rahuri</p>
          </div>
          <h1 className="mb-6 text-5xl font-bold text-white">Welcome back</h1>
          <p className="mb-4 text-xl text-white/90">{tagline}</p>
          {detail && <p className="leading-relaxed text-white/75">{detail}</p>}
          {features.length > 0 && (
            <div className="mt-12 grid grid-cols-3 gap-6">
              {features.map((item) => (
                <div key={item.label} className="rounded-xl border border-white/10 bg-white/10 p-4 text-center">
                  <p className="text-sm font-semibold text-white">{item.value}</p>
                  <p className="mt-1 text-xs text-white/70">{item.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex w-full flex-col justify-center p-6 sm:p-8 lg:w-1/2 lg:p-16">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <MmjMark className="h-12 w-auto" />
            <ProductBranding appName={appName} />
          </div>
          <h2 className="mb-2 text-3xl font-semibold text-ink">{heading}</h2>
          {intro && <p className="mb-8 text-ash">{intro}</p>}
          {children}
          {footer && <p className="mt-6 text-center text-sm text-gray-500">{footer}</p>}
        </div>
      </div>
    </div>
  );
}
