"use client";

import { use, useState, type FormEvent } from "react";
import Link from "next/link";
import { CircleDollarSign, PackagePlus, Scale, Weight } from "lucide-react";
import { useAuth } from "@webfudge/auth/components";
import { PURITIES } from "@webfudge/config";
import { Alert, Button, Card, CardBody, CardHeader, Field, Input, KpiCard, PageHeader, Select, Spinner, StatusBadge, Table, Td, Th, Tr, buttonClass } from "@webfudge/ui";
import type { ItemStatus, JobWorkDetail } from "@webfudge/utils/api";
import { formatDate, formatDateTime, formatINR } from "@webfudge/utils/formatters";
import { errorMessage, useApi, useResource } from "@/lib/api";

const g = (value: number) => `${value.toFixed(3)} g`;

export default function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const api = useApi();
  const { hasRole } = useAuth();
  const { data, error, loading, reload } = useResource<{ data: JobWorkDetail }>(`/karigar/jobs/${id}`);
  const job = data?.data;
  const [purity, setPurity] = useState("24KT");
  const [weight, setWeight] = useState("");
  const [note, setNote] = useState("");
  const [labour, setLabour] = useState("");
  const [settleNote, setSettleNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "risk"; text: string } | null>(null);

  if (loading && !job) return <Spinner className="text-navy" />;
  if (error || !job) return <p className="text-sm text-risk">{error ?? "Job not found."}</p>;
  const account = job.account;
  const open = job.status === "open";

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
    run(() => api.post(`/karigar/jobs/${id}/issue`, { purity, grossWeight: Number(weight), note }), "Metal recorded.").then(() => {
      setWeight("");
      setNote("");
    });
  }

  function settle(event: FormEvent) {
    event.preventDefault();
    run(() => api.post(`/karigar/jobs/${id}/close`, { labourCharge: labour === "" ? undefined : Number(labour), note: settleNote }), "Job settled.");
  }

  const balanceWords = account.balanceFine === 0 ? "Square" : account.balanceFine > 0 ? "With the karigar" : "Shop owes the karigar";

  return (
    <div className="grid gap-6">
      <PageHeader
        title={`${job.number} · ${job.karigar?.name ?? ""}`}
        description={`${job.description ?? "No description"}${job.dueOn ? ` · due ${formatDate(job.dueOn)}` : ""} · wastage ${job.wastagePercent}%${open ? "" : " · settled"}`}
        actions={
          open && (
            <Link href={`/receive/new?jobWork=${job.id}&karigar=${job.karigar?.id ?? ""}&job=${job.number}`} className={buttonClass("primary")}>
              <PackagePlus className="size-4" aria-hidden />
              Receive pieces
            </Link>
          )
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard compact title="Fine gold given" value={g(account.issuedFine)} icon={Weight} subtitle={`${g(account.issuedGross)} gross in ${job.issues.length} lots`} />
        <KpiCard compact title="Fine gold back" value={g(account.receivedFine)} icon={Scale} tone="ok" subtitle={`${account.receivedPieces} pieces, ${g(account.receivedNet)} net`} />
        <KpiCard compact title="Wastage allowed" value={g(account.wastageAllowed)} icon={Scale} tone="gold" subtitle={`${job.wastagePercent}% of fine back`} />
        <KpiCard compact title={balanceWords} value={g(Math.abs(account.balanceFine))} icon={CircleDollarSign} tone={account.balanceFine < 0 ? "risk" : account.balanceFine > 0 ? "warn" : "ok"} subtitle={job.labourCharge !== null ? `Labour ${formatINR(job.labourCharge)}` : "Fine gold balance"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <div className="grid content-start gap-6">
          {open && (
            <Card>
              <CardHeader title="Give more metal" />
              <CardBody>
                <form onSubmit={give} className="grid gap-3 sm:grid-cols-2" noValidate>
                  <Field label="Purity" htmlFor="issue-purity">
                    <Select id="issue-purity" value={purity} onChange={(event) => setPurity(event.target.value)}>
                      {PURITIES.map((entry) => (
                        <option key={entry.code} value={entry.code}>
                          {entry.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Weight (g)" htmlFor="issue-weight">
                    <Input id="issue-weight" inputMode="decimal" value={weight} onChange={(event) => setWeight(event.target.value)} />
                  </Field>
                  <Field label="Note" htmlFor="issue-note" className="sm:col-span-2">
                    <Input id="issue-note" value={note} onChange={(event) => setNote(event.target.value)} />
                  </Field>
                  <Button type="submit" loading={busy} disabled={!(Number(weight) > 0)} className="justify-self-start">
                    Record metal given
                  </Button>
                </form>
              </CardBody>
            </Card>
          )}

          {open && hasRole("owner", "branch_manager") && (
            <Card>
              <CardHeader title="Settle and close" description="When the karigar has returned everything for this job. The fine gold balance is written into the job's history." />
              <CardBody>
                <form onSubmit={settle} className="grid gap-3" noValidate>
                  <Field label="Labour charge (₹)" htmlFor="labour">
                    <Input id="labour" inputMode="decimal" value={labour} onChange={(event) => setLabour(event.target.value)} className="max-w-48" />
                  </Field>
                  <Field label="Settlement note" htmlFor="settle-note">
                    <Input id="settle-note" value={settleNote} onChange={(event) => setSettleNote(event.target.value)} placeholder="Like: 5.5 g fine carried to next job" />
                  </Field>
                  <Button type="submit" variant="secondary" loading={busy} className="justify-self-start">
                    Settle job
                  </Button>
                </form>
              </CardBody>
            </Card>
          )}
          {message && <Alert tone={message.tone}>{message.text}</Alert>}

          <Card>
            <CardHeader title="Metal given" />
            <ul className="divide-y divide-gray-100 text-sm">
              {job.issues.map((issue, index) => (
                <li key={`${issue.at}-${index}`} className="flex justify-between gap-3 px-6 py-3">
                  <span className="grid leading-tight">
                    <span className="font-semibold">
                      {g(issue.grossWeight)} {issue.purity}
                    </span>
                    <span className="text-[12px] text-ash">
                      {formatDateTime(issue.at)}
                      {issue.by ? ` · ${issue.by}` : ""}
                      {issue.note ? ` · ${issue.note}` : ""}
                    </span>
                  </span>
                  <span className="tabular-nums">{g(issue.fineWeight)} fine</span>
                </li>
              ))}
              {!job.issues.length && <li className="px-6 py-3 text-ash">No metal recorded yet.</li>}
            </ul>
          </Card>
        </div>

        <div className="grid content-start gap-6">
          <Card>
            <CardHeader title="Pieces back" description={account.receipts.length ? `On ${account.receipts.map((receipt) => receipt.number).join(", ")}` : "Nothing received yet."} />
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
                        <Link href={`/stock/${piece.id}`} className="font-mono font-semibold hover:underline">
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
