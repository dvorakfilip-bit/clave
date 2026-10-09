import type { Teacher } from "@/lib/types";

export function TeacherAvatar({ teacher, size = 40 }: { teacher: Teacher; size?: number }) {
  if (teacher.photoUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- fotku nahrává učitel / organizátor
    return <img src={teacher.photoUrl} alt="" width={size} height={size} className="rounded-full object-cover" style={{ width: size, height: size }} />;
  }
  const initials = teacher.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("");
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-accent-soft font-semibold text-ink"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}
