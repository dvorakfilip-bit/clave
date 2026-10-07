# PRD – Dance Festival App

> Stav: **návrh v0.1** · Datum: 2026-10-07 · Autor: Filip Dvořák

## 1. Shrnutí

Webová aplikace (PWA) pro taneční festivaly, která nahrazuje papírový rozpis lekcí. Účastníci v ní procházejí program a skládají si vlastní rozvrh, organizátoři do ní zadávají program a učitelé spravují své medailonky.

Jde o **nekomerční fanouškovský projekt**. Jedna platforma hostí více festivalů a každý organizátor si v ní založí festival pod vlastní adresou (např. `app.cz/cssf-2027`).

## 2. Cíle

- Nahradit papírový rozpis přehledným programem v mobilu.
- Umožnit účastníkům sestavit si osobní program na jednotlivé dny.
- Dát organizátorům jednoduchý nástroj na přípravu a úpravy programu.
- Provozovat zdarma nebo za minimální náklady.

### Mimo cíle (v1.0)
- Prodej vstupenek, platby, jakýkoli komerční model.
- Registrace na lekce a kapacity.
- Statistiky zájmu o lekce pro organizátory.

## 3. Měřítko

| Parametr | Hodnota |
|---|---|
| Účastníků denně | 1 000 – 20 000 |
| Lekcí denně | 15 – 60 |
| Délka festivalu | 3 – 10 dní |
| Místností | jednotky až desítky |

## 4. Role a oprávnění

| Role | Rozsah | Kdo ji přiděluje | Co může |
|---|---|---|---|
| **Návštěvník** (nepřihlášený) | – | – | Prohlížet a filtrovat program, číst medailonky učitelů |
| **Uživatel** | celá platforma | registruje se sám | Vše jako návštěvník + osobní program |
| **Učitel** | festival | organizátor (povýšením uživatele) | Vše jako uživatel + úprava vlastního medailonku |
| **Organizátor** | festival | hlavní organizátor festivalu | Správa programu, místností, stylů, učitelů festivalu |
| **Hlavní organizátor** | festival | správce platformy | Vše jako organizátor + přidávání/odebírání organizátorů |
| **Správce platformy** | celá platforma | – | Zakládání festivalů, určení hlavního organizátora |

Pravidla:
- Organizátor má práva **jen ke svému festivalu**.
- Učitel je k festivalu přiřazen organizátorem. Účet i medailonek jsou **globální** (jeden napříč festivaly).
- Organizátor může založit uživatelský účet a povýšit ho na učitele.
- Organizátor může upravit medailonek učitele (např. když ho učitel nevyplní).

## 5. Funkce

### 5.1 Program (všichni, i bez přihlášení)

**Mřížka programu**
- Přepínání mezi dny festivalu.
- Řádky = časové sloty, sloupce = místnosti.
- Lekce je obarvená podle **stylu**.
- Karta lekce: název / co se učí, učitel(é), level, čas, místnost.
- Večerní **párty** se zobrazují v programu jako samostatný typ akce (bez levelu, učitel volitelný).

**Level**
- Škála 0–3 kolečka v krocích po 0,5 (tj. 7 hodnot: 0; 0,5; 1; … 3).
- Zobrazení: 3 kolečka, prázdná / poloplná / plná. 0 = nejlehčí, 3 = nejpokročilejší.

**Filtry**
- Styl, místnost, učitel, level, den.
- Filtry lze kombinovat.

**Detail lekce**
- Všechny údaje lekce + odkazy na medailonky učitelů.

**Medailonek učitele**
- Jméno, fotka, krátký popis.
- Seznam lekcí učitele na daném festivalu.

**Mobilní zobrazení**
- Mřížka musí být na telefonu použitelná (horizontální scroll přes místnosti, ukotvený sloupec s časy). Případně alternativní seznamové zobrazení – *otevřená otázka*.

### 5.2 Osobní program (přihlášený uživatel)

