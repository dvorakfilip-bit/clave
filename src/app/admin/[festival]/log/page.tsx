import { Card } from "@/components/admin/ui";
import { loadAdminFestival } from "@/lib/admin/data";
import { getLocale } from "@/lib/server-locale";

const ENTITY: Record<"cs" | "en", Record<string, string>> = {
  cs: {
    festival: "festival",
    lesson: "lekci",
    party: "párty",
    slot: "slot",
    slots: "sloty",
    room: "místnost",
    style: "styl",
    teacher: "učitele",
    organizer: "organizátora",
    invitation: "pozvánku",
    info: "info stránku",
    program: "program",
  },
  en: {
    festival: "the festival",
    lesson: "class",
    party: "party",
    slot: "time slot",
    slots: "time slots",
    room: "room",
    style: "style",
    teacher: "teacher",
    organizer: "organizer",
    invitation: "invitation",
    info: "info page",
    program: "the program",
  },
};

const ACTION: Record<"cs" | "en", Record<string, string>> = {
  cs: { create: "přidal(a)", update: "upravil(a)", delete: "smazal(a)", cancel: "zrušil(a)", restore: "obnovil(a)", import: "importoval(a)" },
  en: { create: "added", update: "updated", delete: "deleted", cancel: "cancelled", restore: "restored", import: "imported" },
};

// Stránka čte data přihlášeného organizátora – smí počkat na server.
export const instant = false;

/** Log změn festivalu – kdo, kdy, co (PRD 5.4). */
export default async function LogPage({ params }: PageProps<"/admin/[festival]/log">) {
  const { festival: slug } = await params;
  const { program, db } = await loadAdminFestival(slug);
  const [{ data: entries }, { data: members }] = await Promise.all([
    db.from("change_log").select("id, actor_id, entity, action, data, created_at").eq("festival_id", program.festival.id).order("created_at", { ascending: false }).limit(200),
    db.rpc("festival_organizers", { fid: program.festival.id }),
  ]);
  const locale = await getLocale();
  const tr = (cs: string, en: string) => (locale === "cs" ? cs : en);
  const names = new Map(((members ?? []) as { user_id: string; display_name: string }[]).map((m) => [m.user_id, m.display_name]));
  const fmt = new Intl.DateTimeFormat(locale === "cs" ? "cs-CZ" : "en-GB", { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <Card title={tr("Log změn", "Change log")}>
      {entries?.length ? (
        <ul className="divide-y divide-line text-sm">
          {entries.map((e) => (
            <li key={e.id} className="flex gap-3 py-2">
              <span className="w-28 shrink-0 text-xs tabular-nums text-muted">{fmt.format(new Date(e.created_at))}</span>
              <span>
                <span className="font-medium">{names.get(e.actor_id) ?? tr("Bývalý organizátor", "Former organizer")}</span> {ACTION[locale][e.action] ?? e.action}{" "}
                {ENTITY[locale][e.entity] ?? e.entity}
                {(e.data as { label?: string } | null)?.label && <> „{(e.data as { label: string }).label}“</>}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">{tr("Zatím žádné změny.", "No changes yet.")}</p>
      )}
    </Card>
  );
}
