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
  return <label className={cn("text-sm font-medium text-gray-700", className)} {...props} />;
}

const controlClass = (invalid: boolean | undefined, className?: string) =>
  cn(
    "w-full rounded-lg border bg-surface px-3 text-sm text-ink shadow-sm placeholder:text-gray-400 transition-colors duration-200",
    "focus:border-transparent focus:outline-none focus:ring-2 focus:ring-navy disabled:bg-sunk disabled:text-ash",
    invalid ? "border-risk-line text-risk focus:ring-risk" : "border-gray-300",
    className,
  );

export type InputProps = InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean };

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ className, invalid, ...props }, ref) {
  return <input ref={ref} aria-invalid={invalid || undefined} className={controlClass(invalid, cn("h-11", className))} {...props} />;
});

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean };

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ className, invalid, ...props }, ref) {
  return <select ref={ref} aria-invalid={invalid || undefined} className={controlClass(invalid, cn("h-11", className))} {...props} />;
});

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean };

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ className, invalid, ...props }, ref) {
  return <textarea ref={ref} aria-invalid={invalid || undefined} className={controlClass(invalid, cn("min-h-24 py-2.5", className))} {...props} />;
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
    <div className={cn("grid content-start gap-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-[12.5px] text-risk">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[12.5px] text-ash">{hint}</p>
      ) : null}
    </div>
  );
}
