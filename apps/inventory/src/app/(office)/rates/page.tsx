"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useAuth } from "@webfudge/auth/components";
import { LARGE_RATE_CHANGE_PERCENT, PURITIES, RATE_EDITOR_ROLES, type Purity } from "@webfudge/config";
import { useCurrentRates } from "@webfudge/hooks";
import { Alert, Badge, Button, Card, CardBody, CardHeader, EmptyState, Field, Input, PageHeader, Spinner } from "@webfudge/ui";
import { ApiError, fetchRateHistory, publishRates, type RateCard } from "@webfudge/utils/api";
import { formatChange, formatDateTime, formatINR, formatPercent } from "@webfudge/utils/formatters";
import { percentChange } from "@webfudge/utils/pricing";
import { API_URL } from "@/lib/env";

type LargeChange = { purity: Purity; from: number; to: number; percent: number };

function largeChangesFrom(error: unknown): LargeChange[] | null {
  if (!(error instanceof ApiError)) return null;
  const details = error.details as { code?: string; changes?: LargeChange[] } | undefined;
  return details?.code === "LARGE_CHANGE" ? (details.changes ?? []) : null;
}

function RatesForm({ current, onPublished }: { current: RateCard | null; onPublished: () => void }) {
  const { withToken, hasRole } = useAuth();
  const isOwner = hasRole("owner");
  const previous = useMemo(() => new Map(current?.rates.map((line) => [line.purity, line.ratePerGram])), [current]);

  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(PURITIES.map((purity) => [purity.code, previous.get(purity.code)?.toString() ?? ""])),
  );
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<LargeChange[] | null>(null);

  const rows = PURITIES.map((purity) => {
    const old = previous.get(purity.code);
    const raw = values[purity.code] ?? "";
    const next = Number(raw);
    const valid = raw.trim() !== "" && Number.isFinite(next) && next > 0;
    const change = valid && old !== undefined ? next - old : null;
    const percent = valid && old !== undefined ? percentChange(old, next) : 0;
    return { purity, old, raw, next, valid, change, percent, large: Math.abs(percent) > LARGE_RATE_CHANGE_PERCENT };
  });

  const allValid = rows.every((row) => row.valid);
  const anyLarge = rows.some((row) => row.large);

  async function send(confirmLargeChange: boolean) {
    setBusy(true);
    setError(null);
    try {
      await withToken((token) =>
        publishRates(API_URL, token, {
          rates: rows.map((row) => ({ purity: row.purity.code, ratePerGram: row.next })),
          note: note.trim() || undefined,
          confirmLargeChange,
        }),
      );
      setPendingConfirm(null);
      onPublished();
    } catch (cause) {
      const large = largeChangesFrom(cause);
      if (large) setPendingConfirm(large);
      else setError(cause instanceof ApiError ? cause.message : "The rates could not be published. Check the connection.");
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    send(false);
  }

  return (
    <form onSubmit={submit} className="grid gap-5" noValidate>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="text-[11px] tracking-wide text-ash uppercase">
              <th className="py-2 pr-4 font-semibold">Purity</th>
              <th className="py-2 pr-4 text-right font-semibold">Current</th>
              <th className="py-2 pr-4 font-semibold">New rate per gram (₹)</th>
              <th className="py-2 text-right font-semibold">Change</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.purity.code} className="border-t border-line">
                <td className="py-2.5 pr-4">
                  <label htmlFor={`rate-${row.purity.code}`} className="font-medium">
                    {row.purity.label}
                  </label>
                </td>
                <td className="py-2.5 pr-4 text-right text-ash tabular-nums">
                  {row.old !== undefined ? formatINR(row.old) : "—"}
                </td>
                <td className="py-2.5 pr-4">
                  <Input
                    id={`rate-${row.purity.code}`}
                    inputMode="decimal"
                    value={row.raw}
                    invalid={row.raw !== "" && !row.valid}
                    onChange={(event) => setValues((all) => ({ ...all, [row.purity.code]: event.target.value }))}
                    className="max-w-[180px] tabular-nums"
                  />
                </td>
                <td className="py-2.5 text-right text-[13px] tabular-nums">
                  {row.change === null ? (
                    <span className="text-ash">—</span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <span className={row.change > 0 ? "text-ok" : row.change < 0 ? "text-risk" : "text-ash"}>
                        {formatChange(row.change)} ({formatPercent(row.percent)})
                      </span>
                      {row.large && <Badge tone="warn">Large</Badge>}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Field label="Note" htmlFor="rate-note" hint="Optional. Shown with the rate card, for example the reference used.">
        <Input id="rate-note" value={note} maxLength={500} onChange={(event) => setNote(event.target.value)} />
      </Field>

      {anyLarge && !pendingConfirm && (
        <Alert tone="warn" title={`Some rates move more than ${LARGE_RATE_CHANGE_PERCENT}%`}>
          {isOwner ? "You will be asked to confirm before they are published." : "Only the owner can publish a move this large."}
        </Alert>
      )}

      {pendingConfirm && (
        <Alert tone="warn" title="Confirm these large moves">
          <ul className="mt-1 grid gap-0.5 tabular-nums">
            {pendingConfirm.map((change) => (
              <li key={change.purity}>
                {change.purity}: {formatINR(change.from)} to {formatINR(change.to)} ({formatPercent(change.percent)})
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="gold" size="sm" loading={busy} onClick={() => send(true)}>
              Publish anyway
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setPendingConfirm(null)}>
              Go back and check
            </Button>
          </div>
        </Alert>
      )}

      {error && <Alert tone="risk">{error}</Alert>}

      {!pendingConfirm && (
        <Button type="submit" variant="primary" size="lg" loading={busy} disabled={!allValid} className="justify-self-start">
          Publish rates
        </Button>
      )}
    </form>
  );
}

function History({ cards, loading, error }: { cards: RateCard[]; loading: boolean; error: string | null }) {
  if (loading && cards.length === 0) {
    return (
      <div className="flex items-center gap-2 px-5 py-6 text-[13px] text-ash">
        <Spinner className="size-4" /> Loading history
      </div>
    );
  }
  if (error) return <p className="px-5 py-6 text-[13px] text-risk">{error}</p>;
  if (cards.length === 0) return <EmptyState title="No rate cards yet" description="The first published card appears here." />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] text-left text-[13px]">
        <thead>
          <tr className="text-[11px] tracking-wide text-ash uppercase">
            <th className="px-5 py-2 font-semibold">Published</th>
            {PURITIES.map((purity) => (
              <th key={purity.code} className="px-3 py-2 text-right font-semibold">
                {purity.code}
              </th>
            ))}
            <th className="px-5 py-2 font-semibold">By</th>
          </tr>
        </thead>
        <tbody>
          {cards.map((card) => (
            <tr key={card.id} className="border-t border-line align-top">
              <td className="px-5 py-2.5 whitespace-nowrap">{formatDateTime(card.effectiveFrom)}</td>
              {PURITIES.map((purity) => {
                const line = card.rates.find((rate) => rate.purity === purity.code);
                return (
                  <td key={purity.code} className="px-3 py-2.5 text-right tabular-nums">
                    {line ? formatINR(line.ratePerGram) : "—"}
                  </td>
                );
              })}
              <td className="px-5 py-2.5">
                {card.setBy ?? "—"}
                {card.note && <span className="block text-[12px] text-ash">{card.note}</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function RatesPage() {
  const { withToken, hasRole } = useAuth();
  const canPublish = hasRole(...RATE_EDITOR_ROLES);
  const { card, loading, refresh } = useCurrentRates(API_URL);
  const [history, setHistory] = useState<RateCard[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [justPublished, setJustPublished] = useState(false);
  const [historyVersion, setHistoryVersion] = useState(0);

  useEffect(() => {
    let active = true;
    withToken((token) => fetchRateHistory(API_URL, token))
      .then((cards) => {
        if (!active) return;
        setHistory(cards);
        setHistoryError(null);
      })
      .catch((cause) => {
        if (active) setHistoryError(cause instanceof ApiError ? cause.message : "History could not be loaded.");
      })
      .finally(() => {
        if (active) setHistoryLoading(false);
      });
    return () => {
      active = false;
    };
  }, [withToken, historyVersion]);

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Rates & pricing"
        description="Publish the morning rate once. The website, the showroom tablets and the billing counter all pick it up within a minute."
      />

      <Card>
        <CardHeader
          title="Publish today's rates"
          description={card ? `Current card published ${formatDateTime(card.effectiveFrom)}` : "No rates published yet"}
        />
        <CardBody className="grid gap-4">
          {justPublished && <Alert tone="ok">Published. Every app now prices from these rates.</Alert>}
          {!canPublish ? (
            <p className="text-sm text-ash">Only the owner and branch managers can publish rates.</p>
          ) : loading && !card ? (
            <Spinner />
          ) : (
            <RatesForm
              key={card?.id ?? "none"}
              current={card}
              onPublished={() => {
                setJustPublished(true);
                refresh();
                setHistoryVersion((version) => version + 1);
              }}
            />
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Rate history" description="Cards are never edited. Each new card replaces the one before." />
        <History cards={history} loading={historyLoading} error={historyError} />
      </Card>
    </div>
  );
}
