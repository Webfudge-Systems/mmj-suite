import { Shell } from "@/components/ui/Shell";
import { Statement } from "@/components/ui/SectionHeading";
import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <Shell className="flex min-h-[60vh] flex-col justify-center py-20">
      <p className="eyebrow text-[9px] text-stone">404</p>
      <Statement as="h1" className="mt-5 max-w-xl">
        That piece is not in the case
      </Statement>
      <p className="mt-5 max-w-md text-[14px] leading-relaxed text-ash">
        The page has moved, or the design was never listed. The shop floor is still this way.
      </p>
      <div className="mt-9 flex flex-wrap gap-3">
        <ButtonLink href="/shop">Browse the shop</ButtonLink>
        <ButtonLink href="/" variant="outline">
          Back home
        </ButtonLink>
      </div>
    </Shell>
  );
}
