"use client";

import { useState } from "react";
import {
  addTeacherToFestival,
  createTeacher,
  inviteTeacher,
  removeTeacherFromFestival,
  revokeInvitation,
  searchTeachers,
  updateTeacherProfile,
} from "@/app/admin/actions";
import { TeacherAvatar } from "@/components/festival/TeacherAvatar";
import type { Invitation } from "@/lib/admin/data";
import { csCount } from "@/lib/plural";
import type { FestivalProgram, Teacher } from "@/lib/types";
import { Button, Card, ErrorText, Field, inputCls, Modal, useAction } from "./ui";

export function TeachersEditor({
  program,
  linkedIds,
  invitations,
  lastEdit,
}: {
  program: FestivalProgram;
  linkedIds: string[];
  invitations: Invitation[];
  lastEdit: Record<string, string>;
}) {
  const slug = program.festival.slug;
  const { run, pending, error } = useAction();
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [inviting, setInviting] = useState<Teacher | null>(null);
  const lessonCount = (id: string) => program.lessons.filter((l) => l.teacherIds.includes(id)).length;

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_320px]">
      <Card title={`Učitelé festivalu (${program.teachers.length})`}>
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
                    {csCount(lessonCount(t.id), ["lekce", "lekce", "lekcí"])} ·{" "}
                    {linkedIds.includes(t.id) ? "má účet" : invitation ? `pozván: ${invitation.email}` : "bez účtu"}
                    {lastEdit[t.id] && ` · medailonek upraven ${new Date(lastEdit[t.id]).toLocaleDateString("cs-CZ")}`}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    onClick={() => setEditing(t)}
                    disabled={linkedIds.includes(t.id)}
                    title={linkedIds.includes(t.id) ? "Učitel má vlastní účet – medailonek si upravuje sám" : undefined}
                  >
                    Medailonek
                  </Button>
                  {!linkedIds.includes(t.id) &&
                    (invitation ? (
                      <Button variant="ghost" disabled={pending} onClick={() => run(() => revokeInvitation(slug, invitation.id))}>
                        Zrušit pozvánku
                      </Button>
                    ) : (
                      <Button variant="ghost" onClick={() => setInviting(t)}>
                        Pozvat
                      </Button>
                    ))}
                  <Button
                    variant="danger"
                    disabled={pending || lessonCount(t.id) > 0}
                    title={lessonCount(t.id) ? "Učitel má na festivalu lekce" : undefined}
                    onClick={() => window.confirm(`Odebrat ${t.name} z festivalu?`) && run(() => removeTeacherFromFestival(slug, t.id))}
                  >
                    Odebrat
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

      {editing && <ProfileModal slug={slug} teacher={editing} onClose={() => setEditing(null)} />}
      {inviting && <InviteModal slug={slug} teacher={inviting} onClose={() => setInviting(null)} />}
    </div>
  );
}

function AddExisting({ slug, currentIds }: { slug: string; currentIds: string[] }) {
  const { run, pending, error } = useAction();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: string; name: string }[]>([]);

  return (
    <Card title="Přidat existujícího učitele">
      <form
        className="flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          setResults(await searchTeachers(query));
        }}
      >
        <input className={inputCls} placeholder="Jméno" value={query} onChange={(e) => setQuery(e.target.value)} minLength={2} required />
        <Button>Hledat</Button>
      </form>
      <ul className="mt-2 divide-y divide-line">
        {results.map((r) => (
          <li key={r.id} className="flex items-center justify-between py-1.5 text-sm">
            {r.name}
            {currentIds.includes(r.id) ? (
              <span className="text-xs text-muted">už je na festivalu</span>
            ) : (
              <Button variant="ghost" disabled={pending} onClick={() => run(() => addTeacherToFestival(slug, r.id), () => setResults([]))}>
                Přidat
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
  const { run, pending, error } = useAction();
  const [f, setF] = useState({ name: "", bioCs: "", bioEn: "" });
  return (
    <Card title="Nový učitel">
      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => createTeacher(slug, f), () => setF({ name: "", bioCs: "", bioEn: "" }));
        }}
      >
        <input className={inputCls} placeholder="Jméno a příjmení" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
        <p className="text-xs text-muted">Učitel nemusí mít účet. Pozvánku mu můžeš poslat i později.</p>
        <ErrorText error={error} />
        <Button disabled={pending}>Vytvořit</Button>
      </form>
    </Card>
  );
}

function ProfileModal({ slug, teacher, onClose }: { slug: string; teacher: Teacher; onClose: () => void }) {
  const { run, pending, error } = useAction();
  const [f, setF] = useState({ name: teacher.name, bioCs: teacher.bioCs ?? "", bioEn: teacher.bioEn ?? "", photoUrl: teacher.photoUrl ?? "" });
  return (
    <Modal title={`Medailonek – ${teacher.name}`} onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => updateTeacherProfile(slug, teacher.id, f), onClose);
        }}
      >
        <p className="rounded-lg bg-accent-soft px-3 py-2 text-xs">
          Medailonek je společný pro všechny festivaly. Změna se projeví všude a učitel uvidí, kdo ho upravil. Jakmile si učitel založí
          účet, upravuje si medailonek už jen sám.
        </p>
        <Field label="Jméno">
          <input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
        </Field>
        <Field label="Fotka (URL)" hint="Odkaz musí začínat https://. Nahrávání fotek přidáme v další etapě.">
          <input className={inputCls} value={f.photoUrl} onChange={(e) => setF({ ...f, photoUrl: e.target.value })} placeholder="https://…" />
        </Field>
        <Field label="Popis (česky)">
          <textarea className={inputCls} rows={4} value={f.bioCs} onChange={(e) => setF({ ...f, bioCs: e.target.value })} />
        </Field>
        <Field label="Popis (anglicky)">
          <textarea className={inputCls} rows={4} value={f.bioEn} onChange={(e) => setF({ ...f, bioEn: e.target.value })} />
        </Field>
        <ErrorText error={error} />
        <Button variant="primary" disabled={pending}>
          Uložit
        </Button>
      </form>
    </Modal>
  );
}

function InviteModal({ slug, teacher, onClose }: { slug: string; teacher: Teacher; onClose: () => void }) {
  const { run, pending, error } = useAction();
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<"linked" | "invited" | null>(null);

  return (
    <Modal title={`Pozvat – ${teacher.name}`} onClose={onClose}>
      {result ? (
        <div className="space-y-3 text-sm">
          <p>
            {result === "linked"
              ? `Účet ${email} byl propojen s profilem učitele.`
              : `Pozvánka je uložená. Jakmile se ${email} do Clave přihlásí (Google nebo e-mailem), profil se propojí automaticky.`}
          </p>
          <Button onClick={onClose}>Zavřít</Button>
        </div>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => inviteTeacher(slug, teacher.id, email), (r) => r && setResult(r));
          }}
        >
          <Field label="E-mail učitele" hint="Pokud už má účet, propojí se hned. Jinak se propojí po prvním přihlášení.">
            <input type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <ErrorText error={error} />
          <Button variant="primary" disabled={pending}>
            Pozvat
          </Button>
        </form>
      )}
    </Modal>
  );
}
