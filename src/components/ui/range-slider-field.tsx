import type { ReactNode } from "react";
import { FieldLabel } from "@/components/ui/field-label";
import { RangeSlider, type Range } from "@/components/ui/range-slider";
import { cn } from "@/lib/utils";

export interface RangeFormat {
  format?: (value: number) => string;
  /** Written once after the range ("3–12 shapes"), or after a single value. */
  unit?: string | ((value: number) => string);
}

const unitFor = (unit: RangeFormat["unit"], value: number) =>
  typeof unit === "function" ? unit(value) : (unit ?? "");

export const formatValue = (value: number, { format = String, unit }: RangeFormat = {}) =>
  `${format(value)}${unitFor(unit, value)}`;

export const formatRange = ([low, high]: Range, { format = String, unit }: RangeFormat = {}) =>
  `${low === high ? format(low) : `${format(low)}–${format(high)}`}${unitFor(unit, high)}`;

interface RangeSliderFieldProps extends RangeFormat {
  id: string;
  icon?: ReactNode;
  label: string;
  showHeader?: boolean;
  value: Range;
  min: number;
  max: number;
  step: number;
  tooltip?: string;
  className?: string;
  inactiveTrackColor?: string;
  onChange: (value: Range) => void;
}

export function RangeSliderField({
  id,
  icon,
  label,
  showHeader = true,
  value,
  min,
  max,
  step,
  format,
  unit,
  tooltip,
  className,
  inactiveTrackColor,
  onChange,
}: RangeSliderFieldProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {showHeader && (
        <FieldLabel
          icon={icon}
          htmlFor={`${id}-min`}
          value={formatRange(value, { format, unit })}
          tooltip={tooltip}
        >
          {label}
        </FieldLabel>
      )}
      <RangeSlider
        id={id}
        value={value}
        min={min}
        max={max}
        step={step}
        labels={[`Minimum ${label.toLowerCase()}`, `Maximum ${label.toLowerCase()}`]}
        valueText={(current) => formatValue(current, { format, unit })}
        inactiveTrackColor={inactiveTrackColor}
        onChange={onChange}
      />
    </div>
  );
}
