"use client";

import { useState } from "react";
import Link from "next/link";
import { Boxes, Clock, Download, HandCoins, IndianRupee, ReceiptText, Scale, Users } from "lucide-react";
import { useAuth } from "@webfudge/auth/components";
import { Button, Card, CardHeader, Field, Input, KpiCard, PageHeader, Select, Spinner, Table, Tabs, Td, Th, Tr } from "@webfudge/ui";
import type { AgeingReport, LiabilitiesReport, PaymentMode, SalesReport, StockReport } from "@webfudge/utils/api";
import { ITEM_STATUS_LABELS, PAYMENT_MODE_LABELS } from "@webfudge/utils/api";
import { formatDate, formatINR, formatRupees, formatWeight } from "@webfudge/utils/formatters";
import { useResource } from "@/lib/api";
import { useBranch } from "@/lib/branch";

type View = "sales" | "stock" | "ageing" | "owed";

/** Downloads rows as a CSV file the accountant can open in Excel. */
function downloadCsv(name: string, header: string[], rows: (string | number | null | undefined)[][]) {
  const cell = (value: unknown) => `"${String(value ?? "").split('"').join('""')}"`;
  const csv = [header.map(cell).join(","), ...rows.map((row) => row.map(cell).join(","))].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function monthStart() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

function Sales({ branchId }: { branchId?: number }) {
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [group, setGroup] = useState<"day" | "month">("day");
  const { data, loading, error } = useResource<{ data: SalesReport }>(`/reports/sales?from=${from}&to=${to}&group=${group}&branchId=${branchId ?? ""}`);
  const report = data?.data;

  return (
    <div className="grid gap-6">
      <Card className="flex flex-wrap items-end gap-4 p-5">
        <Field label="From" htmlFor="sales-from">
          <Input id="sales-from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        </Field>
        <Field label="To" htmlFor="sales-to">
          <Input id="sales-to" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        </Field>
        <Field label="Group by" htmlFor="sales-group">
          <Select id="sales-group" value={group} onChange={(event) => setGroup(event.target.value as "day" | "month")}>
            <option value="day">Day</option>
            <option value="month">Month</option>
          </Select>
        </Field>
        {report && (
          <Button
            variant="secondary"
            onClick={() =>
              downloadCsv(
                `mmj-sales-${from}-to-${to}.csv`,
                ["Period", "Invoices", "Pieces", "Taxable value", "CGST", "SGST", "Total", "Old gold taken"],
                report.periods.map((row) => [row.period, row.invoices, row.pieces, row.taxable, row.cgst, row.sgst, row.total, row.oldGold]),
              )
            }
          >
            <Download className="size-4" aria-hidden />
            Download CSV
          </Button>
        )}
      </Card>

      {loading && !report ? (
        <Spinner className="text-navy" />
      ) : error ? (
        <p className="text-sm text-risk">{error}</p>
      ) : report ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard compact title="Sales" value={formatRupees(report.totals.total)} icon={IndianRupee} subtitle={`${report.totals.invoices} invoices · ${report.totals.pieces} pieces`} />
            <KpiCard compact title="Taxable value" value={formatRupees(report.totals.taxable)} icon={ReceiptText} tone="navy" subtitle={`GST ${formatRupees(report.totals.cgst + report.totals.sgst)}`} />
            <KpiCard compact title="Old gold taken in bills" value={formatRupees(report.totals.oldGoldTaken)} icon={Scale} tone="gold" subtitle={`Bought for cash: ${formatRupees(report.totals.oldGoldBought)}`} />
            <KpiCard compact title="Average bill" value={formatRupees(report.totals.invoices ? report.totals.total / report.totals.invoices : 0)} icon={ReceiptText} tone="ok" subtitle={`${formatDate(report.from)} to ${formatDate(report.to)}`} />
          </div>

          <Card className="overflow-hidden">
            <CardHeader title={group === "day" ? "By day" : "By month"} description="GST is split as CGST and SGST for sales within Maharashtra." />
            <Table minWidth={760}>
              <thead>
                <tr>
                  <Th>{group === "day" ? "Day" : "Month"}</Th>
                  <Th align="right">Invoices</Th>
                  <Th align="right">Pieces</Th>
                  <Th align="right">Taxable</Th>
                  <Th align="right">CGST</Th>
                  <Th align="right">SGST</Th>
                  <Th align="right">Total</Th>
                </tr>
              </thead>
              <tbody>
                {report.periods.map((row) => (
                  <Tr key={row.period}>
                    <Td>{group === "day" ? formatDate(row.period) : row.period}</Td>
                    <Td align="right">{row.invoices}</Td>
                    <Td align="right">{row.pieces}</Td>
                    <Td align="right">{formatINR(row.taxable)}</Td>
                    <Td align="right">{formatINR(row.cgst)}</Td>
                    <Td align="right">{formatINR(row.sgst)}</Td>
                    <Td align="right" className="font-semibold">
                      {formatINR(row.total)}
                    </Td>
                  </Tr>
                ))}
                {!report.periods.length && (
                  <Tr>
                    <Td colSpan={7} className="text-ash">
                      No bills in these dates.
                    </Td>
                  </Tr>
                )}
              </tbody>
            </Table>
          </Card>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="overflow-hidden">
              <CardHeader title="By payment method" />
              <ul className="divide-y divide-gray-100 text-sm">
                {Object.entries(report.paymentModes).map(([mode, amount]) => (
                  <li key={mode} className="flex justify-between px-6 py-3">
                    <span>{PAYMENT_MODE_LABELS[mode as PaymentMode] ?? mode}</span>
                    <span className="tabular-nums">{formatINR(amount)}</span>
                  </li>
                ))}
                {!Object.keys(report.paymentModes).length && <li className="px-6 py-3 text-ash">Nothing taken.</li>}
              </ul>
            </Card>
            <Card className="overflow-hidden">
              <CardHeader title="By purity" />
              <ul className="divide-y divide-gray-100 text-sm">
                {report.purities.map((row) => (
                  <li key={row.purity} className="flex justify-between gap-3 px-6 py-3">
                    <span>
                      {row.purity} · {row.pieces} pcs · {formatWeight(row.netWeight)}
                    </span>
                    <span className="tabular-nums">{formatRupees(row.value)}</span>
                  </li>
                ))}
              </ul>
            </Card>
            <Card className="overflow-hidden">
              <CardHeader title="By salesperson" />
              <ul className="divide-y divide-gray-100 text-sm">
                {report.staff.map((row) => (
                  <li key={row.name} className="flex justify-between gap-3 px-6 py-3">
                    <span>
                      {row.name} · {row.invoices} bills
                    </span>
                    <span className="tabular-nums">{formatRupees(row.total)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}

function Stock({ branchId }: { branchId?: number }) {
  const { data, loading, error } = useResource<{ data: StockReport }>(`/reports/stock?branchId=${branchId ?? ""}`);
  const report = data?.data;
  if (loading && !report) return <Spinner className="text-navy" />;
  if (error || !report) return <p className="text-sm text-risk">{error}</p>;
  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard compact title="Pieces in stock" value={report.totals.pieces} icon={Boxes} subtitle={Object.entries(report.statuses).map(([status, count]) => `${count} ${ITEM_STATUS_LABELS[status as keyof typeof ITEM_STATUS_LABELS]?.toLowerCase() ?? status}`).join(" · ")} />
        <KpiCard compact title="Metal value today" value={formatRupees(report.totals.metalValue)} icon={IndianRupee} tone="gold" subtitle={report.rateCard ? `At the rate of ${formatDate(report.rateCard.effectiveFrom)}` : "No rate published"} />
        <KpiCard compact title={report.totals.cost !== undefined ? "Cost paid" : "Net weight"} value={report.totals.cost !== undefined ? formatRupees(report.totals.cost) : formatWeight(report.totals.netWeight)} icon={Scale} tone="ok" subtitle={`${formatWeight(report.totals.netWeight)} net`} />
      </div>
      <Card className="overflow-hidden">
        <CardHeader
          title="By purity"
          description="Metal value is net weight at today's rate, before making and GST."
          action={
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                downloadCsv(
                  "mmj-stock.csv",
                  ["Purity", "Pieces", "Gross g", "Net g", "Fine g", "Rate per g", "Metal value", ...(report.totals.cost !== undefined ? ["Cost"] : [])],
                  report.purities.map((row) => [row.purity, row.pieces, row.grossWeight, row.netWeight, row.fineWeight, row.ratePerGram, row.metalValue, ...(row.cost !== undefined ? [row.cost] : [])]),
                )
              }
            >
              <Download className="size-4" aria-hidden />
              CSV
            </Button>
          }
        />
        <Table minWidth={720}>
          <thead>
            <tr>
              <Th>Purity</Th>
              <Th align="right">Pieces</Th>
              <Th align="right">Net</Th>
              <Th align="right">Fine</Th>
              <Th align="right">Rate / g</Th>
              <Th align="right">Metal value</Th>
              {report.totals.cost !== undefined && <Th align="right">Cost</Th>}
            </tr>
          </thead>
          <tbody>
            {report.purities.map((row) => (
              <Tr key={row.purity}>
                <Td className="font-semibold">{row.purity}</Td>
                <Td align="right">{row.pieces}</Td>
                <Td align="right">{formatWeight(row.netWeight)}</Td>
                <Td align="right">{formatWeight(row.fineWeight)}</Td>
                <Td align="right">{formatINR(row.ratePerGram)}</Td>
                <Td align="right">{formatRupees(row.metalValue)}</Td>
                {row.cost !== undefined && <Td align="right">{formatRupees(row.cost)}</Td>}
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
      <Card className="overflow-hidden">
        <CardHeader title="By category" />
        <Table minWidth={480}>
          <thead>
            <tr>
              <Th>Category</Th>
              <Th align="right">Pieces</Th>
              <Th align="right">Net</Th>
              <Th align="right">Metal value</Th>
            </tr>
          </thead>
          <tbody>
            {report.categories.map((row) => (
              <Tr key={row.category}>
                <Td>{row.category}</Td>
                <Td align="right">{row.pieces}</Td>
                <Td align="right">{formatWeight(row.netWeight)}</Td>
                <Td align="right">{formatRupees(row.metalValue)}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}

function Ageing({ branchId }: { branchId?: number }) {
  const { data, loading, error } = useResource<{ data: AgeingReport }>(`/reports/ageing?branchId=${branchId ?? ""}`);
  const report = data?.data;
  if (loading && !report) return <Spinner className="text-navy" />;
  if (error || !report) return <p className="text-sm text-risk">{error}</p>;
  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {report.buckets.map((bucket, index) => (
          <KpiCard key={bucket.key} compact title={bucket.label} value={bucket.pieces} icon={Clock} tone={index >= 3 ? "warn" : index === 0 ? "ok" : "navy"} subtitle={formatWeight(bucket.netWeight)} />
        ))}
      </div>
      <Card className="overflow-hidden">
        <CardHeader
          title="Longest in stock"
          description="Consider these for a melt, a remodel or an offer."
          action={
            <Button
              size="sm"
              variant="secondary"
              onClick={() => downloadCsv("mmj-stock-ageing.csv", ["Tag", "Design", "Category", "Purity", "Net g", "Location", "Days in stock"], report.oldest.map((row) => [row.tagNumber, row.design, row.category, row.purity, row.netWeight, row.location, row.days]))}
            >
              <Download className="size-4" aria-hidden />
              CSV
            </Button>
          }
        />
        <Table minWidth={720}>
          <thead>
            <tr>
              <Th>Tag</Th>
              <Th>Design</Th>
              <Th>Purity</Th>
              <Th align="right">Net</Th>
              <Th>Location</Th>
              <Th align="right">Days</Th>
            </tr>
          </thead>
          <tbody>
            {report.oldest.slice(0, 50).map((row) => (
              <Tr key={row.id}>
                <Td>
                  <Link href={`/stock/${row.id}`} className="font-mono font-semibold hover:underline">
                    {row.tagNumber}
                  </Link>
                </Td>
                <Td>{row.design ?? "—"}</Td>
                <Td>{row.purity}</Td>
                <Td align="right">{formatWeight(row.netWeight)}</Td>
                <Td>{row.location ?? "No tray"}</Td>
                <Td align="right" className={row.days > 180 ? "font-semibold text-warn" : undefined}>
                  {row.days}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}

function Owed() {
  const { data, loading, error } = useResource<{ data: LiabilitiesReport }>("/reports/liabilities");
  const report = data?.data;
  if (loading && !report) return <Spinner className="text-navy" />;
  if (error || !report) return <p className="text-sm text-risk">{error}</p>;
  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <KpiCard compact title="Held for customers" value={formatRupees(report.total)} icon={HandCoins} tone="warn" subtitle="Money customers can still spend with you" />
        <KpiCard compact title="Gold rate locked" value={formatWeight(report.rateLockedGrams)} icon={Users} tone="gold" subtitle="Grams booked at an older rate, still to be billed" />
      </div>
      <Card className="overflow-hidden">
        <CardHeader title="What makes it up" description="Show this to your CA at the year end." />
        <Table minWidth={480}>
          <thead>
            <tr>
              <Th>Kind</Th>
              <Th align="right">Customers or records</Th>
              <Th align="right">Amount</Th>
            </tr>
          </thead>
          <tbody>
            {report.rows.map((row) => (
              <Tr key={row.key}>
                <Td>{row.label}</Td>
                <Td align="right">{row.count}</Td>
                <Td align="right" className="font-semibold">
                  {formatINR(row.amount)}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}

export default function ReportsPage() {
  const { hasRole } = useAuth();
  const { branch } = useBranch();
  const canFinance = hasRole("owner", "branch_manager", "accountant");
  const [view, setView] = useState<View>(canFinance ? "sales" : "stock");

  return (
    <div className="grid gap-6">
      <PageHeader title="Reports" description={`Sales, stock and what you hold for customers, for ${branch?.name ?? "this branch"}. Download any table as CSV for your accountant.`} />
      <Tabs<View>
        label="Report"
        active={view}
        onChange={setView}
        tabs={[
          ...(canFinance ? [{ key: "sales" as const, label: "Sales & GST" }] : []),
          { key: "stock", label: "Stock value" },
          { key: "ageing", label: "Stock ageing" },
          ...(canFinance ? [{ key: "owed" as const, label: "Held for customers" }] : []),
        ]}
      />
      {view === "sales" && <Sales branchId={branch?.id} />}
      {view === "stock" && <Stock branchId={branch?.id} />}
      {view === "ageing" && <Ageing branchId={branch?.id} />}
      {view === "owed" && <Owed />}
    </div>
  );
}
