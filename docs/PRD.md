# PRD – Dance Festival App

> Stav: **návrh v0.3** · Datum: 2026-10-07 · Autor: Filip Dvořák

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

**Hlavní stránka platformy**
- Seznam aktuálních a nadcházejících zveřejněných festivalů.
- Přihlášený uživatel vidí nahoře festivaly, kde má osobní program.
- Archiv minulých festivalů.

**Mobilní zobrazení**
- Mřížka s horizontálním scrollem přes místnosti a ukotveným sloupcem s časy.
- Přepínač na **seznamové zobrazení** (lekce pod sebou seřazené podle času).

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
- Název, URL slug, termín (dny), popis.
- Vizuální identita (logo, banner, barvy, písmo) – nastavuje hlavní organizátor, viz kap. 7.
- Stav **koncept / zveřejněno / archiv**:
  - Koncept: program vidí jen organizátoři festivalu.
  - Zveřejněno: program je veřejný, změny se projeví okamžitě.
  - Archiv: po skončení festivalu; program i osobní programy zůstávají veřejně ke čtení.

**Časový rámec**
- Pro každý den vlastní sada časových slotů (začátek–konec).
- Sloty se mezi dny mohou lišit (např. den 1: 11:30–12:30, 12:40–13:40…; den 2: od 10:00 po 45 min, 8× za sebou).
- Pomůcka pro rychlé generování slotů (začátek, délka, pauza, počet) a kopírování rozvrhu slotů z jiného dne.

**Místnosti**
- Přidání, úprava, odebrání, pořadí (pořadí = pořadí sloupců v mřížce).

**Styly**
- Seznam stylů spravuje organizátor, každému přiřadí libovolnou barvu (RGB).

**Lekce**
- Den, slot, místnost, styl, název / co se učí, level, 1+ učitelů, volitelně popis.
- V jednom slotu a místnosti smí být **jen jedna lekce** (hlídá formulář i import).
- Úpravy i za běhu festivalu (spouští informování o změnách).

**Párty**
- Den, čas (volný, mimo sloty), místo, název, popis.

**Učitelé**
- Vyhledání existujícího učitele na platformě a přidání do festivalu.
- Založení nového uživatele a povýšení na učitele.
- Úprava medailonku učitele. Změna se projeví na všech festivalech; učitel vidí historii změn (kdo, kdy) a může změnu vrátit.

**Organizátoři** (hlavní organizátor)
- Přidání / odebrání dalších organizátorů festivalu.

### 5.4.1 Import programu

**Import z Excelu / CSV**
- Organizátor si stáhne šablonu (XLSX a CSV). Jeden řádek = jedna lekce / párty: ID, typ, den, začátek, konec, místnost, styl, název (CZ/EN), level, učitelé (oddělení čárkou), popis (CZ/EN).
- Po nahrání aplikace automaticky založí chybějící místnosti, styly, časové sloty a učitele. Učitele nejprve hledá mezi existujícími na platformě a nabídne shodu.
- **Náhled před uložením:** tabulka s tím, co se vytvoří / změní, a zvýrazněné chyby (neplatný level, chybějící údaje, dvě lekce ve stejném slotu a místnosti, neznámý učitel…).
- **Export:** aktuální program festivalu lze stáhnout ve formátu šablony, každá lekce má vyplněné `ID`.
- **Opakovaný import (párování podle ID):** organizátor exportuje program, upraví ho a nahraje zpět.
  - Řádek s ID = úprava existující lekce (zůstává uživatelům v osobním programu).
  - Řádek bez ID = nová lekce.
  - Lekce, jejíž ID v souboru chybí, se v náhledu nabídne ke smazání a organizátor ji potvrdí.
  - Štítek „Změna“ (5.3) dostanou jen lekce, které se skutečně změnily.

**Prompt pro AI**
- U importu je připravený text promptu ke zkopírování. Organizátor ho vloží do své AI (ChatGPT, Claude, Gemini…) spolu se svým PDF / obrázkem / tabulkou programu a AI mu vrátí CSV ve formátu šablony.
- Prompt obsahuje přesný popis sloupců a pravidla (formát času, škála levelu) a automaticky i aktuální seznam místností, stylů a učitelů festivalu, aby AI použila stejné názvy.
- Výsledek pak organizátor nahraje běžným importem (včetně náhledu a kontroly chyb).
- Aplikace sama žádné AI API nevolá → bez nákladů.

**Kopie z minulého ročníku**
- Organizátor smí kopírovat jen festivaly, kde je organizátorem. Nový festival zakládá správce platformy, organizátor do něj pak zkopíruje data.
- Kopírují se: místnosti, styly, časové sloty, učitelé, volitelně i lekce.
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
- Obsah zadávaný organizátorem (názvy lekcí, popisy): jeden jazyk povinně, druhý volitelně. Když překlad chybí, zobrazí se originál.

### 6.4 Výkon
- Program je převážně ke čtení → cachování na CDN, aby aplikace zvládla 20 000 uživatelů denně v rámci free tierů.
- Fotky učitelů se při nahrání zmenšují.

