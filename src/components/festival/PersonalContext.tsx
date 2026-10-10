"use client";

import type { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { deleteMyAccount } from "@/app/ucet/actions";
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
  /** Přihlášený uživatel má profil učitele (může si upravit medailonek). */
  isTeacher: boolean;
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
/** Čas v ms; Postgres posílá mikrosekundy, které starší Safari neumí přečíst. */
const toMs = (iso: string | undefined) => (iso ? Date.parse(iso.replace(/(\.\d{3})\d+/, "$1")) || 0 : 0);
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
  const [isTeacher, setIsTeacher] = useState(false);
  const router = useRouter();
  const userId = user?.id;
  // Zvýší se po návratu signálu nebo do aplikace – osobní data se načtou znovu.
  const [reloadKey, setReloadKey] = useState(0);
  // Počet kliknutí na srdíčko; načtení ze serveru, během kterého uživatel klikal, se zahodí.
  const toggles = useRef(0);

  // Po obnovení připojení a po návratu do aplikace načíst čerstvý program i osobní data (PRD 6.2).
  useEffect(() => {
    let last = Date.now();
    const refresh = () => {
      if (!navigator.onLine || Date.now() - last < 60_000) return;
      last = Date.now();
      router.refresh();
      setReloadKey((k) => k + 1);
    };
    const onOnline = () => {
      last = 0;
      refresh();
    };
    const onVisible = () => document.visibilityState === "visible" && refresh();
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router]);

  useEffect(() => {
    if (!supabaseConfigured) return;
    const db = createBrowserSupabase();
    // getSession čte přihlášení z prohlížeče – funguje i bez signálu (data stejně hlídá RLS).
    db.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: sub } = db.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Závisí jen na ID uživatele – obnovení přihlášení (nový objekt User) nemá výběr načítat znovu.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- odhlášení vyprázdní výběr, offline se použije uložený */
    if (!userId) {
      setSelection(new Map());
      setLastSeen(null);
      setIsOrganizer(false);
      setIsTeacher(false);
      return;
    }
    const db = createBrowserSupabase();
    let cancelled = false;
    const startedAt = toggles.current;
    if (reloadKey === 0) {
      try {
        const cached = localStorage.getItem(`clave.selection.${festivalId}.${userId}`);
        if (cached) setSelection(new Map(JSON.parse(cached) as [string, string][]));
      } catch {}
    }
    /* eslint-enable react-hooks/set-state-in-effect */
    (async () => {
      const [{ data: rows }, { data: seen }, { data: organizer }, { data: teacher }] = await Promise.all([
        db.rpc("my_selections", { fid: festivalId }),
        // První návštěva se zapíše teď (změny se počítají až od ní); čas určuje server.
        db.rpc("touch_festival_visit", { fid: festivalId, only_if_missing: true }),
        db.rpc("is_organizer", { fid: festivalId }),
        db.from("teacher_profiles").select("id").eq("user_id", userId).maybeSingle(),
      ]);
      if (cancelled) return;
      setIsOrganizer(Boolean(organizer));
      setIsTeacher(Boolean(teacher));
      if (seen) setLastSeen(seen as string);
      // Bez signálu, nebo když uživatel mezitím klikal, zůstane výběr z telefonu.
      if (!rows || toggles.current !== startedAt) return;
      const map = new Map<string, string>();
      for (const r of rows as { lesson_id: string | null; party_id: string | null; created_at: string }[]) {
        map.set(r.lesson_id ? `lesson:${r.lesson_id}` : `party:${r.party_id}`, r.created_at);
      }
      setSelection(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, festivalId, reloadKey]);

  // Osobní výběr se drží i v telefonu, aby Můj program fungoval offline (PRD 6.2).
  useEffect(() => {
    if (!userId) return;
    try {
      localStorage.setItem(`clave.selection.${festivalId}.${userId}`, JSON.stringify([...selection]));
    } catch {}
  }, [selection, userId, festivalId]);

  const timeOf = useCallback(
    (ref: ItemRef): { dayId: string; range: [number, number]; cancelled: boolean } | null => {
      if (ref.kind === "lesson") {
        const l = program.lessons.find((x) => x.id === ref.id);
        if (!l || !slotById.get(l.startSlotId)) return null;
        return { dayId: l.dayId, range: span(lessonStart(l), lessonEnd(l)), cancelled: l.cancelled };
      }
      const p = program.parties.find((x) => x.id === ref.id);
      return p ? { dayId: p.dayId, range: span(p.startsAt, p.endsAt), cancelled: p.cancelled } : null;
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
      // Zrušená lekce nebo párty s ničím nekoliduje.
      const me = timeOf(ref);
      if (!me || me.cancelled) return [];
      return selected.filter((other) => {
        if (key(other) === key(ref)) return false;
        const o = timeOf(other);
        return o !== null && !o.cancelled && o.dayId === me.dayId && overlaps(o.range, me.range);
      });
    },
    [selected, timeOf],
  );

  const changed = useMemo(() => {
    if (!lastSeen) return [];
    return selected.filter((ref) => {
      const item = ref.kind === "lesson" ? program.lessons.find((l) => l.id === ref.id) : program.parties.find((p) => p.id === ref.id);
      // Změna po poslední návštěvě a zároveň po tom, co si uživatel položku vybral.
      // Časy se porovnávají jako čísla – server a prohlížeč je zapisují v různém tvaru.
      if (!item?.changedAt) return false;
      const changedAt = toMs(item.changedAt);
      return changedAt > toMs(lastSeen) && changedAt > toMs(selection.get(key(ref)));
    });
  }, [selected, selection, lastSeen, program]);

  const value = useMemo<PersonalState>(() => {
    const changedKeys = new Set(changed.map(key));
    return {
      user,
      isOrganizer,
      isTeacher,
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
        toggles.current++;
        setError(null);
        setSelection((prev) => {
          const next = new Map(prev);
          if (wasSelected) next.delete(k);
          else next.set(k, new Date().toISOString());
          return next;
        });
        const db = createBrowserSupabase();
        const request = wasSelected
          ? db.from("personal_selections").delete().eq("user_id", user.id).eq(column, ref.id).select("created_at")
          : db.from("personal_selections").insert({ user_id: user.id, [column]: ref.id }).select("created_at");
        request.then(({ data, error: e }) => {
          if (!e) {
            // Čas výběru podle serveru – porovnává se s časem změny lekce.
            const created = data?.[0]?.created_at as string | undefined;
            if (!wasSelected && created) setSelection((prev) => (prev.has(k) ? new Map(prev).set(k, created) : prev));
            return;
          }
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
        setLastSeen(new Date().toISOString()); // hned schovat lištu, přesný čas doplní server
        createBrowserSupabase()
          .rpc("touch_festival_visit", { fid: festivalId })
          .then(({ data }) => data && setLastSeen(data as string));
      },
      signOut: async () => {
        await createBrowserSupabase().auth.signOut();
      },
      deleteAccount: async () => {
        const result = await deleteMyAccount();
        if (!result.ok) {
          setError(result.error);
          return false;
        }
        await createBrowserSupabase().auth.signOut();
        return true;
      },
    };
  }, [user, isOrganizer, isTeacher, selected, selection, conflictsOf, changed, error, festivalId, t, pick, program]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePersonal() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePersonal mimo PersonalProvider");
  return ctx;
}
