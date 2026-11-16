/**
 * Les styles de la page qui vend (référence, partie 15 ; lot 4) : six styles de page produit et six styles de page de
 * services. Comme les familles, ils restent en coulisses : le client ne choisit pas un style, SINA le déduit de ce qu'il
 * vend et de sa planche. Un style donne la façon de bâtir le bloc d'achat (pour un produit) et les moments qui font la
 * page ; SINA choisit ensuite les pièces qui servent le mieux CETTE marque et n'en pose aucune sans vraies données.
 * Le Studio contrôle sans IA ce qui se contrôle (la façon du bloc d'achat, la pièce de métier attendue).
 * Gratuit, sans IA.
 */
import { z } from "zod";
import { partitionDuStyle, partitionLine } from "./partitions";

/** Les moments d'un style : ceux de sa partition, mot pour mot ceux du cahier. Un style sans partition est une erreur d'écriture. */
const momentsDuStyle = (id: string, business: "products" | "services"): string => { const p = partitionDuStyle(id, business); if (!p) throw new Error(`Style de page sans partition : ${id}`); return partitionLine(p); };

export type StyleDePage = {
  id: string;
  /** Nom de travail, jamais dit au client. */
  nom: string;
  /** Ce qu'on vend quand ce style convient. */
  pour: string;
  /**
   * Ce que fait la page, dans l'ordre : ses moments. Ils viennent de la partition du style (partitions.ts, cahier « ordre
   * et variété ») : une seule source pour la consigne, les contrôles et les juges.
   */
  moments: string;
  /** Ce qu'il faut savoir en plus pour bâtir ce style, sans redire l'ordre de la page. */
  details?: string;
  /** Page produit : la façon de bâtir le bloc d'achat (construction de « tn-achat »). */
  achat?: string;
  /** Pièces qui font ce style, à poser quand le client a de quoi les remplir (identifiants de la bibliothèque). */
  pieces: string[];
  /** Page de services : la pièce de métier sans laquelle la page n'est pas de ce style (une au moins doit y être). */
  metier?: string[];
  /** Ce que ce style ne fait jamais. */
  jamais?: string;
};

