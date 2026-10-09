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
import { csCount } from "@/lib/plural";
import type { FestivalProgram, Teacher } from "@/lib/types";
import { Button, Card, ErrorText, Field, inputCls, Modal, useAction } from "./ui";

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
                  <Button onClick={() => setEditing(t)}>Medailonek</Button>
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

      {editing && bios[editing.id] && (
        <ProfileModal slug={slug} teacher={editing} bios={bios[editing.id]} linked={linkedIds.includes(editing.id)} onClose={() => setEditing(null)} />
      )}
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

function ProfileModal({
  slug,
  teacher,
  bios,
  linked,
  onClose,
}: {
  slug: string;
  teacher: Teacher;
  bios: TeacherBios;
  linked: boolean;
  onClose: () => void;
}) {
  const festivalAction = useAction();
  const globalAction = useAction();
  const [fest, setFest] = useState(bios.festival);
  const [glob, setGlob] = useState(bios.global);

  return (
    <Modal title={`Medailonek – ${teacher.name}`} onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          festivalAction.run(() => updateFestivalTeacherBio(slug, teacher.id, fest), onClose);
        }}
      >
        <h3 className="font-semibold">Pro tento festival</h3>
        <p className="text-xs text-muted">Zobrazí se jen na tomto festivalu. Prázdná pole převezmou globální medailonek.</p>
        <Field label="Fotka (URL)" hint="Odkaz musí začínat https://.">
          <input
            className={inputCls}
            value={fest.photoUrl}
            onChange={(e) => setFest({ ...fest, photoUrl: e.target.value })}
            placeholder={glob.photoUrl || "https://…"}
          />
        </Field>
        <Field label="Popis (česky)">
          <textarea className={inputCls} rows={3} value={fest.bioCs} onChange={(e) => setFest({ ...fest, bioCs: e.target.value })} placeholder={glob.bioCs} />
        </Field>
        <Field label="Popis (anglicky)">
          <textarea className={inputCls} rows={3} value={fest.bioEn} onChange={(e) => setFest({ ...fest, bioEn: e.target.value })} placeholder={glob.bioEn} />
        </Field>
        <ErrorText error={festivalAction.error} />
        <Button variant="primary" disabled={festivalAction.pending}>
          Uložit pro tento festival
        </Button>
      </form>

      <hr className="my-5 border-line" />

      {linked ? (
        <div className="space-y-1 text-sm">
          <h3 className="font-semibold">Globální medailonek</h3>
          <p className="text-muted">Učitel má vlastní účet a globální medailonek si upravuje sám.</p>
        </div>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            globalAction.run(() => updateTeacherProfile(slug, teacher.id, glob), onClose);
          }}
        >
          <h3 className="font-semibold">Globální medailonek</h3>
          <p className="text-xs text-muted">Platí na všech festivalech, kde vlastní verze chybí. Jakmile si učitel založí účet, upravuje si ho už jen sám.</p>
          <Field label="Jméno">
            <input className={inputCls} value={glob.name} onChange={(e) => setGlob({ ...glob, name: e.target.value })} required />
          </Field>
          <Field label="Fotka (URL)" hint="Odkaz musí začínat https://.">
            <input className={inputCls} value={glob.photoUrl} onChange={(e) => setGlob({ ...glob, photoUrl: e.target.value })} placeholder="https://…" />
          </Field>
          <Field label="Popis (česky)">
            <textarea className={inputCls} rows={3} value={glob.bioCs} onChange={(e) => setGlob({ ...glob, bioCs: e.target.value })} />
          </Field>
          <Field label="Popis (anglicky)">
            <textarea className={inputCls} rows={3} value={glob.bioEn} onChange={(e) => setGlob({ ...glob, bioEn: e.target.value })} />
          </Field>
          <ErrorText error={globalAction.error} />
          <Button disabled={globalAction.pending}>Uložit globální medailonek</Button>
        </form>
      )}
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
