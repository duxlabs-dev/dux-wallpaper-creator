import { FieldLabel } from "@/components/ui/field-label";
import { RadioGroup, RadioItem } from "@/components/ui/radio-group";
import { Segmented } from "@/components/ui/segmented";
import {
  SCHEME_VARIANTS,
  specChangesScheme,
  SPEC_VERSIONS,
  type SchemeVariant,
  type SpecVersion,
} from "@/lib/theme";
import { useWallpaper, wallpaper } from "@/store/wallpaper";
import { Style, Update } from "material-symbols/rounded";

const LABELS: Record<SchemeVariant, string> = {
  "tonal-spot": "Tonal spot",
  vibrant: "Vibrant",
  expressive: "Expressive",
  neutral: "Neutral",
  content: "Content",
  fidelity: "Fidelity",
  monochrome: "Monochrome",
  rainbow: "Rainbow",
  "fruit-salad": "Fruit salad",
};

const specs = SPEC_VERSIONS.map((spec) => ({
  value: spec,
  label: spec === "dms" ? "DMS" : spec,
}));

const chipClass =
  "morph focus-ring flex h-10 items-center justify-center rounded-2xl border-0 bg-surface-container-highest px-1 text-xs font-medium text-on-surface hover:state-layer-8 active:rounded-[10px] data-checked:rounded-[20px] data-checked:bg-primary-container data-checked:text-on-primary-container";

export function SchemePicker() {
  const { scheme, spec } = useWallpaper((state) => ({
    scheme: state.prefs.scheme,
    spec: state.prefs.spec,
  }));

  return (
    <div className="flex flex-col gap-2">
      <FieldLabel icon={<Style />}>Scheme</FieldLabel>
      <RadioGroup<SchemeVariant>
        label="Scheme type"
        value={scheme}
        onChange={wallpaper.setScheme}
        className="grid grid-cols-3 gap-2"
      >
        {SCHEME_VARIANTS.map((variant) => (
          <RadioItem key={variant} value={variant} className={chipClass}>
            {LABELS[variant]}
          </RadioItem>
        ))}
      </RadioGroup>
      <FieldLabel icon={<Update />} className="mt-2">
        Color spec
      </FieldLabel>
      <Segmented<SpecVersion>
        label="Color spec"
        value={spec}
        options={specs}
        onChange={wallpaper.setSpec}
      />
      {!specChangesScheme(scheme) && (
        <div className="text-xs text-on-surface-variant">
          {LABELS[scheme]} looks the same in every spec.
        </div>
      )}
    </div>
  );
}
