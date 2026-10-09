import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";

/** Klient s přihlášeným uživatelem (cookies) – pro serverové akce a stránky správy. */
export async function createServerSupabase() {
  // Ověření přihlášení pracuje s aktuálním časem (platnost tokenu) – smí běžet jen při požadavku, ne při předgenerování.
  await connection();
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try {
            toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Volání ze Server Component – cookies obnoví proxy.
          }
        },
      },
    },
  );
}
