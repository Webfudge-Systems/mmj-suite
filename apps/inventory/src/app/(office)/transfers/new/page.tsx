"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, MapPin, ScanBarcode, Send, Trash2 } from "lucide-react";
import { usePieceSearch } from "@webfudge/auth/components";
import { Alert, Button, Card, CardBody, CardHeader, Field, Input, MissingHints, PageHeader, ScanInput, Select, Table, Td, Th, Tr } from "@webfudge/ui";
import type { Branch, StockItem, Transfer } from "@webfudge/utils/api";
import { formatWeight } from "@webfudge/utils/formatters";
import { PieceThumb } from "@/components/photos";
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

  // Only pieces in stock here, and not ones already in the bag.
  const findPieces = usePieceSearch({
    branchId: branch?.id,
    status: "in_stock",
    check: (item) => (items.some((entry) => entry.id === item.id) ? { disabled: true, aside: "Already added" } : undefined),
  });

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

  const net = items.reduce((sum, item) => sum + item.netWeight, 0);
  const destination = destinations.find((entry) => String(entry.id) === toId);
  const missing = [!toId && "Choose the branch to send to.", !items.length && "Scan at least one piece."];

  return (
    <div className="grid gap-6">
      <PageHeader title="Send pieces" description={`From ${branch?.name ?? "this branch"}. Scan each piece as it goes into the bag. They stay in transit until the other branch scans them in.`} />

      {all.data && destinations.length === 0 ? (
        <Alert tone="warn" title="There is no other branch yet">
          The owner can add one in{" "}
          <Link href="/settings" className="underline">
            Settings
          </Link>
          .
        </Alert>
      ) : (
        <>
          <Card>
            <CardHeader icon={MapPin} title="Where to" description="The pieces leave this branch's stock the moment you send them." />
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

          <Card className="overflow-hidden">
            <CardHeader
              icon={ScanBarcode}
              title="Pieces"
              description="Scan a tag, or type part of a tag or design name. Only pieces in stock here can be sent."
              action={
                items.length > 0 && (
                  <span className="rounded-lg bg-navy-soft px-3 py-1.5 text-[13px] font-semibold text-navy tabular-nums">
                    {items.length} {items.length === 1 ? "piece" : "pieces"} · {formatWeight(net)}
                  </span>
                )
              }
            />
            <CardBody className="grid gap-4">
              <ScanInput id="transfer-scan" onScan={add} onSearch={findPieces} placeholder="Scan a tag, or type part of a tag or design name" />
              {error && <Alert tone="risk">{error}</Alert>}
            </CardBody>
            {items.length === 0 ? (
              <div className="mx-6 mb-6 grid place-items-center gap-1 rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center">
                <ScanBarcode className="size-6 text-ash" aria-hidden />
                <p className="text-[13px] font-semibold text-ink">Nothing in the bag yet</p>
                <p className="text-[12px] text-ash">Scan each piece as you pack it.</p>
              </div>
            ) : (
              <Table minWidth={640}>
                <thead>
                  <tr>
                    <Th className="w-16">
                      <span className="sr-only">Photo</span>
                    </Th>
                    <Th>Tag</Th>
                    <Th>Design</Th>
                    <Th>Purity</Th>
                    <Th align="right">Net</Th>
                    <Th>From tray</Th>
                    <Th>
                      <span className="sr-only">Remove</span>
                    </Th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <Tr key={item.id}>
                      <Td className="py-2 pr-0">
                        <PieceThumb item={item} />
                      </Td>
                      <Td className="font-mono font-semibold text-ink">{item.tagNumber}</Td>
                      <Td>{item.design?.name ?? "—"}</Td>
                      <Td>{item.purity}</Td>
                      <Td align="right" className="font-semibold text-ink">
                        {formatWeight(item.netWeight)}
                      </Td>
                      <Td className="font-mono text-[12px]">{item.location?.fullCode ?? "—"}</Td>
                      <Td align="right">
                        <button
                          type="button"
                          onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))}
                          className="rounded-md p-1.5 text-ash hover:bg-risk/10 hover:text-risk"
                          aria-label={`Remove ${item.tagNumber}`}
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </button>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>

          <div className="grid gap-2">
            <div className="flex flex-wrap items-center gap-4">
              <Button size="lg" disabled={missing.some(Boolean)} loading={busy} onClick={send}>
                <Send className="size-4" aria-hidden />
                Send {items.length || ""} {items.length === 1 ? "piece" : "pieces"}
              </Button>
              {destination && items.length > 0 && (
                <span className="flex items-center gap-1.5 text-[13px] text-ash">
                  {branch?.name} <ArrowRight className="size-3.5" aria-hidden /> {destination.name} · {formatWeight(net)} net
                </span>
              )}
            </div>
            <MissingHints items={missing} />
          </div>
        </>
      )}
    </div>
  );
}
