import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/components/ui/field-label";
import { IconButton } from "@/components/ui/icon-button";
import { RadioGroup, RadioItem } from "@/components/ui/radio-group";
import { SliderField } from "@/components/ui/slider-field";
import { Swatch } from "@/components/ui/swatch";
import { layerName, LAYER_SIZE_PCT } from "@/lib/layer";
import { PALETTE, type OverlapColor, type PaletteColor } from "@/lib/palette";
import { ariaKeyshortcuts } from "@/lib/shortcut-keys";
import { normDeg } from "@/lib/utils";
import { selectActive, selectActiveIndex, useWallpaper, wallpaper } from "@/store/wallpaper";
import { ui } from "@/store/ui";
import {
  BLOB_MAX_EDGES,
  BLOB_MIN_EDGES,
  createBlob,
  isBlob,
  randomBlob,
  SMOOTHNESS,
  SmoothnessIndex,
} from "@/lib/shapes";
import {
  ChevronLeft,
  ChevronRight,
  Shapes,
  Shuffle,
  OneHundredTwentyThree,
  LineCurve,
  FormatColorFill,
  Layers,
  Block,
  OpenInFull,
  Opacity,
  RotateRight,
  Stacks,
  FlipToBack,
  ArrowDownward,
  FlipToFront,
  ArrowUpward,
  ContentCopy,
  Delete,
} from "material-symbols/rounded";

export const openShapes = (mode: "add" | "replace") =>
  ui.panelHidden() ? ui.openSheet(mode) : ui.openPicker(mode);

