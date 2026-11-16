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

export const STYLES_PRODUIT: StyleDePage[] = [
  {
    id: "simple", nom: "Simple", pour: "un créateur, un artisan, un objet qui se présente de lui-même", achat: "simple",
    moments: "la photo, le nom, le prix et le bouton → la description racontée → le produit vu de près → une grande image d'émotion → le produit en situation ou ses mesures → les garanties → les vraies questions → l'appel final",
    pieces: ["tn-description", "tn-de-pres", "tn-emotion", "tn-places", "tn-mesures", "tn-garanties", "tn-questions", "tn-final"],
  },
  {
    id: "vente-directe", nom: "Vente directe", pour: "un produit qui se vend sur sa promesse, souvent seul ou presque seul au catalogue, à un visiteur venu d'une publicité, sur téléphone (ce que le propriétaire appelle le style dropshipping)", achat: "vente-directe",
    moments: "l'achat serré (prix en grand, livraison et retours cochés, gros bouton) → l'offre du moment si le client a une vraie promotion avec sa date de fin → les packs (chaque article avec sa couleur et sa taille, un cadeau, l'étiquette « le plus populaire » sur le pack que le client désigne) ou les offres par quantité, si le client en a → sous le bouton : le guide des tailles, ce qu'on reçoit, le délai réel, les moyens de paiement, les garanties, les questions → les promesses cochées → le problème, puis la réponse → les avantages un par un, en image → le mur d'avis (vrais avis seulement) → nous et les autres (faits prouvés seulement) → l'avant et l'après (vraies photos seulement) → la livraison expliquée avec les vrais délais → la garantie mise en avant → les questions → l'appel final avec le produit, son prix et le bouton ; la barre d'achat reste visible. Accueil d'une boutique à un seul produit : l'ouverture en grande photo, puis le produit, son prix et son bouton tout de suite (tn-appel-produit, jamais tn-achat sur l'accueil), puis les mêmes moments. ACCUEIL d'une boutique de ce style à plusieurs produits : le bandeau à plusieurs messages vrais (tn-messages) → l'ouverture au macaron (tn-ouverture-vente, façon photo-pleine ; le macaron seulement avec un chiffre donné par le client) → les réassurances en cases → les produits en cartes de vente (tn-produits-vente) → la presse (vraies parutions seulement) → la différence en trois volets (tn-difference) → les bénéfices → l'histoire → les avis (vrais seulement) → le guide de choix (tn-guide-choix, deux produits au moins) → la garantie → les questions. COLLECTION : les cartes avec ajout rapide (tn-catalogue, façon ajout-rapide). PAGE D'ARRIVÉE D'UNE PUBLICITÉ (clé « arrivee », seulement si le client fait ou prépare de la publicité) : l'ouverture d'article (tn-ouverture-arrivee) → les raisons numérotées (tn-raisons) avec « en trois temps » et « l'équation » → les témoignages datés (vrais avis seulement, tn-temoignages) → les questions → l'appel final avec le produit → la barre du produit collée (tn-barre-produit). PAGE DES AVIS (clé « avis ») : tn-avis-page, seulement quand une vraie source d'avis existe",
    pieces: ["tn-offre-moment", "tn-packs", "tn-lots", "tn-sous-bouton", "tn-atouts", "tn-probleme-reponse", "tn-avantages", "tn-mur-avis", "tn-nous-et-autres", "tn-avant-apres-produit", "tn-livraison", "tn-garantie", "tn-questions", "tn-appel-produit", "tn-messages", "tn-ouverture-vente", "tn-produits-vente", "tn-difference", "tn-guide-choix", "tn-raisons", "tn-equation", "tn-temoignages", "tn-barre-produit", "tn-avis-page"],
    jamais: "une fausse urgence, un compte à rebours, un stock inventé (« plus que N » seulement avec le vrai stock suivi), un prix barré inventé, un faux avis, un délai que le client n'a pas donné",
  },
  {
    id: "haut-de-gamme", nom: "Haut de gamme", pour: "un bel objet, une pièce chère, une matière : on prend le temps de regarder", achat: "grandes-photos",
    moments: "de très grandes photos, l'achat étroit et discret → une grande image et sa phrase → le récit du produit → les matières, une à une → le produit vu de près → son échelle → le prix expliqué → les garanties → l'appel final",
    pieces: ["tn-emotion", "tn-description", "tn-composition", "tn-de-pres", "tn-echelle", "tn-prix-explique", "tn-garanties", "tn-final"],
    jamais: "une promotion criarde, une offre par quantité, une accumulation de pictos",
  },
  {
    id: "technique", nom: "Technique", pour: "du matériel, un outil, un équipement : on compare des caractéristiques avant d'acheter", achat: "technique",
    moments: "le nom, la photo et ses vues, le prix et les repères en cases → le choix de la version → les caractéristiques vraies → le produit vu sous tous les angles → ses mesures → ce qu'il y a dans le colis → le comparatif de la gamme (s'il y a au moins deux produits) → les documents → les garanties → les questions",
    pieces: ["tn-versions", "tn-fiche-technique", "tn-de-pres", "tn-mesures", "tn-colis", "tn-comparatif", "tn-documents", "tn-garanties", "tn-questions", "tn-final"],
    jamais: "une caractéristique ou une mesure que le client n'a pas donnée",
  },
  {
    id: "alimentaire-soin", nom: "Alimentaire et soin", pour: "ce qui se mange, se boit ou se met sur la peau : on veut savoir ce qu'il y a dedans et comment s'en servir", achat: "fond-doux",
    moments: "le produit entier sur un fond de couleur douce → ses repères en un coup d'œil → ce qu'il contient → les allergènes → comment s'en servir ou le préparer → les valeurs nutritionnelles (alimentaire) ou les effets attendus avec leurs preuves (soin) → les preuves → les vrais avis s'il y en a → les questions",
    pieces: ["tn-pictos", "tn-composition", "tn-allergenes", "tn-preparation", "tn-valeurs", "tn-effets", "tn-preuves", "tn-avis", "tn-questions", "tn-final"],
    jamais: "une promesse de santé, un ingrédient, un allergène ou une valeur que le client n'a pas donnés",
  },
  {
    id: "mode", nom: "Mode", pour: "un vêtement, une chaussure, un accessoire porté : la taille, la couleur et l'allure décident", achat: "portrait",
    moments: "une grande photo en hauteur, le nom et le prix → les tailles et les couleurs en pastilles → le guide des tailles → la description → le look complet avec d'autres vrais produits (s'il y en a au moins deux) → la matière → la livraison et les retours → les vrais avis s'il y en a",
    pieces: ["tn-versions", "tn-guide-tailles", "tn-description", "tn-looks", "tn-composition", "tn-garanties", "tn-avis", "tn-final"],
    jamais: "une personne dans une image sans photo fournie par le client ou son accord écrit ; une taille ou une couleur qui n'est pas au catalogue",
  },
];
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
    metier: ["tn-carte", "tn-reserver-table", "tn-vitrine"], pieces: ["tn-carte", "tn-origines", "tn-reserver-table", "tn-retrait", "tn-vitrine", "tn-acces"],
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
