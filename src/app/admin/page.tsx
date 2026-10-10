import Link from "next/link";
import { NewFestivalForm } from "@/components/admin/NewFestivalForm";
import { requireUser } from "@/lib/auth";
import { SITE_HOST } from "@/lib/site";
import { createServerSupabase } from "@/lib/supabase/server";
import { formatRange } from "@/lib/time";

const STATUS = { draft: "Koncept", published: "Zveřejněno", archived: "Archiv" } as const;

// Stránka čte data přihlášeného organizátora – smí počkat na server.
export const instant = false;

export default async function AdminHome() {
  const user = await requireUser();
  const db = await createServerSupabase();

  // Správce platformy vidí všechny festivaly, organizátor jen své (RLS).
  const { data: memberships } = await db.from("festival_members").select("festival_id").eq("user_id", user.id);
  let query = db.from("festivals").select("id, slug, name, start_date, end_date, status").order("start_date", { ascending: false });
  if (!user.isPlatformAdmin) query = query.in("id", (memberships ?? []).map((m) => m.festival_id));
  const { data: festivals } = await query;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Moje festivaly</h1>
      {festivals?.length ? (
        <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
          {festivals.map((f) => (
            <li key={f.id}>
              <Link href={`/admin/${f.slug}`} className="flex items-center justify-between gap-3 p-3">
                <span>
                  <span className="block font-medium">{f.name}</span>
                  <span className="block text-xs text-muted">
                    {SITE_HOST}/{f.slug} · {formatRange(f.start_date, f.end_date, "cs")}
                  </span>
                </span>
                <span className="rounded-full border border-line px-2 py-0.5 text-xs">{STATUS[f.status as keyof typeof STATUS]}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">
          Zatím nespravuješ žádný festival. Pokud tě organizátor pozval, přihlas se e-mailem, na který přišla pozvánka.
        </p>
      )}
      {user.isPlatformAdmin && <NewFestivalForm />}
    </div>
  );
}