- Označení lekce / párty jako „chci jít“.
- Pohled „Můj program“ po dnech.
- **Kolize:** při výběru lekce, která se časově překrývá s jinou vybranou, aplikace upozorní, ale výběr umožní.
- Výběr je **soukromý** (organizátor ho nevidí).
- Výběr vyžaduje připojení (offline jen čtení – viz 6.2).

### 5.3 Informování o změnách

- Když organizátor změní lekci z osobního programu uživatele (čas, místnost, učitel, zrušení), lekce dostane štítek **„Změna“**.
- Po otevření aplikace se zobrazí **seznam změn od poslední návštěvy**.
- Push notifikace: v1.1.

### 5.4 Správa festivalu (organizátor)

**Festival**
- Název, URL slug, termín (dny), popis, logo.
- Stav publikace (koncept / zveřejněno) – *otevřená otázka*.

**Časový rámec**
- Pro každý den vlastní sada časových slotů (začátek–konec).
- Sloty se mezi dny mohou lišit (např. den 1: 11:30–12:30, 12:40–13:40…; den 2: od 10:00 po 45 min, 8× za sebou).
- Pomůcka pro rychlé generování slotů (začátek, délka, pauza, počet) a kopírování rozvrhu slotů z jiného dne.

**Místnosti**
- Přidání, úprava, odebrání, pořadí (pořadí = pořadí sloupců v mřížce).

**Styly**
- Seznam stylů spravuje organizátor, každému přiřadí barvu.

**Lekce**
- Den, slot, místnost, styl, název / co se učí, level, 1+ učitelů, volitelně popis.
- Úpravy i za běhu festivalu (spouští informování o změnách).

**Párty**
- Den, čas (volný, mimo sloty), místo, název, popis.

**Učitelé**
- Vyhledání existujícího učitele na platformě a přidání do festivalu.
- Založení nového uživatele a povýšení na učitele.
- Úprava medailonku učitele.

**Organizátoři** (hlavní organizátor)
- Přidání / odebrání dalších organizátorů festivalu.

### 5.4.1 Import programu

**Import z Excelu / CSV**
- Organizátor si stáhne šablonu (XLSX a CSV). Jeden řádek = jedna lekce / párty: typ, den, začátek, konec, místnost, styl, název, level, učitelé (oddělení čárkou), popis.
- Po nahrání aplikace automaticky založí chybějící místnosti, styly, časové sloty a učitele. Učitele nejprve hledá mezi existujícími na platformě a nabídne shodu.
- **Náhled před uložením:** tabulka s tím, co se vytvoří / změní, a zvýrazněné chyby (neplatný level, chybějící údaje, dvě lekce ve stejném slotu a místnosti, neznámý učitel…).
- **Opakovaný import:** nahrání opravené verze aktualizuje existující program. Aplikace pozná, které lekce se změnily, a štítek „Změna“ (5.3) dostanou jen ty.

**Prompt pro AI**
- U importu je připravený text promptu ke zkopírování. Organizátor ho vloží do své AI (ChatGPT, Claude, Gemini…) spolu se svým PDF / obrázkem / tabulkou programu a AI mu vrátí CSV ve formátu šablony.
- Prompt obsahuje přesný popis sloupců a pravidla (formát času, škála levelu) a automaticky i aktuální seznam místností, stylů a učitelů festivalu, aby AI použila stejné názvy.
- Výsledek pak organizátor nahraje běžným importem (včetně náhledu a kontroly chyb).
- Aplikace sama žádné AI API nevolá → bez nákladů.

**Kopie z minulého ročníku**
- Nový festival lze založit jako kopii existujícího: místnosti, styly, časové sloty, učitelé, volitelně i lekce.
- Data se posunou na nový termín, organizátor pak jen upraví rozdíly.

### 5.5 Učitel

- Úprava vlastního medailonku (jméno, fotka, popis).
- Přehled svých lekcí na festivalech.

### 5.6 Správce platformy

