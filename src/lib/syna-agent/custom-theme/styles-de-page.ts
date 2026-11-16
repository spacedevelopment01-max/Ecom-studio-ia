/**
 * Les styles de la page qui vend (référence, partie 15 ; lot 4) : six styles de page produit et six styles de page de
 * services. Comme les familles, ils restent en coulisses : le client ne choisit pas un style, SINA le déduit de ce qu'il
 * vend et de sa planche. Un style donne la façon de bâtir le bloc d'achat (pour un produit) et les moments qui font la
 * page ; SINA choisit ensuite les pièces qui servent le mieux CETTE marque et n'en pose aucune sans vraies données.
 * Le Studio contrôle sans IA ce qui se contrôle (la façon du bloc d'achat, la pièce de métier attendue).
 * Gratuit, sans IA.
 */
import { z } from "zod";

export type StyleDePage = {
  id: string;
  /** Nom de travail, jamais dit au client. */
  nom: string;
  /** Ce qu'on vend quand ce style convient. */
  pour: string;
  /** Ce que fait la page, dans l'ordre : ses moments, dits en clair au concepteur. */
  moments: string;
  /** Page produit : la façon de bâtir le bloc d'achat (construction de « tn-achat »). */
  achat?: string;
  /** Pièces qui font ce style, à poser quand le client a de quoi les remplir (identifiants de la bibliothèque). */
  pieces: string[];
  /** Page de services : la pièce de métier sans laquelle la page n'est pas de ce style (une au moins doit y être). */
  metier?: string[];
  /** Ce que ce style ne fait jamais. */
  jamais?: string;
};

export const STYLES_PRODUIT: StyleDePage[] = [];
export const STYLES_SERVICES: StyleDePage[] = [];

const plain = (v: unknown) => (typeof v === "string" ? v.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z]+/g, "-").replace(/^-+|-+$/g, "") : "");
/** Lecture indulgente du style rendu par le concepteur (clé ou nom) : jamais un appel payé perdu. */
export function readStyle(v: unknown, business: "products" | "services" | null = null): string | null {
  const s = plain(v);
  if (!s) return null;
  const list = business === "products" ? STYLES_PRODUIT : business === "services" ? STYLES_SERVICES : [...STYLES_PRODUIT, ...STYLES_SERVICES];
  return list.find((x) => x.id === s || plain(x.nom) === s)?.id ?? null;
}
export const StylePick = z.preprocess((v) => readStyle(v), z.string().nullable()).catch(null);

export const stylesOf = (business: "products" | "services") => (business === "services" ? STYLES_SERVICES : STYLES_PRODUIT);
export const styleOf = (id: string | null | undefined, business: "products" | "services") => stylesOf(business).find((x) => x.id === id) ?? null;

/** Les styles de la page qui vend, dits au concepteur : il en choisit UN (champ « pageStyle »). */
export function stylesBrief(business: "products" | "services"): string {
  const list = stylesOf(business);
  if (!list.length) return "";
  const page = business === "services" ? "page de services (clé « prestations », ou la page du métier)" : "fiche produit (clé « product »)";
  return [
    `LES STYLES DE LA ${business === "services" ? "PAGE DE SERVICES" : "PAGE PRODUIT"} (en coulisses, jamais dits au client). Choisis-en UN (champ « pageStyle », sa clé) d'après ce que le client vend vraiment et sa planche, dis pourquoi dans « pageStyleWhy », et bâtis la ${page} dans ce style. Le style donne les moments de la page ; tu choisis les pièces qui servent le mieux CETTE marque, et tu n'en poses aucune que le client ne peut pas remplir avec de vraies données.`,
    ...list.map((x) => [
      `- ${x.id} (${x.nom}). Pour : ${x.pour}.`,
      `  La page : ${x.moments}.`,
      x.achat ? `  Bloc d'achat (« tn-achat ») : construction « ${x.achat} ».` : "",
      x.metier?.length ? `  Sa pièce de métier (une au moins sur la page) : ${x.metier.join(" ou ")}.` : "",
      x.pieces.length ? `  Ses pièces, quand le client a de quoi les remplir : ${x.pieces.join(", ")}.` : "",
      x.jamais ? `  Jamais : ${x.jamais}.` : "",
    ].filter(Boolean).join("\n")),
  ].join("\n");
}

type PageLike = { key: string; sections: { section: string; construction?: string | null }[] };
const sellingPages = (pages: PageLike[], business: "products" | "services") => pages.filter((p) => (business === "services" ? /^(prestations|reservation|devis|biens|bien|carte|ateliers)/.test(p.key) || p.key === "home" : /^product/.test(p.key)));

/** Contrôle du Studio, sans IA : la page qui vend tient-elle dans le style annoncé ? */
export function styleGaps(d: { pageStyle?: string | null; pages: PageLike[] }, business: "products" | "services"): string[] {
  const list = stylesOf(business);
  if (!list.length) return [];
  const st = styleOf(d.pageStyle, business);
  if (!st) return [`style de la ${business === "services" ? "page de services" : "page produit"} manquant ou inconnu (champ « pageStyle ») : choisis parmi ${list.map((x) => x.id).join(", ")}`];
  const out: string[] = [];
  const pages = sellingPages(d.pages, business);
  if (st.achat) for (const p of pages) {
    const buy = p.sections.find((x) => x.section === "tn-achat");
    if (buy && (buy.construction ?? null) !== st.achat) out.push(`style ${st.id} : sur la page « ${p.key} », le bloc d'achat se bâtit en « ${st.achat} » (et non « ${buy.construction ?? "par défaut"} »)`);
  }
  if (st.metier?.length && !pages.some((p) => p.sections.some((x) => st.metier!.includes(x.section)))) out.push(`style ${st.id} : aucune de ses pièces de métier n'est posée (${st.metier.join(" ou ")})`);
  return out;
}

/** Dernier recours sans IA : le bloc d'achat prend la façon du style annoncé. Rend la conception ajustée et ce qui a changé. */
export function fitStyle<D extends { pageStyle?: string | null; pages: PageLike[] }>(d: D, business: "products" | "services"): { d: D; changed: string[] } {
  const st = styleOf(d.pageStyle, business);
  if (!st?.achat) return { d, changed: [] };
  const out: D = JSON.parse(JSON.stringify(d));
  const changed: string[] = [];
  for (const p of sellingPages(out.pages, business)) for (const x of p.sections) if (x.section === "tn-achat" && (x.construction ?? null) !== st.achat) { changed.push(`bloc d'achat de « ${p.key} » : ${x.construction ?? "par défaut"} → ${st.achat}`); x.construction = st.achat; }
  return { d: out, changed };
}
