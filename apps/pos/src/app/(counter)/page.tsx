"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ClipboardList, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { errorMessage, useApi, useBranch } from "@webfudge/auth/components";
import { Alert, Badge, Button, Card, CardBody, CardHeader, Field, Input, PageHeader, ScanInput, Spinner, Table, Td, Th, Tr, buttonClass } from "@webfudge/ui";
import type { Customer, CustomerDetail, Estimate, Invoice, Quote, StockItem } from "@webfudge/utils/api";
import { formatINR, formatWeight } from "@webfudge/utils/formatters";
import { CustomerPicker } from "@/components/customer-picker";
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

export default function NewBillPage({ searchParams }: { searchParams: Promise<{ estimate?: string }> }) {
  const { estimate: estimateParam } = use(searchParams);
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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid min-w-0 content-start gap-6">
          <Card>
            <CardHeader title="Customer" />
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
                  <span className="text-[13px] font-semibold">Use towards this bill</span>
                  {detail.advances.map((advance) => (
                    <label key={advance.id} className="flex flex-wrap items-center gap-2 text-sm">
                      <input type="checkbox" checked={bookingIds.includes(advance.id)} onChange={(event) => setBookingIds((ids) => (event.target.checked ? [...ids, advance.id] : ids.filter((id) => id !== advance.id)))} />
                      Advance {advance.number}: {formatINR(advance.balance)}
                      {advance.lockedPurity && advance.lockedRate && (
                        <Badge tone="gold">
                          {advance.lockedPurity} booked at {formatINR(advance.lockedRate)}/g for {formatWeight(advance.lockedWeightLeft ?? 0)}
                        </Badge>
                      )}
                    </label>
                  ))}
                  {detail.creditNotes.map((note) => (
                    <label key={note.id} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={creditNoteIds.includes(note.id)} onChange={(event) => setCreditNoteIds((ids) => (event.target.checked ? [...ids, note.id] : ids.filter((id) => id !== note.id)))} />
                      Credit note {note.number}: {formatINR(note.balance)}
                    </label>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Pieces" description="Scan each tag. The bill is priced at today's rate." />
            <CardBody className="grid gap-3">
              <ScanInput id="bill-scan" onScan={scan} autoFocus={!estimateParam} />
              {scanError && <Alert tone="risk">{scanError}</Alert>}
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
                          <span className="grid leading-tight">
                            <span className="font-mono font-semibold">{piece.tagNumber}</span>
                            {line && (
                              <span className="text-[12px] text-ash">
                                {line.description} · {line.purity}
                                {line.huid ? ` · HUID ${line.huid}` : ""}
                              </span>
                            )}
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
                            className="h-8 w-24 tabular-nums"
                          />
                        </Td>
                        <Td align="right">{line ? formatINR(line.stoneValue + line.otherCharges) : "—"}</Td>
                        <Td align="right" className="font-semibold">
                          {line ? formatINR(line.total) : "—"}
                        </Td>
                        <Td>
                          <button type="button" className="text-[12px] text-ash hover:text-risk" onClick={() => setPieces((current) => current.filter((entry) => entry.id !== piece.id))}>
                            Remove
                          </button>
                        </Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </Table>
            )}
            {shownQuote && <p className="px-4 pb-3 text-[12px] text-ash">Your role can give up to {shownQuote.discountLimitPercent}% off making.</p>}
          </Card>

          <Card>
            <CardHeader title="Old gold in exchange" description="Weigh it, test it, and enter the tester's reading. Valued at today's 24KT rate less the shop's deduction." />
            <CardBody className="grid gap-4">
              <OldGoldEditor rows={oldGold} onChange={setOldGold} values={shownQuote?.oldGold.lines.map((line) => line.value)} />
              {oldGold.length > 0 && (
                <Field label="Seller's ID proof" htmlFor="bill-id-proof" hint="Required when taking old gold, like Aadhaar ending 1234.">
                  <Input id="bill-id-proof" value={idProof} onChange={(event) => setIdProof(event.target.value)} />
                </Field>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="grid min-w-0 content-start gap-4 xl:sticky xl:top-20">
          <Card>
            <CardHeader title="Bill" />
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
                  <Row label="To collect" value={shownQuote.amountDue} strong />
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
              <CardBody className="grid gap-4">
                <PaymentsEditor rows={payments} onChange={setPayments} due={due} />
                {overCash && (
                  <Alert tone="risk">
                    Cash from one customer must stay under ₹2 lakh a day. At most {formatINR(shownQuote.cashAllowed)} more in cash.
                  </Alert>
                )}
                <Field label="Note on the invoice" htmlFor="bill-notes">
                  <Input id="bill-notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
                </Field>
                {issueError && <Alert tone="risk">{issueError}</Alert>}
                <Button size="lg" variant="gold" loading={issuing} disabled={!canIssue} onClick={issue}>
                  Issue invoice
                </Button>
                {!customer && <p className="text-[12px] text-ash">Choose the customer to issue the invoice.</p>}
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
