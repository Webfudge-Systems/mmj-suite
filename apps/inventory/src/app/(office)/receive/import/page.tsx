"use client";

import { useState, type ChangeEvent } from "react";
import Link from "next/link";
import { Alert, Button, Card, CardBody, CardHeader, PageHeader, Table, Td, Th, Tr } from "@webfudge/ui";
import { ApiError } from "@webfudge/utils/api";
import { csvRecords, parseCsv } from "@webfudge/utils/csv";
import { pieces } from "@/lib/labels";
import { errorMessage, useApi } from "@/lib/api";
import { useBranch } from "@/lib/branch";

/** Columns the import understands, with the header spellings accepted for each. */
const FIELDS = {
  legacyTag: ["old_tag", "old tag", "tag", "tag no", "tag number", "barcode"],
  designCode: ["design_code", "design code", "design no", "design number", "design"],
  designName: ["design_name", "design name", "item name", "name", "description"],
  category: ["category", "item group", "group"],
  purity: ["purity", "karat", "carat", "touch"],
  grossWeight: ["gross_weight", "gross weight", "gross wt", "gross", "gwt"],
  stoneWeight: ["stone_weight", "stone weight", "stone wt", "less wt", "swt"],
  huid: ["huid"],
  makingType: ["making_type", "making type"],
  makingValue: ["making_value", "making", "making charge", "mc"],
  stoneValue: ["stone_value", "stone value", "stone amount"],
  costPrice: ["cost", "cost price", "purchase price"],
  location: ["location", "tray", "tray code"],
  slot: ["slot"],
  notes: ["notes", "remarks"],
};

type Field = keyof typeof FIELDS;
type Row = Record<Field, string>;
type Problem = { row: number; message: string };

const BATCH = 200;
const TEMPLATE =
  "old_tag,design_code,design_name,category,purity,gross_weight,stone_weight,huid,making_type,making_value,stone_value,cost,location,slot,notes\r\n" +
  "A-1021,D-NK-0218,Lakshmi temple necklace,NK,22KT,42.350,2.100,AB12C3,per_gram,650,4800,,B1-SC01-T01,B4,\r\n" +
  "A-1022,,Plain kada,BG,22KT,20.500,0,,percent,12,0,,B1-SC02-T03,,\r\n";

