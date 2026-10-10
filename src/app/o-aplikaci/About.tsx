"use client";

import Link from "next/link";
import { LegalPage } from "@/components/LegalPage";
import { OPERATOR } from "@/lib/operator";

const mail = <a href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a>;
const repo = <a href={OPERATOR.repository}>GitHub</a>;

export function About() {
  return (
    <LegalPage
      content={{
        cs: {
          title: "O aplikaci Clave",
          sections: [
            {
              title: "Co je Clave",
              body: (
                <p>
                  Clave nahrazuje papírový rozpis lekcí na tanečních festivalech: program v mobilu, vlastní rozvrh, upozornění na změny a fungování i bez
                  signálu. Je to nekomerční fanouškovský projekt – bez reklam a poplatků.
                </p>
              ),
            },
            {
              title: "Jak vznikla",
              body: (
                <p>
                  Aplikace Clave byla vytvořena s pomocí umělé inteligence (Claude od společnosti Anthropic). Zadání, rozhodnutí o funkcích a
                  testování dělal člověk; kód, texty a grafiku navrhovala AI pod jeho vedením. Zdrojový kód je veřejný na {repo}.
                </p>
              ),
            },
            {
              title: "Provozovatel a kontakt",
              body: (
                <p>
                  {OPERATOR.name}, {mail}. Jak nakládáme s osobními údaji, najdeš v <Link href="/soukromi">zásadách ochrany osobních údajů</Link>.
                </p>
              ),
            },
          ],
        },
        en: {
          title: "About Clave",
          sections: [
            {
              title: "What Clave is",
              body: (
                <p>
                  Clave replaces the paper class schedule at dance festivals: the program on your phone, your own schedule, change notices and offline use.
                  It&apos;s a non-commercial fan project – no ads, no fees.
                </p>
              ),
            },
            {
              title: "How it was made",
              body: (
                <p>
                  Clave was built with the help of artificial intelligence (Claude by Anthropic). A human wrote the brief, made the product decisions and
                  tested it; the AI drafted the code, texts and design under their direction. The source code is public on {repo}.
                </p>
              ),
            },
            {
              title: "Operator and contact",
              body: (
                <p>
                  {OPERATOR.name}, {mail}. See the <Link href="/soukromi">privacy policy</Link> for how we handle personal data.
                </p>
              ),
            },
          ],
        },
      }}
    />
  );
}
