"use client";

import { useCallback, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { RequireAuth, useAuth } from "@webfudge/auth/components";
import { STAFF_ROLES } from "@webfudge/config";
import { AppShell, Button, LiveRateBoard, type NavItem } from "@webfudge/ui";
import { BranchSwitcher } from "@/components/pickers";
import { BranchProvider } from "@/lib/branch";
import { API_URL } from "@/lib/env";

const nav: NavItem[] = [
  { href: "/", label: "Dashboard" },
  { href: "/catalogue", label: "Catalogue" },
  { href: "/stock", label: "Stock" },
  { href: "/receive", label: "Receive stock" },
  { href: "/tags", label: "Tags & labels" },
  { href: "/locations", label: "Locations" },
  { href: "/transfers", label: "Transfers" },
  { href: "/audit", label: "Stock audit" },
  { href: "/suppliers", label: "Suppliers & karigars" },
  { href: "/rates", label: "Rates & pricing" },
  { href: "/karigar", label: "Karigar job work", soon: true },
  { href: "/approvals", label: "Approvals out", soon: true },
  { href: "/media", label: "Media studio", soon: true },
  { href: "/reports", label: "Reports", soon: true },
  { href: "/settings", label: "Settings" },
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

export default function OfficeLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const toLogin = useCallback(() => router.replace("/login"), [router]);

  return (
    <RequireAuth onSignedOut={toLogin}>
      <BranchProvider>
        <AppShell
          appName="Back Office"
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
