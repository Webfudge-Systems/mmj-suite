"use client";

import Link from "next/link";
import { CakeSlice, Heart, MessageCircle, PhoneCall, PiggyBank } from "lucide-react";
import { Badge, EmptyState, Input, Select, cn, type Tone } from "@webfudge/ui";
import type { EnquiryStatus, PaymentMode, Reminder, SchemePlan, SchemeStatus } from "@webfudge/utils/api";
import { ENQUIRY_STATUS_LABELS, PAYMENT_MODE_LABELS, SCHEME_STATUS_LABELS } from "@webfudge/utils/api";
import { formatDate } from "@webfudge/utils/formatters";

/** Opens WhatsApp with the message ready; the person still presses send. */
export function WhatsAppButton({ href, label = "WhatsApp", size = "md" }: { href: string | null; label?: string; size?: "sm" | "md" }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-[#25d366]/40 bg-[#25d366]/10 font-semibold text-[#128c4b] transition-colors hover:bg-[#25d366]/20",
        size === "sm" ? "h-8 px-3 text-[12px]" : "h-10 px-4 text-[13px]",
      )}
    >
      <MessageCircle className={size === "sm" ? "size-3.5" : "size-4"} aria-hidden />
      {label}
    </a>
  );
}

const enquiryTones: Record<EnquiryStatus, Tone> = { new: "gold", contacted: "navy", visit_booked: "navy", won: "ok", lost: "neutral" };

export function EnquiryBadge({ status }: { status: EnquiryStatus }) {
  return (
    <Badge tone={enquiryTones[status]} dot>
      {ENQUIRY_STATUS_LABELS[status]}
    </Badge>
  );
}

const schemeTones: Record<SchemeStatus, Tone> = { active: "navy", matured: "gold", redeemed: "ok", closed: "neutral" };

export function SchemeBadge({ status, behind = 0 }: { status: SchemeStatus; behind?: number }) {
  if (status === "active" && behind > 0) {
    return (
      <Badge tone="warn" dot>
        {behind} behind
      </Badge>
    );
  }
  return (
    <Badge tone={schemeTones[status]} dot>
      {SCHEME_STATUS_LABELS[status]}
    </Badge>
  );
}

const reminderIcons = { birthday: CakeSlice, anniversary: Heart, scheme_due: PiggyBank, follow_up: PhoneCall };
const reminderColours = {
  birthday: "bg-gold-soft text-gold-deep",
  anniversary: "bg-risk-soft text-risk",
  scheme_due: "bg-navy-soft text-navy",
  follow_up: "bg-ok-soft text-ok",
};

function reminderHref(reminder: Reminder) {
  if (reminder.kind === "scheme_due" && reminder.schemeId) return `/schemes/${reminder.schemeId}`;
  if (reminder.kind === "follow_up" && reminder.enquiryId) return `/enquiries/${reminder.enquiryId}`;
  return reminder.customer ? `/customers/${reminder.customer.id}` : null;
}

/** Birthdays, anniversaries, scheme instalments and follow-ups, each with a WhatsApp shortcut. */
export function ReminderList({ reminders, empty = "Nothing coming up." }: { reminders: Reminder[]; empty?: string }) {
  if (!reminders.length) return <EmptyState title={empty} description="Add birthdays and anniversaries on customer profiles to see them here." />;
  return (
    <ul className="divide-y divide-gray-100">
      {reminders.map((reminder, index) => {
        const Icon = reminderIcons[reminder.kind];
        const href = reminderHref(reminder);
        const late = reminder.inDays < 0;
        return (
          <li key={`${reminder.kind}-${reminder.date}-${index}`} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
            <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", reminderColours[reminder.kind])}>
              <Icon className="size-5" aria-hidden />
            </span>
            <div className="grid min-w-0 flex-1 leading-tight">
              {href ? (
                <Link href={href} className="truncate font-semibold text-ink hover:underline">
                  {reminder.title}
                </Link>
              ) : (
                <span className="truncate font-semibold text-ink">{reminder.title}</span>
              )}
              <span className={cn("truncate text-[13px]", late ? "text-risk" : "text-ash")}>
                {formatDate(reminder.date)} · {reminder.detail}
              </span>
            </div>
            <WhatsAppButton href={reminder.whatsapp} size="sm" />
          </li>
        );
      })}
    </ul>
  );
}

const MODES = Object.keys(PAYMENT_MODE_LABELS) as PaymentMode[];

/** One payment: how it was paid and its reference. Enough for scheme instalments. */
export function PaymentPicker({
  id,
  mode,
  reference,
  onMode,
  onReference,
}: {
  id: string;
  mode: PaymentMode;
  reference: string;
  onMode: (mode: PaymentMode) => void;
  onReference: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Select id={`${id}-mode`} aria-label="Paid by" value={mode} onChange={(event) => onMode(event.target.value as PaymentMode)} className="w-44">
        {MODES.map((entry) => (
          <option key={entry} value={entry}>
            {PAYMENT_MODE_LABELS[entry]}
          </option>
        ))}
      </Select>
      {mode !== "cash" && (
        <Input id={`${id}-reference`} aria-label="Reference" placeholder="UPI or card reference" value={reference} onChange={(event) => onReference(event.target.value)} className="min-w-0 flex-1" />
      )}
    </div>
  );
}

/** Initials for an avatar, without the "Demo –" prefix of demo customers. */
export function initials(name: string) {
  const parts = name.replace(/^Demo\s*[–-]\s*/, "").trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
}

export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full border-2 border-white bg-gradient-to-br from-navy to-navy-deep font-bold text-gold shadow-md",
        size === "sm" ? "size-9 text-[12px]" : size === "lg" ? "size-16 text-xl" : "size-11 text-sm",
      )}
    >
      {initials(name)}
    </span>
  );
}

/** How a plan's bonus reads to a customer. */
export function bonusLabel(plan: Pick<SchemePlan, "bonusType" | "bonusValue">) {
  if (plan.bonusType === "instalment") return plan.bonusValue === 1 ? "1 instalment free" : `${plan.bonusValue} instalments free`;
  if (plan.bonusType === "percent") return `${plan.bonusValue}% bonus`;
  return "No bonus";
}
