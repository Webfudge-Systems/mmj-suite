"use client";

import { Minus, Plus } from "lucide-react";

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="inline-flex items-center border border-line">
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className="px-3 py-2.5 text-ash transition-colors hover:text-ink disabled:opacity-35"
      >
        <Minus className="size-3.5" />
      </button>
      <span className="min-w-8 text-center text-[14px] tabular-nums">{value}</span>
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className="px-3 py-2.5 text-ash transition-colors hover:text-ink disabled:opacity-35"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}
