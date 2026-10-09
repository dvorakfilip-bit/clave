"use client";

import type { User } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { overlaps, span } from "@/lib/time";
import { useProgram } from "./ProgramContext";

export type ItemKind = "lesson" | "party";
export interface ItemRef {
  kind: ItemKind;
  id: string;
}

interface PersonalState {
  /** undefined = ještě se zjišťuje, null = nepřihlášen */
  user: User | null | undefined;
  /** Přihlášený uživatel je organizátorem tohoto festivalu (nebo správcem platformy). */
  isOrganizer: boolean;
  isSelected: (ref: ItemRef) => boolean;
  toggle: (ref: ItemRef) => void;
  /** Vybrané položky, se kterými se daná položka časově překrývá. */
  conflictsOf: (ref: ItemRef) => ItemRef[];
  selected: ItemRef[];
  /** Vybrané položky změněné od poslední návštěvy (PRD 5.3). */
  changed: ItemRef[];
  isChanged: (ref: ItemRef) => boolean;
  /** Název lekce / párty v jazyce uživatele. */
  titleOf: (ref: ItemRef) => string;
  acknowledgeChanges: () => void;
  error: string | null;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<boolean>;
}

const Ctx = createContext<PersonalState | null>(null);
const key = (r: ItemRef) => `${r.kind}:${r.id}`;
const supabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

/**
 * Osobní program přihlášeného účastníka. Čte se přímo z prohlížeče (RLS: jen vlastní data),
 * takže veřejný program může zůstat cachovaný pro všechny.
 */
export function PersonalProvider({ children }: { children: React.ReactNode }) {
  const { program, slotById, lessonStart, lessonEnd } = useProgram();
  const { t, pick } = useI18n();
  const festivalId = program.festival.id;
  const [user, setUser] = useState<User | null | undefined>(supabaseConfigured ? undefined : null);
  const [selection, setSelection] = useState<Map<string, string>>(new Map()); // klíč → created_at
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOrganizer, setIsOrganizer] = useState(false);

  useEffect(() => {
    if (!supabaseConfigured) return;
    const db = createBrowserSupabase();
    db.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: sub } = db.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- odhlášení vyprázdní výběr
      setSelection(new Map());
      setIsOrganizer(false);
      return;
    }
    const db = createBrowserSupabase();
    let cancelled = false;
    (async () => {
      const [{ data: rows }, { data: visit }, { data: organizer }] = await Promise.all([
        db.rpc("my_selections", { fid: festivalId }),
        db.from("festival_visits").select("last_seen_at").eq("festival_id", festivalId).maybeSingle(),
        db.rpc("is_organizer", { fid: festivalId }),
      ]);
      if (cancelled) return;
      setIsOrganizer(Boolean(organizer));
      const map = new Map<string, string>();
      for (const r of (rows ?? []) as { lesson_id: string | null; party_id: string | null; created_at: string }[]) {
        map.set(r.lesson_id ? `lesson:${r.lesson_id}` : `party:${r.party_id}`, r.created_at);
      }
      setSelection(map);
      if (visit) {
        setLastSeen(visit.last_seen_at);
      } else {
        // První návštěva – změny se počítají až od teď.
        const now = new Date().toISOString();
        setLastSeen(now);
        await db.from("festival_visits").upsert({ user_id: user.id, festival_id: festivalId, last_seen_at: now });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, festivalId]);

  const timeOf = useCallback(
    (ref: ItemRef): { dayId: string; range: [number, number] } | null => {
      if (ref.kind === "lesson") {
        const l = program.lessons.find((x) => x.id === ref.id);
        if (!l || !slotById.get(l.startSlotId)) return null;
        return { dayId: l.dayId, range: span(lessonStart(l), lessonEnd(l)) };
      }
      const p = program.parties.find((x) => x.id === ref.id);
      return p ? { dayId: p.dayId, range: span(p.startsAt, p.endsAt) } : null;
    },
    [program, slotById, lessonStart, lessonEnd],
  );

  const selected = useMemo(
    () =>
      [...selection.keys()]
        .map((k) => {
          const [kind, id] = k.split(":") as [ItemKind, string];
          return { kind, id };
        })
        .filter((r) => timeOf(r) !== null),
    [selection, timeOf],
  );

  const conflictsOf = useCallback(
    (ref: ItemRef) => {
      const me = timeOf(ref);
      if (!me) return [];
      return selected.filter((other) => {
        if (key(other) === key(ref)) return false;
        const o = timeOf(other);
        return o !== null && o.dayId === me.dayId && overlaps(o.range, me.range);
      });
    },
    [selected, timeOf],
  );

  const changed = useMemo(() => {
    if (!lastSeen) return [];
    return selected.filter((ref) => {
      const item = ref.kind === "lesson" ? program.lessons.find((l) => l.id === ref.id) : program.parties.find((p) => p.id === ref.id);
      const chosenAt = selection.get(key(ref)) ?? "";
      // Změna po poslední návštěvě a zároveň po tom, co si uživatel položku vybral.
      return Boolean(item?.changedAt && item.changedAt > lastSeen && item.changedAt > chosenAt);
    });
  }, [selected, selection, lastSeen, program]);

  const value = useMemo<PersonalState>(() => {
    const changedKeys = new Set(changed.map(key));
    return {
      user,
      isOrganizer,
      selected,
      isSelected: (ref) => selection.has(key(ref)),
      conflictsOf,
      changed,
      isChanged: (ref) => changedKeys.has(key(ref)),
      titleOf: (ref) => {
        const x = ref.kind === "lesson" ? program.lessons.find((l) => l.id === ref.id) : program.parties.find((p) => p.id === ref.id);
        return x ? pick(x.titleCs, x.titleEn) : "";
      },
      error,
      toggle: (ref) => {
        if (!user) return;
        const k = key(ref);
        const wasSelected = selection.has(k);
        const column = ref.kind === "lesson" ? "lesson_id" : "party_id";
        setError(null);
        setSelection((prev) => {
          const next = new Map(prev);
          if (wasSelected) next.delete(k);
          else next.set(k, new Date().toISOString());
          return next;
        });
        const db = createBrowserSupabase();
        const request = wasSelected
          ? db.from("personal_selections").delete().eq("user_id", user.id).eq(column, ref.id)
          : db.from("personal_selections").insert({ user_id: user.id, [column]: ref.id });
        request.then(({ error: e }) => {
          if (!e) return;
          setError(t("offlineSave"));
          setSelection((prev) => {
            const next = new Map(prev);
            if (wasSelected) next.set(k, new Date().toISOString());
            else next.delete(k);
            return next;
          });
        });
      },
      acknowledgeChanges: () => {
        if (!user) return;
        const now = new Date().toISOString();
        setLastSeen(now);
        createBrowserSupabase().from("festival_visits").upsert({ user_id: user.id, festival_id: festivalId, last_seen_at: now }).then();
      },
      signOut: async () => {
        await createBrowserSupabase().auth.signOut();
      },
      deleteAccount: async () => {
        const db = createBrowserSupabase();
        const { error: e } = await db.rpc("delete_my_account");
        if (e) {
          setError(e.message);
          return false;
        }
        await db.auth.signOut();
        return true;
      },
    };
  }, [user, isOrganizer, selected, selection, conflictsOf, changed, error, festivalId, t, pick, program]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePersonal() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePersonal mimo PersonalProvider");
  return ctx;
}
