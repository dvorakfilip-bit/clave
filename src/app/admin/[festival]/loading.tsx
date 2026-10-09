// Při přepínání záložek se hned ukáže záložka a data se dočtou (Suspense kolem stránek správy).
export default function Loading() {
  return <p className="text-sm text-muted">Načítám…</p>;
}
