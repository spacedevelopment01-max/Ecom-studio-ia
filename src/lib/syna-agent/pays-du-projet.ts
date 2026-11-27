/**
 * Le pays du client, pour l'outil de recherche web (27 novembre 2026) : sans pays, l'outil cherche comme depuis les
 * États-Unis. France par défaut ; un autre pays seulement quand la fiche le nomme clairement (où il vend ou travaille,
 * puis ses coordonnées). Prudent : la France nommée, ou plusieurs autres pays à la fois, gardent la France.
 * Aucun appel, aucune donnée de plus envoyée : ces réponses sont déjà dans la fiche lue par le modèle.
 */
import type { Journey } from "./journey";

export const PAYS_PAR_DEFAUT = "FR";

const PAYS: [RegExp, string][] = [
  [/\bfrance\b/, "FR"],
  [/\bbelgique\b|\bbelgium\b/, "BE"],
  [/\bsuisse\b|\bswitzerland\b/, "CH"],
  [/\bluxembourg\b/, "LU"],
  [/\bcanada\b|\bquebec\b/, "CA"],
  [/\bmonaco\b/, "MC"],
  [/\bmaroc\b|\bmorocco\b/, "MA"],
  [/\balgerie\b|\balgeria\b/, "DZ"],
  [/\btunisie\b|\btunisia\b/, "TN"],
  [/\bsenegal\b/, "SN"],
  [/\bcote d ?ivoire\b/, "CI"],
  [/\ballemagne\b|\bgermany\b/, "DE"],
  [/\bespagne\b|\bspain\b/, "ES"],
  [/\bitalie\b|\bitaly\b/, "IT"],
  [/\bportugal\b/, "PT"],
  [/\bpays bas\b|\bnetherlands\b/, "NL"],
  [/\broyaume uni\b|\bangleterre\b|\bunited kingdom\b/, "GB"],
  [/\betats unis\b|\bunited states\b|\busa\b/, "US"],
];

const plat = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ");

/** Le pays nommé dans un texte, ou null (aucun, ou rien de sûr). */
export function paysNomme(texte: string): string | null {
  const t = ` ${plat(texte)} `;
  const vus = [...new Set(PAYS.filter(([re]) => re.test(t)).map(([, c]) => c))];
  if (!vus.length) return null;
  if (vus.includes("FR")) return "FR";
  return vus.length === 1 ? vus[0] : "FR";
}

/** Le pays du projet : où il vend ou travaille, puis ses coordonnées ; la France sinon. */
export function paysDuProjet(j: Pick<Journey, "start">): string {
  for (const f of ["market", "contact"] as const) {
    const a = j.start[f];
    if (a?.status !== "answered" || !a.value) continue;
    const p = paysNomme(a.value);
    if (p) return p;
  }
  return PAYS_PAR_DEFAUT;
}
