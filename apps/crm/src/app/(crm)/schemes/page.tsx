"use client";

import { use, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PiggyBank, Plus, Search, Settings2 } from "lucide-react";
import { errorMessage, useApi, useBranch, useResource } from "@webfudge/auth/components";
import { Alert, Button, Card, CardBody, CardHeader, EmptyState, Field, Input, PageHeader, Select, Spinner, Table, Tabs, Td, Th, Tr, buttonClass } from "@webfudge/ui";
import type { Customer, SchemeAccount, SchemePlan } from "@webfudge/utils/api";
import { formatDate, formatINR } from "@webfudge/utils/formatters";
import { SchemeBadge, bonusLabel } from "@/components/crm";
import { CustomerPicker } from "@/components/customer-picker";

type View = "active" | "due" | "matured" | "redeemed" | "closed" | "all";


function Enrol({ initialCustomerId, onSaved, onCancel }: { initialCustomerId?: string; onSaved: (account: SchemeAccount) => void; onCancel: () => void }) {
  const api = useApi();
  const { branch } = useBranch();
  const plans = useResource<{ data: SchemePlan[] }>("/crm/scheme-plans");
  const preset = useResource<{ data: Customer }>(initialCustomerId ? `/sales/customers/${initialCustomerId}` : null);
  const [picked, setPicked] = useState<Customer | null>(null);
  const customer = picked ?? preset.data?.data ?? null;
  const [planId, setPlanId] = useState("");
  const [monthly, setMonthly] = useState("");
  const [startDate, setStartDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const plan = plans.data?.data.find((entry) => String(entry.id) === planId) ?? plans.data?.data[0];
  const amount = Number(monthly) || 0;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!customer || !plan) return;
    setBusy(true);
    setError(null);
    try {
      const { data } = await api.post<{ data: SchemeAccount }>("/crm/schemes", { branchId: branch?.id, planId: plan.id, customerId: customer.id, monthlyAmount: amount, startDate: startDate || undefined });
      onSaved(data);
    } catch (cause) {
      setError(errorMessage(cause));
      setBusy(false);
    }
  }

  if (plans.data && !plans.data.data.length) {
    return (
      <Alert tone="warn" title="No scheme plans yet">
        Set up a plan first, like 11 monthly instalments with the 12th free. <Link href="/schemes/plans" className="font-semibold underline">Create a plan</Link>
      </Alert>
    );
  }

  const bonus = plan ? (plan.bonusType === "instalment" ? amount * plan.bonusValue : plan.bonusType === "percent" ? (amount * plan.months * plan.bonusValue) / 100 : 0) : 0;

  return (
    <Card>
      <CardHeader title="Enrol a customer" description="The first instalment is taken on the scheme's page after enrolling." />
      <CardBody>
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <Field label="Customer" htmlFor="customer-search">
            <CustomerPicker value={customer} onChange={setPicked} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Plan" htmlFor="enrol-plan">
              <Select id="enrol-plan" value={plan ? String(plan.id) : ""} onChange={(event) => setPlanId(event.target.value)}>
                {plans.data?.data.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name} · {entry.months} months · {bonusLabel(entry)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Monthly instalment (₹)" htmlFor="enrol-amount" hint={plan ? `At least ${formatINR(plan.minInstalment)}` : undefined}>
              <Input id="enrol-amount" inputMode="decimal" value={monthly} onChange={(event) => setMonthly(event.target.value)} placeholder="5000" />
            </Field>
            <Field label="Starts on" htmlFor="enrol-start" hint="Defaults to today">
              <Input id="enrol-start" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            </Field>
          </div>
          {plan && amount > 0 && (
            <p className="rounded-xl bg-navy-soft/60 px-4 py-3 text-sm text-ink">
              {plan.months} instalments of {formatINR(amount)} = <strong>{formatINR(amount * plan.months)}</strong>, plus{" "}
              <strong>{formatINR(bonus)}</strong> from the shop at the end. Total to spend: <strong>{formatINR(amount * plan.months + bonus)}</strong>.
            </p>
          )}
          {error && <Alert tone="risk">{error}</Alert>}
          <div className="flex gap-2">
            <Button type="submit" loading={busy} disabled={!customer || !plan || !(amount > 0)}>
              Enrol
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

export default function SchemesPage({ searchParams }: { searchParams: Promise<{ enrol?: string; customer?: string }> }) {
  const params = use(searchParams);
  const router = useRouter();
  const [view, setView] = useState<View>("active");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [enrolling, setEnrolling] = useState(params.enrol === "1");

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(query.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const path = view === "due" ? "/crm/schemes?due=true" : `/crm/schemes?status=${view === "all" ? "" : view}`;
  const list = useResource<{ data: SchemeAccount[] }>(`${path}${search ? `&q=${encodeURIComponent(search)}` : ""}`);
  const rows = list.data?.data ?? [];

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Gold schemes"
        description="Monthly savings towards jewellery. Matured schemes become an advance the billing counter takes off the bill."
        actions={
          <>
            <Link href="/schemes/plans" className={buttonClass("secondary")}>
              <Settings2 className="size-4" aria-hidden />
              Plans
            </Link>
            <Button onClick={() => setEnrolling((value) => !value)}>
              <Plus className="size-4" aria-hidden />
              Enrol
            </Button>
          </>
        }
      />

      {enrolling && <Enrol initialCustomerId={params.customer} onSaved={(account) => router.push(`/schemes/${account.id}`)} onCancel={() => setEnrolling(false)} />}

      <Tabs<View>
        label="Scheme status"
        active={view}
        onChange={setView}
        tabs={[
          { key: "active", label: "Paying" },
          { key: "due", label: "Behind" },
          { key: "matured", label: "Ready to redeem" },
          { key: "redeemed", label: "Redeemed" },
          { key: "closed", label: "Closed early" },
          { key: "all", label: "All" },
        ]}
        actions={
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-gray-400" aria-hidden />
            <Input id="scheme-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, number or SCH-" className="h-10 w-60 rounded-full pl-10" />
          </div>
        }
      />

      <Card className="overflow-hidden">
        {list.loading && !list.data ? (
          <div className="grid place-items-center py-12 text-navy">
            <Spinner />
          </div>
        ) : list.error ? (
          <p className="p-5 text-sm text-risk">{list.error}</p>
        ) : rows.length === 0 ? (
          <EmptyState icon={PiggyBank} title="No schemes here" description="Enrol a customer to start their monthly savings." />
        ) : (
          <Table minWidth={860}>
            <thead>
              <tr>
                <Th>Scheme</Th>
                <Th>Customer</Th>
                <Th align="right">Monthly</Th>
                <Th>Paid</Th>
                <Th align="right">Saved</Th>
                <Th>Next due</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((account) => (
                <Tr key={account.id} className="cursor-pointer" onClick={() => router.push(`/schemes/${account.id}`)}>
                  <Td>
                    <Link href={`/schemes/${account.id}`} className="grid leading-tight" onClick={(event) => event.stopPropagation()}>
                      <span className="font-mono font-semibold text-ink hover:underline">{account.number}</span>
                      <span className="text-[12px] text-ash">{account.plan?.name}</span>
                    </Link>
                  </Td>
                  <Td>
                    <span className="grid leading-tight">
                      <span className="font-semibold">{account.customer?.name}</span>
                      <span className="text-[12.5px] text-ash">{account.customer?.phone}</span>
                    </span>
                  </Td>
                  <Td align="right">{formatINR(account.monthlyAmount)}</Td>
                  <Td>
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-24 overflow-hidden rounded-full bg-gray-100">
                        <span className="block h-full rounded-full bg-navy" style={{ width: `${(account.instalmentsPaid / account.months) * 100}%` }} />
                      </span>
                      <span className="text-[12.5px] text-ash tabular-nums">
                        {account.instalmentsPaid}/{account.months}
                      </span>
                    </span>
                  </Td>
                  <Td align="right">{formatINR(account.paidTotal)}</Td>
                  <Td>{account.nextDueOn ? formatDate(account.nextDueOn) : "—"}</Td>
                  <Td>
                    <SchemeBadge status={account.status} behind={account.behind} />
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
