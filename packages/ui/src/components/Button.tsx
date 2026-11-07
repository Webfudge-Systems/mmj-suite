import type { ButtonHTMLAttributes } from "react";
import { cn } from "../lib/cn";
import { Spinner } from "./Spinner";

export type ButtonVariant = "primary" | "gold" | "secondary" | "outline" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-navy text-white shadow-md hover:bg-navy-deep",
  gold: "bg-gold text-ink shadow-md hover:brightness-95",
  secondary: "border border-gray-300 bg-surface text-ink shadow-sm hover:border-gray-400 hover:bg-gray-50",
  outline: "border border-navy bg-surface text-navy hover:bg-navy-soft",
  ghost: "text-navy hover:bg-navy-soft",
  danger: "bg-risk text-white shadow-md hover:brightness-95",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-[15px]",
};

/** Class names for a button, for links that should look like one. */
export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-lg font-semibold whitespace-nowrap transition-colors duration-200",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2",
    "disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
    variants[variant],
    sizes[size],
    className,
  );
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
};

export function Button({ variant = "primary", size = "md", loading, disabled, className, children, type, ...props }: ButtonProps) {
  return (
    <button
      type={type ?? "button"}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClass(variant, size, className)}
      {...props}
    >
      {loading && <Spinner className="size-4" />}
      {children}
    </button>
  );
}

/** Round icon-only action button, as in Webfudge toolbars. Give it an aria-label. */
export function IconButton({ className, type, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type ?? "button"}
      className={cn(
        "inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-gray-300 bg-surface text-ink shadow-md transition-colors",
        "hover:border-gray-400 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
