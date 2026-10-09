"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { formatRange } from "@/lib/time";
import type { FestivalSummary } from "@/lib/types";

export function FestivalList({ festivals }: { festivals: FestivalSummary[] }) {
  const { t, locale } = useI18n();
  const current = festivals.filter((f) => f.status === "published").sort((a, b) => a.startDate.localeCompare(b.startDate));
  const archived = festivals.filter((f) => f.status === "archived");

  if (!festivals.length) return <p className="text-muted">{t("noFestivals")}</p>;

  const card = (f: FestivalSummary) => (
    <li key={f.id}>
      <Link href={`/${f.slug}`} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3">
        {f.logoSquareUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- logo nahrává organizátor
          <img src={f.logoSquareUrl} alt="" className="h-12 w-12 rounded-lg object-cover" />
        ) : (
          <span className="h-12 w-12 shrink-0 rounded-lg" style={{ background: f.colors[0] }} aria-hidden="true" />
        )}
        <span>
          <span className="block font-semibold">{f.name}</span>
          <span className="block text-sm text-muted">{formatRange(f.startDate, f.endDate, locale)}</span>
        </span>
      </Link>
    </li>
  );

  return (
    <div className="space-y-8">
      {current.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">{t("upcoming")}</h2>
          <ul className="space-y-2">{current.map(card)}</ul>
        </section>
      )}
      {archived.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">{t("archive")}</h2>
          <ul className="space-y-2">{archived.map(card)}</ul>
        </section>
      )}
    </div>
  );
}
