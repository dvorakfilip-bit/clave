"use client";

import { useState } from "react";
import { copySlots, deleteSlot, generateSlots, saveSlot } from "@/app/admin/actions";
import { generateSlotTimes } from "@/lib/admin/slots";
import { useI18n } from "@/lib/i18n";
import { formatDayLong } from "@/lib/time";
import { csCount } from "@/lib/plural";
import type { FestivalProgram } from "@/lib/types";
import { Button, Card, ErrorText, Field, inputCls, useAction } from "./ui";

/** Časový rámec: sloty pro každý den, generátor a kopie z jiného dne (PRD 5.4). */
export function SlotsEditor({ program }: { program: FestivalProgram }) {
  const slug = program.festival.slug;
  const [dayId, setDayId] = useState(program.days[0]?.id ?? "");
  const { run, pending, error } = useAction();
  const { locale, tr } = useI18n();
  const slots = program.slots.filter((s) => s.dayId === dayId).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const used = new Set(program.lessons.flatMap((l) => [l.startSlotId, l.endSlotId]));

  const [gen, setGen] = useState({ start: "10:00", minutes: 60, pause: 10, count: 6 });
  const preview = generateSlotTimes(gen.start, gen.minutes, gen.pause, gen.count);
  const [copyFrom, setCopyFrom] = useState("");
  const [manual, setManual] = useState({ startsAt: "", endsAt: "" });

  if (!program.days.length) return <p className="text-sm text-muted">{tr("Nejdřív v Nastavení vyplň termín festivalu.", "First set the festival dates in Settings.")}</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {program.days.map((d) => {
          const count = program.slots.filter((s) => s.dayId === d.id).length;
          return (
            <button
              key={d.id}
              onClick={() => setDayId(d.id)}
              className={`rounded-full px-3 py-1.5 text-xs capitalize ${d.id === dayId ? "bg-brand text-on-brand" : "border border-line"}`}
            >
              {formatDayLong(d.date, locale)} ({count})
            </button>
          );
        })}
      </div>

      <ErrorText error={error} />

      <div className="grid gap-4 md:grid-cols-2">
        <Card title={tr("Sloty dne", "Time slots of the day")}>
          {slots.length ? (
            <ul className="divide-y divide-line">
              {slots.map((s) => (
                <li key={s.id} className="flex items-center justify-between py-2 text-sm tabular-nums">
                  {s.startsAt}–{s.endsAt}
                  <Button
                    variant="ghost"
                    disabled={pending || used.has(s.id)}
                    title={used.has(s.id) ? tr("Ve slotu jsou lekce", "The time slot has classes") : tr("Smazat slot", "Delete time slot")}
                    onClick={() => run(() => deleteSlot(slug, s.id))}
                  >
                    {tr("Smazat", "Delete")}
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">{tr("Den zatím nemá žádné sloty.", "This day has no time slots yet.")}</p>
          )}
          <form
            className="mt-3 flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => saveSlot(slug, { dayId, ...manual }), () => setManual({ startsAt: "", endsAt: "" }));
            }}
          >
            <Field label={tr("Od", "From")}>
              <input type="time" className={inputCls} value={manual.startsAt} onChange={(e) => setManual({ ...manual, startsAt: e.target.value })} required />
            </Field>
            <Field label={tr("Do", "To")}>
              <input type="time" className={inputCls} value={manual.endsAt} onChange={(e) => setManual({ ...manual, endsAt: e.target.value })} required />
            </Field>
            <Button disabled={pending}>{tr("Přidat", "Add")}</Button>
          </form>
        </Card>

        <div className="space-y-4">
          <Card title={tr("Vygenerovat sloty", "Generate time slots")}>
            <form
              className="grid grid-cols-2 gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                run(() => generateSlots(slug, dayId, gen));
              }}
            >
              <Field label={tr("Začátek", "Start")}>
                <input type="time" className={inputCls} value={gen.start} onChange={(e) => setGen({ ...gen, start: e.target.value })} required />
              </Field>
              <Field label={tr("Délka lekce (min)", "Class length (min)")}>
                <input type="number" min={5} className={inputCls} value={gen.minutes} onChange={(e) => setGen({ ...gen, minutes: Number(e.target.value) })} />
              </Field>
              <Field label={tr("Pauza (min)", "Break (min)")}>
                <input type="number" min={0} className={inputCls} value={gen.pause} onChange={(e) => setGen({ ...gen, pause: Number(e.target.value) })} />
              </Field>
              <Field label={tr("Počet", "Count")}>
                <input type="number" min={1} max={30} className={inputCls} value={gen.count} onChange={(e) => setGen({ ...gen, count: Number(e.target.value) })} />
              </Field>
              <p className="col-span-2 text-xs text-muted tabular-nums">
                {preview.map((p) => `${p.startsAt}–${p.endsAt}`).join(", ")}
              </p>
              <Button variant="primary" className="col-span-2" disabled={pending || !preview.length}>
                {locale === "cs"
                  ? `Přidat ${csCount(preview.length, ["slot", "sloty", "slotů"])}`
                  : `Add ${preview.length} time slot${preview.length === 1 ? "" : "s"}`}
              </Button>
            </form>
          </Card>

          <Card title={tr("Zkopírovat z jiného dne", "Copy from another day")}>
            <form
              className="flex items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (copyFrom) run(() => copySlots(slug, copyFrom, dayId));
              }}
            >
              <Field label={tr("Zdrojový den", "Source day")}>
                <select className={inputCls} value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)}>
                  <option value="">{tr("Vyber den…", "Choose a day…")}</option>
                  {program.days
                    .filter((d) => d.id !== dayId)
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {formatDayLong(d.date, locale)}
                      </option>
                    ))}
                </select>
              </Field>
              <Button disabled={pending || !copyFrom || slots.length > 0}>{tr("Kopírovat", "Copy")}</Button>
            </form>
            {slots.length > 0 && <p className="mt-2 text-xs text-muted">{tr("Kopírovat lze jen do dne bez slotů.", "You can only copy to a day without time slots.")}</p>}
          </Card>
        </div>
      </div>
    </div>
  );
}
