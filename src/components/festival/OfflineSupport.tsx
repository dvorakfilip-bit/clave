"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { usePersonal } from "./PersonalContext";
import { useProgram } from "./ProgramContext";

/**
 * Offline režim (PRD 6.2): zaregistruje service worker, uloží dopředu hlavní stránky
 * festivalu a vybrané lekce a zobrazí lištu, když je zařízení bez připojení.
 */
export function OfflineSupport() {
  const { base, program } = useProgram();
  const { selected } = usePersonal();
  const { t } = useI18n();
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- stav připojení je známý až v prohlížeči
    setOffline(!navigator.onLine);
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  // Service worker jen v produkci – při vývoji by podstrkával staré verze stránek.
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
  }, []);

  // Vybrané lekce a jejich učitelé – jejich detail má fungovat i bez signálu.
  const selectedLessons = selected.filter((r) => r.kind === "lesson").map((r) => r.id);
  const lessonIds = selectedLessons.sort().join(",");
  const teacherIds = [...new Set(program.lessons.filter((l) => selectedLessons.includes(l.id)).flatMap((l) => l.teacherIds))].sort().join(",");

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator) || !navigator.onLine) return;
    const ids = (list: string) => list.split(",").filter(Boolean);
    const urls = [
      base,
      `${base}/muj-program`,
      `${base}/ucitele`,
      `${base}/vice`,
      ...ids(lessonIds).map((id) => `${base}/lekce/${id}`),
      ...ids(teacherIds).map((id) => `${base}/ucitele/${id}`),
    ];
    // Počkat, až se stránka načte, ať ukládání nebrzdí první zobrazení.
    const timer = setTimeout(() => {
      navigator.serviceWorker.ready.then((reg) => reg.active?.postMessage({ type: "precache", urls })).catch(() => undefined);
    }, 4000);
    return () => clearTimeout(timer);
  }, [base, lessonIds, teacherIds]);

  if (!offline) return null;
  return (
    <div role="status" className="bg-ink px-4 py-1.5 text-center text-xs text-page">
      {t("offlineBanner")}
    </div>
  );
}
