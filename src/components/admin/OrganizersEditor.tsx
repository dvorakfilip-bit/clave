"use client";

import { useState } from "react";
import { inviteOrganizer, removeOrganizer, revokeInvitation, setOrganizerRole } from "@/app/admin/actions";
import type { Invitation } from "@/lib/admin/data";
import { useI18n } from "@/lib/i18n";
import { inviteText } from "@/lib/invite-text";
import { Button, Card, CopyButton, ErrorText, Field, inputCls, useAction } from "./ui";

type Role = "lead_organizer" | "organizer";
const ROLE: Record<Role, { cs: string; en: string }> = {
  lead_organizer: { cs: "Hlavní organizátor", en: "Lead organizer" },
  organizer: { cs: "Organizátor", en: "Organizer" },
};

export function OrganizersEditor({
  slug,
  festivalName,
  isLead,
  currentUserId,
  members,
  invitations,
}: {
  slug: string;
  festivalName: string;
  isLead: boolean;
  currentUserId: string;
  members: { user_id: string; display_name: string; email: string; role: Role }[];
  invitations: Invitation[];
}) {
  const { locale, tr } = useI18n();
  const { run, pending, error } = useAction();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("organizer");
  const [notice, setNotice] = useState<{ text: string; email: string; role: Role } | null>(null);

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <Card title={tr("Organizátoři", "Organizers")}>
          <ErrorText error={error} />
          <ul className="divide-y divide-line">
            {members.map((m) => (
              <li key={m.user_id} className="flex flex-wrap items-center gap-2 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {m.display_name} {m.user_id === currentUserId && <span className="text-xs text-muted">{tr("(ty)", "(you)")}</span>}
                  </p>
                  <p className="text-xs text-muted">{m.email}</p>
                </div>
                {isLead ? (
                  <>
                    <select
                      className="rounded-lg border border-line bg-surface px-2 py-1.5 text-sm"
                      value={m.role}
                      disabled={pending}
                      onChange={(e) => run(() => setOrganizerRole(slug, m.user_id, e.target.value as Role))}
                    >
                      <option value="lead_organizer">{ROLE.lead_organizer[locale]}</option>
                      <option value="organizer">{ROLE.organizer[locale]}</option>
                    </select>
                    <Button
                      variant="danger"
                      disabled={pending}
                      onClick={() => window.confirm(tr(`Odebrat ${m.display_name} z organizátorů?`, `Remove ${m.display_name} from organizers?`)) && run(() => removeOrganizer(slug, m.user_id))}
                    >
                      {tr("Odebrat", "Remove")}
                    </Button>
                  </>
                ) : (
                  <span className="text-xs text-muted">{ROLE[m.role][locale]}</span>
                )}
              </li>
            ))}
          </ul>
        </Card>

        {invitations.length > 0 && (
          <Card title={tr("Čekající pozvánky", "Pending invitations")}>
            <ul className="divide-y divide-line">
              {invitations.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <span>
                    {i.email} <span className="text-xs text-muted">· {ROLE[i.role as Role][locale]}</span>
                  </span>
                  {isLead && (
                    <span className="flex gap-1">
                      <CopyButton text={inviteText(i.role, festivalName, i.email)} label={tr("Zkopírovat text pozvánky", "Copy invitation text")} variant="ghost" />
                      <Button variant="ghost" disabled={pending} onClick={() => run(() => revokeInvitation(slug, i.id))}>
                        {tr("Zrušit", "Revoke")}
                      </Button>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      {isLead ? (
        <Card title={tr("Přidat organizátora", "Add organizer")}>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              setNotice(null);
              run(
                () => inviteOrganizer(slug, email, role),
                (r) => {
                  setNotice({
                    text:
                      r === "added"
                        ? tr(`${email} už v Clave účet má – přidán rovnou.`, `${email} already has a Clave account – added right away.`)
                        : tr(
                            `Pozvánka uložena. Jakmile se ${email} přihlásí, dostane přístup automaticky.`,
                            `Invitation saved. Once ${email} signs in, they get access automatically.`,
                          ),
                    email,
                    role,
                  });
                  setEmail("");
                },
              );
            }}
          >
            <Field label={tr("E-mail", "Email")} hint={tr("Existující účet se povýší hned, jinak vznikne pozvánka.", "An existing account is upgraded right away, otherwise an invitation is created.")}>
              <input type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} required />
            </Field>
            <Field label="Role">
              <select className={inputCls} value={role} onChange={(e) => setRole(e.target.value as Role)}>
                <option value="organizer">{ROLE.organizer[locale]}</option>
                <option value="lead_organizer">{ROLE.lead_organizer[locale]}</option>
              </select>
            </Field>
            <Button variant="primary" disabled={pending}>
              {tr("Přidat", "Add")}
            </Button>
            {notice && (
              <div className="space-y-2 rounded-lg bg-accent-soft p-3 text-sm">
                <p>{notice.text}</p>
                <p className="text-xs">
                  {tr(
                    "Aplikace zatím neposílá e-maily – pošli mu text pozvánky sám (WhatsApp, e-mail…).",
                    "The app doesn't send emails yet – send them the invitation text yourself (WhatsApp, email…).",
                  )}
                </p>
                <CopyButton text={inviteText(notice.role, festivalName, notice.email)} label={tr("Zkopírovat text pozvánky", "Copy invitation text")} variant="primary" />
              </div>
            )}
          </form>
        </Card>
      ) : (
        <p className="text-sm text-muted">{tr("Organizátory spravuje hlavní organizátor festivalu.", "Organizers are managed by the festival's lead organizer.")}</p>
      )}
    </div>
  );
}
