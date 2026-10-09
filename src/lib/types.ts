export type Locale = "cs" | "en";

export type FestivalStatus = "draft" | "published" | "archived";

export interface FestivalSummary {
  id: string;
  slug: string;
  name: string;
  startDate: string;
  endDate: string;
  status: FestivalStatus;
  colors: string[];
  logoSquareUrl: string | null;
}

export interface Festival extends FestivalSummary {
  descriptionCs: string | null;
  descriptionEn: string | null;
  timezone: string;
  font: string;
  logoWideUrl: string | null;
  bannerUrl: string | null;
}

export interface Day {
  id: string;
  date: string;
}

export interface TimeSlot {
  id: string;
  dayId: string;
  startsAt: string;
  endsAt: string;
}

export interface Room {
  id: string;
  name: string;
  position: number;
}

export interface Style {
  id: string;
  name: string;
  color: string;
}

export interface Teacher {
  id: string;
  name: string;
  photoUrl: string | null;
  bioCs: string | null;
  bioEn: string | null;
}

export interface Lesson {
  id: string;
  dayId: string;
  startSlotId: string;
  endSlotId: string;
  roomId: string;
  styleId: string | null;
  titleCs: string | null;
  titleEn: string | null;
  descriptionCs: string | null;
  descriptionEn: string | null;
  level: number;
  cancelled: boolean;
  changedAt: string | null;
  teacherIds: string[];
}

export interface Party {
  id: string;
  dayId: string;
  startsAt: string;
  endsAt: string | null;
  roomId: string | null;
  place: string | null;
  titleCs: string | null;
  titleEn: string | null;
  descriptionCs: string | null;
  descriptionEn: string | null;
  cancelled: boolean;
  changedAt: string | null;
}

export interface InfoPage {
  id: string;
  position: number;
  titleCs: string | null;
  titleEn: string | null;
  bodyCs: string | null;
  bodyEn: string | null;
}

/** Kompletní veřejná data festivalu – cachují se a stahují do zařízení (offline). */
export interface FestivalProgram {
  festival: Festival;
  days: Day[];
  slots: TimeSlot[];
  rooms: Room[];
  styles: Style[];
  teachers: Teacher[];
  lessons: Lesson[];
  parties: Party[];
  infoPages: InfoPage[];
}
