import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useRipple } from "@/hooks/ui/use-ripple";
import { cn } from "@/lib/utils";

interface TabDef<T extends string> {
  id: T;
  label: ReactNode | ((selected: boolean, activeTab: T) => ReactNode);
  icon?: ReactNode | ((selected: boolean, activeTab: T) => ReactNode);
}

export interface TabsProps<T extends string> {
  tabs: readonly TabDef<T>[];
  value: T;
  onChange: (id: T) => void;
  label: string;
}

const MIN_INDICATOR_WIDTH = 24;

export function Tabs<T extends string>({ tabs, value, onChange, label }: TabsProps<T>) {
  const list = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: MIN_INDICATOR_WIDTH });
  const ripple = useRipple();

  useLayoutEffect(() => {
    const element = list.current;
    if (!element) return;
    const measure = () => {
      const selectedTab = element.querySelector<HTMLButtonElement>('[aria-selected="true"]');
      if (!selectedTab) return;
      // The indicator spans the tab's content, not the whole tab.
      const content = selectedTab.querySelector<HTMLElement>("[data-tab-content]");
      const width = Math.max(MIN_INDICATOR_WIDTH, content?.offsetWidth ?? 0);
      setIndicator({ left: selectedTab.offsetLeft + (selectedTab.offsetWidth - width) / 2, width });
    };
    measure();
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(element);
    return () => resizeObserver.disconnect();
  }, [value]);

  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    const nextIndexCandidate = {
      ArrowRight: index + 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: tabs.length - 1,
    }[event.key];
    if (nextIndexCandidate === undefined) return;
    event.preventDefault();
    event.stopPropagation();
    const targetIndex = (nextIndexCandidate + tabs.length) % tabs.length;
    const nextTab = tabs[targetIndex];
    onChange(nextTab.id);
    const buttons = list.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    buttons?.[targetIndex]?.focus();
  };

  return (
    <div
      ref={list}
      role="tablist"
      aria-label={label}
      className="relative flex justify-between gap-1 border-b border-outline-variant"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-px z-2 h-[3px] rounded-t-[3px] bg-primary transition-[left,width] duration-(--duration-default-spatial) ease-default-spatial"
        style={indicator}
      />
      {tabs.map((tab, index) => {
        const selected = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={selected}
            aria-controls={`panel-${tab.id}`}
            tabIndex={selected ? 0 : -1}
            ref={ripple}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              "relative flex h-16 flex-1 cursor-pointer items-center justify-center border-0 bg-transparent px-4 text-sm leading-5 font-medium whitespace-nowrap focus-ring-inset transition-colors duration-(--duration-default-effects) ease-default-effects hover:state-layer-8 [&_svg]:size-6",
              selected ? "text-primary" : "text-on-surface-variant",
            )}
          >
            <span data-tab-content className="flex flex-col items-center gap-0.5">
              {typeof tab.icon === "function" ? tab.icon(selected, value) : tab.icon}
              {typeof tab.label === "function" ? tab.label(selected, value) : tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