- Založení festivalu a určení hlavního organizátora.

## 6. Nefunkční požadavky

### 6.1 Platforma
- Webová aplikace, **PWA** (instalovatelná na plochu), mobile-first, Android i iOS.

### 6.2 Offline (v1.0)
- Při otevření se program festivalu stáhne do zařízení.
- Bez signálu lze prohlížet program, filtrovat a vidět svůj rozvrh.
- Po obnovení připojení se načtou změny.
- Úpravy osobního programu offline: v1.1.

### 6.3 Jazyky
- Rozhraní česky a anglicky.
- Obsah zadávaný organizátorem (názvy lekcí, popisy) – *otevřená otázka*.

### 6.4 Výkon
- Program je převážně ke čtení → cachování na CDN, aby aplikace zvládla 20 000 uživatelů denně v rámci free tierů.
- Fotky učitelů se při nahrání zmenšují.

### 6.5 Soukromí
- GDPR: uživatel může smazat svůj účet a data.
- Ukládáme minimum osobních údajů (jméno, e-mail, výběr lekcí).

## 7. Přihlašování

- **Google** – hlavní způsob.
- **Magic link** (odkaz do e-mailu) – záložní, pod „Jiný způsob přihlášení“.
- Apple Sign-In: zatím ne (99 $/rok).

## 8. Technologie

| Vrstva | Volba |
|---|---|
| Frontend | Next.js (React), PWA |
| Backend / DB | Supabase (Postgres, Auth, Storage, Realtime) |
| Hosting | Vercel (Hobby) |
| E-maily | Resend (nebo jiná SMTP služba) pro magic link |

**Náklady:** vývoj a menší festival 0 Kč. Velký festival možná 25–45 $ za měsíc konání (Supabase Pro, placené e-maily). Volitelně doména ~200–300 Kč/rok.

## 9. Datový model (náčrt)

- **User** – id, jméno, e-mail, jazyk
- **TeacherProfile** – user_id, jméno, fotka, bio (globální)
- **Festival** – id, slug, název, termín, stav
- **FestivalMember** – festival_id, user_id, role (hlavní organizátor / organizátor / učitel)
- **Day** – festival_id, datum
- **TimeSlot** – day_id, začátek, konec
- **Room** – festival_id, název, pořadí
- **Style** – festival_id, název, barva
- **Lesson** – festival_id, slot_id, room_id, style_id, název, level, popis, updated_at
- **LessonTeacher** – lesson_id, user_id
- **Party** – festival_id, den, začátek, konec, místo, název, popis
- **PersonalSelection** – user_id, lesson_id / party_id

## 10. Roadmapa

### v1.0
Vše výše uvedené.

### v1.1
- Kapacity lekcí / registrace.
- Statistiky zájmu pro organizátory.
- Export osobního programu (iCal, PDF).
- Push notifikace o změnách.
- Úpravy osobního programu offline.
- Import vložením mřížky z tabulky (copy-paste), případně AI import přímo v aplikaci.

## 11. Otevřené otázky

1. Mobilní zobrazení mřížky – stačí horizontální scroll, nebo i seznamové zobrazení?
2. Má festival stav koncept / zveřejněno (organizátor připravuje program skrytě)?
3. Obsah lekcí – zadává organizátor dvojjazyčně (CZ + EN), nebo jen v jednom jazyce?
4. Mohou být v jednom slotu a místnosti dvě lekce současně? (Předpoklad: ne.)
5. Úprava medailonku organizátorem se projeví na všech festivalech – je to v pořádku?
6. Co se zobrazí na hlavní stránce platformy – seznam festivalů, nebo nic?
7. Archivace minulých festivalů – zůstávají veřejně dostupné?
8. Kopie ročníku – smí organizátor kopírovat jen své festivaly, nebo i cizí?
9. Opakovaný import – podle čeho párovat lekce mezi verzemi (den + slot + místnost, nebo ID lekce ve sloupci šablony)?
