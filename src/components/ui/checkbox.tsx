import { Check, Remove } from "material-symbols/rounded";
import { cn } from "@/lib/utils";

interface CheckboxProps {
  label: string;
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
}

export function Checkbox({ label, checked, indeterminate = false, onChange }: CheckboxProps) {
  const selected = checked || indeterminate;
  return (
    <label className="relative flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full hover:state-layer-8">
      <input
        type="checkbox"
        aria-label={label}
        aria-checked={indeterminate ? "mixed" : checked}
        checked={checked}
        onChange={(event) => onChange(event.currentTarget.checked)}
        className="peer absolute size-5 cursor-pointer opacity-0"
      />
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none flex size-[18px] items-center justify-center rounded-[4px] border-2 transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary",
          selected
            ? "border-primary bg-primary text-on-primary"
            : "border-on-surface-variant text-transparent",
        )}
      >
        {indeterminate ? (
          <Remove aria-hidden="true" className="size-3.5" />
        ) : (
          checked && <Check aria-hidden="true" className="size-3.5" />
        )}
      </span>
    </label>
  );
}
