"use client";

import { useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  CircleCheckBig,
  Coins,
  CreditCard,
  Hammer,
  Landmark,
  LockKeyhole,
  ReceiptText,
  ScrollText,
  Smartphone,
  Wallet,
} from "lucide-react";
import { errorMessage, useApi, useBranch, useResource } from "@webfudge/auth/components";
import { Alert, Button, Card, CardBody, CardHeader, DetailHero, Field, HeroFact, Input, KpiCard, PageHeader, Spinner, StatusPill, cn } from "@webfudge/ui";
import { PAYMENT_MODE_LABELS, type DaySummary, type PaymentMode } from "@webfudge/utils/api";
import { formatDate, formatDateTime, formatINR } from "@webfudge/utils/formatters";

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
const shift = (date: string, days: number) => new Date(new Date(`${date}T12:00:00+05:30`).getTime() + days * 86400000).toISOString().slice(0, 10);

const MODE_ICONS: Record<PaymentMode, typeof Banknote> = { cash: Banknote, upi: Smartphone, card: CreditCard, bank_transfer: Landmark, cheque: ScrollText };
const NOTES = [500, 200, 100, 50, 20, 10, 5, 2, 1];

/** Counts the drawer note by note; the total goes into "cash counted". */
function DenominationCounter({ onTotal }: { onTotal: (total: number) => void }) {
  const [counts, setCounts] = useState<Record<number, string>>({});
  const total = NOTES.reduce((sum, value) => sum + value * (Number(counts[value]) || 0), 0);
  return (
    <div className="grid gap-3 rounded-xl border border-gray-200 bg-gray-50/70 p-4">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {NOTES.map((value) => (
          <label key={value} className="grid gap-1">
            <span className="text-[11.5px] font-semibold text-gray-500">
              ₹{value} {value >= 10 ? "notes" : "coins"}
            </span>
            <Input
              inputMode="numeric"
              value={counts[value] ?? ""}
              onChange={(event) => {
                const next = { ...counts, [value]: event.target.value.replace(/\D/g, "") };
                setCounts(next);
                onTotal(NOTES.reduce((sum, note) => sum + note * (Number(next[note]) || 0), 0));
              }}
              placeholder="0"
              className="h-9 tabular-nums"
            />
          </label>
        ))}
      </div>
      <p className="text-sm font-semibold text-ink tabular-nums">Counted: {formatINR(total)}</p>
    </div>
  );
}

