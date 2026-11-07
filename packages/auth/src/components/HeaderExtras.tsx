"use client";

import { MapPin } from "lucide-react";
import { STAFF_ROLES } from "@webfudge/config";
import { ProfileMenu } from "@webfudge/ui/layouts";
import { useAuth } from "./AuthProvider";
import { useBranch } from "./BranchProvider";

/** The branch being worked on: a pill when there is one, a picker when there are several. */
export function BranchSwitcher() {
  const { branch, branches, setBranchId } = useBranch();
  if (!branch) return null;
  if (branches.length <= 1) {
    return (
      <span className="inline-flex h-10 items-center gap-2 rounded-full border border-gray-200 bg-white px-4 text-sm font-semibold text-navy shadow-sm">
        <MapPin className="size-4 text-gold" aria-hidden />
        {branch.name}
      </span>
    );
  }
  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">Branch</span>
      <MapPin className="pointer-events-none absolute left-3.5 size-4 text-gold" aria-hidden />
      <select
        id="branch-switcher"
        value={branch.id}
        onChange={(event) => setBranchId(Number(event.target.value))}
        className="h-10 max-w-60 rounded-full border border-gray-200 bg-white pr-9 pl-10 text-sm font-semibold text-navy shadow-sm focus:ring-2 focus:ring-navy focus:outline-none"
      >
        {branches.map((entry) => (
          <option key={entry.id} value={entry.id}>
            {entry.name} ({entry.code})
          </option>
        ))}
      </select>
    </label>
  );
}

/** The signed-in staff member's avatar menu, with Sign out. */
export function AccountMenu() {
  const { staff, signOut } = useAuth();
  if (!staff) return null;
  return (
    <ProfileMenu
      name={staff.fullName || staff.username}
      role={STAFF_ROLES[staff.staffRole]?.label}
      detail={staff.email}
      onSignOut={signOut}
    />
  );
}

/** Branch and account controls for the right side of every page header. */
export function StaffHeaderExtras() {
  return (
    <>
      <BranchSwitcher />
      <AccountMenu />
    </>
  );
}
