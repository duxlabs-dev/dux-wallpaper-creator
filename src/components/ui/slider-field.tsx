import type { ReactNode } from "react";
import { FieldLabel } from "@/components/ui/field-label";
import { Slider } from "@/components/ui/slider";

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
  title?: string;
  ticks?: boolean;
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
  title,
  ticks,
  onChange,
  onReset,
}: SliderFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <FieldLabel icon={icon} htmlFor={id} value={display} title={title}>
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
