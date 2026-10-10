"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createFestival } from "@/app/admin/actions";
import { SITE_HOST } from "@/lib/site";
import { Button, Card, ErrorText, Field, inputCls, useAction } from "./ui";
import { TIMEZONES } from "./timezones";

/** Založení festivalu správcem platformy + pozvánka hlavního organizátora (PRD 4.1, 5.6). */
export function NewFestivalForm() {
  const router = useRouter();
  const { run, pending, error } = useAction();
  const [f, setF] = useState({ name: "", slug: "", startDate: "", endDate: "", timezone: "Europe/Prague", leadEmail: "" });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  function slugify(name: string) {
    return name
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  return (
    <Card title="Nový festival">
      <form
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          run(
            () => createFestival(f),
            (data) => data && router.push(`/admin/${data.slug}/organizatori`),
          );
        }}
      >
        <Field label="Název">
          <input className={inputCls} value={f.name} required onChange={(e) => setF({ ...f, name: e.target.value, slug: f.slug === slugify(f.name) ? slugify(e.target.value) : f.slug })} />
        </Field>
        <Field label="Adresa" hint={`${SITE_HOST}/${f.slug || "…"}`}>
          <input className={inputCls} value={f.slug} required onChange={set("slug")} pattern="[a-z0-9]+(-[a-z0-9]+)*" />
        </Field>
        <Field label="Začátek">
          <input type="date" className={inputCls} value={f.startDate} required onChange={set("startDate")} />
        </Field>
        <Field label="Konec">
          <input type="date" className={inputCls} value={f.endDate} required onChange={set("endDate")} />
        </Field>
        <Field label="Časové pásmo">
          <select className={inputCls} value={f.timezone} onChange={set("timezone")}>
            {TIMEZONES.map((tz) => (
              <option key={tz}>{tz}</option>
            ))}
          </select>
        </Field>
        <Field label="E-mail hlavního organizátora">
          <input type="email" className={inputCls} value={f.leadEmail} required onChange={set("leadEmail")} />
        </Field>
        <div className="space-y-2 sm:col-span-2">
          <ErrorText error={error} />
          <Button variant="primary" disabled={pending}>
            Založit festival
          </Button>
        </div>
      </form>
    </Card>
  );
}
