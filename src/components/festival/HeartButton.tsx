"use client";

import { usePathname, useRouter } from "next/navigation";
import { HeartIcon } from "@/components/icons";
import { useI18n } from "@/lib/i18n";
import { type ItemRef, usePersonal } from "./PersonalContext";

/** „Chci jít“ – přidá/odebere položku z osobního programu, při kolizi se zeptá (PRD 5.2). */
export function HeartButton({ item, size = 18, withLabel = false, className = "" }: { item: ItemRef; size?: number; withLabel?: boolean; className?: string }) {
  const { user, isSelected, toggle, conflictsOf, titleOf } = usePersonal();
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const selected = isSelected(item);

  function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (user === undefined) return;
    if (!user) {
      if (window.confirm(t("signInToSave"))) router.push(`/prihlaseni?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (!selected) {
      const conflicts = conflictsOf(item);
      if (conflicts.length && !window.confirm(`${t("conflictConfirm")}: ${conflicts.map(titleOf).join(", ")}. ${t("addAnyway")}`)) return;
    }
    toggle(item);
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      aria-label={selected ? t("wanted") : t("want")}
      className={`inline-flex items-center gap-1.5 ${selected ? "text-highlight" : "opacity-60"} ${className}`}
    >
      <HeartIcon filled={selected} size={size} />
      {withLabel && <span className="text-sm">{selected ? t("wanted") : t("want")}</span>}
    </button>
  );
}
