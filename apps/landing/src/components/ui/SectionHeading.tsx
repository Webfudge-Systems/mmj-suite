import { cn } from "@/lib/utils";
import type { Tone } from "@/components/ui/Panel";

/**
 * Section title in the  display serif, an optional one-line lead under
 * it, and an action (link or carousel arrows) on the right.
 */
export function SectionHeading({
  label,
  lead,
  action,
  tone = "cream",
  align = "left",
  className,
}: {
  label: string;
  lead?: string;
  action?: React.ReactNode;
  tone?: Tone;
  align?: "left" | "center";
  className?: string;
}) {
  const dark = tone === "wine" || tone === "ink";

  if (align === "center") {
    return (
      <div className={cn("text-center", className)}>
        <h2
          className={cn(
            "text-[clamp(1.9rem,3.4vw,2.6rem)]",
            dark ? "text-cream" : "text-ink",
          )}
        >
          {label}
        </h2>
        {lead && (
          <p className={cn("mx-auto mt-3 max-w-lg text-[14px] leading-relaxed", dark ? "text-cream/70" : "text-ash")}>
            {lead}
          </p>
        )}
        {action && <div className="mt-5 flex justify-center">{action}</div>}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-6", className)}>
      <div>
        <h2
          className={cn(
            "text-[clamp(1.9rem,3.4vw,2.6rem)]",
            dark ? "text-cream" : "text-ink",
          )}
        >
          {label}
        </h2>
        {lead && (
          <p className={cn("mt-2 max-w-xl text-[14px] leading-relaxed", dark ? "text-cream/70" : "text-ash")}>
            {lead}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

/** Large statement heading for page headers and bands. */
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
    <Tag className={cn("text-[clamp(2.4rem,5.4vw,4rem)] leading-[1.02]", className)}>
      {children}
    </Tag>
  );
}
