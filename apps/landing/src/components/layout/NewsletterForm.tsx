"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Email capture. `dark` is the footer's boxed field with the gold Sign up
 * button; `line` is the quiet underline version used on light pages.
 */
export function NewsletterForm({
  variant = "line",
  className,
}: {
  variant?: "line" | "dark";
  className?: string;
}) {
  const [done, setDone] = useState(false);
  const id = variant === "dark" ? "newsletter-email-footer" : "newsletter-email";

  if (variant === "dark") {
    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setDone(true);
        }}
        className={cn("w-full max-w-md", className)}
      >
        <label className="sr-only" htmlFor={id}>
          Email address
        </label>
        <div className="flex gap-3">
          <input
            id={id}
            type="email"
            name="email"
            required
            disabled={done}
            placeholder="Email address"
            className="min-w-0 flex-1 border border-cream/25 bg-transparent px-4 py-3.5 text-[14px] text-cream outline-none transition-colors placeholder:text-cream/45 focus:border-gold disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={done}
            className="shrink-0 bg-gold px-7 text-[14px] font-medium text-ink transition-colors hover:bg-gold-soft disabled:opacity-60"
          >
            {done ? "Signed up" : "Sign up"}
          </button>
        </div>
        <p aria-live="polite" className="mt-3 text-[12px] leading-relaxed text-cream/55">
          {done
            ? "Thank you. We will write when a collection lands, and not otherwise."
            : "New collections and the festive calendar, no more than once a month."}
        </p>
      </form>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setDone(true);
      }}
      className={cn("mt-5 max-w-sm", className)}
    >
      <label className="sr-only" htmlFor={id}>
        Email address
      </label>
      <div className="flex items-center border-b border-ink/25 focus-within:border-ink">
        <input
          id={id}
          type="email"
          name="email"
          required
          placeholder="you@example.com"
          className="w-full bg-transparent py-3 text-[14px] text-ink outline-none placeholder:text-stone"
        />
        <button
          type="submit"
          aria-label="Subscribe"
          className="shrink-0 px-2 text-ink transition-transform duration-300 ease-[var(--ease-out-soft)] hover:translate-x-0.5"
        >
          <ArrowRight className="size-4" />
        </button>
      </div>
      <p aria-live="polite" className="mt-3 text-[11px] leading-relaxed text-stone">
        {done
          ? "Thank you. We will write when a collection lands, and not otherwise."
          : "New collections and the festive calendar. No more than once a month."}
      </p>
    </form>
  );
}
