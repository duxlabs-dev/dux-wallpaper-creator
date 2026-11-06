import { Check } from "material-symbols/rounded";
import { DelayedTooltip } from "@/components/ui/delayed-tooltip";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface SwitchProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  tooltip?: string;
  icon?: ReactNode;
  className?: string;
}

export function Switch({ id, label, checked, onChange, tooltip, icon, className }: SwitchProps) {
  const switchControl = (
    <button
      type="button"
      role="switch"
      aria-labelledby={`${id}-label`}
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "group/switch ease-effect relative inline-flex h-8 w-[52px] shrink-0 items-center rounded-full border-2 p-0 focus-ring transition-[background-color,border-color] duration-300",
        checked ? "border-primary bg-primary" : "border-outline-variant bg-surface-container-high",
      )}
    >
      <span
        className={cn(
          "ease-spring absolute top-1/2 left-[6px] inline-flex shrink-0 -translate-y-1/2 items-center justify-center rounded-full transition-[width,height,background-color,translate] duration-300 group-active/switch:size-7",
          checked
            ? "size-6 translate-x-4 bg-on-primary text-primary"
            : "size-4 bg-on-surface-variant text-transparent",
        )}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-1/2 size-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-on-surface/10 opacity-0 transition-opacity group-hover/switch:opacity-100"
        />
        {checked && <Check aria-hidden="true" className="size-4" />}
      </span>
    </button>
  );

  return (
    <div className={cn("flex min-h-10 items-center justify-between gap-3 px-0 py-1.5", className)}>
      <span
        id={`${id}-label`}
        className="flex min-w-0 items-center gap-2 text-sm font-semibold text-on-surface"
      >
        <span className="flex size-6 shrink-0 items-center justify-center text-on-surface-variant [&>svg]:size-5">
          {icon ?? <Check />}
        </span>
        {tooltip ? (
          <DelayedTooltip content={tooltip}>
            <span className="truncate">{label}</span>
          </DelayedTooltip>
        ) : (
          <span className="truncate">{label}</span>
        )}
      </span>
      {switchControl}
    </div>
  );
}
