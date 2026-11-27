"use client";

import { useState, type FormEvent } from "react";
import { CustomerPicker, usePieceSearch } from "@webfudge/auth/components";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  Plus,
  ReceiptText,
  Scale,
  ScanBarcode,
  Send,
  Store,
  Trash2,
  UserRound,
} from "lucide-react";
import {
  Alert,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  KpiCard,
  MissingHints,
  Modal,
  PageHeader,
  ResultsCount,
  ScanInput,
  Spinner,
  StatusPill,
  Table,
  Tabs,
  Td,
  Textarea,
  Th,
  ToolbarActions,
  ToolbarButton,
  ToolbarExport,
  ToolbarSearch,
  Tr,
  cn,
} from "@webfudge/ui";
import type { ApprovalMemo, Customer, StockItem } from "@webfudge/utils/api";
import { downloadCsv } from "@webfudge/utils/csv";
import { formatDate, formatWeight } from "@webfudge/utils/formatters";
import { PieceThumb } from "@/components/photos";
import { errorMessage, useApi, useResource } from "@/lib/api";
import { useBranch } from "@/lib/branch";

type View = "open" | "late" | "closed" | "all";

function NewMemo({
  onSaved,
  onCancel,
}: {
  onSaved: (memo: ApprovalMemo) => void;
  onCancel: () => void;
}) {
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

  // Only pieces in stock here, and not ones already on this memo.
  const findPieces = usePieceSearch({
    branchId: branch?.id,
    status: "in_stock",
    check: (item) =>
      pieces.some((piece) => piece.id === item.id)
        ? { disabled: true, aside: "Already added" }
        : undefined,
  });

  async function scan(code: string) {
    setScanError(null);
    try {
      const { data } = await api.get<{ data: StockItem }>(
        `/stock/items/lookup?code=${encodeURIComponent(code)}`,
      );
      if (data.branch?.id !== branch?.id)
        return setScanError(`${data.tagNumber} is at ${data.branch?.name}.`);
      if (data.status !== "in_stock")
        return setScanError(
          `${data.tagNumber} is ${data.status.replace("_", " ")}; only pieces in stock can go out.`,
        );
      setPieces((current) =>
        current.some((piece) => piece.id === data.id) ? current : [...current, data],
      );
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
  const missing = [
    mode === "customer"
      ? !customer && "Choose the customer."
      : !partyName.trim() && "Enter the dealer's name.",
    !pieces.length && "Scan at least one piece.",
  ];

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <div
        className="grid gap-2 sm:grid-cols-2"
        role="radiogroup"
        aria-label="Who is taking the pieces"
      >
        {(["customer", "dealer"] as const).map((value) => {
          const Icon = value === "customer" ? UserRound : Store;
          const on = mode === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setMode(value)}
              className={cn(
                "flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
                on ? "border-navy bg-navy-soft/60" : "border-gray-200 hover:border-gray-300",
              )}
            >
              <span
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-lg",
                  on ? "bg-navy text-white" : "bg-gray-100 text-ash",
                )}
              >
                <Icon className="size-[18px]" aria-hidden />
              </span>
              <span className="grid leading-tight">
                <span className="text-[13.5px] font-semibold text-ink">
                  {value === "customer" ? "A customer" : "A dealer or other shop"}
                </span>
                <span className="text-[12px] text-ash">
                  {value === "customer"
                    ? "Choosing at home, from your customer list"
                    : "On memo to another jeweller"}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      {mode === "customer" ? (
        <Field label="Customer" htmlFor="approval-customer">
          <CustomerPicker
            id="approval-customer"
            value={customer}
            onChange={setCustomer}
            allowAdd={false}
            noMatchHint="Add new customers at the POS, or send to them as a dealer instead."
          />
        </Field>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="party-name">
            <Input
              id="party-name"
              value={partyName}
              onChange={(event) => setPartyName(event.target.value)}
            />
          </Field>
          <Field label="Mobile" htmlFor="party-phone">
            <Input
              id="party-phone"
              inputMode="tel"
              value={partyPhone}
              onChange={(event) => setPartyPhone(event.target.value)}
            />
          </Field>
        </div>
      )}
      <Field label="Scan each piece going out" htmlFor="approval-scan">
        <ScanInput
          id="approval-scan"
          onScan={scan}
          onSearch={findPieces}
          autoFocus={false}
          placeholder="Scan a tag, or type part of a tag or design name"
        />
      </Field>
      {scanError && <Alert tone="risk">{scanError}</Alert>}
      {pieces.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-gray-200">
          <Table minWidth={520}>
            <thead>
              <tr>
                <Th className="w-14">
                  <span className="sr-only">Photo</span>
                </Th>
                <Th>Tag</Th>
                <Th>Design</Th>
                <Th>Purity</Th>
                <Th align="right">Net</Th>
                <Th>
                  <span className="sr-only">Remove</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {pieces.map((piece) => (
                <Tr key={piece.id}>
                  <Td className="py-2 pr-0">
                    <PieceThumb item={piece} />
                  </Td>
                  <Td className="font-mono font-semibold text-ink">{piece.tagNumber}</Td>
                  <Td>{piece.design?.name ?? "—"}</Td>
                  <Td>{piece.purity}</Td>
                  <Td align="right" className="font-semibold text-ink">
                    {formatWeight(piece.netWeight)}
                  </Td>
                  <Td align="right">
                    <button
                      type="button"
                      onClick={() =>
                        setPieces((current) => current.filter((entry) => entry.id !== piece.id))
                      }
                      className="rounded-md p-1.5 text-ash hover:bg-risk/10 hover:text-risk"
                      aria-label={`Remove ${piece.tagNumber}`}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
          <div className="flex justify-between border-t border-gray-100 bg-gray-50/60 px-4 py-2.5 text-[13px]">
            <span className="text-ash">
              {pieces.length} {pieces.length === 1 ? "piece" : "pieces"} going out
            </span>
            <span className="font-semibold text-ink tabular-nums">{formatWeight(net)} net</span>
          </div>
        </div>
      ) : (
        <div className="grid place-items-center gap-1 rounded-xl border border-dashed border-gray-200 px-4 py-6 text-center">
          <ScanBarcode className="size-6 text-ash" aria-hidden />
          <p className="text-[13px] font-semibold text-ink">No pieces yet</p>
          <p className="text-[12px] text-ash">
            Scan each tag above. Only pieces in stock at this branch can go out.
          </p>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Due back on" htmlFor="due-back">
          <Input
            id="due-back"
            type="date"
            value={dueBackOn}
            onChange={(event) => setDueBackOn(event.target.value)}
          />
        </Field>
        <Field label="Note" htmlFor="approval-note">
          <Textarea
            id="approval-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="min-h-11"
            placeholder="Who took them, ID seen, deposit taken"
          />
        </Field>
      </div>
      {error && <Alert tone="risk">{error}</Alert>}
      <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4">
        <Button type="submit" loading={busy} disabled={missing.some(Boolean)}>
          <Send className="size-4" aria-hidden />
          Send {pieces.length || ""} out
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
      <MissingHints items={missing} className="-mt-2" />
    </form>
  );
}

const memoState = (memo: ApprovalMemo, today: string) =>
  memo.status === "closed" ? "closed" : memo.dueBackOn && memo.dueBackOn < today ? "late" : "out";

export default function ApprovalsPage() {
  const router = useRouter();
  const [view, setView] = useState<View>("open");
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  const memos = useResource<{ data: ApprovalMemo[] }>("/approvals");
  const all = memos.data?.data ?? [];

  const open = all.filter((memo) => memo.status === "open");
  const late = open.filter((memo) => memoState(memo, today) === "late");
  const closed = all.filter((memo) => memo.status === "closed");
  const parties = new Set(open.map((memo) => memo.party.name)).size;
  const piecesOut = open.reduce((sum, memo) => sum + memo.counts.out, 0);
  const netOut = open.reduce((sum, memo) => sum + memo.netWeightOut, 0);
  const monthStart = today.slice(0, 8) + "01";
  const thisMonth = all.filter((memo) => memo.createdAt.slice(0, 10) >= monthStart);
  const billedThisMonth = thisMonth.reduce((sum, memo) => sum + memo.counts.billed, 0);
  const sentThisMonth = thisMonth.reduce((sum, memo) => sum + memo.counts.total, 0);
  const inView = view === "open" ? open : view === "late" ? late : view === "closed" ? closed : all;

  const needle = q.trim().toLowerCase();
  const rows = inView.filter(
    (memo) =>
      !needle ||
      [
        memo.number,
        memo.party.name,
        memo.party.phone,
        memo.note,
        ...memo.lines.map((line) => line.tagNumber),
      ].some((value) => value?.toLowerCase().includes(needle)),
  );

  function exportCsv() {
    downloadCsv(`approvals-${today}`, [
      [
        "Memo",
        "Sent",
        "With",
        "Mobile",
        "Pieces",
        "Still out",
        "Returned",
        "Billed",
        "Net out (g)",
        "Back by",
        "State",
        "By",
      ],
      ...rows.map((memo) => [
        memo.number,
        memo.createdAt.slice(0, 10),
        memo.party.name,
        memo.party.phone,
        memo.counts.total,
        memo.counts.out,
        memo.counts.returned,
        memo.counts.billed,
        memo.netWeightOut,
        memo.dueBackOn,
        { closed: "Closed", late: "Overdue", out: "Out" }[memoState(memo, today)],
        memo.by,
      ]),
    ]);
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Approvals out"
        description="Pieces sent home with a customer or to a dealer on memo. Take them back here, or bill the ones kept at the POS."
        actions={
          <Button onClick={() => setAdding(true)}>
            <Plus className="size-4" aria-hidden />
            New memo
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          compact
          title="Memos out"
          value={memos.data ? open.length : "–"}
          icon={Send}
          subtitle={
            parties === 0
              ? "Nothing out right now"
              : parties === 1
                ? `With ${open[0].party.name}`
                : `With ${parties} customers and dealers`
          }
        />
        <KpiCard
          compact
          title="Pieces out"
          value={memos.data ? piecesOut : "–"}
          icon={Scale}
          tone="gold"
          subtitle={`${formatWeight(netOut)} net away from the shop`}
        />
        <KpiCard
          compact
          title="Overdue"
          value={memos.data ? late.length : "–"}
          icon={CalendarClock}
          tone={late.length ? "risk" : "ok"}
          subtitle={late.length ? "Past the due-back date" : "All within their date"}
        />
        <KpiCard
          compact
          title="Kept & billed this month"
          value={memos.data ? billedThisMonth : "–"}
          icon={ReceiptText}
          tone="navy"
          subtitle={`of ${sentThisMonth} ${sentThisMonth === 1 ? "piece" : "pieces"} sent this month`}
        />
      </div>

      <Tabs<View>
        label="Memo status"
        active={view}
        onChange={setView}
        tabs={[
          { key: "open", label: "Out now", count: open.length },
          { key: "late", label: "Overdue", count: late.length },
          { key: "closed", label: "Closed", count: closed.length },
          { key: "all", label: "All", count: all.length },
        ]}
        actions={
          <ToolbarActions>
            <ToolbarSearch value={q} onChange={setQ} placeholder="Memo, name, mobile or tag…" />
            <ToolbarExport onExport={exportCsv} />
            <ToolbarButton icon={Plus} label="New memo" active onClick={() => setAdding(true)} />
          </ToolbarActions>
        }
      />
      {memos.data && <ResultsCount shown={rows.length} total={inView.length} noun="memo" />}

      <Card className="overflow-hidden">
        {memos.loading && !memos.data ? (
          <div className="grid place-items-center py-12 text-navy">
            <Spinner />
          </div>
        ) : memos.error ? (
          <p className="p-5 text-sm text-risk">{memos.error}</p>
        ) : !rows.length ? (
          <EmptyState
            icon={Send}
            title={
              q
                ? "No memo matches"
                : view === "late"
                  ? "Nothing overdue"
                  : view === "closed"
                    ? "No closed memos yet"
                    : "Nothing out on approval"
            }
            description={
              q
                ? "Try another number, name or tag."
                : "Pieces you send out on memo are tracked here until they come back or are billed."
            }
            action={
              !q && view !== "closed" && view !== "late" ? (
                <Button onClick={() => setAdding(true)}>
                  <Plus className="size-4" aria-hidden />
                  New memo
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Table minWidth={980}>
            <thead>
              <tr>
                <Th>Memo</Th>
                <Th>With</Th>
                <Th>Pieces</Th>
                <Th align="right">Net out</Th>
                <Th>Back by</Th>
                <Th>State</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((memo) => {
                const state = memoState(memo, today);
                const days = memo.dueBackOn
                  ? Math.round((Date.parse(memo.dueBackOn) - Date.parse(today)) / 86400000)
                  : null;
                const share = (count: number) =>
                  `${(count / Math.max(memo.counts.total, 1)) * 100}%`;
                return (
                  <Tr
                    key={memo.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/approvals/${memo.id}`)}
                  >
                    <Td>
                      <Link
                        href={`/approvals/${memo.id}`}
                        className="grid leading-tight"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <span className="font-mono font-semibold text-ink hover:underline">
                          {memo.number}
                        </span>
                        <span className="text-[12px] text-ash">
                          {formatDate(memo.createdAt)}
                          {memo.by ? ` · ${memo.by}` : ""}
                        </span>
                      </Link>
                    </Td>
                    <Td>
                      <span className="flex items-center gap-2.5">
                        <span
                          className="grid size-8 shrink-0 place-items-center rounded-full bg-navy-soft text-navy"
                          aria-hidden
                        >
                          {memo.customer ? (
                            <UserRound className="size-4" />
                          ) : (
                            <Store className="size-4" />
                          )}
                        </span>
                        <span className="grid leading-tight">
                          <span className="font-semibold text-ink">{memo.party.name}</span>
                          <span className="text-[12px] text-ash tabular-nums">
                            {memo.party.phone ?? (memo.customer ? "Customer" : "Dealer")}
                          </span>
                        </span>
                      </span>
                    </Td>
                    <Td>
                      <span className="grid gap-1.5">
                        <span className="text-[13px] text-ink tabular-nums">
                          <span className="font-semibold">{memo.counts.out}</span> of{" "}
                          {memo.counts.total} out
                        </span>
                        <span
                          className="flex h-1.5 w-32 overflow-hidden rounded-full bg-gray-100"
                          aria-hidden
                        >
                          <span className="bg-gold" style={{ width: share(memo.counts.out) }} />
                          <span className="bg-ok" style={{ width: share(memo.counts.returned) }} />
                          <span className="bg-navy" style={{ width: share(memo.counts.billed) }} />
                        </span>
                        {(memo.counts.returned > 0 || memo.counts.billed > 0) && (
                          <span className="text-[11.5px] text-ash">
                            {[
                              memo.counts.returned > 0 && `${memo.counts.returned} back`,
                              memo.counts.billed > 0 && `${memo.counts.billed} billed`,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        )}
                      </span>
                    </Td>
                    <Td align="right" className="font-semibold text-ink">
                      {memo.counts.out ? (
                        formatWeight(memo.netWeightOut)
                      ) : (
                        <span className="font-normal text-ash">—</span>
                      )}
                    </Td>
                    <Td>
                      {memo.dueBackOn ? (
                        <span className="grid leading-tight">
                          <span
                            className={state === "late" ? "font-semibold text-risk" : "text-ink"}
                          >
                            {formatDate(memo.dueBackOn)}
                          </span>
                          {state !== "closed" && days !== null && (
                            <span
                              className={cn(
                                "text-[12px]",
                                state === "late" ? "text-risk" : "text-ash",
                              )}
                            >
                              {days < 0
                                ? `${-days} ${days === -1 ? "day" : "days"} late`
                                : days === 0
                                  ? "Due today"
                                  : `In ${days} ${days === 1 ? "day" : "days"}`}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-ash">No date</span>
                      )}
                    </Td>
                    <Td>
                      {state === "closed" ? (
                        <StatusPill tone="neutral">Closed</StatusPill>
                      ) : state === "late" ? (
                        <StatusPill tone="risk">Overdue</StatusPill>
                      ) : (
                        <StatusPill tone="warn">Out</StatusPill>
                      )}
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>

      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title="Send pieces on approval"
        description="For a customer choosing at home, or a dealer. The pieces leave the showroom tablets until they come back or are billed."
        size="xl"
      >
        {adding && (
          <NewMemo
            onSaved={(memo) => router.push(`/approvals/${memo.id}`)}
            onCancel={() => setAdding(false)}
          />
        )}
      </Modal>
    </div>
  );
}
