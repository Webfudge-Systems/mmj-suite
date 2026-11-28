import { cn } from "@/lib/utils";
import { Shell } from "@/components/ui/Shell";

export type Tone = "cream" | "wine" | "ink" | "paper" | "mist" | "fog";

const tones: Record<Tone, string> = {
  cream: "bg-cream text-ink",
  wine: "bg-wine text-cream",
  ink: "bg-ink text-cream",
  paper: "bg-paper text-ink",
  mist: "bg-mist text-ink",
  fog: "bg-fog text-ink",
};

/**
 * A full-width section on one of the brand grounds: white and White Cap for
 * catalogue rows, the pale blue mist for soft panels, Deep Blue and Velvet
 * Black for statement bands.
 */
export function Panel({
  children,
  tone = "paper",
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
