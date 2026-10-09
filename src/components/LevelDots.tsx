/** Level 0–3 po polovinách: 3 kolečka prázdná / poloplná / plná (PRD 5.1). */
export function LevelDots({ level, size = 10, label }: { level: number; size?: number; label?: string }) {
  return (
    <span className="inline-flex gap-[2px] align-middle" role="img" aria-label={label ?? `Level ${level}`}>
      {[1, 2, 3].map((i) => {
        const fill = level >= i ? 1 : level >= i - 0.5 ? 0.5 : 0;
        return (
          <svg key={i} width={size} height={size} viewBox="0 0 10 10" aria-hidden="true">
            <circle cx="5" cy="5" r="4" fill="none" stroke="currentColor" strokeWidth="1.3" />
            {fill === 1 && <circle cx="5" cy="5" r="4" fill="currentColor" />}
            {fill === 0.5 && <path d="M5 1 A4 4 0 0 0 5 9 Z" fill="currentColor" />}
          </svg>
        );
      })}
    </span>
  );
}
