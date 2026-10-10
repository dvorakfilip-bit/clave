"use client";

import { useState } from "react";
import {
  addTeacherToFestival,
  createTeacher,
  inviteTeacher,
  removeTeacherFromFestival,
  revokeInvitation,
  searchTeachers,
  updateFestivalTeacherBio,
  updateTeacherProfile,
} from "@/app/admin/actions";
import { TeacherAvatar } from "@/components/festival/TeacherAvatar";
import type { Invitation } from "@/lib/admin/data";
import { useI18n } from "@/lib/i18n";
import { csCount } from "@/lib/plural";
import type { FestivalProgram, Teacher } from "@/lib/types";
import { inviteText } from "@/lib/invite-text";
import { ImageUpload } from "./ImageUpload";
import { Button, Card, CopyButton, ErrorText, Field, inputCls, Modal, useAction } from "./ui";

export interface TeacherBios {
  global: { name: string; photoUrl: string; bioCs: string; bioEn: string };
  festival: { photoUrl: string; bioCs: string; bioEn: string };
}

export function TeachersEditor({
  program,
  bios,
  linkedIds,
  invitations,
  lastEdit,
}: {
  program: FestivalProgram;
  bios: Record<string, TeacherBios>;
  linkedIds: string[];
  invitations: Invitation[];
  lastEdit: Record<string, string>;
}) {
  const slug = program.festival.slug;
  const { locale, tr } = useI18n();
  const { run, pending, error } = useAction();
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [inviting, setInviting] = useState<Teacher | null>(null);
  const lessonCount = (id: string) => program.lessons.filter((l) => l.teacherIds.includes(id)).length;

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_320px]">
      <Card title={`${tr("Učitelé festivalu", "Festival teachers")} (${program.teachers.length})`}>
        <ErrorText error={error} />
        <ul className="divide-y divide-line">
          {program.teachers.map((t) => {
            const invitation = invitations.find((i) => i.teacherProfileId === t.id);
            return (
              <li key={t.id} className="flex flex-wrap items-center gap-3 py-2.5">
                <TeacherAvatar teacher={t} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{t.name}</p>
                  <p className="text-xs text-muted">
                    {locale === "en"
                      ? `${lessonCount(t.id)} ${lessonCount(t.id) === 1 ? "class" : "classes"}`
                      : csCount(lessonCount(t.id), ["lekce", "lekce", "lekcí"])}{" "}
                    ·{" "}
                    {linkedIds.includes(t.id)
                      ? tr("má účet", "has an account")
                      : invitation
                        ? `${tr("pozván", "invited")}: ${invitation.email}`
                        : tr("bez účtu", "no account")}
                    {lastEdit[t.id] &&
                      ` · ${tr("medailonek upraven", "profile edited")} ${new Date(lastEdit[t.id]).toLocaleDateString(locale === "en" ? "en-GB" : "cs-CZ")}`}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button onClick={() => setEditing(t)}>{tr("Medailonek", "Profile")}</Button>
                  {!linkedIds.includes(t.id) &&
                    (invitation ? (
                      <>
                        <CopyButton text={inviteText("teacher", program.festival.name, invitation.email)} label={tr("Text pozvánky", "Invitation text")} variant="ghost" />
                        <Button variant="ghost" disabled={pending} onClick={() => run(() => revokeInvitation(slug, invitation.id))}>
                          {tr("Zrušit pozvánku", "Revoke invitation")}
                        </Button>
                      </>
                    ) : (
                      <Button variant="ghost" onClick={() => setInviting(t)}>
                        {tr("Pozvat", "Invite")}
                      </Button>
                    ))}
                  <Button
                    variant="danger"
                    disabled={pending || lessonCount(t.id) > 0}
                    title={lessonCount(t.id) ? tr("Učitel má na festivalu lekce", "The teacher has classes at this festival") : undefined}
                    onClick={() => window.confirm(tr(`Odebrat ${t.name} z festivalu?`, `Remove ${t.name} from the festival?`)) && run(() => removeTeacherFromFestival(slug, t.id))}
                  >
                    {tr("Odebrat", "Remove")}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      <div className="space-y-4">
        <AddExisting slug={slug} currentIds={program.teachers.map((t) => t.id)} />
        <CreateNew slug={slug} />
      </div>

      {editing && bios[editing.id] && (
        <ProfileModal slug={slug} festivalId={program.festival.id} teacher={editing} bios={bios[editing.id]} linked={linkedIds.includes(editing.id)} onClose={() => setEditing(null)} />
      )}
      {inviting && <InviteModal slug={slug} festivalName={program.festival.name} teacher={inviting} onClose={() => setInviting(null)} />}
    </div>
  );
}

function AddExisting({ slug, currentIds }: { slug: string; currentIds: string[] }) {
  const { tr } = useI18n();
  const { run, pending, error } = useAction();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: string; name: string }[]>([]);

  return (
    <Card title={tr("Přidat existujícího učitele", "Add an existing teacher")}>
      <form
        className="flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            setResults(await searchTeachers(query));
          } catch {
            setResults([]);
          }
        }}
      >
        <input className={inputCls} placeholder={tr("Jméno", "Name")} value={query} onChange={(e) => setQuery(e.target.value)} minLength={2} required />
        <Button>{tr("Hledat", "Search")}</Button>
      </form>
      <ul className="mt-2 divide-y divide-line">
        {results.map((r) => (
          <li key={r.id} className="flex items-center justify-between py-1.5 text-sm">
            {r.name}
            {currentIds.includes(r.id) ? (
              <span className="text-xs text-muted">{tr("už je na festivalu", "already at the festival")}</span>
            ) : (
              <Button variant="ghost" disabled={pending} onClick={() => run(() => addTeacherToFestival(slug, r.id), () => setResults([]))}>
                {tr("Přidat", "Add")}
              </Button>
            )}
          </li>
        ))}
      </ul>
      <ErrorText error={error} />
    </Card>
  );
}

