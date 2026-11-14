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
      appName="CRM & Loyalty"
      tagline="Every customer, every visit, every rupee saved with you."
      detail="Follow up website and walk-in enquiries, run gold savings schemes, reward loyal customers with points, and never miss a birthday or an instalment."
      features={[
        { value: "Enquiries", label: "followed to a sale" },
        { value: "Gold schemes", label: "instalments tracked" },
        { value: "Points", label: "on every bill" },
      ]}
      intro="Use the account the owner set up for you."
      footer="No account yet? Ask the owner to add you."
    >
      <LoginForm onSignedIn={() => router.replace("/")} />
    </LoginLayout>
  );
}
