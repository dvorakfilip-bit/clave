"use client";

import Link from "next/link";
import { LevelDots } from "@/components/LevelDots";
import { useI18n } from "@/lib/i18n";
import type { Lesson } from "@/lib/types";
import { useProgram } from "./ProgramContext";

export function LessonCard({
  lesson,
  showTime = false,
  showRoom = false,
  live = false,
  dimmed = false,
  className = "",
}: {
  lesson: Lesson;
  showTime?: boolean;
  showRoom?: boolean;
  live?: boolean;
  dimmed?: boolean;
  className?: string;
}) {
  const { base, styleById, teacherById, roomById, lessonStart, lessonEnd } = useProgram();
  const { t, pick } = useI18n();
  const style = lesson.styleId ? styleById.get(lesson.styleId) : undefined;
  const teachers = lesson.teacherIds.map((id) => teacherById.get(id)?.name).filter(Boolean);
  const title = pick(lesson.titleCs, lesson.titleEn);

  return (
    <Link
      href={`${base}/lekce/${lesson.id}`}
      data-style={lesson.styleId ?? undefined}
      className={`lesson-card relative flex h-full flex-col rounded-lg p-2 text-left transition-opacity ${
        live ? "ring-2 ring-highlight" : ""
      } ${dimmed ? "opacity-25" : ""} ${className}`}
    >
      <span className="flex items-center gap-1 text-[10px] leading-tight">
        <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: "var(--style)" }} />
        <span className="truncate">
          {showTime && `${lessonStart(lesson)}–${lessonEnd(lesson)} · `}
          {showRoom && `${roomById.get(lesson.roomId)?.name} · `}
          {style?.name}
        </span>
      </span>
      <span className={`mt-1 text-[12px] font-semibold leading-snug ${lesson.cancelled ? "line-through opacity-70" : ""}`}>
        {title}
      </span>
      <span className="text-[11px] leading-snug">{teachers.join(", ")}</span>
      <span className="mt-auto flex items-center justify-between pt-1">
        <LevelDots level={lesson.level} label={lesson.level === 0 ? t("allLevels") : undefined} />
        {lesson.cancelled && (
          <span className="rounded bg-highlight px-1 text-[9px] font-semibold uppercase text-on-highlight">{t("cancelled")}</span>
        )}
      </span>
    </Link>
  );
}
