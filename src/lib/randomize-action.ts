import type { RandomizeOptions } from "@/lib/randomize";
import { loadRandomizeOptions } from "@/lib/storage";
import { ui } from "@/store/ui";
import { wallpaper } from "@/store/wallpaper";

export const randomizeWithOptions = (options: RandomizeOptions = loadRandomizeOptions()) => {
  const satisfied = wallpaper.randomizeLayers(options);
  if (!satisfied) ui.showToast("Some shapes could not meet the requested placement rules");
};
