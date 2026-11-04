import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";
import type { ItemStatus, Pagination } from "@webfudge/utils/api";
import { ITEM_STATUS_LABELS } from "@webfudge/utils/api";
import { cn } from "../lib/cn";
import { Button } from "./Button";
import { Badge, type Tone } from "./Feedback";

/** A horizontally scrolling table that never widens the page. */
export function Table({ className, minWidth = 640, children }: { className?: string; minWidth?: number; children: ReactNode }) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full text-left text-[13.5px]" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

export function Th({ className, align, ...props }: ThHTMLAttributes<HTMLTableCellElement> & { align?: "right" }) {
  return (
    <th
      className={cn("px-4 py-2.5 text-[11px] font-semibold tracking-wide whitespace-nowrap text-ash uppercase", align === "right" && "text-right", className)}
      {...props}
    />
  );
}

export function Td({ className, align, ...props }: TdHTMLAttributes<HTMLTableCellElement> & { align?: "right" }) {
  return <td className={cn("px-4 py-2.5 align-top", align === "right" && "text-right tabular-nums", className)} {...props} />;
}

export function Tr({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("border-t border-line", className)} {...props} />;
}

const statusTones: Record<ItemStatus, Tone> = {
  in_stock: "ok",
  with_staff: "gold",
  reserved: "navy",
  sold: "neutral",
  on_approval: "warn",
  at_karigar: "warn",
  in_transit: "navy",
  melted: "neutral",
};

export function StatusBadge({ status }: { status: ItemStatus }) {
  return <Badge tone={statusTones[status]}>{ITEM_STATUS_LABELS[status]}</Badge>;
}

export function Pager({ pagination, onPage }: { pagination: Pagination | undefined; onPage: (page: number) => void }) {
  if (!pagination || pagination.pageCount <= 1) {
    return pagination ? <p className="px-4 py-3 text-[12px] text-ash">{pagination.total} total</p> : null;
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-[13px]">
      <span className="text-ash">
        Page {pagination.page} of {pagination.pageCount} · {pagination.total} total
      </span>
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" disabled={pagination.page <= 1} onClick={() => onPage(pagination.page - 1)}>
          Previous
        </Button>
        <Button size="sm" variant="secondary" disabled={pagination.page >= pagination.pageCount} onClick={() => onPage(pagination.page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}
