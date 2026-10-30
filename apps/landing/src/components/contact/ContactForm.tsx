"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Select, TextArea } from "@/components/ui/Field";

const reasons = [
  { value: "enquiry", label: "A piece on the website" },
  { value: "custom", label: "Something made to order" },
  { value: "exchange", label: "Exchanging old gold" },
  { value: "scheme", label: "The savings scheme" },
  { value: "repair", label: "Repair or polishing" },
  { value: "other", label: "Something else" },
];

/** No backend yet, so submitting just confirms in place. */
export function ContactForm() {
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <div className="border border-line bg-paper p-8 sm:p-10">
        <span className="grid size-10 place-items-center rounded-full bg-stock text-cream">
          <Check className="size-4" strokeWidth={2.5} />
        </span>
        <h2 className="mt-6 text-[1.25rem]">Message noted</h2>
        <p className="mt-4 max-w-sm text-[13px] leading-relaxed text-ash">
          We reply within one working day. For anything urgent, WhatsApp is the fastest
          way to reach the counter.
        </p>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="eyebrow mt-7 text-[9px] text-ash underline-offset-4 hover:text-ink hover:underline"
        >
          Send another
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setSent(true);
      }}
      className="border border-line bg-paper p-7 sm:p-9"
    >
      <h2 className="eyebrow text-[10px]">Send a message</h2>

      <div className="mt-7 grid gap-5 sm:grid-cols-2">
        <Field label="Your name" name="name" required autoComplete="name" />
        <Field label="Mobile" name="phone" type="tel" required autoComplete="tel" placeholder="+91" />
        <Field label="Email" name="email" type="email" autoComplete="email" className="sm:col-span-2" />
        <Select label="What is it about" name="reason" options={reasons} className="sm:col-span-2" />
        <TextArea
          label="Message"
          name="message"
          required
          placeholder="Weight band, design number or a reference you have seen"
          className="sm:col-span-2"
        />
      </div>

      <Button type="submit" className="mt-7">
        Send message
      </Button>
      <p className="mt-5 text-[11px] leading-relaxed text-stone">
        Demonstration form. Nothing is transmitted or stored.
      </p>
    </form>
  );
}
