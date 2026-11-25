"use client";

import { useState, type MouseEvent, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "../lib/cn";

/**
 * A value people often need elsewhere (invoice or tag number): hovering shows a
 * copy button; a click copies it and confirms with a tick. Clicks on the button
 * do not reach a clickable row behind it.
 */
export function CopyText({ value, children, label = "Copy", className }: { value: string; children?: ReactNode; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Older browsers or no permission: fall back to a hidden text box.
      const area = document.createElement("textarea");
      area.value = value;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <span className={cn("group/copy inline-flex items-center gap-1.5", className)}>
      {children ?? value}
      <button
        type="button"
        onClick={copy}
        title={copied ? "Copied" : `${label} ${value}`}
        aria-label={copied ? "Copied" : `${label} ${value}`}
        className={cn(
          "inline-grid size-6 shrink-0 place-items-center rounded-md border transition-all",
          copied
            ? "border-ok-line bg-ok-soft text-ok opacity-100"
            : "border-gray-200 bg-white text-gray-500 opacity-0 shadow-sm group-hover/copy:opacity-100 hover:text-navy focus-visible:opacity-100",
        )}
      >
        {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
      </button>
    </span>
  );
}
