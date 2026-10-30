import { cn } from "@/lib/utils";
import type { Tone } from "@/components/ui/Panel";

/**
 * The reference heads every catalogue row with a small condensed label on the
 * left and a quiet link on the right.
 */
export function SectionHeading({
  label,
  action,
  tone = "cream",
  className,
}: {
  label: string;
  action?: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <div className={cn("flex items-end justify-between gap-6", className)}>
      <h2
        className={cn(
          "eyebrow text-[13px] sm:text-[15px]",
          tone === "cream" || tone === "paper" ? "text-ink" : "text-cream",
        )}
      >
        {label}
      </h2>
      {action}
    </div>
  );
}

/** Large statement heading used inside the wine and ink bands. */
export function Statement({
  children,
  className,
  as: Tag = "h2",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3";
}) {
  return (
    <Tag className={cn("text-[clamp(2rem,5vw,3.75rem)] leading-[0.92]", className)}>
      {children}
    </Tag>
  );
}
