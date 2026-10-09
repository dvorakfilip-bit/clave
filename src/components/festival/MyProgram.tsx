"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoonIcon } from "@/components/icons";
import { useI18n } from "@/lib/i18n";
import { crossesMidnight, formatDayLong } from "@/lib/time";
import { ChangesBanner } from "./ChangesBanner";
import { HeartButton } from "./HeartButton";
import { Badge, LessonCard } from "./LessonCard";
import { usePersonal } from "./PersonalContext";
import { useProgram } from "./ProgramContext";

/** Můj program – vybrané lekce a párty po dnech (PRD 5.2). */
export function MyProgram() {
  const { program, lessonStart, roomById } = useProgram();
  const { user, selected, conflictsOf, isChanged } = usePersonal();
  const { t, pick, locale } = useI18n();
  const pathname = usePathname();

  if (user === undefined) return <p className="px-4 py-10 text-center text-sm text-muted">{t("loading")}</p>;

  if (!user) {
    return (
      <div className="px-4 py-10 text-center">
        <h1 className="text-lg font-semibold">{t("myProgram")}</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted">{t("signInToSave")}</p>
        <Link
          href={`/prihlaseni?next=${encodeURIComponent(pathname)}`}
          className="mt-4 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-on-brand"
        >
          {t("signIn")}
        </Link>
      </div>
    );
  }

  const lessonIds = new Set(selected.filter((r) => r.kind === "lesson").map((r) => r.id));
  const partyIds = new Set(selected.filter((r) => r.kind === "party").map((r) => r.id));

  return (
    <div>
      <h1 className="px-4 pt-3 text-lg font-semibold">{t("myProgram")}</h1>
      <ChangesBanner />
      {selected.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted">{t("myProgramEmpty")}</p>
      ) : (
        <div className="space-y-5 px-4 py-3">
          {program.days.map((day) => {
            const lessons = program.lessons
              .filter((l) => l.dayId === day.id && lessonIds.has(l.id))
              .sort((a, b) => lessonStart(a).localeCompare(lessonStart(b)));
            const parties = program.parties.filter((p) => p.dayId === day.id && partyIds.has(p.id));
            if (!lessons.length && !parties.length) return null;
            return (
              <section key={day.id}>
                <h2 className="mb-2 text-sm font-semibold capitalize">{formatDayLong(day.date, locale)}</h2>
                <div className="grid gap-2 sm:grid-cols-2">
                  {lessons.map((l) => (
                    <LessonCard
                      key={l.id}
                      lesson={l}
                      showTime
                      showRoom
                      conflict={!l.cancelled && conflictsOf({ kind: "lesson", id: l.id }).length > 0}
                    />
                  ))}
                </div>
                {parties.map((p) => (
                  <div key={p.id} className="mt-2 flex items-center gap-2 rounded-lg bg-accent-soft px-3 py-2 text-sm">
                    <span className="text-accent">
                      <MoonIcon />
                    </span>
                    <span className={`tabular-nums ${p.cancelled ? "line-through" : ""}`}>
                      {p.startsAt}
                      {p.endsAt && `–${p.endsAt}`}
                      {crossesMidnight(p.startsAt, p.endsAt) && ` (${t("nextDay")})`}
                    </span>
                    <span className={`flex-1 ${p.cancelled ? "line-through" : ""}`}>
                      {pick(p.titleCs, p.titleEn)} · {p.roomId ? roomById.get(p.roomId)?.name : p.place}
                    </span>
                    {p.cancelled && <Badge>{t("cancelled")}</Badge>}
                    {!p.cancelled && isChanged({ kind: "party", id: p.id }) && <Badge>{t("changed")}</Badge>}
                    <HeartButton item={{ kind: "party", id: p.id }} />
                  </div>
                ))}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
