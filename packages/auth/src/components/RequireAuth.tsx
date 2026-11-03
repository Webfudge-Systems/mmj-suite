"use client";

import { useEffect, type ReactNode } from "react";
import type { StaffRole } from "@webfudge/config";
import { Spinner } from "@webfudge/ui/components";
import { useAuth } from "./AuthProvider";

type RequireAuthProps = {
  children: ReactNode;
  /** Called once when nobody is signed in, usually to send them to the login page. */
  onSignedOut: () => void;
  /** Limit to these roles. Others see `forbidden`. */
  roles?: StaffRole[];
  forbidden?: ReactNode;
};

export function RequireAuth({ children, onSignedOut, roles, forbidden }: RequireAuthProps) {
  const { status, hasRole } = useAuth();

  useEffect(() => {
    if (status === "signed_out") onSignedOut();
  }, [status, onSignedOut]);

  if (status !== "signed_in") {
    return (
      <div className="grid min-h-dvh place-items-center text-navy">
        <Spinner label="Checking your session" />
      </div>
    );
  }

  if (roles && !hasRole(...roles)) {
    return <>{forbidden ?? <p className="p-8 text-sm text-ash">Your role does not have access to this page.</p>}</>;
  }

  return <>{children}</>;
}
