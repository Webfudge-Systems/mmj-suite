"use client";

import { useState } from "react";
import { ShieldCheck, TriangleAlert } from "lucide-react";
import { useAuth } from "@webfudge/auth/components";
import { CASH_PAYOUT_LIMIT } from "@webfudge/config";
import { Input } from "@webfudge/ui";
import { ApiError } from "@webfudge/utils/api";
import { formatINR } from "@webfudge/utils/formatters";

type Limit = { limit: number; cash: number };

/** The server's "too much cash" refusal, or null for any other error. */
export function cashLimitOf(cause: unknown): Limit | null {
  if (!(cause instanceof ApiError)) return null;
  const details = cause.details as { code?: string; limit?: number; cash?: number } | undefined;
  return details?.code === "CASH_PAYOUT_LIMIT" ? { limit: Number(details.limit ?? CASH_PAYOUT_LIMIT), cash: Number(details.cash ?? 0) } : null;
}

/**
 * Paying more than the cash limit on purpose. Pass the cash in the payment
 * lines: as soon as it goes over the limit the warning and the manager's
 * approval box appear, before anything is sent. A refusal from the server (if
 * the shop set a lower limit) shows the same warning through `catchLimit`.
 */
export function useCashOverride(cash = 0) {
  const [serverLimit, setServerLimit] = useState<Limit | null>(null);
  const [approved, setApproved] = useState(false);
  const [reason, setReason] = useState("");
  const limitValue = serverLimit?.limit ?? CASH_PAYOUT_LIMIT;
  const limit: Limit | null = cash > limitValue ? { limit: limitValue, cash } : serverLimit && cash > 0 ? { ...serverLimit, cash } : null;
  const ready = approved && reason.trim().length >= 5;
  return {
    limit,
    approved,
    reason,
    setApproved,
    setReason,
    /** What to send to the server as `cashOverride`, once approved. */
    value: limit && ready ? { reason: reason.trim() } : undefined,
    /** True when cash is over the limit and not yet approved with a reason. */
    blocking: Boolean(limit) && !ready,
    catchLimit(cause: unknown) {
      const hit = cashLimitOf(cause);
      if (hit) setServerLimit(hit);
      return Boolean(hit);
    },
    /** Forgets a refusal from the server. Approval stays while cash is still over the limit. */
    reset() {
      setServerLimit(null);
    },
  };
}

/** The warning shown when cash goes over the limit, with the owner's or manager's approval right there. */
export function CashOverrideNotice({ state }: { state: ReturnType<typeof useCashOverride> }) {
  const { hasRole } = useAuth();
  const manager = hasRole("owner", "branch_manager");
  if (!state.limit) return null;
  const { limit, cash } = state.limit;
  const done = Boolean(state.value);

  return (
    <div className={`grid gap-3 rounded-xl border p-4 text-sm ${done ? "border-ok-line bg-ok-soft" : "border-warn-line bg-warn-soft"}`}>
      <p className="flex gap-2.5 font-semibold text-ink">
        {done ? <ShieldCheck className="mt-0.5 size-4 shrink-0 text-ok" aria-hidden /> : <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warn" aria-hidden />}
        <span>
          {done ? `Approved: ${formatINR(cash)} in cash.` : `${formatINR(cash)} in cash is over the ${formatINR(limit)} limit for one person.`}
          {!done && (
            <span className="mt-0.5 block font-normal text-ash">
              {manager ? "Approve it below to go ahead, or pay the part above the limit by UPI or bank transfer." : "Pay the part above the limit by UPI or bank transfer, or ask the owner or a branch manager to approve it."}
            </span>
          )}
        </span>
      </p>
      {manager ? (
        <>
          <label className="flex cursor-pointer items-start gap-2.5 rounded-lg bg-white/70 px-3 py-2.5">
            <input type="checkbox" checked={state.approved} onChange={(event) => state.setApproved(event.target.checked)} className="mt-0.5 size-4 accent-navy" />
            <span className="font-semibold">I approve paying the full {formatINR(cash)} in cash</span>
          </label>
          {state.approved && (
            <Input
              aria-label="Why it is paid in cash"
              value={state.reason}
              onChange={(event) => state.setReason(event.target.value)}
              placeholder="Why, for example: customer has no bank account"
              autoFocus
            />
          )}
          <p className="text-[12px] text-ash">Your name and the reason are saved with this payment. Large cash payments can be questioned at tax time.</p>
        </>
      ) : null}
    </div>
  );
}
