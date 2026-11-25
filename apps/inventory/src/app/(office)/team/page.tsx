"use client";

import { useState, type FormEvent } from "react";
import { Ban, Eye, EyeOff, KeyRound, ShieldCheck, Sparkles, UserPlus, UsersRound } from "lucide-react";
import { useAuth } from "@webfudge/auth/components";
import { STAFF_ROLES, type StaffRole } from "@webfudge/config";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  KpiCard,
  Modal,
  PageHeader,
  ResultsCount,
  Select,
  Spinner,
  Table,
  Tabs,
  Td,
  Th,
  ToolbarActions,
  ToolbarButton,
  ToolbarSearch,
  Tr,
  cn,
} from "@webfudge/ui";
import type { Branch, TeamMember } from "@webfudge/utils/api";
import { PinCell } from "@/components/settings-floor";
import { errorMessage, useApi, useResource } from "@/lib/api";

type View = "active" | "blocked";
const MANAGER_ROLES: StaffRole[] = ["owner", "branch_manager"];

/** A readable password: letters and digits, no look-alikes. */
function suggestPassword() {
  const letters = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const pick = (set: string, count: number) => Array.from(crypto.getRandomValues(new Uint32Array(count)), (n) => set[n % set.length]).join("");
  return `${pick(letters, 1).toUpperCase()}${pick(letters, 5)}${pick(digits, 4)}`;
}

