"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gift, LayoutDashboard, Megaphone, PiggyBank, Sparkles, Users } from "lucide-react";
import { AppShell, Card, CardBody, CardHeader, EmptyState, LiveRateBoard, PageHeader, RatesPanel, type NavItem } from "@webfudge/ui";
import { API_URL } from "@/lib/env";

const nav: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/customers", label: "Customers", icon: Users, soon: true },
  { href: "/loyalty", label: "Loyalty points", icon: Gift, soon: true },
  { href: "/schemes", label: "Gold schemes", icon: PiggyBank, soon: true },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone, soon: true },
];

export default function Home() {
  const pathname = usePathname();
  return (
    <AppShell appName="CRM & Loyalty" nav={nav} activeHref={pathname} LinkComponent={Link} widget={<RatesPanel apiUrl={API_URL} />}>
      <div className="grid gap-6">
        <PageHeader title="CRM & Loyalty" description="Customers, loyalty points, gold schemes and campaigns for both branches." />
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="Today's rates" description="Published from the Back Office. Updates on its own within a minute." />
            <CardBody>
              <LiveRateBoard apiUrl={API_URL} />
            </CardBody>
          </Card>
          <Card>
            <EmptyState
              icon={Sparkles}
              title="Customer screens arrive in phase 5"
              description="Customer profiles, loyalty points, gold scheme collections and campaigns will live here. Customers billed at the POS are already being saved."
            />
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
