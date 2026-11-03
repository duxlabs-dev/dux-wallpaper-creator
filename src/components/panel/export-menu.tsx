import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconButton } from "@/components/ui/icon-button";
import { useFocusReturn } from "@/hooks/ui/use-focus-return";
import { useExport } from "@/hooks/use-export";
import { ariaKeyshortcuts, keyLabel } from "@/lib/shortcut-keys";
import { clamp } from "@/lib/utils";
import { useWallpaper } from "@/store/wallpaper";
import { ui, useUi } from "@/store/ui";
import { Download, Image, DataObject, Wallpaper } from "material-symbols/rounded";

const MENU_WIDTH = 280;
const GAP = 6;
const EDGE = 8;

interface ExportMenuProps {
  trigger?: boolean;
  align?: "start" | "end";
}

export function ExportMenu({ trigger = true, align = "end" }: ExportMenuProps) {
  const open = useUi((state) => state.exportMenuOpen);
  const canvas = useWallpaper((state) => state.canvas);
  const { exportPng, exportJson, installInDms } = useExport();
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);

  useFocusReturn(open, trigger ? button : undefined);

  useLayoutEffect(() => {
    if (!open) return;
    const anchor = trigger ? button.current : wrap.current;
    if (!anchor) return;
    const place = () => {
      const rect = anchor.getBoundingClientRect();
      const height = menu.current?.offsetHeight ?? 0;
      const left = trigger && align === "end" ? rect.right - MENU_WIDTH : rect.left;
      const top = trigger ? rect.bottom + GAP : rect.top;
      setPosition({
        left: clamp(left, EDGE, window.innerWidth - MENU_WIDTH - EDGE),
        top: clamp(top, EDGE, window.innerHeight - height - EDGE),
      });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, trigger, align]);

  useEffect(() => {
    if (!open || !position) return;
    menu.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus({ preventScroll: true });
  }, [open, position]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (wrap.current?.contains(target) || menu.current?.contains(target)) return;
      ui.setExportMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopImmediatePropagation();
      ui.setExportMenuOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open]);

  const moveFocus = (step: number | "first" | "last") => {
    const list = Array.from(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    if (!list.length) return;
    const focusedIndex = list.indexOf(document.activeElement as HTMLElement);
    const nextIndex =
      step === "first"
        ? 0
        : step === "last"
          ? list.length - 1
          : (focusedIndex + step + list.length) % list.length;
    list[nextIndex]?.focus({ preventScroll: true });
  };

  const onMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowDown") moveFocus(1);
    else if (event.key === "ArrowUp") moveFocus(-1);
    else if (event.key === "Home") moveFocus("first");
    else if (event.key === "End") moveFocus("last");
    else if (event.key === "Tab") ui.setExportMenuOpen(false);
    else return;
    event.preventDefault();
  };

  const item = (icon: React.ReactNode, title: string, hint: string, onClick: () => void) => (
    <button
      type="button"
      role="menuitem"
      tabIndex={-1}
      onClick={() => {
        ui.setExportMenuOpen(false);
        onClick();
      }}
      className="flex min-h-11 cursor-pointer items-center gap-3 rounded-[4px] border-0 bg-transparent px-4 py-2 text-left text-base leading-6 text-on-surface focus-ring-inset morph first:rounded-t-xl last:rounded-b-xl hover:bg-on-surface/8 active:bg-on-surface/10 [&>svg]:size-5 [&>svg]:shrink-0 [&>svg]:text-on-surface-variant"
    >
      {icon}
      <span className="flex flex-col">
        {title}
        <small className="text-sm leading-5 text-on-surface-variant">{hint}</small>
      </span>
    </button>
  );

  return (
    <div ref={wrap} className={trigger ? "relative" : undefined}>
      {trigger && (
        <IconButton
          ref={button}
          variant="text"
          label={`Export (${keyLabel("Mod+S")})`}
          aria-keyshortcuts={ariaKeyshortcuts("Mod+S")}
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => ui.setExportMenuOpen(!open)}
        >
          <Download />
        </IconButton>
      )}
      {open &&
        createPortal(
          <div
            ref={menu}
            role="menu"
            onKeyDown={onMenuKeyDown}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null))
                ui.setExportMenuOpen(false);
            }}
            style={{
              left: position?.left ?? 0,
              top: position?.top ?? 0,
              visibility: position ? "visible" : "hidden",
            }}
            className="fixed z-50 flex w-[280px] animate-fade-up flex-col gap-0.5 rounded-2xl bg-surface-container-low p-1 shadow-level2"
          >
            {item(
              <Image />,
              "PNG 2×",
              `${canvas.width * 2} × ${canvas.height * 2}`,
              () => void exportPng(2),
            )}
            {item(
              <Image />,
              "PNG 1×",
              `${canvas.width} × ${canvas.height}`,
              () => void exportPng(1),
            )}
            {item(<DataObject />, "JSON layout", "Import as a wallpaper in Dux Shell", exportJson)}
            {item(<Wallpaper />, "Install in DMS", "Opens Dux Shell on this machine", installInDms)}
          </div>,
          document.body,
        )}
    </div>
  );
}
