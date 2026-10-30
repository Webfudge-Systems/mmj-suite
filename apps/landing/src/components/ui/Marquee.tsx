import { cn } from "@/lib/utils";

/**
 * Oversized wordmark band that opens the reference page, letters running past
 * both edges. Pure CSS so it stays a server component.
 */
export function Wordmark({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden", className)} aria-hidden>
      <span className="block whitespace-nowrap text-center font-display text-[18vw] leading-[0.8] tracking-[-0.02em] text-cream/10">
        {text}
      </span>
    </div>
  );
}
