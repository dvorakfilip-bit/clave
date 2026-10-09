"use client";

import { useState } from "react";
import { inviteOrganizer, removeOrganizer, revokeInvitation, setOrganizerRole } from "@/app/admin/actions";
import type { Invitation } from "@/lib/admin/data";
import { Button, Card, ErrorText, Field, inputCls, useAction } from "./ui";

type Role = "lead_organizer" | "organizer";
const ROLE: Record<Role, string> = { lead_organizer: "Hlavní organizátor", organizer: "Organizátor" };

export function OrganizersEditor({
  slug,
  isLead,
  currentUserId,
  members,
  invitations,
}: {
  slug: string;
  isLead: boolean;
  currentUserId: string;
  members: { user_id: string; display_name: string; email: string; role: Role }[];
  invitations: Invitation[];
}) {
  const { run, pending, error } = useAction();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("organizer");
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <Card title="Organizátoři">
          <ErrorText error={error} />
          <ul className="divide-y divide-line">
            {members.map((m) => (
              <li key={m.user_id} className="flex flex-wrap items-center gap-2 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {m.display_name} {m.user_id === currentUserId && <span className="text-xs text-muted">(ty)</span>}
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
                      <option value="lead_organizer">{ROLE.lead_organizer}</option>
                      <option value="organizer">{ROLE.organizer}</option>
                    </select>
                    <Button
                      variant="danger"
                      disabled={pending}
                      onClick={() => window.confirm(`Odebrat ${m.display_name} z organizátorů?`) && run(() => removeOrganizer(slug, m.user_id))}
                    >
                      Odebrat
                    </Button>
                  </>
                ) : (
                  <span className="text-xs text-muted">{ROLE[m.role]}</span>
                )}
              </li>
            ))}
          </ul>
        </Card>

        {invitations.length > 0 && (
          <Card title="Čekající pozvánky">
            <ul className="divide-y divide-line">
              {invitations.map((i) => (
                <li key={i.id} className="flex items-center justify-between py-2 text-sm">
                  <span>
                    {i.email} <span className="text-xs text-muted">· {ROLE[i.role as Role]}</span>
                  </span>
                  {isLead && (
                    <Button variant="ghost" disabled={pending} onClick={() => run(() => revokeInvitation(slug, i.id))}>
                      Zrušit
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      {isLead ? (
        <Card title="Přidat organizátora">
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              setNotice(null);
              run(
                () => inviteOrganizer(slug, email, role),
                (r) => {
                  setNotice(
                    r === "added"
                      ? `${email} už v Clave účet má – přidán rovnou.`
                      : `Pozvánka uložena. Jakmile se ${email} přihlásí, dostane přístup automaticky.`,
                  );
                  setEmail("");
                },
              );
            }}
          >
            <Field label="E-mail" hint="Existující účet se povýší hned, jinak vznikne pozvánka.">
              <input type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} required />
            </Field>
            <Field label="Role">
              <select className={inputCls} value={role} onChange={(e) => setRole(e.target.value as Role)}>
                <option value="organizer">{ROLE.organizer}</option>
                <option value="lead_organizer">{ROLE.lead_organizer}</option>
              </select>
            </Field>
            <Button variant="primary" disabled={pending}>
              Přidat
            </Button>
            {notice && <p className="text-sm text-muted">{notice}</p>}
          </form>
        </Card>
      ) : (
        <p className="text-sm text-muted">Organizátory spravuje hlavní organizátor festivalu.</p>
      )}
    </div>
  );
}
