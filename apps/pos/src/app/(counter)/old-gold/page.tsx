"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, Coins, Printer, Scale, ShieldCheck, UserRound, Wallet } from "lucide-react";
import { errorMessage, useApi, useBranch, useResource } from "@webfudge/auth/components";
import { CASH_PAYOUT_LIMIT } from "@webfudge/config";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Field,
  Input,
  KpiCard,
  MissingHints,
  PageHeader,
  ResultsCount,
  Spinner,
  Table,
  Tabs,
  Td,
  Th,
  ToolbarActions,
  ToolbarExport,
  ToolbarSearch,
  Tr,
  buttonClass,
} from "@webfudge/ui";
import { PAYMENT_MODE_LABELS, type Customer, type OldGoldLine, type OldGoldRecord, type OldGoldSummary } from "@webfudge/utils/api";
import { downloadCsv } from "@webfudge/utils/csv";
import { formatDateTime, formatINR, formatWeight } from "@webfudge/utils/formatters";
import { CashOverrideNotice, useCashOverride } from "@/components/cash-override";
import { CustomerPicker } from "@/components/customer-picker";
import { OldGoldEditor, newOldGoldRow, toOldGold, type OldGoldRow } from "@/components/old-gold-lines";
import { PaymentsEditor, newPaymentRow, paidPaise, toPayments, type PaymentRow } from "@/components/payments";

type View = "all" | "purchase" | "exchange";

const fineOf = (record: OldGoldRecord, metal: "gold" | "silver") => record.lines.filter((line) => line.metal === metal).reduce((sum, line) => sum + line.fineWeight, 0);

