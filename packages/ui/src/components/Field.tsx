import {
  forwardRef,
  type InputHTMLAttributes,
  type LabelHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "../lib/cn";

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-[13px] font-semibold text-ink", className)} {...props} />;
}

export type InputProps = InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean };

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ className, invalid, ...props }, ref) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        "h-10 w-full rounded-[var(--radius-control)] border bg-surface px-3 text-sm text-ink placeholder:text-ash/70",
        "focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15 disabled:bg-sunk",
        invalid ? "border-risk" : "border-line",
        className,
      )}
      {...props}
    />
  );
});

const controlClass = (invalid: boolean | undefined, className?: string) =>
  cn(
    "w-full rounded-[var(--radius-control)] border bg-surface px-3 text-sm text-ink",
    "focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15 disabled:bg-sunk",
    invalid ? "border-risk" : "border-line",
    className,
  );

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean };

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ className, invalid, ...props }, ref) {
  return <select ref={ref} aria-invalid={invalid || undefined} className={controlClass(invalid, cn("h-10", className))} {...props} />;
});

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean };

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ className, invalid, ...props }, ref) {
  return <textarea ref={ref} aria-invalid={invalid || undefined} className={controlClass(invalid, cn("min-h-20 py-2", className))} {...props} />;
});

type FieldProps = {
  label: ReactNode;
  htmlFor: string;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
  className?: string;
};

/** A label, a control, and the hint or error under it. */
export function Field({ label, htmlFor, hint, error, children, className }: FieldProps) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-[12px] text-risk">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[12px] text-ash">{hint}</p>
      ) : null}
    </div>
  );
}
