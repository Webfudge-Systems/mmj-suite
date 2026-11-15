"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Send, X } from "lucide-react";
import { Alert, Badge, Button, Card, CardBody, CardHeader, EmptyState, Field, Input, PageHeader, ScanInput, Spinner, Table, Tabs, Td, Textarea, Th, Tr, cn } from "@webfudge/ui";
import type { ApprovalMemo, Customer, StockItem } from "@webfudge/utils/api";
import { formatDate, formatWeight } from "@webfudge/utils/formatters";
import { errorMessage, useApi, useResource } from "@/lib/api";
import { useBranch } from "@/lib/branch";

type View = "open" | "closed" | "all";

/** Finds an existing customer by mobile number or name. */
function CustomerSearch({ value, onChange }: { value: Customer | null; onChange: (customer: Customer | null) => void }) {
  const api = useApi();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Customer[]>([]);

  useEffect(() => {
    if (value || query.trim().length < 2) return;
    let active = true;
    const timer = window.setTimeout(() => {
      api
        .get<{ data: Customer[] }>(`/sales/customers?pageSize=6&q=${encodeURIComponent(query.trim())}`)
        .then((result) => active && setResults(result.data))
        .catch(() => active && setResults([]));
    }, 200);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [api, query, value]);

  if (value) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-navy-line bg-navy-soft/40 px-4 py-2.5 text-sm">
        <span>
          <span className="font-semibold">{value.name}</span> · {value.phone}
        </span>
        <button type="button" onClick={() => onChange(null)} className="text-ash hover:text-ink" aria-label="Change customer">
          <X className="size-4" />
        </button>
      </div>
    );
  }
  return (
    <div className="grid gap-1.5">
      <Input id="approval-customer" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Mobile number or name" autoComplete="off" />
      {query.trim().length >= 2 && (
        <ul className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-md">
          {results.map((customer) => (
            <li key={customer.id}>
              <button type="button" onClick={() => onChange(customer)} className="flex w-full justify-between gap-3 px-4 py-2 text-left text-sm hover:bg-navy-soft/50">
                <span className="font-semibold">{customer.name}</span>
                <span className="text-ash tabular-nums">{customer.phone}</span>
              </button>
            </li>
          ))}
          {!results.length && <li className="px-4 py-2 text-[13px] text-ash">No customer found. Use a dealer name instead, or add them at the POS.</li>}
        </ul>
      )}
    </div>
  );
}