export default function DayPage() {
  const api = useApi();
  const { branch } = useBranch();
  const [date, setDate] = useState(today);
  const summary = useResource<{ data: DaySummary }>(branch ? `/sales/day?branchId=${branch.id}&date=${date}` : null);
  const [counted, setCounted] = useState("");
  const [notes, setNotes] = useState("");
  const [counting, setCounting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const day = summary.data?.data;
  const isToday = date === today();

  const difference = counted === "" || !day ? null : Math.round((Number(counted) - day.expectedCash) * 100) / 100;
  const modes = Object.keys(PAYMENT_MODE_LABELS) as PaymentMode[];
  const totalIn = day ? modes.reduce((sum, mode) => sum + (day.in[mode] ?? 0), 0) : 0;
  const totalOut = day ? modes.reduce((sum, mode) => sum + (day.out[mode] ?? 0), 0) : 0;
  const widest = day ? Math.max(1, ...modes.map((mode) => Math.max(day.in[mode] ?? 0, day.out[mode] ?? 0))) : 1;

  function go(next: string) {
    setDate(next);
    setCounted("");
    setNotes("");
    setError(null);
  }

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
      <DetailHero
        icon={CalendarCheck}
        title={isToday ? "Today" : formatDate(date)}
        badges={
          day ? (
            day.closed ? (
              <StatusPill tone="ok" icon={LockKeyhole}>
                Closed
              </StatusPill>
            ) : (
              <StatusPill tone="gold">{isToday ? "Open · counter running" : "Not closed"}</StatusPill>
            )
          ) : null
        }
        meta={
          <>
            <HeroFact icon={CalendarCheck}>{new Date(`${date}T12:00:00+05:30`).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</HeroFact>
            {branch && <HeroFact icon={Landmark}>{branch.name}</HeroFact>}
            {day?.closed && <HeroFact icon={CircleCheckBig}>By {day.closed.closedBy ?? "staff"} at {formatDateTime(day.closed.at)}</HeroFact>}
          </>
        }
        stat={{ label: "Cash in the drawer", value: day ? formatINR(day.closed ? day.closed.countedCash : day.expectedCash) : "—", note: day?.closed ? "Counted at close" : "Should be there now" }}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" onClick={() => go(shift(date, -1))}>
          <ChevronLeft className="size-4" aria-hidden />
          Previous day
        </Button>
        <Input type="date" aria-label="Day" value={date} max={today()} onChange={(event) => event.target.value && go(event.target.value)} className="h-8 max-w-[170px] text-[13px]" />
        <Button variant="secondary" size="sm" disabled={isToday} onClick={() => go(shift(date, 1))}>
          Next day
          <ChevronRight className="size-4" aria-hidden />
        </Button>
        {!isToday && (
          <Button variant="ghost" size="sm" onClick={() => go(today())}>
            Back to today
          </Button>
        )}
      </div>

      {summary.loading && !day ? (
        <Spinner className="text-navy" />
      ) : !day ? (
        <p className="text-sm text-risk">{summary.error ?? "Could not load the day."}</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard compact title="Sales" value={formatINR(day.counts.salesTotal)} icon={ReceiptText} tone="gold" subtitle={`${day.counts.invoices} ${day.counts.invoices === 1 ? "bill" : "bills"}${day.counts.cancelled ? ` · ${day.counts.cancelled} cancelled` : ""}`} />
            <KpiCard compact title="Money in" value={formatINR(totalIn)} icon={ArrowDownLeft} tone="ok" subtitle="Every payment method" />
            <KpiCard compact title="Money out" value={formatINR(totalOut)} icon={ArrowUpRight} tone={totalOut ? "risk" : "navy"} subtitle="Old gold, refunds, payouts" />
            <KpiCard compact title="Cash expected" value={formatINR(day.expectedCash)} icon={Banknote} tone="navy" subtitle={`Opening ${formatINR(day.openingCash)}`} />
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-5">
            {[
              { label: "Old gold on bills", value: day.counts.oldGoldTaken, icon: Coins },
              { label: "Old gold bought", value: day.counts.oldGoldBought, icon: Coins },
              { label: "Advances taken", value: day.counts.advances, icon: Wallet },
              { label: "Scheme instalments", value: day.counts.schemeCollected ?? 0, icon: CalendarCheck },
              { label: "Repairs & orders", value: day.counts.ordersCollected ?? 0, icon: Hammer },
            ].map((entry) => (
              <div key={entry.label} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-navy-soft text-navy">
                  <entry.icon className="size-4" aria-hidden />
                </span>
                <span className="grid min-w-0 leading-tight">
                  <span className="font-semibold text-ink tabular-nums">{formatINR(entry.value)}</span>
                  <span className="truncate text-[12px] text-ash">{entry.label}</span>
                </span>
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <Card>
              <CardHeader title="By payment method" description={day.counts.cancelled ? `${day.counts.cancelled} bills were cancelled; their payments stay in until refunded.` : "What came in and went out, method by method."} />
              <CardBody className="grid gap-4">
                {modes.map((mode) => {
                  const Icon = MODE_ICONS[mode];
                  const taken = day.in[mode] ?? 0;
                  const paid = day.out[mode] ?? 0;
                  return (
                    <div key={mode} className="grid grid-cols-[150px_1fr] items-center gap-4">
                      <span className="flex items-center gap-2.5 font-semibold text-ink">
                        <span className="grid size-8 place-items-center rounded-lg bg-gray-100 text-gray-600">
                          <Icon className="size-4" aria-hidden />
                        </span>
                        {PAYMENT_MODE_LABELS[mode]}
                      </span>
                      <div className="grid gap-1.5">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 rounded-full bg-ok" style={{ width: `${Math.max(taken ? 3 : 0, (taken / widest) * 100)}%` }} />
                          <span className="text-[12.5px] text-ink tabular-nums">{formatINR(taken)} in</span>
                        </div>
                        {paid > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 rounded-full bg-risk/70" style={{ width: `${Math.max(3, (paid / widest) * 100)}%` }} />
                            <span className="text-[12.5px] text-ink tabular-nums">{formatINR(paid)} out</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardBody>
            </Card>

            <Card className="self-start">
              <CardHeader title="Cash drawer" description={day.closed ? "This day is closed." : "Count the drawer and close the day."} />
              <CardBody className="grid gap-4">
                <div className="grid gap-1.5 rounded-xl bg-gray-50 p-4 text-sm tabular-nums">
                  <div className="flex justify-between">
                    <span className="text-ash">Opening cash (last count)</span>
                    <span>{formatINR(day.openingCash)}</span>
                  </div>
                  <div className="flex justify-between text-ok">
                    <span>+ Cash taken</span>
                    <span>{formatINR(day.in.cash ?? 0)}</span>
                  </div>
                  <div className="flex justify-between text-risk">
                    <span>− Cash paid out</span>
                    <span>{formatINR(day.out.cash ?? 0)}</span>
                  </div>
                  <div className="mt-1 flex justify-between border-t border-gray-200 pt-2 text-base font-bold text-navy">
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
                      <Input id="day-counted" inputMode="decimal" value={counted} onChange={(event) => setCounted(event.target.value)} className="h-12 text-lg font-semibold tabular-nums" />
                    </Field>
                    <button type="button" onClick={() => setCounting((value) => !value)} className="justify-self-start text-[13px] font-semibold text-navy hover:underline">
                      {counting ? "Hide the note counter" : "Count note by note"}
                    </button>
                    {counting && <DenominationCounter onTotal={(total) => setCounted(total ? String(total) : "")} />}
                    {difference !== null && (
                      <p className={cn("rounded-lg px-3 py-2 text-sm font-semibold", difference === 0 ? "bg-ok-soft text-ok" : "bg-warn-soft text-warn")}>
                        {difference === 0 ? "The drawer matches." : `${difference > 0 ? "Over" : "Short"} by ${formatINR(Math.abs(difference))}. Explain it below.`}
                      </p>
                    )}
                    <Field label="Notes" htmlFor="day-notes">
                      <Input id="day-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder={difference ? "Why the drawer is over or short" : "Optional"} />
                    </Field>
                    {error && <Alert tone="risk">{error}</Alert>}
                    <Button size="lg" loading={busy} disabled={counted === "" || (difference !== 0 && !notes.trim())} onClick={close}>
                      <LockKeyhole className="size-4" aria-hidden />
                      Close the day
                    </Button>
                  </>
                )}
              </CardBody>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
