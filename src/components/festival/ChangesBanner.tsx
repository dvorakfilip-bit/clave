"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { formatDay } from "@/lib/time";
import { usePersonal } from "./PersonalContext";
import { useProgram } from "./ProgramContext";

/** Seznam změn ve vlastním programu od poslední návštěvy (PRD 5.3). */
export function ChangesBanner() {
  const { changed, acknowledgeChanges, error } = usePersonal();
  const { program, base, roomById, lessonStart } = useProgram();
  const { t, pick, locale } = useI18n();

  if (!changed.length && !error) return null;

  return (
    <div className="space-y-2 px-4 pt-3">
      {error && <p className="rounded-lg bg-accent-soft px-3 py-2 text-sm">{error}</p>}
      {changed.length > 0 && (
        <div className="rounded-xl border border-highlight bg-surface p-3">
          <p className="text-sm font-semibold">{t("changesTitle")}</p>
          <p className="mb-2 text-xs text-muted">{t("changesSince")}</p>
          <ul className="space-y-1 text-sm">
            {changed.map((ref) => {
              if (ref.kind === "lesson") {
                const l = program.lessons.find((x) => x.id === ref.id)!;
                const day = program.days.find((d) => d.id === l.dayId);
                return (
                  <li key={ref.id}>
                    <Link href={`${base}/lekce/${l.id}`} className="underline">
                      {pick(l.titleCs, l.titleEn)}
                    </Link>{" "}
                    <span className="text-muted">
                      — {l.cancelled ? t("cancelled").toLowerCase() : `${day ? formatDay(day.date, locale) : ""} ${lessonStart(l)}, ${roomById.get(l.roomId)?.name}`}
                    </span>
                  </li>
                );
              }
              const p = program.parties.find((x) => x.id === ref.id)!;
              return (
                <li key={ref.id}>
                  {pick(p.titleCs, p.titleEn)}{" "}
                  <span className="text-muted">— {p.cancelled ? t("cancelled").toLowerCase() : `${p.startsAt}, ${p.roomId ? roomById.get(p.roomId)?.name : p.place}`}</span>
                </li>
              );
            })}
          </ul>
          <button onClick={acknowledgeChanges} className="mt-3 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-on-brand">
            {t("understood")}
          </button>
        </div>
      )}
    </div>
  );
}
