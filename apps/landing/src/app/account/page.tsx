import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { AccountDashboard } from "@/components/account/AccountDashboard";

export const metadata: Metadata = {
  title: "Your account",
  robots: { index: false },
};

export default function AccountPage() {
  return (
    <>
      <PageHeader
        title="Your account"
        lead="Orders, your savings scheme balance and the addresses we deliver to."
        trail={[{ label: "Home", href: "/" }, { label: "Account" }]}
      />
      <AccountDashboard />
    </>
  );
}
