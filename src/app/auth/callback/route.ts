import { type NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

/** Návrat z Google / magic linku: vytvoří session a přijme čekající pozvánky (PRD 4.1). */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";

  if (code) {
    const db = await createServerSupabase();
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (!error) {
      await db.rpc("accept_invitations");
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
  }
  return NextResponse.redirect(`${origin}/prihlaseni?error=1`);
}
