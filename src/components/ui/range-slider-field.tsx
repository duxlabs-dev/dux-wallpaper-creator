import type { ReactNode } from "react";
import { FieldLabel } from "@/components/ui/field-label";
import { RangeSlider, type Range } from "@/components/ui/range-slider";
import { cn } from "@/lib/utils";

interface RangeSliderFieldProps {
  id: string;
  icon: ReactNode;
  label: string;
  value: Range;
  min: number;
  max: number;
  step: number;
  format?: (value: number) => string;
  tooltip?: string;
  className?: string;
  onChange: (value: Range) => void;
}

export function RangeSliderField({
  id,
  icon,
  label,
  value,
  min,
  max,
  step,
  format = String,
  tooltip,
  className,
  onChange,
}: RangeSliderFieldProps) {
  const [low, high] = value;
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <FieldLabel
        icon={icon}
        htmlFor={`${id}-min`}
        value={low === high ? format(low) : `${format(low)}–${format(high)}`}
        tooltip={tooltip}
      >
        {label}
      </FieldLabel>
      <RangeSlider
        id={id}
        value={value}
        min={min}
        max={max}
        step={step}
        labels={[`Minimum ${label.toLowerCase()}`, `Maximum ${label.toLowerCase()}`]}
        valueText={format}
        onChange={onChange}
      />
    </div>
  );
}
