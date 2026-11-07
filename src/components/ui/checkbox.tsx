import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

interface CheckboxProps {
  label: string;
  checked: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}

const CHECK_PATH = "M4.5 9 L7.2 11.7 L13.5 5.4";
const BAR_PATH = "M4.5 9 L7.2 9 L13.5 9";

export function Checkbox({
  label,
  checked,
  indeterminate = false,
  disabled = false,
  onChange,
}: CheckboxProps) {
  const selected = checked || indeterminate;
  const path = indeterminate ? BAR_PATH : CHECK_PATH;
  return (
    <label
      className={cn(
        "group/checkbox relative flex size-12 shrink-0 items-center justify-center",
        disabled ? "cursor-not-allowed" : "cursor-pointer",
      )}
    >
      <input
        type="checkbox"
        aria-label={label}
        ref={(input) => {
          if (input) input.indeterminate = indeterminate;
        }}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.currentTarget.checked)}
        className="peer absolute inset-0 m-0 cursor-[inherit] opacity-0"
      />
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute size-10 rounded-full",
          !disabled &&
            "group-hover/checkbox:state-layer-8 group-active/checkbox:state-layer-10 peer-focus-visible:state-layer-10",
          selected
            ? "text-primary group-active/checkbox:text-on-surface"
            : "text-on-surface group-active/checkbox:text-primary",
        )}
      />
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none relative size-[18px] rounded-[2px] transition-[background-color,border-color] duration-(--duration-default-effects) ease-(--ease-default-effects) peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-secondary",
          selected
            ? disabled
              ? "bg-on-surface/38 text-surface"
              : "bg-primary text-on-primary"
            : cn(
                "border-2",
                disabled
                  ? "border-on-surface/38"
                  : "border-on-surface-variant group-hover/checkbox:border-on-surface group-active/checkbox:border-on-surface peer-focus-visible:border-on-surface",
              ),
        )}
      >
        <svg viewBox="0 0 18 18" className="absolute inset-0 size-[18px] overflow-visible">
          <path
            d={path}
            pathLength={1}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="square"
            strokeDasharray={1}
            className={selected ? "opacity-100" : "opacity-0"}
            style={
              {
                d: `path("${path}")`,
                strokeDashoffset: selected ? 0 : 1,
                transition: selected
                  ? "d var(--duration-default-spatial) var(--ease-default-spatial), stroke-dashoffset var(--duration-default-spatial) var(--ease-default-spatial)"
                  : "none",
              } as CSSProperties
            }
          />
        </svg>
      </span>
    </label>
  );
}
