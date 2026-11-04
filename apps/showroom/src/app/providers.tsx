"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "@webfudge/auth/components";
import { Gate } from "@/components/gate";
import { Header } from "@/components/header";
import { API_URL } from "@/lib/device";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider apiUrl={API_URL}>
      <Gate>
        <Header />
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">{children}</main>
      </Gate>
    </AuthProvider>
  );
}
