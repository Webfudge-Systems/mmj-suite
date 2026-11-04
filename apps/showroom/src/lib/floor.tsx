"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Customer, DeviceInfo, FloorPiece } from "@webfudge/utils/api";

/** A piece the customer is considering, with enough of its design to show it in the tray. */
export type TrayPiece = FloorPiece & { design: { id: number; code: string; name: string; image: string | null } };

type FloorContextValue = {
  device: DeviceInfo;
  branchId: number;
  customer: Customer | null;
  setCustomer: (customer: Customer | null) => void;
  tray: TrayPiece[];
  addToTray: (piece: TrayPiece) => void;
  removeFromTray: (id: number) => void;
  clearSession: () => void;
};

const FloorContext = createContext<FloorContextValue | null>(null);

/** Survives a reload of the tablet, so a customer's tray is never lost mid-visit. */
const STORAGE_KEY = "mmj.showroom.session";

type Saved = { customer: Customer | null; tray: TrayPiece[] };

function load(): Saved {
  try {
    const raw = typeof window === "undefined" ? null : window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Saved) : { customer: null, tray: [] };
  } catch {
    return { customer: null, tray: [] };
  }
}

/** What one salesperson is doing with one customer on this tablet. Cleared when they switch. */
export function FloorProvider({ device, children }: { device: DeviceInfo; children: ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(() => load().customer);
  const [tray, setTray] = useState<TrayPiece[]>(() => load().tray);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ customer, tray }));
    } catch {
      // Storage blocked: the tray lasts until reload.
    }
  }, [customer, tray]);

  const addToTray = useCallback((piece: TrayPiece) => setTray((current) => (current.some((entry) => entry.id === piece.id) ? current : [...current, piece])), []);
  const removeFromTray = useCallback((id: number) => setTray((current) => current.filter((entry) => entry.id !== id)), []);
  const clearSession = useCallback(() => {
    setCustomer(null);
    setTray([]);
  }, []);

  const value = useMemo(
    () => ({ device, branchId: device.branch.id, customer, setCustomer, tray, addToTray, removeFromTray, clearSession }),
    [device, customer, tray, addToTray, removeFromTray, clearSession],
  );
  return <FloorContext.Provider value={value}>{children}</FloorContext.Provider>;
}

export function useFloor() {
  const value = useContext(FloorContext);
  if (!value) throw new Error("useFloor must be used inside <FloorProvider>");
  return value;
}
