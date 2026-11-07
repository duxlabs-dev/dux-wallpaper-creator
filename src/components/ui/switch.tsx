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
        "group/switch relative inline-flex h-8 w-[52px] shrink-0 cursor-pointer rounded-full border-2 p-0 focus-ring",
        "after:absolute after:inset-x-0 after:-inset-y-2",
        checked ? "border-transparent bg-primary" : "border-outline bg-surface-container-highest",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute top-1/2 size-10 -translate-1/2 rounded-full transition-[left] duration-(--duration-fast-spatial) ease-(--ease-fast-spatial) group-hover/switch:state-layer-8 group-focus-visible/switch:state-layer-10 group-active/switch:state-layer-10 group-active/switch:transition-none",
          checked ? "left-[34px] text-primary" : "left-[14px] text-on-surface",
        )}
      />
      <span
        className={cn(
          "pointer-events-none absolute top-1/2 inline-flex -translate-y-1/2 items-center justify-center rounded-full transition-[left,width,height] duration-(--duration-fast-spatial) ease-(--ease-fast-spatial) group-active/switch:size-7 group-active/switch:transition-none",
          checked
            ? "left-[22px] size-6 bg-on-primary text-on-primary-container group-hover/switch:bg-primary-container group-focus-visible/switch:bg-primary-container group-active/switch:left-[20px] group-active/switch:bg-primary-container"
            : "left-[6px] size-4 bg-outline group-hover/switch:bg-on-surface-variant group-focus-visible/switch:bg-on-surface-variant group-active/switch:left-0 group-active/switch:bg-on-surface-variant",
        )}
      >
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
