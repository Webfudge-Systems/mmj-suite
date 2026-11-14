"use client";

import { useState, type FormEvent } from "react";
import { PiggyBank, Plus } from "lucide-react";
import { errorMessage, useApi, useAuth, useResource } from "@webfudge/auth/components";
import { Alert, Badge, Button, Card, CardBody, CardHeader, EmptyState, Field, Input, PageHeader, Select, Textarea } from "@webfudge/ui";
import type { BonusType, SchemePlan } from "@webfudge/utils/api";
import { formatINR } from "@webfudge/utils/formatters";
import { bonusLabel } from "@/components/crm";

const blank = { name: "", months: "11", minInstalment: "1000", bonusType: "instalment" as BonusType, bonusValue: "1", graceDays: "7", terms: "", isActive: true };

function PlanForm({ plan, onSaved, onCancel }: { plan: SchemePlan | null; onSaved: () => void; onCancel: () => void }) {
  const api = useApi();
  const [form, setForm] = useState(
    plan
      ? { name: plan.name, months: String(plan.months), minInstalment: String(plan.minInstalment), bonusType: plan.bonusType, bonusValue: String(plan.bonusValue), graceDays: String(plan.graceDays), terms: plan.terms ?? "", isActive: plan.isActive }
      : blank,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof typeof form) => (value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body = { ...form, months: Number(form.months), minInstalment: Number(form.minInstalment), bonusValue: Number(form.bonusValue), graceDays: Number(form.graceDays) };
      if (plan) await api.put(`/crm/scheme-plans/${plan.id}`, body);
      else await api.post("/crm/scheme-plans", body);
      onSaved();
    } catch (cause) {
      setError(errorMessage(cause));
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader title={plan ? `Edit ${plan.name}` : "New plan"} description="Changes apply to new enrolments. Customers already enrolled keep the terms they joined on." />
      <CardBody>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" noValidate>
          <Field label="Plan name" htmlFor="p-name">
            <Input id="p-name" value={form.name} onChange={(event) => set("name")(event.target.value)} placeholder="Swarna Bachat 11 + 1" />
          </Field>
          <Field label="Monthly instalments" htmlFor="p-months" hint="Up to 12. Longer schemes count as deposits under company law.">
            <Input id="p-months" inputMode="numeric" value={form.months} onChange={(event) => set("months")(event.target.value)} />
          </Field>
          <Field label="Smallest instalment (₹)" htmlFor="p-min">
            <Input id="p-min" inputMode="decimal" value={form.minInstalment} onChange={(event) => set("minInstalment")(event.target.value)} />
          </Field>
          <Field label="Shop's bonus" htmlFor="p-bonus-type">
            <Select id="p-bonus-type" value={form.bonusType} onChange={(event) => set("bonusType")(event.target.value)}>
              <option value="instalment">Free instalments</option>
              <option value="percent">Percent of what was paid</option>
              <option value="none">No bonus</option>
            </Select>
          </Field>
          {form.bonusType !== "none" && (
            <Field label={form.bonusType === "instalment" ? "How many instalments free" : "Bonus percent"} htmlFor="p-bonus">
              <Input id="p-bonus" inputMode="decimal" value={form.bonusValue} onChange={(event) => set("bonusValue")(event.target.value)} />
            </Field>
          )}
          <Field label="Days of grace for a late instalment" htmlFor="p-grace">
            <Input id="p-grace" inputMode="numeric" value={form.graceDays} onChange={(event) => set("graceDays")(event.target.value)} />
          </Field>
          <Field label="Terms printed for the customer" htmlFor="p-terms" className="sm:col-span-2 lg:col-span-3">
            <Textarea id="p-terms" value={form.terms} onChange={(event) => set("terms")(event.target.value)} placeholder="What happens if an instalment is missed, what can be bought, and so on. Have your CA check these." />
          </Field>
          <label className="flex items-center gap-3 text-sm sm:col-span-2 lg:col-span-3">
            <input type="checkbox" checked={form.isActive} onChange={(event) => set("isActive")(event.target.checked)} className="size-5 accent-navy" />
            Offered to new customers
          </label>
          {error && <Alert tone="risk" className="sm:col-span-2 lg:col-span-3">{error}</Alert>}
          <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
            <Button type="submit" loading={busy} disabled={!form.name.trim()}>
              Save plan
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

export default function PlansPage() {
  const { hasRole } = useAuth();
  const plans = useResource<{ data: SchemePlan[] }>("/crm/scheme-plans?active=all");
  const [editing, setEditing] = useState<SchemePlan | "new" | null>(null);
  const canEdit = hasRole("owner", "branch_manager");

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Scheme plans"
        description="The gold savings schemes you offer. A common one: 11 monthly instalments, and the shop pays the 12th."
        actions={
          canEdit && (
            <Button onClick={() => setEditing("new")}>
              <Plus className="size-4" aria-hidden />
              New plan
            </Button>
          )
        }
      />

      {editing && (
        <PlanForm
          plan={editing === "new" ? null : editing}
          onSaved={() => {
            setEditing(null);
            plans.reload();
          }}
          onCancel={() => setEditing(null)}
        />
      )}

      {plans.data && !plans.data.data.length ? (
        <Card>
          <EmptyState icon={PiggyBank} title="No plans yet" description="Create your first gold savings plan to start enrolling customers." />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plans.data?.data.map((plan) => (
            <Card key={plan.id} className="flex flex-col">
              <CardHeader title={plan.name} action={plan.isActive ? <Badge tone="ok">Offered</Badge> : <Badge>Not offered</Badge>} />
              <CardBody className="grid flex-1 gap-2 text-sm">
                <p className="text-2xl font-bold text-ink">
                  {plan.months} months <span className="text-base font-normal text-ash">· {bonusLabel(plan)}</span>
                </p>
                <p className="text-ash">From {formatINR(plan.minInstalment)} a month · {plan.graceDays} days grace</p>
                {plan.terms && <p className="line-clamp-3 text-[13px] text-ash">{plan.terms}</p>}
              </CardBody>
              {canEdit && (
                <div className="border-t border-gray-100 px-6 py-3">
                  <Button size="sm" variant="secondary" onClick={() => setEditing(plan)}>
                    Edit
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
