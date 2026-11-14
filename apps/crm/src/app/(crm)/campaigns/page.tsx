"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Download, Megaphone } from "lucide-react";
import { errorMessage, useAuth, useResource } from "@webfudge/auth/components";
import { Alert, Button, Card, CardBody, CardHeader, EmptyState, Field, Input, PageHeader, Select, Spinner, Table, Td, Textarea, Th, Tr } from "@webfudge/ui";
import type { AudienceRow, AudienceSegment } from "@webfudge/utils/api";
import { formatDate, formatINR } from "@webfudge/utils/formatters";
import { WhatsAppButton } from "@/components/crm";
import { API_URL } from "@/lib/env";

const SEGMENTS: { key: AudienceSegment; label: string; hint: string }[] = [
  { key: "opted_in", label: "Everyone who agreed to offers", hint: "All customers who said yes to messages." },
  { key: "birthday_month", label: "Birthdays this month", hint: "Send a wish with a small birthday offer." },
  { key: "anniversary_month", label: "Anniversaries this month", hint: "Couples celebrating this month." },
  { key: "scheme_members", label: "Gold scheme members", hint: "Customers paying into or holding a matured scheme." },
  { key: "recent_buyers", label: "Bought recently", hint: "Bought within the chosen number of days." },
  { key: "lapsed", label: "Have not bought in a while", hint: "Last bill is older than the chosen number of days." },
  { key: "big_spenders", label: "Big spenders", hint: "Bought at least the chosen amount in total." },
  { key: "never_bought", label: "Never bought", hint: "Enquired or saved but no bill yet." },
  { key: "all", label: "Every customer (service messages only)", hint: "Ignores consent: use only for things like a shop closure, never for offers." },
];

export default function CampaignsPage() {
  const { withToken } = useAuth();
  const [segment, setSegment] = useState<AudienceSegment>("opted_in");
  const [days, setDays] = useState("180");
  const [minSpend, setMinSpend] = useState("200000");
  const [message, setMessage] = useState("Namaste {name}, our Akshaya Tritiya collection is here, with making charges from 8%. Visit Mukund Maid Jewellers this week. – MMJ, Rahuri");
  const [debounced, setDebounced] = useState(message);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(message), 400);
    return () => window.clearTimeout(timer);
  }, [message]);

  const query = useMemo(() => {
    const params = new URLSearchParams({ segment, message: debounced });
    if (segment === "recent_buyers" || segment === "lapsed") params.set("days", days);
    if (segment === "big_spenders") params.set("minSpend", minSpend);
    return params.toString();
  }, [segment, days, minSpend, debounced]);

  const audience = useResource<{ data: AudienceRow[]; meta: { total: number; consentOnly: boolean } }>(`/crm/audience?${query}`);
  const rows = audience.data?.data ?? [];
  const chosen = SEGMENTS.find((entry) => entry.key === segment)!;

  async function download() {
    setDownloadError(null);
    try {
      const blob = await withToken(async (token) => {
        const response = await fetch(`${API_URL}/api/crm/audience?${query}&format=csv`, { headers: { Authorization: `Bearer ${token}` } });
        if (!response.ok) throw new Error("The list could not be downloaded.");
        return response.blob();
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `mmj-${segment}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (cause) {
      setDownloadError(errorMessage(cause));
    }
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Campaigns"
        description="Pick who to reach, write the message once, then send it on WhatsApp customer by customer, or download the list for a bulk sender."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <Card>
          <CardHeader title="Who and what" />
          <CardBody className="grid gap-4">
            <Field label="Customers" htmlFor="segment" hint={chosen.hint}>
              <Select id="segment" value={segment} onChange={(event) => setSegment(event.target.value as AudienceSegment)}>
                {SEGMENTS.map((entry) => (
                  <option key={entry.key} value={entry.key}>
                    {entry.label}
                  </option>
                ))}
              </Select>
            </Field>
            {(segment === "recent_buyers" || segment === "lapsed") && (
              <Field label="Days" htmlFor="days">
                <Input id="days" inputMode="numeric" value={days} onChange={(event) => setDays(event.target.value)} className="max-w-40" />
              </Field>
            )}
            {segment === "big_spenders" && (
              <Field label="Bought at least (₹)" htmlFor="min-spend">
                <Input id="min-spend" inputMode="numeric" value={minSpend} onChange={(event) => setMinSpend(event.target.value)} className="max-w-48" />
              </Field>
            )}
            <Field label="Message" htmlFor="message" hint="{name} becomes each customer's first name.">
              <Textarea id="message" value={message} onChange={(event) => setMessage(event.target.value)} className="min-h-36" />
            </Field>
            {segment !== "all" && (
              <Alert tone="navy">Only customers who agreed to receive offers are listed. Mark consent on each customer&apos;s profile.</Alert>
            )}
          </CardBody>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader
            title={audience.data ? `${audience.data.meta.total} ${audience.data.meta.total === 1 ? "customer" : "customers"}` : "Customers"}
            description="WhatsApp opens with the message filled in; you press send."
            action={
              <Button size="sm" variant="secondary" onClick={download} disabled={!rows.length}>
                <Download className="size-4" aria-hidden />
                Download CSV
              </Button>
            }
          />
          {downloadError && <p className="px-6 pt-3 text-sm text-risk">{downloadError}</p>}
          {audience.loading && !audience.data ? (
            <div className="grid place-items-center py-12 text-navy">
              <Spinner />
            </div>
          ) : audience.error ? (
            <p className="p-5 text-sm text-risk">{audience.error}</p>
          ) : !rows.length ? (
            <EmptyState icon={Megaphone} title="No one in this list" description="Try another group, or mark more customers as happy to receive offers." />
          ) : (
            <Table minWidth={640}>
              <thead>
                <tr>
                  <Th>Customer</Th>
                  <Th>City</Th>
                  <Th align="right">Bought</Th>
                  <Th>Last bill</Th>
                  <Th>
                    <span className="sr-only">Send</span>
                  </Th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 200).map((row) => (
                  <Tr key={row.id}>
                    <Td>
                      <Link href={`/customers/${row.id}`} className="grid leading-tight hover:underline">
                        <span className="font-semibold text-ink">{row.name}</span>
                        <span className="text-[12.5px] text-ash tabular-nums">{row.phone}</span>
                      </Link>
                    </Td>
                    <Td>{row.city ?? "—"}</Td>
                    <Td align="right">{row.spent ? formatINR(row.spent) : "—"}</Td>
                    <Td>{row.lastBillAt ? formatDate(row.lastBillAt) : "—"}</Td>
                    <Td align="right">
                      <WhatsAppButton href={row.whatsapp} size="sm" label="Send" />
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
          {rows.length > 200 && <p className="border-t border-gray-100 px-5 py-3 text-[13px] text-ash">Showing the first 200. Download the CSV for the full list.</p>}
        </Card>
      </div>
    </div>
  );
}
