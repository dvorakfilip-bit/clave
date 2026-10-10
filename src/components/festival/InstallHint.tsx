"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Android/Chrome posílá nabídku instalace jen jednou hned po načtení – zachytíme ji co nejdřív.
let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    listeners.forEach((l) => l());
  });
}

/** Návod „Přidat na plochu“: tlačítko na Androidu, postup na iPhonu (PRD 6.1). */
export function InstallHint() {
  const { t } = useI18n();
  const [mode, setMode] = useState<"hidden" | "android" | "ios">("hidden");

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone;
    if (standalone) return;
    const update = () => setMode(deferred ? "android" : /iphone|ipad|ipod/i.test(navigator.userAgent) ? "ios" : "hidden");
    update();
    listeners.add(update);
    return () => {
      listeners.delete(update);
    };
  }, []);

  if (mode === "hidden") return null;

  return (
    <section className="rounded-xl border border-line bg-surface p-3 text-sm">
      <h2 className="font-semibold">{t("installTitle")}</h2>
      <p className="mt-1 text-muted">{t("installText")}</p>
      {mode === "android" ? (
        <button
          onClick={async () => {
            if (!deferred) return;
            await deferred.prompt();
            await deferred.userChoice;
            deferred = null;
            setMode("hidden");
          }}
          className="mt-3 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-on-brand"
        >
          {t("installButton")}
        </button>
      ) : (
        <p className="mt-2">{t("installIos")}</p>
      )}
    </section>
  );
}
