import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function Stars({
  rating,
  className,
  size = 14,
}: {
  rating: number;
  className?: string;
  size?: number;
}) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-label={`${rating} out of 5`}>
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          width={size}
          height={size}
          className={index < Math.round(rating) ? "fill-gold text-gold" : "fill-none text-stone/50"}
          aria-hidden
        />
      ))}
    </span>
  );
}
