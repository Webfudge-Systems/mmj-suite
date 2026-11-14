"use client";

import { use, useState, type FormEvent } from "react";
import Link from "next/link";
import { Phone } from "lucide-react";
import { errorMessage, useApi, useResource } from "@webfudge/auth/components";
import { Alert, Button, Card, CardBody, CardHeader, Field, Input, PageHeader, Spinner, Textarea, buttonClass, cn } from "@webfudge/ui";
import type { Customer, Enquiry, EnquiryStatus } from "@webfudge/utils/api";
import { ENQUIRY_SOURCE_LABELS, ENQUIRY_STATUS_LABELS } from "@webfudge/utils/api";
import { formatDate, formatDateTime, formatINR } from "@webfudge/utils/formatters";
import { EnquiryBadge, WhatsAppButton } from "@/components/crm";
import { CustomerPicker } from "@/components/customer-picker";

const FLOW: EnquiryStatus[] = ["new", "contacted", "visit_booked", "won", "lost"];

export default function EnquiryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const api = useApi();
  const { data, error, loading, reload } = useResource<{ data: Enquiry }>(`/crm/enquiries/${id}`);
  const enquiry = data?.data;
  const [status, setStatus] = useState<EnquiryStatus | null>(null);
  const [lostReason, setLostReason] = useState("");
  const [followUpOn, setFollowUpOn] = useState("");
  const [visitOn, setVisitOn] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "risk"; text: string } | null>(null);
  const [linking, setLinking] = useState(false);

  if (loading && !enquiry) return <Spinner className="text-navy" />;
  if (error || !enquiry) return <p className="text-sm text-risk">{error ?? "Enquiry not found."}</p>;

  const chosen = status ?? enquiry.status;

  async function save(body: Record<string, unknown>) {
    setBusy(true);
    setMessage(null);
    try {
      await api.put(`/crm/enquiries/${id}`, body);
      setNote("");
      setStatus(null);
      setLostReason("");
      setFollowUpOn("");
      setVisitOn("");
      setMessage({ tone: "ok", text: "Saved." });
      reload();
    } catch (cause) {
      setMessage({ tone: "risk", text: errorMessage(cause) });
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const body: Record<string, unknown> = {};
    if (chosen !== enquiry!.status) body.status = chosen;
    if (chosen === "lost") body.lostReason = lostReason;
    if (followUpOn) body.followUpOn = followUpOn;
    if (visitOn) body.visitOn = visitOn;
    if (note.trim()) body.note = note.trim();
    save(body);
  }

  function link(customer: Customer | null) {
    if (!customer) return;
    setLinking(false);
    save({ customerId: customer.id });
  }

  const total = enquiry.items.reduce((sum, item) => sum + (item.price ?? 0) * (item.quantity ?? 1), 0);

  return (
    <div className="grid gap-6">
      <PageHeader
        title={enquiry.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono">{enquiry.number}</span>
            <span>· {ENQUIRY_SOURCE_LABELS[enquiry.source]} · {formatDateTime(enquiry.createdAt)}</span>
            <EnquiryBadge status={enquiry.status} />
          </span>
        }
        actions={
          <>
            {enquiry.phone && (
              <a href={`tel:+91${enquiry.phone}`} className={buttonClass("secondary")}>
                <Phone className="size-4" aria-hidden />
                {enquiry.phone}
              </a>
            )}
            <WhatsAppButton href={enquiry.whatsapp} />
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="grid content-start gap-6">
          <Card>
            <CardHeader title="What they asked for" />
            <CardBody className="grid gap-4">
              {enquiry.items.length > 0 && (
                <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200">
                  {enquiry.items.map((item, index) => (
                    <li key={`${item.code}-${index}`} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                      <span className="grid leading-tight">
                        {item.url ? (
                          <a href={item.url} target="_blank" rel="noreferrer" className="font-semibold text-navy hover:underline">
                            {item.name}
                          </a>
                        ) : (
                          <span className="font-semibold">{item.name}</span>
                        )}
                        <span className="text-[12px] text-ash">
                          {item.code ? `Design ${item.code}` : ""}
                          {(item.quantity ?? 1) > 1 ? ` · ×${item.quantity}` : ""}
                        </span>
                      </span>
                      <span className="tabular-nums">{item.price ? formatINR(item.price * (item.quantity ?? 1)) : "Price on request"}</span>
                    </li>
                  ))}
                  {total > 0 && (
                    <li className="flex justify-between px-4 py-3 text-sm font-semibold">
                      <span>Estimate at the day&apos;s rate</span>
                      <span className="tabular-nums">{formatINR(total)}</span>
                    </li>
                  )}
                </ul>
              )}
              {enquiry.message ? <p className="text-sm whitespace-pre-line text-ink">{enquiry.message}</p> : !enquiry.items.length && <p className="text-sm text-ash">No details were given.</p>}
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-[11.5px] font-bold tracking-wide text-gray-500 uppercase">Visit</dt>
                  <dd>{enquiry.visitOn ? formatDate(enquiry.visitOn) : "Not booked"}</dd>
                </div>
                <div>
                  <dt className="text-[11.5px] font-bold tracking-wide text-gray-500 uppercase">Follow up</dt>
                  <dd>{enquiry.followUpOn ? formatDate(enquiry.followUpOn) : "—"}</dd>
                </div>
                {enquiry.email && (
                  <div>
                    <dt className="text-[11.5px] font-bold tracking-wide text-gray-500 uppercase">Email</dt>
                    <dd>{enquiry.email}</dd>
                  </div>
                )}
                {enquiry.lostReason && (
                  <div>
                    <dt className="text-[11.5px] font-bold tracking-wide text-gray-500 uppercase">Lost because</dt>
                    <dd>{enquiry.lostReason}</dd>
                  </div>
                )}
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Customer" />
            <CardBody className="grid gap-3">
              {enquiry.customer ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="grid leading-tight">
                    <span className="font-semibold">{enquiry.customer.name}</span>
                    <span className="text-[13px] text-ash">{enquiry.customer.phone}</span>
                  </span>
                  <Link href={`/customers/${enquiry.customer.id}`} className={buttonClass("secondary", "sm")}>
                    Open profile
                  </Link>
                </div>
              ) : linking ? (
                <CustomerPicker value={null} onChange={link} />
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-ash">Not linked to a customer yet.</p>
                  <Button size="sm" variant="secondary" onClick={() => setLinking(true)}>
                    Find or add customer
                  </Button>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="grid content-start gap-6">
          <Card>
            <CardHeader title="Next step" />
            <CardBody>
              <form onSubmit={submit} className="grid gap-4" noValidate>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Status">
                  {FLOW.map((entry) => (
                    <button
                      key={entry}
                      type="button"
                      role="radio"
                      aria-checked={chosen === entry}
                      onClick={() => setStatus(entry)}
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-[13px] font-semibold transition-all",
                        chosen === entry ? "border-transparent bg-navy text-white shadow-md" : "border-gray-200 bg-white text-gray-700 hover:shadow-sm",
                      )}
                    >
                      {ENQUIRY_STATUS_LABELS[entry]}
                    </button>
                  ))}
                </div>
                {chosen === "lost" && (
                  <Field label="Why was it lost" htmlFor="lost-reason">
                    <Input id="lost-reason" value={lostReason} onChange={(event) => setLostReason(event.target.value)} placeholder="Price, bought elsewhere, not interested now" />
                  </Field>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Call again on" htmlFor="follow-up">
                    <Input id="follow-up" type="date" value={followUpOn} onChange={(event) => setFollowUpOn(event.target.value)} />
                  </Field>
                  <Field label="Visit on" htmlFor="visit-on">
                    <Input id="visit-on" type="date" value={visitOn} onChange={(event) => setVisitOn(event.target.value)} />
                  </Field>
                </div>
                <Field label="Note" htmlFor="enquiry-note">
                  <Textarea id="enquiry-note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="What was said on the call" />
                </Field>
                {message && <Alert tone={message.tone}>{message.text}</Alert>}
                <Button type="submit" loading={busy} disabled={chosen === enquiry.status && !followUpOn && !visitOn && !note.trim()}>
                  Save
                </Button>
              </form>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="History" />
            <ol className="relative grid gap-0 px-6 py-4">
              {[...enquiry.log].reverse().map((entry, index) => (
                <li key={`${entry.at}-${index}`} className="relative border-l-2 border-gray-100 pb-4 pl-5 last:pb-0">
                  <span className="absolute top-1 -left-[7px] size-3 rounded-full border-2 border-white bg-navy" aria-hidden />
                  <p className="text-sm text-ink">{entry.text}</p>
                  <p className="text-[12px] text-ash">
                    {formatDateTime(entry.at)}
                    {entry.by ? ` · ${entry.by}` : ""}
                  </p>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}
