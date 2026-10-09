"use client";

import { useState } from "react";
import { deleteLesson, saveLesson, setLessonCancelled } from "@/app/admin/actions";
import { LevelDots } from "@/components/LevelDots";
import type { FestivalProgram, Lesson } from "@/lib/types";
import { Button, ErrorText, Field, inputCls, LEVELS, Modal, useAction } from "./ui";

export function LessonForm({
  program,
  dayId,
  lesson,
  initialSlotId,
  initialRoomId,
  onClose,
}: {
  program: FestivalProgram;
  dayId: string;
  lesson?: Lesson;
  initialSlotId?: string;
  initialRoomId?: string;
  onClose: () => void;
}) {
  const slug = program.festival.slug;
  const { run, pending, error } = useAction();
  const [f, setF] = useState({
    dayId: lesson?.dayId ?? dayId,
    startSlotId: lesson?.startSlotId ?? initialSlotId ?? "",
    endSlotId: lesson?.endSlotId ?? initialSlotId ?? "",
    roomId: lesson?.roomId ?? initialRoomId ?? program.rooms[0]?.id ?? "",
    styleId: (lesson ? lesson.styleId : (program.styles[0]?.id ?? null)) as string | null,
    titleCs: lesson?.titleCs ?? "",
    titleEn: lesson?.titleEn ?? "",
    descriptionCs: lesson?.descriptionCs ?? "",
    descriptionEn: lesson?.descriptionEn ?? "",
    level: lesson?.level ?? 0,
    teacherIds: lesson?.teacherIds ?? [],
  });

  const slots = program.slots.filter((s) => s.dayId === f.dayId).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const startIndex = slots.findIndex((s) => s.id === f.startSlotId);

  function setStart(id: string) {
    const idx = slots.findIndex((s) => s.id === id);
    const endIdx = slots.findIndex((s) => s.id === f.endSlotId);
    setF({ ...f, startSlotId: id, endSlotId: endIdx >= idx ? f.endSlotId : id });
  }

  function toggleTeacher(id: string) {
    setF({ ...f, teacherIds: f.teacherIds.includes(id) ? f.teacherIds.filter((t) => t !== id) : [...f.teacherIds, id] });
  }

  return (
    <Modal title={lesson ? "Upravit lekci" : "Nová lekce"} onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          run((confirmed) => saveLesson(slug, { ...f, id: lesson?.id }, confirmed), onClose);
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Název (česky)">
            <input className={inputCls} value={f.titleCs} onChange={(e) => setF({ ...f, titleCs: e.target.value })} />
          </Field>
          <Field label="Název (anglicky)">
            <input className={inputCls} value={f.titleEn} onChange={(e) => setF({ ...f, titleEn: e.target.value })} />
          </Field>
          <Field label="Den">
            <select
              className={inputCls}
              value={f.dayId}
              onChange={(e) => setF({ ...f, dayId: e.target.value, startSlotId: "", endSlotId: "" })}
            >
              {program.days.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.date}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Místnost">
            <select className={inputCls} value={f.roomId} onChange={(e) => setF({ ...f, roomId: e.target.value })}>
              {[...program.rooms]
                .sort((a, b) => a.position - b.position)
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Začátek">
            <select className={inputCls} value={f.startSlotId} onChange={(e) => setStart(e.target.value)} required>
              <option value="">—</option>
              {slots.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.startsAt}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Konec" hint="Workshop může trvat více slotů.">
            <select className={inputCls} value={f.endSlotId} onChange={(e) => setF({ ...f, endSlotId: e.target.value })} required>
              <option value="">—</option>
              {slots.map((s, i) => (
                <option key={s.id} value={s.id} disabled={i < startIndex}>
                  {s.endsAt}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Styl">
            <select className={inputCls} value={f.styleId ?? ""} onChange={(e) => setF({ ...f, styleId: e.target.value || null })}>
              <option value="">— bez stylu —</option>
              {program.styles.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Level" hint="Prázdná kolečka = nejlehčí / pro všechny úrovně.">
            <div className="flex flex-wrap gap-1">
              {LEVELS.map((lv) => (
                <button
                  type="button"
                  key={lv}
                  onClick={() => setF({ ...f, level: lv })}
                  aria-pressed={f.level === lv}
                  className={`rounded-md border px-1.5 py-1 ${f.level === lv ? "border-brand bg-brand text-on-brand" : "border-line"}`}
                >
                  <LevelDots level={lv} />
                </button>
              ))}
            </div>
          </Field>
        </div>

        <Field label="Učitelé">
          <div className="flex flex-wrap gap-1.5">
            {program.teachers.map((t) => (
              <button
                type="button"
                key={t.id}
                onClick={() => toggleTeacher(t.id)}
                aria-pressed={f.teacherIds.includes(t.id)}
                className={`rounded-full border px-3 py-1 text-xs ${f.teacherIds.includes(t.id) ? "border-brand bg-brand text-on-brand" : "border-line"}`}
              >
                {t.name}
              </button>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Popis (česky)">
            <textarea className={inputCls} rows={2} value={f.descriptionCs} onChange={(e) => setF({ ...f, descriptionCs: e.target.value })} />
          </Field>
          <Field label="Popis (anglicky)">
            <textarea className={inputCls} rows={2} value={f.descriptionEn} onChange={(e) => setF({ ...f, descriptionEn: e.target.value })} />
          </Field>
        </div>

        <ErrorText error={error} />

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary" disabled={pending}>
            Uložit
          </Button>
          {lesson && (
            <>
              <Button type="button" disabled={pending} onClick={() => run(() => setLessonCancelled(slug, lesson.id, !lesson.cancelled), onClose)}>
                {lesson.cancelled ? "Obnovit lekci" : "Zrušit lekci"}
              </Button>
              <Button
                type="button"
                variant="danger"
                disabled={pending}
                onClick={() => {
                  if (window.confirm("Smazat lekci? Zmizí i z osobních programů účastníků. Pokud se jen nekoná, použij raději Zrušit lekci.")) {
                    run(() => deleteLesson(slug, lesson.id), onClose);
                  }
                }}
              >
                Smazat
              </Button>
            </>
          )}
        </div>
      </form>
    </Modal>
  );
}
