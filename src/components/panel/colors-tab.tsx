import { HuePicker } from "./hue-picker";
import { SchemePicker } from "./scheme-picker";
import { ThemeToggle } from "./theme-toggle";

interface ColorsTabProps {
  hueTrack: string;
  primaryHex: string;
}

export function ColorsTab({ hueTrack, primaryHex }: ColorsTabProps) {
  return (
    <section
      id="panel-colors"
      role="tabpanel"
      aria-labelledby="tab-colors"
      className="flex animate-fade-up flex-col gap-7"
    >
      <ThemeToggle />
      <HuePicker track={hueTrack} placeholder={primaryHex} />
      <SchemePicker />
    </section>
  );
}
