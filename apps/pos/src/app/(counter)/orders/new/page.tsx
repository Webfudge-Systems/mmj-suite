"use client";

import { use, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Camera, Gem, IndianRupee, Save, UserRound, Wrench } from "lucide-react";
import { errorMessage, useApi, useBranch } from "@webfudge/auth/components";
import { PURITIES } from "@webfudge/config";
import { Alert, Button, Card, CardBody, CardHeader, Field, Input, PageHeader, Select, Textarea, cn } from "@webfudge/ui";
import type { Customer, ImageRef, OrderKind, PaymentMode, ServiceOrder } from "@webfudge/utils/api";
import { PAYMENT_MODE_LABELS } from "@webfudge/utils/api";
import { CustomerPicker } from "@/components/customer-picker";
import { PhotoStrip } from "@/components/photos";

export default function NewOrderPage({ searchParams }: { searchParams: Promise<{ customer?: string; kind?: string }> }) {
  const params = use(searchParams);
  const router = useRouter();
  const api = useApi();
  const { branch } = useBranch();
  const [kind, setKind] = useState<OrderKind>(params.kind === "custom" ? "custom" : "repair");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [photos, setPhotos] = useState<ImageRef[]>([]);
  const [form, setForm] = useState({ description: "", itemDescription: "", purity: "22KT", weightIn: "", estimate: "", dueOn: "", advance: "", mode: "cash" as PaymentMode, reference: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof typeof form) => (value: string) => setForm((current) => ({ ...current, [key]: value }));

  // Opened from a customer's page: that customer is already chosen.
  useEffect(() => {
    if (!params.customer) return;
    api
      .get<{ data: Customer }>(`/sales/customers/${params.customer}`)
      .then(({ data }) => setCustomer(data))
      .catch(() => undefined);
  }, [api, params.customer]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { data } = await api.post<{ data: ServiceOrder }>("/orders", {
        branchId: branch?.id,
        kind,
        customerId: customer?.id,
        description: form.description,
        itemDescription: form.itemDescription,
        purity: form.purity,
        weightIn: form.weightIn,
        estimate: form.estimate,
        dueOn: form.dueOn || null,
        photoIds: photos.map((photo) => photo.id),
        payments: Number(form.advance) > 0 ? [{ mode: form.mode, amount: Number(form.advance), reference: form.reference || null }] : [],
      });
      router.push(`/orders/${data.id}?new=1`);
    } catch (cause) {
      setError(errorMessage(cause));
      setBusy(false);
    }
  }

  const repair = kind === "repair";

  return (
    <form onSubmit={submit} className="grid gap-6" noValidate>
      <PageHeader title="New repair or order" description="Give the customer the order number when you save. Weigh repairs in front of them and photograph the piece." />

      <div className="grid gap-3 sm:grid-cols-2">
        {(["repair", "custom"] as const).map((value) => {
          const selected = kind === value;
          const Icon = value === "repair" ? Wrench : Gem;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setKind(value)}
              aria-pressed={selected}
              className={cn(
                "flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition-all",
                selected ? "border-navy bg-navy-soft shadow-md" : "border-gray-200 bg-white hover:border-gray-300",
              )}
            >
              <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl", selected ? "bg-navy text-white" : "bg-gray-100 text-gray-500")}>
                <Icon className="size-5" aria-hidden />
              </span>
              <span>
                <span className="block font-semibold text-ink">{value === "repair" ? "Repair of their piece" : "Custom piece to make"}</span>
                <span className="text-[13px] text-ash">{value === "repair" ? "Solder, polish, resize, stone setting. Weighed in and out." : "Made to their design. Tagged and billed when ready."}</span>
              </span>
            </button>
          );
        })}
      </div>

      <Card>
        <CardHeader icon={UserRound} title="Customer" />
        <CardBody>
          <CustomerPicker value={customer} onChange={setCustomer} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader icon={repair ? Wrench : Gem} title={repair ? "The piece and the work" : "What to make"} />
        <CardBody className="grid gap-4">
          <Field label={repair ? "What needs doing" : "What to make"} htmlFor="order-description">
            <Textarea
              id="order-description"
              value={form.description}
              onChange={(event) => set("description")(event.target.value)}
              placeholder={repair ? "Like: solder broken link, replace clasp, polish" : "Like: name pendant 'Aarav' in 22KT, about 5 g"}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {repair && (
              <Field label="Their piece" htmlFor="order-item">
                <Input id="order-item" value={form.itemDescription} onChange={(event) => set("itemDescription")(event.target.value)} placeholder="Gold chain with pendant" />
              </Field>
            )}
            <Field label="Purity" htmlFor="order-purity">
              <Select id="order-purity" value={form.purity} onChange={(event) => set("purity")(event.target.value)}>
                {PURITIES.map((purity) => (
                  <option key={purity.code} value={purity.code}>
                    {purity.label}
                  </option>
                ))}
              </Select>
            </Field>
            {repair && (
              <Field label="Weight taken in (g)" htmlFor="order-weight">
                <Input id="order-weight" inputMode="decimal" value={form.weightIn} onChange={(event) => set("weightIn")(event.target.value)} />
              </Field>
            )}
            <Field label="Promised for" htmlFor="order-due">
              <Input id="order-due" type="date" value={form.dueOn} onChange={(event) => set("dueOn")(event.target.value)} />
            </Field>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          icon={Camera}
          title="Photos"
          description={repair ? "Their piece as it came in: front, back, any damage. Proof if a question comes up later." : "Reference pictures or sketches the customer showed you."}
        />
        <CardBody>
          <PhotoStrip id="order-photos" photos={photos} onChange={setPhotos} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader icon={IndianRupee} title="Estimate and advance" description="The advance is counted in today's day close." />
        <CardBody className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Estimate (₹)" htmlFor="order-estimate">
            <Input id="order-estimate" inputMode="decimal" value={form.estimate} onChange={(event) => set("estimate")(event.target.value)} />
          </Field>
          <Field label="Advance received (₹)" htmlFor="order-advance" hint="Optional.">
            <Input id="order-advance" inputMode="decimal" value={form.advance} onChange={(event) => set("advance")(event.target.value)} />
          </Field>
          {Number(form.advance) > 0 && (
            <>
              <Field label="Paid by" htmlFor="order-mode">
                <Select id="order-mode" value={form.mode} onChange={(event) => set("mode")(event.target.value)}>
                  {(Object.keys(PAYMENT_MODE_LABELS) as PaymentMode[]).map((mode) => (
                    <option key={mode} value={mode}>
                      {PAYMENT_MODE_LABELS[mode]}
                    </option>
                  ))}
                </Select>
              </Field>
              {form.mode !== "cash" && (
                <Field label="Reference" htmlFor="order-reference">
                  <Input id="order-reference" value={form.reference} onChange={(event) => set("reference")(event.target.value)} />
                </Field>
              )}
            </>
          )}
        </CardBody>
      </Card>

      {error && <Alert tone="risk">{error}</Alert>}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" loading={busy} disabled={!customer || !form.description.trim()}>
          <Save className="size-4" aria-hidden />
          Save {repair ? "repair" : "order"}
        </Button>
        <Button variant="ghost" onClick={() => router.push("/orders")}>
          Cancel
        </Button>
        {(!customer || !form.description.trim()) && <span className="text-[13px] text-ash">{!customer ? "Choose the customer first." : "Describe the work to save."}</span>}
      </div>
    </form>
  );
}
