"use client";

import { useState } from "react";
import { updateFestival } from "@/app/admin/actions";
import type { Festival } from "@/lib/types";
import { shortName } from "@/lib/short-name";
import { useI18n } from "@/lib/i18n";
import { TIMEZONES } from "./timezones";
import { Button, Card, ErrorText, Field, inputCls, useAction } from "./ui";

export function FestivalSettings({ festival, isLead }: { festival: Festival; isLead: boolean }) {
  const { run, pending, error } = useAction();
  const { tr } = useI18n();
  const [saved, setSaved] = useState(false);
  const [f, setF] = useState({
    name: festival.name,
    shortName: festival.shortName ?? "",
    descriptionCs: festival.descriptionCs ?? "",
    descriptionEn: festival.descriptionEn ?? "",
    startDate: festival.startDate,
    endDate: festival.endDate,
    timezone: festival.timezone,
    status: festival.status,
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setSaved(false);
    setF({ ...f, [k]: e.target.value });
  };

  return (
    <Card>
      <form
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          run((confirmed) => updateFestival(festival.slug, f, confirmed), () => setSaved(true));
        }}
      >
        <Field label={tr("Název", "Name")}>
          <input className={inputCls} value={f.name} onChange={set("name")} required />
        </Field>
        <Field
          label={tr("Krátký název (pod ikonou)", "Short name (under the icon)")}
          hint={tr(
            `Zobrazí se pod ikonou aplikace na ploše telefonu. Nevyplněno: „${shortName({ name: f.name, shortName: null })}“.`,
            `Shown under the app icon on the phone's home screen. If empty: “${shortName({ name: f.name, shortName: null })}”.`,
          )}
        >
          <input className={inputCls} value={f.shortName} onChange={set("shortName")} maxLength={15} placeholder="CSSF 2027" />
        </Field>
        <Field
          label={tr("Stav", "Status")}
          hint={
            isLead
              ? tr("Koncept vidí jen organizátoři. Archiv zůstává veřejně ke čtení.", "Only organizers can see a draft. An archived festival stays public.")
              : tr("Stav festivalu mění jen hlavní organizátor.", "Only the lead organizer can change the festival status.")
          }
        >
          <select className={inputCls} value={f.status} onChange={set("status")} disabled={!isLead}>
            <option value="draft">{tr("Koncept", "Draft")}</option>
            <option value="published">{tr("Zveřejněno", "Published")}</option>
            <option value="archived">{tr("Archiv", "Archived")}</option>
          </select>
        </Field>
        <Field label={tr("Začátek", "Start")}>
          <input type="date" className={inputCls} value={f.startDate} onChange={set("startDate")} required />
        </Field>
        <Field label={tr("Konec", "End")}>
          <input type="date" className={inputCls} value={f.endDate} onChange={set("endDate")} required />
        </Field>
        <Field label={tr("Časové pásmo", "Time zone")} hint={tr("Všechny časy programu se zobrazují v tomto pásmu.", "All program times are shown in this time zone.")}>
          <select className={inputCls} value={f.timezone} onChange={set("timezone")}>
            {[...new Set([f.timezone, ...TIMEZONES])].map((tz) => (
              <option key={tz}>{tz}</option>
            ))}
          </select>
        </Field>
        <div />
        <Field label={tr("Popis (česky)", "Description (Czech)")}>
          <textarea className={inputCls} rows={3} value={f.descriptionCs} onChange={set("descriptionCs")} />
        </Field>
        <Field label={tr("Popis (anglicky)", "Description (English)")}>
          <textarea className={inputCls} rows={3} value={f.descriptionEn} onChange={set("descriptionEn")} />
        </Field>
        <div className="flex items-center gap-3 sm:col-span-2">
          <Button variant="primary" disabled={pending}>
            {tr("Uložit", "Save")}
          </Button>
          {saved && <span className="text-sm text-muted">{tr("Uloženo", "Saved")}</span>}
        </div>
        <div className="sm:col-span-2">
          <ErrorText error={error} />
        </div>
      </form>
    </Card>
  );
}
