import { cn } from "@/lib/utils";

const control =
  "w-full border border-line bg-transparent px-4 py-3 text-[14px] text-ink outline-none transition-colors placeholder:text-stone focus:border-ink";

export function Field({
  label,
  name,
  type = "text",
  placeholder,
  required,
  defaultValue,
  className,
  autoComplete,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
  className?: string;
  autoComplete?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="eyebrow mb-2 block text-[10px] text-ash">{label}</span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        className={control}
      />
    </label>
  );
}

export function TextArea({
  label,
  name,
  placeholder,
  required,
  rows = 5,
  className,
}: {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  rows?: number;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="eyebrow mb-2 block text-[10px] text-ash">{label}</span>
      <textarea
        name={name}
        rows={rows}
        placeholder={placeholder}
        required={required}
        className={cn(control, "resize-none")}
      />
    </label>
  );
}

export function Select({
  label,
  name,
  options,
  defaultValue,
  className,
}: {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  defaultValue?: string;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="eyebrow mb-2 block text-[10px] text-ash">{label}</span>
      <select name={name} defaultValue={defaultValue} className={cn(control, "appearance-none")}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
