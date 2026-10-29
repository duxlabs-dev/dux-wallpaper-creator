import { useUi } from "@/store/ui";

export function Toast() {
  const toast = useUi((state) => state.toast);
  if (!toast) return null;
  return (
    <div
      role="status"
      className="fixed bottom-6 left-1/2 z-30 flex min-h-12 w-max max-w-[min(calc(100vw-32px),600px)] -translate-x-1/2 animate-fade-up items-center rounded-[4px] bg-inverse-surface px-4 py-3.5 text-sm leading-5 text-inverse-on-surface shadow-level3"
    >
      {toast.message}
    </div>
  );
}
