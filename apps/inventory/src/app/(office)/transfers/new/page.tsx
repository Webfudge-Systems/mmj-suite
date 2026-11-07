"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, CardBody, CardHeader, EmptyState, Field, Input, PageHeader, ScanInput, Select, Table, Td, Th, Tr } from "@webfudge/ui";
import type { Branch, StockItem, Transfer } from "@webfudge/utils/api";
import { formatWeight } from "@webfudge/utils/formatters";
import { errorMessage, useApi, useResource } from "@/lib/api";
import { useBranch } from "@/lib/branch";

export default function NewTransferPage() {
  const router = useRouter();
  const api = useApi();
  const { branch } = useBranch();
  const all = useResource<{ data: Branch[] }>("/staff/branches");
  const destinations = (all.data?.data ?? []).filter((entry) => entry.id !== branch?.id);
  const [toId, setToId] = useState("");
  const [note, setNote] = useState("");
  const [items, setItems] = useState<StockItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function add(code: string) {
    setError(null);
    try {
      const { data } = await api.get<{ data: StockItem }>(`/stock/items/lookup?code=${encodeURIComponent(code)}`);
      if (data.branch?.id !== branch?.id) return setError(`${data.tagNumber} is at ${data.branch?.name}, not here.`);
      if (data.status !== "in_stock") return setError(`${data.tagNumber} is ${data.status.replace("_", " ")} and cannot be sent.`);
      setItems((current) => (current.some((item) => item.id === data.id) ? current : [data, ...current]));
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  async function send() {
    if (!branch) return;
    setBusy(true);
    setError(null);
    try {
      const { data } = await api.post<{ data: Transfer }>("/stock/transfers", {
        fromBranchId: branch.id,
        toBranchId: Number(toId),
        codes: items.map((item) => item.tagNumber),
        note,
      });
      router.replace(`/transfers/${data.id}`);
    } catch (cause) {
      setError(errorMessage(cause));
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6">
      <PageHeader title="Send pieces" description={`From ${branch?.name ?? "this branch"}. Scan each piece as it goes into the bag.`} />

      {all.data && destinations.length === 0 ? (
        <Alert tone="warn" title="There is no other branch yet">
          The owner can add one in <Link href="/settings" className="underline">Settings</Link>.
        </Alert>
      ) : (
        <>
          <Card>
            <CardHeader title="Where to" />
            <CardBody className="grid gap-4 sm:grid-cols-2">
              <Field label="Send to" htmlFor="transfer-to">
                <Select id="transfer-to" value={toId} onChange={(event) => setToId(event.target.value)}>
                  <option value="">Choose a branch</option>
                  {destinations.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.name} ({entry.code})
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Note" htmlFor="transfer-note" hint="Optional, like who is carrying it or which customer it is for.">
                <Input id="transfer-note" value={note} onChange={(event) => setNote(event.target.value)} />
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Pieces" description={`${items.length} scanned · ${formatWeight(items.reduce((sum, item) => sum + item.netWeight, 0))} net`} />
            <CardBody className="grid gap-4">
              <ScanInput id="transfer-scan" onScan={add} />
              {error && <Alert tone="risk">{error}</Alert>}
            </CardBody>
            {items.length === 0 ? (
              <EmptyState title="Nothing scanned yet" />
            ) : (
              <Table minWidth={600}>
                <thead>
                  <tr>
                    <Th>Tag</Th>
                    <Th>Design</Th>
                    <Th align="right">Net</Th>
                    <Th>From tray</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <Tr key={item.id}>
                      <Td className="font-mono font-semibold">{item.tagNumber}</Td>
                      <Td>{item.design?.name}</Td>
                      <Td align="right">{formatWeight(item.netWeight)}</Td>
                      <Td className="font-mono text-[12px]">{item.location?.fullCode ?? "—"}</Td>
                      <Td>
                        <Button size="sm" variant="ghost" onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))}>
                          Remove
                        </Button>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>

          <Button size="lg" className="justify-self-start" disabled={!toId || !items.length} loading={busy} onClick={send}>
            Send {items.length} {items.length === 1 ? "piece" : "pieces"}
          </Button>
        </>
      )}
    </div>
  );
}
