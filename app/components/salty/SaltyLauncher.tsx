import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useI18n } from "~/i18n";
import { SaltyMascot } from "./SaltyMascot";

// The chat code only downloads when someone opens it.
const SaltyChat = lazy(() => import("./SaltyChat"));

/** Floating "Ask Salty" button on the public site. */
export function SaltyLauncher() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  // Give focus back to the launcher when the chat closes
  useEffect(() => {
    if (wasOpen.current && !open) buttonRef.current?.focus();
    wasOpen.current = open;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {open ? (
        <div
          role="dialog"
          aria-label="Salty"
          className="fixed inset-0 z-50 sm:inset-auto sm:end-[max(1.25rem,env(safe-area-inset-right,0px))] sm:bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] sm:h-[min(40rem,calc(100dvh-2.5rem))] sm:w-[24rem]"
        >
          <Suspense fallback={<div className="grid h-full place-items-center rounded-3xl bg-night text-sand">{t.salty.thinking}</div>}>
            <SaltyChat variant="panel" onClose={() => setOpen(false)} />
          </Suspense>
        </div>
      ) : (
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setOpen(true)}
          className="fixed end-[max(1rem,env(safe-area-inset-right,0px))] bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] z-40 flex items-center gap-2 rounded-full border border-line bg-coal/95 py-2 ps-2 pe-4 font-bold text-cream shadow-[0_12px_30px_-8px_rgba(0,0,0,.7)] backdrop-blur transition-transform hover:-translate-y-0.5"
        >
          <SaltyMascot className="h-8 w-11" />
          {t.salty.open}
        </button>
      )}
    </>
  );
}
