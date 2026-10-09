"use client";

import Link from "next/link";
import { LevelDots } from "@/components/LevelDots";
import { useI18n } from "@/lib/i18n";
import type { Lesson } from "@/lib/types";
import { HeartButton } from "./HeartButton";
import { usePersonal } from "./PersonalContext";
import { useProgram } from "./ProgramContext";

export function LessonCard({
  lesson,
  showTime = false,
  showRoom = false,
  live = false,
  dimmed = false,
  conflict = false,
  className = "",
}: {
  lesson: Lesson;
  showTime?: boolean;
  showRoom?: boolean;
  live?: boolean;
  dimmed?: boolean;
  conflict?: boolean;
  className?: string;
}) {
  const { base, styleById, teacherById, roomById, lessonStart, lessonEnd } = useProgram();
  const { isChanged } = usePersonal();
  const { t, pick } = useI18n();
  const style = lesson.styleId ? styleById.get(lesson.styleId) : undefined;
  const teachers = lesson.teacherIds.map((id) => teacherById.get(id)?.name).filter(Boolean);
  const title = pick(lesson.titleCs, lesson.titleEn);
  const changed = isChanged({ kind: "lesson", id: lesson.id });

  return (
    <div
      data-style={lesson.styleId ?? undefined}
      className={`lesson-card relative h-full rounded-lg transition-opacity ${live ? "ring-2 ring-highlight" : ""} ${dimmed ? "opacity-25" : ""} ${className}`}
    >
      <Link href={`${base}/lekce/${lesson.id}`} className="flex h-full flex-col p-2 pb-7 text-left">
        <span className="flex items-center gap-1 pr-10 text-[10px] leading-tight">
          <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: "var(--style)" }} />
          <span className="truncate">
            {showTime && `${lessonStart(lesson)}–${lessonEnd(lesson)} · `}
            {showRoom && `${roomById.get(lesson.roomId)?.name} · `}
            {style?.name}
          </span>
        </span>
        <span className={`mt-1 text-[12px] font-semibold leading-snug ${lesson.cancelled ? "line-through opacity-70" : ""}`}>{title}</span>
        <span className="text-[11px] leading-snug">{teachers.join(", ")}</span>
      </Link>
      {(changed || lesson.cancelled || conflict) && (
        <span className="pointer-events-none absolute right-1 top-1 flex flex-col items-end gap-0.5">
          {lesson.cancelled && <Badge>{t("cancelled")}</Badge>}
          {changed && !lesson.cancelled && <Badge>{t("changed")}</Badge>}
          {conflict && <Badge outline>{t("conflict")}</Badge>}
        </span>
      )}
      <span className="pointer-events-none absolute bottom-1.5 left-2">
        <LevelDots level={lesson.level} label={lesson.level === 0 ? t("allLevels") : undefined} />
      </span>
      <HeartButton item={{ kind: "lesson", id: lesson.id }} size={16} className="absolute bottom-1 right-1 p-0.5" />
    </div>
  );
}

export function Badge({ children, outline = false }: { children: React.ReactNode; outline?: boolean }) {
  return (
    <span
      className={`rounded px-1 text-[9px] font-semibold uppercase leading-[14px] ${
        outline ? "border border-highlight bg-surface text-highlight" : "bg-highlight text-on-highlight"
      }`}
    >
      {children}
    </span>
  );
}
