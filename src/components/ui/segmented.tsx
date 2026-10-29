import type { ReactNode } from "react";
import { RadioGroup, RadioItem } from "./radio-group";
import { cn } from "@/lib/utils";

interface Option<T extends string> {
  value: T;
  label: ReactNode | ((selected: boolean, value: T) => ReactNode);
  icon?: ReactNode | ((selected: boolean, value: T) => ReactNode);
}

export interface SegmentedProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: readonly Option<T>[];
  label: string;
  className?: string;
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: SegmentedProps<T>) {
  return (
    <RadioGroup
      value={value}
      onChange={onChange}
      label={label}
      className={cn("flex w-full gap-0.5", className)}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <RadioItem
            key={option.value}
            value={option.value}
            className="inline-flex h-10 min-w-0 flex-1 items-center justify-center gap-2 rounded-[100px] border-0 bg-secondary-container px-4 py-0 text-sm leading-5 font-medium text-on-secondary-container focus-ring morph not-first:rounded-l-lg not-last:rounded-r-lg hover:state-layer-8 not-first:active:rounded-l-[4px] not-last:active:rounded-r-[4px] data-checked:rounded-[100px]! data-checked:bg-secondary data-checked:text-on-secondary [&_svg]:size-5"
          >
            {typeof option.icon === "function" ? option.icon(selected, value) : option.icon}
            {typeof option.label === "function" ? option.label(selected, value) : option.label}
          </RadioItem>
        );
      })}
    </RadioGroup>
  );
}
