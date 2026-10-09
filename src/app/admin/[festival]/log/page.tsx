import { Card } from "@/components/admin/ui";
import { loadAdminFestival } from "@/lib/admin/data";

const ENTITY: Record<string, string> = {
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
};

const ACTION: Record<string, string> = {
  create: "přidal(a)",
  update: "upravil(a)",
  delete: "smazal(a)",
  cancel: "zrušil(a)",
  restore: "obnovil(a)",
  import: "importoval(a)",
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
  const names = new Map(((members ?? []) as { user_id: string; display_name: string }[]).map((m) => [m.user_id, m.display_name]));
  const fmt = new Intl.DateTimeFormat("cs-CZ", { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <Card title="Log změn">
      {entries?.length ? (
        <ul className="divide-y divide-line text-sm">
          {entries.map((e) => (
            <li key={e.id} className="flex gap-3 py-2">
              <span className="w-28 shrink-0 text-xs tabular-nums text-muted">{fmt.format(new Date(e.created_at))}</span>
              <span>
                <span className="font-medium">{names.get(e.actor_id) ?? "Bývalý organizátor"}</span> {ACTION[e.action] ?? e.action}{" "}
                {ENTITY[e.entity] ?? e.entity}
                {(e.data as { label?: string } | null)?.label && <> „{(e.data as { label: string }).label}“</>}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">Zatím žádné změny.</p>
      )}
    </Card>
  );
}
