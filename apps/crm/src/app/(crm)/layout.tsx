"use client";

import { useCallback, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BellRing, Gift, Inbox, LayoutDashboard, Megaphone, PiggyBank, Settings, Users } from "lucide-react";
import { BranchProvider, RequireAuth, StaffHeaderExtras } from "@webfudge/auth/components";
import { AppShell, RatesPanel, type NavItem } from "@webfudge/ui";
import { API_URL } from "@/lib/env";

const nav: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/enquiries", label: "Enquiries", icon: Inbox },
  { href: "/schemes", label: "Gold schemes", icon: PiggyBank },
  { href: "/loyalty", label: "Loyalty points", icon: Gift },
  { href: "/reminders", label: "Reminders", icon: BellRing },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone },
];

const system: NavItem[] = [{ href: "/settings", label: "Settings", icon: Settings }];

export default function CrmLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const toLogin = useCallback(() => router.replace("/login"), [router]);

  return (
    <RequireAuth onSignedOut={toLogin}>
      <BranchProvider>
        <AppShell
          appName="CRM & Loyalty"
          nav={nav}
          system={system}
          activeHref={pathname}
          LinkComponent={Link}
          widget={<RatesPanel apiUrl={API_URL} />}
          headerExtras={<StaffHeaderExtras />}
        >
          {children}
        </AppShell>
      </BranchProvider>
    </RequireAuth>
  );
}
