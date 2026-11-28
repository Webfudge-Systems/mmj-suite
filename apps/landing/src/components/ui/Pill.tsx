import Link from "next/link";
import { cn } from "@/lib/utils";

const base =
  "inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-[12px] transition-colors duration-200";

export function Pill({
  children,
  active,
  onClick,
  className,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        base,
        active
          ? "border-wine bg-wine text-cream"
          : "border-line bg-paper text-ash hover:border-wine hover:text-wine",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function PillLink({
  children,
  href,
  active,
  className,
}: {
  children: React.ReactNode;
  href: string;
  active?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        base,
        active
          ? "border-wine bg-wine text-cream"
          : "border-line bg-paper text-ash hover:border-wine hover:text-wine",
        className,
      )}
    >
      {children}
    </Link>
  );
}
