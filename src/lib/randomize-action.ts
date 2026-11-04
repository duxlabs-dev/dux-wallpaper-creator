import type { RandomizeOptions } from "@/lib/randomize";
import { loadRandomizeOptions } from "@/lib/storage";
import { ui } from "@/store/ui";
import { wallpaper } from "@/store/wallpaper";

export const randomizeWithOptions = (
  options: RandomizeOptions = loadRandomizeOptions(),
  showDiscoveryHint = false,
) => {
  const satisfied = wallpaper.randomizeLayers(options);
  if (!satisfied) {
    ui.showToast(
      showDiscoveryHint
        ? "Some shapes could not meet the rules. Hold Randomize 250 ms or press Shift+I for options."
        : "Some shapes could not meet the requested placement rules",
    );
  } else if (showDiscoveryHint) {
    ui.showToast("Hold Randomize 250 ms or press Shift+I for options");
  }
};
