"use client";

import { useState } from "react";
import { TriangleAlert } from "lucide-react";
import { useAuth } from "@webfudge/auth/components";
import { Input } from "@webfudge/ui";
import { ApiError } from "@webfudge/utils/api";
import { formatINR } from "@webfudge/utils/formatters";

type Limit = { limit: number; cash: number };

/** The server's "too much cash" refusal, or null for any other error. */
export function cashLimitOf(cause: unknown): Limit | null {
  if (!(cause instanceof ApiError)) return null;
  const details = cause.details as { code?: string; limit?: number; cash?: number } | undefined;
  return details?.code === "CASH_PAYOUT_LIMIT" ? { limit: Number(details.limit ?? 10000), cash: Number(details.cash ?? 0) } : null;
}

/**
 * State for paying more than the cash limit on purpose. Call `catchLimit` with
 * an error from the server: when it is the cash limit, the warning appears and
 * the error message is not needed. `reset` when the payments change.
 */
export function useCashOverride() {
  const [limit, setLimit] = useState<Limit | null>(null);
  const [approved, setApproved] = useState(false);
  const [reason, setReason] = useState("");
  return {
    limit,
    approved,
    reason,
    setApproved,
    setReason,
    /** What to send to the server as `cashOverride`, once approved. */
    value: limit && approved && reason.trim().length >= 5 ? { reason: reason.trim() } : undefined,
    /** True when the warning is up but not yet approved with a reason. */
    blocking: Boolean(limit) && !(approved && reason.trim().length >= 5),
    catchLimit(cause: unknown) {
      const hit = cashLimitOf(cause);
      if (hit) setLimit(hit);
      return Boolean(hit);
    },
    reset() {
      setLimit(null);
      setApproved(false);
      setReason("");
    },
  };
}

/** The warning shown when cash goes over the limit, with a manager's way through. */
export function CashOverrideNotice({ state }: { state: ReturnType<typeof useCashOverride> }) {
  const { hasRole } = useAuth();
  const manager = hasRole("owner", "branch_manager");
  if (!state.limit) return null;
  const { limit, cash } = state.limit;

  return (
    <div className="grid gap-3 rounded-xl border border-warn-line bg-warn-soft p-4 text-sm">
      <p className="flex gap-2.5 font-semibold text-ink">
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warn" aria-hidden />
        <span>
          {formatINR(cash)} in cash is over the {formatINR(limit)} limit for one person.
          <span className="mt-0.5 block font-normal text-ash">
            Send the amount above {formatINR(limit)} by UPI or bank transfer if you can. Large cash payments can be questioned at tax time, so keep the reason honest.
          </span>
        </span>
      </p>
      {manager ? (
        <>
          <label className="flex items-start gap-2.5">
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
          <p className="text-[12px] text-ash">Your name and the reason are saved with this payment.</p>
        </>
      ) : (
        <p className="text-[12.5px] text-ash">Only the owner or a branch manager can approve this. Ask them to sign in and approve it, or change the payment.</p>
      )}
    </div>
  );
}
