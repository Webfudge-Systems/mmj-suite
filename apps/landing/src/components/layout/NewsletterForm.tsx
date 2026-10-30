"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";

export function NewsletterForm() {
  const [done, setDone] = useState(false);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setDone(true);
      }}
      className="mt-5 max-w-sm"
    >
      <label className="sr-only" htmlFor="newsletter-email">
        Email address
      </label>
      <div className="flex items-center border-b border-ink/25 focus-within:border-ink">
        <input
          id="newsletter-email"
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
