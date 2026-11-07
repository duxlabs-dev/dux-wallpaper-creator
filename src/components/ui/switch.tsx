import { Check } from "material-symbols/rounded";
import { DelayedTooltip } from "@/components/ui/delayed-tooltip";
import { useRipple } from "@/hooks/ui/use-ripple";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface SwitchProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  tooltip?: string;
  icon?: ReactNode;
  value?: ReactNode;
  className?: string;
}

export function Switch({
  id,
  label,
  checked,
  onChange,
  tooltip,
  icon,
  value,
  className,
}: SwitchProps) {
  const ripple = useRipple<HTMLDivElement>();

  const switchControl = (
    <button
      type="button"
      id={id}
      role="switch"
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
    <div
      ref={ripple}
      data-slot="row"
      // The label and switch handle their own clicks.
      onClick={(event) => {
        if (event.target === event.currentTarget) onChange(!checked);
      }}
      className={cn(
        "flex cursor-pointer items-start justify-between gap-3 py-2",
        "relative overflow-hidden rounded-[inherit]",
        className,
      )}
    >
      <label
        htmlFor={id}
        className="flex min-w-0 flex-1 cursor-pointer items-start gap-2 text-sm font-semibold select-none"
      >
        {icon && (
          <span className="flex h-10 w-6 shrink-0 items-center justify-center text-on-surface-variant [&>svg]:size-5">
            {icon}
          </span>
        )}
        {/* Top-aligned, so the label stays put when supporting text appears. */}
        <span className="flex min-w-0 flex-col pt-2.5">
          {tooltip ? (
            <DelayedTooltip content={tooltip}>
              <span>{label}</span>
            </DelayedTooltip>
          ) : (
            <span>{label}</span>
          )}
          {value !== undefined && (
            <span
              aria-hidden="true"
              data-slot="supporting"
              className="mt-0.5 text-xs font-normal text-on-surface-variant tabular-nums"
            >
              {value}
            </span>
          )}
        </span>
      </label>
      <div className="flex h-10 shrink-0 items-center">{switchControl}</div>
    </div>
  );
}
