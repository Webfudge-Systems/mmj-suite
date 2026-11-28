import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { site } from "@/data/site";

/**
 * Horizontal brand lockup: the logo mark beside the Open Sauce wordmark, as
 * the MMJ brand guidelines specify for website headers. On dark grounds the
 * transparent gold mark replaces the blue-tile Primary Logo.
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
  const light = tone === "light";

  return (
    <Link
      href="/"
      className={cn("group inline-flex items-center gap-3 leading-none", className)}
      aria-label={`${site.name} home`}
    >
      {light ? (
        <Image
          src="/brand/LOGO.png"
          alt=""
          width={811}
          height={843}
          className="h-11 w-auto shrink-0 object-contain"
          style={{ width: "auto" }}
        />
      ) : (
        <Image
          src="/brand/Primary_Logo.png"
          alt=""
          width={52}
          height={Math.round(52 * (1203 / 1405))}
          className={cn(
            "shrink-0 object-contain",
            size === "nav" ? "h-10 w-auto sm:h-12" : "h-10 w-auto",
          )}
          style={{ width: "auto" }}
          priority={size === "nav"}
        />
      )}
      <span className="flex flex-col items-start">
        <span
          className={cn(
            "wordmark",
            size === "nav" ? "text-[15px] sm:text-[17px]" : "text-[18px]",
            light ? "text-gold" : "text-ink",
          )}
        >
          {site.shortName}
        </span>
        {showTagline && (
          <span
            className={cn(
              "eyebrow mt-1.5 text-[7px] tracking-[0.18em] sm:text-[8px]",
              light ? "text-cream/60" : "text-stone",
            )}
          >
            Mukund Maid Jewellers
          </span>
        )}
      </span>
    </Link>
  );
}
