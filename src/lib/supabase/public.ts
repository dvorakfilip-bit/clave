import { createClient } from "@supabase/supabase-js";

/**
 * Klient bez cookies – vidí jen veřejná data (RLS). Používá se v cachovaných
 * funkcích, protože jejich výsledek sdílí všichni návštěvníci.
 */
export function createPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}
