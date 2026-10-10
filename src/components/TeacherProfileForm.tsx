"use client";

import { useState } from "react";
import { revertMyTeacherProfile, updateMyTeacherProfile } from "@/app/ucet/actions";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { Button, Card, ErrorText, Field, inputCls, useAction } from "@/components/admin/ui";
import { useI18n } from "@/lib/i18n";

interface Revision {
  id: number;
  created_at: string;
  by_me: boolean;
  previous: Record<string, string | null>;
}

/** Globální medailonek učitele a historie změn s možností vrátit (PRD 5.5). */
export function TeacherProfileForm({
  profileId,
  profile,
  revisions,
}: {
  profileId: string;
  profile: { name: string; photoUrl: string; bioCs: string; bioEn: string };
  revisions: Revision[];
}) {
  const { locale, tr } = useI18n();
  const { run, pending, error } = useAction();
  const [f, setF] = useState(profile);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fmt = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "cs-CZ", { day: "numeric", month: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <>
      <Card title={tr("Medailonek", "Profile")}>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setSaved(false);
            run(() => updateMyTeacherProfile(f), () => setSaved(true));
          }}
        >
          <p className="text-xs text-muted">
            {tr(
              "Zobrazuje se na všech festivalech, kde učíš. Organizátor festivalu může pro svůj festival použít vlastní text – ten má na jeho festivalu přednost.",
              "Shown at all festivals where you teach. A festival organizer can use their own text for their festival – it takes precedence there.",
            )}
          </p>
          <Field label={tr("Jméno", "Name")}>
            <input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
          </Field>
          <Field label={tr("Fotka", "Photo")}>
            <ImageUpload value={f.photoUrl} onChange={(url) => setF({ ...f, photoUrl: url })} onBusyChange={setUploading} folder={`teachers/${profileId}`} maxSize={600} shape="round" />
          </Field>
          <Field label={tr("Popis (česky)", "Bio (Czech)")}>
            <textarea className={inputCls} rows={4} value={f.bioCs} onChange={(e) => setF({ ...f, bioCs: e.target.value })} />
          </Field>
          <Field label={tr("Popis (anglicky)", "Bio (English)")}>
            <textarea className={inputCls} rows={4} value={f.bioEn} onChange={(e) => setF({ ...f, bioEn: e.target.value })} />
          </Field>
          <ErrorText error={error} />
          <div className="flex items-center gap-3">
            <Button variant="primary" disabled={pending || uploading}>
              {tr("Uložit", "Save")}
            </Button>
            {saved && <span className="text-sm text-muted">{tr("Uloženo", "Saved")}</span>}
          </div>
        </form>
      </Card>

      {revisions.length > 0 && (
        <Card title={tr("Historie změn", "Change history")}>
          <ul className="divide-y divide-line text-sm">
            {revisions.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  {fmt.format(new Date(r.created_at))} · {r.by_me ? tr("upravil(a) jsi", "edited by you") : tr("upravil organizátor", "edited by an organizer")}
                </span>
                <Button
                  variant="ghost"
                  disabled={pending}
                  onClick={() => {
                    if (window.confirm(tr("Vrátit medailonek do stavu před touto změnou?", "Restore the profile to how it was before this change?"))) {
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
                  {tr("Vrátit před tuto změnu", "Restore to before this change")}
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
