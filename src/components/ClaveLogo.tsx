/** Logo platformy – rytmus 2-3 clave (PRD 7.6). */
export function ClaveLogo({ size = 32, mono = false }: { size?: number; mono?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <rect width="100" height="100" rx="22" fill={mono ? "currentColor" : "#C8102E"} />
      {[16, 32, 56, 71, 86].map((x) => (
        <circle key={x} cx={x} cy="50" r="5" fill={mono ? "var(--page)" : "#FFFFFF"} />
      ))}
    </svg>
  );
}
