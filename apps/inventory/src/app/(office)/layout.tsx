"use client";

import { useCallback, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { RequireAuth, useAuth } from "@webfudge/auth/components";
import { STAFF_ROLES } from "@webfudge/config";
import { AppShell, Button, LiveRateBoard, type NavItem } from "@webfudge/ui";
import { API_URL } from "@/lib/env";

const nav: NavItem[] = [
  { href: "/", label: "Dashboard" },
  { href: "/catalogue", label: "Catalogue", soon: true },
  { href: "/stock", label: "Stock", soon: true },
  { href: "/receive", label: "Receive stock", soon: true },
  { href: "/tags", label: "Tags & labels", soon: true },
  { href: "/locations", label: "Locations", soon: true },
  { href: "/karigar", label: "Karigar & job work", soon: true },
  { href: "/transfers", label: "Transfers", soon: true },
  { href: "/audit", label: "Stock audit", soon: true },
  { href: "/approvals", label: "Approvals out", soon: true },
  { href: "/rates", label: "Rates & pricing" },
  { href: "/media", label: "Media studio", soon: true },
  { href: "/suppliers", label: "Suppliers", soon: true },
  { href: "/reports", label: "Reports", soon: true },
  { href: "/settings", label: "Settings", soon: true },
];

function Account() {
  const { staff, signOut } = useAuth();
  if (!staff) return null;
  return (
    <div className="grid gap-3 text-paper">
      <div className="grid leading-tight">
        <span className="truncate text-[13px] font-semibold">{staff.fullName || staff.username}</span>
        <span className="text-[11px] text-paper/60">
          {STAFF_ROLES[staff.staffRole].label} · {staff.branches.map((branch) => branch.name).join(", ") || "No branch"}
        </span>
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
      <AppShell
        appName="Back Office"
        nav={nav}
        activeHref={pathname}
        LinkComponent={Link}
        footer={<Account />}
        topBar={<LiveRateBoard apiUrl={API_URL} variant="strip" only={["24KT", "22KT", "18KT", "999"]} />}
      >
        {children}
      </AppShell>
    </RequireAuth>
  );
}
