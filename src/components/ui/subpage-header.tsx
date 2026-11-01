import type { ReactNode, Ref } from "react";
import { IconButton } from "@/components/ui/icon-button";
import { ariaKeyshortcuts } from "@/lib/shortcut-keys";
import { ArrowBack } from "material-symbols/rounded";

interface SubpageHeaderProps {
  title: string;
  onBack: () => void;
  backRef?: Ref<HTMLButtonElement>;
  backLabel?: string;
  endContent?: ReactNode;
}

export function SubpageHeader({
  title,
  onBack,
  backRef,
  backLabel = "Back (Esc)",
  endContent,
}: SubpageHeaderProps) {
  return (
    <header className="flex items-center gap-2 border-b border-outline-variant px-1 pb-2">
      <IconButton
        ref={backRef}
        label={backLabel}
        aria-keyshortcuts={ariaKeyshortcuts("Escape")}
        onClick={onBack}
      >
        <ArrowBack />
      </IconButton>
      <h2 className="m-0 min-w-0 flex-1 text-base font-semibold whitespace-nowrap">{title}</h2>
      {endContent}
    </header>
  );
}
