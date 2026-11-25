"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useAuth } from "@webfudge/auth/components";
import { Alert, Button, Card, CardBody, CardHeader, Field, Input, PageHeader, Table, Td, Th, Tr, buttonClass } from "@webfudge/ui";
import type { Branch } from "@webfudge/utils/api";
import { InvoiceDetails, Tablets } from "@/components/settings-floor";
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

export default function SettingsPage() {
  const { hasRole, refreshProfile } = useAuth();
  const isOwner = hasRole("owner");
  const branches = useResource<{ data: Branch[] }>("/staff/branches");
  const [editing, setEditing] = useState<number | null>(null);

  const branchSaved = () => {
    setEditing(null);
    branches.reload();
    refreshProfile();
  };

  return (
    <div className="grid gap-6">
      <PageHeader title="Settings" description="Invoice details, branches and showroom tablets." />
      <InvoiceDetails />
      {hasRole("owner", "branch_manager") && (
        <Card>
          <CardHeader
            title="Team"
            description="Add staff accounts, set their role, branches, password and tablet PIN, and block anyone who leaves."
            action={
              <Link href="/team" className={buttonClass("secondary", "sm")}>
                Open team
              </Link>
            }
          />
        </Card>
      )}
      {hasRole("owner", "branch_manager") && <Tablets />}

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
        <CardHeader title="Categories" description="Necklaces, rings, bangles and their short codes now have their own page under Stock." action={<Link href="/categories" className={buttonClass("secondary", "sm")}>Open categories</Link>} />
      </Card>
    </div>
  );
}
