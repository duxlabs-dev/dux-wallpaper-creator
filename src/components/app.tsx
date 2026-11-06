import { useEffect } from "react";
import { Preview } from "@/components/canvas/preview";
import { Panel } from "@/components/panel/panel";
import { ShapeSheet } from "@/components/shape-sheet";
import { ShortcutsDialog } from "@/components/shortcuts-dialog";
import { LiveRegion } from "@/components/ui/live-region";
import { Toast } from "@/components/ui/toast";
import { useShortcuts } from "@/hooks/use-shortcuts";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { cn } from "@/lib/utils";
import { useUi } from "@/store/ui";

export function App() {
  const { hueTrack, primaryHex } = useThemeColors();
  const hidden = useUi((state) => state.panel === "hidden");
  useShortcuts();

  useEffect(() => {
    const preventButtonKeyboardActivation = (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      if (!(event.target instanceof Element) || !event.target.closest("button")) return;
      event.preventDefault();
      event.stopPropagation();
    };
    document.addEventListener("keydown", preventButtonKeyboardActivation, true);
    document.addEventListener("keyup", preventButtonKeyboardActivation, true);
    return () => {
      document.removeEventListener("keydown", preventButtonKeyboardActivation, true);
      document.removeEventListener("keyup", preventButtonKeyboardActivation, true);
    };
  }, []);

  return (
    <>
      <div className={cn("flex h-full gap-4 max-md:flex-col", hidden ? "p-0" : "p-4")}>
        <Panel hueTrack={hueTrack} primaryHex={primaryHex} />
        <Preview />
      </div>
      <ShapeSheet />
      <ShortcutsDialog />
      <Toast />
      <LiveRegion />
    </>
  );
}
