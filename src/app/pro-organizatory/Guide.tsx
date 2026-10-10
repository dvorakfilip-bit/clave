"use client";

import Link from "next/link";
import { ClaveLogo } from "@/components/ClaveLogo";
import { useI18n } from "@/lib/i18n";
import { OPERATOR } from "@/lib/operator";
import type { Locale } from "@/lib/types";

const mail = <a href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a>;

interface Step {
  id: string;
  title: string;
  body: React.ReactNode;
}

const TEXT: Record<Locale, { title: string; intro: string; toAdmin: string; contact: React.ReactNode; steps: Step[] }> = {
  cs: {
    title: "Návod pro organizátory",
    intro: "Jak dostat program festivalu do Clave – od přístupu po zveřejnění.",
    toAdmin: "Do správy",
    contact: <>Něco nefunguje nebo chybí? Napiš na {mail}.</>,
    steps: [
      {
        id: "pristup",
        title: "1. Jak získat přístup",
        body: (
          <>
            <p>
              Festival zakládá správce platformy ({OPERATOR.name}, {mail}). Napiš mu název, termín festivalu a e-mail hlavního organizátora.
            </p>
            <p>
              Pak otevři <Link href="/admin">Správu</Link> a přihlas se přes Google <strong>stejným e-mailem</strong>, na který tě pozvali. Festival uvidíš v seznamu
              „Moje festivaly“.
            </p>
            <ul>
              <li>
                <strong>Hlavní organizátor</strong> může vše včetně vzhledu, stavu festivalu a správy dalších organizátorů.
              </li>
              <li>
                <strong>Organizátor</strong> spravuje program, místnosti, styly, učitele a informace.
              </li>
            </ul>
          </>
        ),
      },
      {
        id: "nastaveni",
        title: "2. První nastavení",
        body: (
          <ul>
            <li>
              <strong>Nastavení:</strong> název, krátký název pod ikonou v telefonu, termín (dny festivalu se podle něj vytvoří samy), časové pásmo a popis. Stav
              nech na <em>Koncept</em> – program zatím uvidí jen organizátoři.
            </li>
            <li>
              <strong>Vzhled:</strong> široké a čtvercové logo, banner, 1–5 barev a písmo. Vpravo vidíš živý náhled telefonu; když je některá barva špatně
              čitelná, aplikace navrhne lepší.
            </li>
            <li>
              <strong>Místnosti a styly:</strong> sály (pořadí = pořadí sloupců v programu) a taneční styly s barvami.
            </li>
            <li>
              <strong>Časy:</strong> časové sloty pro každý den. Použij generátor (začátek, délka lekce, pauza, počet) a pro další dny <em>Zkopírovat z jiného
              dne</em>.
            </li>
          </ul>
        ),
      },
      {
        id: "program",
        title: "3. Program",
        body: (
          <>
            <p>
              <strong>Ručně:</strong> v záložce <em>Program</em> klikni na prázdnou buňku (+) – vznikne lekce v daném čase a sále. Kliknutím na lekci ji upravíš.
            </p>
            <ul>
              <li>Workshop přes víc slotů: nastav jiný <em>Konec</em> než začátek.</li>
              <li>Level 0 (tři prázdná kolečka) = nejlehčí / pro všechny úrovně.</li>
              <li>Když učitel ve stejném čase učí jinde, aplikace se zeptá, jestli je to záměr.</li>
              <li>Večerní párty přidáš pod mřížkou – může končit po půlnoci a místo může být i mimo sály (např. „Beach bar“).</li>
            </ul>
            <p>
              <strong>Importem z Excelu:</strong> záložka <em>Import a export</em> → stáhni šablonu, vyplň (jeden řádek = jedna lekce) a nahraj. Nejdřív uvidíš
              náhled s chybami a tím, co se vytvoří – uloží se až po potvrzení. Chybějící sály, styly, časy a učitele aplikace založí sama.
            </p>
            <p>
              <strong>Máš program jen v PDF?</strong> V téže záložce zkopíruj <em>Prompt pro AI</em>, vlož ho do své AI (ChatGPT, Claude…) spolu s PDF, výsledek
              ulož jako CSV a nahraj. Výsledek vždy zkontroluj v náhledu.
            </p>
            <p>
              <strong>Úpravy přes Excel:</strong> stáhni <em>Export XLSX</em> (obsahuje sloupec ID), uprav a nahraj zpět. Díky ID aplikace pozná, které lekce se
              změnily, a účastníkům zůstanou v osobním programu.
            </p>
            <p>
              <strong>Další ročník:</strong> v novém festivalu použij <em>Kopie z jiného festivalu</em> – převezme sály, styly, učitele, časy a případně i program.
            </p>
          </>
        ),
      },
      {
        id: "ucitele",
        title: "4. Učitelé",
        body: (
          <ul>
            <li>Učitele vyhledej mezi existujícími (mohl učit i jinde) nebo založ nového – účet mít nemusí.</li>
            <li>
              <strong>Medailonek:</strong> „Pro tento festival“ můžeš vždy napsat vlastní text a fotku, zobrazí se jen u vás. Globální medailonek (platí všude)
              upravuješ jen u učitele bez účtu.
            </li>
            <li>
              <strong>Pozvat:</strong> zadej e-mail učitele a pošli mu <em>text pozvánky</em> (tlačítko se objeví hned). Po přihlášení si medailonek spravuje sám.
            </li>
          </ul>
        ),
      },
      {
        id: "organizatori",
        title: "5. Další organizátoři a informace",
        body: (
          <ul>
            <li>
              <strong>Organizátoři</strong> (jen hlavní organizátor): zadej e-mail a roli, pak pošli <em>text pozvánky</em>. Aplikace zatím e-maily sama neposílá.
            </li>
            <li>
              <strong>Informace:</strong> stránky pro účastníky – mapa areálu, adresy sálů, kontakty, pravidla. Zobrazí se v menu <em>Více</em> a fungují i
              offline.
            </li>
          </ul>
        ),
      },
      {
        id: "zverejneni",
        title: "6. Zveřejnění",
        body: (
          <ul>
            <li>
              V <em>Nastavení</em> přepni stav na <strong>Zveřejněno</strong> – festival se objeví na hlavní stránce Clave.
            </li>
            <li>
              V <em>Nastavení</em> dole stáhni <strong>QR kód</strong> (PNG nebo SVG) na plakáty a stojánky. Před tiskem ho naskenuj mobilem.
            </li>
            <li>Účastníkům poraď, ať si program v menu Více přidají na plochu – pak funguje i bez signálu.</li>
          </ul>
        ),
      },
      {
        id: "behem",
        title: "7. Během festivalu a po něm",
        body: (
          <ul>
            <li>
              Změny (čas, sál, učitel) se projeví hned. Účastníci, kteří mají lekci v osobním programu, uvidí štítek <strong>Změna</strong> a seznam změn.
            </li>
            <li>
              Když se lekce nekoná, použij <strong>Zrušit lekci</strong> – zůstane v programu přeškrtnutá. <em>Smazat</em> ji úplně odstraní i z osobních
              programů.
            </li>
            <li>
              <strong>Log změn</strong> ukazuje, kdo a kdy co změnil.
            </li>
            <li>
              Po festivalu přepni stav na <strong>Archiv</strong> – program zůstane veřejně ke čtení.
            </li>
          </ul>
        ),
      },
    ],
  },
  en: {
    title: "Guide for organizers",
    intro: "How to get your festival program into Clave – from access to publishing.",
    toAdmin: "Go to admin",
    contact: <>Something not working or missing? Write to {mail}.</>,
    steps: [
      {
        id: "pristup",
        title: "1. Getting access",
        body: (
          <>
            <p>
              Festivals are created by the platform admin ({OPERATOR.name}, {mail}). Send them the festival name, dates and the lead organizer&apos;s email.
            </p>
            <p>
              Then open the <Link href="/admin">admin</Link> and sign in with Google using <strong>the same email</strong> you were invited with. The festival
              appears under “My festivals”.
            </p>
            <ul>
              <li>
                <strong>Lead organizer</strong> can do everything, including appearance, festival status and managing other organizers.
              </li>
              <li>
                <strong>Organizer</strong> manages the program, rooms, styles, teachers and info pages.
              </li>
            </ul>
            <p>The admin is currently in Czech; this guide uses the Czech names of tabs and buttons in italics.</p>
          </>
        ),
      },
      {
        id: "nastaveni",
        title: "2. First setup",
        body: (
          <ul>
            <li>
              <strong>Settings (Nastavení):</strong> name, short name under the phone icon, dates (festival days are created automatically), time zone and
              description. Keep the status at <em>Koncept</em> (draft) – only organizers can see the program.
            </li>
            <li>
              <strong>Appearance (Vzhled):</strong> wide and square logo, banner, 1–5 colors and a font. The phone preview on the right updates live; if a color
              is hard to read, the app suggests a better one.
            </li>
            <li>
              <strong>Rooms and styles (Místnosti a styly):</strong> rooms (their order = column order in the program) and dance styles with colors.
            </li>
            <li>
              <strong>Times (Časy):</strong> time slots for each day. Use the generator (start, class length, break, count) and <em>Zkopírovat z jiného dne</em>{" "}
              (copy from another day) for the rest.
            </li>
          </ul>
        ),
      },
      {
        id: "program",
        title: "3. Program",
        body: (
          <>
            <p>
              <strong>Manually:</strong> in the <em>Program</em> tab click an empty cell (+) to create a class at that time and room. Click a class to edit it.
            </p>
            <ul>
              <li>Workshop spanning several slots: set a different end (<em>Konec</em>) than the start.</li>
              <li>Level 0 (three empty circles) = easiest / all levels.</li>
              <li>If a teacher already teaches elsewhere at the same time, the app asks whether that&apos;s intended.</li>
              <li>Add evening parties below the grid – they can end after midnight and take place outside the rooms (e.g. “Beach bar”).</li>
            </ul>
            <p>
              <strong>Import from Excel:</strong> tab <em>Import a export</em> → download the template, fill it in (one row = one class) and upload it. You first
              see a preview with errors and what will be created – nothing is saved until you confirm. Missing rooms, styles, times and teachers are created
              automatically.
            </p>
            <p>
              <strong>Program only as a PDF?</strong> In the same tab copy the <em>Prompt pro AI</em> (AI prompt), paste it into your own AI (ChatGPT, Claude…)
              together with the PDF, save the result as CSV and upload it. Always check the preview.
            </p>
            <p>
              <strong>Editing in Excel:</strong> download <em>Export XLSX</em> (it contains an ID column), edit and upload it back. Thanks to the IDs the app knows
              which classes changed, and participants keep them in their personal programs.
            </p>
            <p>
              <strong>Next year:</strong> in the new festival use <em>Kopie z jiného festivalu</em> (copy from another festival) – it copies rooms, styles,
              teachers, times and optionally the program.
            </p>
          </>
        ),
      },
      {
        id: "ucitele",
        title: "4. Teachers",
        body: (
          <ul>
            <li>Search existing teachers (they may have taught elsewhere) or create a new one – no account needed.</li>
            <li>
              <strong>Profile (Medailonek):</strong> under “Pro tento festival” (for this festival) you can always write your own text and photo, shown only at your
              festival. The global profile (shown everywhere) can be edited only for teachers without an account.
            </li>
            <li>
              <strong>Invite (Pozvat):</strong> enter the teacher&apos;s email and send them the <em>invitation text</em> (the button appears right away). After
              signing in they manage their profile themselves.
            </li>
          </ul>
        ),
      },
      {
        id: "organizatori",
        title: "5. More organizers and info pages",
        body: (
          <ul>
            <li>
              <strong>Organizers (Organizátoři)</strong> – lead organizer only: enter an email and role, then send the <em>invitation text</em>. The app doesn&apos;t
              send emails yet.
            </li>
            <li>
              <strong>Info pages (Informace):</strong> pages for participants – venue map, room addresses, contacts, rules. They appear in the <em>More</em> menu
              and work offline.
            </li>
          </ul>
        ),
      },
      {
        id: "zverejneni",
        title: "6. Publishing",
        body: (
          <ul>
            <li>
              In <em>Nastavení</em> switch the status to <strong>Zveřejněno</strong> (published) – the festival appears on the Clave home page.
            </li>
            <li>
              At the bottom of <em>Nastavení</em> download the <strong>QR code</strong> (PNG or SVG) for posters and stands. Scan it with a phone before printing.
            </li>
            <li>Tell participants to add the program to their home screen from the More menu – it then works without signal.</li>
          </ul>
        ),
      },
      {
        id: "behem",
        title: "7. During and after the festival",
        body: (
          <ul>
            <li>
              Changes (time, room, teacher) show up immediately. Participants with that class in their personal program see a <strong>Changed</strong> badge and a
              list of changes.
            </li>
            <li>
              If a class doesn&apos;t take place, use <strong>Zrušit lekci</strong> (cancel) – it stays in the program crossed out. <em>Smazat</em> (delete)
              removes it completely, including from personal programs.
            </li>
            <li>
              The <strong>change log (Log změn)</strong> shows who changed what and when.
            </li>
            <li>
              After the festival switch the status to <strong>Archiv</strong> – the program stays publicly readable.
            </li>
          </ul>
        ),
      },
    ],
  },
};

