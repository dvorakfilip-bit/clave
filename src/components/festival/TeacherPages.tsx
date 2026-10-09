"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { formatDay } from "@/lib/time";
import { LessonCard } from "./LessonCard";
import { PageHeader } from "./PageHeader";
import { useProgram } from "./ProgramContext";
import { TeacherAvatar } from "./TeacherAvatar";

export function TeacherList() {
  const { program, base } = useProgram();
  const { t, count: plural } = useI18n();
  return (
    <div>
      <h1 className="px-4 py-3 text-lg font-semibold">{t("teachers")}</h1>
      <ul className="mx-4 divide-y divide-line rounded-xl border border-line bg-surface">
        {program.teachers.map((teacher) => {
          const count = program.lessons.filter((l) => l.teacherIds.includes(teacher.id)).length;
          return (
            <li key={teacher.id}>
              <Link href={`${base}/ucitele/${teacher.id}`} className="flex items-center gap-3 p-3">
                <TeacherAvatar teacher={teacher} />
                <span className="flex-1 font-medium">{teacher.name}</span>
                <span className="text-xs text-muted">{plural(count, "lesson")}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function TeacherDetail() {
  const { id } = useParams<{ id: string }>();
  const { program, base, teacherById, lessonStart } = useProgram();
  const { t, pick, locale } = useI18n();
  const teacher = teacherById.get(id);
  if (!teacher) return <PageHeader title="404" fallbackHref={`${base}/ucitele`} />;

  const lessons = program.lessons
    .filter((l) => l.teacherIds.includes(id))
    .sort((a, b) => {
      const da = program.days.findIndex((d) => d.id === a.dayId);
      const db = program.days.findIndex((d) => d.id === b.dayId);
      return da - db || lessonStart(a).localeCompare(lessonStart(b));
    });
  const bio = pick(teacher.bioCs, teacher.bioEn);

  return (
    <div>
      <PageHeader title={teacher.name} fallbackHref={`${base}/ucitele`} share />
      <div className="space-y-5 px-4">
        <div className="flex items-start gap-4">
          <TeacherAvatar teacher={teacher} size={80} />
          {bio && <p className="whitespace-pre-line text-sm leading-relaxed">{bio}</p>}
        </div>
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{t("lessonsOf")}</h2>
          <div className="space-y-3">
            {program.days.map((day) => {
              const ofDay = lessons.filter((l) => l.dayId === day.id);
              if (!ofDay.length) return null;
              return (
                <div key={day.id}>
                  <h3 className="mb-1 text-xs font-medium capitalize text-muted">{formatDay(day.date, locale)}</h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {ofDay.map((l) => (
                      <LessonCard key={l.id} lesson={l} showTime showRoom />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
