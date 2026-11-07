"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { errorMessage, useApi } from "@webfudge/auth/components";
import { Alert, Button, EmptyState, Input, buttonClass } from "@webfudge/ui";
import { ApiError, type Customer, type Estimate } from "@webfudge/utils/api";
import { formatRupees, formatWeight } from "@webfudge/utils/formatters";
import { mediaUrl } from "@/lib/device";
import { useFloor } from "@/lib/floor";

/** Mobile number first: it finds a returning customer, or starts a new one. */
function CustomerStep() {
  const api = useApi();
  const { setCustomer } = useFloor();
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [matches, setMatches] = useState<Customer[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const digits = phone.replace(/\D/g, "");

  useEffect(() => {
    if (digits.length !== 10) return;
    let active = true;
    api
      .get<{ data: Customer[] }>(`/sales/customers?q=${digits}`)
      .then(({ data }) => active && setMatches(data.filter((customer) => customer.phone === digits)))
      .catch(() => active && setMatches([]));
    return () => {
      active = false;
    };
  }, [api, digits]);

  const found = digits.length === 10 ? matches : null;

  async function create(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { data } = await api.post<{ data: Customer }>("/sales/customers", { name, phone: digits });
      setCustomer(data);
    } catch (cause) {
      const existing = cause instanceof ApiError ? (cause.details as { customerId?: number } | undefined)?.customerId : undefined;
      if (existing) setCustomer((await api.get<{ data: Customer }>(`/sales/customers/${existing}`)).data);
      else setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={create} className="grid max-w-lg gap-3 rounded-xl border border-gray-100 bg-surface p-5 shadow-[var(--shadow-card)]" noValidate>
      <h2 className="text-lg font-semibold">Who is the customer?</h2>
      <Input id="tray-phone" inputMode="tel" placeholder="Mobile number" value={phone} onChange={(event) => setPhone(event.target.value)} className="h-12 text-lg tabular-nums" />
      {found && found.length > 0 && (
        <Button size="lg" variant="gold" onClick={() => setCustomer(found[0])}>
          Continue with {found[0].name}
        </Button>
      )}
      {found && found.length === 0 && (
        <>
          <Input id="tray-name" placeholder="Their name" value={name} onChange={(event) => setName(event.target.value)} className="h-12 text-lg" autoFocus />
          {error && <Alert tone="risk">{error}</Alert>}
          <Button type="submit" size="lg" loading={busy} disabled={!name.trim()}>
            Add new customer
          </Button>
        </>
      )}
    </form>
  );
}

export default function TrayPage() {
  const api = useApi();
  const { branchId, customer, setCustomer, tray, removeFromTray, clearSession } = useFloor();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<Estimate | null>(null);
  const total = tray.reduce((sum, piece) => sum + (piece.pricing?.price ?? 0), 0);

  async function send() {
    setSending(true);
    setError(null);
    try {
      const { data } = await api.post<{ data: Estimate }>("/sales/estimates", { branchId, customerId: customer?.id, itemIds: tray.map((piece) => piece.id) });
      setSent(data);
      clearSession();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="grid max-w-xl justify-items-start gap-4 rounded-xl border border-gray-100 bg-surface p-8 shadow-[var(--shadow-card)]">
        <span className="text-[13px] font-semibold tracking-wide text-ok uppercase">Sent to billing</span>
        <h1 className="text-3xl font-normal tracking-tight text-ink sm:text-4xl">
          Estimate <span className="font-mono">{sent.number}</span>
        </h1>
        <p className="text-[15px] text-ink/80">
          Walk {sent.customer?.name ?? "the customer"} and the {sent.lines.length === 1 ? "piece" : `${sent.lines.length} pieces`} to the counter. The cashier will find it in the estimates queue.
        </p>
        <Link href="/" className={buttonClass("primary", "lg")}>
          Next customer
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-1">
          <h1 className="text-3xl font-normal tracking-tight text-ink sm:text-4xl">{customer ? `${customer.name}'s tray` : "Customer's tray"}</h1>
          {customer && (
            <span className="text-[14px] text-ash tabular-nums">
              {customer.phone} ·{" "}
              <button type="button" className="underline" onClick={() => setCustomer(null)}>
                Change customer
              </button>
            </span>
          )}
        </div>
        {tray.length > 0 && <span className="text-2xl font-semibold text-navy tabular-nums">{formatRupees(total)}</span>}
      </div>

      {!customer && <CustomerStep />}

      {tray.length === 0 ? (
        <EmptyState title="The tray is empty" description="Open a design and take pieces out for the customer. They appear here." action={<Link href="/" className={buttonClass("secondary")}>Browse the collection</Link>} />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {tray.map((piece) => (
            <li key={piece.id} className="flex gap-4 rounded-xl border border-gray-100 bg-surface p-3 shadow-[var(--shadow-card)]">
              <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-lg bg-sunk">
                {piece.design.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mediaUrl(piece.design.image)} alt="" className="size-full object-cover" />
                ) : (
                  <span className="font-mono text-[11px] text-taupe">{piece.design.code}</span>
                )}
              </div>
              <div className="grid min-w-0 flex-1 content-start gap-1">
                <span className="truncate font-semibold">{piece.design.name}</span>
                <span className="text-[13px] text-ash tabular-nums">
                  {piece.purity} · {formatWeight(piece.netWeight)} net · <span className="font-mono">{piece.tagNumber}</span>
                </span>
                <span className="text-lg font-semibold text-navy tabular-nums">{piece.pricing ? formatRupees(piece.pricing.price) : "Price at the counter"}</span>
                <button type="button" className="justify-self-start text-[13px] text-ash underline" onClick={() => removeFromTray(piece.id)}>
                  Take off the tray
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {tray.length > 0 && (
        <div className="grid max-w-lg gap-3">
          {error && <Alert tone="risk">{error}</Alert>}
          <Button size="lg" variant="gold" loading={sending} disabled={!customer} onClick={send}>
            Send {tray.length === 1 ? "this piece" : `these ${tray.length} pieces`} to billing
          </Button>
          <p className="text-[13px] text-ash">Prices are today&apos;s rate before any discount. The counter makes the final bill. Pieces stay with you until it is billed.</p>
        </div>
      )}
    </div>
  );
}
