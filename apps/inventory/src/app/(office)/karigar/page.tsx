"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Hammer, Plus } from "lucide-react";
import { PURITIES } from "@webfudge/config";
import { Alert, Badge, Button, Card, CardBody, CardHeader, EmptyState, Field, Input, PageHeader, Select, Spinner, Table, Tabs, Td, Textarea, Th, Tr } from "@webfudge/ui";
import type { JobWork, Supplier } from "@webfudge/utils/api";
import { formatDate } from "@webfudge/utils/formatters";
import { errorMessage, useApi, useResource } from "@/lib/api";
import { useBranch } from "@/lib/branch";

type View = "open" | "closed" | "all";

function grams(value: number) {
  return `${value.toFixed(3)} g`;
}

function NewJob({ onSaved, onCancel }: { onSaved: (job: JobWork) => void; onCancel: () => void }) {
  const api = useApi();
  const { branch } = useBranch();
  const karigars = useResource<{ data: Supplier[] }>("/stock/suppliers?kind=karigar");
  const [form, setForm] = useState({ karigarId: "", description: "", dueOn: "", wastagePercent: "2", purity: "24KT", grossWeight: "", note: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof typeof form) => (value: string) => setForm((current) => ({ ...current, [key]: value }));

  async function submit(event: FormEvent) {
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
        ...(form.grossWeight ? { issue: { purity: form.purity, grossWeight: Number(form.grossWeight), note: form.note } } : {}),
      });
      onSaved(data);
    } catch (cause) {
      setError(errorMessage(cause));
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader title="New karigar job" description="Record the metal handed over now. Pieces that come back are received against the job." />
      <CardBody>
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
          <Field label="Metal given: purity" htmlFor="job-purity">
            <Select id="job-purity" value={form.purity} onChange={(event) => set("purity")(event.target.value)}>
              {PURITIES.map((purity) => (
                <option key={purity.code} value={purity.code}>
                  {purity.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Weight given (g)" htmlFor="job-weight" hint="Leave empty to record the metal later.">
            <Input id="job-weight" inputMode="decimal" value={form.grossWeight} onChange={(event) => set("grossWeight")(event.target.value)} placeholder="40.000" />
          </Field>
          <Field label="Note" htmlFor="job-note" className="sm:col-span-2">
            <Input id="job-note" value={form.note} onChange={(event) => set("note")(event.target.value)} placeholder="Bar number, old gold lot" />
          </Field>
          {error && <Alert tone="risk" className="sm:col-span-2 lg:col-span-4">{error}</Alert>}
          <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
            <Button type="submit" loading={busy} disabled={!form.karigarId}>
              Open job
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

export default function KarigarPage() {
  const router = useRouter();
  const [view, setView] = useState<View>("open");
  const [adding, setAdding] = useState(false);
  const jobs = useResource<{ data: JobWork[] }>(`/karigar/jobs?status=${view === "all" ? "" : view}`);
  const rows = jobs.data?.data ?? [];

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Karigar job work"
        description="Gold given to karigars, pieces received back, and the fine-gold balance with each one."
        actions={
          <Button onClick={() => setAdding((value) => !value)}>
            <Plus className="size-4" aria-hidden />
            New job
          </Button>
        }
      />

      {adding && <NewJob onSaved={(job) => router.push(`/karigar/${job.id}`)} onCancel={() => setAdding(false)} />}

      <Tabs<View>
        label="Job status"
        active={view}
        onChange={setView}
        tabs={[
          { key: "open", label: "Open" },
          { key: "closed", label: "Settled" },
          { key: "all", label: "All" },
        ]}
      />

      <Card className="overflow-hidden">
        {jobs.loading && !jobs.data ? (
          <div className="grid place-items-center py-12 text-navy">
            <Spinner />
          </div>
        ) : jobs.error ? (
          <p className="p-5 text-sm text-risk">{jobs.error}</p>
        ) : !rows.length ? (
          <EmptyState icon={Hammer} title="No karigar jobs here" description="Open a job when you hand gold to a karigar." />
        ) : (
          <Table minWidth={860}>
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
              {rows.map((job) => (
                <Tr key={job.id} className="cursor-pointer" onClick={() => router.push(`/karigar/${job.id}`)}>
                  <Td>
                    <Link href={`/karigar/${job.id}`} className="grid leading-tight" onClick={(event) => event.stopPropagation()}>
                      <span className="font-mono font-semibold text-ink hover:underline">{job.number}</span>
                      {job.status === "closed" ? <Badge className="mt-1 justify-self-start">Settled</Badge> : null}
                    </Link>
                  </Td>
                  <Td className="font-semibold">{job.karigar?.name}</Td>
                  <Td className="max-w-64">
                    <span className="line-clamp-2 text-[13px]">{job.description || "—"}</span>
                  </Td>
                  <Td align="right">{grams(job.totals?.issuedFine ?? 0)}</Td>
                  <Td align="right">{job.totals?.receivedPieces ?? 0}</Td>
                  <Td align="right" className={(job.totals?.balanceFine ?? 0) < 0 ? "text-risk" : undefined}>
                    {grams(job.totals?.balanceFine ?? 0)}
                  </Td>
                  <Td>{job.dueOn ? formatDate(job.dueOn) : "—"}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
