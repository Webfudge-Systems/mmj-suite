"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoginForm, useAuth } from "@webfudge/auth/components";
import { LoginLayout } from "@webfudge/ui";

export default function LoginPage() {
  const router = useRouter();
  const { status } = useAuth();

  useEffect(() => {
    if (status === "signed_in") router.replace("/");
  }, [status, router]);

  return (
    <LoginLayout
      appName="POS & Billing"
      tagline="Bills, old gold and advances at the counter."
      detail="Scan a tag, add old gold, take payment in any mix and print a GST tax invoice, all priced from today's published rate."
      features={[
        { value: "GST invoices", label: "numbered per year" },
        { value: "Old gold", label: "valued on the spot" },
        { value: "Day close", label: "cash tallied" },
      ]}
      intro="Use the account the owner set up for you."
      footer="No account yet? Ask the owner to add you."
    >
      <LoginForm onSignedIn={() => router.replace("/")} />
    </LoginLayout>
  );
}