export const STYLES_PRODUIT: StyleDePage[] = [
  {
    id: "simple", nom: "Simple", pour: "un créateur, un artisan, un objet qui se présente de lui-même", achat: "simple",
    moments: momentsDuStyle("simple", "products"), details: "la photo, le nom, le prix et le bouton ; le produit vu de près (tn-de-pres), en situation (tn-places) ou ses mesures (tn-mesures) quand ils servent",
    pieces: ["tn-description", "tn-de-pres", "tn-emotion", "tn-places", "tn-mesures", "tn-garanties", "tn-questions", "tn-final"],
  },
  {
    id: "vente-directe", nom: "Vente directe", pour: "un produit qui se vend sur sa promesse, souvent seul ou presque seul au catalogue, à un visiteur venu d'une publicité, sur téléphone (ce que le propriétaire appelle le style dropshipping)", achat: "vente-directe",
    moments: momentsDuStyle("vente-directe", "products"), details: "le bloc d'achat est serré (prix en grand, livraison et retours cochés, gros bouton) ; juste dessous, seulement si le client les a : l'offre du moment avec sa vraie date de fin (tn-offre-moment), les packs (chaque article avec sa couleur et sa taille, un cadeau, l'étiquette « le plus populaire » sur le pack que le client désigne) ou les offres par quantité, puis sous le bouton le guide des tailles, ce qu'on reçoit, le délai réel, les moyens de paiement, les garanties et les questions (tn-sous-bouton) ; la barre d'achat reste visible. Sur l'accueil, dans l'ordre de SA partition : le produit, son prix et son bouton se posent avec tn-appel-produit (jamais tn-achat sur l'accueil) ; pour une boutique de ce style à plusieurs produits, quand le dossier les permet : le bandeau à plusieurs messages vrais (tn-messages), l'ouverture au macaron (tn-ouverture-vente, façon photo-pleine ; le macaron seulement avec un chiffre donné par le client), les produits en cartes de vente (tn-produits-vente), la différence en trois volets (tn-difference), le guide de choix (tn-guide-choix, deux produits au moins). COLLECTION : les cartes avec ajout rapide (tn-catalogue, façon ajout-rapide). PAGE D'ARRIVÉE D'UNE PUBLICITÉ (clé « arrivee », seulement si le client fait ou prépare de la publicité) : son en-tête et son pied minimaux se posent tout seuls à la place de ceux du site, ne les mets pas dans ses sections ; l'ouverture d'article (tn-ouverture-arrivee) → les raisons numérotées (tn-raisons) → les témoignages datés (vrais avis seulement, tn-temoignages) → les questions → l'appel final avec le produit → la barre du produit collée (tn-barre-produit). PAGE DES AVIS (clé « avis ») : tn-avis-page, seulement quand une vraie source d'avis existe",
    pieces: ["tn-offre-moment", "tn-packs", "tn-lots", "tn-sous-bouton", "tn-atouts", "tn-probleme-reponse", "tn-avantages", "tn-mur-avis", "tn-nous-et-autres", "tn-avant-apres-produit", "tn-livraison", "tn-garantie", "tn-questions", "tn-appel-produit", "tn-messages", "tn-ouverture-vente", "tn-produits-vente", "tn-difference", "tn-guide-choix", "tn-raisons", "tn-equation", "tn-temoignages", "tn-barre-produit", "tn-avis-page"],
    jamais: "une fausse urgence, un compte à rebours, un stock inventé (« plus que N » seulement avec le vrai stock suivi), un prix barré inventé, un faux avis, un délai que le client n'a pas donné",
  },
  {
    id: "haut-de-gamme", nom: "Haut de gamme", pour: "un bel objet, une pièce chère, une matière : on prend le temps de regarder", achat: "grandes-photos",
    moments: momentsDuStyle("haut-de-gamme", "products"), details: "de très grandes photos, l'achat étroit et discret ; le prix peut s'expliquer (tn-prix-explique) et le produit se montrer à son échelle (tn-echelle)",
    pieces: ["tn-emotion", "tn-description", "tn-composition", "tn-de-pres", "tn-echelle", "tn-prix-explique", "tn-garanties", "tn-final"],
    jamais: "une promotion criarde, une offre par quantité, une accumulation de pictos",
  },
  {
    id: "technique", nom: "Technique", pour: "du matériel, un outil, un équipement : on compare des caractéristiques avant d'acheter", achat: "technique",
    moments: momentsDuStyle("technique", "products"), details: "le nom, la photo et ses vues, le prix et les repères en cases ; le choix de la version sous le bloc d'achat (tn-versions) ; les mesures (tn-mesures) et les documents (tn-documents) quand le client les a ; le comparatif de la gamme seulement avec au moins deux produits",
    pieces: ["tn-versions", "tn-fiche-technique", "tn-de-pres", "tn-mesures", "tn-colis", "tn-comparatif", "tn-documents", "tn-garanties", "tn-questions", "tn-final"],
    jamais: "une caractéristique ou une mesure que le client n'a pas donnée",
  },
  {
    id: "alimentaire-soin", nom: "Alimentaire et soin", pour: "ce qui se mange, se boit ou se met sur la peau : on veut savoir ce qu'il y a dedans et comment s'en servir", achat: "fond-doux",
    moments: momentsDuStyle("alimentaire-soin", "products"), details: "le produit entier sur un fond de couleur douce ; les valeurs nutritionnelles (alimentaire, tn-valeurs) ou les effets attendus avec leurs preuves (soin, tn-effets et tn-preuves), seulement donnés par le client",
    pieces: ["tn-pictos", "tn-composition", "tn-allergenes", "tn-preparation", "tn-valeurs", "tn-effets", "tn-preuves", "tn-avis", "tn-questions", "tn-final"],
    jamais: "une promesse de santé, un ingrédient, un allergène ou une valeur que le client n'a pas donnés",
  },
  {
    id: "mode", nom: "Mode", pour: "un vêtement, une chaussure, un accessoire porté : la taille, la couleur et l'allure décident", achat: "portrait",
    moments: momentsDuStyle("mode", "products"), details: "une grande photo en hauteur ; les tailles et les couleurs en pastilles sous le bloc d'achat (tn-versions) ; le look complet seulement avec au moins deux vrais produits",
    pieces: ["tn-versions", "tn-guide-tailles", "tn-description", "tn-looks", "tn-composition", "tn-garanties", "tn-avis", "tn-final"],
    jamais: "une personne dans une image sans photo fournie par le client ou son accord écrit ; une taille ou une couleur qui n'est pas au catalogue",
  },
];
export const STYLES_SERVICES: StyleDePage[] = [
  {
    id: "prestation-simple", nom: "Prestation simple", pour: "un métier qui vend quelques prestations claires, sur rendez-vous ou sur appel",
    moments: momentsDuStyle("prestation-simple", "services"), details: "le moyen de prendre rendez-vous ou d'appeler revient en bas de page ; des réalisations seulement si le client en a ; où et quand (tn-acces) pour un métier où l'on vient",
    metier: ["tn-prestations"], pieces: ["tn-prestations", "tn-deroule", "tn-realisations", "tn-acces", "tn-rdv", "tn-urgence"],
    jamais: "une équipe, un avis ou un prix que le client n'a pas donnés",
  },
  {
    id: "rendez-vous-complet", nom: "Rendez-vous complet", pour: "un salon, un cabinet, un institut : on choisit sa prestation, la personne, puis le créneau",
    moments: momentsDuStyle("rendez-vous-complet", "services"), details: "le rendez-vous en trois temps (la prestation, la personne, le créneau) seulement avec l'équipe réelle ; les tarifs détaillés s'il y en a",
    metier: ["tn-rdv-complet", "tn-rdv"], pieces: ["tn-prestations", "tn-rdv-complet", "tn-equipe", "tn-tarifs", "tn-acces"],
    jamais: "une personne de l'équipe inventée : sans équipe donnée par le client, le rendez-vous simple (tn-rdv) remplace le rendez-vous en trois temps",
  },
  {
    id: "devis-artisan", nom: "Devis d'artisan", pour: "un artisan du bâtiment, de la réparation ou de la rénovation, qui chiffre chaque chantier",
    moments: momentsDuStyle("devis-artisan", "services"), details: "la promesse et le numéro dès le premier écran ; des exemples de prix vrais (tn-exemples-prix), les aides (tn-aides) et l'urgence (tn-urgence) seulement s'il y en a",
    metier: ["tn-devis"], pieces: ["tn-deroule", "tn-realisations", "tn-avant-apres", "tn-exemples-prix", "tn-aides", "tn-labels", "tn-zone", "tn-devis", "tn-urgence"],
    jamais: "un chantier, un prix d'exemple ou un label que le client n'a pas",
  },
  {
    id: "bien-immobilier", nom: "Fiche de bien immobilier", pour: "une agence immobilière : des biens à vendre ou à louer",
    moments: momentsDuStyle("bien-immobilier", "services"), details: "page d'un bien (clé « bien ») dans l'ordre de la partition, puis les autres biens ; page des biens (clé « biens ») : la recherche et la liste ; sur l'accueil : un bien vedette",
    metier: ["tn-bien-galerie", "tn-biens", "tn-recherche-biens"], pieces: ["tn-bien-galerie", "tn-bien-caracteristiques", "tn-bien-energie", "tn-bien-quartier", "tn-bien-visite", "tn-biens", "tn-recherche-biens", "tn-vendus"],
    jamais: "un bien inventé : sans bien publié par le client, aucune pièce de biens n'est posée ; une étiquette énergie absente s'affiche « non communiquée »",
  },
  {
    id: "restaurant", nom: "Restaurant", pour: "un restaurant, un café, un traiteur, une boulangerie",
    moments: momentsDuStyle("restaurant", "services"), details: "la vitrine du jour (tn-vitrine) à la place de la carte pour une boulangerie ; la vente à emporter (tn-retrait) s'il y en a",
    metier: ["tn-carte", "tn-reserver-table", "tn-vitrine"], pieces: ["tn-carte", "tn-origines", "tn-reserver-table", "tn-retrait", "tn-vitrine", "tn-acces"],
    jamais: "un plat, un prix ou un allergène que le client n'a pas saisi",
  },
  {
    id: "atelier-cours", nom: "Atelier ou cours", pour: "des ateliers, des cours, des stages : des dates, des places, une inscription",
    moments: momentsDuStyle("atelier-cours", "services"), details: "le planning de la semaine pour des cours réguliers (tn-planning), les prochaines dates pour des ateliers (tn-agenda)",
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
      `  La page, dans l'ordre de sa partition (identifiant « ${business === "services" ? "prestation" : "fiche"}:${x.id} ») : ${x.moments}.`,
      x.details ? `  À savoir : ${x.details}.` : "",
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
