import { cn } from "@/lib/utils";

interface ShapeCardProps {
  d: string;
  name: string;
  current?: boolean;
  tabIndex?: number;
  onFocus?: () => void;
  onPick: (shiftKey: boolean) => void;
}

export function ShapeCard({ d, name, current, tabIndex, onFocus, onPick }: ShapeCardProps) {
  return (
    <button
      type="button"
      aria-label={name}
      title={name}
      tabIndex={tabIndex}
      onFocus={onFocus}
      onClick={(event) => onPick(event.shiftKey)}
      className={cn(
        "group/card relative flex cursor-pointer items-center justify-center rounded-2xl border-0 bg-transparent px-0 py-2 focus-ring morph hover:bg-on-surface/8 active:rounded-[10px]",
        current && "rounded-[28px] bg-primary-container",
      )}
    >
      <svg viewBox="0 0 1 1" aria-hidden className="size-14 shrink-0 overflow-visible">
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
}
