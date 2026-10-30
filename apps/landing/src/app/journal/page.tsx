import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Shell } from "@/components/ui/Shell";
import { Reveal } from "@/components/ui/Reveal";
import { journalPosts } from "@/data/journal";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Journal",
  description:
    "Notes from the MMJ workshop: how to read an estimate, what hallmarking proves, and why bangles are sold in pairs.",
};

export default function JournalPage() {
  const [featured, ...rest] = journalPosts;

  return (
    <>
      <PageHeader
        title="Notes from the workshop"
        lead="How an estimate is built, what a HUID actually proves, and the slow work that happens one floor above the showroom."
        trail={[{ label: "Home", href: "/" }, { label: "Journal" }]}
      />

      <Shell className="py-12 sm:py-16">
        {featured && (
          <Reveal>
            <Link
              href={`/journal/${featured.slug}`}
              className="group grid overflow-hidden border border-line bg-paper lg:grid-cols-2"
            >
              <div className="relative aspect-[16/10] lg:aspect-auto lg:min-h-[420px]">
                <Image
                  src={featured.image}
                  alt={featured.title}
                  fill
                  priority
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="object-cover transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.03]"
                />
              </div>
              <div className="flex flex-col justify-center p-7 sm:p-10">
                <p className="eyebrow text-[9px] text-stone">
                  {featured.category} &middot; {featured.readingTime} &middot;{" "}
                  {formatDate(featured.publishedOn)}
                </p>
                <h2 className="mt-5 text-[clamp(1.5rem,3vw,2.25rem)] normal-case tracking-normal">
                  {featured.title}
                </h2>
                <p className="mt-4 max-w-md text-[14px] leading-relaxed text-ash">
                  {featured.excerpt}
                </p>
                <span className="eyebrow mt-8 text-[9px] text-ink">Read</span>
              </div>
            </Link>
          </Reveal>
        )}

        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((post, index) => (
            <Reveal key={post.slug} delay={Math.min(index, 3) * 0.06}>
              <li>
                <Link href={`/journal/${post.slug}`} className="group block h-full border border-line bg-paper">
                  <div className="relative aspect-[16/10] overflow-hidden bg-cream-deep">
                    <Image
                      src={post.image}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.03]"
                    />
                  </div>
                  <div className="p-6">
                    <p className="eyebrow text-[8px] text-stone">
                      {post.category} &middot; {post.readingTime}
                    </p>
                    <h2 className="mt-3 text-[16px] normal-case tracking-normal leading-snug">
                      {post.title}
                    </h2>
                    <p className="mt-3 text-[13px] leading-relaxed text-ash">{post.excerpt}</p>
                    <p className="eyebrow mt-5 text-[8px] text-stone">{formatDate(post.publishedOn)}</p>
                  </div>
                </Link>
              </li>
            </Reveal>
          ))}
        </ul>
      </Shell>
    </>
  );
}
