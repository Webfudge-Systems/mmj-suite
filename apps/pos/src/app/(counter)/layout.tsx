"use client";

import { useCallback, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarCheck,
  ClipboardList,
  Coins,
  FilePlus2,
  Gem,
  PiggyBank,
  ReceiptText,
  Sparkles,
  Undo2,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";
import { BranchProvider, RequireAuth, StaffHeaderExtras } from "@webfudge/auth/components";
import { AppShell, RatesPanel, type NavItem } from "@webfudge/ui";
import { API_URL } from "@/lib/env";

const nav: NavItem[] = [
  { href: "/", label: "New bill", icon: FilePlus2 },
  { href: "/estimates", label: "Estimates", icon: ClipboardList },
  { href: "/invoices", label: "Invoices", icon: ReceiptText },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/old-gold", label: "Old gold", icon: Coins },
  { href: "/advances", label: "Advances & bookings", icon: Wallet },
  { href: "/returns", label: "Returns & credit notes", icon: Undo2 },
  {
    label: "Coming soon",
    icon: Sparkles,
    children: [
      { href: "/orders", label: "Custom orders", icon: Gem, soon: true },
      { href: "/repairs", label: "Repairs", icon: Wrench, soon: true },
      { href: "/schemes", label: "Scheme collections", icon: PiggyBank, soon: true },
    ],
  },
];

const system: NavItem[] = [{ href: "/day", label: "Day close", icon: CalendarCheck }];

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
