"use client";

import { useCurrentRates } from "@webfudge/hooks";
import type { RateLine } from "@webfudge/utils/api";
import { RateBoard } from "./RateBoard";

type LiveRateBoardProps = {
  apiUrl: string;
  variant?: "strip" | "table";
  only?: RateLine["purity"][];
  className?: string;
};

/** RateBoard that loads today's card itself and keeps it current. */
export function LiveRateBoard({ apiUrl, ...props }: LiveRateBoardProps) {
  const { card, loading, error } = useCurrentRates(apiUrl);
  return <RateBoard card={card} loading={loading} error={error} {...props} />;
}
