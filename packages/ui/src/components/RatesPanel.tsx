"use client";

import type { ReactNode } from "react";
import { IndianRupee } from "lucide-react";
import type { RateLine } from "@webfudge/utils/api";
import { SidebarPanel } from "../layouts/AppShell";
import { LiveRateBoard } from "./LiveRateBoard";

/** Today's rates in a sidebar panel, kept current on its own. */
export function RatesPanel({ apiUrl, only = ["24KT", "22KT", "18KT", "999"], action }: { apiUrl: string; only?: RateLine["purity"][]; action?: ReactNode }) {
  return (
    <SidebarPanel title="Today's rates" icon={IndianRupee} action={action}>
      <LiveRateBoard apiUrl={apiUrl} variant="list" only={only} />
    </SidebarPanel>
  );
}