function downloadTemplate() {
  const url = URL.createObjectURL(new Blob([TEMPLATE], { type: "text/csv" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "mmj-opening-stock-template.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export default function ImportPage() {
  const api = useApi();
  const { branch } = useBranch();
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [missing, setMissing] = useState<Field[]>([]);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [checked, setChecked] = useState<{ rows: number; newDesigns: number } | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [done, setDone] = useState<{ receiptId: number; number: string; imported: number; designs: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function readFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null);
    setProblems([]);
    setChecked(null);
    setDone(null);
    const { records, missing: absent } = csvRecords(parseCsv(await file.text()), FIELDS);
    setFileName(file.name);
    setRows(records);
    setMissing(absent);
  }

  const required: Field[] = ["purity", "grossWeight"];
  const blocking = missing.filter((field) => required.includes(field));
  const batches = Array.from({ length: Math.ceil(rows.length / BATCH) }, (_, index) => rows.slice(index * BATCH, (index + 1) * BATCH));

  /** Checks every batch without saving. Rows are numbered as in the file, after the header. */
  async function check() {
    if (!branch) return;
    setBusy(true);
    setError(null);
    setProblems([]);
    const found: Problem[] = [];
    let newDesigns = 0;
    try {
      for (const [index, batch] of batches.entries()) {
        setProgress(`Checking rows ${index * BATCH + 2} to ${index * BATCH + batch.length + 1}`);
        try {
          const result = await api.post<{ data: { newDesigns: number } }>("/stock/import", {
            branchId: branch.id,
            rows: batch,
            firstRow: index * BATCH + 2,
            dryRun: true,
          });
          newDesigns += result.data.newDesigns;
        } catch (cause) {
          const details = cause instanceof ApiError ? (cause.details as { problems?: Problem[] } | undefined) : undefined;
          if (details?.problems) found.push(...details.problems);
          else throw cause;
        }
      }
      setProblems(found);
      if (!found.length) setChecked({ rows: rows.length, newDesigns });
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setProgress(null);
      setBusy(false);
    }
  }

  async function runImport() {
    if (!branch) return;
    setBusy(true);
    setError(null);
    let receiptId: number | undefined;
    let number = "";
    let imported = 0;
    let designs = 0;
    try {
      for (const [index, batch] of batches.entries()) {
        setProgress(`Saving rows ${index * BATCH + 2} to ${index * BATCH + batch.length + 1}`);
        const result = await api.post<{ data: { receiptId: number; number: string; imported: number; designsCreated: number } }>("/stock/import", {
          branchId: branch.id,
          rows: batch,
          firstRow: index * BATCH + 2,
          receiptId,
          fileName,
        });
        receiptId = result.data.receiptId;
        number = result.data.number;
        imported += result.data.imported;
        designs += result.data.designsCreated;
      }
      setDone({ receiptId: receiptId!, number, imported, designs });
      setRows([]);
      setChecked(null);
    } catch (cause) {
      setError(
        `${errorMessage(cause)} ${imported ? `${imported} rows were saved before this, on receipt ${number}. Remove them from the file before trying again.` : "Nothing was saved."}`,
      );
    } finally {
      setProgress(null);
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Import current stock"
        description={`Load the pieces already in ${branch?.name ?? "the shop"} from your old software. Each piece gets an MMJ tag and keeps its old tag number, so old tags still scan.`}
      />

      <Card>
        <CardHeader title="1. Export from the old software" />
        <CardBody className="grid gap-3 text-sm">
          <p>
            Export the stock list as CSV (in Excel: File → Save As → CSV). Column names can follow your software; the import recognises common ones like
            “Gross Wt”, “Tag No” and “Purity”. You need at least <b>purity</b> and <b>gross weight</b>, and a <b>category</b> (code like NK or name like
            Necklaces) for any design the suite does not know yet.
          </p>
          <p className="text-ash">
            Put tray codes in a <b>location</b> column to place pieces straight away. Create the trays in Locations first. Pieces without a tray are listed as
            waiting for one.
          </p>
          <Button variant="secondary" className="justify-self-start" onClick={downloadTemplate}>
            Download the template
          </Button>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="2. Choose the file" />
        <CardBody className="grid gap-4">
          <label className="flex w-fit cursor-pointer items-center gap-2 rounded-[var(--radius-control)] border border-dashed border-line px-4 py-3 text-sm hover:border-navy">
            <input type="file" accept=".csv,text/csv" className="sr-only" onChange={readFile} disabled={busy} />
            {fileName ? `Change file (${fileName})` : "Choose a CSV file"}
          </label>
          {rows.length > 0 && (
            <>
              <p className="text-sm">
                <b>{rows.length}</b> rows found.
                {missing.length > 0 && <span className="text-ash"> Columns not found: {missing.join(", ")}.</span>}
              </p>
              {blocking.length > 0 && <Alert tone="risk">The file needs {blocking.join(" and ")} columns.</Alert>}
              <Table minWidth={760}>
                <thead>
                  <tr>
                    <Th>Row</Th>
                    <Th>Old tag</Th>
                    <Th>Design</Th>
                    <Th>Category</Th>
                    <Th>Purity</Th>
                    <Th align="right">Gross</Th>
                    <Th>HUID</Th>
                    <Th>Location</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 8).map((row, index) => (
                    <Tr key={index}>
                      <Td className="text-ash">{index + 2}</Td>
                      <Td className="font-mono">{row.legacyTag || "—"}</Td>
                      <Td>{row.designCode || row.designName || "—"}</Td>
                      <Td>{row.category || "—"}</Td>
                      <Td>{row.purity || "—"}</Td>
                      <Td align="right">{row.grossWeight || "—"}</Td>
                      <Td className="font-mono">{row.huid || "—"}</Td>
                      <Td className="font-mono">{row.location || "—"}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
              {rows.length > 8 && <p className="text-[12px] text-ash">Showing the first 8 rows.</p>}
            </>
          )}
        </CardBody>
      </Card>

      {rows.length > 0 && blocking.length === 0 && (
        <Card>
          <CardHeader title="3. Check, then import" description="Checking reads every row without saving anything." />
          <CardBody className="grid gap-4">
            {problems.length > 0 && (
              <Alert tone="risk" title={`${problems.length} rows need fixing. Nothing was saved.`}>
                <ul className="mt-1 grid max-h-64 gap-0.5 overflow-y-auto">
                  {problems.map((problem, index) => (
                    <li key={index}>{problem.row ? `Row ${problem.row}: ${problem.message}` : problem.message}</li>
                  ))}
                </ul>
              </Alert>
            )}
            {checked && (
              <Alert tone="ok" title="Every row is ready">
                {pieces(checked.rows)} will be tagged{checked.newDesigns ? `, creating designs for ${checked.newDesigns} rows the suite does not know yet` : ""}.
              </Alert>
            )}
            {progress && <p className="text-[13px] text-ash">{progress}…</p>}
            {error && <Alert tone="risk">{error}</Alert>}
            <div className="flex flex-wrap gap-2">
              <Button variant={checked ? "secondary" : "primary"} onClick={check} loading={busy && !checked}>
                Check the file
              </Button>
              <Button variant="gold" onClick={runImport} disabled={!checked || busy} loading={busy && !!checked}>
                Import {pieces(rows.length)}
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {done && (
        <Alert tone="ok" title={`${pieces(done.imported)} imported on ${done.number}`}>
          {done.designs ? `${done.designs} designs were created. ` : ""}
          <Link href={`/receive/${done.receiptId}`} className="underline">
            Open the receipt to print tags
          </Link>
          .
        </Alert>
      )}
    </div>
  );
}
