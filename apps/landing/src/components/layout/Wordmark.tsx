import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { site } from "@/data/site";

/**
 * Horizontal brand lockup — full Primary Logo mark + Open Sauce wordmark,
 * as specified for website headers in the MMJ brand guidelines.
 */
export function Wordmark({
  className,
  tone = "dark",
  showTagline = true,
  size = "nav",
}: {
  className?: string;
  tone?: "dark" | "light";
  showTagline?: boolean;
  size?: "nav" | "footer";
}) {
  const mark = size === "nav" ? 52 : 44;

  return (
    <Link
      href="/"
      className={cn("group inline-flex items-center gap-3 leading-none", className)}
      aria-label={`${site.name} home`}
    >
      <Image
        src="/brand/Primary_Logo.png"
        alt=""
        width={mark}
        height={Math.round(mark * (1203 / 1405))}
        className={cn(
          "shrink-0 object-contain",
          size === "nav" ? "h-12 w-auto sm:h-14" : "h-10 w-auto",
        )}
        style={{ width: "auto" }}
        priority={size === "nav"}
      />
      <span className="flex flex-col items-start">
        <span
          className={cn(
            "wordmark",
            size === "nav" ? "text-[15px] sm:text-[17px]" : "text-[16px]",
            tone === "dark" ? "text-ink" : "text-cream",
          )}
        >
          {site.shortName}
        </span>
        {showTagline && (
          <span
            className={cn(
              "eyebrow mt-1.5 text-[7px] tracking-[0.18em] sm:text-[8px]",
              tone === "dark" ? "text-stone" : "text-cream/65",
            )}
          >
            Mukund Maid Jewellers
          </span>
        )}
      </span>
    </Link>
  );
}