function NewMemo({ onSaved, onCancel }: { onSaved: (memo: ApprovalMemo) => void; onCancel: () => void }) {
  const api = useApi();
  const { branch } = useBranch();
  const [mode, setMode] = useState<"customer" | "dealer">("customer");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [partyName, setPartyName] = useState("");
  const [partyPhone, setPartyPhone] = useState("");
  const [dueBackOn, setDueBackOn] = useState("");
  const [note, setNote] = useState("");
  const [pieces, setPieces] = useState<StockItem[]>([]);
  const [scanError, setScanError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function scan(code: string) {
    setScanError(null);
    try {
      const { data } = await api.get<{ data: StockItem }>(`/stock/items/lookup?code=${encodeURIComponent(code)}`);
      if (data.branch?.id !== branch?.id) return setScanError(`${data.tagNumber} is at ${data.branch?.name}.`);
      if (data.status !== "in_stock") return setScanError(`${data.tagNumber} is ${data.status.replace("_", " ")}; only pieces in stock can go out.`);
      setPieces((current) => (current.some((piece) => piece.id === data.id) ? current : [...current, data]));
    } catch (cause) {
      setScanError(errorMessage(cause));
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { data } = await api.post<{ data: ApprovalMemo }>("/approvals", {
        branchId: branch?.id,
        ...(mode === "customer" ? { customerId: customer?.id } : { partyName, partyPhone }),
        codes: pieces.map((piece) => piece.tagNumber),
        dueBackOn: dueBackOn || null,
        note,
      });
      onSaved(data);
    } catch (cause) {
      setError(errorMessage(cause));
      setBusy(false);
    }
  }

  const net = pieces.reduce((sum, piece) => sum + piece.netWeight, 0);

  return (
    <Card>
      <CardHeader title="Send pieces on approval" description="For a customer choosing at home, or a dealer. The pieces leave the showroom tablets until they come back or are billed." />
      <CardBody>
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <div className="flex gap-2">
            {(["customer", "dealer"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                className={cn("rounded-lg border px-3 py-1.5 text-[13px] font-semibold", mode === value ? "border-transparent bg-navy text-white" : "border-gray-200 text-gray-700")}
              >
                {value === "customer" ? "A customer" : "A dealer or other shop"}
              </button>
            ))}
          </div>
          {mode === "customer" ? (
            <Field label="Customer" htmlFor="approval-customer">
              <CustomerSearch value={customer} onChange={setCustomer} />
            </Field>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name" htmlFor="party-name">
                <Input id="party-name" value={partyName} onChange={(event) => setPartyName(event.target.value)} />
              </Field>
              <Field label="Mobile" htmlFor="party-phone">
                <Input id="party-phone" inputMode="tel" value={partyPhone} onChange={(event) => setPartyPhone(event.target.value)} />
              </Field>
            </div>
          )}
          <Field label="Scan each piece going out" htmlFor="approval-scan">
            <ScanInput id="approval-scan" onScan={scan} autoFocus={false} />
          </Field>
          {scanError && <Alert tone="risk">{scanError}</Alert>}
          {pieces.length > 0 && (
            <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200">
              {pieces.map((piece) => (
                <li key={piece.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <span>
                    <span className="font-mono font-semibold">{piece.tagNumber}</span> · {piece.design?.name} · {piece.purity} · {formatWeight(piece.netWeight)}
                  </span>
                  <button type="button" onClick={() => setPieces((current) => current.filter((entry) => entry.id !== piece.id))} className="text-ash hover:text-risk" aria-label={`Remove ${piece.tagNumber}`}>
                    <X className="size-4" />
                  </button>
                </li>
              ))}
              <li className="px-4 py-2.5 text-[13px] text-ash">
                {pieces.length} {pieces.length === 1 ? "piece" : "pieces"} · {formatWeight(net)} net
              </li>
            </ul>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Due back on" htmlFor="due-back">
              <Input id="due-back" type="date" value={dueBackOn} onChange={(event) => setDueBackOn(event.target.value)} />
            </Field>
            <Field label="Note" htmlFor="approval-note">
              <Textarea id="approval-note" value={note} onChange={(event) => setNote(event.target.value)} className="min-h-11" placeholder="Who took them, ID seen, deposit taken" />
            </Field>
          </div>
          {error && <Alert tone="risk">{error}</Alert>}
          <div className="flex gap-2">
            <Button type="submit" loading={busy} disabled={!pieces.length || (mode === "customer" ? !customer : !partyName.trim())}>
              <Send className="size-4" aria-hidden />
              Send {pieces.length || ""} out
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

export default function ApprovalsPage() {
  const router = useRouter();
  const [view, setView] = useState<View>("open");
  const [adding, setAdding] = useState(false);
  const memos = useResource<{ data: ApprovalMemo[] }>(`/approvals?status=${view === "all" ? "" : view}`);
  const rows = memos.data?.data ?? [];
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Approvals out"
        description="Pieces sent home with a customer or to a dealer on memo. Take them back here, or bill the ones kept at the POS."
        actions={
          <Button onClick={() => setAdding((value) => !value)}>
            <Plus className="size-4" aria-hidden />
            New memo
          </Button>
        }
      />
      {adding && <NewMemo onSaved={(memo) => router.push(`/approvals/${memo.id}`)} onCancel={() => setAdding(false)} />}

      <Tabs<View>
        label="Memo status"
        active={view}
        onChange={setView}
        tabs={[
          { key: "open", label: "Out now" },
          { key: "closed", label: "Closed" },
          { key: "all", label: "All" },
        ]}
      />

      <Card className="overflow-hidden">
        {memos.loading && !memos.data ? (
          <div className="grid place-items-center py-12 text-navy">
            <Spinner />
          </div>
        ) : memos.error ? (
          <p className="p-5 text-sm text-risk">{memos.error}</p>
        ) : !rows.length ? (
          <EmptyState icon={Send} title="Nothing out on approval" description="Pieces you send out on memo are tracked here until they come back." />
        ) : (
          <Table minWidth={760}>
            <thead>
              <tr>
                <Th>Memo</Th>
                <Th>With</Th>
                <Th align="right">Still out</Th>
                <Th align="right">Net out</Th>
                <Th>Back by</Th>
                <Th>State</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((memo) => {
                const late = memo.status === "open" && memo.dueBackOn && memo.dueBackOn < today;
                return (
                  <Tr key={memo.id} className="cursor-pointer" onClick={() => router.push(`/approvals/${memo.id}`)}>
                    <Td>
                      <Link href={`/approvals/${memo.id}`} className="grid leading-tight" onClick={(event) => event.stopPropagation()}>
                        <span className="font-mono font-semibold hover:underline">{memo.number}</span>
                        <span className="text-[12px] text-ash">{formatDate(memo.createdAt)}</span>
                      </Link>
                    </Td>
                    <Td>
                      <span className="grid leading-tight">
                        <span className="font-semibold">{memo.party.name}</span>
                        <span className="text-[12.5px] text-ash">{memo.party.phone ?? ""}</span>
                      </span>
                    </Td>
                    <Td align="right">
                      {memo.counts.out} of {memo.counts.total}
                    </Td>
                    <Td align="right">{formatWeight(memo.netWeightOut)}</Td>
                    <Td className={late ? "font-semibold text-risk" : undefined}>{memo.dueBackOn ? formatDate(memo.dueBackOn) : "—"}</Td>
                    <Td>{memo.status === "closed" ? <Badge>Closed</Badge> : late ? <Badge tone="risk">Overdue</Badge> : <Badge tone="warn">Out</Badge>}</Td>
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
