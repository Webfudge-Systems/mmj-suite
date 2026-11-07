"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { ScanLine } from "lucide-react";
import { cn } from "../lib/cn";
import { Button } from "./Button";

type ScanInputProps = {
  id: string;
  /** Called with the code when the scanner (or a person) presses Enter. */
  onScan: (code: string) => void | Promise<void>;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
};

/**
 * Text box for USB and Bluetooth barcode scanners, which type the code and
 * press Enter. Clears itself and keeps focus so the next scan goes straight in.
 */
export function ScanInput({ id, onScan, placeholder = "Scan or type a tag, then press Enter", disabled, autoFocus = true, className }: ScanInputProps) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function submit() {
    const code = value.trim();
    if (!code || busy) return;
    setBusy(true);
    setValue("");
    try {
      await onScan(code);
    } finally {
      setBusy(false);
      input.current?.focus();
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      submit();
    }
  }

  return (
    <div className={cn("flex gap-2", className)}>
      <div className="relative min-w-0 flex-1">
        <ScanLine className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-navy/60" aria-hidden />
        <input
        ref={input}
        id={id}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        autoComplete="off"
        spellCheck={false}
        className="h-12 w-full rounded-full border border-navy/40 bg-surface pr-4 pl-12 font-mono text-[15px] tracking-wide text-ink uppercase shadow-sm transition-all placeholder:font-sans placeholder:tracking-normal placeholder:normal-case placeholder:text-gray-400 focus:border-navy focus:ring-2 focus:ring-navy/25 focus:outline-none"
        />
      </div>
      <Button size="lg" className="rounded-full" onClick={submit} loading={busy} disabled={disabled || !value.trim()}>
        Add
      </Button>
    </div>
  );
}
