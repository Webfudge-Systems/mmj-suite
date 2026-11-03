"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoginForm, useAuth } from "@webfudge/auth/components";
import { Card, CardBody, Wordmark } from "@webfudge/ui";

export default function LoginPage() {
  const router = useRouter();
  const { status } = useAuth();

  useEffect(() => {
    if (status === "signed_in") router.replace("/");
  }, [status, router]);

  return (
    <main className="grid min-h-dvh place-items-center bg-navy-deep px-4 py-10">
      <div className="grid w-full max-w-sm gap-6">
        <Wordmark appName="Back Office" />
        <Card>
          <CardBody className="grid gap-5 p-6">
            <div className="grid gap-1">
              <h1 className="text-lg font-semibold text-navy">Sign in</h1>
              <p className="text-[13px] text-ash">Use the account the owner set up for you.</p>
            </div>
            <LoginForm onSignedIn={() => router.replace("/")} />
          </CardBody>
        </Card>
      </div>
    </main>
  );
}
