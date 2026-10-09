"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { nowInZone } from "@/lib/time";
import type { FestivalProgram, Lesson, Room, Style, Teacher, TimeSlot } from "@/lib/types";

export interface Filters {
  styles: string[];
  rooms: string[];
  teachers: string[];
  levels: number[];
}

const emptyFilters: Filters = { styles: [], rooms: [], teachers: [], levels: [] };

export type ViewMode = "grid" | "list";

interface ProgramState {
  program: FestivalProgram;
  base: string;
  slotById: Map<string, TimeSlot>;
  roomById: Map<string, Room>;
  styleById: Map<string, Style>;
  teacherById: Map<string, Teacher>;
  slotsOfDay: (dayId: string) => TimeSlot[];
  lessonStart: (l: Lesson) => string;
  lessonEnd: (l: Lesson) => string;
  dayId: string;
  setDayId: (id: string) => void;
  view: ViewMode;
  setView: (v: ViewMode) => void;
  filters: Filters;
  setFilters: (f: Filters) => void;
  activeFilterCount: number;
  matches: (l: Lesson) => boolean;
  /** Aktuální čas festivalu, pokud dnes probíhá; jinak null. */
  now: { date: string; time: string } | null;
}

const Ctx = createContext<ProgramState | null>(null);

function pickInitialDay(program: FestivalProgram) {
  const { date } = nowInZone(program.festival.timezone);
  return (program.days.find((d) => d.date === date) ?? program.days[0])?.id ?? "";
}

export function ProgramProvider({ program, children }: { program: FestivalProgram; children: React.ReactNode }) {
  const [dayId, setDayId] = useState(() => program.days[0]?.id ?? "");
  const [view, setViewState] = useState<ViewMode>("grid");
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [now, setNow] = useState<{ date: string; time: string } | null>(null);

  // Den a čas závisí na hodinách zařízení – určíme je až v prohlížeči.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- hodnoty známé až v prohlížeči */
    setDayId(pickInitialDay(program));
    try {
      const stored = localStorage.getItem("clave.view");
      if (stored === "grid" || stored === "list") setViewState(stored);
    } catch {}
    /* eslint-enable react-hooks/set-state-in-effect */
    const tick = () => {
      const n = nowInZone(program.festival.timezone);
      setNow(program.days.some((d) => d.date === n.date) ? n : null);
    };
    tick();
    const timer = setInterval(tick, 60_000);
    return () => clearInterval(timer);
  }, [program]);

  const value = useMemo<ProgramState>(() => {
    const slotById = new Map(program.slots.map((s) => [s.id, s]));
    const roomById = new Map(program.rooms.map((r) => [r.id, r]));
    const styleById = new Map(program.styles.map((s) => [s.id, s]));
    const teacherById = new Map(program.teachers.map((t) => [t.id, t]));
    const slotsOfDay = (id: string) =>
      program.slots.filter((s) => s.dayId === id).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    const matches = (l: Lesson) =>
      (!filters.styles.length || (l.styleId !== null && filters.styles.includes(l.styleId))) &&
      (!filters.rooms.length || filters.rooms.includes(l.roomId)) &&
      (!filters.teachers.length || l.teacherIds.some((t) => filters.teachers.includes(t))) &&
      (!filters.levels.length || filters.levels.includes(l.level));
    return {
      program,
      base: `/${program.festival.slug}`,
      slotById,
      roomById,
      styleById,
      teacherById,
      slotsOfDay,
      lessonStart: (l) => slotById.get(l.startSlotId)?.startsAt ?? "",
      lessonEnd: (l) => slotById.get(l.endSlotId)?.endsAt ?? "",
      dayId,
      setDayId,
      view,
      setView: (v) => {
        setViewState(v);
        try {
          localStorage.setItem("clave.view", v);
        } catch {}
      },
      filters,
      setFilters,
      activeFilterCount: filters.styles.length + filters.rooms.length + filters.teachers.length + filters.levels.length,
      matches,
      now,
    };
  }, [program, dayId, view, filters, now]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useProgram() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useProgram mimo ProgramProvider");
  return ctx;
}