function PasswordInput({ id, value, onChange, placeholder }: { id: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="flex gap-2">
      <span className="relative flex-1">
        <Input id={id} type={show ? "text" : "password"} autoComplete="new-password" value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className="pr-10 font-mono" />
        <button type="button" onClick={() => setShow(!show)} className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-ash hover:text-ink" aria-label={show ? "Hide password" : "Show password"}>
          {show ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
        </button>
      </span>
      <Button
        variant="secondary"
        onClick={() => {
          onChange(suggestPassword());
          setShow(true);
        }}
        title="Suggest a password"
      >
        <Sparkles className="size-4" aria-hidden />
        Suggest
      </Button>
    </span>
  );
}

/** Add or edit one person. */
function MemberForm({ member, branches, onSaved, onClose }: { member?: TeamMember; branches: Branch[]; onSaved: (member: TeamMember, password: boolean) => void; onClose: () => void }) {
  const api = useApi();
  const { staff, hasRole } = useAuth();
  const isOwner = hasRole("owner");
  const self = member?.id === staff?.id;
  const myBranches = new Set((staff?.branches ?? []).map((branch) => branch.id));
  const pickable = isOwner ? branches : branches.filter((branch) => myBranches.has(branch.id));
  const roles = (Object.keys(STAFF_ROLES) as StaffRole[]).filter((role) => isOwner || !MANAGER_ROLES.includes(role) || role === member?.staffRole);

  const [fullName, setFullName] = useState(member?.fullName ?? member?.name ?? "");
  const [username, setUsername] = useState(member?.username ?? "");
  const [email, setEmail] = useState(member?.email ?? "");
  const [phone, setPhone] = useState(member?.phone ?? "");
  const [role, setRole] = useState<StaffRole | "">((member?.staffRole as StaffRole) ?? "");
  const [branchIds, setBranchIds] = useState<number[]>(member ? member.branches.map((branch) => branch.id) : pickable.length === 1 ? [pickable[0].id] : []);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allBranches = role === "owner";
  const passwordWeak = password !== "" && (password.length < 8 || !/[a-zA-Z]/.test(password) || !/\d/.test(password));
  const missing = [
    !fullName.trim() && "Enter their name.",
    !member && !/^[a-z0-9._]{3,30}$/.test(username) && "Choose a username of 3 to 30 letters, digits, dots or underscores.",
    !role && "Choose a role.",
    !allBranches && !branchIds.length && "Choose at least one branch.",
    !member && !password && "Set their first password.",
    passwordWeak && "The password needs at least 8 characters, with letters and digits.",
  ];

  function toggleBranch(id: number) {
    setBranchIds((ids) => (ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id]));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (missing.some(Boolean)) return;
    setBusy(true);
    setError(null);
    const body = { fullName, email, phone, staffRole: role, branchIds: allBranches ? [] : branchIds, ...(password ? { password } : {}) };
    try {
      const { data } = member ? await api.put<{ data: TeamMember }>(`/staff/team/${member.id}`, body) : await api.post<{ data: TeamMember }>("/staff/team", { ...body, username });
      onSaved(data, !!password);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="member-name">
          <Input id="member-name" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Ravi Patil" autoFocus />
        </Field>
        <Field label="Username" htmlFor="member-username" hint={member ? "Usernames can't be changed." : "They sign in with this. Lowercase, like ravi.patil."}>
          <Input
            id="member-username"
            value={username}
            disabled={!!member}
            onChange={(event) => setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ""))}
            placeholder="ravi.patil"
            className="font-mono"
            autoComplete="off"
          />
        </Field>
        <Field label="Email" htmlFor="member-email" hint="Optional. They can sign in with it too.">
          <Input id="member-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="ravi@example.com" autoComplete="off" />
        </Field>
        <Field label="Mobile" htmlFor="member-phone" hint="Optional.">
          <Input id="member-phone" inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="98xxxxxxxx" />
        </Field>
        <Field label="Role" htmlFor="member-role" hint={self ? "You can't change your own role." : !isOwner ? "Only the owner gives the owner or branch manager role." : undefined}>
          <Select id="member-role" value={role} disabled={self} onChange={(event) => setRole(event.target.value as StaffRole)}>
            <option value="" disabled>
              Choose…
            </option>
            {roles.map((code) => (
              <option key={code} value={code}>
                {STAFF_ROLES[code].label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={member ? "New password" : "First password"} htmlFor="member-password" hint={member ? "Leave empty to keep their password." : "At least 8 characters with letters and digits. Tell it to them in person."}>
          <PasswordInput id="member-password" value={password} onChange={setPassword} placeholder={member ? "Unchanged" : undefined} />
        </Field>
      </div>

      <fieldset className="grid gap-2">
        <legend className="mb-1 text-[13px] font-semibold text-ink">Branches</legend>
        {allBranches ? (
          <p className="text-[13px] text-ash">Owners work in every branch.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {pickable.map((branch) => {
              const on = branchIds.includes(branch.id);
              return (
                <label
                  key={branch.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-[13px] font-semibold transition-colors",
                    on ? "border-navy bg-navy-soft text-navy" : "border-gray-200 text-ink hover:border-gray-300",
                  )}
                >
                  <input type="checkbox" className="size-4 accent-navy" checked={on} onChange={() => toggleBranch(branch.id)} />
                  {branch.name}
                  <span className="font-mono text-[11px] text-ash">{branch.code}</span>
                </label>
              );
            })}
          </div>
        )}
      </fieldset>

      {error && <Alert tone="risk">{error}</Alert>}
      <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4">
        <Button type="submit" loading={busy} disabled={missing.some(Boolean)}>
          {member ? "Save changes" : "Add person"}
        </Button>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      </div>
      {missing.some(Boolean) && (
        <ul className="-mt-2 grid gap-0.5 text-[12px] text-ash">
          {missing.filter(Boolean).map((item) => (
            <li key={String(item)}>• {item}</li>
          ))}
        </ul>
      )}
    </form>
  );
}

function BlockButton({ member, onSaved }: { member: TeamMember; onSaved: () => void }) {
  const api = useApi();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      await api.put(`/staff/team/${member.id}`, { blocked: !member.blocked });
      setConfirming(false);
      onSaved();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  if (member.blocked) {
    return (
      <span className="grid gap-1">
        <Button size="sm" variant="secondary" loading={busy} onClick={toggle}>
          Unblock
        </Button>
        {error && <span className="text-[12px] text-risk">{error}</span>}
      </span>
    );
  }
  if (!confirming) {
    return (
      <Button size="sm" variant="ghost" className="text-risk hover:bg-risk/10" onClick={() => setConfirming(true)}>
        <Ban className="size-3.5" aria-hidden />
        Block
      </Button>
    );
  }
  return (
    <span className="grid gap-1">
      <span className="flex items-center gap-1.5">
        <Button size="sm" variant="danger" loading={busy} onClick={toggle}>
          Block {member.name.split(" ")[0]}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
          Cancel
        </Button>
      </span>
      <span className="text-[11px] text-ash">They are signed out at once. Bills they made stay.</span>
      {error && <span className="text-[12px] text-risk">{error}</span>}
    </span>
  );
}

export default function TeamPage() {
  const { staff, hasRole } = useAuth();
  const isManager = hasRole("owner", "branch_manager");
  const team = useResource<{ data: TeamMember[] }>(isManager ? "/staff/team" : null);
  const branches = useResource<{ data: Branch[] }>(isManager ? "/staff/branches" : null);
  const [view, setView] = useState<View>("active");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<TeamMember | "new" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (!isManager) {
    return (
      <div className="grid gap-6">
        <PageHeader title="Team" />
        <Alert tone="warn">Only the owner or a branch manager can manage the team.</Alert>
      </div>
    );
  }

  const people = team.data?.data ?? [];
  const active = people.filter((member) => !member.blocked);
  const blocked = people.filter((member) => member.blocked);
  const needle = q.trim().toLowerCase();
  const rows = (view === "active" ? active : blocked).filter(
    (member) => !needle || [member.name, member.username, member.email, member.phone, STAFF_ROLES[member.staffRole as StaffRole]?.label].some((value) => value?.toLowerCase().includes(needle)),
  );
  const myBranches = new Set((staff?.branches ?? []).map((branch) => branch.id));
  const canEdit = (member: TeamMember) =>
    hasRole("owner") || member.id === staff?.id || (!MANAGER_ROLES.includes(member.staffRole as StaffRole) && member.branches.some((branch) => myBranches.has(branch.id)));

  function saved(member: TeamMember, password: boolean) {
    const wasNew = editing === "new";
    setEditing(null);
    team.reload();
    setNotice(
      wasNew
        ? `${member.name} can now sign in with the username ${member.username}${member.email ? ` or ${member.email}` : ""} and the password you set.`
        : password
          ? `${member.name}'s password is changed. Tell them the new one in person.`
          : `${member.name} is updated.`,
    );
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Team"
        description="Everyone who signs in to the suite. Add people, set their role and branches, and block anyone who leaves."
        actions={
          <Button onClick={() => setEditing("new")}>
            <UserPlus className="size-4" aria-hidden />
            Add person
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard compact title="Active staff" value={team.data ? active.length : "–"} icon={UsersRound} subtitle="Can sign in" />
        <KpiCard compact title="Managers" value={team.data ? active.filter((member) => MANAGER_ROLES.includes(member.staffRole as StaffRole)).length : "–"} icon={ShieldCheck} tone="navy" subtitle="Owners and branch managers" />
        <KpiCard
          compact
          title="No tablet PIN"
          value={team.data ? active.filter((member) => !member.hasPin).length : "–"}
          icon={KeyRound}
          tone="gold"
          subtitle="Needed for the showroom tablets"
        />
        <KpiCard compact title="Blocked" value={team.data ? blocked.length : "–"} icon={Ban} tone={blocked.length ? "warn" : "ok"} subtitle="Left or suspended" />
      </div>

      {notice && (
        <Alert tone="ok" title="Saved">
          {notice}
        </Alert>
      )}

      <Tabs<View>
        label="Team"
        active={view}
        onChange={setView}
        tabs={[
          { key: "active", label: "Active", count: active.length },
          { key: "blocked", label: "Blocked", count: blocked.length },
        ]}
        actions={
          <ToolbarActions>
            <ToolbarSearch value={q} onChange={setQ} placeholder="Name, username or role…" />
            <ToolbarButton icon={UserPlus} label="Add person" active onClick={() => setEditing("new")} />
          </ToolbarActions>
        }
      />
      {team.data && <ResultsCount shown={rows.length} total={view === "active" ? active.length : blocked.length} noun="person" />}

      <Card className="overflow-hidden">
        {team.loading && !team.data ? (
          <div className="grid place-items-center p-10 text-navy">
            <Spinner />
          </div>
        ) : team.error ? (
          <p className="p-5 text-[13px] text-risk">{team.error}</p>
        ) : !rows.length ? (
          <EmptyState icon={UsersRound} title={q ? "Nobody matches" : view === "blocked" ? "Nobody is blocked" : "No staff yet"} description={q ? "Try another name." : view === "blocked" ? "People you block show here and can be unblocked." : "Add the first person."} />
        ) : (
          <Table minWidth={900}>
            <thead>
              <tr>
                <Th>Person</Th>
                <Th>Role</Th>
                <Th>Branches</Th>
                <Th>Mobile</Th>
                <Th>Tablet PIN</Th>
                <Th>
                  <span className="sr-only">Actions</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((member) => {
                const editable = canEdit(member);
                return (
                  <Tr key={member.id}>
                    <Td>
                      <span className="flex items-center gap-3">
                        <span className={cn("grid size-9 shrink-0 place-items-center rounded-full text-[13px] font-bold", member.blocked ? "bg-gray-100 text-ash" : "bg-navy-soft text-navy")} aria-hidden>
                          {member.name
                            .split(/\s+/)
                            .slice(0, 2)
                            .map((part) => part[0]?.toUpperCase())
                            .join("")}
                        </span>
                        <span className="grid leading-tight">
                          <span className="font-semibold text-ink">
                            {member.name}
                            {member.id === staff?.id && <span className="ml-1.5 text-[11px] font-normal text-ash">(you)</span>}
                          </span>
                          <span className="font-mono text-[12px] text-ash">{member.username}</span>
                          {member.email && <span className="text-[12px] text-ash">{member.email}</span>}
                        </span>
                      </span>
                    </Td>
                    <Td>
                      <Badge tone={member.staffRole === "owner" ? "gold" : member.staffRole === "branch_manager" ? "navy" : "neutral"}>{STAFF_ROLES[member.staffRole as StaffRole]?.label ?? member.staffRole}</Badge>
                    </Td>
                    <Td>{member.staffRole === "owner" ? "All" : member.branches.map((branch) => branch.name).join(", ") || "—"}</Td>
                    <Td className="tabular-nums">{member.phone ?? <span className="text-ash">—</span>}</Td>
                    <Td>{member.blocked ? <span className="text-ash">—</span> : editable ? <PinCell member={member} onSaved={team.reload} /> : member.hasPin ? <Badge tone="ok">PIN set</Badge> : <Badge>No PIN</Badge>}</Td>
                    <Td align="right">
                      {editable && (
                        <span className="flex items-start justify-end gap-1">
                          {!member.blocked && (
                            <Button size="sm" variant="secondary" onClick={() => setEditing(member)}>
                              Edit
                            </Button>
                          )}
                          {member.id !== staff?.id && (
                            <BlockButton
                              member={member}
                              onSaved={() => {
                                setNotice(null);
                                team.reload();
                              }}
                            />
                          )}
                        </span>
                      )}
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        size="lg"
        title={editing === "new" ? "Add a person" : editing ? `Edit ${editing.name}` : ""}
        description={editing === "new" ? "They can sign in to the apps their role allows as soon as you save." : undefined}
      >
        {editing !== null && (
          <MemberForm key={editing === "new" ? "new" : editing.id} member={editing === "new" ? undefined : editing} branches={branches.data?.data ?? []} onSaved={saved} onClose={() => setEditing(null)} />
        )}
      </Modal>
    </div>
  );
}
