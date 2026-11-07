import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ItemStatus, Pagination } from "@webfudge/utils/api";
import { ITEM_STATUS_LABELS } from "@webfudge/utils/api";
import { cn } from "../lib/cn";
import { Button } from "./Button";
import { Badge, type Tone } from "./Feedback";

/** A horizontally scrolling table that never widens the page. */
export function Table({ className, minWidth = 640, children }: { className?: string; minWidth?: number; children: ReactNode }) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full text-left text-sm text-gray-700" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

export function Th({ className, align, ...props }: ThHTMLAttributes<HTMLTableCellElement> & { align?: "right" }) {
  return (
    <th
      className={cn(
        "border-b border-gray-200 bg-gray-50 px-5 py-3.5 text-[11.5px] font-bold tracking-wide whitespace-nowrap text-gray-700 uppercase",
        align === "right" && "text-right",
        className,
      )}
      {...props}
    />
  );
}

export function Td({ className, align, ...props }: TdHTMLAttributes<HTMLTableCellElement> & { align?: "right" }) {
  return <td className={cn("px-5 py-3.5 align-top", align === "right" && "text-right tabular-nums", className)} {...props} />;
}

export function Tr({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("border-t border-gray-100 transition-colors duration-150 first:border-t-0 hover:bg-navy-soft/40", className)} {...props} />;
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
  return (
    <Badge tone={statusTones[status]} dot>
      {ITEM_STATUS_LABELS[status]}
    </Badge>
  );
}

export function Pager({ pagination, onPage }: { pagination: Pagination | undefined; onPage: (page: number) => void }) {
  if (!pagination) return null;
  if (pagination.pageCount <= 1) {
    return (
      <p className="border-t border-gray-100 px-5 py-3 text-[12.5px] text-ash">
        {pagination.total} {pagination.total === 1 ? "result" : "results"}
      </p>
    );
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-5 py-3 text-[13px]">
      <span className="text-ash">
        Page <span className="font-semibold text-ink">{pagination.page}</span> of {pagination.pageCount} · {pagination.total} results
      </span>
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" disabled={pagination.page <= 1} onClick={() => onPage(pagination.page - 1)}>
          <ChevronLeft className="size-4" aria-hidden />
          Previous
        </Button>
        <Button size="sm" variant="secondary" disabled={pagination.page >= pagination.pageCount} onClick={() => onPage(pagination.page + 1)}>
          Next
          <ChevronRight className="size-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}
