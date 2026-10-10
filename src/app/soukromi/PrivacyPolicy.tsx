"use client";

import { LegalPage } from "@/components/LegalPage";
import { OPERATOR } from "@/lib/operator";

const mail = <a href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a>;

/** Zásady ochrany osobních údajů (PRD 6.5). */
export function PrivacyPolicy() {
  return (
    <LegalPage
      content={{
        cs: {
          title: "Zásady ochrany osobních údajů",
          updated: "Platné od 10. 10. 2026",
          sections: [
            {
              title: "Kdo údaje zpracovává",
              body: (
                <p>
                  Správcem osobních údajů je {OPERATOR.name} (fyzická osoba), kontakt: {mail}. Clave je nekomerční fanouškovský projekt – údaje
                  neprodáváme, nepoužíváme k reklamě ani je nepředáváme dalším stranám kromě technických zpracovatelů níže.
                </p>
              ),
            },
            {
              title: "Jaké údaje ukládáme",
              body: (
                <ul>
                  <li>
                    <strong>Bez přihlášení</strong> program prohlížíš anonymně, žádné osobní údaje neukládáme.
                  </li>
                  <li>
                    <strong>Účet:</strong> e-mail a jméno z Google účtu (nebo jen e-mail při přihlášení odkazem).
                  </li>
                  <li>
                    <strong>Osobní program:</strong> lekce a párty, které si označíš, a čas tvé poslední návštěvy festivalu (kvůli upozornění na změny).
                    Tyto údaje vidíš jen ty, organizátor je nevidí.
                  </li>
                  <li>
                    <strong>Organizátoři a učitelé:</strong> role u festivalu, pozvánky (e-mail pozvaného), záznamy v logu změn (kdo a kdy upravil
                    program) a medailonek učitele (jméno, fotka, popis) – medailonek a program jsou veřejné.
                  </li>
                  <li>
                    <strong>V tvém zařízení:</strong> přihlašovací cookies, zvolený jazyk a zobrazení programu a uložený program pro offline režim.
                    Nepoužíváme analytické ani reklamní cookies.
                  </li>
                </ul>
              ),
            },
            {
              title: "Proč a na jakém základě",
              body: (
                <p>
                  Údaje zpracováváme, abychom ti mohli poskytovat aplikaci – přihlášení, osobní program a správu festivalu (čl. 6 odst. 1 písm. b
                  GDPR). Log změn a technické záznamy slouží k bezpečnosti a dohledání chyb (oprávněný zájem, čl. 6 odst. 1 písm. f GDPR).
                </p>
              ),
            },
            {
              title: "Kdo nám pomáhá (zpracovatelé)",
              body: (
                <ul>
                  <li>Supabase – databáze, přihlašování a úložiště obrázků (servery v EU, Frankfurt).</li>
                  <li>Vercel – provoz webu (může zpracovávat technické údaje jako IP adresu; USA, standardní smluvní doložky).</li>
                  <li>Google – přihlášení přes Google účet.</li>
                  <li>GitHub – denní zálohy databáze v soukromém repozitáři (USA, standardní smluvní doložky).</li>
                </ul>
              ),
            },
            {
              title: "Jak dlouho údaje uchováváme",
              body: (
                <p>
                  Údaje účtu a osobní program do smazání účtu. Zálohy databáze 30 dní. Program, medailonky a log změn po dobu existence festivalu v
                  aplikaci (minulé festivaly zůstávají v archivu).
                </p>
              ),
            },
            {
              title: "Tvoje práva",
              body: (
                <>
                  <p>
                    Máš právo na přístup ke svým údajům, jejich opravu, výmaz, omezení zpracování, přenositelnost a vznést námitku. Účet i se všemi
                    daty smažeš sám v aplikaci: festival → <em>Více → Účet → Smazat účet</em>. S čímkoli dalším napiš na {mail}.
                  </p>
                  <p>
                    Můžeš se také obrátit na Úřad pro ochranu osobních údajů (<a href="https://uoou.gov.cz">uoou.gov.cz</a>).
                  </p>
                </>
              ),
            },
            {
              title: "Změny zásad",
              body: <p>Při změně zásad aktualizujeme tuto stránku a datum platnosti nahoře.</p>,
            },
          ],
        },
        en: {
          title: "Privacy policy",
          updated: "Effective from 10 October 2026",
          sections: [
            {
              title: "Who processes your data",
              body: (
                <p>
                  The data controller is {OPERATOR.name} (private individual), contact: {mail}. Clave is a non-commercial fan project – we don&apos;t sell
                  data, use it for advertising or share it with anyone except the technical processors listed below.
                </p>
              ),
            },
            {
              title: "What we store",
              body: (
                <ul>
                  <li>
                    <strong>Without signing in</strong> you browse the program anonymously and we store no personal data.
                  </li>
                  <li>
                    <strong>Account:</strong> email and name from your Google account (or just email when signing in with a link).
                  </li>
                  <li>
                    <strong>Personal program:</strong> classes and parties you mark and the time of your last visit (for change notices). Only you can
                    see it – organizers can&apos;t.
                  </li>
                  <li>
                    <strong>Organizers and teachers:</strong> festival roles, invitations (invitee email), change log entries (who edited the program and
                    when) and teacher profiles (name, photo, bio) – profiles and the program are public.
                  </li>
                  <li>
                    <strong>On your device:</strong> sign-in cookies, chosen language and view, and the program saved for offline use. We use no analytics
                    or advertising cookies.
                  </li>
                </ul>
              ),
            },
            {
              title: "Why and on what basis",
              body: (
                <p>
                  We process data to provide the app – sign-in, personal program and festival management (Art. 6(1)(b) GDPR). The change log and
                  technical records serve security and troubleshooting (legitimate interest, Art. 6(1)(f) GDPR).
                </p>
              ),
            },
            {
              title: "Processors",
              body: (
                <ul>
                  <li>Supabase – database, sign-in and image storage (EU servers, Frankfurt).</li>
                  <li>Vercel – website hosting (may process technical data such as IP addresses; USA, standard contractual clauses).</li>
                  <li>Google – sign-in with Google.</li>
                  <li>GitHub – daily database backups in a private repository (USA, standard contractual clauses).</li>
                </ul>
              ),
            },
            {
              title: "How long we keep data",
              body: (
                <p>
                  Account data and personal program until you delete your account. Database backups for 30 days. Programs, teacher profiles and change logs
                  for as long as the festival exists in the app (past festivals stay in the archive).
                </p>
              ),
            },
            {
              title: "Your rights",
              body: (
                <>
                  <p>
                    You have the right to access, rectify and erase your data, restrict processing, data portability and to object. You can delete your
                    account with all data in the app: festival → <em>More → Account → Delete account</em>. For anything else write to {mail}.
                  </p>
                  <p>
                    You can also contact the Czech data protection authority (<a href="https://uoou.gov.cz">uoou.gov.cz</a>).
                  </p>
                </>
              ),
            },
            {
              title: "Changes",
              body: <p>If this policy changes, we update this page and the effective date above.</p>,
            },
          ],
        },
      }}
    />
  );
}
