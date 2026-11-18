"use client";

import { useEffect, useState, type FormEvent, type KeyboardEvent } from "react";
import { Search, UserPlus } from "lucide-react";
import { errorMessage, useApi } from "@webfudge/auth/components";
import { Alert, Button, Field, Input, Textarea, cn } from "@webfudge/ui";
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
  const [found, setFound] = useState<{ q: string; data: Customer[] } | null>(null);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [adding, setAdding] = useState(false);
  const [editingPan, setEditingPan] = useState(false);

  // Suggestions from the first letter typed; with nothing typed, the most recent customers.
  useEffect(() => {
    if (value || !open) return;
    let active = true;
    const q = query.trim();
    const timer = window.setTimeout(
      () => {
        api
          .get<{ data: Customer[] }>(`/sales/customers?pageSize=8${q ? `&q=${encodeURIComponent(q)}` : ""}`)
          .then((result) => {
            if (!active) return;
            setFound({ q, data: result.data });
            setHighlight(-1);
          })
          .catch(() => active && setFound({ q, data: [] }));
      },
      q ? 180 : 0,
    );
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [api, query, value, open]);

  const results = found?.data ?? [];
  const typed = query.trim();

  function choose(customer: Customer) {
    onChange(customer);
    setOpen(false);
    setQuery("");
    setFound(null);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setHighlight((index) => Math.min(index + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((index) => Math.max(index - 1, -1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const pick = results[highlight] ?? (results.length === 1 ? results[0] : undefined);
      if (pick) choose(pick);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  if (value) {
    return (
      <div className="grid gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-navy-line bg-navy-soft/40 px-4 py-3">
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
    <div
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-gray-400" aria-hidden />
          <Input
            id="customer-search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder="Type a name or mobile number"
            inputMode="search"
            autoComplete="off"
            role="combobox"
            aria-expanded={open}
            aria-controls="customer-suggestions"
            aria-activedescendant={highlight >= 0 ? `customer-option-${results[highlight]?.id}` : undefined}
            className="pl-10"
          />
        </div>
        <Button variant="secondary" onClick={() => setAdding(true)}>
          <UserPlus className="size-4" aria-hidden />
          New customer
        </Button>
      </div>
      {open && found && (
        <ul id="customer-suggestions" role="listbox" className="absolute z-30 mt-1.5 max-h-80 w-full overflow-y-auto rounded-xl border border-gray-100 bg-white py-1.5 shadow-xl">
          {!typed && results.length > 0 && <li className="px-4 pt-1 pb-1.5 text-[11px] font-semibold tracking-wide text-ash uppercase">Recent customers</li>}
          {results.map((customer, index) => (
            <li key={customer.id} id={`customer-option-${customer.id}`} role="option" aria-selected={index === highlight}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setHighlight(index)}
                onClick={() => choose(customer)}
                className={cn("flex w-full items-center gap-3 px-4 py-2.5 text-left", index === highlight ? "bg-navy-soft" : "hover:bg-gray-50")}
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-navy to-navy-deep text-[12px] font-bold text-gold">{initials(customer.name)}</span>
                <span className="grid min-w-0 flex-1 leading-tight">
                  <span className="truncate font-semibold text-ink">
                    <Highlight text={customer.name} match={typed} />
                  </span>
                  <span className="truncate text-[13px] text-ash tabular-nums">
                    <Highlight text={customer.phone} match={typed.replace(/\D/g, "")} />
                    {customer.city ? ` · ${customer.city}` : ""}
                  </span>
                </span>
                {customer.pan && <span className="shrink-0 rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-ash">PAN</span>}
              </button>
            </li>
          ))}
          {results.length === 0 && (
            <li>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => setAdding(true)}
                className="flex w-full items-center gap-2 px-4 py-3 text-left text-[13.5px] text-ink hover:bg-gray-50"
              >
                <UserPlus className="size-4 text-navy" aria-hidden />
                {typed ? (
                  <span>
                    No one matches “{typed}”. <span className="font-semibold text-navy">Add as a new customer</span>
                  </span>
                ) : (
                  <span className="font-semibold text-navy">No customers yet. Add the first one</span>
                )}
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

function initials(name: string) {
  const parts = name.replace(/^Demo\s*[–-]\s*/, "").trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
}

/** Shows the typed text in bold inside a name or number. */
function Highlight({ text, match }: { text: string; match: string }) {
  const at = match ? text.toLowerCase().indexOf(match.toLowerCase()) : -1;
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <mark className="rounded-sm bg-gold-soft px-0.5 font-bold text-ink">{text.slice(at, at + match.length)}</mark>
      {text.slice(at + match.length)}
    </>
  );
}

function NewCustomer({ initialPhone, initialName, needPan, onSaved, onCancel }: { initialPhone: string; initialName: string; needPan?: boolean; onSaved: (customer: Customer) => void; onCancel: () => void }) {
  const api = useApi();
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [pan, setPan] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { data } = await api.post<{ data: Customer }>("/sales/customers", { name, phone, address, city, pan });
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
    <form onSubmit={submit} className="grid gap-3 rounded-xl border border-gray-200 bg-surface p-4 sm:grid-cols-2" noValidate>
      <Field label="Name" htmlFor="new-customer-name">
        <Input id="new-customer-name" value={name} onChange={(event) => setName(event.target.value)} autoFocus />
      </Field>
      <Field label="Mobile" htmlFor="new-customer-phone">
        <Input id="new-customer-phone" inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} />
      </Field>
      <Field label="Address" htmlFor="new-customer-address" className="sm:col-span-2" hint="House, street, area and PIN code. Printed on the bill.">
        <Textarea id="new-customer-address" value={address} onChange={(event) => setAddress(event.target.value)} rows={2} className="min-h-14" />
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
