/**
 * La carte d'identité d'un thème sur mesure et la comparaison contre les doublons (carte des spécialistes de SINA,
 * lot 8, 13 novembre 2026 ; demande du propriétaire : « ne jamais faire de doublon dans les conception sur mesure »).
 *
 * Sans IA, sans coût. Une carte tient en neuf lignes, les mêmes pour un concept et pour un thème déjà monté : c'est
 * ce qui permet de les comparer par programme. Deux règles :
 *  - les deux concepts montrés au client diffèrent sur au moins CONCEPTS_MIN_DIFF lignes ;
 *  - un concept diffère de chaque thème déjà monté pour une autre marque sur au moins REGISTRY_MIN_DIFF lignes, et ne
 *    reprend jamais le même trio « ouverture, en-tête, ordre de l'accueil ».
 * Ce qui est trop proche revient une fois au concepteur, avec les lignes en cause ; ce qui reste est dit au client.
 * Une section à tenue se compare avec sa construction (« tn-ouverture:titre-geant ») : deux constructions ne sont pas
 * la même mise en page. La neuvième ligne est la tenue du site (titres, boutons, cadres, fond, petits textes).
 */
import { libSection, onlyFor } from "./library";
import { sectionGroup } from "./section-groups";
import type { CustomTheme } from "./theme";
import type { Tenue } from "./tenue";

export type ThemeCard = {
  /** Section d'ouverture de l'accueil. */
  opening: string;
  /** Ordre de l'accueil, par famille de sections. */
  homeOrder: string[];
  homeSections: string[];
  /** Page qui vend : fiche produit, ou prestations pour un service. */
  sellOrder: string[];
  sellSections: string[];
  header: string;
  footer: string;
  /** Sections propres à un produit ou à un métier. */
  own: string[];
  /** La tenue de la marque (sections à tenue) : titres, boutons, cadre, fond, petits textes ; vide sans tenue. */
  tenue: string;
};

export const CARD_LINES: { key: keyof ThemeCard; label: string }[] = [
  { key: "opening", label: "l'ouverture" },
  { key: "homeOrder", label: "l'ordre de l'accueil" },
  { key: "homeSections", label: "les sections de l'accueil" },
  { key: "sellOrder", label: "l'ordre de la page qui vend" },
  { key: "sellSections", label: "les sections de la page qui vend" },
  { key: "header", label: "l'en-tête" },
  { key: "footer", label: "le pied de page" },
  { key: "own", label: "la section propre au produit ou au métier" },
  { key: "tenue", label: "la tenue (titres, boutons, cadres, fond)" },
];
export const CONCEPTS_MIN_DIFF = 5;
export const REGISTRY_MIN_DIFF = 4;

type PageIds = { key: string; sections: string[] };
/** Une section à tenue se note « identifiant:construction » : deux constructions ne sont pas la même mise en page. */
const base = (id: string) => id.split(":")[0];
const group = (id: string) => { const l = libSection(base(id)); return (l && sectionGroup(l)) || "autre"; };
const isOwn = (id: string) => { const l = libSection(base(id)); return !!l && (!!onlyFor(l.tags) || sectionGroup(l) === "metiers"); };
export const built = (id: string, construction?: string | null) => (construction ? `${id}:${construction}` : id);
const tenueLine = (t: Tenue | null | undefined) => (t ? [t.titres, t.bouton, t.cadre, t.fond, t.petits].join(" ") : "");

export function cardOf(pages: PageIds[], shell: { header?: string | null; footer?: string | null; tenue?: Tenue | null }): ThemeCard {
  const home = pages.find((p) => p.key === "home")?.sections ?? [];
  const sell = (pages.find((p) => /^product/.test(p.key)) ?? pages.find((p) => p.key === "prestations"))?.sections ?? [];
  return {
    opening: home[0] ?? "",
    homeOrder: home.map(group), homeSections: [...home].sort(),
    sellOrder: sell.map(group), sellSections: [...sell].sort(),
    header: shell.header ?? "", footer: shell.footer ?? "",
    own: [...new Set([...home, ...sell].filter(isOwn))].sort(),
    tenue: tenueLine(shell.tenue),
  };
}
export const cardOfTheme = (t: CustomTheme): ThemeCard => cardOf(t.pages.map((p) => ({ key: p.key, sections: p.sections.map((s) => built(s.id, s.construction)) })), { header: t.header ? built(t.header.id, t.header.construction) : null, footer: t.footer?.id, tenue: t.tenue });

const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);
/** Deux listes de sections sont « les mêmes » quand elles se recouvrent pour moitié ou plus. */
const overlap = (a: string[], b: string[]) => { const B = new Set(b), both = a.filter((x) => B.has(x)).length, all = new Set([...a, ...b]).size; return all ? both / all : 1; };

/** Lignes COMMUNES à deux cartes (une ligne vide des deux côtés ne compte ni pour ni contre). */
export function commonLines(a: ThemeCard, b: ThemeCard): { common: string[]; compared: number } {
  const common: string[] = [];
  let compared = 0;
  for (const { key, label } of CARD_LINES) {
    const x = a[key], y = b[key];
    const empty = (v: string | string[]) => (Array.isArray(v) ? !v.length : !v);
    if (empty(x) && empty(y)) continue;
    compared++;
    const same = Array.isArray(x) && Array.isArray(y) ? (key === "homeSections" || key === "sellSections" || key === "own" ? overlap(x, y) >= 0.5 : sameList(x, y)) : x === y;
    if (same) common.push(label);
  }
  return { common, compared };
}

/** Les deux concepts montrés au client se ressemblent-ils trop ? */
export function conceptGaps(first: ThemeCard, second: ThemeCard): string[] {
  const { common, compared } = commonLines(first, second);
  const need = Math.min(CONCEPTS_MIN_DIFF, compared);
  if (compared - common.length >= need) return [];
  return [`ce concept ressemble trop au premier (${common.length} lignes communes sur ${compared} : ${common.join(", ")}) ; le client doit voir deux sites vraiment différents : change au moins ${need - (compared - common.length)} de ces lignes (une autre ouverture, un autre ordre, d'autres sections, un autre en-tête)`];
}

/** Le concept ressemble-t-il trop à un thème déjà monté pour une autre marque ? */
export function registryGaps(card: ThemeCard, registry: ThemeCard[]): string[] {
  for (const other of registry) {
    const { common, compared } = commonLines(card, other);
    if (compared < 4) continue;
    const trio = ["l'ouverture", "l'en-tête", "l'ordre de l'accueil"].every((l) => common.includes(l));
    if (trio) return [`même ouverture, même en-tête et même ordre d'accueil qu'un thème déjà monté pour une autre marque : aucun client ne reçoit le site d'un autre ; change au moins l'ouverture ou l'ordre de l'accueil`];
    const need = Math.min(REGISTRY_MIN_DIFF, compared);
    if (compared - common.length < need) return [`trop proche d'un thème déjà monté pour une autre marque (${common.length} lignes communes sur ${compared} : ${common.join(", ")}) : change au moins ${need - (compared - common.length)} de ces lignes pour CETTE marque`];
  }
  return [];
}
