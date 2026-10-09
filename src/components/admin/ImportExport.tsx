"use client";

import { useState, useTransition } from "react";
import { applyImport, copyFromFestival, previewImport } from "@/app/admin/import-actions";
import { downloadCsv, downloadXlsx, readTable } from "@/lib/import/files";
import { aiPrompt, type ImportRow, parseTable, programToTable, templateTable } from "@/lib/import/format";
import type { ImportPlan } from "@/lib/import/plan";
import { csCount } from "@/lib/plural";
import type { FestivalProgram } from "@/lib/types";
import { Button, Card, ErrorText, Field, inputCls, useAction } from "./ui";

export function ImportExport({ program, otherFestivals }: { program: FestivalProgram; otherFestivals: { slug: string; name: string }[] }) {
  const slug = program.festival.slug;
  return (
    <div className="space-y-4">
      <ImportCard slug={slug} />
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Export a šablona">
          <p className="mb-3 text-sm text-muted">
            Export obsahuje aktuální program včetně sloupce ID. Uprav ho a nahraj zpět – změněné lekce zůstanou účastníkům v osobním programu.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => downloadXlsx(programToTable(program), `${slug}-program.xlsx`)}>Export XLSX</Button>
            <Button onClick={() => downloadCsv(programToTable(program), `${slug}-program.csv`)}>Export CSV</Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => downloadXlsx(templateTable(program), "clave-sablona.xlsx")}>
              Šablona XLSX
            </Button>
            <Button variant="ghost" onClick={() => downloadCsv(templateTable(program), "clave-sablona.csv")}>
              Šablona CSV
            </Button>
          </div>
        </Card>
        <PromptCard program={program} />
      </div>
      <CopyCard slug={slug} otherFestivals={otherFestivals} />
    </div>
  );
}

