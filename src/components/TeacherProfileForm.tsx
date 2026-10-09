"use client";

import { useState } from "react";
import { revertMyTeacherProfile, updateMyTeacherProfile } from "@/app/ucet/actions";
import { Button, Card, ErrorText, Field, inputCls, useAction } from "@/components/admin/ui";

interface Revision {
  id: number;
  created_at: string;
  by_me: boolean;
  previous: Record<string, string | null>;
}

/** Globální medailonek učitele a historie změn s možností vrátit (PRD 5.5). */
export function TeacherProfileForm({ profile, revisions }: { profile: { name: string; photoUrl: string; bioCs: string; bioEn: string }; revisions: Revision[] }) {
  const { run, pending, error } = useAction();
  const [f, setF] = useState(profile);
  const [saved, setSaved] = useState(false);
  const fmt = new Intl.DateTimeFormat("cs-CZ", { day: "numeric", month: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <>
      <Card title="Medailonek">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setSaved(false);
            run(() => updateMyTeacherProfile(f), () => setSaved(true));
          }}
        >
          <p className="text-xs text-muted">
            Zobrazuje se na všech festivalech, kde učíš. Organizátor festivalu může pro svůj festival použít vlastní text – ten má na jeho festivalu přednost.
          </p>
          <Field label="Jméno">
            <input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
          </Field>
          <Field label="Fotka (URL)" hint="Odkaz musí začínat https://.">
            <input className={inputCls} value={f.photoUrl} onChange={(e) => setF({ ...f, photoUrl: e.target.value })} placeholder="https://…" />
          </Field>
          <Field label="Popis (česky)">
            <textarea className={inputCls} rows={4} value={f.bioCs} onChange={(e) => setF({ ...f, bioCs: e.target.value })} />
          </Field>
          <Field label="Popis (anglicky)">
            <textarea className={inputCls} rows={4} value={f.bioEn} onChange={(e) => setF({ ...f, bioEn: e.target.value })} />
          </Field>
          <ErrorText error={error} />
          <div className="flex items-center gap-3">
            <Button variant="primary" disabled={pending}>
              Uložit
            </Button>
            {saved && <span className="text-sm text-muted">Uloženo</span>}
          </div>
        </form>
      </Card>

      {revisions.length > 0 && (
        <Card title="Historie změn">
          <ul className="divide-y divide-line text-sm">
            {revisions.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  {fmt.format(new Date(r.created_at))} · {r.by_me ? "upravil(a) jsi" : "upravil organizátor"}
                </span>
                <Button
                  variant="ghost"
                  disabled={pending}
                  onClick={() => {
                    if (window.confirm("Vrátit medailonek do stavu před touto změnou?")) {
                      run(
                        () => revertMyTeacherProfile(r.id),
                        () =>
                          setF({
                            name: r.previous.name ?? f.name,
                            photoUrl: r.previous.photo_url ?? "",
                            bioCs: r.previous.bio_cs ?? "",
                            bioEn: r.previous.bio_en ?? "",
                          }),
                      );
                    }
                  }}
                >
                  Vrátit před tuto změnu
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
