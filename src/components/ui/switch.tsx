import { Check } from "material-symbols/rounded";
import { cn } from "@/lib/utils";

interface SwitchProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function Switch({ id, label, checked, onChange }: SwitchProps) {
  return (
    <div className="flex min-h-9 items-center justify-between gap-3">
      <span id={`${id}-label`} className="text-sm">
        {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-labelledby={`${id}-label`}
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "group relative inline-flex h-8 w-[52px] shrink-0 items-center rounded-full border-2 p-0 focus-ring transition-[background-color,border-color] duration-300 ease-effect",
          checked
            ? "border-primary bg-primary"
            : "border-outline-variant bg-surface-container-high",
        )}
      >
        <span
          className={cn(
            "absolute top-1/2 left-[6px] inline-flex shrink-0 -translate-y-1/2 items-center justify-center rounded-full transition-[width,height,background-color,translate] duration-300 ease-spring group-active:size-7",
            checked
              ? "size-6 translate-x-3 bg-on-primary text-primary"
              : "size-4 bg-on-surface-variant text-transparent",
          )}
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-1/2 size-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-on-surface/10 opacity-0 transition-opacity group-hover:opacity-100"
          />
          {checked && <Check aria-hidden="true" className="size-4" />}
        </span>
      </button>
    </div>
  );
}
