"use client";

import { useState } from "react";
import { updateFestival } from "@/app/admin/actions";
import type { Festival } from "@/lib/types";
import { shortName } from "@/lib/short-name";
import { TIMEZONES } from "./timezones";
import { Button, Card, ErrorText, Field, inputCls, useAction } from "./ui";

export function FestivalSettings({ festival, isLead }: { festival: Festival; isLead: boolean }) {
  const { run, pending, error } = useAction();
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
          run(() => updateFestival(festival.slug, f), () => setSaved(true));
        }}
      >
        <Field label="Název">
          <input className={inputCls} value={f.name} onChange={set("name")} required />
        </Field>
        <Field label="Krátký název (pod ikonou)" hint={`Zobrazí se pod ikonou aplikace na ploše telefonu. Nevyplněno: „${shortName({ name: f.name, shortName: null })}“.`}>
          <input className={inputCls} value={f.shortName} onChange={set("shortName")} maxLength={15} placeholder="CSSF 2027" />
        </Field>
        <Field
          label="Stav"
          hint={isLead ? "Koncept vidí jen organizátoři. Archiv zůstává veřejně ke čtení." : "Stav festivalu mění jen hlavní organizátor."}
        >
          <select className={inputCls} value={f.status} onChange={set("status")} disabled={!isLead}>
            <option value="draft">Koncept</option>
            <option value="published">Zveřejněno</option>
            <option value="archived">Archiv</option>
          </select>
        </Field>
        <Field label="Začátek">
          <input type="date" className={inputCls} value={f.startDate} onChange={set("startDate")} required />
        </Field>
        <Field label="Konec">
          <input type="date" className={inputCls} value={f.endDate} onChange={set("endDate")} required />
        </Field>
        <Field label="Časové pásmo" hint="Všechny časy programu se zobrazují v tomto pásmu.">
          <select className={inputCls} value={f.timezone} onChange={set("timezone")}>
            {[...new Set([f.timezone, ...TIMEZONES])].map((tz) => (
              <option key={tz}>{tz}</option>
            ))}
          </select>
        </Field>
        <div />
        <Field label="Popis (česky)">
          <textarea className={inputCls} rows={3} value={f.descriptionCs} onChange={set("descriptionCs")} />
        </Field>
        <Field label="Popis (anglicky)">
          <textarea className={inputCls} rows={3} value={f.descriptionEn} onChange={set("descriptionEn")} />
        </Field>
        <div className="flex items-center gap-3 sm:col-span-2">
          <Button variant="primary" disabled={pending}>
            Uložit
          </Button>
          {saved && <span className="text-sm text-muted">Uloženo</span>}
        </div>
        <div className="sm:col-span-2">
          <ErrorText error={error} />
        </div>
      </form>
    </Card>
  );
}
