import type { ReactNode } from "react";
import { FieldLabel } from "@/components/ui/field-label";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface SliderFieldProps {
  id: string;
  icon: ReactNode;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display?: ReactNode;
  description?: ReactNode;
  tooltip?: string;
  title?: string;
  ticks?: boolean;
  className?: string;
  onChange: (value: number) => void;
  onReset?: () => void;
}

export function SliderField({
  id,
  icon,
  label,
  value,
  min,
  max,
  step,
  display,
  description,
  tooltip,
  title,
  ticks,
  className,
  onChange,
  onReset,
}: SliderFieldProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <FieldLabel icon={icon} htmlFor={id} value={display} title={title} tooltip={tooltip ?? title}>
        {label}
      </FieldLabel>
      <Slider
        id={id}
        label={label}
        value={value}
        min={min}
        max={max}
        step={step}
        ticks={ticks}
        onChange={onChange}
        onReset={onReset}
      />
      {description && <span className="pl-7 text-xs text-on-surface-variant">{description}</span>}
    </div>
  );
}
