import { useCallback } from "react";
import { canvasToBlob, renderToCanvas } from "@/lib/png";
import { downloadBlob, installLink, serializeLayout } from "@/lib/layout-file";
import { shiftedTokens } from "@/lib/theme";
import { wallpaperStore } from "@/store/wallpaper";
import { ui } from "@/store/ui";

export const useExport = () => {
  const exportPng = useCallback(async (scale: number) => {
    const { layers, canvas, prefs, dark } = wallpaperStore.state;
    const base = {
      layers,
      canvas,
      tokens: shiftedTokens(dark, prefs.hue, { variant: prefs.scheme, spec: prefs.spec }),
      pattern: prefs.pattern,
      patternOpacity: prefs.opacity,
      patternScale: prefs.patternScale,
      scale,
    };
    const name = `wallpaper-${canvas.width * scale}x${canvas.height * scale}.png`;
    try {
      let withPattern = true;
      let blob: Blob;
      try {
        blob = await canvasToBlob(await renderToCanvas({ ...base, withPattern: true }));
      } catch {
        withPattern = false;
        blob = await canvasToBlob(await renderToCanvas({ ...base, withPattern: false }));
      }
      downloadBlob(blob, name);
      if (!withPattern && prefs.pattern !== "none") {
        ui.showToast(
          `Saved ${name} without the pattern (browser local security restriction).`,
          5000,
        );
      }
    } catch (err) {
      console.error(err);
      ui.showToast("Export failed, see console for details.", 6000);
    }
  }, []);

  const exportJson = useCallback(() => {
    const { layers, canvas, prefs } = wallpaperStore.state;
    const text = serializeLayout(layers, canvas, prefs.pattern, prefs.opacity);
    downloadBlob(new Blob([text], { type: "application/json" }), "wallpaper.json");
  }, []);

  const installInDms = useCallback(() => {
    const { layers, canvas, prefs } = wallpaperStore.state;
    const text = serializeLayout(layers, canvas, prefs.pattern, prefs.opacity);
    window.location.assign(installLink(text));
  }, []);

  return { exportPng, exportJson, installInDms };
};
