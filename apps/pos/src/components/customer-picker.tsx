"use client";

import { useEffect, useState, type FormEvent } from "react";
import { errorMessage, useApi } from "@webfudge/auth/components";
import { Alert, Button, Field, Input } from "@webfudge/ui";
import { ApiError, type Customer } from "@webfudge/utils/api";

type Props = {
  value: Customer | null;
  onChange: (customer: Customer | null) => void;
  /** Ask for PAN in the add form, for bills that need it. */
  needPan?: boolean;
};

/** Finds a customer by mobile number or name, or adds a new one on the spot. */
export function CustomerPicker({ value, onChange, needPan }: Props) {
  const api = useApi();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [adding, setAdding] = useState(false);
  const [editingPan, setEditingPan] = useState(false);

  useEffect(() => {
    if (value || query.trim().length < 3) return;
    let active = true;
    const timer = window.setTimeout(() => {
      api
        .get<{ data: Customer[] }>(`/sales/customers?q=${encodeURIComponent(query.trim())}`)
        .then((result) => active && setResults(result.data))
        .catch(() => active && setResults([]));
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [api, query, value]);

  if (value) {
    return (
      <div className="grid gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-control)] border border-line bg-surface px-4 py-3">
          <div className="grid leading-tight">
            <span className="font-semibold">{value.name}</span>
            <span className="text-[13px] text-ash tabular-nums">
              {value.phone}
              {value.city ? ` · ${value.city}` : ""}
              {value.pan ? ` · PAN ${value.pan}` : ""}
            </span>
          </div>
          <div className="flex gap-2">
            {!value.pan && (
              <Button size="sm" variant={needPan ? "gold" : "ghost"} onClick={() => setEditingPan(true)}>
                Add PAN
              </Button>
            )}
            <Button size="sm" variant="secondary" onClick={() => onChange(null)}>
              Change
            </Button>
          </div>
        </div>
        {editingPan && <PanForm customer={value} onSaved={(customer) => { onChange(customer); setEditingPan(false); }} />}
      </div>
    );
  }

  if (adding) {
    return <NewCustomer initialPhone={/^\d+$/.test(query.trim()) ? query.trim() : ""} initialName={/^\d+$/.test(query.trim()) ? "" : query.trim()} needPan={needPan} onSaved={onChange} onCancel={() => setAdding(false)} />;
  }

  return (
    <div className="relative grid gap-2">
      <div className="flex gap-2">
        <Input id="customer-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Mobile number or name" inputMode="search" />
        <Button variant="secondary" onClick={() => setAdding(true)}>
          New customer
        </Button>
      </div>
      {query.trim().length >= 3 && (
        <ul className="grid divide-y divide-line rounded-[var(--radius-control)] border border-line bg-surface">
          {results.map((customer) => (
            <li key={customer.id}>
              <button type="button" onClick={() => onChange(customer)} className="flex w-full flex-wrap items-baseline justify-between gap-2 px-4 py-2.5 text-left hover:bg-sunk">
                <span className="font-semibold">{customer.name}</span>
                <span className="text-[13px] text-ash tabular-nums">
                  {customer.phone}
                  {customer.city ? ` · ${customer.city}` : ""}
                </span>
              </button>
            </li>
          ))}
          {results.length === 0 && <li className="px-4 py-2.5 text-[13px] text-ash">No one matches. Add them as a new customer.</li>}
        </ul>
      )}
    </div>
  );
}

function NewCustomer({ initialPhone, initialName, needPan, onSaved, onCancel }: { initialPhone: string; initialName: string; needPan?: boolean; onSaved: (customer: Customer) => void; onCancel: () => void }) {
  const api = useApi();
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [city, setCity] = useState("");
  const [pan, setPan] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { data } = await api.post<{ data: Customer }>("/sales/customers", { name, phone, city, pan });
      onSaved(data);
    } catch (cause) {
      // The number is already on file: open that customer instead.
      const existing = cause instanceof ApiError ? (cause.details as { customerId?: number } | undefined)?.customerId : undefined;
      if (existing) {
        const { data } = await api.get<{ data: Customer }>(`/sales/customers/${existing}`);
        onSaved(data);
      } else {
        setError(errorMessage(cause));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-[var(--radius-control)] border border-line bg-surface p-4 sm:grid-cols-2" noValidate>
      <Field label="Name" htmlFor="new-customer-name">
        <Input id="new-customer-name" value={name} onChange={(event) => setName(event.target.value)} autoFocus />
      </Field>
      <Field label="Mobile" htmlFor="new-customer-phone">
        <Input id="new-customer-phone" inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} />
      </Field>
      <Field label="City" htmlFor="new-customer-city">
        <Input id="new-customer-city" value={city} onChange={(event) => setCity(event.target.value)} />
      </Field>
      <Field label="PAN" htmlFor="new-customer-pan" hint={needPan ? "Needed for this bill." : "Needed once purchases in a day reach ₹2 lakh."}>
        <Input id="new-customer-pan" value={pan} maxLength={10} onChange={(event) => setPan(event.target.value)} className="font-mono uppercase" />
      </Field>
      {error && <Alert tone="risk" className="sm:col-span-2">{error}</Alert>}
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" loading={busy} disabled={!name.trim() || phone.replace(/\D/g, "").length < 10}>
          Add customer
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function PanForm({ customer, onSaved }: { customer: Customer; onSaved: (customer: Customer) => void }) {
  const api = useApi();
  const [pan, setPan] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { data } = await api.put<{ data: Customer }>(`/sales/customers/${customer.id}`, { ...customer, pan });
      onSaved(data);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2" noValidate>
      <Field label="PAN" htmlFor="customer-pan">
        <Input id="customer-pan" value={pan} maxLength={10} onChange={(event) => setPan(event.target.value)} className="w-40 font-mono uppercase" autoFocus />
      </Field>
      <Button type="submit" loading={busy} disabled={pan.trim().length !== 10}>
        Save PAN
      </Button>
      {error && <span className="w-full text-[12px] text-risk">{error}</span>}
    </form>
  );
}
