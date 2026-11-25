"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlarmClock, CircleCheckBig, Hammer, Plus, Printer, Scale } from "lucide-react";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  KpiCard,
  Modal,
  PageHeader,
  ResultsCount,
  Select,
  Spinner,
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
} from "@webfudge/ui";
import type { JobWork, Supplier } from "@webfudge/utils/api";
import { downloadCsv } from "@webfudge/utils/csv";
import { formatDate } from "@webfudge/utils/formatters";
import { IssueLines, toDrafts, useIssueRows } from "@/components/issue-lines";
import { errorMessage, useApi, useResource } from "@/lib/api";
import { useBranch } from "@/lib/branch";

type View = "open" | "closed" | "all";

function grams(value: number) {
  return `${value.toFixed(3)} g`;
}

function NewJob({ onSaved, onCancel }: { onSaved: (job: JobWork, print: boolean) => void; onCancel: () => void }) {
  const api = useApi();
  const { branch } = useBranch();
  const karigars = useResource<{ data: Supplier[] }>("/stock/suppliers?kind=karigar");
  const [form, setForm] = useState({ karigarId: "", description: "", dueOn: "", wastagePercent: "2" });
  const lines = useIssueRows(["metal"]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof typeof form) => (value: string) => setForm((current) => ({ ...current, [key]: value }));

  async function submit(event: Pick<FormEvent, "preventDefault">, print = false) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { data } = await api.post<{ data: JobWork }>("/karigar/jobs", {
        branchId: branch?.id,
        karigarId: Number(form.karigarId),
        description: form.description,
        dueOn: form.dueOn || null,
        wastagePercent: Number(form.wastagePercent || 0),
        issues: toDrafts(lines.rows),
      });
      onSaved(data, print);
    } catch (cause) {
      setError(errorMessage(cause));
      setBusy(false);
    }
  }

  return (
    <>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" noValidate>
          <Field label="Karigar" htmlFor="job-karigar" className="lg:col-span-2" hint={karigars.data && !karigars.data.data.length ? "Add karigars under Suppliers & karigars first." : undefined}>
            <Select id="job-karigar" value={form.karigarId} onChange={(event) => set("karigarId")(event.target.value)}>
              <option value="">Choose</option>
              {karigars.data?.data.map((karigar) => (
                <option key={karigar.id} value={karigar.id}>
                  {karigar.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Due back on" htmlFor="job-due">
            <Input id="job-due" type="date" value={form.dueOn} onChange={(event) => set("dueOn")(event.target.value)} />
          </Field>
          <Field label="Wastage allowed (%)" htmlFor="job-wastage" hint="Added to the fine gold in what comes back.">
            <Input id="job-wastage" inputMode="decimal" value={form.wastagePercent} onChange={(event) => set("wastagePercent")(event.target.value)} />
          </Field>
          <Field label="What to make" htmlFor="job-description" className="sm:col-span-2 lg:col-span-4">
            <Textarea id="job-description" value={form.description} onChange={(event) => set("description")(event.target.value)} placeholder="Like: 4 pairs of jhumkas, about 6 g each, design ER-0012" />
          </Field>
          <div className="grid gap-2 sm:col-span-2 lg:col-span-4">
            <p className="text-[13px] font-semibold text-ink">
              Given now <span className="font-normal text-ash">· add a line for each lot of metal or stones. Leave weights empty to record them later.</span>
            </p>
            <IssueLines rows={lines.rows} onChange={lines.setRows} idPrefix="job" />
          </div>
          {error && <Alert tone="risk" className="sm:col-span-2 lg:col-span-4">{error}</Alert>}
          <div className="flex flex-wrap items-center gap-2 sm:col-span-2 lg:col-span-4">
            <Button type="submit" loading={busy} disabled={!form.karigarId}>
              Open job
            </Button>
            <Button type="button" variant="secondary" loading={busy} disabled={!form.karigarId} onClick={(event) => submit(event, true)}>
              <Printer className="size-4" aria-hidden />
              Open job and print note
            </Button>
            {!form.karigarId && <span className="text-[12.5px] text-ash">Choose the karigar first.</span>}
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
    </>
  );
}

export default function KarigarPage() {
  const router = useRouter();
  const [view, setView] = useState<View | "late">("open");
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState("");
  const [now] = useState(() => Date.now());
  const jobs = useResource<{ data: JobWork[] }>("/karigar/jobs");
  const all = jobs.data?.data ?? [];
  const today = new Date(now).toISOString().slice(0, 10);
  const monthStart = `${today.slice(0, 7)}-01`;

  const open = all.filter((job) => job.status === "open");
  const late = open.filter((job) => job.dueOn && job.dueOn < today);
  const goldWithKarigars = open.filter((job) => (job.totals?.metal ?? "gold") === "gold").reduce((sum, job) => sum + Math.max(0, job.totals?.balanceFine ?? 0), 0);
  const settledThisMonth = all.filter((job) => job.status === "closed" && job.closedAt && job.closedAt.slice(0, 10) >= monthStart);

  const needle = q.trim().toLowerCase();
  const rows = all.filter((job) => {
    if (view === "open" && job.status !== "open") return false;
    if (view === "closed" && job.status !== "closed") return false;
    if (view === "late" && !late.includes(job)) return false;
    if (!needle) return true;
    return [job.number, job.karigar?.name, job.description].some((value) => value?.toLowerCase().includes(needle));
  });

  function exportCsv() {
    downloadCsv(`karigar-jobs-${today}`, [
      ["Job", "Karigar", "Work", "Status", "Due", "Metal", "Fine given (g)", "Fine back (g)", "Pieces back", "Balance (g)", "Labour (₹)"],
      ...rows.map((job) => [
        job.number,
        job.karigar?.name,
        job.description,
        job.status === "closed" ? "Closed" : "Open",
        job.dueOn,
        job.totals?.metal ?? "gold",
        job.totals?.issuedFine,
        job.totals?.receivedFine,
        job.totals?.receivedPieces,
        job.totals?.balanceFine,
        job.labourCharge,
      ]),
    ]);
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Karigar job work"
        description="Gold given to karigars, pieces received back, and the fine-gold balance with each one."
        actions={
          <Button onClick={() => setAdding(true)}>
            <Plus className="size-4" aria-hidden />
            New job
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard compact title="Open jobs" value={open.length} icon={Hammer} subtitle={`${new Set(open.map((job) => job.karigar?.id)).size} karigars at work`} />
        <KpiCard compact title="Gold with karigars" value={grams(goldWithKarigars)} icon={Scale} tone="gold" subtitle="Fine gold still to come back" />
        <KpiCard compact title="Past due date" value={late.length} icon={AlarmClock} tone={late.length ? "risk" : "ok"} subtitle={late.length ? "Call the karigar" : "All on time"} />
        <KpiCard compact title="Settled this month" value={settledThisMonth.length} icon={CircleCheckBig} tone="navy" subtitle="Jobs closed since the 1st" />
      </div>

      <Tabs<View | "late">
        label="Job status"
        active={view}
        onChange={setView}
        tabs={[
          { key: "open", label: "Open", count: open.length },
          { key: "late", label: "Late", count: late.length },
          { key: "closed", label: "Settled", count: all.length - open.length },
          { key: "all", label: "All", count: all.length },
        ]}
        actions={
          <ToolbarActions>
            <ToolbarSearch value={q} onChange={setQ} placeholder="Job, karigar or work…" />
            <ToolbarExport onExport={exportCsv} />
            <ToolbarButton icon={Plus} label="New job" active onClick={() => setAdding(true)} />
          </ToolbarActions>
        }
      />
      {jobs.data && <ResultsCount shown={rows.length} total={all.length} noun="job" />}

      <Card className="overflow-hidden">
        {jobs.loading && !jobs.data ? (
          <div className="grid place-items-center py-12 text-navy">
            <Spinner />
          </div>
        ) : jobs.error ? (
          <p className="p-5 text-sm text-risk">{jobs.error}</p>
        ) : !rows.length ? (
          <EmptyState icon={Hammer} title="No karigar jobs here" description={needle ? "Nothing matches the search." : "Open a job when you hand gold to a karigar."} />
        ) : (
          <Table minWidth={900}>
            <thead>
              <tr>
                <Th>Job</Th>
                <Th>Karigar</Th>
                <Th>Work</Th>
                <Th align="right">Fine given</Th>
                <Th align="right">Pieces back</Th>
                <Th align="right">Balance with karigar</Th>
                <Th>Due</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((job) => {
                const isLate = late.includes(job);
                return (
                  <Tr key={job.id} className="cursor-pointer" onClick={() => router.push(`/karigar/${job.id}`)}>
                    <Td>
                      <Link href={`/karigar/${job.id}`} className="grid leading-tight" onClick={(event) => event.stopPropagation()}>
                        <span className="font-mono font-semibold text-ink hover:underline">{job.number}</span>
                        <Badge tone={job.status === "closed" ? "ok" : "gold"} dot className="mt-1 justify-self-start">
                          {job.status === "closed" ? "Closed" : "Open"}
                        </Badge>
                      </Link>
                    </Td>
                    <Td>
                      <span className="flex items-center gap-2.5">
                        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-gold-soft text-gold-deep">
                          <Hammer className="size-3.5" aria-hidden />
                        </span>
                        <span className="font-semibold text-ink">{job.karigar?.name}</span>
                      </span>
                    </Td>
                    <Td className="max-w-64">
                      <span className="line-clamp-2 text-[13px]">{job.description || "—"}</span>
                    </Td>
                    <Td align="right">
                      {grams(job.totals?.issuedFine ?? 0)}
                      {job.totals?.metal && job.totals.metal !== "gold" ? <span className="text-[12px] text-ash"> {job.totals.metal}</span> : null}
                    </Td>
                    <Td align="right">{job.totals?.receivedPieces ?? 0}</Td>
                    <Td align="right" className={(job.totals?.balanceFine ?? 0) < 0 ? "text-risk" : "font-semibold text-ink"}>
                      {grams(job.totals?.balanceFine ?? 0)}
                    </Td>
                    <Td className={isLate ? "font-semibold whitespace-nowrap text-risk" : "whitespace-nowrap"}>
                      {job.dueOn ? formatDate(job.dueOn) : "—"}
                      {isLate && <span className="block text-[11px] font-bold uppercase">Late</span>}
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>

      <Modal open={adding} onClose={() => setAdding(false)} title="New karigar job" description="Record the metal and stones handed over now. Pieces that come back are received against the job." size="xl">
        <NewJob onSaved={(job, print) => router.push(`/karigar/${job.id}${print ? "?print=1" : ""}`)} onCancel={() => setAdding(false)} />
      </Modal>
    </div>
  );
}

