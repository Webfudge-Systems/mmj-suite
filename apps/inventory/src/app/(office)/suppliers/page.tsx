"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@webfudge/auth/components";
import { Alert, Badge, Button, Card, CardBody, CardHeader, EmptyState, Field, Input, PageHeader, Select, Spinner, Table, Td, Th, Tr } from "@webfudge/ui";
import type { Supplier } from "@webfudge/utils/api";
import { errorMessage, useApi, useResource } from "@/lib/api";

function SupplierForm({ supplier, onSaved, onCancel }: { supplier?: Supplier; onSaved: () => void; onCancel?: () => void }) {
  const api = useApi();
  const [name, setName] = useState(supplier?.name ?? "");
  const [kind, setKind] = useState<Supplier["kind"]>(supplier?.kind ?? "supplier");
  const [phone, setPhone] = useState(supplier?.phone ?? "");
  const [city, setCity] = useState(supplier?.city ?? "");
  const [gstin, setGstin] = useState(supplier?.gstin ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const body = { name, kind, phone, city, gstin, isActive: supplier?.isActive ?? true };
    try {
      if (supplier) await api.put(`/stock/suppliers/${supplier.id}`, body);
      else await api.post("/stock/suppliers", body);
      if (!supplier) {
        setName("");
        setPhone("");
        setCity("");
        setGstin("");
      }
      onSaved();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6" noValidate>
      <Field label="Name" htmlFor={`sup-name-${supplier?.id ?? "new"}`} className="lg:col-span-2">
        <Input id={`sup-name-${supplier?.id ?? "new"}`} value={name} onChange={(event) => setName(event.target.value)} />
      </Field>
      <Field label="Type" htmlFor={`sup-kind-${supplier?.id ?? "new"}`}>
        <Select id={`sup-kind-${supplier?.id ?? "new"}`} value={kind} onChange={(event) => setKind(event.target.value as Supplier["kind"])}>
          <option value="supplier">Supplier</option>
          <option value="karigar">Karigar</option>
        </Select>
      </Field>
      <Field label="Phone" htmlFor={`sup-phone-${supplier?.id ?? "new"}`}>
        <Input id={`sup-phone-${supplier?.id ?? "new"}`} inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} />
      </Field>
      <Field label="City" htmlFor={`sup-city-${supplier?.id ?? "new"}`}>
        <Input id={`sup-city-${supplier?.id ?? "new"}`} value={city} onChange={(event) => setCity(event.target.value)} />
      </Field>
      <Field label="GSTIN" htmlFor={`sup-gstin-${supplier?.id ?? "new"}`}>
        <Input id={`sup-gstin-${supplier?.id ?? "new"}`} value={gstin} maxLength={15} onChange={(event) => setGstin(event.target.value)} className="font-mono uppercase" />
      </Field>
      {error && <Alert tone="risk" className="sm:col-span-2 lg:col-span-6">{error}</Alert>}
      <div className="flex gap-2 sm:col-span-2 lg:col-span-6">
        <Button type="submit" loading={busy} disabled={!name.trim()}>
          {supplier ? "Save" : "Add"}
        </Button>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

export default function SuppliersPage() {
  const { hasRole } = useAuth();
  const canEdit = hasRole("owner", "branch_manager", "stock_keeper");
  const suppliers = useResource<{ data: Supplier[] }>("/stock/suppliers?active=all");
  const [editing, setEditing] = useState<number | null>(null);

  return (
    <div className="grid gap-6">
      <PageHeader title="Suppliers & karigars" description="Who goods are received from. Karigar metal accounts arrive with the job work screens." />
      {canEdit && (
        <Card>
          <CardHeader title="Add" />
          <CardBody>
            <SupplierForm onSaved={suppliers.reload} />
          </CardBody>
        </Card>
      )}
      <Card>
        {suppliers.loading ? (
          <div className="grid place-items-center p-10 text-navy">
            <Spinner />
          </div>
        ) : !suppliers.data?.data.length ? (
          <EmptyState title="No suppliers yet" />
        ) : (
          <Table minWidth={640}>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Type</Th>
                <Th>Phone</Th>
                <Th>City</Th>
                <Th>GSTIN</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {suppliers.data.data.map((supplier) =>
                editing === supplier.id ? (
                  <Tr key={supplier.id}>
                    <Td colSpan={6}>
                      <SupplierForm
                        supplier={supplier}
                        onSaved={() => {
                          setEditing(null);
                          suppliers.reload();
                        }}
                        onCancel={() => setEditing(null)}
                      />
                    </Td>
                  </Tr>
                ) : (
                  <Tr key={supplier.id}>
                    <Td className="font-semibold">{supplier.name}</Td>
                    <Td>
                      <Badge tone={supplier.kind === "karigar" ? "gold" : "neutral"}>{supplier.kind === "karigar" ? "Karigar" : "Supplier"}</Badge>
                    </Td>
                    <Td>{supplier.phone ?? "—"}</Td>
                    <Td>{supplier.city ?? "—"}</Td>
                    <Td className="font-mono">{supplier.gstin ?? "—"}</Td>
                    <Td>
                      {canEdit && (
                        <Button size="sm" variant="ghost" onClick={() => setEditing(supplier.id)}>
                          Edit
                        </Button>
                      )}
                    </Td>
                  </Tr>
                ),
              )}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
