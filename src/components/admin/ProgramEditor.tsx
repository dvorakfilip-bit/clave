"use client";

import Link from "next/link";
import { useState } from "react";
import { LevelDots } from "@/components/LevelDots";
import { useI18n } from "@/lib/i18n";
import { layoutGrid } from "@/lib/grid";
import { crossesMidnight, formatDayLong } from "@/lib/time";
import type { FestivalProgram, Lesson, Party } from "@/lib/types";
import { LessonForm } from "./LessonForm";
import { PartyForm } from "./PartyForm";
import { Button, Card } from "./ui";

type Editing =
  | { kind: "lesson"; lesson?: Lesson; slotId?: string; roomId?: string }
  | { kind: "party"; party?: Party }
  | null;

/** Mřížka pro organizátora: klik na prázdnou buňku = nová lekce, klik na lekci = úprava. */
export function ProgramEditor({ program }: { program: FestivalProgram }) {
  const { locale, tr } = useI18n();
  const [dayId, setDayId] = useState(program.days[0]?.id ?? "");
  const [editing, setEditing] = useState<Editing>(null);
  const base = `/admin/${program.festival.slug}`;

  const slots = program.slots.filter((s) => s.dayId === dayId).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const rooms = [...program.rooms].sort((a, b) => a.position - b.position);
  const lessons = program.lessons.filter((l) => l.dayId === dayId);
  const parties = program.parties.filter((p) => p.dayId === dayId);
  const styleById = new Map(program.styles.map((s) => [s.id, s]));
  const teacherById = new Map(program.teachers.map((t) => [t.id, t]));

  const missing = [
    !program.slots.length && { href: `${base}/casy`, label: tr("časové sloty", "time slots") },
    !program.rooms.length && { href: `${base}/mistnosti`, label: tr("místnosti", "rooms") },
    !program.teachers.length && { href: `${base}/ucitele`, label: tr("učitele", "teachers") },
  ].filter(Boolean) as { href: string; label: string }[];

  if (missing.length) {
    return (
      <Card>
        <p className="text-sm">
          {tr("Než začneš zadávat lekce, doplň:", "Before adding classes, set up:")}{" "}
          {missing.map((m, i) => (
            <span key={m.href}>
              {i > 0 && ", "}
              <Link href={m.href} className="underline">
                {m.label}
              </Link>
            </span>
          ))}
          .
        </p>
      </Card>
    );
  }

  const { cells, covered } = layoutGrid(lessons, slots);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {program.days.map((d) => (
          <button
            key={d.id}
            onClick={() => setDayId(d.id)}
            className={`rounded-full px-3 py-1.5 text-xs capitalize ${d.id === dayId ? "bg-brand text-on-brand" : "border border-line"}`}
          >
            {formatDayLong(d.date, locale)}
          </button>
        ))}
      </div>

      {slots.length === 0 ? (
        <p className="text-sm text-muted">
          {tr("Tento den nemá časové sloty.", "This day has no time slots.")}{" "}
          <Link href={`${base}/casy`} className="underline">
            {tr("Přidat sloty", "Add time slots")}
          </Link>
        </p>
      ) : (
        <div className="overflow-x-auto">
          <div className="grid gap-1" style={{ gridTemplateColumns: `52px repeat(${rooms.length}, minmax(130px, 1fr))`, minWidth: 52 + rooms.length * 134 }}>
            <div />
            {rooms.map((r) => (
              <div key={r.id} className="truncate pb-1 text-center text-xs font-semibold text-muted">
                {r.name}
              </div>
            ))}
            {slots.map((slot, si) => [
              <div key={slot.id} className="pt-1 text-xs tabular-nums text-muted" style={{ gridRow: si + 2, gridColumn: 1 }}>
                {slot.startsAt}
                <br />
                {slot.endsAt}
              </div>,
              ...rooms.map((room, ri) => {
                const key = `${si}:${room.id}`;
                if (covered.has(key)) return null;
                const cell = cells.get(key);
                const pos = { gridRow: si + 2, gridColumn: ri + 2 };
                if (!cell) {
                  return (
                    <button
                      key={key}
                      style={pos}
                      onClick={() => setEditing({ kind: "lesson", slotId: slot.id, roomId: room.id })}
                      className="min-h-[76px] rounded-lg border border-dashed border-line text-xl text-muted hover:bg-surface"
                      aria-label={`${tr("Nová lekce", "New class")} ${slot.startsAt}, ${room.name}`}
                    >
                      +
                    </button>
                  );
                }
                const { lesson, replaced } = cell;
                const style = lesson.styleId ? styleById.get(lesson.styleId) : undefined;
                return (
                  <div key={key} style={{ ...pos, gridRow: `${si + 2} / span ${cell.span}` }} className="flex min-h-[76px] flex-col gap-1">
                  <button
                    onClick={() => setEditing({ kind: "lesson", lesson })}
                    className="flex-1 rounded-lg border border-line bg-surface p-2 text-left text-xs"
                  >
                    <span className="flex items-center gap-1 text-[10px] text-muted">
                      <span className="h-2 w-2 rounded-full" style={{ background: style?.color ?? "#999" }} />
                      {style?.name ?? tr("bez stylu", "no style")}
                    </span>
                    <span className={`mt-1 block font-semibold ${lesson.cancelled ? "line-through" : ""}`}>{lesson.titleCs ?? lesson.titleEn}</span>
                    <span className="block text-muted">{lesson.teacherIds.map((id) => teacherById.get(id)?.name).join(", ")}</span>
                    <span className="mt-1 flex items-center justify-between">
                      <LevelDots level={lesson.level} />
                      {lesson.cancelled && <span className="text-[10px] font-semibold uppercase text-highlight">{tr("Zrušeno", "Cancelled")}</span>}
                    </span>
                  </button>
                  {replaced.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setEditing({ kind: "lesson", lesson: r })}
                      className="truncate rounded-md border border-line px-2 py-0.5 text-left text-[10px] text-muted"
                    >
                      <span className="font-semibold uppercase">{tr("Zrušeno", "Cancelled")}:</span> <span className="line-through">{r.titleCs ?? r.titleEn}</span>
                    </button>
                  ))}
                  {lesson.cancelled && (
                    // Na místo zrušené lekce lze dát náhradu.
                    <button
                      onClick={() => setEditing({ kind: "lesson", slotId: slot.id, roomId: room.id })}
                      className="rounded-md border border-dashed border-line py-0.5 text-xs text-muted hover:bg-surface"
                    >
                      + {tr("Náhradní lekce", "Replacement class")}
                    </button>
                  )}
                  </div>
                );
              }),
            ])}
          </div>
        </div>
      )}

      <Card title={tr("Párty", "Parties")} actions={<Button onClick={() => setEditing({ kind: "party" })}>{tr("Přidat párty", "Add party")}</Button>}>
        {parties.length ? (
          <ul className="divide-y divide-line">
            {parties.map((p) => (
              <li key={p.id}>
                <button onClick={() => setEditing({ kind: "party", party: p })} className="flex w-full items-center gap-3 py-2 text-left text-sm">
                  <span className="tabular-nums">
                    {p.startsAt}
                    {p.endsAt && `–${p.endsAt}`}
                    {crossesMidnight(p.startsAt, p.endsAt) && " (+1)"}
                  </span>
                  <span className={`flex-1 font-medium ${p.cancelled ? "line-through" : ""}`}>{p.titleCs ?? p.titleEn}</span>
                  <span className="text-muted">{p.roomId ? program.rooms.find((r) => r.id === p.roomId)?.name : p.place}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">{tr("Tento den nemá žádnou párty.", "This day has no parties.")}</p>
        )}
      </Card>

      {editing?.kind === "lesson" && (
        <LessonForm
          program={program}
          dayId={dayId}
          lesson={editing.lesson}
          initialSlotId={editing.slotId}
          initialRoomId={editing.roomId}
          onClose={() => setEditing(null)}
        />
      )}
      {editing?.kind === "party" && <PartyForm program={program} dayId={dayId} party={editing.party} onClose={() => setEditing(null)} />}
    </div>
  );
}
