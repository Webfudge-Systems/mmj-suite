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
      appName="Back Office"
      tagline="Stock, tags, trays and rates for every branch."
      detail="Receive new pieces, print tags, keep every tray counted and publish the morning rate that the website, tablets and billing counter all price from."
      features={[
        { value: "Every piece", label: "tagged & traced" },
        { value: "Both branches", label: "one stock book" },
        { value: "Live rates", label: "on every screen" },
      ]}
      intro="Use the account the owner set up for you."
      footer="No account yet? Ask the owner to add you."
    >
      <LoginForm onSignedIn={() => router.replace("/")} />
    </LoginLayout>
  );
}
