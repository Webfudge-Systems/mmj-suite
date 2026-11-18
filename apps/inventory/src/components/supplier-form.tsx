"use client";

import { useState, type FormEvent } from "react";
import { Alert, Button, Field, Input, Select, Textarea } from "@webfudge/ui";
import type { Supplier } from "@webfudge/utils/api";
import { errorMessage, useApi } from "@/lib/api";

/**
 * Adds or edits a supplier or karigar. `full` also shows the contact person,
 * email, address and notes, as on the supplier's own page.
 */
export function SupplierForm({ supplier, onSaved, onCancel, full = false }: { supplier?: Supplier; onSaved: (saved: Supplier) => void; onCancel?: () => void; full?: boolean }) {
  const api = useApi();
  const key = supplier?.id ?? "new";
  const [form, setForm] = useState({
    name: supplier?.name ?? "",
    kind: supplier?.kind ?? ("supplier" as Supplier["kind"]),
    phone: supplier?.phone ?? "",
    city: supplier?.city ?? "",
    gstin: supplier?.gstin ?? "",
    contactPerson: supplier?.contactPerson ?? "",
    email: supplier?.email ?? "",
    address: supplier?.address ?? "",
    notes: supplier?.notes ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (field: keyof typeof form) => (value: string) => setForm((current) => ({ ...current, [field]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const body = {
      name: form.name,
      kind: form.kind,
      phone: form.phone,
      city: form.city,
      gstin: form.gstin,
      isActive: supplier?.isActive ?? true,
      ...(full ? { contactPerson: form.contactPerson, email: form.email, address: form.address, notes: form.notes } : {}),
    };
    try {
      const { data } = supplier ? await api.put<{ data: Supplier }>(`/stock/suppliers/${supplier.id}`, body) : await api.post<{ data: Supplier }>("/stock/suppliers", body);
      if (!supplier) setForm((current) => ({ ...current, name: "", phone: "", city: "", gstin: "", contactPerson: "", email: "", address: "", notes: "" }));
      onSaved(data);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6" noValidate>
      <Field label="Name" htmlFor={`sup-name-${key}`} className="lg:col-span-2">
        <Input id={`sup-name-${key}`} value={form.name} onChange={(event) => set("name")(event.target.value)} />
      </Field>
      <Field label="Type" htmlFor={`sup-kind-${key}`}>
        <Select id={`sup-kind-${key}`} value={form.kind} onChange={(event) => set("kind")(event.target.value)}>
          <option value="supplier">Supplier</option>
          <option value="karigar">Karigar</option>
        </Select>
      </Field>
      <Field label="Phone" htmlFor={`sup-phone-${key}`}>
        <Input id={`sup-phone-${key}`} inputMode="tel" value={form.phone} onChange={(event) => set("phone")(event.target.value)} />
      </Field>
      <Field label="City" htmlFor={`sup-city-${key}`}>
        <Input id={`sup-city-${key}`} value={form.city} onChange={(event) => set("city")(event.target.value)} />
      </Field>
      <Field label="GSTIN" htmlFor={`sup-gstin-${key}`}>
        <Input id={`sup-gstin-${key}`} value={form.gstin} maxLength={15} onChange={(event) => set("gstin")(event.target.value)} className="font-mono uppercase" />
      </Field>
      {full && (
        <>
          <Field label="Contact person" htmlFor={`sup-contact-${key}`} className="lg:col-span-2">
            <Input id={`sup-contact-${key}`} value={form.contactPerson} onChange={(event) => set("contactPerson")(event.target.value)} />
          </Field>
          <Field label="Email" htmlFor={`sup-email-${key}`} className="lg:col-span-2">
            <Input id={`sup-email-${key}`} type="email" value={form.email} onChange={(event) => set("email")(event.target.value)} />
          </Field>
          <Field label="Address" htmlFor={`sup-address-${key}`} className="sm:col-span-2 lg:col-span-6">
            <Textarea id={`sup-address-${key}`} value={form.address} onChange={(event) => set("address")(event.target.value)} className="min-h-12" />
          </Field>
          <Field label="Notes" htmlFor={`sup-notes-${key}`} className="sm:col-span-2 lg:col-span-6" hint="Payment terms, usual making, what they are good at.">
            <Textarea id={`sup-notes-${key}`} value={form.notes} onChange={(event) => set("notes")(event.target.value)} className="min-h-12" />
          </Field>
        </>
      )}
      {error && <Alert tone="risk" className="sm:col-span-2 lg:col-span-6">{error}</Alert>}
      <div className="flex gap-2 sm:col-span-2 lg:col-span-6">
        <Button type="submit" loading={busy} disabled={!form.name.trim()}>
          {supplier ? "Save" : "Add"}
        </Button>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
