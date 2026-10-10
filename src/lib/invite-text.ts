import { SITE_URL } from "./site";

/**
 * Text pozvánky ke zkopírování (WhatsApp, e-mail…). Aplikace zatím pozvánky sama
 * neposílá – organizátor je pošle sám.
 */
export function inviteText(kind: "organizer" | "lead_organizer" | "teacher", festivalName: string, email: string) {
  if (kind === "teacher") {
    const url = `${SITE_URL}/ucet`;
    return `Ahoj, na festivalu ${festivalName} tě v aplikaci Clave vedeme jako učitele. Přihlas se, ať si můžeš sám upravit svůj medailonek (fotku a popis):
1. Otevři ${url}
2. Přihlas se přes Google účtem ${email}

Hi, you're listed as a teacher at ${festivalName} in the Clave app. Sign in to edit your own profile (photo and bio):
1. Open ${url}
2. Sign in with Google using ${email}`;
  }

  const url = `${SITE_URL}/admin`;
  const roleCs = kind === "lead_organizer" ? "hlavního organizátora" : "organizátora";
  const roleEn = kind === "lead_organizer" ? "a lead organizer" : "an organizer";
  return `Ahoj, zvu tě jako ${roleCs} festivalu ${festivalName} v aplikaci Clave:
1. Otevři ${url}
2. Přihlas se přes Google účtem ${email}
Festival pak uvidíš ve správě.

Hi, you've been invited as ${roleEn} of ${festivalName} in the Clave app:
1. Open ${url}
2. Sign in with Google using ${email}
You'll then see the festival in the admin.`;
}
