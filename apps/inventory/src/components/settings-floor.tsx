"use client";

import { useState, type FormEvent } from "react";
import { errorMessage, useApi, useAuth, useBranch, useResource } from "@webfudge/auth/components";
import { STAFF_ROLES, type StaffRole } from "@webfudge/config";
import { Alert, Badge, Button, Card, CardBody, CardHeader, Field, Input, Table, Td, Th, Tr } from "@webfudge/ui";
import type { Tablet, TeamMember } from "@webfudge/utils/api";
import { formatDateTime } from "@webfudge/utils/formatters";

type Organization = {
  name: string;
  legalName: string | null;
  gstin: string | null;
  phone: string | null;
  email: string | null;
  branches: { id: number; name: string; code: string; address: string | null; phone: string | null; gstin: string | null }[];
};

/** The seller details printed on every invoice. Owner only. */
export function InvoiceDetails() {
  const api = useApi();
  const { hasRole } = useAuth();
  const org = useResource<{ data: Organization }>("/staff/organization");
  if (!org.data) return null;
  return <InvoiceDetailsForm key={JSON.stringify(org.data.data)} initial={org.data.data} canEdit={hasRole("owner")} onSaved={(data) => org.setData({ data })} save={(body) => api.put<{ data: Organization }>("/staff/organization", body)} />;
}

function InvoiceDetailsForm({
  initial,
  canEdit,
  onSaved,
  save,
}: {
  initial: Organization;
  canEdit: boolean;
  onSaved: (data: Organization) => void;
  save: (body: unknown) => Promise<{ data: Organization }>;
}) {
  const [legalName, setLegalName] = useState(initial.legalName ?? "");
  const [gstin, setGstin] = useState(initial.gstin ?? "");
  const [phone, setPhone] = useState(initial.phone ?? "");
  const [email, setEmail] = useState(initial.email ?? "");
  const [branches, setBranches] = useState(initial.branches);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const { data } = await save({ legalName, gstin, phone, email, branches });
      onSaved(data);
      setSaved(true);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  const update = (id: number, patch: Partial<Organization["branches"][number]>) => setBranches((all) => all.map((branch) => (branch.id === id ? { ...branch, ...patch } : branch)));

  return (
    <Card>
      <CardHeader title="Invoice details" description="Printed at the top of every tax invoice. Confirm the GSTIN with your CA." />
      <CardBody>
        <form onSubmit={submit} className="grid gap-4" noValidate>
          {!initial.gstin && <Alert tone="warn">No GSTIN yet. Invoices show a reminder until it is added.</Alert>}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Legal name" htmlFor="org-legal">
              <Input id="org-legal" value={legalName} onChange={(event) => setLegalName(event.target.value)} disabled={!canEdit} placeholder={initial.name} />
            </Field>
            <Field label="GSTIN" htmlFor="org-gstin">
              <Input id="org-gstin" value={gstin} maxLength={15} onChange={(event) => setGstin(event.target.value)} disabled={!canEdit} className="font-mono uppercase" />
            </Field>
            <Field label="Phone" htmlFor="org-phone">
              <Input id="org-phone" value={phone} onChange={(event) => setPhone(event.target.value)} disabled={!canEdit} />
            </Field>
            <Field label="Email" htmlFor="org-email">
              <Input id="org-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={!canEdit} />
            </Field>
          </div>
          {branches.map((branch) => (
            <div key={branch.id} className="grid gap-3 border-t border-line pt-4 sm:grid-cols-3">
              <Field label={`${branch.name} address`} htmlFor={`branch-address-${branch.id}`} className="sm:col-span-3">
                <Input id={`branch-address-${branch.id}`} value={branch.address ?? ""} onChange={(event) => update(branch.id, { address: event.target.value })} disabled={!canEdit} />
              </Field>
              <Field label="Branch phone" htmlFor={`branch-phone-${branch.id}`}>
                <Input id={`branch-phone-${branch.id}`} value={branch.phone ?? ""} onChange={(event) => update(branch.id, { phone: event.target.value })} disabled={!canEdit} />
              </Field>
              <Field label="Branch GSTIN" htmlFor={`branch-gstin-${branch.id}`} hint="Only if this branch has its own registration.">
                <Input id={`branch-gstin-${branch.id}`} value={branch.gstin ?? ""} maxLength={15} onChange={(event) => update(branch.id, { gstin: event.target.value })} disabled={!canEdit} className="font-mono uppercase" />
              </Field>
            </div>
          ))}
          {error && <Alert tone="risk">{error}</Alert>}
          {saved && <Alert tone="ok">Saved. New invoices print these details.</Alert>}
          {canEdit && (
            <Button type="submit" loading={busy} className="justify-self-start">
              Save invoice details
            </Button>
          )}
        </form>
      </CardBody>
    </Card>
  );
}

