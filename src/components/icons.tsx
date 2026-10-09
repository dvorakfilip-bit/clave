const base = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export const CalendarIcon = () => (
  <svg {...base}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M16 3v4M8 3v4M3 11h18" />
  </svg>
);

export const HeartIcon = ({ filled = false, size = 22 }: { filled?: boolean; size?: number }) => (
  <svg {...base} width={size} height={size} fill={filled ? "currentColor" : "none"}>
    <path d="M19.5 12.6 12 20l-7.5-7.4A5 5 0 1 1 12 6a5 5 0 1 1 7.5 6.6z" />
  </svg>
);

export const UsersIcon = () => (
  <svg {...base}>
    <circle cx="9" cy="7" r="4" />
    <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2M16 3.1a4 4 0 0 1 0 7.8M21 21v-2a4 4 0 0 0-3-3.9" />
  </svg>
);

export const MenuIcon = () => (
  <svg {...base}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

export const FilterIcon = () => (
  <svg {...base}>
    <path d="M4 4h16v2.2a1 1 0 0 1-.3.7L14 12.5V19l-4 2v-8.5L4.3 6.9a1 1 0 0 1-.3-.7z" />
  </svg>
);

export const BackIcon = () => (
  <svg {...base}>
    <path d="M15 6l-6 6 6 6" />
  </svg>
);

export const ShareIcon = () => (
  <svg {...base} width={18} height={18}>
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="6" r="3" />
    <circle cx="18" cy="18" r="3" />
    <path d="M8.7 10.7l6.6-3.4M8.7 13.3l6.6 3.4" />
  </svg>
);

export const MoonIcon = () => (
  <svg {...base} width={16} height={16}>
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z" />
  </svg>
);
