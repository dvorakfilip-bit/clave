import Link from "next/link";
import { ClaveLogo } from "@/components/ClaveLogo";
import { OPERATOR } from "@/lib/operator";

export const metadata = { title: "Návod pro organizátory" };

const STEPS: { id: string; title: string; body: React.ReactNode }[] = [
  {
    id: "pristup",
    title: "1. Jak získat přístup",
    body: (
      <>
        <p>
          Festival zakládá správce platformy ({OPERATOR.name}, <a href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a>). Napiš mu název, termín festivalu a
          e-mail hlavního organizátora.
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
          <strong>Vzhled:</strong> široké a čtvercové logo, banner, 1–5 barev a písmo. Vpravo vidíš živý náhled telefonu; když je některá barva špatně čitelná,
          aplikace navrhne lepší.
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
          <strong>Informace:</strong> stránky pro účastníky – mapa areálu, adresy sálů, kontakty, pravidla. Zobrazí se v menu <em>Více</em> a fungují i offline.
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
          Když se lekce nekoná, použij <strong>Zrušit lekci</strong> – zůstane v programu přeškrtnutá. <em>Smazat</em> ji úplně odstraní i z osobních programů.
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
];

/** Návod pro organizátory (veřejný – dá se přečíst i před přihlášením). */
export default function OrganizerGuidePage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <ClaveLogo size={26} />
          clave
        </Link>
        <Link href="/admin" className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-on-brand">
          Do správy
        </Link>
      </div>
      <h1 className="text-2xl font-semibold">Návod pro organizátory</h1>
      <p className="mt-2 text-sm text-muted">Jak dostat program festivalu do Clave – od přístupu po zveřejnění.</p>

      <nav className="mt-5 rounded-xl border border-line bg-surface p-3 text-sm">
        <ol className="space-y-1">
          {STEPS.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="underline">
                {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-6 space-y-7">
        {STEPS.map((s) => (
          <section key={s.id} id={s.id} className="scroll-mt-4">
            <h2 className="mb-2 text-lg font-semibold">{s.title}</h2>
            <div className="space-y-2 text-sm leading-relaxed [&_a]:underline [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1">{s.body}</div>
          </section>
        ))}
      </div>

      <p className="mt-10 border-t border-line pt-4 text-xs text-muted">
        Něco nefunguje nebo chybí? Napiš na <a href={`mailto:${OPERATOR.email}`} className="underline">{OPERATOR.email}</a>.
      </p>
    </main>
  );
}
