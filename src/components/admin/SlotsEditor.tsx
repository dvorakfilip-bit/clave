"use client";

import { useState } from "react";
import { copySlots, deleteSlot, generateSlots, saveSlot } from "@/app/admin/actions";
import { generateSlotTimes } from "@/lib/admin/slots";
import { formatDayLong } from "@/lib/time";
import { csCount } from "@/lib/plural";
import type { FestivalProgram } from "@/lib/types";
import { Button, Card, ErrorText, Field, inputCls, useAction } from "./ui";

/** Časový rámec: sloty pro každý den, generátor a kopie z jiného dne (PRD 5.4). */
export function SlotsEditor({ program }: { program: FestivalProgram }) {
  const slug = program.festival.slug;
  const [dayId, setDayId] = useState(program.days[0]?.id ?? "");
  const { run, pending, error } = useAction();
  const slots = program.slots.filter((s) => s.dayId === dayId).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const used = new Set(program.lessons.flatMap((l) => [l.startSlotId, l.endSlotId]));

  const [gen, setGen] = useState({ start: "10:00", minutes: 60, pause: 10, count: 6 });
  const preview = generateSlotTimes(gen.start, gen.minutes, gen.pause, gen.count);
  const [copyFrom, setCopyFrom] = useState("");
  const [manual, setManual] = useState({ startsAt: "", endsAt: "" });

  if (!program.days.length) return <p className="text-sm text-muted">Nejdřív v Nastavení vyplň termín festivalu.</p>;

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
              {formatDayLong(d.date, "cs")} ({count})
            </button>
          );
        })}
      </div>

      <ErrorText error={error} />

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Sloty dne">
          {slots.length ? (
            <ul className="divide-y divide-line">
              {slots.map((s) => (
                <li key={s.id} className="flex items-center justify-between py-2 text-sm tabular-nums">
                  {s.startsAt}–{s.endsAt}
                  <Button
                    variant="ghost"
                    disabled={pending || used.has(s.id)}
                    title={used.has(s.id) ? "Ve slotu jsou lekce" : "Smazat slot"}
                    onClick={() => run(() => deleteSlot(slug, s.id))}
                  >
                    Smazat
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Den zatím nemá žádné sloty.</p>
          )}
          <form
            className="mt-3 flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => saveSlot(slug, { dayId, ...manual }), () => setManual({ startsAt: "", endsAt: "" }));
            }}
          >
            <Field label="Od">
              <input type="time" className={inputCls} value={manual.startsAt} onChange={(e) => setManual({ ...manual, startsAt: e.target.value })} required />
            </Field>
            <Field label="Do">
              <input type="time" className={inputCls} value={manual.endsAt} onChange={(e) => setManual({ ...manual, endsAt: e.target.value })} required />
            </Field>
            <Button disabled={pending}>Přidat</Button>
          </form>
        </Card>

        <div className="space-y-4">
          <Card title="Vygenerovat sloty">
            <form
              className="grid grid-cols-2 gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                run(() => generateSlots(slug, dayId, gen));
              }}
            >
              <Field label="Začátek">
                <input type="time" className={inputCls} value={gen.start} onChange={(e) => setGen({ ...gen, start: e.target.value })} required />
              </Field>
              <Field label="Délka lekce (min)">
                <input type="number" min={5} className={inputCls} value={gen.minutes} onChange={(e) => setGen({ ...gen, minutes: Number(e.target.value) })} />
              </Field>
              <Field label="Pauza (min)">
                <input type="number" min={0} className={inputCls} value={gen.pause} onChange={(e) => setGen({ ...gen, pause: Number(e.target.value) })} />
              </Field>
              <Field label="Počet">
                <input type="number" min={1} max={30} className={inputCls} value={gen.count} onChange={(e) => setGen({ ...gen, count: Number(e.target.value) })} />
              </Field>
              <p className="col-span-2 text-xs text-muted tabular-nums">
                {preview.map((p) => `${p.startsAt}–${p.endsAt}`).join(", ")}
              </p>
              <Button variant="primary" className="col-span-2" disabled={pending || !preview.length}>
                Přidat {csCount(preview.length, ["slot", "sloty", "slotů"])}
              </Button>
            </form>
          </Card>

          <Card title="Zkopírovat z jiného dne">
            <form
              className="flex items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (copyFrom) run(() => copySlots(slug, copyFrom, dayId));
              }}
            >
              <Field label="Zdrojový den">
                <select className={inputCls} value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)}>
                  <option value="">Vyber den…</option>
                  {program.days
                    .filter((d) => d.id !== dayId)
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {formatDayLong(d.date, "cs")}
                      </option>
                    ))}
                </select>
              </Field>
              <Button disabled={pending || !copyFrom || slots.length > 0}>Kopírovat</Button>
            </form>
            {slots.length > 0 && <p className="mt-2 text-xs text-muted">Kopírovat lze jen do dne bez slotů.</p>}
          </Card>
        </div>
      </div>
    </div>
  );
}
