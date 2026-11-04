"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "./AuthProvider";
import type { Branch } from "@webfudge/utils/api";

const STORAGE_KEY = "mmj.branch";

type BranchContextValue = { branch: Branch | null; branches: Branch[]; setBranchId: (id: number) => void };

const BranchContext = createContext<BranchContextValue | null>(null);

function remembered(): number | null {
  try {
    return Number(window.localStorage.getItem(STORAGE_KEY)) || null;
  } catch {
    return null;
  }
}

/** The branch the Back Office is working in. Remembered per device. */
export function BranchProvider({ children }: { children: ReactNode }) {
  const { staff } = useAuth();
  const branches = useMemo(() => staff?.branches ?? [], [staff]);
  const [chosen, setChosen] = useState<number | null>(() => (typeof window === "undefined" ? null : remembered()));

  const value = useMemo<BranchContextValue>(() => {
    const branch = branches.find((entry) => entry.id === chosen) ?? branches[0] ?? null;
    return {
      branch,
      branches,
      setBranchId(id) {
        setChosen(id);
        try {
          window.localStorage.setItem(STORAGE_KEY, String(id));
        } catch {
          // Private mode: the choice lasts until reload.
        }
      },
    };
  }, [branches, chosen]);

  return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>;
}

export function useBranch() {
  const value = useContext(BranchContext);
  if (!value) throw new Error("useBranch must be used inside <BranchProvider>");
  return value;
}