function PromptCard({ program }: { program: FestivalProgram }) {
  const [copied, setCopied] = useState(false);
  const prompt = aiPrompt(program);
  return (
    <Card title="Prompt pro AI">
      <p className="mb-2 text-sm text-muted">
        Máš program jen v PDF nebo na obrázku? Zkopíruj tento text do své AI (ChatGPT, Claude, Gemini…), přilož k němu program a výsledné CSV
        ulož do souboru a nahraj sem.
      </p>
      <textarea className={`${inputCls} h-40 font-mono text-xs`} readOnly value={prompt} />
      <Button
        className="mt-2"
        onClick={async () => {
          await navigator.clipboard.writeText(prompt);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
      >
        {copied ? "Zkopírováno" : "Zkopírovat prompt"}
      </Button>
    </Card>
  );
}

const ACTION_LABEL = { create: "Nová", update: "Změna", unchanged: "Beze změny", error: "Chyba" } as const;

function ImportCard({ slug }: { slug: string }) {
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [deleteIds, setDeleteIds] = useState<Set<string>>(new Set());
  const [done, setDone] = useState<string | null>(null);
  const [reading, startReading] = useTransition();
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const { run, pending, error } = useAction();

  function reset() {
    setRows(null);
    setPlan(null);
    setDeleteIds(new Set());
  }

  function onFile(file: File | undefined) {
    if (!file) return;
    setFileName(file.name);
    reset();
    setDone(null);
    setFileError(null);
    startReading(async () => {
      try {
        const parsed = parseTable(await readTable(file));
        if (parsed.error) {
          setFileError(parsed.error);
          return;
        }
        setRows(parsed.rows);
        const result = await previewImport(slug, parsed.rows);
        if (result.ok) setPlan(result.data ?? null);
        else setFileError(result.error);
      } catch {
        setFileError("Soubor se nepodařilo přečíst. Nahraj XLSX nebo CSV podle šablony.");
      }
    });
  }

  const changes = plan?.rows.filter((r) => r.action !== "unchanged") ?? [];
  const counts = plan && {
    create: plan.rows.filter((r) => r.action === "create").length,
    update: plan.rows.filter((r) => r.action === "update").length,
    unchanged: plan.rows.filter((r) => r.action === "unchanged").length,
  };

  return (
    <Card title="Import programu">
      <p className="mb-3 text-sm text-muted">
        Nahraj XLSX nebo CSV podle šablony. Nejdřív uvidíš náhled – nic se neuloží, dokud import nepotvrdíš. Chybějící místnosti, styly, časové sloty a
        učitele aplikace založí sama.
      </p>
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          onFile(e.dataTransfer.files?.[0]);
        }}
        className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors ${
          dragging ? "border-brand bg-accent-soft" : "border-line hover:border-brand"
        }`}
      >
        <span className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-on-brand">Vybrat soubor</span>
        <span className="text-xs text-muted">nebo ho sem přetáhni · XLSX nebo CSV</span>
        {fileName && <span className="text-sm font-medium">{reading ? `Čtu ${fileName}…` : fileName}</span>}
        <input
          type="file"
          accept=".xlsx,.csv,text/csv"
          className="sr-only"
          onChange={(e) => {
            onFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </label>
      <div className="mt-3 space-y-3">
        <ErrorText error={fileError ?? error} />
        {done && <p className="rounded-lg bg-accent-soft px-3 py-2 text-sm">Import dokončen: {done}.</p>}
      </div>

      {plan && counts && rows && (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2 text-sm">
            <Pill>{csCount(counts.create, ["nová položka", "nové položky", "nových položek"])}</Pill>
            <Pill>{csCount(counts.update, ["změna", "změny", "změn"])}</Pill>
            <Pill>{counts.unchanged} beze změny</Pill>
            {plan.errorCount > 0 && <Pill error>{csCount(plan.errorCount, ["chyba", "chyby", "chyb"])}</Pill>}
          </div>

          {(plan.newRooms.length > 0 || plan.newStyles.length > 0 || plan.newTeachers.length > 0 || plan.existingTeachers.length > 0 || plan.newSlots.length > 0) && (
            <div className="rounded-lg border border-line p-3 text-sm">
              <p className="mb-1 font-medium">Založí se také:</p>
              <ul className="list-inside list-disc space-y-0.5 text-muted">
                {plan.newRooms.length > 0 && <li>místnosti: {plan.newRooms.join(", ")}</li>}
                {plan.newStyles.length > 0 && <li>styly: {plan.newStyles.join(", ")}</li>}
                {plan.newTeachers.length > 0 && <li>noví učitelé (bez účtu): {plan.newTeachers.join(", ")}</li>}
                {plan.existingTeachers.length > 0 && <li>učitelé z platformy přidaní k festivalu: {plan.existingTeachers.map((t) => t.name).join(", ")}</li>}
                {plan.newSlots.length > 0 && <li>časové sloty: {plan.newSlots.map((s) => `${s.date} ${s.start}–${s.end}`).join(", ")}</li>}
              </ul>
            </div>
          )}

          {changes.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-xs text-muted">
                  <tr>
                    <th className="py-1 pr-2">Řádek</th>
                    <th className="pr-2">Stav</th>
                    <th className="pr-2">Den a čas</th>
                    <th className="pr-2">Název</th>
                    <th className="pr-2">Místnost</th>
                    <th>Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {changes.map((r) => (
                    <tr key={r.row.line} className={r.action === "error" ? "bg-accent-soft" : ""}>
                      <td className="py-1.5 pr-2 tabular-nums text-muted">{r.row.line}</td>
                      <td className="pr-2 font-medium">{ACTION_LABEL[r.action]}</td>
                      <td className="pr-2 tabular-nums">
                        {r.row.date} {r.row.start}–{r.row.end}
                      </td>
                      <td className="pr-2">
                        {r.row.titleCs || r.row.titleEn}
                        {r.row.kind === "party" && " (párty)"}
                      </td>
                      <td className="pr-2">{r.row.room}</td>
                      <td className="text-xs">{r.action === "error" ? r.errors.join("; ") : r.changes.join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {plan.deleteCandidates.length > 0 && plan.errorCount === 0 && (
            <div className="rounded-lg border border-line p-3 text-sm">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="font-medium">V souboru chybí ({plan.deleteCandidates.length}) – zaškrtni, co se má smazat:</p>
                <button
                  className="text-xs text-muted underline"
                  onClick={() =>
                    setDeleteIds(deleteIds.size === plan.deleteCandidates.length ? new Set() : new Set(plan.deleteCandidates.map((c) => c.id)))
                  }
                >
                  {deleteIds.size === plan.deleteCandidates.length ? "Nic nemazat" : "Smazat vše"}
                </button>
              </div>
              <ul className="max-h-48 space-y-1 overflow-y-auto">
                {plan.deleteCandidates.map((c) => (
                  <li key={c.id}>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={deleteIds.has(c.id)}
                        onChange={(e) => {
                          const next = new Set(deleteIds);
                          if (e.target.checked) next.add(c.id);
                          else next.delete(c.id);
                          setDeleteIds(next);
                        }}
                      />
                      {c.label}
                    </label>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted">Smazaná lekce zmizí i z osobních programů. Pokud se jen nekoná, raději ji ve správě zruš.</p>
            </div>
          )}

          {plan.errorCount > 0 ? (
            <p className="text-sm">Oprav chyby v souboru a nahraj ho znovu.</p>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="primary"
                disabled={pending || (counts.create + counts.update + deleteIds.size === 0 && !plan.newRooms.length && !plan.newStyles.length)}
                onClick={() =>
                  run(
                    () => applyImport(slug, rows, [...deleteIds]),
                    (summary) => {
                      setDone(summary ?? "");
                      reset();
                    },
                  )
                }
              >
                {pending ? "Importuji…" : "Potvrdit import"}
              </Button>
              <Button variant="ghost" onClick={reset} disabled={pending}>
                Zrušit
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function Pill({ children, error = false }: { children: React.ReactNode; error?: boolean }) {
  return <span className={`rounded-full px-3 py-1 ${error ? "bg-highlight text-on-highlight" : "border border-line"}`}>{children}</span>;
}

function CopyCard({ slug, otherFestivals }: { slug: string; otherFestivals: { slug: string; name: string }[] }) {
  const { run, pending, error } = useAction();
  const [source, setSource] = useState("");
  const [withProgram, setWithProgram] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  return (
    <Card title="Kopie z jiného festivalu">
      {otherFestivals.length === 0 ? (
        <p className="text-sm text-muted">Nemáš žádný jiný festival, ze kterého by šlo kopírovat.</p>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (source) run(() => copyFromFestival(slug, source, withProgram), (s) => setDone(s ?? ""));
          }}
        >
          <p className="text-sm text-muted">
            Převezme místnosti, styly, učitele a časové sloty (podle pořadí dní). Funguje jen u festivalu, který ještě nemá sloty ani lekce.
          </p>
          <Field label="Zdrojový festival">
            <select className={inputCls} value={source} onChange={(e) => setSource(e.target.value)}>
              <option value="">Vyber festival…</option>
              {otherFestivals.map((f) => (
                <option key={f.slug} value={f.slug}>
                  {f.name}
                </option>
              ))}
            </select>
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={withProgram} onChange={(e) => setWithProgram(e.target.checked)} />
            Zkopírovat i lekce a párty
          </label>
          <ErrorText error={error} />
          {done && <p className="rounded-lg bg-accent-soft px-3 py-2 text-sm">Zkopírováno {done}.</p>}
          <Button variant="primary" disabled={pending || !source}>
            Kopírovat
          </Button>
        </form>
      )}
    </Card>
  );
}
