import type { HTMLAttributes, ReactNode } from "react";
import { DelayedTooltip } from "@/components/ui/delayed-tooltip";
import { cn } from "@/lib/utils";

interface FieldLabelProps extends HTMLAttributes<HTMLElement> {
  icon?: ReactNode;
  htmlFor?: string;
  value?: ReactNode;
  tooltip?: string;
}

export function FieldLabel({
  icon,
  htmlFor,
  value,
  children,
  className,
  tooltip,
  title: _title,
  ...rest
}: FieldLabelProps) {
  const Tag = htmlFor ? "label" : "div";
  const tooltipText = tooltip ?? (typeof _title === "string" ? _title : undefined);
  const labelText = tooltipText ? (
    <DelayedTooltip content={tooltipText}>
      <span className="text-sm font-medium">{children}</span>
    </DelayedTooltip>
  ) : (
    <span className="text-sm font-medium">{children}</span>
  );

  return (
    <Tag
      htmlFor={htmlFor}
      className={cn(
        "flex items-center gap-1.5 whitespace-nowrap [&>svg]:size-5 [&>svg]:shrink-0 [&>svg]:text-on-surface-variant",
        className,
      )}
      {...rest}
    >
      {icon}
      {labelText}
      {value !== undefined && <span className="ml-auto text-on-surface-variant">{value}</span>}
    </Tag>
  );
}
