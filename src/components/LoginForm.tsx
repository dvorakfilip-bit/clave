"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { createBrowserSupabase } from "@/lib/supabase/browser";

const text = {
  cs: {
    title: "Přihlášení",
    google: "Pokračovat přes Google",
    other: "Jiný způsob přihlášení",
    email: "E-mail",
    send: "Poslat přihlašovací odkaz",
    sent: "Odkaz jsme poslali na váš e-mail. Otevřete ho v tomto zařízení.",
    error: "Přihlášení se nepovedlo. Zkuste to znovu.",
    notConfigured: "Přihlášení zatím není nastavené (chybí připojení k Supabase).",
  },
  en: {
    title: "Sign in",
    google: "Continue with Google",
    other: "Other sign-in options",
    email: "Email",
    send: "Send sign-in link",
    sent: "We sent a link to your email. Open it on this device.",
    error: "Sign-in failed. Try again.",
    notConfigured: "Sign-in isn't configured yet (Supabase connection missing).",
  },
};

/** Google jako hlavní způsob, magic link schovaný pod „Jiný způsob přihlášení“ (PRD 8). */
export function LoginForm() {
  const { locale, t } = useI18n();
  const tx = text[locale];
  const params = useSearchParams();
  const next = params.get("next") ?? "/";
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">(params.get("error") ? "error" : "idle");
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

  const redirectTo = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  async function google() {
    const { error } = await createBrowserSupabase().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectTo() },
    });
    if (error) setState("error");
  }

  async function magicLink(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    const { error } = await createBrowserSupabase().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo() },
    });
    setState(error ? "error" : "sent");
  }

  if (!configured) return <p className="text-center text-sm text-muted">{tx.notConfigured}</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-center text-lg font-semibold">{tx.title}</h1>
      {state === "error" && <p className="rounded-lg bg-accent-soft p-3 text-sm">{tx.error}</p>}
      <button onClick={google} className="w-full rounded-lg bg-brand py-3 text-sm font-semibold text-on-brand">
        {tx.google}
      </button>
      <details className="rounded-lg border border-line bg-surface p-3">
        <summary className="cursor-pointer text-sm text-muted">{tx.other}</summary>
        {state === "sent" ? (
          <p className="mt-3 text-sm">{tx.sent}</p>
        ) : (
          <form onSubmit={magicLink} className="mt-3 space-y-2">
            <label className="block text-xs text-muted" htmlFor="email">
              {tx.email}
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-line bg-page px-3 py-2 text-sm"
              placeholder="jana@example.com"
            />
            <button disabled={state === "sending"} className="w-full rounded-lg border border-line py-2 text-sm font-medium">
              {tx.send}
            </button>
          </form>
        )}
      </details>
      <p className="text-center text-xs text-muted">
        {t("signInConsent")}{" "}
        <Link href="/soukromi" className="underline">
          {t("privacy").toLowerCase()}
        </Link>
        .
      </p>
    </div>
  );
}