function CreateNew({ slug }: { slug: string }) {
  const { tr } = useI18n();
  const { run, pending, error } = useAction();
  const [f, setF] = useState({ name: "", bioCs: "", bioEn: "" });
  return (
    <Card title={tr("Nový učitel", "New teacher")}>
      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => createTeacher(slug, f), () => setF({ name: "", bioCs: "", bioEn: "" }));
        }}
      >
        <input className={inputCls} placeholder={tr("Jméno a příjmení", "Full name")} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
        <p className="text-xs text-muted">{tr("Učitel nemusí mít účet. Pozvánku mu můžeš poslat i později.", "The teacher doesn't need an account. You can send an invitation later.")}</p>
        <ErrorText error={error} />
        <Button disabled={pending}>{tr("Vytvořit", "Create")}</Button>
      </form>
    </Card>
  );
}

function ProfileModal({
  slug,
  festivalId,
  teacher,
  bios,
  linked,
  onClose,
}: {
  slug: string;
  festivalId: string;
  teacher: Teacher;
  bios: TeacherBios;
  linked: boolean;
  onClose: () => void;
}) {
  const { tr } = useI18n();
  const festivalAction = useAction();
  const globalAction = useAction();
  const [fest, setFest] = useState(bios.festival);
  const [glob, setGlob] = useState(bios.global);
  // Obě části se ukládají zvlášť a okno zůstává otevřené – uložení jedné nezahodí změny v druhé.
  const [saved, setSaved] = useState<{ festival: boolean; global: boolean }>({ festival: false, global: false });
  const [uploading, setUploading] = useState(0);
  const trackUpload = (busy: boolean) => setUploading((n) => n + (busy ? 1 : -1));
  const busy = festivalAction.pending || globalAction.pending || uploading > 0;

  return (
    <Modal title={`${tr("Medailonek", "Profile")} – ${teacher.name}`} onClose={onClose} busy={busy}>
      <form
        className="space-y-3"
        onChange={() => setSaved({ ...saved, festival: false })}
        onSubmit={(e) => {
          e.preventDefault();
          festivalAction.run(() => updateFestivalTeacherBio(slug, teacher.id, fest), () => setSaved({ ...saved, festival: true }));
        }}
      >
        <h3 className="font-semibold">{tr("Pro tento festival", "For this festival")}</h3>
        <p className="text-xs text-muted">
          {tr(
            "Zobrazí se jen na tomto festivalu. Prázdná pole převezmou globální medailonek.",
            "Shown only at this festival. Empty fields fall back to the global profile.",
          )}
        </p>
        <Field
          label={tr("Fotka pro tento festival", "Photo for this festival")}
          hint={tr("Bez fotky se použije fotka z globálního medailonku.", "Without a photo, the one from the global profile is used.")}
        >
          <ImageUpload
            value={fest.photoUrl}
            onChange={(url) => {
              setFest({ ...fest, photoUrl: url });
              setSaved({ ...saved, festival: false });
            }}
            onBusyChange={trackUpload}
            folder={`festival-teachers/${festivalId}/${teacher.id}`}
            maxSize={600}
            shape="round"
          />
        </Field>
        <Field label={tr("Popis (česky)", "Bio (Czech)")}>
          <textarea className={inputCls} rows={3} value={fest.bioCs} onChange={(e) => setFest({ ...fest, bioCs: e.target.value })} placeholder={glob.bioCs} />
        </Field>
        <Field label={tr("Popis (anglicky)", "Bio (English)")}>
          <textarea className={inputCls} rows={3} value={fest.bioEn} onChange={(e) => setFest({ ...fest, bioEn: e.target.value })} placeholder={glob.bioEn} />
        </Field>
        <ErrorText error={festivalAction.error} />
        <div className="flex items-center gap-3">
          <Button variant="primary" disabled={busy}>
            {tr("Uložit pro tento festival", "Save for this festival")}
          </Button>
          {saved.festival && <span className="text-sm text-muted">{tr("Uloženo", "Saved")}</span>}
        </div>
      </form>

      <hr className="my-5 border-line" />

      {linked ? (
        <div className="space-y-1 text-sm">
          <h3 className="font-semibold">{tr("Globální medailonek", "Global profile")}</h3>
          <p className="text-muted">{tr("Učitel má vlastní účet a globální medailonek si upravuje sám.", "The teacher has an account and edits the global profile themselves.")}</p>
        </div>
      ) : (
        <form
          className="space-y-3"
          onChange={() => setSaved({ ...saved, global: false })}
          onSubmit={(e) => {
            e.preventDefault();
            globalAction.run(() => updateTeacherProfile(slug, teacher.id, glob), () => setSaved({ ...saved, global: true }));
          }}
        >
          <h3 className="font-semibold">{tr("Globální medailonek", "Global profile")}</h3>
          <p className="text-xs text-muted">
            {tr(
              "Platí na všech festivalech, kde vlastní verze chybí. Jakmile si učitel založí účet, upravuje si ho už jen sám.",
              "Applies at all festivals without their own version. Once the teacher creates an account, only they can edit it.",
            )}
          </p>
          <Field label={tr("Jméno", "Name")}>
            <input className={inputCls} value={glob.name} onChange={(e) => setGlob({ ...glob, name: e.target.value })} required />
          </Field>
          <Field label={tr("Fotka", "Photo")}>
            <ImageUpload
              value={glob.photoUrl}
              onChange={(url) => {
                setGlob({ ...glob, photoUrl: url });
                setSaved({ ...saved, global: false });
              }}
              onBusyChange={trackUpload}
              folder={`teachers/${teacher.id}`}
              maxSize={600}
              shape="round"
            />
          </Field>
          <Field label={tr("Popis (česky)", "Bio (Czech)")}>
            <textarea className={inputCls} rows={3} value={glob.bioCs} onChange={(e) => setGlob({ ...glob, bioCs: e.target.value })} />
          </Field>
          <Field label={tr("Popis (anglicky)", "Bio (English)")}>
            <textarea className={inputCls} rows={3} value={glob.bioEn} onChange={(e) => setGlob({ ...glob, bioEn: e.target.value })} />
          </Field>
          <ErrorText error={globalAction.error} />
          <div className="flex items-center gap-3">
            <Button disabled={busy}>{tr("Uložit globální medailonek", "Save global profile")}</Button>
            {saved.global && <span className="text-sm text-muted">{tr("Uloženo", "Saved")}</span>}
          </div>
        </form>
      )}
      <div className="mt-5 flex justify-end">
        <Button type="button" onClick={onClose} disabled={busy}>
          {tr("Zavřít", "Close")}
        </Button>
      </div>
    </Modal>
  );
}

