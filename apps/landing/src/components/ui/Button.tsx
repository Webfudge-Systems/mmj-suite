import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "solid" | "outline" | "light" | "gold" | "cream";

const variants: Record<Variant, string> = {
  solid: "bg-ink text-cream hover:bg-wine",
  outline: "border border-ink/25 text-ink hover:border-ink hover:bg-ink hover:text-cream",
  light: "border border-cream/40 text-cream hover:bg-cream hover:text-ink",
  gold: "bg-gold text-ink hover:bg-wine hover:text-cream",
  cream: "bg-cream text-wine hover:bg-gold hover:text-ink",
};

const base =
  "eyebrow inline-flex items-center justify-center gap-2 px-7 py-3.5 text-[12px] transition-colors duration-300 ease-[var(--ease-out-soft)]";

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

export function ButtonLink({
  children,
  href,
  variant = "solid",
  className,
}: {
  children: React.ReactNode;
  href: string;
  variant?: Variant;
  className?: string;
}) {
  return (
    <Link href={href} className={cn(base, variants[variant], className)}>
      {children}
    </Link>
  );
}

/** Quiet "view all" link that sits opposite every section label. */
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
        "eyebrow group inline-flex items-center gap-1.5 text-[11px] transition-opacity hover:opacity-60",
        tone === "dark" ? "text-ink" : "text-cream",
        className,
      )}
    >
      {children}
      <ArrowUpRight
        className="size-3.5 transition-transform duration-300 ease-[var(--ease-out-soft)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        aria-hidden
      />
    </Link>
  );
}
