"use client";

import { use, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { CalendarClock, CircleCheckBig, CircleDollarSign, ClipboardList, Gem, Hammer, PackagePlus, Printer, Scale, Weight } from "lucide-react";
import { useAuth } from "@webfudge/auth/components";
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  Field,
  Input,
  KpiCard,
  PageHeader,
  DetailHero,
  HeroFact,
  StatusPill,
  Spinner,
  StatusBadge,
  Table,
  Td,
  Th,
  Tr,
  buttonClass,
} from "@webfudge/ui";
import type { ItemStatus, JobWorkDetail } from "@webfudge/utils/api";
import { formatDate, formatDateTime, formatINR } from "@webfudge/utils/formatters";
import { IssueLines, filledRows, toDrafts, useIssueRows } from "@/components/issue-lines";
import { KarigarNote } from "@/components/karigar-note";
import { errorMessage, useApi, useResource } from "@/lib/api";

const g = (value: number) => `${value.toFixed(3)} g`;
const METAL_NAMES: Record<string, string> = {
  gold: "gold",
  silver: "silver",
  platinum: "platinum",
};

export default function JobPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ print?: string }>;
}) {
  const { id } = use(params);
  const { print } = use(searchParams);
  const api = useApi();
  const { hasRole } = useAuth();
  const { data, error, loading, reload } = useResource<{ data: JobWorkDetail }>(
    `/karigar/jobs/${id}`,
  );
  const job = data?.data;
  const lines = useIssueRows(["metal"]);
  const printed = useRef(false);
  const [labour, setLabour] = useState("");
  const [settleNote, setSettleNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "risk"; text: string } | null>(null);

  // Opened with ?print=1 right after the job was created: print the note once it has loaded.
  useEffect(() => {
    if (print === "1" && job && !printed.current) {
      printed.current = true;
      const timer = window.setTimeout(() => window.print(), 300);
      return () => window.clearTimeout(timer);
    }
  }, [print, job]);

  if (loading && !job) return <Spinner className="text-navy" />;
  if (error || !job) return <p className="text-sm text-risk">{error ?? "Job not found."}</p>;
  const account = job.account;
  const open = job.status === "open";
  const late = open && Boolean(job.dueOn && job.dueOn < new Date().toISOString().slice(0, 10));

  async function run(action: () => Promise<unknown>, done: string) {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      setMessage({ tone: "ok", text: done });
      reload();
    } catch (cause) {
      setMessage({ tone: "risk", text: errorMessage(cause) });
    } finally {
      setBusy(false);
    }
  }

  function give(event: FormEvent) {
    event.preventDefault();
    run(
      () => api.post(`/karigar/jobs/${id}/issue`, { issues: toDrafts(lines.rows) }),
      "Recorded. Print the note for the karigar to sign.",
    ).then(() => lines.reset());
  }
  const metalWord = METAL_NAMES[account.metal] ?? "gold";

  function settle(event: FormEvent) {
    event.preventDefault();
    run(
      () =>
        api.post(`/karigar/jobs/${id}/close`, {
          labourCharge: labour === "" ? undefined : Number(labour),
          note: settleNote,
        }),
      "Job settled.",
    );
  }

  const balanceWords =
    account.balanceFine === 0
      ? "Square"
      : account.balanceFine > 0
        ? "With the karigar"
        : "Shop owes the karigar";

  const metalLots = job.issues.filter((issue) => issue.kind !== "stone").length;
  const otherMetals = account.byMetal.slice(1);

  return (
    <>
      <KarigarNote job={job} />
      <div className="grid gap-6 print:hidden">
        <PageHeader
          title={`${job.number} · ${job.karigar?.name ?? ""}`}
          description={`${job.description ?? "No description"}${job.dueOn ? ` · due ${formatDate(job.dueOn)}` : ""} · wastage ${job.wastagePercent}%${open ? "" : " · settled"}`}
          actions={
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => window.print()}>
                <Printer className="size-4" aria-hidden />
                Print karigar note
              </Button>
              {open && (
                <Link
                  href={`/receive/new?jobWork=${job.id}&karigar=${job.karigar?.id ?? ""}&job=${job.number}`}
                  className={buttonClass("primary")}
                >
                  <PackagePlus className="size-4" aria-hidden />
                  Receive pieces
                </Link>
              )}
            </div>
          }
        />

        <DetailHero
          icon={Hammer}
          title={job.karigar?.name ?? "Karigar"}
          badges={
            open ? (
              <>
                <StatusPill tone="gold" icon={Hammer}>
                  Open · work in progress
                </StatusPill>
                {late && <StatusPill tone="risk">Past due date</StatusPill>}
              </>
            ) : (
              <StatusPill tone="ok" icon={CircleCheckBig}>
                Closed · settled
              </StatusPill>
            )
          }
          meta={
            <>
              <HeroFact icon={ClipboardList}>
                <span className="font-mono">{job.number}</span>
              </HeroFact>
              {job.dueOn && <HeroFact icon={CalendarClock}>Due {formatDate(job.dueOn)}</HeroFact>}
              {job.closedAt && <HeroFact icon={CircleCheckBig}>Settled {formatDate(job.closedAt)}</HeroFact>}
              {job.labourCharge !== null && <HeroFact icon={CircleDollarSign}>Labour {formatINR(job.labourCharge)}</HeroFact>}
            </>
          }
          stat={{
            label: open ? "Fine gold with karigar" : "Balance at settlement",
            value: `${Math.abs(account.balanceFine).toFixed(3)} g`,
            note: account.balanceFine < 0 ? "The shop owes the karigar" : account.balanceFine === 0 ? "Square" : open ? "Still to come back" : "Carried over",
          }}
          className={open ? undefined : "border-ok-line from-ok-soft/80 via-white to-ok-soft/30"}
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            compact
            title={`Fine ${metalWord} given`}
            value={g(account.issuedFine)}
            icon={Weight}
            subtitle={`${g(account.issuedGross)} gross in ${metalLots} lots`}
          />
          <KpiCard
            compact
            title={`Fine ${metalWord} back`}
            value={g(account.receivedFine)}
            icon={Scale}
            tone="ok"
            subtitle={`${account.receivedPieces} pieces, ${g(account.receivedNet)} net`}
          />
          <KpiCard
            compact
            title="Wastage allowed"
            value={g(account.wastageAllowed)}
            icon={Scale}
            tone="gold"
            subtitle={`${job.wastagePercent}% of fine back`}
          />
          <KpiCard
            compact
            title={balanceWords}
            value={g(Math.abs(account.balanceFine))}
            icon={CircleDollarSign}
            tone={account.balanceFine < 0 ? "risk" : account.balanceFine > 0 ? "warn" : "ok"}
            subtitle={
              job.labourCharge !== null
                ? `Labour ${formatINR(job.labourCharge)}`
                : `Fine ${metalWord} balance`
            }
          />
        </div>

        {(otherMetals.length > 0 || account.stonesGiven.length > 0) && (
          <div className="grid gap-4 lg:grid-cols-2">
            {otherMetals.length > 0 && (
              <Card className="overflow-hidden">
                <CardHeader
                  title="Other metals"
                  description="Each metal keeps its own fine balance."
                />
                <Table minWidth={420}>
                  <thead>
                    <tr>
                      <Th>Metal</Th>
                      <Th align="right">Fine given</Th>
                      <Th align="right">Fine back</Th>
                      <Th align="right">Balance</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {otherMetals.map((entry) => (
                      <Tr key={entry.metal}>
                        <Td className="capitalize">{entry.metal}</Td>
                        <Td align="right">{g(entry.issuedFine)}</Td>
                        <Td align="right">{g(entry.receivedFine)}</Td>
                        <Td
                          align="right"
                          className={entry.balanceFine < 0 ? "text-risk" : undefined}
                        >
                          {g(entry.balanceFine)}
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              </Card>
            )}
            {account.stonesGiven.length > 0 && (
              <Card className="overflow-hidden">
                <CardHeader
                  title="Stones given"
                  description={`Stone weight set in pieces back: ${g(account.stoneWeightBack)}`}
                />
                <Table minWidth={360}>
                  <thead>
                    <tr>
                      <Th>Stone</Th>
                      <Th align="right">Pieces</Th>
                      <Th align="right">Weight</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {account.stonesGiven.map((stone) => (
                      <Tr key={`${stone.name}-${stone.unit}`}>
                        <Td>{stone.name}</Td>
                        <Td align="right">{stone.pieces || "—"}</Td>
                        <Td align="right">
                          {stone.weight ? `${stone.weight} ${stone.unit}` : "—"}
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              </Card>
            )}
          </div>
        )}

        {open && (
          <Card>
            <CardHeader
              title="Give more metal or stones"
              description="Several lots at once. Then print the note for the karigar to sign."
            />
            <CardBody>
              <form onSubmit={give} className="grid gap-3" noValidate>
                <IssueLines rows={lines.rows} onChange={lines.setRows} idPrefix="give" />
                <Button
                  type="submit"
                  loading={busy}
                  disabled={!filledRows(lines.rows).length}
                  className="justify-self-start"
                >
                  Record what was given
                </Button>
              </form>
            </CardBody>
          </Card>
        )}
        {message && <Alert tone={message.tone}>{message.text}</Alert>}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
          <div className="grid content-start gap-6">

            {open && hasRole("owner", "branch_manager") && (
              <Card>
                <CardHeader
                  title="Settle and close"
                  description="When the karigar has returned everything for this job. The fine gold balance is written into the job's history."
                />
                <CardBody>
                  <form onSubmit={settle} className="grid gap-3" noValidate>
                    <Field label="Labour charge (₹)" htmlFor="labour">
                      <Input
                        id="labour"
                        inputMode="decimal"
                        value={labour}
                        onChange={(event) => setLabour(event.target.value)}
                        className="max-w-48"
                      />
                    </Field>
                    <Field label="Settlement note" htmlFor="settle-note">
                      <Input
                        id="settle-note"
                        value={settleNote}
                        onChange={(event) => setSettleNote(event.target.value)}
                        placeholder="Like: 5.5 g fine carried to next job"
                      />
                    </Field>
                    <Button
                      type="submit"
                      variant="secondary"
                      loading={busy}
                      className="justify-self-start"
                    >
                      Settle job
                    </Button>
                  </form>
                </CardBody>
              </Card>
            )}

            <Card>
              <CardHeader title="Given to the karigar" />
              <ul className="divide-y divide-gray-100 text-sm">
                {job.issues.map((issue, index) => {
                  const stone = issue.kind === "stone";
                  return (
                    <li
                      key={`${issue.at}-${index}`}
                      className="flex justify-between gap-3 px-6 py-3"
                    >
                      <span className="flex gap-2.5">
                        {stone ? (
                          <Gem className="mt-0.5 size-4 shrink-0 text-navy" aria-hidden />
                        ) : (
                          <Weight className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />
                        )}
                        <span className="grid leading-tight">
                          <span className="font-semibold">
                            {stone
                              ? `${issue.pieces ? `${issue.pieces} pcs ` : ""}${issue.name}`
                              : `${g(Number(issue.grossWeight ?? 0))} ${issue.purity}`}
                          </span>
                          <span className="text-[12px] text-ash">
                            {formatDateTime(issue.at)}
                            {issue.by ? ` · ${issue.by}` : ""}
                            {issue.note ? ` · ${issue.note}` : ""}
                          </span>
                        </span>
                      </span>
                      <span className="tabular-nums">
                        {stone
                          ? issue.weight
                            ? `${issue.weight} ${issue.unit}`
                            : ""
                          : `${g(Number(issue.fineWeight ?? 0))} fine`}
                      </span>
                    </li>
                  );
                })}
                {!job.issues.length && (
                  <li className="px-6 py-3 text-ash">Nothing recorded yet.</li>
                )}
              </ul>
            </Card>
          </div>

          <div className="grid content-start gap-6">
            <Card>
              <CardHeader
                title="Pieces back"
                description={
                  account.receipts.length
                    ? `On ${account.receipts.map((receipt) => receipt.number).join(", ")}`
                    : "Nothing received yet."
                }
              />
              {account.pieces.length > 0 && (
                <Table minWidth={520}>
                  <thead>
                    <tr>
                      <Th>Tag</Th>
                      <Th>Design</Th>
                      <Th align="right">Net</Th>
                      <Th align="right">Fine</Th>
                      <Th>Status</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {account.pieces.map((piece) => (
                      <Tr key={piece.id}>
                        <Td>
                          <Link
                            href={`/stock/${piece.id}`}
                            className="font-mono font-semibold hover:underline"
                          >
                            {piece.tagNumber}
                          </Link>
                        </Td>
                        <Td>{piece.design?.name ?? "—"}</Td>
                        <Td align="right">{g(piece.netWeight)}</Td>
                        <Td align="right">{g(piece.fineWeight)}</Td>
                        <Td>
                          <StatusBadge status={piece.status as ItemStatus} />
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card>

            <Card>
              <CardHeader title="History" />
              <ol className="grid px-6 py-4">
                {[...job.log].reverse().map((entry, index) => (
                  <li
                    key={`${entry.at}-${index}`}
                    className="relative border-l-2 border-gray-100 pb-4 pl-5 last:pb-0"
                  >
                    <span
                      className="absolute top-1 -left-[7px] size-3 rounded-full border-2 border-white bg-navy"
                      aria-hidden
                    />
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
    </>
  );
}