function InviteModal({ slug, festivalName, teacher, onClose }: { slug: string; festivalName: string; teacher: Teacher; onClose: () => void }) {
  const { tr } = useI18n();
  const { run, pending, error } = useAction();
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<"linked" | "invited" | null>(null);

  return (
    <Modal title={`${tr("Pozvat", "Invite")} – ${teacher.name}`} onClose={onClose} busy={pending}>
      {result ? (
        <div className="space-y-3 text-sm">
          <p>
            {result === "linked"
              ? tr(`Účet ${email} byl propojen s profilem učitele.`, `The account ${email} has been linked to the teacher profile.`)
              : tr(
                  `Pozvánka je uložená. Jakmile se ${email} do Clave přihlásí (Google nebo e-mailem), profil se propojí automaticky.`,
                  `The invitation is saved. Once ${email} signs in to Clave (with Google or email), the profile will be linked automatically.`,
                )}
          </p>
          <p className="text-xs text-muted">
            {tr(
              "Aplikace zatím neposílá e-maily – pošli učiteli text pozvánky sám (WhatsApp, e-mail…).",
              "The app doesn't send emails yet – send the invitation text to the teacher yourself (WhatsApp, email…).",
            )}
          </p>
          <div className="flex gap-2">
            <CopyButton text={inviteText("teacher", festivalName, email)} label={tr("Zkopírovat text pozvánky", "Copy invitation text")} variant="primary" />
            <Button onClick={onClose}>{tr("Zavřít", "Close")}</Button>
          </div>
        </div>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => inviteTeacher(slug, teacher.id, email), (r) => r && setResult(r));
          }}
        >
          <Field
            label={tr("E-mail učitele", "Teacher's email")}
            hint={tr("Pokud už má účet, propojí se hned. Jinak se propojí po prvním přihlášení.", "If they already have an account, it's linked right away. Otherwise after their first sign-in.")}
          >
            <input type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <ErrorText error={error} />
          <Button variant="primary" disabled={pending}>
            {tr("Pozvat", "Invite")}
          </Button>
        </form>
      )}
    </Modal>
  );
}
