import { useLayoutEffect, useRef } from "react";
import { Tabs, TabsProps } from "@/components/ui/tabs";
import { DelayedTooltip } from "@/components/ui/delayed-tooltip";
import { focusCanvas } from "@/a11y/focus-zones";
import { useFlip } from "@/hooks/ui/use-flip";
import { isLastFocusable } from "@/lib/focus-dom";
import { ariaKeyshortcuts } from "@/lib/shortcut-keys";
import { cn } from "@/lib/utils";
import { ui, useUi, type Tab } from "@/store/ui";
import { ColorsTab } from "./colors-tab";
import { CanvasTab } from "./canvas-tab";
import { RandomizeButton, RandomizeSettings } from "./randomize-menu";
import { ShapePicker } from "./shape-picker";
import { ShapeTab } from "./shape-tab";
import { Toolbar } from "./toolbar";
import { Add, AspectRatio, Palette, Shapes } from "material-symbols/rounded";
import {
  AspectRatio as AspectRatioFilled,
  Palette as PaletteFilled,
  Shapes as ShapesFilled,
} from "material-symbols/rounded/filled";

const tabs = [
  {
    id: "canvas",
    label: "Canvas",
    icon: (selected) => (selected ? <AspectRatioFilled /> : <AspectRatio />),
  },
  {
    id: "colors",
    label: "Colors",
    icon: (selected) => (selected ? <PaletteFilled /> : <Palette />),
  },
  {
    id: "shape",
    label: "Shape",
    icon: (selected) => (selected ? <ShapesFilled /> : <Shapes />),
  },
] as const satisfies TabsProps<Tab>["tabs"];

interface PanelProps {
  hueTrack: string;
  primaryHex: string;
}

export function Panel({ hueTrack, primaryHex }: PanelProps) {
  const { panel, tab, picking, randomizeOpen } = useUi((state) => ({
    panel: state.panel,
    tab: state.tab,
    picking: state.picker !== null,
    randomizeOpen: state.randomizeOpen,
  }));
  const tabScroll = useRef<HTMLDivElement>(null);
  const column = useRef<HTMLDivElement>(null);
  useFlip(column, panel, { selector: "[data-flip]" });

  useLayoutEffect(() => {
    tabScroll.current?.scrollTo({ top: 0 });
  }, [tab]);

  if (panel === "hidden") return null;
  const mini = panel === "mini";

  // Tab on the last control continues to the shapes. Shift+Tab on the first
  // control leaves natively.
  const onPanelKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Tab" || event.shiftKey || event.ctrlKey || event.altKey || event.metaKey)
      return;
    const panelEl = event.currentTarget;
    if (!isLastFocusable(document.activeElement, panelEl)) return;
    event.preventDefault();
    focusCanvas("first");
  };

  return (
    <aside
      data-panel={panel}
      onKeyDown={onPanelKeyDown}
      className={cn(
        "group/panel relative flex shrink-0 flex-col overflow-hidden rounded-[28px] bg-surface-container text-sm text-on-surface [transition:width_var(--duration-default-spatial)_var(--ease-default-spatial),background-color_var(--duration-default-effects)_var(--ease-default-effects)] max-md:max-h-[48%] max-md:w-auto",
        mini ? "w-[72px] p-2 pb-0" : "w-80 px-2 pt-2",
      )}
    >
      <div
        ref={column}
        className={cn("flex min-h-0 flex-1 flex-col max-md:w-auto", mini ? "w-14" : "w-[304px]")}
      >
        <Toolbar />
        <div className="relative min-h-0 flex-1">
          <div
            inert={picking}
            className={cn(
              "absolute inset-0 flex flex-col pt-2 transition-[translate,scale,opacity] duration-450 ease-emphasized",
              picking && "-translate-x-[18%] scale-90 opacity-0",
              (mini || randomizeOpen) && "hidden",
            )}
          >
            <Tabs tabs={tabs} value={tab} onChange={ui.setTab} label="Settings" />
            <div
              ref={tabScroll}
              tabIndex={-1}
              className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto pt-5 pb-2"
            >
              {tab === "canvas" ? (
                <CanvasTab />
              ) : tab === "colors" ? (
                <ColorsTab hueTrack={hueTrack} primaryHex={primaryHex} />
              ) : (
                <ShapeTab />
              )}
            </div>
          </div>
          <div
            inert={!randomizeOpen}
            aria-hidden={!randomizeOpen}
            className={cn("absolute inset-0 flex flex-col", !randomizeOpen && "hidden")}
          >
            <RandomizeSettings />
          </div>
          <ShapePicker />
        </div>
        <div
          className={cn(
            "flex gap-2",
            mini ? "flex-col items-start pb-3 pl-1" : "items-center px-2 py-3",
            (picking || randomizeOpen) && "hidden",
          )}
        >
          <RandomizeButton mini={mini} />
          <AddShapeButton mini={mini} />
        </div>
      </div>
    </aside>
  );
}

function AddShapeButton({ mini }: { mini: boolean }) {
  const picking = useUi((state) => state.picker !== null);
  return (
    <DelayedTooltip content="Add a shape (N)">
      <button
        type="button"
        data-flip
        aria-label="Add a shape"
        aria-keyshortcuts={ariaKeyshortcuts("N")}
        onClick={(event) => {
          event.currentTarget.blur();
          if (picking) ui.closePicker();
          else ui.openPicker("add");
        }}
        className={cn(
          "flex cursor-pointer items-center justify-center overflow-hidden border-0 bg-primary text-base leading-6 font-medium whitespace-nowrap text-on-primary focus-ring morph hover:state-layer-8 active:state-layer-10 [&>svg]:size-6 [&>svg]:shrink-0",
          mini
            ? "size-12 rounded-[14px] active:rounded-[10px]"
            : "h-12 min-w-0 flex-1 rounded-3xl active:rounded-[14px]",
        )}
      >
        <Add />
        {/* The label grows and shrinks with the button instead of popping in and out. */}
        <span
          aria-hidden="true"
          className={cn(
            "grid transition-[grid-template-columns,opacity] duration-(--duration-default-spatial) ease-(--ease-default-spatial)",
            mini ? "grid-cols-[0fr] opacity-0" : "grid-cols-[1fr] opacity-100",
          )}
        >
          <span className="overflow-hidden pl-2">Add shape</span>
        </span>
      </button>
    </DelayedTooltip>
  );
}
