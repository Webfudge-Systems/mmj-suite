"use client";

import { use, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Globe, Inbox, Plus, Search } from "lucide-react";
import { errorMessage, useApi, useResource } from "@webfudge/auth/components";
import { Alert, Badge, Button, Card, CardBody, CardHeader, EmptyState, Field, Input, PageHeader, Select, Spinner, Table, Tabs, Td, Textarea, Th, Tr } from "@webfudge/ui";
import type { Enquiry, EnquirySource, EnquiryStatus } from "@webfudge/utils/api";
import { ENQUIRY_SOURCE_LABELS } from "@webfudge/utils/api";
import { formatDate, formatDateTime } from "@webfudge/utils/formatters";
import { EnquiryBadge } from "@/components/crm";

type View = "open" | EnquiryStatus | "all";
type ListResult = { data: Enquiry[]; meta: { counts: Record<EnquiryStatus, number> } };

function NewEnquiry({ initialName, initialPhone, onSaved, onCancel }: { initialName: string; initialPhone: string; onSaved: (enquiry: Enquiry) => void; onCancel: () => void }) {
  const api = useApi();
  const [form, setForm] = useState({ name: initialName, phone: initialPhone, email: "", source: "walk_in" as EnquirySource, message: "", visitOn: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof typeof form) => (value: string) => setForm((current) => ({ ...current, [key]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { data } = await api.post<{ data: Enquiry }>("/crm/enquiries", { ...form, visitOn: form.visitOn || null });
      onSaved(data);
    } catch (cause) {
      setError(errorMessage(cause));
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader title="New enquiry" description="A walk-in, a phone call or a WhatsApp message. It links to the customer with the same number." />
      <CardBody>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" noValidate>
          <Field label="Name" htmlFor="e-name">
            <Input id="e-name" value={form.name} onChange={(event) => set("name")(event.target.value)} autoFocus />
          </Field>
          <Field label="Mobile" htmlFor="e-phone">
            <Input id="e-phone" inputMode="tel" value={form.phone} onChange={(event) => set("phone")(event.target.value)} />
          </Field>
          <Field label="How did they reach us" htmlFor="e-source">
            <Select id="e-source" value={form.source} onChange={(event) => set("source")(event.target.value)}>
              {(Object.keys(ENQUIRY_SOURCE_LABELS) as EnquirySource[]).map((source) => (
                <option key={source} value={source}>
                  {ENQUIRY_SOURCE_LABELS[source]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="What are they looking for" htmlFor="e-message" className="sm:col-span-2">
            <Textarea id="e-message" value={form.message} onChange={(event) => set("message")(event.target.value)} placeholder="Like: bridal necklace set around 40 g, budget 6 lakh, wedding in February" />
          </Field>
          <Field label="Visit planned on" htmlFor="e-visit">
            <Input id="e-visit" type="date" value={form.visitOn} onChange={(event) => set("visitOn")(event.target.value)} />
          </Field>
          {error && <Alert tone="risk" className="sm:col-span-2 lg:col-span-3">{error}</Alert>}
          <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
            <Button type="submit" loading={busy} disabled={!form.name.trim()}>
              Save enquiry
            </Button>
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

export default function EnquiriesPage({ searchParams }: { searchParams: Promise<{ new?: string; name?: string; phone?: string }> }) {
  const params = use(searchParams);
  const router = useRouter();
  const [view, setView] = useState<View>("open");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(params.new === "1");

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(query.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const list = useResource<ListResult>(`/crm/enquiries?status=${view === "all" ? "" : view}${search ? `&q=${encodeURIComponent(search)}` : ""}`);
  const counts = list.data?.meta.counts;
  const rows = list.data?.data ?? [];

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Enquiries"
        description="Website reservations, calls and walk-ins. Follow each one up until it is won or lost."
        actions={
          <Button onClick={() => setAdding((value) => !value)}>
            <Plus className="size-4" aria-hidden />
            New enquiry
          </Button>
        }
      />

      {adding && <NewEnquiry initialName={params.name ?? ""} initialPhone={params.phone ?? ""} onSaved={(enquiry) => router.push(`/enquiries/${enquiry.id}`)} onCancel={() => setAdding(false)} />}

      <Tabs<View>
        label="Enquiry status"
        active={view}
        onChange={setView}
        tabs={[
          { key: "open", label: "Open", count: counts ? counts.new + counts.contacted + counts.visit_booked : undefined },
          { key: "new", label: "New", count: counts?.new },
          { key: "visit_booked", label: "Visit booked", count: counts?.visit_booked },
          { key: "won", label: "Won", count: counts?.won },
          { key: "lost", label: "Lost", count: counts?.lost },
          { key: "all", label: "All" },
        ]}
        actions={
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-gray-400" aria-hidden />
            <Input id="enquiry-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, number or ENQ-" className="h-10 w-60 rounded-full pl-10" />
          </div>
        }
      />

      <Card className="overflow-hidden">
        {list.loading && !list.data ? (
          <div className="grid place-items-center py-12 text-navy">
            <Spinner />
          </div>
        ) : list.error ? (
          <p className="p-5 text-sm text-risk">{list.error}</p>
        ) : rows.length === 0 ? (
          <EmptyState icon={Inbox} title="No enquiries here" description="Reservations from the website arrive here on their own." />
        ) : (
          <Table minWidth={900}>
            <thead>
              <tr>
                <Th>Enquiry</Th>
                <Th>Person</Th>
                <Th>Looking for</Th>
                <Th>From</Th>
                <Th>Status</Th>
                <Th>Next step</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((enquiry) => {
                const next = [enquiry.visitOn && `Visit ${formatDate(enquiry.visitOn)}`, enquiry.followUpOn && `Call ${formatDate(enquiry.followUpOn)}`].filter(Boolean).join(" · ");
                return (
                  <Tr key={enquiry.id} className="cursor-pointer" onClick={() => router.push(`/enquiries/${enquiry.id}`)}>
                    <Td>
                      <Link href={`/enquiries/${enquiry.id}`} className="grid leading-tight" onClick={(event) => event.stopPropagation()}>
                        <span className="font-mono font-semibold text-ink hover:underline">{enquiry.number}</span>
                        <span className="text-[12px] text-ash">{formatDateTime(enquiry.createdAt)}</span>
                      </Link>
                    </Td>
                    <Td>
                      <span className="grid leading-tight">
                        <span className="font-semibold text-ink">{enquiry.name}</span>
                        <span className="text-[12.5px] text-ash tabular-nums">{enquiry.phone ?? enquiry.email ?? "—"}</span>
                      </span>
                    </Td>
                    <Td className="max-w-72">
                      <span className="line-clamp-2 text-[13px]">{enquiry.items.map((item) => item.name).join(", ") || enquiry.message || "—"}</span>
                    </Td>
                    <Td>
                      {enquiry.source === "website" ? (
                        <Badge tone="gold">
                          <Globe className="size-3" aria-hidden />
                          Website
                        </Badge>
                      ) : (
                        <Badge>{ENQUIRY_SOURCE_LABELS[enquiry.source]}</Badge>
                      )}
                    </Td>
                    <Td>
                      <EnquiryBadge status={enquiry.status} />
                    </Td>
                    <Td className="text-[13px] text-ash">{next || "—"}</Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
