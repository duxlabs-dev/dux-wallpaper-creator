import { useEffect, useRef, useState, type ReactNode } from "react";
import { IconButton } from "@/components/ui/icon-button";
import { Kbd } from "@/components/ui/kbd";
import { keyLabel, keyParts } from "@/lib/shortcut-keys";
import { ui, useUi } from "@/store/ui";
import { Close } from "material-symbols/rounded";

interface Row {
  label: ReactNode;
  hint?: string;
  keys: string[];
}

interface Labels {
  move: string;
  rotate: string;
}

const groups = ({ move, rotate }: Labels): { title: string; rows: Row[] }[] => [
  {
    title: "Focus & selection",
    rows: [
      {
        label: "Next / previous shape",
        hint: "walks the stacking order, leaves the page at the top shape",
        keys: ["Tab"],
      },
      { label: "Leave the canvas for the sidebar", hint: "keeps the selection", keys: ["Esc"] },
      { label: "Switch canvas ↔ sidebar", keys: ["F6"] },
      { label: "Open the shape picker", keys: ["N"] },
      { label: "Delete the selected shape", hint: "or Backspace", keys: ["Del"] },
      { label: "Duplicate the selected shape", hint: "16 px down-right", keys: keyParts("Mod+D") },
    ],
  },
  {
    title: "Selected shape",
    rows: [
      { label: "Move", hint: `or ${move}`, keys: ["←", "→", "↑", "↓"] },
      {
        label: "Rotate left / right",
        hint: `or ${rotate}, Shift snaps to 15°`,
        keys: [",", "."],
      },
      { label: "Resize", hint: "Shift for 10 px", keys: ["R", "F"] },
      { label: "Opacity down / up", hint: "Shift for 10%", keys: ["T", "G"] },
      { label: "Reshape a blob / random shape", keys: ["M"] },
      { label: "Resize on the wallpaper", keys: ["Scroll"] },
      { label: "Rotate", hint: "add Ctrl for fine", keys: ["Shift", "Scroll"] },
    ],
  },
  {
    title: "Color",
    rows: [
      { label: "Fill color 1–8", keys: ["1", "–", "8"] },
      { label: "Overlap color 1–8", keys: ["Shift", "1", "–", "8"] },
      { label: "Overlap: none (top shape's color)", keys: ["Shift", "0"] },
      { label: "Cycle fill color next / previous", keys: ["C"] },
    ],
  },
  {
    title: "Layer order",
    rows: [
      { label: "Layer forward / back", keys: ["U", "J"] },
      {
        label: "Layer to front / to back",
        hint: "Shift jumps all the way",
        keys: ["Shift", "U / J"],
      },
    ],
  },
  {
    title: "Background mode",
    rows: [
      { label: "Background mode on / off", hint: "shape keys pause while it is on", keys: ["B"] },
      {
        label: "Pattern on / off",
        hint: "works inside and outside the mode",
        keys: ["Shift", "B"],
      },
      { label: "Previous / next pattern", keys: ["↑", "↓"] },
      { label: "Intensity lighter / stronger", hint: "or ← →", keys: ["T", "G"] },
      { label: "Pattern size smaller / larger", hint: "Shift for a coarse step", keys: ["R", "F"] },
      { label: "Leave background mode", hint: "keeps the pattern", keys: ["Esc"] },
    ],
  },
  {
    title: "Global",
    rows: [
      { label: "Undo", keys: keyParts("Mod+Z") },
      { label: "Redo", hint: `or ${keyLabel("Mod+Y")}`, keys: keyParts("Mod+Shift+Z") },
      { label: "Export menu", keys: keyParts("Mod+S") },
      {
        label: "Align all shapes, then confirm alignment",
        keys: keyParts("Shift+L"),
      },
      { label: "Open randomization options", keys: keyParts("Shift+R") },
      { label: "Cycle the panel", hint: "full → mini → hidden", keys: ["P"] },
      { label: "Clear everything", hint: "press again to confirm", keys: ["X"] },
      { label: "Show this cheat sheet", hint: "or F1", keys: ["?"] },
    ],
  },
  {
    title: "Sidebar",
    rows: [
      { label: "Tab from the last control continues to the bottom shape", keys: ["Tab"] },
      { label: "Choose inside a group (colors, patterns, formats…)", keys: ["←", "→"] },
      {
        label: "Adjust a slider",
        hint: "Shift for a coarse step, double-click to reset",
        keys: ["←", "→"],
      },
      { label: "Browse the shape grid", keys: ["←", "→", "↑", "↓"] },
      {
        label: "Select shape without closing picker",
        hint: "Shift + Click for mouse",
        keys: ["Shift", "Enter"],
      },
    ],
  },
];

export function ShortcutsDialog() {
  const open = useUi((state) => state.shortcutsOpen);
  const ref = useRef<HTMLDialogElement>(null);
  const [labels, setLabels] = useState<Labels>({ move: "W A S D", rotate: "Q E" });

  useEffect(() => {
    const kb = (
      navigator as Navigator & {
        keyboard?: { getLayoutMap?: () => Promise<Map<string, string>> };
      }
    ).keyboard;
    kb?.getLayoutMap?.()
      .then((map) => {
        const at = (code: string) => (map.get(code) ?? code.slice(3)).toUpperCase();
        setLabels({
          move: `${at("KeyW")} ${at("KeyA")} ${at("KeyS")} ${at("KeyD")}`,
          rotate: `${at("KeyQ")} ${at("KeyE")}`,
        });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    if (open && !dlg.open) dlg.showModal();
    if (!open && dlg.open) dlg.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="shortcuts-title"
      onClose={() => ui.setShortcutsOpen(false)}
      onClick={(event) => event.target === event.currentTarget && ui.setShortcutsOpen(false)}
      className="fixed inset-0 m-auto max-h-[min(82vh,760px)] w-[min(640px,92vw)] overflow-hidden rounded-[28px] border-0 bg-surface-container-high p-0 text-sm text-on-surface open:flex open:animate-dialog-in open:flex-col"
    >
      <div className="flex items-center gap-3 py-4 pr-3 pb-2 pl-6">
        <h2 id="shortcuts-title" className="m-0 flex-1 text-[22px] font-semibold">
          Keyboard shortcuts
        </h2>
        <IconButton
          label="Close (Esc)"
          aria-keyshortcuts="Escape"
          onClick={() => ui.setShortcutsOpen(false)}
        >
          <Close />
        </IconButton>
      </div>
      <div
        tabIndex={-1}
        className="grid grid-cols-2 gap-x-9 gap-y-6 overflow-y-auto px-6 pt-2 pb-6 max-sm:grid-cols-1"
      >
        {groups(labels).map((group) => (
          <section key={group.title}>
            <h3 className="mb-1.5 text-xs font-semibold tracking-[.06em] text-primary uppercase">
              {group.title}
            </h3>
            {group.rows.map((row, rowIndex) => (
              <div key={rowIndex} className="flex items-center justify-between gap-3 py-[7px]">
                <span className="leading-[1.35]">
                  {row.label}
                  {row.hint && (
                    <>
                      <br />
                      <small className="text-xs text-on-surface-variant">{row.hint}</small>
                    </>
                  )}
                </span>
                <span className="flex shrink-0 gap-1">
                  {row.keys.map((key, keyIndex) => (
                    <Kbd key={keyIndex}>{key}</Kbd>
                  ))}
                </span>
              </div>
            ))}
          </section>
        ))}
      </div>
    </dialog>
  );
}
