"use client";

import { useState } from "react";
import { deleteInfoPage, reorderInfoPages, saveInfoPage } from "@/app/admin/actions";
import type { InfoPage } from "@/lib/types";
import { Button, Card, ErrorText, Field, inputCls, Modal, useAction } from "./ui";

/** Praktické informace festivalu – mapa, adresy, kontakty… (PRD 5.4). */
export function InfoPagesEditor({ slug, pages }: { slug: string; pages: InfoPage[] }) {
  const { run, pending, error } = useAction();
  const [editing, setEditing] = useState<InfoPage | "new" | null>(null);
  const sorted = [...pages].sort((a, b) => a.position - b.position);

  function move(i: number, dir: -1 | 1) {
    const ids = sorted.map((p) => p.id);
    [ids[i], ids[i + dir]] = [ids[i + dir], ids[i]];
    run(() => reorderInfoPages(slug, ids));
  }

  return (
    <Card title="Praktické informace" actions={<Button onClick={() => setEditing("new")}>Přidat stránku</Button>}>
      <ErrorText error={error} />
      {sorted.length ? (
        <ul className="divide-y divide-line">
          {sorted.map((p, i) => (
            <li key={p.id} className="flex items-center gap-2 py-2">
              <button className="flex-1 text-left font-medium" onClick={() => setEditing(p)}>
                {p.titleCs ?? p.titleEn}
              </button>
              <Button variant="ghost" disabled={i === 0 || pending} onClick={() => move(i, -1)} aria-label="Posunout nahoru">
                ↑
              </Button>
              <Button variant="ghost" disabled={i === sorted.length - 1 || pending} onClick={() => move(i, 1)} aria-label="Posunout dolů">
                ↓
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">Zatím žádné stránky. Typicky: areál a sály, doprava, kontakty, pravidla.</p>
      )}
      {editing && <PageModal slug={slug} page={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} />}
    </Card>
  );
}

function PageModal({ slug, page, onClose }: { slug: string; page?: InfoPage; onClose: () => void }) {
  const { run, pending, error } = useAction();
  const [f, setF] = useState({ titleCs: page?.titleCs ?? "", titleEn: page?.titleEn ?? "", bodyCs: page?.bodyCs ?? "", bodyEn: page?.bodyEn ?? "" });
  return (
    <Modal title={page ? "Upravit stránku" : "Nová stránka"} onClose={onClose}>
      <form
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => saveInfoPage(slug, { ...f, id: page?.id }), onClose);
        }}
      >
        <Field label="Nadpis (česky)">
          <input className={inputCls} value={f.titleCs} onChange={(e) => setF({ ...f, titleCs: e.target.value })} />
        </Field>
        <Field label="Nadpis (anglicky)">
          <input className={inputCls} value={f.titleEn} onChange={(e) => setF({ ...f, titleEn: e.target.value })} />
        </Field>
        <Field label="Text (česky)">
          <textarea className={inputCls} rows={8} value={f.bodyCs} onChange={(e) => setF({ ...f, bodyCs: e.target.value })} />
        </Field>
        <Field label="Text (anglicky)">
          <textarea className={inputCls} rows={8} value={f.bodyEn} onChange={(e) => setF({ ...f, bodyEn: e.target.value })} />
        </Field>
        <div className="space-y-2 sm:col-span-2">
          <ErrorText error={error} />
          <div className="flex gap-2">
            <Button variant="primary" disabled={pending}>
              Uložit
            </Button>
            {page && (
              <Button type="button" variant="danger" disabled={pending} onClick={() => window.confirm("Smazat stránku?") && run(() => deleteInfoPage(slug, page.id), onClose)}>
                Smazat
              </Button>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
}
