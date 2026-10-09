"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { LevelDots } from "@/components/LevelDots";
import { useI18n } from "@/lib/i18n";
import { formatDayLong } from "@/lib/time";
import { HeartButton } from "./HeartButton";
import { PageHeader } from "./PageHeader";
import { usePersonal } from "./PersonalContext";
import { useProgram } from "./ProgramContext";
import { TeacherAvatar } from "./TeacherAvatar";

export function LessonDetail() {
  const { id } = useParams<{ id: string }>();
  const { program, base, styleById, roomById, teacherById, lessonStart, lessonEnd } = useProgram();
  const { t, pick, locale } = useI18n();
  const { isSelected, conflictsOf, titleOf } = usePersonal();
  const lesson = program.lessons.find((l) => l.id === id);

  if (!lesson) {
    return <PageHeader title="404" fallbackHref={base} />;
  }

  const style = lesson.styleId ? styleById.get(lesson.styleId) : undefined;
  const day = program.days.find((d) => d.id === lesson.dayId);
  const description = pick(lesson.descriptionCs, lesson.descriptionEn);

  return (
    <div>
      <PageHeader title={pick(lesson.titleCs, lesson.titleEn)} fallbackHref={base} share />
      <div className="space-y-4 px-4">
        <div data-style={lesson.styleId ?? undefined} className="lesson-card rounded-xl p-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--style)" }} />
            {style?.name}
            {lesson.cancelled && (
              <span className="ml-auto rounded bg-highlight px-1.5 text-[10px] font-semibold uppercase text-on-highlight">
                {t("cancelled")}
              </span>
            )}
          </div>
          <p className={`mt-2 text-xl font-semibold ${lesson.cancelled ? "line-through" : ""}`}>{pick(lesson.titleCs, lesson.titleEn)}</p>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="opacity-75">{day && formatDayLong(day.date, locale)}</dt>
            <dd className="tabular-nums">
              {lessonStart(lesson)}–{lessonEnd(lesson)}
            </dd>
            <dt className="opacity-75">{t("room")}</dt>
            <dd>{roomById.get(lesson.roomId)?.name}</dd>
            <dt className="opacity-75">{t("level")}</dt>
            <dd className="flex items-center gap-2">
              <LevelDots level={lesson.level} size={12} />
              {lesson.level === 0 && <span className="text-xs">{t("allLevels")}</span>}
            </dd>
          </dl>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <HeartButton item={{ kind: "lesson", id: lesson.id }} size={22} withLabel className="rounded-lg border border-line bg-surface px-3 py-2 !opacity-100" />
          {isSelected({ kind: "lesson", id: lesson.id }) && conflictsOf({ kind: "lesson", id: lesson.id }).length > 0 && (
            <span className="text-xs text-highlight">
              {t("conflictWith")}{" "}
              {conflictsOf({ kind: "lesson", id: lesson.id }).map(titleOf).join(", ")}
            </span>
          )}
        </div>

        {description && <p className="whitespace-pre-line text-sm leading-relaxed">{description}</p>}

        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{t("teachers")}</h2>
          <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
            {lesson.teacherIds.map((tid) => {
              const teacher = teacherById.get(tid);
              if (!teacher) return null;
              return (
                <li key={tid}>
                  <Link href={`${base}/ucitele/${tid}`} className="flex items-center gap-3 p-3">
                    <TeacherAvatar teacher={teacher} />
                    <span className="font-medium">{teacher.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
