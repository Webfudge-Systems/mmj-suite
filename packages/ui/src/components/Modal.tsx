"use client";

import { useEffect, useId, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "../lib/cn";

/**
 * A centred dialog over a dimmed page. Escape or the backdrop closes it unless
 * `dismissable` is false (for example while saving).
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  dismissable = true,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  dismissable?: boolean;
}) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && dismissable && onClose();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, dismissable, onClose]);

  if (!open || typeof document === "undefined") return null;
  const widths = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" } as const;

  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto p-4 print:hidden">
      <div className="fixed inset-0 bg-ink/40 backdrop-blur-[2px]" onClick={() => dismissable && onClose()} aria-hidden />
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className={cn("relative my-8 w-full rounded-2xl bg-white shadow-2xl", widths[size])}>
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-4">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-ink">
              {title}
            </h2>
            {description && <p className="mt-0.5 text-[13px] text-ash">{description}</p>}
          </div>
          <button type="button" onClick={onClose} disabled={!dismissable} className="grid size-8 shrink-0 place-items-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-ink disabled:opacity-40" aria-label="Close">
            <X className="size-4" aria-hidden />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-gray-100 px-6 py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
