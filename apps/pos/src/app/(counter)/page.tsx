"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, ClipboardList, Coins, CreditCard, Gem, IndianRupee, ReceiptText, RotateCcw, ScanBarcode, Trash2, UserRound, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { errorMessage, useApi, useBranch } from "@webfudge/auth/components";
import { Alert, Badge, Button, Card, CardBody, CardHeader, Field, Input, MissingHints, PageHeader, ScanInput, Spinner, Table, Td, Th, Tr, buttonClass, cn, type ScanSuggestion } from "@webfudge/ui";
import type { Customer, CustomerDetail, Estimate, Invoice, Quote, StockItem } from "@webfudge/utils/api";
import { ITEM_STATUS_LABELS } from "@webfudge/utils/api";
import { formatINR, formatWeight } from "@webfudge/utils/formatters";
import { CustomerPicker } from "@/components/customer-picker";
import { mediaUrl } from "@/lib/env";
import { OldGoldEditor, toOldGold, type OldGoldRow } from "@/components/old-gold-lines";
import { PaymentsEditor, newPaymentRow, paidPaise, toPayments, type PaymentRow } from "@/components/payments";

type Piece = { id: number; tagNumber: string };

function Row({ label, value, strong, tone }: { label: string; value: number; strong?: boolean; tone?: "minus" }) {
  return (
    <div className={`flex justify-between gap-4 py-1 tabular-nums ${strong ? "border-t border-line pt-2 text-base font-semibold text-navy" : "text-[13.5px]"}`}>
      <span className={strong ? "" : "text-ash"}>{label}</span>
      <span>{tone === "minus" && value ? `− ${formatINR(value)}` : formatINR(value)}</span>
    </div>
  );
}

