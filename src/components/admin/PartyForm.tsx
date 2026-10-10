"use client";

import { useState } from "react";
import { deleteParty, saveParty } from "@/app/admin/actions";
import { useI18n } from "@/lib/i18n";
import type { FestivalProgram, Party } from "@/lib/types";
import { Button, ErrorText, Field, inputCls, Modal, useAction } from "./ui";

export function PartyForm({ program, dayId, party, onClose }: { program: FestivalProgram; dayId: string; party?: Party; onClose: () => void }) {
  const slug = program.festival.slug;
  const { tr } = useI18n();
  const { run, pending, error } = useAction();
  const [f, setF] = useState({
    dayId: party?.dayId ?? dayId,
    startsAt: party?.startsAt ?? "22:00",
    endsAt: party?.endsAt ?? "",
    roomId: party?.roomId ?? null,
    place: party?.place ?? "",
    titleCs: party?.titleCs ?? "",
    titleEn: party?.titleEn ?? "",
    descriptionCs: party?.descriptionCs ?? "",
    descriptionEn: party?.descriptionEn ?? "",
    cancelled: party?.cancelled ?? false,
  });

  return (
    <Modal title={party ? tr("Upravit párty", "Edit party") : tr("Nová párty", "New party")} onClose={onClose}>
      <form
        className="grid grid-cols-2 gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => saveParty(slug, { ...f, id: party?.id }), onClose);
        }}
      >
        <Field label={tr("Název (česky)", "Title (Czech)")}>
          <input className={inputCls} value={f.titleCs} onChange={(e) => setF({ ...f, titleCs: e.target.value })} />
        </Field>
        <Field label={tr("Název (anglicky)", "Title (English)")}>
          <input className={inputCls} value={f.titleEn} onChange={(e) => setF({ ...f, titleEn: e.target.value })} />
        </Field>
        <Field label={tr("Den", "Day")}>
          <select className={inputCls} value={f.dayId} onChange={(e) => setF({ ...f, dayId: e.target.value })}>
            {program.days.map((d) => (
              <option key={d.id} value={d.id}>
                {d.date}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label={tr("Od", "From")}>
            <input type="time" className={inputCls} value={f.startsAt} onChange={(e) => setF({ ...f, startsAt: e.target.value })} required />
          </Field>
          <Field label={tr("Do", "To")} hint={tr("Po půlnoci = další den", "After midnight = next day")}>
            <input type="time" className={inputCls} value={f.endsAt} onChange={(e) => setF({ ...f, endsAt: e.target.value })} />
          </Field>
        </div>
        <Field label={tr("Místnost", "Room")}>
          <select className={inputCls} value={f.roomId ?? ""} onChange={(e) => setF({ ...f, roomId: e.target.value || null })}>
            <option value="">{tr("— jiné místo —", "— other venue —")}</option>
            {program.rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label={tr("Jiné místo", "Other venue")}>
          <input
            className={inputCls}
            value={f.place}
            disabled={Boolean(f.roomId)}
            placeholder="Beach bar"
            onChange={(e) => setF({ ...f, place: e.target.value })}
          />
        </Field>
        <Field label={tr("Popis (česky)", "Description (Czech)")}>
          <textarea className={inputCls} rows={2} value={f.descriptionCs} onChange={(e) => setF({ ...f, descriptionCs: e.target.value })} />
        </Field>
        <Field label={tr("Popis (anglicky)", "Description (English)")}>
          <textarea className={inputCls} rows={2} value={f.descriptionEn} onChange={(e) => setF({ ...f, descriptionEn: e.target.value })} />
        </Field>
        <label className="col-span-2 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={f.cancelled} onChange={(e) => setF({ ...f, cancelled: e.target.checked })} />
          {tr("Párty je zrušená", "Party is cancelled")}
        </label>
        <div className="col-span-2 space-y-2">
          <ErrorText error={error} />
          <div className="flex gap-2">
            <Button variant="primary" disabled={pending}>
              {tr("Uložit", "Save")}
            </Button>
            {party && (
              <Button
                type="button"
                variant="danger"
                disabled={pending}
                onClick={() => window.confirm(tr("Smazat párty?", "Delete this party?")) && run(() => deleteParty(slug, party.id), onClose)}
              >
                {tr("Smazat", "Delete")}
              </Button>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
}
