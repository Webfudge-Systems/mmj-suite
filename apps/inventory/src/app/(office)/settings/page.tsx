"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@webfudge/auth/components";
import { Alert, Button, Card, CardBody, CardHeader, Field, Input, PageHeader, Table, Td, Th, Tr } from "@webfudge/ui";
import type { Branch, Category } from "@webfudge/utils/api";
import { errorMessage, useApi, useResource } from "@/lib/api";

function BranchForm({ branch, onSaved, onCancel }: { branch?: Branch; onSaved: () => void; onCancel?: () => void }) {
  const api = useApi();
  const [name, setName] = useState(branch?.name ?? "");
  const [code, setCode] = useState(branch?.code ?? "");
  const [city, setCity] = useState(branch?.city ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (branch) await api.put(`/staff/branches/${branch.id}`, { name, code, city });
      else await api.post("/staff/branches", { name, code, city });
      if (!branch) {
        setName("");
        setCode("");
        setCity("");
      }
      onSaved();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  const key = branch?.id ?? "new";
  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-4" noValidate>
      <Field label="Name" htmlFor={`branch-name-${key}`}>
        <Input id={`branch-name-${key}`} value={name} onChange={(event) => setName(event.target.value)} />
      </Field>
      <Field label="Code" htmlFor={`branch-code-${key}`} hint="Printed on tray labels, like B2.">
        <Input id={`branch-code-${key}`} value={code} maxLength={6} onChange={(event) => setCode(event.target.value)} className="font-mono uppercase" />
      </Field>
      <Field label="City" htmlFor={`branch-city-${key}`}>
        <Input id={`branch-city-${key}`} value={city} onChange={(event) => setCity(event.target.value)} />
      </Field>
      <div className="flex items-end gap-2">
        <Button type="submit" loading={busy} disabled={!name.trim() || !code.trim()}>
          {branch ? "Save" : "Add branch"}
        </Button>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
      {error && <Alert tone="risk" className="sm:col-span-4">{error}</Alert>}
    </form>
  );
}

function CategoryRow({ category, onSaved }: { category: Category; onSaved: () => void }) {
  const api = useApi();
  const [name, setName] = useState(category.name);
  const [code, setCode] = useState(category.code ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const changed = name !== category.name || code !== (category.code ?? "");

  async function save() {
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
      <Td>
        <Input id={`cat-name-${category.id}`} aria-label="Category name" value={name} onChange={(event) => setName(event.target.value)} />
      </Td>
      <Td>
        <Input id={`cat-code-${category.id}`} aria-label="Category code" value={code} maxLength={4} onChange={(event) => setCode(event.target.value)} className="w-24 font-mono uppercase" />
      </Td>
      <Td>
        {changed && (
          <Button size="sm" onClick={save} loading={busy}>
            Save
          </Button>
        )}
        {error && <span className="block text-[12px] text-risk">{error}</span>}
      </Td>
    </Tr>
  );
}

export default function SettingsPage() {
  const api = useApi();
  const { hasRole, refreshProfile } = useAuth();
  const isOwner = hasRole("owner");
  const canEditCatalogue = hasRole("owner", "branch_manager", "stock_keeper");
  const branches = useResource<{ data: Branch[] }>("/staff/branches");
  const categories = useResource<{ data: Category[] }>("/stock/categories");
  const [editing, setEditing] = useState<number | null>(null);
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [categoryError, setCategoryError] = useState<string | null>(null);

  const branchSaved = () => {
    setEditing(null);
    branches.reload();
    refreshProfile();
  };

  async function addCategory(event: FormEvent) {
    event.preventDefault();
    setCategoryError(null);
    try {
      await api.post("/stock/categories", { name: newName, code: newCode });
      setNewName("");
      setNewCode("");
      categories.reload();
    } catch (cause) {
      setCategoryError(errorMessage(cause));
    }
  }

  return (
    <div className="grid gap-6">
      <PageHeader title="Settings" description="Staff accounts and roles are still managed in the backend admin panel." />

      <Card>
        <CardHeader title="Branches" description="Each shop. Stock, trays and staff belong to a branch." />
        <Table minWidth={520}>
          <thead>
            <tr>
              <Th>Branch</Th>
              <Th>Code</Th>
              <Th>City</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {branches.data?.data.map((branch) =>
              editing === branch.id ? (
                <Tr key={branch.id}>
                  <Td colSpan={4}>
                    <BranchForm branch={branch} onSaved={branchSaved} onCancel={() => setEditing(null)} />
                  </Td>
                </Tr>
              ) : (
                <Tr key={branch.id}>
                  <Td className="font-semibold">{branch.name}</Td>
                  <Td className="font-mono">{branch.code}</Td>
                  <Td>{branch.city ?? "—"}</Td>
                  <Td>
                    {isOwner && (
                      <Button size="sm" variant="ghost" onClick={() => setEditing(branch.id)}>
                        Edit
                      </Button>
                    )}
                  </Td>
                </Tr>
              ),
            )}
          </tbody>
        </Table>
        {isOwner && (
          <CardBody className="border-t border-line">
            <BranchForm onSaved={branchSaved} />
          </CardBody>
        )}
      </Card>

      <Card>
        <CardHeader title="Categories" description="The code goes into automatic design numbers, like D-NK-0001." />
        <Table minWidth={420}>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Code</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {categories.data?.data.map((category) =>
              canEditCatalogue ? (
                <CategoryRow key={`${category.id}-${category.name}-${category.code}`} category={category} onSaved={categories.reload} />
              ) : (
                <Tr key={category.id}>
                  <Td>{category.name}</Td>
                  <Td className="font-mono">{category.code}</Td>
                  <Td />
                </Tr>
              ),
            )}
          </tbody>
        </Table>
        {canEditCatalogue && (
          <CardBody className="border-t border-line">
            <form onSubmit={addCategory} className="flex flex-wrap items-end gap-3" noValidate>
              <Field label="New category" htmlFor="cat-new-name">
                <Input id="cat-new-name" value={newName} onChange={(event) => setNewName(event.target.value)} />
              </Field>
              <Field label="Code" htmlFor="cat-new-code">
                <Input id="cat-new-code" value={newCode} maxLength={4} onChange={(event) => setNewCode(event.target.value)} className="w-24 font-mono uppercase" />
              </Field>
              <Button type="submit" disabled={!newName.trim() || !newCode.trim()}>
                Add
              </Button>
              {categoryError && <Alert tone="risk" className="w-full">{categoryError}</Alert>}
            </form>
          </CardBody>
        )}
      </Card>
    </div>
  );
}
