"use client";

import { useState } from "react";
import { Gem, Plus, Trash2, Weight } from "lucide-react";
import { PURITIES } from "@webfudge/config";
import { Button, Field, Input, Select } from "@webfudge/ui";
import type { IssueDraft } from "@webfudge/utils/api";

/** A line in a "give to karigar" form, as typed. Numbers stay strings until saved. */
export type IssueRow = {
  key: number;
  kind: "metal" | "stone";
  purity: string;
  grossWeight: string;
  name: string;
  pieces: string;
  weight: string;
  unit: "ct" | "g";
  note: string;
};

let nextKey = 1;

function blank(kind: IssueRow["kind"], purity = "24KT"): IssueRow {
  return {
    key: nextKey++,
    kind,
    purity,
    grossWeight: "",
    name: "",
    pieces: "",
    weight: "",
    unit: "ct",
    note: "",
  };
}

/** Rows that are filled in enough to save. Empty rows are skipped, so a form can keep a spare line. */
export function filledRows(rows: IssueRow[]) {
  return rows.filter((row) =>
    row.kind === "metal"
      ? Number(row.grossWeight) > 0
      : row.name.trim() && (Number(row.pieces) > 0 || Number(row.weight) > 0),
  );
}

export function toDrafts(rows: IssueRow[]): IssueDraft[] {
  return filledRows(rows).map((row) =>
    row.kind === "metal"
      ? {
          kind: "metal",
          purity: row.purity,
          grossWeight: Number(row.grossWeight),
          note: row.note || undefined,
        }
      : {
          kind: "stone",
          name: row.name.trim(),
          pieces: Number(row.pieces) || 0,
          weight: Number(row.weight) || 0,
          unit: row.unit,
          note: row.note || undefined,
        },
  );
}

export function useIssueRows(initial: IssueRow["kind"][] = ["metal"]) {
  const [rows, setRows] = useState<IssueRow[]>(() => initial.map((kind) => blank(kind)));
  return {
    rows,
    setRows,
    reset: () => setRows(initial.map((kind) => blank(kind))),
  };
}

/**
 * Lines of metal and stones handed to a karigar. "+ Metal" adds another lot of
 * metal (any purity, gold or silver); "+ Stone" adds stones counted by pieces and
 * weight.
 */
export function IssueLines({
  rows,
  onChange,
  idPrefix,
}: {
  rows: IssueRow[];
  onChange: (rows: IssueRow[]) => void;
  idPrefix: string;
}) {
  const update = (key: number, patch: Partial<IssueRow>) =>
    onChange(rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  const remove = (key: number) => onChange(rows.filter((row) => row.key !== key));
  const add = (kind: IssueRow["kind"]) =>
    onChange([...rows, blank(kind, rows.filter((row) => row.kind === "metal").at(-1)?.purity)]);

  return (
    <div className="grid gap-3">
      {rows.map((row) => {
        const id = `${idPrefix}-${row.key}`;
        const number = rows.filter((other) => other.kind === row.kind).indexOf(row) + 1;
        const label = `${row.kind === "metal" ? "Metal" : "Stone"} ${number}`;
        return (
          <div
            key={row.key}
            className="grid gap-2 rounded-xl border border-gray-200 bg-gray-50/60 p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-[12px] font-bold tracking-wide text-gray-500 uppercase">
                {row.kind === "metal" ? (
                  <Weight className="size-4 text-gold" aria-hidden />
                ) : (
                  <Gem className="size-4 text-navy" aria-hidden />
                )}
                {label}
              </span>
              <button
                type="button"
                onClick={() => remove(row.key)}
                disabled={rows.length === 1}
                className="grid size-7 place-items-center rounded-full text-gray-500 hover:bg-white hover:text-risk disabled:invisible"
                aria-label={`Remove ${label.toLowerCase()}`}
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {row.kind === "metal" ? (
                <>
                  <Field label="Purity" htmlFor={`${id}-purity`}>
                    <Select
                      id={`${id}-purity`}
                      value={row.purity}
                      onChange={(event) => update(row.key, { purity: event.target.value })}
                    >
                      {PURITIES.map((purity) => (
                        <option key={purity.code} value={purity.code}>
                          {purity.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Weight (g)" htmlFor={`${id}-weight`}>
                    <Input
                      id={`${id}-weight`}
                      inputMode="decimal"
                      value={row.grossWeight}
                      onChange={(event) => update(row.key, { grossWeight: event.target.value })}
                      placeholder="40.000"
                    />
                  </Field>
                </>
              ) : (
                <>
                  <Field label="Stone" htmlFor={`${id}-name`}>
                    <Input
                      id={`${id}-name`}
                      value={row.name}
                      onChange={(event) => update(row.key, { name: event.target.value })}
                      placeholder="Ruby, CZ, pearl"
                    />
                  </Field>
                  <Field label="Pieces" htmlFor={`${id}-pieces`}>
                    <Input
                      id={`${id}-pieces`}
                      inputMode="numeric"
                      value={row.pieces}
                      onChange={(event) =>
                        update(row.key, { pieces: event.target.value.replace(/\D/g, "") })
                      }
                      placeholder="24"
                    />
                  </Field>
                  <Field label="Weight" htmlFor={`${id}-stone-weight`}>
                    <div className="flex gap-1.5">
                      <Input
                        id={`${id}-stone-weight`}
                        inputMode="decimal"
                        value={row.weight}
                        onChange={(event) => update(row.key, { weight: event.target.value })}
                        placeholder="1.20"
                        className="min-w-0"
                      />
                      <Select
                        aria-label="Unit"
                        value={row.unit}
                        onChange={(event) =>
                          update(row.key, { unit: event.target.value as IssueRow["unit"] })
                        }
                        className="w-20 shrink-0"
                      >
                        <option value="ct">ct</option>
                        <option value="g">g</option>
                      </Select>
                    </div>
                  </Field>
                </>
              )}
              <Field
                label="Note"
                htmlFor={`${id}-note`}
                className={row.kind === "metal" ? "col-span-2" : "col-span-2 lg:col-span-1"}
              >
                <Input
                  id={`${id}-note`}
                  value={row.note}
                  onChange={(event) => update(row.key, { note: event.target.value })}
                  placeholder={
                    row.kind === "metal" ? "Bar number, old gold lot" : "Size, colour, cut"
                  }
                />
              </Field>
            </div>
          </div>
        );
      })}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => add("metal")}>
          <Plus className="size-4" aria-hidden />
          Metal
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => add("stone")}>
          <Plus className="size-4" aria-hidden />
          Stone
        </Button>
      </div>
    </div>
  );
}
