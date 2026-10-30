import { Shell } from "@/components/ui/Shell";
import { ButtonLink } from "@/components/ui/Button";

export function EmptyState({
  title,
  body,
  primary,
  secondary,
}: {
  title: string;
  body: string;
  primary: { href: string; label: string };
  secondary?: { href: string; label: string };
}) {
  return (
    <Shell className="py-20 sm:py-28">
      <div className="mx-auto max-w-md text-center">
        <span className="mx-auto block size-3 rotate-45 bg-gold" aria-hidden />
        <h2 className="mt-8 text-[clamp(1.35rem,2.6vw,1.85rem)]">{title}</h2>
        <p className="mt-4 text-[13px] leading-relaxed text-ash">{body}</p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <ButtonLink href={primary.href}>{primary.label}</ButtonLink>
          {secondary && (
            <ButtonLink href={secondary.href} variant="outline">
              {secondary.label}
            </ButtonLink>
          )}
        </div>
      </div>
    </Shell>
  );
}
