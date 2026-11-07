"use client";

import { useCallback, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeftRight,
  BarChart3,
  Boxes,
  Camera,
  ClipboardCheck,
  Gem,
  Hammer,
  IndianRupee,
  LayoutDashboard,
  MapPin,
  PackagePlus,
  Send,
  Settings,
  Sparkles,
  Tags,
  Truck,
} from "lucide-react";
import { RequireAuth, StaffHeaderExtras, useAuth } from "@webfudge/auth/components";
import { RATE_EDITOR_ROLES } from "@webfudge/config";
import { AppShell, RatesPanel, type NavItem } from "@webfudge/ui";
import { BranchProvider } from "@/lib/branch";
import { API_URL } from "@/lib/env";

const nav: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  {
    label: "Stock",
    icon: Boxes,
    children: [
      { href: "/stock", label: "All stock", icon: Boxes },
      { href: "/tags", label: "Tags & labels", icon: Tags },
      { href: "/locations", label: "Trays & locations", icon: MapPin },
      { href: "/audit", label: "Stock audit", icon: ClipboardCheck },
    ],
  },
  { href: "/receive", label: "Receive stock", icon: PackagePlus },
  { href: "/transfers", label: "Transfers", icon: ArrowLeftRight },
  { href: "/catalogue", label: "Catalogue", icon: Gem },
  { href: "/suppliers", label: "Suppliers & karigars", icon: Truck },
  { href: "/rates", label: "Rates & pricing", icon: IndianRupee },
  {
    label: "Coming soon",
    icon: Sparkles,
    children: [
      { href: "/karigar", label: "Karigar job work", icon: Hammer, soon: true },
      { href: "/approvals", label: "Approvals out", icon: Send, soon: true },
      { href: "/media", label: "Media studio", icon: Camera, soon: true },
      { href: "/reports", label: "Reports", icon: BarChart3, soon: true },
    ],
  },
];

const system: NavItem[] = [{ href: "/settings", label: "Settings", icon: Settings }];

function Rates() {
  const { hasRole } = useAuth();
  return (
    <RatesPanel
      apiUrl={API_URL}
      action={
        hasRole(...RATE_EDITOR_ROLES) ? (
          <Link href="/rates" className="text-[10.5px] font-semibold text-navy hover:underline">
            Update
          </Link>
        ) : undefined
      }
    />
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
          system={system}
          activeHref={pathname}
          LinkComponent={Link}
          widget={<Rates />}
          headerExtras={<StaffHeaderExtras />}
        >
          {children}
        </AppShell>
      </BranchProvider>
    </RequireAuth>
  );
}