export default function NewBillPage({ searchParams }: { searchParams: Promise<{ estimate?: string; customer?: string }> }) {
  const { estimate: estimateParam, customer: customerParam } = use(searchParams);
  const router = useRouter();
  const api = useApi();
  const { branch } = useBranch();

  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [bookingIds, setBookingIds] = useState<number[]>([]);
  const [creditNoteIds, setCreditNoteIds] = useState<number[]>([]);
  const [discounts, setDiscounts] = useState<Record<number, string>>({});
  const [oldGold, setOldGold] = useState<OldGoldRow[]>([]);
  const [idProof, setIdProof] = useState("");
  const [payments, setPayments] = useState<PaymentRow[]>(() => [newPaymentRow()]);
  const [notes, setNotes] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [issueError, setIssueError] = useState<string | null>(null);
  const [issuing, setIssuing] = useState(false);

  // Opening an estimate from the queue loads its pieces and customer.
  useEffect(() => {
    if (!estimateParam) return;
    let active = true;
    api
      .get<{ data: Estimate }>(`/sales/estimates/${estimateParam}`)
      .then(async ({ data }) => {
        if (!active) return;
        setEstimate(data);
        setPieces(data.lines.map((line) => ({ id: line.itemId, tagNumber: line.tagNumber })));
        if (data.customer) setCustomer((await api.get<{ data: Customer }>(`/sales/customers/${data.customer.id}`)).data);
      })
      .catch((cause) => active && setScanError(errorMessage(cause)));
    return () => {
      active = false;
    };
  }, [api, estimateParam]);

  // "Start a bill" from a customer's page opens the bill with them already chosen.
  useEffect(() => {
    if (!customerParam || estimateParam) return;
    let active = true;
    api
      .get<{ data: Customer }>(`/sales/customers/${customerParam}`)
      .then(({ data }) => active && setCustomer(data))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [api, customerParam, estimateParam]);

  useEffect(() => {
    if (!customer) return;
    let active = true;
    api
      .get<{ data: CustomerDetail }>(`/sales/customers/${customer.id}`)
      .then(({ data }) => active && setDetail(data))
      .catch(() => active && setDetail(null));
    return () => {
      active = false;
    };
  }, [api, customer]);

  const request = useMemo(
    () => ({
      branchId: branch?.id,
      customerId: customer?.id ?? null,
      estimateId: estimate?.id ?? null,
      itemIds: pieces.map((piece) => piece.id),
      discounts: Object.fromEntries(Object.entries(discounts).filter(([, value]) => Number(value) > 0).map(([id, value]) => [id, Number(value)])),
      bookingIds: customer ? bookingIds : [],
      creditNoteIds: customer ? creditNoteIds : [],
      oldGold: toOldGold(oldGold),
    }),
    [branch, customer, estimate, pieces, discounts, bookingIds, creditNoteIds, oldGold],
  );

  // Ask the server to price the bill whenever anything on it changes.
  useEffect(() => {
    if (!request.branchId || !request.itemIds.length) return;
    let active = true;
    const timer = window.setTimeout(() => {
      api
        .post<{ data: Quote }>("/sales/quote", request)
        .then(({ data }) => {
          if (!active) return;
          setQuote(data);
          setQuoteError(null);
        })
        .catch((cause) => active && setQuoteError(errorMessage(cause)));
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [api, request]);

  const shownQuote = pieces.length ? quote : null;

  /** Pieces at this branch matching what is typed (tag, old tag, HUID or design), for the scan box. */
  async function findPieces(query: string): Promise<ScanSuggestion[]> {
    if (!branch) return [];
    const { data } = await api.get<{ data: StockItem[] }>(`/stock/items?branchId=${branch.id}&pageSize=8&q=${encodeURIComponent(query)}`);
    return data.map((item) => {
      const photo = item.photos?.[0] ?? item.design?.image ?? null;
      const onBill = pieces.some((piece) => piece.id === item.id);
      const reservedElsewhere = item.status === "reserved" && !estimate?.lines.some((line) => line.itemId === item.id);
      const sellable = ["in_stock", "with_staff", "reserved"].includes(item.status) && !reservedElsewhere;
      return {
        code: item.tagNumber,
        title: item.tagNumber,
        detail: [item.design?.name, item.purity, formatWeight(item.netWeight), item.location?.fullCode].filter(Boolean).join(" · "),
        aside: onBill ? "On this bill" : !sellable ? (reservedElsewhere ? "On another estimate" : ITEM_STATUS_LABELS[item.status]) : item.status === "with_staff" ? "With salesperson" : undefined,
        imageUrl: photo ? mediaUrl(photo.thumbnailUrl) : null,
        disabled: onBill || !sellable,
      };
    });
  }

  async function scan(code: string) {
    setScanError(null);
    try {
      const { data } = await api.get<{ data: StockItem }>(`/stock/items/lookup?code=${encodeURIComponent(code)}`);
      if (data.branch?.id !== branch?.id) return setScanError(`${data.tagNumber} is at ${data.branch?.name}.`);
      setPieces((current) => (current.some((piece) => piece.id === data.id) ? current : [...current, { id: data.id, tagNumber: data.tagNumber }]));
    } catch (cause) {
      setScanError(errorMessage(cause));
    }
  }

  function reset() {
    setEstimate(null);
    setPieces([]);
    setCustomer(null);
    setDetail(null);
    setBookingIds([]);
    setCreditNoteIds([]);
    setDiscounts({});
    setOldGold([]);
    setIdProof("");
    setPayments([newPaymentRow()]);
    setNotes("");
    setQuote(null);
    setQuoteError(null);
    setIssueError(null);
    if (estimateParam) router.replace("/");
  }

  async function issue() {
    if (!shownQuote) return;
    setIssuing(true);
    setIssueError(null);
    try {
      const { data } = await api.post<{ data: Invoice }>("/sales/invoices", { ...request, payments: toPayments(payments), notes, idProof });
      router.push(`/invoices/${data.id}?new=1`);
    } catch (cause) {
      setIssueError(errorMessage(cause));
      setIssuing(false);
    }
  }

  const due = shownQuote?.amountDue ?? 0;
  const balanced = !!shownQuote && paidPaise(payments) === Math.round(due * 100);
  const cash = toPayments(payments).filter((payment) => payment.mode === "cash").reduce((sum, payment) => sum + payment.amount, 0);
  const overCash = !!shownQuote && cash > shownQuote.cashAllowed;
  const canIssue = !!shownQuote && !!customer && balanced && !shownQuote.panMissing && !overCash && !quoteError && (!oldGold.length || idProof.trim().length > 3);


  const netTotal = shownQuote ? shownQuote.lines.reduce((sum, line) => sum + line.netWeight, 0) : 0;
  const missing = [
    !customer && "Choose the customer.",
    !pieces.length && "Scan at least one piece.",
    shownQuote?.panMissing && "Add the customer's PAN: their purchases today reach ₹2 lakh.",
    oldGold.length > 0 && idProof.trim().length <= 3 && "Enter the seller's ID proof for the old gold.",
    shownQuote && !balanced && (paidPaise(payments) < Math.round(due * 100) ? `Payments are ${formatINR(due - paidPaise(payments) / 100)} short.` : `Payments are ${formatINR(paidPaise(payments) / 100 - due)} more than due.`),
    overCash && "Take less cash: the ₹2 lakh daily cash limit for one customer would be crossed.",
  ];
  const steps = [
    { label: "Customer", icon: UserRound, done: !!customer, note: customer?.name.replace(/^Demo\s*[–-]\s*/, "") },
    { label: "Pieces", icon: ScanBarcode, done: pieces.length > 0, note: pieces.length ? `${pieces.length} ${pieces.length === 1 ? "piece" : "pieces"}` : undefined },
    { label: "Old gold", icon: Coins, done: oldGold.length > 0, note: oldGold.length ? `${oldGold.length} ${oldGold.length === 1 ? "line" : "lines"}` : "If any", optional: true },
    { label: "Payment", icon: Wallet, done: balanced, note: shownQuote ? formatINR(due) : undefined },
  ];

  return (
    <div className="grid gap-6">
      <PageHeader
        title={estimate ? `Bill for ${estimate.number}` : "New bill"}
        description={estimate ? `Sent from the floor by ${estimate.salesperson ?? "a salesperson"}.` : "Scan the tags, or open an estimate sent from the showroom."}
        actions={
          <>
            <Link href="/estimates" className={buttonClass("secondary")}>
              <ClipboardList className="size-4" aria-hidden />
              Estimates queue
            </Link>
            {(pieces.length > 0 || customer) && (
              <Button variant="ghost" onClick={reset}>
                <RotateCcw className="size-4" aria-hidden />
                Start over
              </Button>
            )}
          </>
        }
      />

      <ol className="grid grid-cols-2 gap-2 rounded-2xl border border-gray-100 bg-white p-2 shadow-sm sm:grid-cols-4">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <li key={step.label} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5", step.done ? "bg-ok-soft/70" : "bg-gray-50")}>
              <span className={cn("grid size-9 shrink-0 place-items-center rounded-full", step.done ? "bg-ok text-white" : step.optional ? "bg-white text-gray-400 ring-1 ring-gray-200" : "bg-navy text-white")}>
                {step.done ? <Check className="size-4" aria-hidden /> : <Icon className="size-4" aria-hidden />}
              </span>
              <span className="grid min-w-0 leading-tight">
                <span className="text-[11px] font-semibold tracking-wide text-gray-500 uppercase">
                  {index + 1}. {step.label}
                </span>
                <span className={cn("truncate text-[13px]", step.done ? "font-semibold text-ink" : "text-ash")}>{step.note ?? "To do"}</span>
              </span>
            </li>
          );
        })}
      </ol>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="grid min-w-0 content-start gap-6">
          <Card>
            <CardHeader title={<StepTitle icon={UserRound} title="Customer" />} />
            <CardBody className="grid gap-4">
              <CustomerPicker
                value={customer}
                needPan={shownQuote?.panMissing}
                onChange={(next) => {
                  setCustomer(next);
                  setBookingIds([]);
                  setCreditNoteIds([]);
                  if (!next) setDetail(null);
                }}
              />
              {customer && detail && (detail.advances.length > 0 || detail.creditNotes.length > 0) && (
                <div className="grid gap-2">
                  <span className="text-[13px] font-semibold text-ink">Money on account: tick to use it on this bill</span>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {detail.advances.map((advance) => {
                      const on = bookingIds.includes(advance.id);
                      return (
                        <label key={advance.id} className={cn("flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors", on ? "border-navy bg-navy-soft" : "border-gray-200 hover:border-gray-300")}>
                          <input type="checkbox" className="mt-1 size-4 accent-navy" checked={on} onChange={(event) => setBookingIds((ids) => (event.target.checked ? [...ids, advance.id] : ids.filter((id) => id !== advance.id)))} />
                          <span className="grid gap-1 leading-tight">
                            <span className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
                              <Wallet className="size-3.5 text-gold" aria-hidden />
                              Advance {advance.number}
                            </span>
                            <span className="text-sm font-bold text-ok tabular-nums">{formatINR(advance.balance)}</span>
                            {advance.lockedPurity && advance.lockedRate && (
                              <Badge tone="gold">
                                {advance.lockedPurity} at {formatINR(advance.lockedRate)}/g for {formatWeight(advance.lockedWeightLeft ?? 0)}
                              </Badge>
                            )}
                          </span>
                        </label>
                      );
                    })}
                    {detail.creditNotes.map((note) => {
                      const on = creditNoteIds.includes(note.id);
                      return (
                        <label key={note.id} className={cn("flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors", on ? "border-navy bg-navy-soft" : "border-gray-200 hover:border-gray-300")}>
                          <input type="checkbox" className="mt-1 size-4 accent-navy" checked={on} onChange={(event) => setCreditNoteIds((ids) => (event.target.checked ? [...ids, note.id] : ids.filter((id) => id !== note.id)))} />
                          <span className="grid gap-1 leading-tight">
                            <span className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
                              <CreditCard className="size-3.5 text-gold" aria-hidden />
                              Credit note {note.number}
                            </span>
                            <span className="text-sm font-bold text-ok tabular-nums">{formatINR(note.balance)}</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardBody>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader title={<StepTitle icon={ScanBarcode} title="Pieces" />} description="Scan each tag. The bill is priced at today's rate." />
            <CardBody className="grid gap-3">
              <ScanInput id="bill-scan" onScan={scan} onSearch={findPieces} autoFocus={!estimateParam} placeholder="Scan a tag, or type part of a tag or design name" />
              {scanError && <Alert tone="risk">{scanError}</Alert>}
              {!pieces.length && (
                <div className="grid justify-items-center gap-2 rounded-xl border border-dashed border-gray-200 bg-gray-50/60 px-6 py-8 text-center">
                  <span className="grid size-12 place-items-center rounded-full bg-white text-navy shadow-sm">
                    <ScanBarcode className="size-6" aria-hidden />
                  </span>
                  <p className="font-semibold text-ink">No pieces yet</p>
                  <p className="max-w-sm text-[13px] text-ash">Scan the tag with the reader, or type part of the tag or the design name and pick from the list.</p>
                </div>
              )}
            </CardBody>
            {pieces.length > 0 && (
              <Table minWidth={900}>
                <thead>
                  <tr>
                    <Th>Piece</Th>
                    <Th align="right">Net wt</Th>
                    <Th align="right">Rate/g</Th>
                    <Th align="right">Metal</Th>
                    <Th align="right">Making</Th>
                    <Th>Discount ₹</Th>
                    <Th align="right">Stones + HM</Th>
                    <Th align="right">With GST</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody>
                  {pieces.map((piece) => {
                    const line = shownQuote?.lines.find((entry) => entry.itemId === piece.id);
                    return (
                      <Tr key={piece.id}>
                        <Td>
                          <span className="flex items-center gap-3">
                            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-gold-soft text-gold-deep">
                              <Gem className="size-4" aria-hidden />
                            </span>
                            <span className="grid leading-tight">
                              <span className="font-mono font-semibold text-ink">{piece.tagNumber}</span>
                              {line && (
                                <span className="text-[12px] text-ash">
                                  {line.description} · {line.purity}
                                  {line.huid ? ` · HUID ${line.huid}` : ""}
                                </span>
                              )}
                            </span>
                          </span>
                        </Td>
                        <Td align="right">{line ? formatWeight(line.netWeight) : "—"}</Td>
                        <Td align="right">
                          {line ? formatINR(line.ratePerGram) : "—"}
                          {line && line.lockedGrams > 0 && <span className="block text-[11px] text-gold-deep">{formatWeight(line.lockedGrams)} at booked rate</span>}
                        </Td>
                        <Td align="right">{line ? formatINR(line.metalValue) : "—"}</Td>
                        <Td align="right">{line ? formatINR(line.makingCharge) : "—"}</Td>
                        <Td>
                          <Input
                            id={`discount-${piece.id}`}
                            aria-label={`Discount on making for ${piece.tagNumber}`}
                            inputMode="decimal"
                            value={discounts[piece.id] ?? ""}
                            onChange={(event) => setDiscounts((all) => ({ ...all, [piece.id]: event.target.value }))}
                            placeholder="0"
                            className="h-8 w-24 tabular-nums"
                          />
                        </Td>
                        <Td align="right">{line ? formatINR(line.stoneValue + line.otherCharges) : "—"}</Td>
                        <Td align="right" className="font-semibold text-ink">
                          {line ? formatINR(line.total) : "—"}
                        </Td>
                        <Td>
                          <button
                            type="button"
                            className="grid size-8 place-items-center rounded-full text-gray-400 hover:bg-risk-soft hover:text-risk"
                            aria-label={`Remove ${piece.tagNumber}`}
                            title="Remove from the bill"
                            onClick={() => setPieces((current) => current.filter((entry) => entry.id !== piece.id))}
                          >
                            <Trash2 className="size-4" aria-hidden />
                          </button>
                        </Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </Table>
            )}
            {shownQuote && <p className="border-t border-gray-100 px-5 py-3 text-[12px] text-ash">Your role can give up to {shownQuote.discountLimitPercent}% off making.</p>}
          </Card>

          <Card>
            <CardHeader title={<StepTitle icon={Coins} title="Old gold in exchange" />} description="Optional. Weigh it, test it, and enter the tester's reading. Valued at today's 24KT rate less the shop's deduction." />
            <CardBody className="grid gap-4">
              <OldGoldEditor rows={oldGold} onChange={setOldGold} values={shownQuote?.oldGold.lines.map((line) => line.value)} />
              {oldGold.length > 0 && (
                <Field label="Seller's ID proof" htmlFor="bill-id-proof" hint="Required when taking old gold, like Aadhaar ending 1234.">
                  <Input id="bill-id-proof" value={idProof} onChange={(event) => setIdProof(event.target.value)} placeholder="Aadhaar ending 1234" />
                </Field>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="grid min-w-0 content-start gap-4 xl:sticky xl:top-20">
          <Card className="overflow-hidden">
            <CardHeader title={<StepTitle icon={ReceiptText} title="Bill" />} description={pieces.length ? `${pieces.length} ${pieces.length === 1 ? "piece" : "pieces"}${netTotal ? `, ${formatWeight(netTotal)} net` : ""}` : undefined} />
            <CardBody className="grid gap-1">
              {!pieces.length ? (
                <p className="text-[13px] text-ash">Scan a piece to start.</p>
              ) : !shownQuote ? (
                quoteError ? <Alert tone="risk">{quoteError}</Alert> : <Spinner className="text-navy" />
              ) : (
                <>
                  {quoteError && <Alert tone="risk" className="mb-2">{quoteError}</Alert>}
                  {shownQuote.warnings.map((warning) => (
                    <Alert key={warning} tone="warn" className="mb-2">
                      {warning}
                    </Alert>
                  ))}
                  <Row label="Taxable value" value={shownQuote.taxableValue} />
                  <Row label="CGST 1.5%" value={shownQuote.cgst} />
                  <Row label="SGST 1.5%" value={shownQuote.sgst} />
                  <Row label="Round off" value={shownQuote.roundOff} />
                  <Row label="Invoice total" value={shownQuote.total} strong />
                  {shownQuote.oldGold.value > 0 && <Row label="Old gold" value={shownQuote.oldGold.value} tone="minus" />}
                  {shownQuote.creditNoteUsed > 0 && <Row label="Credit notes" value={shownQuote.creditNoteUsed} tone="minus" />}
                  {shownQuote.advanceUsed > 0 && <Row label="Advances" value={shownQuote.advanceUsed} tone="minus" />}
                  <div className="mt-3 flex items-center justify-between rounded-xl bg-navy px-4 py-3 text-white">
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <IndianRupee className="size-4 text-gold" aria-hidden />
                      To collect
                    </span>
                    <span className="text-2xl font-bold tabular-nums">{formatINR(shownQuote.amountDue)}</span>
                  </div>
                  {shownQuote.panMissing && (
                    <Alert tone="warn" className="mt-2" title="PAN needed">
                      This customer&apos;s purchases today reach ₹2 lakh. Add their PAN above.
                    </Alert>
                  )}
                </>
              )}
            </CardBody>
          </Card>

          {shownQuote && (
            <Card>
              <CardHeader title={<StepTitle icon={Wallet} title="Payment" />} />
              <CardBody className="grid gap-4">
                <PaymentsEditor rows={payments} onChange={setPayments} due={due} />
                {overCash && (
                  <Alert tone="risk">
                    Cash from one customer must stay under ₹2 lakh a day. At most {formatINR(shownQuote.cashAllowed)} more in cash.
                  </Alert>
                )}
                <Field label="Note on the invoice" htmlFor="bill-notes">
                  <Input id="bill-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional" />
                </Field>
                {issueError && <Alert tone="risk">{issueError}</Alert>}
                <Button size="lg" variant="gold" loading={issuing} disabled={!canIssue} onClick={issue}>
                  <ReceiptText className="size-4" aria-hidden />
                  Issue invoice
                </Button>
                <MissingHints items={missing} />
              </CardBody>
            </Card>
          )}
          {!shownQuote && <MissingHints items={missing} className="px-1" />}
        </div>
      </div>
    </div>
  );
}

/** A step card's title: a gold icon tile and the name. */
function StepTitle({ icon: Icon, title }: { icon: typeof UserRound; title: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="grid size-8 place-items-center rounded-lg bg-navy-soft text-navy">
        <Icon className="size-4" aria-hidden />
      </span>
      {title}
    </span>
  );
}