/** Návod pro organizátory (veřejný, česky i anglicky). */
export function Guide() {
  const { locale, setLocale } = useI18n();
  const c = TEXT[locale];
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between gap-2">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <ClaveLogo size={26} />
          clave
        </Link>
        <span className="flex gap-2">
          <button onClick={() => setLocale(locale === "cs" ? "en" : "cs")} className="rounded-lg border border-line px-2.5 py-1.5 text-xs">
            {locale === "cs" ? "English" : "Čeština"}
          </button>
          <Link href="/admin" className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-on-brand">
            {c.toAdmin}
          </Link>
        </span>
      </div>
      <h1 className="text-2xl font-semibold">{c.title}</h1>
      <p className="mt-2 text-sm text-muted">{c.intro}</p>

      <nav className="mt-5 rounded-xl border border-line bg-surface p-3 text-sm">
        <ol className="space-y-1">
          {c.steps.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="underline">
                {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-6 space-y-7">
        {c.steps.map((s) => (
          <section key={s.id} id={s.id} className="scroll-mt-4">
            <h2 className="mb-2 text-lg font-semibold">{s.title}</h2>
            <div className="space-y-2 text-sm leading-relaxed [&_a]:underline [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1">{s.body}</div>
          </section>
        ))}
      </div>

      <p className="mt-10 border-t border-line pt-4 text-xs text-muted [&_a]:underline">{c.contact}</p>
    </main>
  );
}
