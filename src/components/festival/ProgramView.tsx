"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FilterIcon, MoonIcon } from "@/components/icons";
import { LevelDots } from "@/components/LevelDots";
import { layoutGrid } from "@/lib/grid";
import { useI18n } from "@/lib/i18n";
import { crossesMidnight, formatDay } from "@/lib/time";
import type { TimeSlot } from "@/lib/types";
import { HeartButton } from "./HeartButton";
import { Badge, LessonCard } from "./LessonCard";
import { ChangesBanner } from "./ChangesBanner";
import { usePersonal } from "./PersonalContext";
import { type Filters, useProgram } from "./ProgramContext";

export function ProgramView() {
  const { program, dayId, setDayId, view, setView, activeFilterCount } = useProgram();
  const { t, locale } = useI18n();
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <div>
      <div className="sticky top-[60px] z-20 border-b border-line bg-surface">
        <div className="flex gap-2 overflow-x-auto px-4 py-2" role="tablist">
          {program.days.map((d) => (
            <button
              key={d.id}
              role="tab"
              aria-selected={d.id === dayId}
              onClick={() => setDayId(d.id)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium capitalize ${
                d.id === dayId ? "bg-brand text-on-brand" : "border border-line text-muted"
              }`}
            >
              {formatDay(d.date, locale)}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between px-4 pb-2">
          <div className="inline-flex rounded-lg border border-line p-0.5 text-xs">
            {(["grid", "list"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                aria-pressed={view === v}
                className={`rounded-md px-3 py-1 ${view === v ? "bg-brand text-on-brand" : "text-muted"}`}
              >
                {t(v)}
              </button>
            ))}
          </div>
          <button
            onClick={() => setFiltersOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1 text-xs"
          >
            <FilterIcon />
            {t("filters")}
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-highlight px-1.5 text-[10px] font-semibold text-on-highlight">{activeFilterCount}</span>
            )}
          </button>
        </div>
      </div>

      <ChangesBanner />
      {view === "grid" ? <GridView /> : <ListView />}
      <Parties />
      {filtersOpen && <FilterSheet onClose={() => setFiltersOpen(false)} />}
    </div>
  );
}

function useDayData() {
  const ctx = useProgram();
  const { program, dayId, slotsOfDay, now } = ctx;
  const day = program.days.find((d) => d.id === dayId);
  const slots = slotsOfDay(dayId);
  const lessons = program.lessons.filter((l) => l.dayId === dayId);
  const nowTime = day && now && now.date === day.date ? now.time : null;
  const isLive = (start: string, end: string) => nowTime !== null && start <= nowTime && nowTime < end;
  return { ...ctx, day, slots, lessons, nowTime, isLive };
}

function useScrollToNow(slots: TimeSlot[], isLive: (s: string, e: string) => boolean, dayId: string) {
  const refs = useRef(new Map<string, HTMLElement>());
  const liveSlot = slots.find((s) => isLive(s.startsAt, s.endsAt))?.id;
  useEffect(() => {
    if (liveSlot) refs.current.get(liveSlot)?.scrollIntoView({ block: "center", behavior: "smooth" });
    // Posouvá se jen při otevření dne, ne každou minutu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayId, Boolean(liveSlot)]);
  return (id: string) => (el: HTMLElement | null) => {
    if (el) refs.current.set(id, el);
    else refs.current.delete(id);
  };
}

function GridView() {
  const { program, slots, lessons, matches, lessonStart, lessonEnd, isLive, dayId, base } = useDayData();
  const { t, pick } = useI18n();
  const setRef = useScrollToNow(slots, isLive, dayId);
  const rooms = [...program.rooms].sort((a, b) => a.position - b.position);
  // Lekce podle počátečního slotu a místnosti; buňky pod vícehodinovou lekcí se přeskočí.
  const { cells, covered } = layoutGrid(lessons, slots);

  return (
    <div className="overflow-x-auto px-2 py-3">
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `48px repeat(${rooms.length}, minmax(118px, 1fr))`, minWidth: 48 + rooms.length * 122 }}
      >
        <div className="sticky left-0 z-10 bg-page" />
        {rooms.map((r) => (
          <div key={r.id} className="truncate pb-1 text-center text-[11px] font-semibold text-muted">
            {r.name}
          </div>
        ))}

        {slots.map((slot, si) => {
          const live = isLive(slot.startsAt, slot.endsAt);
          return [
            <div
              key={slot.id}
              ref={setRef(slot.id)}
              className={`sticky left-0 z-10 bg-page pt-1 text-[11px] tabular-nums ${live ? "font-semibold text-highlight" : "text-muted"}`}
              style={{ gridRow: si + 2, gridColumn: 1 }}
            >
              {slot.startsAt}
              {live && <span className="mt-0.5 block text-[9px] uppercase">● {t("now")}</span>}
            </div>,
            ...rooms.map((room, ri) => {
              const key = `${si}:${room.id}`;
              if (covered.has(key)) return null;
              const cell = cells.get(key);
              const style = { gridRow: si + 2, gridColumn: ri + 2 } as React.CSSProperties;
              if (!cell) {
                return <div key={key} style={style} className="min-h-[92px] rounded-lg border border-dashed border-line" />;
              }
              const { lesson, replaced } = cell;
              return (
                <div key={key} style={{ ...style, gridRow: `${si + 2} / span ${cell.span}` }} className="flex min-h-[92px] flex-col gap-1">
                  <div className="flex-1">
                    <LessonCard
                      lesson={lesson}
                      live={isLive(lessonStart(lesson), lessonEnd(lesson))}
                      dimmed={!matches(lesson)}
                    />
                  </div>
                  {replaced.map((r) => (
                    <Link
                      key={r.id}
                      href={`${base}/lekce/${r.id}`}
                      className="truncate rounded-md border border-line px-2 py-0.5 text-[10px] text-muted"
                    >
                      <span className="font-semibold uppercase">{t("cancelled")}:</span> <span className="line-through">{pick(r.titleCs, r.titleEn)}</span>
                    </Link>
                  ))}
                </div>
              );
            }),
          ];
        })}
      </div>
    </div>
  );
}

function ListView() {
  const { slots, lessons, matches, lessonStart, lessonEnd, isLive, roomById, dayId } = useDayData();
  const { t } = useI18n();
  const setRef = useScrollToNow(slots, isLive, dayId);
  const visible = lessons
    .filter(matches)
    .sort(
      (a, b) =>
        lessonStart(a).localeCompare(lessonStart(b)) ||
        (roomById.get(a.roomId)?.position ?? 0) - (roomById.get(b.roomId)?.position ?? 0),
    );

  if (!visible.length) return <p className="px-4 py-8 text-center text-sm text-muted">{t("noLessons")}</p>;

  return (
    <div className="space-y-4 px-4 py-3">
      {slots.map((slot) => {
        const group = visible.filter((l) => l.startSlotId === slot.id);
        if (!group.length) return null;
        const live = isLive(slot.startsAt, slot.endsAt);
        return (
          <section key={slot.id} ref={setRef(slot.id)}>
            <h3 className={`mb-1.5 text-xs font-semibold tabular-nums ${live ? "text-highlight" : "text-muted"}`}>
              {slot.startsAt}–{slot.endsAt} {live && `· ${t("now")}`}
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {group.map((l) => (
                <LessonCard key={l.id} lesson={l} showRoom showTime={l.endSlotId !== l.startSlotId} live={isLive(lessonStart(l), lessonEnd(l))} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function Parties() {
  const { program, dayId, roomById } = useProgram();
  const { pick, t } = useI18n();
  const { isChanged } = usePersonal();
  const parties = program.parties.filter((p) => p.dayId === dayId);
  if (!parties.length) return null;
  return (
    <div className="space-y-2 px-4 pb-4">
      {parties.map((p) => (
        <div key={p.id} className="flex items-center gap-2 rounded-lg bg-accent-soft px-3 py-2 text-sm">
          <span className="text-accent">
            <MoonIcon />
          </span>
          <span className={`font-medium tabular-nums ${p.cancelled ? "line-through" : ""}`}>
            {p.startsAt}
            {p.endsAt && `–${p.endsAt}`}
            {crossesMidnight(p.startsAt, p.endsAt) && ` (${t("nextDay")})`}
          </span>
          <span className={`flex-1 ${p.cancelled ? "line-through" : ""}`}>
            {pick(p.titleCs, p.titleEn)} · {p.roomId ? roomById.get(p.roomId)?.name : p.place}
          </span>
          {p.cancelled && <Badge>{t("cancelled")}</Badge>}
          {!p.cancelled && isChanged({ kind: "party", id: p.id }) && <Badge>{t("changed")}</Badge>}
          <HeartButton item={{ kind: "party", id: p.id }} />
        </div>
      ))}
    </div>
  );
}

function FilterSheet({ onClose }: { onClose: () => void }) {
  const { program, filters, setFilters } = useProgram();
  const { t } = useI18n();
  const levels = [...new Set(program.lessons.map((l) => l.level))].sort((a, b) => a - b);

  function toggle<K extends keyof Filters>(key: K, value: Filters[K][number]) {
    const list = filters[key] as Filters[K][number][];
    const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
    setFilters({ ...filters, [key]: next });
  }

  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1 text-xs ${active ? "border-brand bg-brand text-on-brand" : "border-line"}`;

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/40 sm:items-center sm:justify-center" onClick={onClose}>
      <div
        role="dialog"
        aria-label={t("filters")}
        className="max-h-[80dvh] w-full overflow-y-auto rounded-t-2xl bg-surface p-4 sm:max-w-lg sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">{t("filters")}</h2>
          <button onClick={() => setFilters({ styles: [], rooms: [], teachers: [], levels: [] })} className="text-xs text-muted underline">
            {t("clearFilters")}
          </button>
        </div>

        <FilterGroup title={t("style")}>
          {program.styles.map((s) => (
            <button key={s.id} className={chip(filters.styles.includes(s.id))} onClick={() => toggle("styles", s.id)}>
              <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />
              {s.name}
            </button>
          ))}
        </FilterGroup>
        <FilterGroup title={t("room")}>
          {program.rooms.map((r) => (
            <button key={r.id} className={chip(filters.rooms.includes(r.id))} onClick={() => toggle("rooms", r.id)}>
              {r.name}
            </button>
          ))}
        </FilterGroup>
        <FilterGroup title={t("teacher")}>
          {program.teachers.map((te) => (
            <button key={te.id} className={chip(filters.teachers.includes(te.id))} onClick={() => toggle("teachers", te.id)}>
              {te.name}
            </button>
          ))}
        </FilterGroup>
        <FilterGroup title={t("level")}>
          {levels.map((lv) => (
            <button key={lv} className={chip(filters.levels.includes(lv))} onClick={() => toggle("levels", lv)}>
              <LevelDots level={lv} />
            </button>
          ))}
        </FilterGroup>

        <button onClick={onClose} className="mt-2 w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-on-brand">
          OK
        </button>
      </div>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{title}</h3>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
