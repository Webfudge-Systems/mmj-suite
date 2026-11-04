"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useAuth } from "@webfudge/auth/components";
import { Alert, Badge, Button, Card, CardBody, CardHeader, EmptyState, Field, Input, PageHeader, Select, Spinner } from "@webfudge/ui";
import type { LocationKind, StockLocation } from "@webfudge/utils/api";
import { LOCATION_KIND_LABELS } from "@webfudge/utils/api";
import { PrintSheet, TrayLabel } from "@/components/labels";
import { useLocations } from "@/components/pickers";
import { pieces } from "@/lib/labels";
import { errorMessage, useApi } from "@/lib/api";
import { useBranch } from "@/lib/branch";

function AddLocation({ branchId, parents, onAdded }: { branchId: number; parents: StockLocation[]; onAdded: () => void }) {
  const api = useApi();
  const [kind, setKind] = useState<LocationKind>(parents.length ? "tray" : "showcase");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState(parents[0] ? String(parents[0].id) : "");
  const [count, setCount] = useState("1");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** For trays, "T01" with a count of 8 creates T01 to T08. */
  function codes(): string[] {
    const total = kind === "tray" ? Math.min(Math.max(Number(count) || 1, 1), 50) : 1;
    if (total === 1) return [code];
    const match = code.match(/^(.*?)(\d+)$/);
    if (!match) return [code];
    const [, prefix, start] = match;
    return Array.from({ length: total }, (_, index) => `${prefix}${String(Number(start) + index).padStart(start.length, "0")}`);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      for (const value of codes()) {
        await api.post("/stock/locations", { branchId, kind, code: value, name, parentId: kind === "tray" ? Number(parentId) : undefined });
      }
      setCode("");
      setName("");
      onAdded();
    } catch (cause) {
      setError(errorMessage(cause));
      onAdded();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" noValidate>
      <Field label="Type" htmlFor="loc-kind">
        <Select id="loc-kind" value={kind} onChange={(event) => setKind(event.target.value as LocationKind)}>
          {(Object.keys(LOCATION_KIND_LABELS) as LocationKind[]).map((value) => (
            <option key={value} value={value}>
              {LOCATION_KIND_LABELS[value]}
            </option>
          ))}
        </Select>
      </Field>
      {kind === "tray" && (
        <Field label="Inside" htmlFor="loc-parent">
          <Select id="loc-parent" value={parentId} onChange={(event) => setParentId(event.target.value)}>
            {parents.map((parent) => (
              <option key={parent.id} value={parent.id}>
                {parent.fullCode} {parent.name ? `· ${parent.name}` : ""}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <Field label="Code" htmlFor="loc-code" hint={kind === "tray" ? "Like T01" : "Like SC01"}>
        <Input id="loc-code" value={code} onChange={(event) => setCode(event.target.value)} className="font-mono uppercase" />
      </Field>
      {kind === "tray" && (
        <Field label="How many" htmlFor="loc-count" hint="Numbers follow on from the code.">
          <Input id="loc-count" inputMode="numeric" value={count} onChange={(event) => setCount(event.target.value)} />
        </Field>
      )}
      <Field label="Name" htmlFor="loc-name" hint="Optional, like Bridal necklaces">
        <Input id="loc-name" value={name} onChange={(event) => setName(event.target.value)} />
      </Field>
      <div className="flex items-end">
        <Button type="submit" loading={busy} disabled={!code.trim() || (kind === "tray" && !parentId)}>
          Add {kind === "tray" && Number(count) > 1 ? `${codes().length} trays` : LOCATION_KIND_LABELS[kind].toLowerCase()}
        </Button>
      </div>
      {error && <Alert tone="risk" className="sm:col-span-2 lg:col-span-5">{error}</Alert>}
    </form>
  );
}

export default function LocationsPage() {
  const { hasRole } = useAuth();
  const canEdit = hasRole("owner", "branch_manager", "stock_keeper");
  const { branch } = useBranch();
  const { locations, untrayed, loading, error, reload } = useLocations(branch?.id);
  const [printing, setPrinting] = useState<StockLocation[]>([]);

  const parents = locations.filter((location) => ["showcase", "counter", "safe"].includes(location.kind));
  const childrenOf = (id: number) => locations.filter((location) => location.parentId === id);
  const standalone = locations.filter((location) => !location.parentId && !["showcase", "counter"].includes(location.kind) && location.kind !== "safe");
  const trays = locations.filter((location) => location.kind === "tray");

  function print(list: StockLocation[]) {
    setPrinting(list);
    window.setTimeout(() => window.print(), 50);
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-6 print:hidden">
        <PageHeader
          title="Locations"
          description={`Showcases, counters, safes and the trays inside them at ${branch?.name ?? "this branch"}. Each tray gets a QR label, so scanning it opens the tray.`}
          actions={
            trays.length > 0 && (
              <Button variant="secondary" onClick={() => print(trays)}>
                Print all tray labels
              </Button>
            )
          }
        />

        {untrayed > 0 && (
          <Alert tone="warn" title={`${pieces(untrayed)} ${untrayed === 1 ? "is" : "are"} waiting for a tray`}>
            Open a tray below and scan them in. <Link href="/stock?untrayed=true" className="underline">See the list</Link>.
          </Alert>
        )}

        {canEdit && branch && (
          <Card>
            <CardHeader title="Add a location" />
            <CardBody>
              <AddLocation key={parents.length} branchId={branch.id} parents={parents} onAdded={reload} />
            </CardBody>
          </Card>
        )}

        {loading ? (
          <Spinner className="text-navy" />
        ) : error ? (
          <p className="text-sm text-risk">{error}</p>
        ) : !locations.length ? (
          <Card>
            <EmptyState title="No locations yet" description="Add each showcase or counter first, then its trays." />
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {[...parents, ...standalone].map((parent) => {
              const children = childrenOf(parent.id);
              return (
                <Card key={parent.id}>
                  <CardHeader
                    title={
                      <span className="flex flex-wrap items-baseline gap-2">
                        <span className="font-mono">{parent.fullCode}</span>
                        {parent.name && <span className="font-normal text-ash">{parent.name}</span>}
                      </span>
                    }
                    description={`${LOCATION_KIND_LABELS[parent.kind]} · ${pieces(children.reduce((sum, child) => sum + child.pieces, parent.pieces))}`}
                    action={
                      children.length > 0 ? (
                        <Button size="sm" variant="ghost" onClick={() => print(children)}>
                          Print labels
                        </Button>
                      ) : parent.kind !== "showcase" && parent.kind !== "counter" ? (
                        <Link href={`/locations/${parent.id}`} className="text-[13px] font-semibold text-navy underline">
                          Open
                        </Link>
                      ) : null
                    }
                  />
                  {children.length > 0 ? (
                    <ul className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3">
                      {children.map((tray) => (
                        <li key={tray.id}>
                          <Link
                            href={`/locations/${tray.id}`}
                            className="grid gap-0.5 rounded-[var(--radius-control)] border border-line px-3 py-2 hover:border-navy hover:bg-sunk/60"
                          >
                            <span className="font-mono text-[13px] font-semibold">{tray.code}</span>
                            <span className="truncate text-[12px] text-ash">{tray.name ?? LOCATION_KIND_LABELS[tray.kind]}</span>
                            <span className="text-[12px]">
                              {tray.pieces ? <Badge tone="ok">{pieces(tray.pieces)}</Badge> : <Badge>Empty</Badge>}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <CardBody>
                      <p className="text-[13px] text-ash">
                        {parent.kind === "showcase" || parent.kind === "counter" ? "No trays yet. Add trays inside it above." : `${pieces(parent.pieces)}.`}
                      </p>
                    </CardBody>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {printing.length > 0 && (
        <div className="hidden print:block">
          <PrintSheet width={50} height={25}>
            {printing.map((location) => (
              <TrayLabel key={location.id} location={location} />
            ))}
          </PrintSheet>
        </div>
      )}
    </div>
  );
}
