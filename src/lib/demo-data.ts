import type { FestivalProgram, Lesson, Party, TimeSlot } from "./types";

/**
 * Ukázkový festival. Slouží jako testovací data (`npm run seed`) a jako náhradní
 * zdroj, dokud není nastavené připojení k Supabase. Jména jsou smyšlená.
 */

const uid = (group: number, n: number) =>
  `00000000-0000-4000-8000-${group.toString(16).padStart(4, "0")}${n.toString(16).padStart(8, "0")}`;

const FESTIVAL_ID = uid(1, 1);

const days = [
  { id: uid(2, 1), date: "2027-07-06" },
  { id: uid(2, 2), date: "2027-07-07" },
  { id: uid(2, 3), date: "2027-07-08" },
];

const rooms = [
  { id: uid(3, 1), name: "Sál A", position: 0 },
  { id: uid(3, 2), name: "Sál B", position: 1 },
  { id: uid(3, 3), name: "Terasa", position: 2 },
  { id: uid(3, 4), name: "Studio", position: 3 },
];

const styles = [
  { id: uid(4, 1), name: "Salsa", color: "#E45756" },
  { id: uid(4, 2), name: "Bachata", color: "#3E9C4A" },
  { id: uid(4, 3), name: "Kizomba", color: "#3F72AF" },
  { id: uid(4, 4), name: "Zouk", color: "#E08A1E" },
];

const teachers = [
  { id: uid(5, 1), name: "Ana Ruiz", bioCs: "Salsa On1 a lady styling, učí 15 let po celé Evropě.", bioEn: "Salsa On1 and lady styling, teaching across Europe for 15 years." },
  { id: uid(5, 2), name: "Tomás Kern", bioCs: "Specialista na On2 timing a partnerskou techniku.", bioEn: "On2 timing and partnerwork specialist." },
  { id: uid(5, 3), name: "Leo Marin", bioCs: "Sensual bachata, hudebnost.", bioEn: "Sensual bachata, musicality." },
  { id: uid(5, 4), name: "Mia Costa", bioCs: "Sensual bachata, práce s tělem.", bioEn: "Sensual bachata, body movement." },
  { id: uid(5, 5), name: "João Pinto", bioCs: "Kizomba a urban kiz z Lisabonu.", bioEn: "Kizomba and urban kiz from Lisbon." },
  { id: uid(5, 6), name: "Carla Dias", bioCs: "Brazilský zouk, pohyby hlavy.", bioEn: "Brazilian zouk, head movement." },
].map((t) => ({ ...t, photoUrl: null }));

