import type { ComponentProps } from "react";
import { useRipple } from "@/hooks/ui/use-ripple";
import { cn } from "@/lib/utils";

export type ButtonVariant = "filled" | "tonal" | "text" | "danger";

interface ButtonProps extends ComponentProps<"button"> {
  variant?: ButtonVariant;
}

export const buttonVariants: Record<ButtonVariant, string> = {
  filled: "bg-primary text-on-primary hover:state-layer-8 disabled:bg-on-surface/10",
  tonal:
    "bg-secondary-container text-on-secondary-container hover:state-layer-8 disabled:bg-on-surface/10",
  text: "bg-transparent text-on-surface-variant hover:state-layer-8",
  danger:
    "bg-error-container text-on-error-container hover:state-layer-8 disabled:bg-on-surface/10",
};

export function Button({ variant = "tonal", className, onClick, ref, ...rest }: ButtonProps) {
  const ripple = useRipple({ ref });
  return (
    <button
      type="button"
      ref={ripple}
      onClick={(event) => {
        event.currentTarget.blur();
        onClick?.(event);
      }}
      className={cn(
        "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-[20px] border-0 px-4 py-0 text-sm leading-5 font-medium focus-ring morph active:rounded-lg disabled:pointer-events-none disabled:text-on-surface/38 [&_svg]:size-5 [&_svg]:shrink-0",
        buttonVariants[variant],
        className,
      )}
      {...rest}
    />
  );
}