export default function OldGoldPage() {
  const api = useApi();
  const router = useRouter();
  const { branch } = useBranch();
  const history = useResource<{ data: OldGoldRecord[]; meta?: { summary?: OldGoldSummary } }>("/sales/old-gold?summary=true");
  const summary = history.data?.meta?.summary;
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [rows, setRows] = useState<OldGoldRow[]>(() => [newOldGoldRow()]);
  const [idProof, setIdProof] = useState("");
  const [payouts, setPayouts] = useState<PaymentRow[]>(() => [newPaymentRow("bank_transfer")]);
  const [valuation, setValuation] = useState<{ lines: OldGoldLine[]; total: number } | null>(null);
  const [valueError, setValueError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>("all");
  const [q, setQ] = useState("");
  const cashPaise = payouts.filter((row) => row.mode === "cash").reduce((sum, row) => sum + Math.round((Number(row.amount) || 0) * 100), 0);
  const override = useCashOverride(cashPaise / 100);

  const lines = useMemo(() => toOldGold(rows), [rows]);

  // A changed payout makes any earlier refusal stale: clear it, and the cash warning with it.
  function changePayouts(next: PaymentRow[]) {
    setPayouts(next);
    setError(null);
    override.reset();
  }

  // The server values the metal at today's rate as soon as it is weighed and tested.
  useEffect(() => {
    if (!lines.length) return;
    let active = true;
    const timer = window.setTimeout(() => {
      api
        .post<{ data: { lines: OldGoldLine[]; total: number } }>("/sales/old-gold/quote", { lines })
        .then(({ data }) => {
          if (!active) return;
          setValuation(data);
          setValueError(null);
        })
        .catch((cause) => active && setValueError(errorMessage(cause)));
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [api, lines]);

  const shown = lines.length ? valuation : null;
  const left = shown ? Math.round(shown.total * 100) - paidPaise(payouts) : 0;
  const fineGold = shown?.lines.filter((line) => line.metal === "gold").reduce((sum, line) => sum + line.fineWeight, 0) ?? 0;
  const fineSilver = shown?.lines.filter((line) => line.metal === "silver").reduce((sum, line) => sum + line.fineWeight, 0) ?? 0;
  // Everything still needed before the purchase can be recorded, said plainly next to the button.
  const missing = [
    !customer && "Choose who is selling.",
    idProof.trim().length < 4 && "Enter their ID proof, like Aadhaar ending 1234.",
    left > 0 && `Payments are ${formatINR(left / 100)} short of the total.`,
    left < 0 && `Payments are ${formatINR(-left / 100)} more than the total.`,
    override.blocking && "Approve the cash above, or pay part of it by UPI or bank transfer.",
  ];

  async function save() {
    if (!branch || !shown) return;
    setBusy(true);
    setError(null);
    try {
      const { data } = await api.post<{ data: OldGoldRecord }>("/sales/old-gold", {
        branchId: branch.id,
        customerId: customer?.id,
        lines,
        idProof,
        payouts: toPayments(payouts),
        ...(override.value ? { cashOverride: override.value } : {}),
      });
      // Straight to the receipt, ready to print.
      router.push(`/old-gold/${data.id}?new=1`);
    } catch (cause) {
      if (!override.catchLimit(cause)) setError(errorMessage(cause));
      setBusy(false);
    }
  }

  const all = history.data?.data ?? [];
  const purchases = all.filter((record) => record.kind === "purchase");
  const exchanges = all.filter((record) => record.kind === "exchange");
  const inView = view === "purchase" ? purchases : view === "exchange" ? exchanges : all;
  const needle = q.trim().toLowerCase();
  const records = inView.filter(
    (record) =>
      !needle ||
      [record.number, record.customer?.name, record.customer?.phone, record.invoice?.number, record.idProof, ...record.lines.map((line) => line.description)].some((value) => value?.toLowerCase().includes(needle)),
  );

  function exportCsv() {
    downloadCsv(`old-gold-${new Date().toISOString().slice(0, 10)}`, [
      ["Number", "Date", "Type", "Invoice", "Seller", "Mobile", "ID proof", "Items", "Fine gold (g)", "Fine silver (g)", "Value", "Paid by", "By"],
      ...records.map((record) => [
        record.number,
        record.createdAt.slice(0, 10),
        record.kind === "exchange" ? "Against a bill" : "Bought outright",
        record.invoice?.number,
        record.customer?.name,
        record.customer?.phone,
        record.idProof,
        record.lines.map((line) => line.description).join("; "),
        fineOf(record, "gold").toFixed(3),
        fineOf(record, "silver").toFixed(3),
        record.totalValue,
        record.payouts.map((payout) => PAYMENT_MODE_LABELS[payout.mode]).join(" + "),
        record.by,
      ]),
    ]);
  }

  return (
    <div className="grid gap-6">
      <PageHeader title="Old gold" description="Buy old gold or silver outright. Old gold taken against a bill is entered on the bill itself." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard compact title="Bought today" value={summary ? formatINR(summary.valueToday) : "–"} icon={Wallet} tone="navy" subtitle={summary ? `${summary.boughtToday} ${summary.boughtToday === 1 ? "purchase" : "purchases"}` : " "} />
        <KpiCard compact title="Fine gold this month" value={summary ? formatWeight(summary.goldFineMonth) : "–"} icon={Scale} tone="gold" subtitle="Bought and taken against bills" />
        <KpiCard compact title="Fine silver this month" value={summary ? formatWeight(summary.silverFineMonth) : "–"} icon={Scale} subtitle="Bought and taken against bills" />
        <KpiCard
          compact
          title="Value this month"
          value={summary ? formatINR(summary.valueMonth) : "–"}
          icon={CalendarDays}
          tone="ok"
          subtitle={summary ? `${summary.recordsMonth} records, ${summary.exchangesMonth} against bills` : " "}
        />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader icon={Scale} title="What they are selling" description="Valued at today's 24KT (or 999 silver) rate on the tested purity, less the shop's deduction." />
          <CardBody className="grid gap-3">
            <OldGoldEditor rows={rows} onChange={setRows} valued={shown?.lines} />
            {valueError && <Alert tone="risk">{valueError}</Alert>}
          </CardBody>
        </Card>

        <div className="grid gap-6 lg:col-span-2">
          <Card>
            <CardHeader icon={UserRound} title="Seller" />
            <CardBody className="grid gap-4">
              <CustomerPicker value={customer} onChange={setCustomer} />
              <Field label="ID proof" htmlFor="og-id" hint="Required for every purchase, like Aadhaar ending 1234.">
                <Input
                  id="og-id"
                  value={idProof}
                  onChange={(event) => setIdProof(event.target.value)}
                  placeholder="Aadhaar ending 1234"
                  className={shown && idProof.trim().length < 4 ? "border-warn ring-2 ring-warn/20" : undefined}
                />
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader icon={Wallet} title="Pay the seller" />
            <CardBody className="grid gap-4">
              {shown ? (
                <>
                  <div className="grid gap-1 rounded-xl bg-navy px-4 py-3 text-white">
                    <span className="text-[12px] font-semibold tracking-wide text-white/70 uppercase">To pay</span>
                    <span className="text-2xl font-bold tabular-nums">{formatINR(shown.total)}</span>
                    <span className="text-[12px] text-white/75 tabular-nums">
                      {[fineGold > 0 && `${formatWeight(fineGold)} fine gold`, fineSilver > 0 && `${formatWeight(fineSilver)} fine silver`].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                  <PaymentsEditor rows={payouts} onChange={changePayouts} due={shown.total} label="Paid by" />
                  <CashOverrideNotice state={override} />
                  {error && <Alert tone="risk">{error}</Alert>}
                  <Button variant="gold" onClick={save} loading={busy} disabled={missing.some(Boolean)} className="justify-self-start">
                    <ShieldCheck className="size-4" aria-hidden />
                    {override.value ? "Approve cash and record purchase" : "Record purchase and pay"}
                  </Button>
                  <MissingHints items={missing} />
                  {!override.limit && <p className="text-[12px] text-ash">Cash up to {formatINR(CASH_PAYOUT_LIMIT)} goes straight through. Above that, the owner or a branch manager approves it right here.</p>}
                </>
              ) : (
                <div className="grid place-items-center gap-1 rounded-xl border border-dashed border-gray-200 px-4 py-6 text-center">
                  <Coins className="size-6 text-ash" aria-hidden />
                  <p className="text-[13px] font-semibold text-ink">Weigh the items first</p>
                  <p className="text-[12px] text-ash">Enter the gross weight and tested purity. The amount to pay appears here.</p>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      <Tabs<View>
        label="Old gold records"
        active={view}
        onChange={setView}
        tabs={[
          { key: "all", label: "All", count: all.length },
          { key: "purchase", label: "Bought outright", count: purchases.length },
          { key: "exchange", label: "Against bills", count: exchanges.length },
        ]}
        actions={
          <ToolbarActions>
            <ToolbarSearch value={q} onChange={setQ} placeholder="Number, seller, mobile or item…" />
            <ToolbarExport onExport={exportCsv} />
          </ToolbarActions>
        }
      />
      {history.data && <ResultsCount shown={records.length} total={inView.length} noun="record" />}

      <Card className="overflow-hidden">
        {history.loading && !history.data ? (
          <div className="grid place-items-center p-10 text-navy">
            <Spinner />
          </div>
        ) : history.error ? (
          <p className="p-5 text-[13px] text-risk">{history.error}</p>
        ) : !records.length ? (
          <EmptyState icon={Coins} title={q ? "Nothing matches" : "No old gold yet"} description={q ? "Try another number, name or item." : "Purchases you record here, and old gold taken on bills, are listed here."} />
        ) : (
          <Table minWidth={980}>
            <thead>
              <tr>
                <Th>Number</Th>
                <Th>Seller</Th>
                <Th>Items</Th>
                <Th align="right">Fine weight</Th>
                <Th align="right">Value</Th>
                <Th>When</Th>
                <Th>
                  <span className="sr-only">Receipt</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => {
                const gold = fineOf(record, "gold");
                const silver = fineOf(record, "silver");
                return (
                  <Tr key={record.id} className="cursor-pointer" onClick={() => router.push(`/old-gold/${record.id}`)}>
                    <Td>
                      <Link href={`/old-gold/${record.id}`} className="grid leading-tight" onClick={(event) => event.stopPropagation()}>
                        <span className="font-mono font-semibold text-ink hover:underline">{record.number}</span>
                        <Badge tone={record.kind === "exchange" ? "navy" : "gold"} className="mt-1 justify-self-start">
                          {record.kind === "exchange" ? `Against ${record.invoice?.number ?? "a bill"}` : "Bought"}
                        </Badge>
                      </Link>
                    </Td>
                    <Td>
                      <span className="grid leading-tight">
                        <span className="font-semibold text-ink">{record.customer?.name ?? "—"}</span>
                        <span className="text-[12px] text-ash tabular-nums">{record.customer?.phone}</span>
                      </span>
                    </Td>
                    <Td className="max-w-[240px]">
                      <span className="line-clamp-2 text-[13px]">{record.lines.map((line) => line.description).join(", ")}</span>
                    </Td>
                    <Td align="right" className="tabular-nums">
                      <span className="grid leading-tight">
                        {gold > 0 && <span className="font-semibold text-ink">{formatWeight(gold)}</span>}
                        {silver > 0 && <span className={gold > 0 ? "text-[12px] text-ash" : "font-semibold text-ink"}>{formatWeight(silver)} silver</span>}
                      </span>
                    </Td>
                    <Td align="right">
                      <span className="grid leading-tight">
                        <span className="font-semibold text-ink">{formatINR(record.totalValue)}</span>
                        {record.payouts.length > 0 && <span className="text-[11.5px] text-ash">{record.payouts.map((payout) => PAYMENT_MODE_LABELS[payout.mode]).join(" + ")}</span>}
                      </span>
                    </Td>
                    <Td className="whitespace-nowrap">
                      <span className="grid leading-tight">
                        <span>{formatDateTime(record.createdAt)}</span>
                        {record.by && <span className="text-[12px] text-ash">by {record.by}</span>}
                      </span>
                    </Td>
                    <Td align="right">
                      <Link href={`/old-gold/${record.id}`} className={buttonClass("secondary", "sm")} onClick={(event) => event.stopPropagation()}>
                        <Printer className="size-3.5" aria-hidden />
                        Receipt
                      </Link>
                    </Td>
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
