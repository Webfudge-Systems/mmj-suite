import { cn } from "@/lib/utils";
import { Shell } from "@/components/ui/Shell";

export type Tone = "cream" | "wine" | "ink" | "paper";

const tones: Record<Tone, string> = {
  cream: "bg-cream text-ink",
  wine: "bg-wine text-cream",
  ink: "bg-ink text-cream",
  paper: "bg-paper text-ink",
};

/**
 * Sections alternate tone down the page the way the reference does: cream for
 * catalogue rows, wine and ink for the full-bleed statement bands.
 */
export function Panel({
  children,
  tone = "cream",
  className,
  bleed = false,
  id,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
  /** Skip the Shell so the content can run edge to edge. */
  bleed?: boolean;
  id?: string;
}) {
  return (
    <section id={id} className={cn(tones[tone], className)}>
      {bleed ? children : <Shell className="py-16 sm:py-20 lg:py-24">{children}</Shell>}
    </section>
  );
}
