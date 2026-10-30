import { cn } from "@/lib/utils";

/** The single horizontal rhythm every section is measured against. */
export function Shell({
  children,
  className,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "section" | "header" | "footer" | "nav";
}) {
  return (
    <Tag className={cn("mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-[78px]", className)}>
      {children}
    </Tag>
  );
}
