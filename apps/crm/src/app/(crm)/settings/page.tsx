"use client";

import { useState, type FormEvent } from "react";
import { errorMessage, useApi, useAuth, useResource } from "@webfudge/auth/components";
import { Alert, Button, Card, CardBody, CardHeader, Field, Input, PageHeader, Spinner } from "@webfudge/ui";
import type { LoyaltyRules } from "@webfudge/utils/api";
import { formatINR } from "@webfudge/utils/formatters";

function LoyaltyForm({ rules, onSaved }: { rules: LoyaltyRules; onSaved: () => void }) {
  const api = useApi();
  const { hasRole } = useAuth();
  const canEdit = hasRole("owner", "branch_manager");
  const [form, setForm] = useState({ enabled: rules.enabled, rupeesPerPoint: String(rules.rupeesPerPoint), pointValue: String(rules.pointValue), minRedeem: String(rules.minRedeem) });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "risk"; text: string } | null>(null);
  const set = (key: keyof typeof form) => (value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));
  const perLakh = Math.floor(100000 / (Number(form.rupeesPerPoint) || 1)) * (Number(form.pointValue) || 0);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await api.put("/crm/settings", { loyalty: { enabled: form.enabled, rupeesPerPoint: Number(form.rupeesPerPoint), pointValue: Number(form.pointValue), minRedeem: Number(form.minRedeem) } });
      setMessage({ tone: "ok", text: "Saved. New bills earn points on these rules." });
      onSaved();
    } catch (cause) {
      setMessage({ tone: "risk", text: errorMessage(cause) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Loyalty points" description="Points are worked out on the bill total. Ask your CA how redeemed points should appear in the books." />
      <CardBody>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-3" noValidate>
          <label className="flex items-center gap-3 text-sm sm:col-span-3">
            <input type="checkbox" checked={form.enabled} onChange={(event) => set("enabled")(event.target.checked)} disabled={!canEdit} className="size-5 accent-navy" />
            <span className="font-semibold text-ink">Customers earn points on bills</span>
          </label>
          <Field label="Rupees billed for one point" htmlFor="rpp">
            <Input id="rpp" inputMode="numeric" value={form.rupeesPerPoint} onChange={(event) => set("rupeesPerPoint")(event.target.value)} disabled={!canEdit} />
          </Field>
          <Field label="One point is worth (₹)" htmlFor="pv">
            <Input id="pv" inputMode="decimal" value={form.pointValue} onChange={(event) => set("pointValue")(event.target.value)} disabled={!canEdit} />
          </Field>
          <Field label="Fewest points to redeem" htmlFor="mr">
            <Input id="mr" inputMode="numeric" value={form.minRedeem} onChange={(event) => set("minRedeem")(event.target.value)} disabled={!canEdit} />
          </Field>
          <p className="rounded-xl bg-navy-soft/60 px-4 py-3 text-sm text-ink sm:col-span-3">
            A ₹1 lakh bill earns {Math.floor(100000 / (Number(form.rupeesPerPoint) || 1))} points, worth {formatINR(perLakh)} off a later bill ({((perLakh / 100000) * 100).toFixed(2)}% back).
          </p>
          {message && <Alert tone={message.tone} className="sm:col-span-3">{message.text}</Alert>}
          {canEdit && (
            <div className="sm:col-span-3">
              <Button type="submit" loading={busy}>
                Save loyalty rules
              </Button>
            </div>
          )}
        </form>
      </CardBody>
    </Card>
  );
}

export default function SettingsPage() {
  const { data, loading, error, reload } = useResource<{ data: { loyalty: LoyaltyRules } }>("/crm/settings");

  return (
    <div className="grid gap-6">
      <PageHeader title="CRM settings" description="Loyalty rules. Gold scheme plans are set up under Gold schemes › Plans." />
      {loading && !data ? <Spinner className="text-navy" /> : error ? <p className="text-sm text-risk">{error}</p> : data ? <LoyaltyForm rules={data.data.loyalty} onSaved={reload} /> : null}
    </div>
  );
}