function PinCell({ member, onSaved }: { member: TeamMember; onSaved: () => void }) {
  const api = useApi();
  const [editing, setEditing] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await api.put(`/staff/team/${member.id}/pin`, { pin });
      setEditing(false);
      setPin("");
      onSaved();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  if (!editing) {
    return (
      <span className="flex items-center gap-2">
        {member.hasPin ? <Badge tone="ok">PIN set</Badge> : <Badge>No PIN</Badge>}
        <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
          {member.hasPin ? "Change" : "Set PIN"}
        </Button>
      </span>
    );
  }
  return (
    <span className="grid gap-1">
      <span className="flex gap-2">
        <Input id={`pin-${member.id}`} aria-label={`New PIN for ${member.name}`} type="password" inputMode="numeric" maxLength={6} value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))} className="h-8 w-28 font-mono" autoFocus />
        <Button size="sm" loading={busy} disabled={pin.length < 4} onClick={save}>
          Save
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
          Cancel
        </Button>
      </span>
      {error && <span className="text-[12px] text-risk">{error}</span>}
    </span>
  );
}

/** Staff and their tablet PINs. Owner and branch managers. */
export function StaffPins() {
  const team = useResource<{ data: TeamMember[] }>("/staff/team");
  return (
    <Card>
      <CardHeader title="Staff & tablet PINs" description="Salespeople sign in on the showroom tablets with a 4 to 6 digit PIN. New staff accounts are still added in the backend admin panel." />
      <Table minWidth={620}>
        <thead>
          <tr>
            <Th>Name</Th>
            <Th>Role</Th>
            <Th>Branches</Th>
            <Th>Tablet PIN</Th>
          </tr>
        </thead>
        <tbody>
          {team.data?.data.map((member) => (
            <Tr key={member.id}>
              <Td>
                <span className="font-semibold">{member.name}</span>
                <span className="block text-[12px] text-ash">{member.email}</span>
              </Td>
              <Td>{STAFF_ROLES[member.staffRole as StaffRole]?.label ?? member.staffRole}</Td>
              <Td>{member.staffRole === "owner" ? "All" : member.branches.map((branch) => branch.code).join(", ") || "—"}</Td>
              <Td>
                <PinCell member={member} onSaved={team.reload} />
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </Card>
  );
}

/** Pairing showroom tablets to the current branch. Owner and branch managers. */
export function Tablets() {
  const api = useApi();
  const { branch } = useBranch();
  const tablets = useResource<{ data: Tablet[] }>("/floor/devices");
  const [name, setName] = useState("");
  const [created, setCreated] = useState<Tablet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function create(event: FormEvent) {
    event.preventDefault();
    if (!branch) return;
    setBusy(true);
    setError(null);
    try {
      const { data } = await api.post<{ data: Tablet }>("/floor/devices", { branchId: branch.id, name: name || "Showroom tablet" });
      setCreated(data);
      setName("");
      tablets.reload();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function revoke(tablet: Tablet) {
    setError(null);
    try {
      await api.post(`/floor/devices/${tablet.id}/revoke`, {});
      tablets.reload();
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  return (
    <Card>
      <CardHeader title="Showroom tablets" description={`Pair a tablet with ${branch?.name ?? "this branch"}: open the Showroom app on it and type the code shown here.`} />
      <CardBody className="grid gap-4">
        <form onSubmit={create} className="flex flex-wrap items-end gap-3" noValidate>
          <Field label="Tablet name" htmlFor="tablet-name">
            <Input id="tablet-name" placeholder="Like Counter 2 tablet" value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <Button type="submit" loading={busy}>
            Create pairing code
          </Button>
        </form>
        {created?.pairingCode && (
          <Alert tone="ok" title={`Code for ${created.name}`}>
            <span className="block font-mono text-3xl tracking-[0.3em] text-navy">{created.pairingCode}</span>
            Works once, for 15 minutes.
          </Alert>
        )}
        {error && <Alert tone="risk">{error}</Alert>}
      </CardBody>
      {tablets.data && tablets.data.data.length > 0 && (
        <Table minWidth={560}>
          <thead>
            <tr>
              <Th>Tablet</Th>
              <Th>Branch</Th>
              <Th>Last used</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {tablets.data.data.map((tablet) => (
              <Tr key={tablet.id}>
                <Td>
                  <span className="font-semibold">{tablet.name}</span>
                  {!tablet.paired && <Badge tone="warn" className="ml-2">Waiting for the code</Badge>}
                </Td>
                <Td>{tablet.branch?.name}</Td>
                <Td>{tablet.lastSeenAt ? formatDateTime(tablet.lastSeenAt) : "—"}</Td>
                <Td>
                  <Button size="sm" variant="ghost" onClick={() => revoke(tablet)}>
                    Unpair
                  </Button>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  );
}
