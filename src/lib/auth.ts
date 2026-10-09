import "server-only";
import { redirect } from "next/navigation";
import { createServerSupabase } from "./supabase/server";

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  isPlatformAdmin: boolean;
}

/** Přihlášený uživatel, nebo přesměrování na přihlášení (Data Access Layer). */
export async function requireUser(next = "/admin"): Promise<CurrentUser> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) redirect("/prihlaseni");
  const db = await createServerSupabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect(`/prihlaseni?next=${encodeURIComponent(next)}`);

  const [{ data: profile }, { data: isAdmin }] = await Promise.all([
    db.from("profiles").select("display_name, email").eq("id", user.id).single(),
    db.rpc("is_platform_admin"),
  ]);
  return {
    id: user.id,
    email: profile?.email ?? user.email ?? "",
    name: profile?.display_name ?? user.email ?? "",
    isPlatformAdmin: Boolean(isAdmin),
  };
}