### 6.5 Soukromí
- GDPR: uživatel může smazat svůj účet a data.
- Ukládáme minimum osobních údajů (jméno, e-mail, výběr lekcí).

## 7. Grafický design

### 7.1 Princip
- Aplikace má **jeden neutrální základní design**, který je na všech festivalech stejný (rozložení, ovládání, mřížka).
- Festival ho „obléká“ do své vizuální identity: logo, banner, barvy, písmo.
- Mobile-first, plochý čistý vzhled, podpora **světlého i tmavého režimu** (podle nastavení telefonu).

### 7.2 Vizuální identita festivalu (hlavní organizátor)

**Logo**
- Dvě verze: **široké** (hlavička, úvodní stránka festivalu) a **čtvercové** (ikona PWA na ploše, favicon, splash screen).

**Banner**
- Úvodní obrázek / fotka na hlavní stránce festivalu.

**Barevné schéma: 1–5 barev zadaných RGB (hex) kódem, každá má pevnou roli:**

| # | Role | Kde se projeví | Povinná |
|---|---|---|---|
| 1 | Hlavní | Hlavička, vybraný den, tlačítka, aktivní položka menu | ano |
| 2 | Doplňková | Akcenty, odkazy, podbarvení párty | ne |
| 3 | Zvýrazňující | Štítek „Změna“, „chci jít“, „teď probíhá“ | ne |
| 4 | Podklad | Barva pozadí stránky | ne |
| 5 | Text | Barva písma | ne |

- Chybějící barvy aplikace **dopočítá** z hlavní barvy (odstíny).
- Pro tmavý režim se barvy festivalu automaticky upraví (zesvětlení akcentů, tmavý podklad).

**Písmo**
- Výběr z **5 předpřipravených písem** (s podporou české diakritiky).

### 7.3 Pojistky čitelnosti
- Barva textu na barevných plochách (bílá / tmavá) se volí **automaticky podle kontrastu**.
- Nečitelná kombinace (pod WCAG AA) → varování organizátorovi a návrh upravené barvy.
- Varování, když je barva festivalu téměř shodná s barvou některého stylu.
- **Živý náhled** aplikace při nastavování identity.

### 7.4 Mřížka programu
- Podklad mřížky zůstává **neutrální** (bílý / tmavý); barvy festivalu do ní nezasahují.
- Lekce: jemně podbarvená barvou stylu, barevná tečka + název stylu, název lekce, učitel(é), kolečka levelu, srdíčko „chci jít“.
- Barvy stylů volí organizátor volně; pro tmavý režim se automaticky upraví.
- Prázdný slot = přerušovaný rámeček.
- Párty pod mřížkou jako samostatný řádek podbarvený doplňkovou barvou.

### 7.5 Navigace
- Hlavička: logo, název a termín festivalu, filtry.
- Pod hlavičkou záložky dnů.
- Spodní menu: Program, Můj program, Učitelé, Více.

## 8. Přihlašování

- **Google** – hlavní způsob.
- **Magic link** (odkaz do e-mailu) – záložní, pod „Jiný způsob přihlášení“.
- Apple Sign-In: zatím ne (99 $/rok).

## 9. Technologie

| Vrstva | Volba |
|---|---|
| Frontend | Next.js (React), PWA |
| Backend / DB | Supabase (Postgres, Auth, Storage, Realtime) |
| Hosting | Vercel (Hobby) |
| E-maily | Resend (nebo jiná SMTP služba) pro magic link |

**Náklady:** vývoj a menší festival 0 Kč. Velký festival možná 25–45 $ za měsíc konání (Supabase Pro, placené e-maily). Volitelně doména ~200–300 Kč/rok.

## 10. Datový model (náčrt)

- **User** – id, jméno, e-mail, jazyk
- **TeacherProfile** – user_id, jméno, fotka, bio CZ/EN (globální)
- **TeacherProfileRevision** – profile_id, autor, čas, předchozí obsah
- **Festival** – id, slug, název, termín, stav, logo (široké, čtvercové), banner, barvy (1–5), písmo
- **FestivalMember** – festival_id, user_id, role (hlavní organizátor / organizátor / učitel)
- **Day** – festival_id, datum
- **TimeSlot** – day_id, začátek, konec
- **Room** – festival_id, název, pořadí
- **Style** – festival_id, název, barva
- **Lesson** – festival_id, slot_id, room_id, style_id, název CZ/EN, level, popis CZ/EN, updated_at (unikátní slot_id + room_id)
- **LessonTeacher** – lesson_id, user_id
- **Party** – festival_id, den, začátek, konec, místo, název, popis
- **PersonalSelection** – user_id, lesson_id / party_id

## 11. Roadmapa

### v1.0
Vše výše uvedené.

### v1.1
- Kapacity lekcí / registrace.
- Statistiky zájmu pro organizátory.
- Export osobního programu (iCal, PDF).
- Push notifikace o změnách.
- Úpravy osobního programu offline.
- Import vložením mřížky z tabulky (copy-paste), případně AI import přímo v aplikaci.

## 12. Otevřené otázky

Zatím žádné.
