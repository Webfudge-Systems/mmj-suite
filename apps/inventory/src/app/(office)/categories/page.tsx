"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Check, Plus, Shapes } from "lucide-react";
import { useAuth } from "@webfudge/auth/components";
import { Alert, Button, Card, EmptyState, Input, PageHeader, ResultsCount, Spinner, Table, Td, Th, ToolbarSearch, Tr } from "@webfudge/ui";
import type { CategoryWithStats } from "@webfudge/utils/api";
import { errorMessage, useApi, useResource } from "@/lib/api";

/** One category, edited in place: the save tick appears only when something changed. */
function CategoryRow({ category, canEdit, onSaved }: { category: CategoryWithStats; canEdit: boolean; onSaved: () => void }) {
  const api = useApi();
  const [name, setName] = useState(category.name);
  const [code, setCode] = useState(category.code ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const changed = name.trim() !== category.name || code.trim().toUpperCase() !== (category.code ?? "");

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.put(`/stock/categories/${category.id}`, { name, code });
      onSaved();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Tr>
      <Td className="py-2">
        {canEdit ? (
          <form id={`cat-${category.id}`} onSubmit={save} className="grid gap-1">
            <Input aria-label={`Name of ${category.name}`} value={name} onChange={(event) => setName(event.target.value)} className="h-9" />
            {error && <span className="text-[12px] text-risk">{error}</span>}
          </form>
        ) : (
          <span className="font-semibold text-ink">{category.name}</span>
        )}
      </Td>
      <Td className="py-2">
        {canEdit ? (
          <Input form={`cat-${category.id}`} aria-label={`Code of ${category.name}`} value={code} maxLength={4} onChange={(event) => setCode(event.target.value)} className="h-9 w-20 font-mono uppercase" />
        ) : (
          <span className="font-mono">{category.code}</span>
        )}
      </Td>
      <Td align="right" className="py-2">
        <Link href={`/catalogue?categoryId=${category.id}`} className="text-navy hover:underline">
          {category.stats.designs}
        </Link>
      </Td>
      <Td align="right" className="py-2">
        <Link href={`/stock?categoryId=${category.id}`} className="font-semibold text-ink hover:underline">
          {category.stats.pieces}
        </Link>
        <span className="block text-[11.5px] text-ash">{category.stats.netWeight.toFixed(3)} g</span>
      </Td>
      <Td className="w-12 py-2">
        {canEdit && changed && (
          <Button type="submit" form={`cat-${category.id}`} size="sm" loading={busy} aria-label={`Save ${category.name}`}>
            <Check className="size-4" aria-hidden />
          </Button>
        )}
      </Td>
    </Tr>
  );
}

export default function CategoriesPage() {
  const api = useApi();
  const { hasRole } = useAuth();
  const canEdit = hasRole("owner", "branch_manager", "stock_keeper");
  const list = useResource<{ data: CategoryWithStats[] }>("/stock/categories?stats=true");
  const [q, setQ] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const all = list.data?.data ?? [];
  const needle = q.trim().toLowerCase();
  const rows = needle ? all.filter((row) => row.name.toLowerCase().includes(needle) || row.code?.toLowerCase().includes(needle)) : all;

  async function add(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post("/stock/categories", { name, code });
      setName("");
      setCode("");
      list.reload();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6">
      <PageHeader title="Categories" description="Necklaces, rings, bangles… The short code goes into automatic design numbers, like D-NK-0001." />

      <Card className="overflow-hidden">
        <div className="grid gap-3 border-b border-gray-100 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
          {canEdit ? (
            <form onSubmit={add} className="flex flex-wrap items-center gap-2" noValidate>
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-gold-soft text-gold-deep">
                <Shapes className="size-4" aria-hidden />
              </span>
              <Input aria-label="New category name" value={name} onChange={(event) => setName(event.target.value)} placeholder="New category, like Nose pins" className="h-10 min-w-48 flex-1" />
              <Input aria-label="Code" value={code} maxLength={4} onChange={(event) => setCode(event.target.value)} placeholder="Code" className="h-10 w-24 font-mono uppercase" />
              <Button type="submit" loading={busy} disabled={!name.trim() || !code.trim()}>
                <Plus className="size-4" aria-hidden />
                Add
              </Button>
            </form>
          ) : (
            <span className="text-[13px] text-ash">Only the owner, a branch manager or the stock keeper can change categories.</span>
          )}
          <ToolbarSearch value={q} onChange={setQ} placeholder="Find a category…" />
        </div>
        {error && (
          <div className="px-4 pt-3">
            <Alert tone="risk">{error}</Alert>
          </div>
        )}
        {list.loading && !list.data ? (
          <div className="grid place-items-center p-10 text-navy">
            <Spinner />
          </div>
        ) : !rows.length ? (
          <EmptyState icon={Shapes} title={needle ? "No category matches" : "No categories yet"} description={needle ? "Try another name." : "Add the first one above."} />
        ) : (
          <Table minWidth={560}>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Code</Th>
                <Th align="right">Designs</Th>
                <Th align="right">Pieces in stock</Th>
                <Th>
                  <span className="sr-only">Save</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((category) => (
                <CategoryRow key={`${category.id}-${category.name}-${category.code}`} category={category} canEdit={canEdit} onSaved={list.reload} />
              ))}
            </tbody>
          </Table>
        )}
      </Card>
      {list.data && <ResultsCount shown={rows.length} total={all.length} noun="category" />}
    </div>
  );
}
