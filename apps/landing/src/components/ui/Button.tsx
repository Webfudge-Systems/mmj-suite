import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "solid" | "ink" | "outline" | "light" | "gold" | "cream" | "pill" | "pill-light";

const variants: Record<Variant, string> = {
  solid: "bg-wine text-cream hover:bg-wine-deep",
  ink: "bg-ink text-cream hover:bg-wine",
  outline: "border border-ink text-ink hover:bg-ink hover:text-cream",
  light: "border border-cream/60 text-cream hover:bg-cream hover:text-wine",
  gold: "bg-gold text-ink hover:bg-gold-soft",
  cream: "bg-cream text-wine hover:bg-gold hover:text-ink",
  pill: "rounded-full bg-wine text-cream hover:bg-wine-deep",
  "pill-light": "rounded-full bg-paper text-ink shadow-sm hover:bg-gold",
};

const base =
  "group inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-[13px] font-medium tracking-[0.02em] transition-colors duration-300 ease-[var(--ease-out-soft)]";

function Arrow() {
  return (
    <ArrowUpRight
      className="size-4 transition-transform duration-300 ease-[var(--ease-out-soft)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
      strokeWidth={1.6}
      aria-hidden
    />
  );
}

export function Button({
  children,
  variant = "solid",
  className,
  type = "button",
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(base, variants[variant], disabled && "cursor-not-allowed opacity-50", className)}
    >
      {children}
    </button>
  );
}

/** `arrow` leads the label with the ↗ glyph, as the reference's boxed CTAs do. */
export function ButtonLink({
  children,
  href,
  variant = "solid",
  arrow = false,
  className,
}: {
  children: React.ReactNode;
  href: string;
  variant?: Variant;
  arrow?: boolean;
  className?: string;
}) {
  return (
    <Link href={href} className={cn(base, variants[variant], className)}>
      {arrow && <Arrow />}
      {children}
    </Link>
  );
}

/**
 * Quiet text link with the ↗ glyph and a brand-blue underline, the reference's
 * "Shop collection" / "Book now" treatment.
 */
export function ArrowCta({
  children,
  href,
  tone = "dark",
  className,
}: {
  children: React.ReactNode;
  href: string;
  tone?: "dark" | "light";
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex items-center gap-1.5 border-b-2 pb-1.5 text-[13px] font-medium transition-colors",
        tone === "dark"
          ? "border-wine/70 text-ink hover:border-wine hover:text-wine"
          : "border-gold text-cream hover:text-gold",
        className,
      )}
    >
      <Arrow />
      {children}
    </Link>
  );
}