export function ShapeTab() {
  const active = useWallpaper(selectActive);
  const index = useWallpaper(selectActiveIndex);
  const { count, canvas } = useWallpaper((state) => ({
    count: state.layers.length,
    canvas: state.canvas,
  }));

  if (!active) {
    return (
      <section
        id="panel-shape"
        role="tabpanel"
        aria-labelledby="tab-shape"
        tabIndex={0}
        className="flex animate-fade-up flex-col gap-0.5 panel-sections text-center text-on-surface-variant"
      >
        <span>No shape selected. Click one on the wallpaper, or add a new one.</span>
      </section>
    );
  }

  const activeIsBlob = isBlob(active);
  const opacity = Math.round((active.opacity ?? 1) * 100);
  const rotation = Math.round(normDeg(active.rot)) % 360;
  const size = Math.round((active.size / Math.min(canvas.width, canvas.height)) * 100);

  return (
    <section
      id="panel-shape"
      role="tabpanel"
      aria-labelledby="tab-shape"
      className="flex animate-fade-up flex-col gap-0.5 panel-sections"
    >
      <div className="flex items-center justify-between">
        <IconButton
          label="Previous shape (Shift+Tab)"
          aria-keyshortcuts={ariaKeyshortcuts("Shift+Tab")}
          disabled={count < 2}
          onClick={() => wallpaper.stepActive(-1)}
        >
          <ChevronLeft />
        </IconButton>
        <span aria-live="polite" className="text-sm font-medium text-on-surface-variant">
          Shape {index + 1} of {count}
        </span>
        <IconButton
          label="Next shape (Tab)"
          aria-keyshortcuts={ariaKeyshortcuts("Tab")}
          disabled={count < 2}
          onClick={() => wallpaper.stepActive(1)}
        >
          <ChevronRight />
        </IconButton>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="tonal" title="Change shape" onClick={() => openShapes("replace")}>
          <Shapes />
          {layerName(active)}
          <ChevronRight />
        </Button>
        <IconButton
          variant="tonal"
          size="md"
          label={`${activeIsBlob ? "Reshape blob" : "Random shape"} (M)`}
          aria-keyshortcuts={ariaKeyshortcuts("M")}
          onClick={wallpaper.shuffleActive}
          className="ml-auto"
        >
          <Shuffle />
        </IconButton>
      </div>

      {activeIsBlob && (
        <>
          <SliderField
            id="sm-edges"
            icon={<OneHundredTwentyThree />}
            label="Edges"
            value={active.points.length}
            min={BLOB_MIN_EDGES}
            max={BLOB_MAX_EDGES}
            step={1}
            ticks
            display={active.points.length}
            tooltip="Sets how many points make up the blob outline."
            onChange={(value) => wallpaper.patchActive({ ...createBlob(value, active.smoothness) })}
            onReset={() => wallpaper.patchActive({ ...randomBlob() })}
          />
          <SliderField
            id="sm-smoothness"
            icon={<LineCurve />}
            label="Smoothness"
            value={active.smoothness}
            min={0}
            max={SMOOTHNESS.length - 1}
            step={1}
            ticks
            display={active.smoothness}
            tooltip="Adjusts how rounded or faceted the blob contour is."
            onChange={(value) =>
              wallpaper.patchActive({
                ...createBlob(active.points.length, value as SmoothnessIndex),
              })
            }
            onReset={() => wallpaper.patchActive({ ...randomBlob() })}
          />
        </>
      )}
      <div className="flex flex-col gap-2">
        <FieldLabel icon={<FormatColorFill />} tooltip="Fill color: 1–8, C cycles">
          Color
        </FieldLabel>
        <RadioGroup<PaletteColor>
          label="Color"
          value={active.fill}
          onChange={wallpaper.setActiveFill}
          className="flex flex-wrap gap-2"
        >
          {PALETTE.map((color) => (
            <Swatch key={color} color={color} />
          ))}
        </RadioGroup>
      </div>

      <div className="flex flex-col gap-2">
        <FieldLabel
          icon={<Layers />}
          tooltip="Overlap color: Shift+1–8, Shift+0 for none. The shape on top decides the overlap color where shapes meet."
          value={
            index === 0 ? (
              <span id="overlap-hint" className="text-xs font-normal">
                won't apply at the bottom
              </span>
            ) : undefined
          }
        >
          Overlap color
        </FieldLabel>
        <RadioGroup<OverlapColor>
          label="Overlap color"
          value={active.overlap}
          onChange={wallpaper.setActiveOverlap}
          aria-describedby={index === 0 ? "overlap-hint" : undefined}
          className="flex flex-wrap gap-2"
        >
          <RadioItem
            value="none"
            title="No overlap color (Shift+0)"
            aria-label="No overlap color"
            className="inline-flex size-[30px] items-center justify-center rounded-full border-0 bg-surface-container-highest p-0 text-on-surface-variant focus-ring morph data-checked:bg-secondary data-checked:text-on-secondary [&>svg]:size-[18px]"
          >
            <Block />
          </RadioItem>
          {PALETTE.map((color) => (
            <Swatch key={color} color={color} />
          ))}
        </RadioGroup>
      </div>

      <SliderField
        id="sm-size"
        icon={<OpenInFull />}
        label="Size"
        value={size}
        min={LAYER_SIZE_PCT.min}
        max={LAYER_SIZE_PCT.max}
        step={1}
        display={`${size}%`}
        tooltip="Size: R and F (Shift for 10 px), or scroll"
        onChange={(value) =>
          wallpaper.resizeActive((value / 100) * Math.min(canvas.width, canvas.height))
        }
      />

      <SliderField
        id="sm-opacity"
        icon={<Opacity />}
        label="Opacity"
        value={opacity}
        min={10}
        max={100}
        step={1}
        display={`${opacity}%`}
        tooltip="Opacity: T and G (Shift for 10%)"
        onChange={(value) =>
          wallpaper.patchActive({ opacity: value >= 100 ? undefined : value / 100 })
        }
        onReset={() => wallpaper.patchActive({ opacity: undefined })}
      />

      <SliderField
        id="sm-rotation"
        icon={<RotateRight />}
        label="Rotation"
        value={rotation}
        min={0}
        max={359}
        step={1}
        display={`${rotation}°`}
        tooltip="Rotation: , and . or Q and E (Shift snaps to 15°)"
        onChange={(value) => wallpaper.patchActive({ rot: value })}
        onReset={() => wallpaper.patchActive({ rot: 0 })}
      />

      <div className="flex flex-col gap-2">
        <FieldLabel
          icon={<Stacks />}
          tooltip="Layer: U forward, J back (Shift jumps to front / back)"
        >
          Layer
        </FieldLabel>
        <div className="grid grid-cols-2 gap-2">
          <Button
            title="Send to the back (Shift+J)"
            aria-keyshortcuts={ariaKeyshortcuts("Shift+J")}
            onClick={() => wallpaper.reorderActive(-Infinity)}
          >
            <FlipToBack />
            To back
          </Button>
          <Button
            title="Send backward (J)"
            aria-keyshortcuts={ariaKeyshortcuts("J")}
            onClick={() => wallpaper.reorderActive(-1)}
          >
            <ArrowDownward />
            Backward
          </Button>
          <Button
            title="Bring to the front (Shift+U)"
            aria-keyshortcuts={ariaKeyshortcuts("Shift+U")}
            onClick={() => wallpaper.reorderActive(Infinity)}
          >
            <FlipToFront />
            To front
          </Button>
          <Button
            title="Bring forward (U)"
            aria-keyshortcuts={ariaKeyshortcuts("U")}
            onClick={() => wallpaper.reorderActive(1)}
          >
            <ArrowUpward />
            Forward
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="tonal"
          title="Duplicate the shape (Ctrl+D)"
          aria-keyshortcuts={ariaKeyshortcuts("Mod+D")}
          onClick={wallpaper.duplicateActive}
        >
          <ContentCopy />
          Duplicate
        </Button>
        <Button
          variant="danger"
          title="Delete the shape (Delete or Backspace)"
          aria-keyshortcuts={ariaKeyshortcuts("Delete")}
          onClick={wallpaper.deleteActive}
        >
          <Delete />
          Delete
        </Button>
      </div>
    </section>
  );
}
