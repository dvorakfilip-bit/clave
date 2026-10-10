"use client";

import Link from "next/link";
import { ClaveLogo } from "@/components/ClaveLogo";
import { useI18n } from "@/lib/i18n";
import { usePathname } from "next/navigation";
import { usePersonal } from "./PersonalContext";
import { useProgram } from "./ProgramContext";

export function MorePage() {
  const { program } = useProgram();
  const { t, pick, locale, setLocale } = useI18n();
  const { user, isOrganizer, isTeacher, signOut, deleteAccount, error } = usePersonal();
  const pathname = usePathname();
  const description = pick(program.festival.descriptionCs, program.festival.descriptionEn);

  return (
    <div className="space-y-5 px-4 py-3">
      {isOrganizer && (
        <Link
          href={`/admin/${program.festival.slug}`}
          className="flex items-center justify-between rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-on-brand"
        >
          {t("manageFestival")}
          <span aria-hidden="true">→</span>
        </Link>
      )}

      {program.festival.bannerUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- banner nahrává organizátor
        <img src={program.festival.bannerUrl} alt={program.festival.name} className="w-full rounded-xl object-cover" />
      )}

      {description && <p className="text-sm leading-relaxed">{description}</p>}

      {program.infoPages.length > 0 && (
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{t("info")}</h2>
          <div className="space-y-2">
            {program.infoPages.map((p) => (
              <details key={p.id} className="rounded-xl border border-line bg-surface p-3" open={program.infoPages.length === 1}>
                <summary className="cursor-pointer font-medium">{pick(p.titleCs, p.titleEn)}</summary>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{pick(p.bodyCs, p.bodyEn)}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{t("language")}</h2>
        <div className="inline-flex rounded-lg border border-line p-0.5 text-sm">
          {(["cs", "en"] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLocale(l)}
              aria-pressed={locale === l}
              className={`rounded-md px-4 py-1 ${locale === l ? "bg-brand text-on-brand" : "text-muted"}`}
            >
              {l === "cs" ? "Čeština" : "English"}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{t("account")}</h2>
        {user ? (
          <div className="space-y-3 rounded-xl border border-line bg-surface p-3 text-sm">
            <p>
              {t("signedInAs")} <span className="font-medium">{user.email}</span>
            </p>
            {error && <p className="rounded-lg bg-accent-soft px-3 py-2">{error}</p>}
            <div className="flex flex-wrap gap-2">
              {isTeacher && (
                <Link href="/ucet" className="rounded-lg border border-line px-3 py-1.5">
                  {t("teacherProfile")}
                </Link>
              )}
              <button onClick={signOut} className="rounded-lg border border-line px-3 py-1.5">
                {t("signOut")}
              </button>
              <button
                onClick={async () => {
                  if (window.confirm(t("deleteAccountConfirm")) && (await deleteAccount())) window.location.reload();
                }}
                className="rounded-lg px-3 py-1.5 text-highlight"
              >
                {t("deleteAccount")}
              </button>
            </div>
          </div>
        ) : user === null ? (
          <Link
            href={`/prihlaseni?next=${encodeURIComponent(pathname)}`}
            className="inline-block rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-on-brand"
          >
            {t("signIn")}
          </Link>
        ) : null}
      </section>

      <Link href="/" className="flex items-center gap-2 pt-4 text-xs text-muted">
        <span className="text-muted">
          <ClaveLogo size={18} mono />
        </span>
        Clave
      </Link>
    </div>
  );
}
