import Link from "next/link";
import { Suspense } from "react";
import { ClaveLogo } from "@/components/ClaveLogo";
import { TeacherProfileForm } from "@/components/TeacherProfileForm";
import { requireUser } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";

export const metadata = { title: "Můj profil učitele" };

// Stránka čte data přihlášeného uživatele – smí počkat na server.
export const instant = false;

async function Profile() {
  const user = await requireUser("/ucet");
  const db = await createServerSupabase();
  const [{ data: profile }, { data: revisions }] = await Promise.all([
    db.from("teacher_profiles").select("id, name, photo_url, bio_cs, bio_en").eq("user_id", user.id).maybeSingle(),
    db.rpc("my_teacher_revisions"),
  ]);

  if (!profile) {
    return (
      <p className="text-sm text-muted">
        Tvůj účet ({user.email}) není propojený s profilem učitele. Pokud učíš na festivalu, požádej organizátora, ať tě pozve na tento e-mail.
      </p>
    );
  }

  const { data: festivals } = await db
    .from("festival_teachers")
    .select("festivals(slug, name, start_date)")
    .eq("teacher_profile_id", profile.id);

  return (
    <div className="space-y-6">
      <TeacherProfileForm
        profileId={profile.id}
        profile={{ name: profile.name, photoUrl: profile.photo_url ?? "", bioCs: profile.bio_cs ?? "", bioEn: profile.bio_en ?? "" }}
        revisions={(revisions ?? []) as { id: number; created_at: string; by_me: boolean; previous: Record<string, string | null> }[]}
      />
      {festivals && festivals.length > 0 && (
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Moje festivaly</h2>
          <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
            {festivals.map((row) => {
              const f = row.festivals as unknown as { slug: string; name: string } | null;
              if (!f) return null;
              return (
                <li key={f.slug}>
                  <Link href={`/${f.slug}/ucitele/${profile.id}`} className="block p-3 text-sm">
                    {f.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

export default function AccountPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6">
      <Link href="/" className="mb-6 flex items-center gap-2 font-semibold">
        <ClaveLogo size={26} />
        Můj profil učitele
      </Link>
      <Suspense fallback={<p className="text-sm text-muted">Načítám…</p>}>
        <Profile />
      </Suspense>
    </main>
  );
}
