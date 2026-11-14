"use client";

import { useEffect, useState } from "react";

/** The request number the reservation form saved, shown on the confirmation page. */
export function ReservationNumber() {
  const [number, setNumber] = useState<string | null>(null);
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = sessionStorage.getItem("mmj.reservation");
    } catch {
      saved = null;
    }
    const timer = window.setTimeout(() => setNumber(saved), 0);
    return () => window.clearTimeout(timer);
  }, []);
  if (!number) return null;
  return (
    <p className="mt-4 text-[13px] text-ash">
      Your request number is <span className="font-mono text-ink">{number}</span>.
    </p>
  );
}
