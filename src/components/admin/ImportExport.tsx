"use client";

import { useState, useTransition } from "react";
import { applyImport, copyFromFestival, previewImport } from "@/app/admin/import-actions";
import { downloadCsv, downloadXlsx, readTable } from "@/lib/import/files";
import { aiPrompt, type ImportRow, parseTable, programToTable, templateTable } from "@/lib/import/format";
import type { ImportPlan } from "@/lib/import/plan";
import { useI18n } from "@/lib/i18n";
import { csCount } from "@/lib/plural";
import type { FestivalProgram, Locale } from "@/lib/types";
import { Button, Card, ErrorText, Field, inputCls, useAction } from "./ui";

export function ImportExport({ program, otherFestivals }: { program: FestivalProgram; otherFestivals: { slug: string; name: string }[] }) {
  const slug = program.festival.slug;
  const { locale, tr } = useI18n();
  return (
    <div className="space-y-4">
      <ImportCard slug={slug} />
      <div className="grid gap-4 md:grid-cols-2">
        <Card title={tr("Export a šablona", "Export and template")}>
          <p className="mb-3 text-sm text-muted">
            {tr(
              "Export obsahuje aktuální program včetně sloupce ID. Uprav ho a nahraj zpět – změněné lekce zůstanou účastníkům v osobním programu.",
              "The export contains the current program including the ID column. Edit it and upload it back – changed classes stay in attendees' personal programs.",
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => downloadXlsx(programToTable(program, locale), `${slug}-program.xlsx`)}>Export XLSX</Button>
            <Button onClick={() => downloadCsv(programToTable(program, locale), `${slug}-program.csv`)}>Export CSV</Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => downloadXlsx(templateTable(program, locale), "clave-sablona.xlsx")}>
              {tr("Šablona XLSX", "XLSX template")}
            </Button>
            <Button variant="ghost" onClick={() => downloadCsv(templateTable(program, locale), "clave-sablona.csv")}>
              {tr("Šablona CSV", "CSV template")}
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
  const { locale, tr } = useI18n();
  const [copied, setCopied] = useState(false);
  const prompt = aiPrompt(program, locale);
  return (
    <Card title={tr("Prompt pro AI", "AI prompt")}>
      <p className="mb-2 text-sm text-muted">
        {tr(
          "Máš program jen v PDF nebo na obrázku? Zkopíruj tento text do své AI (ChatGPT, Claude, Gemini…), přilož k němu program a výsledné CSV ulož do souboru a nahraj sem.",
          "Have the program only as a PDF or an image? Copy this text into your AI (ChatGPT, Claude, Gemini…), attach the program, save the resulting CSV to a file and upload it here.",
        )}
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
        {copied ? tr("Zkopírováno", "Copied") : tr("Zkopírovat prompt", "Copy prompt")}
      </Button>
    </Card>
  );
}

const ACTION_LABEL = {
  create: { cs: "Nová", en: "New" },
  update: { cs: "Změna", en: "Changed" },
  unchanged: { cs: "Beze změny", en: "Unchanged" },
  error: { cs: "Chyba", en: "Error" },
} as const;

/** Počet se správným tvarem v obou jazycích. */
function countLabel(locale: Locale, n: number, cs: [string, string, string], [one, other]: [string, string]) {
  return locale === "en" ? `${n} ${n === 1 ? one : other}` : csCount(n, cs);
}

function ImportCard({ slug }: { slug: string }) {
  const { locale, tr } = useI18n();
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
        const parsed = parseTable(await readTable(file), locale);
        if (parsed.error) {
          setFileError(parsed.error);
          return;
        }
        setRows(parsed.rows);
        const result = await previewImport(slug, parsed.rows);
        if (result.ok) setPlan(result.data ?? null);
        else setFileError(result.error);
      } catch {
        setFileError(tr("Soubor se nepodařilo přečíst. Nahraj XLSX nebo CSV podle šablony.", "Couldn't read the file. Upload an XLSX or CSV based on the template."));
      }
    });
  }

  // Zaškrtnutí lekce ke smazání může odstranit kolizi – náhled se přepočítá.
  function changeDeletes(next: Set<string>) {
    setDeleteIds(next);
    if (!rows) return;
    startReading(async () => {
      try {
        const result = await previewImport(slug, rows, [...next]);
        if (result.ok) setPlan(result.data ?? null);
        else setFileError(result.error);
      } catch {
        setFileError(tr("Nepodařilo se spojit se serverem.", "Couldn't reach the server."));
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
    <Card title={tr("Import programu", "Program import")}>
      <p className="mb-3 text-sm text-muted">
        {tr(
          "Nahraj XLSX nebo CSV podle šablony. Nejdřív uvidíš náhled – nic se neuloží, dokud import nepotvrdíš. Chybějící místnosti, styly, časové sloty a učitele aplikace založí sama.",
          "Upload an XLSX or CSV based on the template. You'll see a preview first – nothing is saved until you confirm the import. Missing rooms, styles, time slots and teachers are created automatically.",
        )}
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
        <span className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-on-brand">{tr("Vybrat soubor", "Choose file")}</span>
        <span className="text-xs text-muted">{tr("nebo ho sem přetáhni · XLSX nebo CSV", "or drag it here · XLSX or CSV")}</span>
        {fileName && <span className="text-sm font-medium">{reading ? tr(`Čtu ${fileName}…`, `Reading ${fileName}…`) : fileName}</span>}
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
        {done && <p className="rounded-lg bg-accent-soft px-3 py-2 text-sm">
            {tr("Import dokončen", "Import complete")}: {done}.
          </p>}
      </div>

      {plan && counts && rows && (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2 text-sm">
            <Pill>{countLabel(locale, counts.create, ["nová položka", "nové položky", "nových položek"], ["new item", "new items"])}</Pill>
            <Pill>{countLabel(locale, counts.update, ["změna", "změny", "změn"], ["change", "changes"])}</Pill>
            <Pill>
              {counts.unchanged} {tr("beze změny", "unchanged")}
            </Pill>
            {plan.errorCount > 0 && <Pill error>{countLabel(locale, plan.errorCount, ["chyba", "chyby", "chyb"], ["error", "errors"])}</Pill>}
          </div>

          {(plan.newRooms.length > 0 || plan.newStyles.length > 0 || plan.newTeachers.length > 0 || plan.existingTeachers.length > 0 || plan.newSlots.length > 0) && (
            <div className="rounded-lg border border-line p-3 text-sm">
              <p className="mb-1 font-medium">{tr("Založí se také:", "Also to be created:")}</p>
              <ul className="list-inside list-disc space-y-0.5 text-muted">
                {plan.newRooms.length > 0 && <li>
                    {tr("místnosti", "rooms")}: {plan.newRooms.join(", ")}
                  </li>}
                {plan.newStyles.length > 0 && <li>
                    {tr("styly", "styles")}: {plan.newStyles.join(", ")}
                  </li>}
                {plan.newTeachers.length > 0 && <li>
                    {tr("noví učitelé (bez účtu)", "new teachers (no account)")}: {plan.newTeachers.join(", ")}
                  </li>}
                {plan.existingTeachers.length > 0 && <li>
                    {tr("učitelé z platformy přidaní k festivalu", "platform teachers added to the festival")}:{" "}
                    {plan.existingTeachers.map((t) => t.name).join(", ")}
                  </li>}
                {plan.newSlots.length > 0 && <li>
                    {tr("časové sloty", "time slots")}: {plan.newSlots.map((s) => `${s.date} ${s.start}–${s.end}`).join(", ")}
                  </li>}
              </ul>
            </div>
          )}

          {changes.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-xs text-muted">
                  <tr>
                    <th className="py-1 pr-2">{tr("Řádek", "Row")}</th>
                    <th className="pr-2">{tr("Stav", "Status")}</th>
                    <th className="pr-2">{tr("Den a čas", "Day and time")}</th>
                    <th className="pr-2">{tr("Název", "Title")}</th>
                    <th className="pr-2">{tr("Místnost", "Room")}</th>
                    <th>{tr("Detail", "Details")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {changes.map((r) => (
                    <tr key={r.row.line} className={r.action === "error" ? "bg-accent-soft" : ""}>
                      <td className="py-1.5 pr-2 tabular-nums text-muted">{r.row.line}</td>
                      <td className="pr-2 font-medium">{ACTION_LABEL[r.action][locale]}</td>
                      <td className="pr-2 tabular-nums">
                        {r.row.date} {r.row.start}–{r.row.end}
                      </td>
                      <td className="pr-2">
                        {r.row.titleCs || r.row.titleEn}
                        {r.row.kind === "party" && ` ${tr("(párty)", "(party)")}`}
                      </td>
                      <td className="pr-2">{r.row.room}</td>
                      <td className="text-xs">{r.action === "error" ? r.errors.join("; ") : r.changes.join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {plan.deleteCandidates.length > 0 && (
            <div className="rounded-lg border border-line p-3 text-sm">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="font-medium">
                  {tr("V souboru chybí", "Missing from the file")} ({plan.deleteCandidates.length}) –{" "}
                  {tr("zaškrtni, co se má smazat:", "check what to delete:")}
                </p>
                <button
                  className="text-xs text-muted underline"
                  disabled={reading}
                  onClick={() =>
                    changeDeletes(deleteIds.size === plan.deleteCandidates.length ? new Set() : new Set(plan.deleteCandidates.map((c) => c.id)))
                  }
                >
                  {deleteIds.size === plan.deleteCandidates.length ? tr("Nic nemazat", "Delete nothing") : tr("Smazat vše", "Delete all")}
                </button>
              </div>
              <ul className="max-h-48 space-y-1 overflow-y-auto">
                {plan.deleteCandidates.map((c) => (
                  <li key={c.id}>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={deleteIds.has(c.id)}
                        disabled={reading}
                        onChange={(e) => {
                          const next = new Set(deleteIds);
                          if (e.target.checked) next.add(c.id);
                          else next.delete(c.id);
                          changeDeletes(next);
                        }}
                      />
                      {c.label}
                    </label>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted">
                {tr(
                  "Smazaná lekce zmizí i z osobních programů. Pokud se jen nekoná, raději ji ve správě zruš.",
                  "A deleted class also disappears from personal programs. If it's just not taking place, cancel it in the admin instead.",
                )}
              </p>
            </div>
          )}

          {plan.errorCount > 0 ? (
            <p className="text-sm">
              {tr(
                "Oprav chyby v souboru a nahraj ho znovu, nebo zaškrtni ke smazání lekce, se kterými nové řádky kolidují.",
                "Fix the errors in the file and upload it again, or check the classes that the new rows collide with for deletion.",
              )}
            </p>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="primary"
                disabled={pending || reading || (counts.create + counts.update + deleteIds.size === 0 && !plan.newRooms.length && !plan.newStyles.length)}
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
                {pending ? tr("Importuji…", "Importing…") : tr("Potvrdit import", "Confirm import")}
              </Button>
              <Button variant="ghost" onClick={reset} disabled={pending}>
                {tr("Zrušit", "Cancel")}
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
  const { tr } = useI18n();
  const { run, pending, error } = useAction();
  const [source, setSource] = useState("");
  const [withProgram, setWithProgram] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  return (
    <Card title={tr("Kopie z jiného festivalu", "Copy from another festival")}>
      {otherFestivals.length === 0 ? (
        <p className="text-sm text-muted">{tr("Nemáš žádný jiný festival, ze kterého by šlo kopírovat.", "You have no other festival to copy from.")}</p>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (source) run(() => copyFromFestival(slug, source, withProgram), (s) => setDone(s ?? ""));
          }}
        >
          <p className="text-sm text-muted">
            {tr(
              "Převezme místnosti, styly, učitele a časové sloty (podle pořadí dní). Funguje jen u festivalu, který ještě nemá sloty ani lekce.",
              "Copies rooms, styles, teachers and time slots (by day order). Works only for a festival that has no time slots or classes yet.",
            )}
          </p>
          <Field label={tr("Zdrojový festival", "Source festival")}>
            <select className={inputCls} value={source} onChange={(e) => setSource(e.target.value)}>
              <option value="">{tr("Vyber festival…", "Choose a festival…")}</option>
              {otherFestivals.map((f) => (
                <option key={f.slug} value={f.slug}>
                  {f.name}
                </option>
              ))}
            </select>
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={withProgram} onChange={(e) => setWithProgram(e.target.checked)} />
            {tr("Zkopírovat i lekce a párty", "Also copy classes and parties")}
          </label>
          <ErrorText error={error} />
          {done && <p className="rounded-lg bg-accent-soft px-3 py-2 text-sm">
              {tr("Zkopírováno", "Copied")} {done}.
            </p>}
          <Button variant="primary" disabled={pending || !source}>
            {tr("Kopírovat", "Copy")}
          </Button>
        </form>
      )}
    </Card>
  );
}
