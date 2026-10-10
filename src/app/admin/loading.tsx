import { Tr } from "@/components/Tr";

// Okamžitý přechod mezi stránkami správy, data přihlášeného uživatele se dočtou.
export default function Loading() {
  return (
    <p className="text-sm text-muted">
      <Tr cs="Načítám…" en="Loading…" />
    </p>
  );
}
