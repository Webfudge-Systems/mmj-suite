"use client";

import { useState } from "react";
import { useResource } from "@webfudge/auth/components";
import { Card, PageHeader, Spinner, Tabs } from "@webfudge/ui";
import type { Reminder, ReminderKind } from "@webfudge/utils/api";
import { ReminderList } from "@/components/crm";

type Kind = "all" | ReminderKind;
type Range = "7" | "30" | "90";

export default function RemindersPage() {
  const [range, setRange] = useState<Range>("30");
  const [kind, setKind] = useState<Kind>("all");
  const { data, error, loading } = useResource<{ data: Reminder[] }>(`/crm/reminders?days=${range}`);
  const all = data?.data ?? [];
  const shown = kind === "all" ? all : all.filter((reminder) => reminder.kind === kind);
  const count = (value: ReminderKind) => all.filter((reminder) => reminder.kind === value).length;

  return (
    <div className="grid gap-6">
      <PageHeader title="Reminders" description="Send a wish or a nudge with one tap: WhatsApp opens with the message written, ready for you to send." />

      <Tabs<Kind>
        label="Reminder type"
        active={kind}
        onChange={setKind}
        tabs={[
          { key: "all", label: "Everything", count: all.length },
          { key: "birthday", label: "Birthdays", count: count("birthday") },
          { key: "anniversary", label: "Anniversaries", count: count("anniversary") },
          { key: "scheme_due", label: "Instalments", count: count("scheme_due") },
          { key: "follow_up", label: "Follow-ups", count: count("follow_up") },
        ]}
        actions={
          <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
            {(["7", "30", "90"] as Range[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setRange(value)}
                aria-pressed={range === value}
                className={`rounded-md px-3 py-1.5 text-[13px] font-semibold ${range === value ? "bg-white text-navy shadow-sm" : "text-gray-600"}`}
              >
                {value} days
              </button>
            ))}
          </div>
        }
      />

      <Card className="overflow-hidden">
        {loading && !data ? (
          <div className="grid place-items-center py-12 text-navy">
            <Spinner />
          </div>
        ) : error ? (
          <p className="p-5 text-sm text-risk">{error}</p>
        ) : (
          <ReminderList reminders={shown} empty={`Nothing in the next ${range} days.`} />
        )}
      </Card>
    </div>
  );
}
