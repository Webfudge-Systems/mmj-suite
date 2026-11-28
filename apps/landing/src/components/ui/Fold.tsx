import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Rounded expandable row, the product page's answer to a long scroll on a phone. */
export function Fold({
  title,
  children,
  defaultOpen = false,
  className,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  return (
    <details open={defaultOpen} className={cn("group rounded-2xl bg-fog", className)}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-2xl px-5 py-4 text-[14px] font-semibold text-ink [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown
          className="size-4 shrink-0 text-ash transition-transform duration-300 group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="px-5 pb-5">{children}</div>
    </details>
  );
}
