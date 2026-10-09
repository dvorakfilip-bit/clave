"use client";

import Link from "next/link";
import { useState } from "react";
import { LevelDots } from "@/components/LevelDots";
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
  const [dayId, setDayId] = useState(program.days[0]?.id ?? "");
  const [editing, setEditing] = useState<Editing>(null);
  const base = `/admin/${program.festival.slug}`;

  const slots = program.slots.filter((s) => s.dayId === dayId).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const rooms = [...program.rooms].sort((a, b) => a.position - b.position);
  const lessons = program.lessons.filter((l) => l.dayId === dayId);
  const parties = program.parties.filter((p) => p.dayId === dayId);
  const styleById = new Map(program.styles.map((s) => [s.id, s]));
  const teacherById = new Map(program.teachers.map((t) => [t.id, t]));
  const slotIndex = new Map(slots.map((s, i) => [s.id, i]));

  const missing = [
    !program.slots.length && { href: `${base}/casy`, label: "časové sloty" },
    !program.rooms.length && { href: `${base}/mistnosti`, label: "místnosti" },
    !program.teachers.length && { href: `${base}/ucitele`, label: "učitele" },
  ].filter(Boolean) as { href: string; label: string }[];

  if (missing.length) {
    return (
      <Card>
        <p className="text-sm">
          Než začneš zadávat lekce, doplň:{" "}
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

  const startAt = new Map<string, Lesson>();
  const covered = new Set<string>();
  for (const l of lessons) {
    const from = slotIndex.get(l.startSlotId) ?? 0;
    const to = slotIndex.get(l.endSlotId) ?? from;
    startAt.set(`${from}:${l.roomId}`, l);
    for (let i = from + 1; i <= to; i++) covered.add(`${i}:${l.roomId}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {program.days.map((d) => (
          <button
            key={d.id}
            onClick={() => setDayId(d.id)}
            className={`rounded-full px-3 py-1.5 text-xs capitalize ${d.id === dayId ? "bg-brand text-on-brand" : "border border-line"}`}
          >
            {formatDayLong(d.date, "cs")}
          </button>
        ))}
      </div>

      {slots.length === 0 ? (
        <p className="text-sm text-muted">
          Tento den nemá časové sloty.{" "}
          <Link href={`${base}/casy`} className="underline">
            Přidat sloty
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
                const lesson = startAt.get(key);
                const pos = { gridRow: si + 2, gridColumn: ri + 2 };
                if (!lesson) {
                  return (
                    <button
                      key={key}
                      style={pos}
                      onClick={() => setEditing({ kind: "lesson", slotId: slot.id, roomId: room.id })}
                      className="min-h-[76px] rounded-lg border border-dashed border-line text-xl text-muted hover:bg-surface"
                      aria-label={`Nová lekce ${slot.startsAt}, ${room.name}`}
                    >
                      +
                    </button>
                  );
                }
                const style = lesson.styleId ? styleById.get(lesson.styleId) : undefined;
                const span = (slotIndex.get(lesson.endSlotId) ?? si) - si + 1;
                return (
                  <button
                    key={key}
                    style={{ ...pos, gridRow: `${si + 2} / span ${span}` }}
                    onClick={() => setEditing({ kind: "lesson", lesson })}
                    className="min-h-[76px] rounded-lg border border-line bg-surface p-2 text-left text-xs"
                  >
                    <span className="flex items-center gap-1 text-[10px] text-muted">
                      <span className="h-2 w-2 rounded-full" style={{ background: style?.color ?? "#999" }} />
                      {style?.name ?? "bez stylu"}
                    </span>
                    <span className={`mt-1 block font-semibold ${lesson.cancelled ? "line-through" : ""}`}>{lesson.titleCs ?? lesson.titleEn}</span>
                    <span className="block text-muted">{lesson.teacherIds.map((id) => teacherById.get(id)?.name).join(", ")}</span>
                    <span className="mt-1 flex items-center justify-between">
                      <LevelDots level={lesson.level} />
                      {lesson.cancelled && <span className="text-[10px] font-semibold uppercase text-highlight">Zrušeno</span>}
                    </span>
                  </button>
                );
              }),
            ])}
          </div>
        </div>
      )}

      <Card title="Párty" actions={<Button onClick={() => setEditing({ kind: "party" })}>Přidat párty</Button>}>
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
          <p className="text-sm text-muted">Tento den nemá žádnou párty.</p>
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
