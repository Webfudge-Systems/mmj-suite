"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "@webfudge/auth/components";
import { API_URL } from "@/lib/env";

export function Providers({ children }: { children: ReactNode }) {
  return <AuthProvider apiUrl={API_URL}>{children}</AuthProvider>;
}
