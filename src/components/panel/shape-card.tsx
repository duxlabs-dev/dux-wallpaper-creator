import { DelayedTooltip } from "@/components/ui/delayed-tooltip";
import { cn } from "@/lib/utils";

interface ShapeCardProps {
  d: string;
  name: string;
  current?: boolean;
  connected?: boolean;
  cornerClass?: string;
  tabIndex?: number;
  onFocus?: () => void;
  onPick: (shiftKey: boolean) => void;
}

export function ShapeCard({
  d,
  name,
  current,
  connected = false,
  cornerClass,
  tabIndex,
  onFocus,
  onPick,
}: ShapeCardProps) {
  const button = (
    <button
      type="button"
      aria-label={name}
      tabIndex={tabIndex}
      onFocus={onFocus}
      onClick={(event) => onPick(event.shiftKey)}
      className={cn(
        "group/card relative flex aspect-square cursor-pointer items-center justify-center border-0 bg-surface-bright p-0 focus-ring morph hover:state-layer-8 focus-visible:z-1",
        connected
          ? cn(
              "rounded-[4px] active:rounded-2xl",
              cornerClass,
              current && "rounded-2xl bg-primary-container",
            )
          : cn(
              "rounded-2xl active:rounded-[10px]",
              current && "rounded-[28px] bg-primary-container",
            ),
      )}
    >
      <svg viewBox="0 0 1 1" aria-hidden className="size-12 shrink-0 overflow-visible">
        <path
          d={d}
          className={cn(
            "transition-[fill] duration-(--duration-default-effects) ease-default-effects group-hover/card:fill-primary",
            current ? "fill-on-primary-container" : "fill-on-surface/40",
          )}
        />
      </svg>
    </button>
  );

  return <DelayedTooltip content={name}>{button}</DelayedTooltip>;
}
