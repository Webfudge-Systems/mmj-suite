"use client";

import Link from "next/link";
import { Gift, Inbox, Megaphone, PiggyBank, Plus, Users } from "lucide-react";
import { useAuth, useResource } from "@webfudge/auth/components";
import { Card, CardHeader, KpiCard, PageHeader, Spinner, buttonClass } from "@webfudge/ui";
import type { CrmDashboard } from "@webfudge/utils/api";
import { formatINR } from "@webfudge/utils/formatters";
import { ReminderList } from "@/components/crm";

export default function DashboardPage() {
  const { staff } = useAuth();
  const { data, error, loading } = useResource<{ data: CrmDashboard }>("/crm/dashboard");
  const stats = data?.data;

  return (
    <div className="grid gap-6">
      <PageHeader
        title={`Good day, ${staff?.fullName?.split(" ")[0] || staff?.username || ""}`}
        description="Who to call, what is due, and how your customers are doing."
        actions={
          <>
            <Link href="/enquiries?new=1" className={buttonClass("secondary")}>
              <Plus className="size-4" aria-hidden />
              New enquiry
            </Link>
            <Link href="/schemes?enrol=1" className={buttonClass("primary")}>
              <PiggyBank className="size-4" aria-hidden />
              Enrol in a scheme
            </Link>
          </>
        }
      />

      {loading && !stats ? (
        <Spinner className="text-navy" />
      ) : error ? (
        <p className="text-sm text-risk">{error}</p>
      ) : stats ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Link href="/customers" className="rounded-xl">
              <KpiCard hoverable compact title="Customers" value={stats.customers.total} icon={Users} subtitle={`${stats.customers.newThisMonth} new this month`} />
            </Link>
            <Link href="/enquiries" className="rounded-xl">
              <KpiCard
                hoverable
                compact
                title="Open enquiries"
                value={stats.enquiries.open}
                icon={Inbox}
                tone={stats.enquiries.new ? "gold" : "navy"}
                subtitle={stats.enquiries.new ? `${stats.enquiries.new} not called yet` : `${stats.enquiries.wonThisMonth} won this month`}
              />
            </Link>
            <Link href="/schemes" className="rounded-xl">
              <KpiCard
                hoverable
                compact
                title="Gold schemes"
                value={stats.schemes.active}
                icon={PiggyBank}
                tone={stats.schemes.behind ? "warn" : "ok"}
                subtitle={stats.schemes.behind ? `${stats.schemes.behind} behind · ${formatINR(stats.schemes.held)} held` : `${formatINR(stats.schemes.held)} held`}
              />
            </Link>
            <Link href="/loyalty" className="rounded-xl">
              <KpiCard
                hoverable
                compact
                title="Loyalty points out"
                value={stats.loyalty.pointsOutstanding.toLocaleString("en-IN")}
                icon={Gift}
                tone="gold"
                subtitle={stats.loyalty.enabled ? `Worth ${formatINR(stats.loyalty.valueOutstanding)} · ${stats.loyalty.members} members` : "Loyalty is switched off"}
              />
            </Link>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <Card>
              <CardHeader
                title="This week"
                description="Birthdays, anniversaries, instalments due and follow-ups."
                action={
                  <Link href="/reminders" className={buttonClass("ghost", "sm")}>
                    See all
                  </Link>
                }
              />
              <ReminderList reminders={stats.upcoming} empty="Nothing due this week." />
            </Card>

            <Card>
              <CardHeader title="This month" />
              <dl className="grid gap-0 divide-y divide-gray-100">
                {[
                  ["Scheme instalments collected", formatINR(stats.schemes.collectedThisMonth)],
                  ["Schemes ready to redeem", String(stats.schemes.matured)],
                  ["Enquiries won", String(stats.enquiries.wonThisMonth)],
                  ["New customers", String(stats.customers.newThisMonth)],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-3 px-6 py-3.5 text-sm">
                    <dt className="text-ash">{label}</dt>
                    <dd className="font-semibold text-ink tabular-nums">{value}</dd>
                  </div>
                ))}
              </dl>
              <div className="border-t border-gray-100 px-6 py-4">
                <Link href="/campaigns" className={buttonClass("secondary", "sm")}>
                  <Megaphone className="size-4" aria-hidden />
                  Plan a campaign
                </Link>
              </div>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
