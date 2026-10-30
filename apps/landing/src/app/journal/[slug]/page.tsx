import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Shell } from "@/components/ui/Shell";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Prose } from "@/components/ui/Prose";
import { ArrowCta } from "@/components/ui/Button";
import { getJournalPost, journalPosts } from "@/data/journal";
import { formatDate } from "@/lib/utils";

export function generateStaticParams() {
  return journalPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getJournalPost(slug);
  if (!post) return {};
  return { title: post.title, description: post.excerpt };
}

export default async function JournalPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getJournalPost(slug);
  if (!post) notFound();

  const more = journalPosts.filter((entry) => entry.slug !== post.slug).slice(0, 3);

  return (
    <>
      <Shell className="py-10 sm:py-14">
        <Breadcrumbs
          trail={[
            { label: "Home", href: "/" },
            { label: "Journal", href: "/journal" },
            { label: post.title },
          ]}
        />
        <p className="eyebrow mt-8 text-[9px] text-stone">
          {post.category} &middot; {post.readingTime} &middot; {formatDate(post.publishedOn)}
        </p>
        <h1 className="mt-5 max-w-3xl text-[clamp(2rem,5vw,3.25rem)] normal-case tracking-normal">
          {post.title}
        </h1>
        <p className="mt-5 max-w-2xl text-[16px] leading-relaxed text-ash">{post.excerpt}</p>
      </Shell>

      <div className="relative aspect-[21/9] min-h-[240px] bg-cream-deep">
        <Image
          src={post.image}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      </div>

      <Shell className="py-12 sm:py-16">
        <Prose>
          {post.body.map((paragraph) => (
            <p key={paragraph.slice(0, 24)}>{paragraph}</p>
          ))}
        </Prose>

        {more.length > 0 && (
          <aside className="mt-16 border-t border-line pt-12">
            <div className="flex items-end justify-between gap-6">
              <h2 className="eyebrow text-[13px]">More from the journal</h2>
              <ArrowCta href="/journal">All notes</ArrowCta>
            </div>
            <ul className="mt-8 grid gap-6 sm:grid-cols-3">
              {more.map((entry) => (
                <li key={entry.slug}>
                  <Link href={`/journal/${entry.slug}`} className="group block">
                    <p className="eyebrow text-[8px] text-stone">{entry.category}</p>
                    <p className="mt-2 text-[15px] leading-snug group-hover:text-wine">{entry.title}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </Shell>
    </>
  );
}
