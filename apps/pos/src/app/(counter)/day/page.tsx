"use client";

import { useState } from "react";
import { errorMessage, useApi, useBranch, useResource } from "@webfudge/auth/components";
import { Alert, Button, Card, CardBody, CardHeader, Field, Input, PageHeader, Spinner, Table, Td, Th, Tr } from "@webfudge/ui";
import { PAYMENT_MODE_LABELS, type DaySummary, type PaymentMode } from "@webfudge/utils/api";
import { formatDateTime, formatINR } from "@webfudge/utils/formatters";

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());

export default function DayPage() {
  const api = useApi();
  const { branch } = useBranch();
  const [date, setDate] = useState(today);
  const summary = useResource<{ data: DaySummary }>(branch ? `/sales/day?branchId=${branch.id}&date=${date}` : null);
  const [counted, setCounted] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const day = summary.data?.data;

  const difference = counted === "" || !day ? null : Math.round(Number(counted) * 100) / 100 - day.expectedCash;
  const modes = Object.keys(PAYMENT_MODE_LABELS) as PaymentMode[];

  async function close() {
    if (!branch) return;
    setBusy(true);
    setError(null);
    try {
      const { data } = await api.post<{ data: DaySummary }>("/sales/day/close", { branchId: branch.id, date, countedCash: Number(counted), notes });
      summary.setData({ data });
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6">
      <PageHeader title="Day close" description="Count the cash drawer at the end of the day and match it with what the counter took and paid out." />
      <Input id="day-date" type="date" aria-label="Day" value={date} max={today()} onChange={(event) => setDate(event.target.value)} className="max-w-[200px]" />

      {summary.loading || !day ? (
        <Spinner className="text-navy" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ["Invoices", day.counts.invoices],
              ["Sales", formatINR(day.counts.salesTotal)],
              ["Old gold taken", formatINR(day.counts.oldGoldTaken)],
              ["Old gold bought", formatINR(day.counts.oldGoldBought)],
            ].map(([label, value]) => (
              <div key={label as string} className="grid gap-1 rounded-[var(--radius-panel)] border border-line bg-surface px-4 py-3">
                <span className="text-lg font-semibold text-navy tabular-nums">{value}</span>
                <span className="text-[13px] text-ash">{label}</span>
              </div>
            ))}
          </div>

          <Card>
            <CardHeader title="By payment method" description={day.counts.cancelled ? `${day.counts.cancelled} invoices were cancelled today; their payments stay in the totals until refunded.` : undefined} />
            <Table minWidth={420}>
              <thead>
                <tr>
                  <Th>Method</Th>
                  <Th align="right">Taken</Th>
                  <Th align="right">Paid out</Th>
                </tr>
              </thead>
              <tbody>
                {modes.map((mode) => (
                  <Tr key={mode}>
                    <Td>{PAYMENT_MODE_LABELS[mode]}</Td>
                    <Td align="right">{formatINR(day.in[mode] ?? 0)}</Td>
                    <Td align="right">{formatINR(day.out[mode] ?? 0)}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </Card>

          <Card>
            <CardHeader title="Cash drawer" />
            <CardBody className="grid max-w-lg gap-4">
              <div className="grid gap-1 text-sm tabular-nums">
                <div className="flex justify-between">
                  <span className="text-ash">Opening cash (last count)</span>
                  <span>{formatINR(day.openingCash)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ash">+ Cash taken</span>
                  <span>{formatINR(day.in.cash ?? 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ash">− Cash paid out</span>
                  <span>{formatINR(day.out.cash ?? 0)}</span>
                </div>
                <div className="flex justify-between border-t border-line pt-2 text-base font-semibold text-navy">
                  <span>Should be in the drawer</span>
                  <span>{formatINR(day.expectedCash)}</span>
                </div>
              </div>

              {day.closed ? (
                <Alert tone={day.closed.difference === 0 ? "ok" : "warn"} title={`Closed by ${day.closed.closedBy ?? "staff"} at ${formatDateTime(day.closed.at)}`}>
                  Counted {formatINR(day.closed.countedCash)}
                  {day.closed.difference !== 0 ? `, ${day.closed.difference > 0 ? "over" : "short"} by ${formatINR(Math.abs(day.closed.difference))}` : ", exactly right"}.
                  {day.closed.notes ? ` ${day.closed.notes}` : ""}
                </Alert>
              ) : (
                <>
                  <Field label="Cash counted (₹)" htmlFor="day-counted">
                    <Input id="day-counted" inputMode="decimal" value={counted} onChange={(event) => setCounted(event.target.value)} className="tabular-nums" />
                  </Field>
                  {difference !== null && (
                    <p className={`text-sm font-semibold ${difference === 0 ? "text-ok" : "text-warn"}`}>
                      {difference === 0 ? "The drawer matches." : `${difference > 0 ? "Over" : "Short"} by ${formatINR(Math.abs(difference))}. Explain it below.`}
                    </p>
                  )}
                  <Field label="Notes" htmlFor="day-notes">
                    <Input id="day-notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
                  </Field>
                  {error && <Alert tone="risk">{error}</Alert>}
                  <Button loading={busy} disabled={counted === "" || (difference !== 0 && !notes.trim())} onClick={close} className="justify-self-start">
                    Close the day
                  </Button>
                </>
              )}
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}
