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
export const STYLES_SERVICES: StyleDePage[] = [
  {
    id: "prestation-simple", nom: "Prestation simple", pour: "un métier qui vend quelques prestations claires, sur rendez-vous ou sur appel",
    moments: "ce qu'on fait et pour qui → les prestations et leurs vrais prix → comment ça se passe → des réalisations (seulement si le client en a) → où et quand → le moyen de prendre rendez-vous ou d'appeler",
    metier: ["tn-prestations"], pieces: ["tn-prestations", "tn-deroule", "tn-realisations", "tn-acces", "tn-rdv", "tn-urgence"],
    jamais: "une équipe, un avis ou un prix que le client n'a pas donnés",
  },
  {
    id: "rendez-vous-complet", nom: "Rendez-vous complet", pour: "un salon, un cabinet, un institut : on choisit sa prestation, la personne, puis le créneau",
    moments: "les prestations et leurs prix → le rendez-vous en trois temps (la prestation, la personne, le créneau) → l'équipe réelle → les tarifs détaillés s'il y en a → l'accès et les horaires",
    metier: ["tn-rdv-complet", "tn-rdv"], pieces: ["tn-prestations", "tn-rdv-complet", "tn-equipe", "tn-tarifs", "tn-acces"],
    jamais: "une personne de l'équipe inventée : sans équipe donnée par le client, le rendez-vous simple (tn-rdv) remplace le rendez-vous en trois temps",
  },
  {
    id: "devis-artisan", nom: "Devis d'artisan", pour: "un artisan du bâtiment, de la réparation ou de la rénovation, qui chiffre chaque chantier",
    moments: "la promesse et le numéro → comment se passe un chantier, étape par étape → les réalisations et l'avant, après → des exemples de prix vrais → les aides et les garanties s'il y en a → la zone d'intervention → la demande de devis détaillée → l'urgence",
    metier: ["tn-devis"], pieces: ["tn-deroule", "tn-realisations", "tn-avant-apres", "tn-exemples-prix", "tn-aides", "tn-labels", "tn-zone", "tn-devis", "tn-urgence"],
    jamais: "un chantier, un prix d'exemple ou un label que le client n'a pas",
  },
  {
    id: "bien-immobilier", nom: "Fiche de bien immobilier", pour: "une agence immobilière : des biens à vendre ou à louer",
    moments: "page d'un bien (clé « bien ») : la galerie et le prix → les caractéristiques → les étiquettes énergie → le quartier → la demande de visite → les autres biens ; page des biens (clé « biens ») : la recherche et la liste ; sur l'accueil : un bien vedette",
    metier: ["tn-bien-galerie", "tn-biens", "tn-recherche-biens"], pieces: ["tn-bien-galerie", "tn-bien-caracteristiques", "tn-bien-energie", "tn-bien-quartier", "tn-bien-visite", "tn-biens", "tn-recherche-biens", "tn-vendus"],
    jamais: "un bien inventé : sans bien publié par le client, aucune pièce de biens n'est posée ; une étiquette énergie absente s'affiche « non communiquée »",
  },
  {
    id: "restaurant", nom: "Restaurant", pour: "un restaurant, un café, un traiteur, une boulangerie",
    moments: "le lieu et l'envie → la carte et ses vrais prix (ou la vitrine du jour) → d'où viennent les produits → la réservation de table → la vente à emporter s'il y en a → l'accès et les horaires",
    metier: ["tn-carte", "tn-table", "tn-vitrine"], pieces: ["tn-carte", "tn-origines", "tn-table", "tn-retrait", "tn-vitrine", "tn-acces"],
    jamais: "un plat, un prix ou un allergène que le client n'a pas saisi",
  },
  {
    id: "atelier-cours", nom: "Atelier ou cours", pour: "des ateliers, des cours, des stages : des dates, des places, une inscription",
    moments: "ce qu'on y apprend et l'envie → les prochaines dates et les places → le planning de la semaine pour des cours réguliers → comment se passe une séance → les tarifs → l'inscription → l'accès",
    metier: ["tn-agenda", "tn-planning", "tn-inscription"], pieces: ["tn-agenda", "tn-planning", "tn-deroule", "tn-tarifs", "tn-inscription", "tn-acces"],
    jamais: "une date ou un nombre de places inventés",
  },
];

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
const sellingPages = (pages: PageLike[], business: "products" | "services") => pages.filter((p) => (business === "services" ? /^(prestations|reservation|devis|biens|bien|visite|carte|ateliers|inscription)/.test(p.key) || p.key === "home" : /^product/.test(p.key)));

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
