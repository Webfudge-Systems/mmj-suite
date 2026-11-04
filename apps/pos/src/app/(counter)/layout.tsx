"use client";

import { useCallback, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BranchProvider, RequireAuth, useAuth, useBranch } from "@webfudge/auth/components";
import { STAFF_ROLES } from "@webfudge/config";
import { AppShell, Button, LiveRateBoard, Select, type NavItem } from "@webfudge/ui";
import { API_URL } from "@/lib/env";

const nav: NavItem[] = [
  { href: "/", label: "New bill" },
  { href: "/estimates", label: "Estimates" },
  { href: "/invoices", label: "Invoices" },
  { href: "/old-gold", label: "Old gold" },
  { href: "/advances", label: "Advances & bookings" },
  { href: "/returns", label: "Returns & credit notes" },
  { href: "/customers", label: "Customers" },
  { href: "/day", label: "Day close" },
  { href: "/orders", label: "Custom orders", soon: true },
  { href: "/repairs", label: "Repairs", soon: true },
  { href: "/schemes", label: "Scheme collections", soon: true },
];

function Account() {
  const { staff, signOut } = useAuth();
  if (!staff) return null;
  return (
    <div className="grid gap-3 text-paper">
      <div className="grid leading-tight">
        <span className="truncate text-[13px] font-semibold">{staff.fullName || staff.username}</span>
        <span className="text-[11px] text-paper/60">{STAFF_ROLES[staff.staffRole].label}</span>
      </div>
      <Button variant="secondary" size="sm" onClick={signOut} className="border-paper/20 bg-transparent text-paper hover:bg-paper/10">
        Sign out
      </Button>
    </div>
  );
}

function BranchSwitcher() {
  const { branch, branches, setBranchId } = useBranch();
  if (branches.length <= 1) return branch ? <span className="text-[13px] font-semibold text-navy">{branch.name}</span> : null;
  return (
    <Select id="branch-switcher" aria-label="Branch" value={branch?.id ?? ""} onChange={(event) => setBranchId(Number(event.target.value))} className="h-8 max-w-56 py-0">
      {branches.map((entry) => (
        <option key={entry.id} value={entry.id}>
          {entry.name} ({entry.code})
        </option>
      ))}
    </Select>
  );
}

export default function CounterLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const toLogin = useCallback(() => router.replace("/login"), [router]);

  return (
    <RequireAuth onSignedOut={toLogin}>
      <BranchProvider>
        <AppShell
          appName="POS & Billing"
          nav={nav}
          activeHref={pathname}
          LinkComponent={Link}
          footer={<Account />}
          topBar={
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1">
              <LiveRateBoard apiUrl={API_URL} variant="strip" only={["24KT", "22KT", "18KT", "999"]} />
              <BranchSwitcher />
            </div>
          }
        >
          {children}
        </AppShell>
      </BranchProvider>
    </RequireAuth>
  );
}