function makeSlots(dayId: string, start: string, minutes: number, pause: number, count: number, group: number) {
  const out: TimeSlot[] = [];
  let [h, m] = start.split(":").map(Number);
  const fmt = (hh: number, mm: number) => `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  for (let i = 0; i < count; i++) {
    const startsAt = fmt(h, m);
    const endTotal = h * 60 + m + minutes;
    const endsAt = fmt(Math.floor(endTotal / 60), endTotal % 60);
    out.push({ id: uid(group, i + 1), dayId, startsAt, endsAt });
    const next = endTotal + pause;
    h = Math.floor(next / 60);
    m = next % 60;
  }
  return out;
}

// Den 1 a 3: hodinové lekce od 11:30; den 2: od 10:00 po 45 minutách (PRD 5.4)
const slotsByDay = [
  makeSlots(days[0].id, "11:30", 60, 10, 4, 6),
  makeSlots(days[1].id, "10:00", 45, 10, 6, 7),
  makeSlots(days[2].id, "11:30", 60, 10, 4, 8),
];

const [salsa, bachata, kizomba, zouk] = styles.map((s) => s.id);
const [ana, tomas, leo, mia, joao, carla] = teachers.map((t) => t.id);

type Row = [day: number, slot: number, room: number, style: string, cs: string, en: string, level: number, teachers: string[], extra?: Partial<Lesson> & { endSlot?: number }];

const rows: Row[] = [
  [0, 0, 0, salsa, "Shines a styling", "Shines & styling", 1.5, [ana]],
  [0, 0, 1, bachata, "Základy sensual", "Sensual basics", 0, [leo, mia]],
  [0, 0, 2, kizomba, "Hudebnost", "Musicality", 2, [joao]],
  [0, 1, 0, salsa, "Otočkové kombinace", "Turn patterns", 3, [ana, tomas]],
  [0, 1, 1, zouk, "Pohyby hlavy", "Head movement", 2.5, [carla], { changedAt: "2027-07-05T18:00:00Z" }],
  [0, 1, 2, bachata, "Footwork", "Footwork", 1, [leo, mia]],
  [0, 2, 0, kizomba, "Urban kiz", "Urban kiz", 1.5, [joao]],
  [0, 2, 2, salsa, "On2 timing", "On2 timing", 2, [tomas]],
  [0, 2, 3, zouk, "Workshop: flow", "Workshop: flow", 2, [carla], { endSlot: 3 }],
  [0, 3, 0, bachata, "Ladies styling", "Ladies styling", 1, [mia]],
  [0, 3, 1, salsa, "Pro všechny", "All levels", 0, [ana]],
  [1, 0, 0, salsa, "Rozcvička a shines", "Warm-up & shines", 0, [ana]],
  [1, 0, 1, kizomba, "Základy", "Basics", 0, [joao]],
  [1, 1, 0, salsa, "Partnerská technika", "Partnerwork", 2, [tomas]],
  [1, 1, 1, bachata, "Vlny a izolace", "Waves & isolations", 1.5, [leo, mia]],
  [1, 1, 2, zouk, "Lateral", "Lateral", 1, [carla]],
  [1, 2, 0, kizomba, "Saída", "Saída", 2, [joao], { cancelled: true }],
  [1, 2, 2, salsa, "Styling pro muže", "Men's styling", 1.5, [tomas]],
  [1, 3, 0, bachata, "Dominikánská", "Dominican", 2, [leo]],
  [1, 3, 1, salsa, "Shines 2", "Shines 2", 2.5, [ana]],
  [1, 4, 0, zouk, "Kontrabalanc", "Counterbalance", 3, [carla]],
  [1, 4, 3, kizomba, "Tarraxinha", "Tarraxinha", 2.5, [joao]],
  [1, 5, 0, salsa, "Pro všechny", "All levels", 0, [ana, tomas]],
  [2, 0, 0, bachata, "Sensual flow", "Sensual flow", 2, [leo, mia]],
  [2, 0, 1, salsa, "Rytmus a timing", "Rhythm & timing", 0.5, [tomas]],
  [2, 1, 0, zouk, "Pokročilé otočky", "Advanced turns", 3, [carla]],
  [2, 1, 2, kizomba, "Hudebnost 2", "Musicality 2", 2.5, [joao]],
  [2, 2, 0, salsa, "Choreografie", "Choreography", 2, [ana], { endSlot: 3 }],
  [2, 2, 1, bachata, "Pro všechny", "All levels", 0, [mia]],
];

const lessons: Lesson[] = rows.map(([day, slot, room, styleId, cs, en, level, teacherIds, extra], i) => {
  const daySlots = slotsByDay[day];
  const { endSlot, ...rest } = extra ?? {};
  return {
    id: uid(9, i + 1),
    dayId: days[day].id,
    startSlotId: daySlots[slot].id,
    endSlotId: daySlots[endSlot ?? slot].id,
    roomId: rooms[room].id,
    styleId,
    titleCs: cs,
    titleEn: en,
    descriptionCs: null,
    descriptionEn: null,
    level,
    cancelled: false,
    changedAt: null,
    teacherIds,
    ...rest,
  };
});

const parties: Party[] = [
  { day: 0, cs: "Uvítací párty", en: "Welcome party", room: 2, place: null },
  { day: 1, cs: "Párty na pláži", en: "Beach party", room: null, place: "Beach bar" },
  { day: 2, cs: "Závěrečná párty", en: "Closing party", room: 0, place: null },
].map((p, i) => ({
  id: uid(10, i + 1),
  dayId: days[p.day].id,
  startsAt: "22:00",
  endsAt: "04:00",
  roomId: p.room === null ? null : rooms[p.room].id,
  place: p.place,
  titleCs: p.cs,
  titleEn: p.en,
  descriptionCs: null,
  descriptionEn: null,
  cancelled: false,
  changedAt: null,
}));

export const demoProgram: FestivalProgram = {
  festival: {
    id: FESTIVAL_ID,
    slug: "demo-2027",
    name: "Demo Salsa Festival 2027",
    startDate: days[0].date,
    endDate: days[days.length - 1].date,
    status: "published",
    colors: ["#0E6E8C", "#F2A541", "#E4572E", "#FFF8EE"],
    logoSquareUrl: null,
    logoWideUrl: null,
    bannerUrl: null,
    descriptionCs: "Ukázkový festival pro vývoj a testování aplikace Clave.",
    descriptionEn: "Sample festival for developing and testing Clave.",
    timezone: "Europe/Zagreb",
    font: "inter",
  },
  days,
  slots: slotsByDay.flat(),
  rooms,
  styles,
  teachers,
  lessons,
  parties,
  infoPages: [
    {
      id: uid(11, 1),
      position: 0,
      titleCs: "Areál a sály",
      titleEn: "Venue & rooms",
      bodyCs: "Sál A a Sál B jsou v přízemí hotelu, Terasa u bazénu, Studio v 1. patře.",
      bodyEn: "Rooms A and B are on the hotel ground floor, the Terrace by the pool, the Studio on the 1st floor.",
    },
  ],
};
