/**
 * Parcours de création d'un projet par SINA (#492, décisions du propriétaire du 6 novembre 2026 ;
 * docs/syna/PARCOURS-CREATION.md). Quatorze étapes (0 à 13), suivies par fil : l'état vit dans
 * `agent_conversations.state_json.parcours`, donc il existe dès le brouillon (avant la création du projet) et suit le
 * fil quand le projet est créé. SINA le relit à chaque pas (contexte) ; le client le voit en frise.
 *
 * Étape 0 : fiche de départ. Questions posées UNE à la fois, seulement si la réponse manque (jamais redemandée) ;
 * l'existant du client (site lu gratuitement, photos, formulaire de création) préremplit la fiche ; mode « refonte » :
 * le client dit ce qu'il garde tel quel, le reste est recréé. Aucune IA payante pour décider quoi demander.
 */
import { HttpError } from "../auth";
import { json, now, one, run, tx } from "../db";
import { L } from "../i18n-server";
import type { Identity } from "./identities";
import type { SinaLogo } from "./logos";
import type { BrandKit } from "./brand-kit";
import type { SinaAngles } from "./angles";
import type { ActivityPlan } from "./activity";
import type { SinaThemes } from "./themes";

export const JOURNEY_STEPS = [
  { n: 0, fr: "Questions de départ", en: "Getting started" },
  { n: 1, fr: "3 identités de marque", en: "3 brand identities" },
  { n: 2, fr: "3 logos", en: "3 logos" },
  { n: 3, fr: "Image de marque complète", en: "Full brand kit" },
  { n: 4, fr: "5 angles marketing", en: "5 marketing angles" },
  { n: 5, fr: "L'activité complète", en: "The full business" },
  { n: 6, fr: "Thème du Studio ou thème sur mesure", en: "Studio theme or custom theme" },
  { n: 7, fr: "Site codé d'après le thème sur mesure", en: "Site coded from the custom theme" },
  { n: 8, fr: "Un de nos thèmes, adapté", en: "One of our themes, adapted" },
  { n: 9, fr: "Publications", en: "Social posts" },
  { n: 10, fr: "Publicités", en: "Ads" },
  { n: 11, fr: "Calendrier de publication", en: "Posting calendar" },
  { n: 12, fr: "Articles de blog", en: "Blog articles" },
  { n: 13, fr: "Rangement des fichiers", en: "File tidy-up" },
] as const;
export type StepNumber = (typeof JOURNEY_STEPS)[number]["n"];
/**
 * Étapes déjà construites dans le parcours SINA. Les autres sont annoncées au client mais SINA n'y lance rien
 * (aucun outil payant) : elle ne doit jamais partir seule sur une étape que le parcours ne sait pas encore mener.
 */
export const READY_STEPS: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8];
/** à faire · en cours · à valider par le client · validée · sans objet (ex. étape 7 quand le client choisit un de nos thèmes). */
export type StepStatus = "todo" | "doing" | "review" | "done" | "skipped";

/** Champs de la fiche de départ, dans l'ordre où SINA les demande. */
/**
 * Ordre des questions. Ajouts du 6 novembre (validés par le propriétaire) : image voulue (pour 3 identités dans ce que
 * le client veut), organisation (nombre de produits ou façon d'être contacté : thème et bouton principal du site),
 * photos du client (règle : aucune personne créée sans sa photo) et langue du site.
 */
export const START_FIELDS = ["business", "offer", "existing", "keep", "audience", "image", "setup", "market", "price", "difference", "taste", "photos", "language", "contact", "platform"] as const;
export type StartField = (typeof START_FIELDS)[number];
/** Indispensables pour valider l'étape 0 (les autres acceptent « plus tard » ou « rien »). */
export const REQUIRED_FIELDS: StartField[] = ["business", "offer", "audience"];

/** Ce que le client peut garder tel quel (mode refonte) : jamais redessiné ni réécrit ensuite. */
export const KEEPABLE = ["nom", "slogan", "logo", "couleurs", "polices", "textes", "photos", "produits", "prestations", "coordonnees"] as const;
export type Keepable = (typeof KEEPABLE)[number];

export type FieldAnswer = { value: string; status: "answered" | "later" | "none"; source: "client" | "site" | "form" | "photo"; at: number };
export type ImportedSite = {
  url: string; name?: string; tagline?: string; logoSrc?: string; colors?: string[]; fonts?: string[];
  business?: "products" | "services"; products?: number; pages?: number; contact?: Record<string, string>; socials?: Record<string, string>; warnings?: string[];
};
export type Journey = {
  version: 1;
  steps: Record<number, { status: StepStatus; at?: number; note?: string }>;
  start: Partial<Record<StartField, FieldAnswer>>;
  keep: Keepable[];
  mode: "creation" | "refonte";
  imported: ImportedSite[];
  /** Textes exacts gardés en refonte (nom, slogan), repris mot pour mot ensuite. */
  keptValues?: { name?: string; slogan?: string };
  /** Étape 1 : dernière proposition des 3 identités (contrôlée par le Studio) et choix du client. */
  identities?: { list: Identity[]; issues: string[]; comparison: string; at: number; round: number; guidance?: string; corrected?: string[] };
  identityChoice?: { key: "A" | "B" | "C"; mix: Partial<Record<string, "A" | "B" | "C">>; edits?: { name?: string; slogan?: string }; at: number };
  /** Étape 2 : dernière proposition des 3 logos (moteur de logos V2) et logo choisi par le client. */
  logos?: { list: SinaLogo[]; at: number; round: number; notes?: string[] };
  logoChoice?: { source: "A" | "B" | "C"; assetId: string; at: number };
  /** Étape 3 : image de marque complète (déclinaisons, favicons, avatar, planche, charte PDF). */
  brandKit?: BrandKit;
  /** Étape 4 : les 5 angles marketing (recherche web) et l'angle choisi par le client. */
  angles?: SinaAngles;
  /** Angle principal (id) et, dans l'ordre, tous les angles retenus (ids ; le premier est le principal). */
  angleChoice?: { id: string; ids?: string[]; at: number };
  /** Étape 5 : le plan de l'activité tel qu'affiché au client (coordonnées, stratégie, offre, produits). */
  activity?: ActivityPlan;
  /** Étape 6 : thèmes montrés au client (site composé dans chacun) et thème qu'il a choisi. */
  themes?: SinaThemes;
  /** Étape 6 : familles de sections montrées en image (Classique, Moderne) et celle que le client a choisie. */
  families?: { cards: { family: string; style: string; title: string; titleEn: string; pitch: string; pitchEn: string; mood: string; preview: string; demo?: string; sections: number }[]; chosen: string | null };
  /** Étape 6 : le choix DU CLIENT entre un thème du Studio et un thème sur mesure (jamais fait à sa place). */
  siteMode?: { mode: "theme" | "mockup"; at: number };
  themeChoice?: { id: string; jobId: string; at: number };
  /** Thème sur mesure choisi par le client (custom.choose) : l'étape 7 est alors sa mise en boutique, pas encore prête. */
  customChosenAt?: number;
  /**
   * Fil ouvert sur un projet qui existait AVANT lui (créé hors de SINA) : aucun parcours de création, aucun mode chantier
   * (audit du 10 novembre 2026 : un ancien projet repartait aux questions de départ et se verrouillait).
   */
  outside?: boolean;
};

export const emptyJourney = (): Journey => ({
  version: 1,
  steps: Object.fromEntries(JOURNEY_STEPS.map((s) => [s.n, { status: s.n === 0 ? "doing" : "todo" }])) as Journey["steps"],
  start: {}, keep: [], mode: "creation", imported: [],
});

const stateOf = (cid: string) => one<{ state_json: string | null; created_at: number; project_created: number | null }>("SELECT c.state_json, c.created_at, p.created_at AS project_created FROM agent_conversations c LEFT JOIN projects p ON p.id=c.project_id WHERE c.id=?", cid);

/**
 * Un fil de création commence en brouillon, AVANT son projet (créé par SINA pendant l'étape 0). Un fil ouvert plus d'une
 * minute après la création de son projet est celui d'un projet existant : hors parcours.
 */
function outsideJourney(row: { state_json: string | null; created_at: number; project_created: number | null }, st: any): boolean {
  if (st.parcours) return false; // parcours déjà commencé : il continue
  return !!st.horsParcours || (row.project_created != null && row.created_at > row.project_created + 60_000);
}

export function journeyOf(cid: string): Journey {
  const row = stateOf(cid);
  if (!row) throw new HttpError(404, L("Conversation introuvable.", "Conversation not found."));
  const st = json<any>(row.state_json ?? "{}", {});
  if (outsideJourney(row, st)) {
    const j = emptyJourney();
    for (const s of JOURNEY_STEPS) j.steps[s.n] = { status: "skipped" };
    return { ...j, outside: true };
  }
  const j = st.parcours as Journey | undefined;
  if (!j || j.version !== 1) return emptyJourney();
  return { ...emptyJourney(), ...j, steps: { ...emptyJourney().steps, ...j.steps } };
}

/** Mise à jour atomique du parcours (relu, modifié, réécrit dans la même transaction). */
export function updateJourney(cid: string, change: (j: Journey) => void): Journey {
  return tx(() => {
    const row = stateOf(cid);
    if (!row) throw new HttpError(404, L("Conversation introuvable.", "Conversation not found."));
    const st = json<any>(row.state_json ?? "{}", {});
    const j = journeyOf(cid);
    if (j.outside) return j; // projet existant : aucun parcours à écrire
    change(j);
    run("UPDATE agent_conversations SET state_json=?, updated_at=? WHERE id=?", JSON.stringify({ ...st, parcours: j }), now(), cid);
    return j;
  });
}

export function setStep(j: Journey, n: number, status: StepStatus, note?: string) {
  j.steps[n] = { status, at: now(), ...(note ? { note } : {}) };
}

/**
 * L'étape peut-elle être menée par SINA aujourd'hui ? Étape 7 : seulement pour un projet commencé avec les anciennes
 * maquettes ; après un thème sur mesure, c'est sa mise en boutique Shopify, pas encore branchée.
 */
export function stepAvailable(j: Journey, n: number): boolean {
  if (!READY_STEPS.includes(n)) return false;
  if (n === 7 && j.customChosenAt) return false;
  return true;
}

/** Étape en cours : la première qui n'est ni validée ni sans objet. */
export function currentStep(j: Journey): number {
  return JOURNEY_STEPS.find((s) => !["done", "skipped"].includes(j.steps[s.n]?.status ?? "todo"))?.n ?? 13;
}

/** Le champ s'applique-t-il à ce projet ? (« garder » seulement s'il existe déjà quelque chose ; plateforme : boutiques.) */
export function fieldApplies(j: Journey, f: StartField): boolean {
  if (f === "keep") return hasExisting(j);
  if (f === "platform") return j.start.business?.value !== "services";
  return true;
}
export function hasExisting(j: Journey): boolean {
  const e = j.start.existing;
  return j.imported.length > 0 || (!!e && e.status === "answered" && !/^(non|rien|aucun|pas encore|nothing|no|none)\b/i.test(e.value.trim()));
}

/** Champs encore à demander, dans l'ordre. */
export function missingFields(j: Journey): StartField[] {
  return START_FIELDS.filter((f) => fieldApplies(j, f) && !j.start[f]);
}

export const QUESTIONS: Record<StartField, (j: Journey) => { fr: string; en: string }> = {
  business: () => ({ fr: "Tu vends des produits, ou tu proposes des services ?", en: "Do you sell products, or offer services?" }),
  offer: (j) => j.start.business?.value === "services"
    ? { fr: "Présente-moi tes prestations en quelques phrases, avec tes mots.", en: "Describe your services in a few sentences, in your own words." }
    : { fr: "Présente-moi ton produit en quelques phrases, et joins des photos si tu en as (le vrai produit, sous plusieurs angles).", en: "Describe your product in a few sentences and attach photos if you have any." },
  existing: () => ({ fr: "As-tu déjà quelque chose : un nom, un logo, des couleurs, un site ou des réseaux sociaux ? Si tu as un lien, donne-le-moi : je le lis pour gagner du temps.", en: "Do you already have a name, a logo, colours, a website or social accounts? Share a link and I'll read it." }),
  keep: () => ({ fr: "Qu'est-ce que tu veux garder tel quel (logo, nom, slogan, couleurs, polices, textes, photos…) ? Tout le reste, je le recrée.", en: "What do you want to keep as is (logo, name, tagline, colours, fonts, texts, photos…)? I'll recreate everything else." }),
  audience: () => ({ fr: "À qui t'adresses-tu ? Décris ton client idéal : âge, situation, ce qu'il cherche.", en: "Who is it for? Describe your ideal customer: age, situation, what they're looking for." }),
  market: (j) => j.start.business?.value === "services"
    ? { fr: "Où interviens-tu : adresse ou zone (ville, rayon) ? Chez le client, chez toi, ou en ligne ?", en: "Where do you work: address or area? At the client's, at your place, or online?" }
    : { fr: "Où vends-tu : seulement en ligne, ou aussi en boutique ou sur des marchés ? Dans quels pays livres-tu ?", en: "Where do you sell: online only, or also in a shop or at markets? Which countries do you ship to?" },
  price: (j) => j.start.business?.value === "services"
    ? { fr: "Quels sont tes tarifs et durées, même approximatifs ?", en: "What are your prices and durations, even roughly?" }
    : { fr: "Quel prix de vente prévois-tu (ou une fourchette) ? Y a-t-il des variantes (tailles, couleurs…) ?", en: "What selling price do you plan (or a range)? Any variants (sizes, colours…)?" },
  difference: () => ({ fr: "Qu'est-ce qui te rend différent, avec tes mots ?", en: "What makes you different, in your own words?" }),
  image: () => ({ fr: "Donne-moi 3 mots pour l'image que tu veux donner (par exemple chaleureux, haut de gamme, fun), et les couleurs que tu ne veux surtout pas.", en: "Give me 3 words for the image you want to convey (e.g. warm, premium, fun), and any colours you don't want." }),
  setup: (j) => j.start.business?.value === "services"
    ? { fr: "Comment tes clients doivent-ils te contacter : réservation en ligne, demande de devis, appel, ou formulaire de contact ?", en: "How should clients reach you: online booking, quote request, phone call, or contact form?" }
    : { fr: "Combien de produits vas-tu vendre au lancement ?", en: "How many products will you sell at launch?" },
  photos: () => ({ fr: "As-tu tes propres photos (ton produit, toi au travail, ton lieu, tes réalisations) ? Si oui, envoie-les-moi ; sinon, dis-le simplement.", en: "Do you have your own photos (product, you at work, your place, your work)? If so, send them; otherwise just say so." }),
  language: () => ({ fr: "Ton site doit-il être en français seulement, ou aussi en anglais ?", en: "Should your site be in French only, or in English too?" }),
  taste: () => ({ fr: "Quels sites, marques ou styles aimes-tu ? Et ce que tu n'aimes pas ? Des liens ou des captures sont les bienvenus.", en: "Which websites, brands or styles do you like? And dislike? Links or screenshots welcome." }),
  contact: () => ({ fr: "Tes coordonnées pour le site : nom de l'entreprise, e-mail, téléphone, adresse (et SIRET si tu l'as). Tu peux en donner une partie maintenant et le reste plus tard.", en: "Your contact details for the site: company name, email, phone, address (and company number). Some now, the rest later is fine." }),
  platform: () => ({ fr: "Sur quelle plateforme vendras-tu : Shopify, WooCommerce, PrestaShop, ou tu ne sais pas encore ?", en: "Which platform will you sell on: Shopify, WooCommerce, PrestaShop, or not sure yet?" }),
};

export const FIELD_LABEL: Record<StartField, { fr: string; en: string }> = {
  business: { fr: "Activité", en: "Business" }, offer: { fr: "Offre", en: "Offer" }, existing: { fr: "Existant", en: "Existing" },
  keep: { fr: "À garder", en: "To keep" }, audience: { fr: "Client idéal", en: "Ideal customer" }, market: { fr: "Où", en: "Where" },
  price: { fr: "Prix", en: "Price" }, difference: { fr: "Différence", en: "Difference" }, taste: { fr: "Goûts", en: "Taste" },
  contact: { fr: "Coordonnées", en: "Contact" }, platform: { fr: "Plateforme", en: "Platform" },
  image: { fr: "Image voulue", en: "Desired image" }, setup: { fr: "Organisation", en: "Set-up" },
  photos: { fr: "Tes photos", en: "Your photos" }, language: { fr: "Langue du site", en: "Site language" },
};

/** Texte relu par SINA à chaque pas : où en est le parcours et que faire maintenant. */
export function journeyContext(j: Journey): string {
  const cur = currentStep(j);
  const steps = JOURNEY_STEPS.map((s) => `${s.n}. ${s.fr} = ${j.steps[s.n]?.status ?? "todo"}`).join(" ; ");
  if (j.outside) return "Projet existant (créé avant ce fil) : il n'y a PAS de parcours de création. Ne pose pas les questions de départ et ne lance aucune étape du parcours : aide le client sur ce qu'il demande, avec les outils du catalogue.";
  const lines = [`Parcours de création (étapes 0 à 13) : ${steps}. Étape en cours : ${cur}.`];
  if (cur === 7 && j.customChosenAt) {
    lines.push("Étape 7 (mise en boutique du thème sur mesure) : pas encore disponible. Son thème sur mesure est choisi et en place dans l'onglet Boutique : dis-le simplement s'il demande la suite (la mise en boutique arrive très bientôt), et continue de faire les changements qu'il demande sur son thème (consigne de l'étape 6, points 4 et 5). N'utilise AUCUN outil des anciennes maquettes (mockup.*, site.code_from_mockup, site.images).");
    if (STEP_GUIDES[6]) lines.push(STEP_GUIDES[6]);
    return lines.join("\n");
  }
  if (!READY_STEPS.includes(cur)) {
    const s = JOURNEY_STEPS.find((x) => x.n === cur)!;
    lines.push(`L'étape ${cur} (« ${s.fr} ») n'est pas encore disponible dans le parcours. Dis-le simplement au client (la suite arrive très bientôt), réponds à ses questions, mais n'utilise AUCUN outil payant et ne lance aucune autre étape (ni recherche, ni angles, ni marque, ni site).`);
  }
  if (cur === 0) {
    const filled = START_FIELDS.filter((f) => j.start[f]).map((f) => `${f} = ${j.start[f]!.status === "answered" ? `« ${j.start[f]!.value.slice(0, 400)} »` : j.start[f]!.status} (${j.start[f]!.source})`);
    const missing = missingFields(j);
    lines.push(`Fiche de départ — déjà connu : ${filled.join(" ; ") || "rien"}.`);
    lines.push(`Mode : ${j.mode}${j.keep.length ? ` ; à garder tel quel : ${j.keep.join(", ")}` : ""}.`);
    if (j.imported.length) lines.push(`Existant lu : ${j.imported.map((s) => `${s.url} (nom « ${s.name ?? "?"} », slogan « ${s.tagline ?? "?"} », logo ${s.logoSrc ? "trouvé" : "non trouvé"}, couleurs ${s.colors?.join(" ") ?? "?"}, polices ${s.fonts?.join(", ") ?? "?"}${s.warnings?.length ? `, limites : ${s.warnings.slice(0, 3).join(" / ")}` : ""})`).join(" ; ")}.`);
    lines.push(missing.length
      ? `Prochaine question à poser (UNE seule, avec tes mots, en reprenant ce que le client a déjà dit) : ${missing[0]} — « ${QUESTIONS[missing[0]](j).fr} ». Restent ensuite : ${missing.slice(1).join(", ") || "rien"}.`
      : "Toutes les questions ont une réponse : fais le RÉSUMÉ (« Voici ce que j'ai compris ») et demande au client de confirmer ou corriger ; à sa confirmation, appelle start.confirm.");
  }
  if (cur === 1) lines.push(...identityStepContext(j));
  if (cur === 2) lines.push(...logoStepContext(j));
  if (cur === 3) lines.push(...brandKitStepContext(j));
  if (cur === 4) lines.push(...anglesStepContext(j));
  if (cur === 5) lines.push(...activityStepContext(j));
  if (cur === 6) lines.push(...themeStepContext(j));
  // Étape 6 : la consigne du thème sur mesure ne vaut qu'après le choix « thème sur mesure » du client.
  if (READY_STEPS.includes(cur) && STEP_GUIDES[cur] && !(cur === 6 && j.siteMode?.mode !== "mockup")) lines.push(STEP_GUIDES[cur]);
  return lines.join("\n");
}

/** Consignes détaillées des étapes ouvertes (READY_STEPS), relues par SINA à chaque pas de l'étape en cours. */
export const STEP_GUIDES: Partial<Record<number, string>> = {
  6: "Étape 6, THÈME SUR MESURE (décision du propriétaire du 9 novembre 2026 : on ne dit PLUS JAMAIS « maquette » au client, on dit « thème sur mesure ») : 1) FAMILLE : c'est SON SEUL choix (décision du propriétaire du 9 novembre 2026) : montre-lui TOUJOURS les deux familles EN IMAGE avant de lui poser la question, même s'il revient sur son choix (theme.families : aperçu de chaque famille, Classique et Moderne, avec leurs exemples à ouvrir en vrai), recommande d'après son produit et sa marque sans choisir à sa place, enregistre SA famille (theme.family) ; jamais de mélange de familles, jamais de question de « style ». 2) CONCEPTION DE A À Z (payante : le Studio montre le devis au client sur une carte d'accord et ne lance qu'après son accord) : AUCUN thème de départ (les thèmes construits sont pour la voie « thème du Studio ») : AVANT, demande-lui en une question à choix l'AMBIANCE de son site (plutôt clair, plutôt sombre, ou qui alterne : c'est lui qui décide) ; puis custom.design (avec son ambiance) conçoit tout le site comme un directeur de création (parcours du visiteur de SA marque sur chaque page, ses objections et ses émotions, la section qui répond à chaque moment, pages riches) ; passe-lui les mots du client (consigne). Tu ne choisis jamais toi-même les sections une à une pour monter un site (custom.compose : seulement une composition dictée par le client). Montre ensuite au client l'idée du site et, page par page, le parcours et pourquoi chaque section est là. Règles contrôlées : choisir pour CHAQUE page les MEILLEURES sections pour SON produit ou SON service (jamais une section pour prendre une section ; jamais une section « seulementPour » un autre genre de produit, ex. tailles, tenues et looks pour de la confiture), l'accueil a AU MOINS 8 sections et la fiche produit AU MOINS 7 (hors en-tête et pied de page), puis custom.compose avec TOUTES les pages obligatoires (produits : accueil, boutique si plusieurs produits, fiche produit, panier, compte, à propos, contact, aide, légal, 404 ; JAMAIS de page commande ni de commande confirmée pour Shopify : le bouton du panier mène au paiement de Shopify, qui tient aussi la confirmation ; services : accueil, prestations, rendez-vous ou devis, à propos, contact, aide, légal, 404) ; le thème s'affiche dans le fil et dans la Boutique. 2bis) IMAGES : appelle custom.images et demande-lui, en une question à choix, s'il monte son site avec SES images ou si tu les crées ; s'il prend les siennes, dis-lui le nombre EXACT d'images à envoyer (par page) avec le trombone ; s'il en a moins, propose de créer celles qui manquent ou de toutes les créer (jamais à sa place). 3) À SA MARQUE : appelle custom.build (avec images et clientAssets selon sa réponse) : le Studio lui montre le devis (coût probable et plafond, en % de son budget) sur une carte d'accord et ne lance qu'après son accord ; custom.build met le thème monté à sa marque (règles du montage : une seule section de cartes par page, « Produit vedette » en haut de la fiche produit ou une fois sur l'accueil, ouverture de l'accueil = grande photo pleine avec le titre dessus, jamais la même section deux fois de suite), avec TOUS ses textes (ses faits seulement, jamais ceux d'un modèle, « [À compléter : …] » pour un fait inconnu) et TOUTES ses photos (vraies photos de ses produits, sinon photos créées dans la direction artistique de sa famille ; personnes seulement si autorisées). Tâche de fond : attends-la, lis son rapport et dis honnêtement ce qui manque. 4) BOUTIQUE : le thème est alors EN PLACE dans l'onglet Boutique : dis-lui de l'ouvrir, de le regarder en grand (ordinateur, téléphone) et d'utiliser « Désigner un élément » pour demander un changement. 5) CHANGEMENTS : un message qui commence par « [Élément désigné · section sXXXXXXXX … » vient de la Boutique : lis CETTE section (custom.section), change SEULEMENT cet élément (custom.edit : edits pour un texte ou une partie, image pour une photo de ses Fichiers, hide pour retirer l'élément, css avec :scope pour couleurs, tailles, espacements, disposition), puis dis en une phrase ce qui a changé. Avant de changer une couleur de texte, vérifie qu'il reste LISIBLE sur son fond (essai réel du 9 novembre : titre mis en vert foncé, illisible sur la photo sombre de l'ouverture) : sinon, dis-le en une phrase et propose une teinte lisible de sa palette avant de l'appliquer ; ne donne jamais de code couleur au client, nomme la couleur. Une demande sur toute une section se fait aussi avec custom.edit ; changer de section, en ajouter, retirer ou déplacer : custom.structure. « Annule » : custom.undo. Une nouvelle photo : custom.photo (payante : carte d'accord avec le prix). Ne remplace JAMAIS un fait du client par une affirmation qu'il n'a pas donnée (essai réel du 9 novembre : « Tout est bio » remplacé par « Sans arôme ajouté », inventé). 6) CHOIX : il choisit son thème (custom.choose), jamais à sa place. AVANT la fiche produit : demande au client ses offres (lots ou « 2 achetés, 1 offert », abonnement, lot à compléter, cadeaux par paliers, promotion avec sa date de fin), enregistre SEULEMENT ce qu'il donne (shop.offers, jamais inventé) : la section « Produit vedette » (une seule, en haut de la fiche) s'adapte d'elle-même au produit. Les anciennes maquettes (mockup.*) ne servent plus qu'aux projets déjà commencés avec elles.",
  7: "Étape 7 (site codé d'après une ANCIENNE maquette, projets commencés avec elles seulement) : appelle site.code_from_mockup (pour une partie des pages, avec pages) : le Studio montre le devis au client sur une carte d'accord ; les captures du site codé te sont jointes à côté de la maquette : compare-les vraiment (couleurs, logo, sections présentes ou absentes, textes, photos) ; à la fin, lis mockup.report et dis honnêtement, page par page, ce qui est conforme et ce qui ne l'est pas (les pages « dérivées » n'avaient pas d'image de maquette : elles sont codées dans son style). Puis propose site.images (consigne du propriétaire : toutes les photos du site recréées en haute définition par l'IA d'images des maquettes, à l'identique de la maquette) : la carte d'accord montre son prix. Le site codé est une version inactive : le client décide de l'appliquer (site.use_version).",
  8: "Étape 8 (un de nos thèmes, monté à sa marque ; consigne du propriétaire du 9 novembre 2026) : le client a choisi un thème du Studio (theme.choose) ; attends la fin de la composition (tâche de fond), puis : 1) IMAGES : theme.images (gratuit) et demande-lui, en une question à choix, s'il monte son site avec SES images ou si tu les crées ; s'il prend les siennes, dis-lui le nombre EXACT d'images à envoyer avec le trombone ; s'il en a moins, propose de créer celles qui manquent ou toutes (jamais à sa place). 2) MONTAGE À SA MARQUE : appelle theme.brand (avec ses choix d'images) : le Studio lui montre le devis (coût probable et plafond, en % de son budget) sur une carte d'accord et ne lance qu'après son accord ; theme.brand réécrit TOUS les textes de sa boutique avec du vrai copywriting : l'angle marketing qu'il a choisi et son émotion dans chaque texte (situation vécue, désir, soulagement), ses faits comme seules preuves, rien d'inventé ; puis pose ses images et crée celles qui manquent. Tâche de fond : attends-la, lis son rapport, dis honnêtement ce qui reste (textes à revoir, images non créées). 3) BOUTIQUE : son site est alors EN PLACE dans l'onglet Boutique : dis-lui de l'ouvrir, de le regarder en grand et de désigner un élément pour demander un changement ; fais ses changements un par un, et vérifie qu'un texte reste lisible sur son fond. 4) VALIDATION : quand il dit que son site lui plaît, theme.validate (jamais à sa place).",
  11: "Étape 11 (calendrier de publication, MANUEL pour l'instant : le client publie lui-même, la publication automatique viendra après les accords des plateformes) : demande d'abord au client, UNE question à la fois et seulement si l'information manque : sur combien de jours (7, 15 ou 30), combien de publications par jour, à quelles heures, sur quels réseaux, avec ou sans émojis, avec ou sans les publicités. Puis appelle calendar.plan ; montre-lui le calendrier (calendar.read) jour par jour et dis-lui qu'il peut l'ajouter à son agenda (fichier .ics) et cocher chaque publication une fois postée (calendar.mark_done). S'il manque des publications pour remplir les jours, dis-le simplement et propose d'en créer (payant, devis d'abord).",
};

/** Étape 2 : que faire selon l'état des logos (contexte relu par SINA). */
export function logoStepContext(j: Journey): string[] {
  const lg = j.logos;
  if (!lg?.list.length) return ["Étape 2 (3 logos) : rien n'est encore dessiné. Si le client est prêt, appelle logo.propose : 3 logos libres (carte blanche au dessinateur) pour SON identité ; le Studio lui montre le devis sur une carte d'accord et ne lance qu'après son accord. Le dessin prend quelques minutes."];
  const lines = [`Étape 2 — proposition n° ${lg.round} (les logos sont affichés au client dans le fil) : ${lg.list.map((x) => `${x.source} « ${x.name} » (${x.style}) : ${x.verdict === "FINAL" ? `validé par le contrôle, ${x.score ?? "?"}/10` : x.verdict === "PROVISIONAL" ? "version du studio" : x.assetId ? `NON validé par le contrôle (${x.reason})` : `pas de dessin (${x.reason})`}`).join(" ; ")}.`,
    "Présente-les en 2 ou 3 phrases (honnêtement : un logo non validé est dit non validé ; tu VOIS les 3 logos (images jointes à ta réponse) : décris chacun en une phrase d'après ce que tu vois vraiment, sans rien inventer, et dis honnêtement si l'un a un défaut visible), puis demande lequel il choisit (logo.choose). Il peut demander une nouvelle proposition avec ses mots (logo.propose avec guidance, payant). Ne choisis jamais à sa place."];
  return lines;
}

/** Étape 5 : l'activité complète (gratuite). */
export function activityStepContext(j: Journey): string[] {
  const a = j.activity;
  const base = "Étape 5 (activité complète, GRATUITE) : on réunit tout ce que le site va dire. 1) appelle activity.plan : il AFFICHE la carte « Ton activité » et renvoie ce qui manque ; 2) pose les questions manquantes UNE par UNE, y compris les facultatives (téléphone, SIRET), une fois chacune ; « Plus tard » se propose SEULEMENT pour le téléphone et le SIRET, JAMAIS pour le nom, l'e-mail, l'adresse, la livraison ou les retours (obligatoires pour le site) (coordonnées : activity.company avec ses mots ; « plus tard » → activity.company later ; « je n'en veux pas sur le site » (pas de téléphone…) → activity.company none, jamais later) ; 3) PRODUITS : s'il n'y en a aucun dans l'onglet Produits, propose la liste tirée de SA fiche (un produit par parfum, modèle ou formule, et les coffrets ou lots qu'il a cités) avec SES prix, sans en inventer aucun ; demande son accord, puis crée chaque produit avec catalogue.create (titre, prix confirmé, description courte avec les faits du client, ses mots : ingrédients, poids ou contenance qu'il a cités dans sa fiche de départ, composition ; rien d'autre) ; un prix manquant se demande, jamais il ne se devine ; 4) rappelle activity.plan pour mettre la carte à jour ; 5) quand rien ne manque, demande s'il valide (activity.validate).";
  // Réponses de l'étape 0 : déjà données par le client, jamais redemandées (audit du 10 novembre 2026).
  const said = (["contact", "market", "price", "offer"] as StartField[]).filter((f) => j.start[f]?.status === "answered").map((f) => `${FIELD_LABEL[f].fr} : « ${j.start[f]!.value.slice(0, 600)} »`);
  const known = said.length ? [`Déjà dit par le client à l'étape 0 (NE LE REDEMANDE PAS : enregistre ce qui s'y trouve avec activity.company ou catalogue.create, puis ne pose que ce qui manque vraiment) : ${said.join(" ; ")}.`] : [];
  const services = "Entreprise de SERVICES : pas de produits ni de livraison ni de retours ; ses PRESTATIONS (nom, prix et durée s'il les donne) s'enregistrent avec services.profile, jamais inventées.";
  if (!a) return [base, ...known];
  const euros = (n: number) => `${n.toFixed(2).replace(".", ",").replace(/,00$/, "")} €`;
  const offer = a.services
    ? `${a.services.length} prestation(s)${a.services.length ? ` (${a.services.map((x) => `${x.name}${x.price ? ` ${x.price}` : " sans prix"}`).join(", ")})` : ""}`
    : `${a.products.length} produit(s) dans l'onglet Produits${a.products.length ? ` (${a.products.map((x) => `${x.title} ${x.price == null ? "sans prix" : euros(x.price)}`).join(", ")})` : ""}`;
  return [base, ...(a.services ? [services] : []), ...known, `État : ${offer} ; coordonnées manquantes : ${a.missing.map((m) => `${m.key}${m.required ? "" : " (facultative, à poser aussi)"}`).join(", ") || "aucune"} ; angle principal : ${a.angle?.title ?? "aucun"}.`];
}

/** Étape 6 : un de nos thèmes ou des maquettes sur mesure. */
export function themeStepContext(j: Journey): string[] {
  const t = j.themes;
  if (j.siteMode?.mode === "mockup") return ["Étape 6 — le client a choisi un THÈME SUR MESURE (site.mode). Suis la consigne du thème sur mesure ci-dessous ; s'il revient à un thème du Studio, site.mode theme puis theme.propose et theme.choose."];
  // Consigne du propriétaire (7 novembre) : les cartes des thèmes d'abord ; une fois qu'il les a vues, le client choisit
  // un thème du Studio ou un thème sur mesure — lui, jamais SINA.
  const base = "Étape 6 (thème du Studio ou thème sur mesure), ordre voulu par le propriétaire (9 novembre 2026) : 1) demande D'ABORD au client, dans une question à deux choix (« Un thème du Studio » / « Un thème sur mesure »), en une phrase chacun : un thème du Studio = il choisit parmi TOUS nos thèmes, puis je monte son site dedans avec ses textes et ses images ; un thème sur mesure = il choisit sa famille (Classique ou Moderne), puis je conçois son site de A à Z avec les meilleures sections pour son produit ou son service, avec ses textes et ses images. Ne choisis jamais à sa place et ne pousse ni l'un ni l'autre. 2) Thème du Studio → site.mode mode theme, puis theme.propose (il AFFICHE TOUS nos thèmes TELS QU'ILS SONT, avec leur démonstration complète ; ne recopie pas les cartes ; ce ne sont PAS son site : ne dis jamais « ton site composé dans chacun »), il choisit sa carte → theme.choose avec son identifiant (un thème non inclus dans son forfait : dis-le, ne le choisis pas). 3) Thème sur mesure → site.mode mode mockup, puis suis la consigne du thème sur mesure (la famille d'abord). Ensuite, dans les deux cas, le thème est en place dans l'onglet Boutique : le client y demande ses changements et désigne les éléments.";
  if (!t?.list.length) return [base];
  return [base, `Thèmes affichés : ${t.list.map((x) => `${x.id} « ${x.name} »${x.recommended ? " (recommandé)" : ""}${x.allowed ? "" : " (non inclus dans son forfait)"}`).join(" ; ")}.`];
}

/** Étape 4 : les 5 angles marketing. */
export function anglesStepContext(j: Journey): string[] {
  const a = j.angles;
  if (!a?.list.length) return ["Étape 4 (5 angles marketing) : explique en une ou deux phrases ce qu'est un angle (la façon de parler de la marque : à qui, quelle émotion, quelle promesse) et que TU vas chercher sur le web (dis « je vais chercher », jamais « SINA va ») ce que vivent ses clients et ses concurrents (places de marché exclues) pour proposer 5 angles avec leurs sources. C'est PAYANT : appelle angles.propose ; le Studio montre le devis au client sur une carte d'accord et ne lance qu'après son accord. Rappelle angles.propose après chaque tâche terminée (analyse de la fiche, puis recherche) : c'est LUI qui range les 5 angles et les AFFICHE en cartes au client (sources comprises) ; n'utilise jamais research.read ni strategy.read à cette étape (lecture tronquée, aucune carte). S'il renvoie des questions, pose-les au client UNE par UNE, enregistre ses réponses avec pilot.answer, puis rappelle angles.propose."];
  return [
    `Étape 4 — 5 angles prêts (affichés au client dans le fil, ${a.sourceCount} sources lues) : ${a.list.map((x) => `${x.id} « ${x.title} » (émotion : ${x.emotion || "?"} ; à confirmer : ${x.proofsToConfirm.join(", ") || "rien"})`).join(" ; ")}. Recommandé : ${a.recommendedId ?? "aucun"}.`,
    "Présente-les en 3 phrases courtes au plus (sans recopier les cartes), dis lequel est recommandé et pourquoi en une phrase, rappelle que les « informations à confirmer » (mots exacts des cartes) ne seront jamais écrites sans son accord, puis demande lequel ou lesquels il choisit : il peut en prendre PLUSIEURS (le premier = l'angle principal du site, les autres pour les publications et publicités ; son forfait en permet un nombre limité) → angles.choose {angleIds}. Ne choisis jamais à sa place. S'il veut une NOUVELLE proposition d'angles, appelle angles.propose {redo: sa demande avec ses mots} (payant : devis annoncé).",
  ];
}

/** Étape 3 : image de marque complète (gratuite, rendue par le Studio). */
export function brandKitStepContext(j: Journey): string[] {
  const k = j.brandKit;
  if (!k) return ["Étape 3 (image de marque complète) : rien n'est encore préparé. Annonce en une phrase ce que contient l'image de marque (déclinaisons du logo, favicon, avatar des réseaux, planche de marque, charte PDF), que c'est GRATUIT (aucune IA, rendu par le Studio), puis appelle brand.kit."];
  return [
    `Étape 3 — image de marque prête (affichée au client dans le fil) : ${k.items.map((x) => x.label).join(", ")} ; planche de marque ${k.boardId ? "oui" : "non"} ; charte PDF ${k.bookId ? `oui (${k.pageIds.length} pages)` : "non"}.`,
    ...(k.notes.length ? [`À dire honnêtement au client : ${k.notes.join(" ; ")}`] : []),
    "Présente-la en 2 ou 3 phrases simples, puis demande s'il la valide. À sa validation (« oui », « je valide »…), appelle brand.kit_validate. S'il veut changer le logo lui-même, rappelle que c'est l'étape 2 (logo.choose ou une nouvelle proposition, payante) ; s'il veut changer une couleur ou une police, dis-lui que c'est noté et que ce réglage arrive plus tard dans le parcours, sans rien inventer.",
  ];
}

/** Étape 1 : que faire selon l'état des propositions. */
function identityStepContext(j: Journey): string[] {
  const id = j.identities;
  if (!id?.list.length) return [
    "Étape 1 (3 identités de marque) : rien n'est encore proposé. Si le client est prêt (il dit oui, on continue, vas-y…), appelle identity.propose (sans guidance) en annonçant que la création prend environ une minute. S'il pose une question, réponds-y d'abord. N'invente aucune identité toi-même : seul identity.propose les crée.",
  ];
  const out = [
    `Étape 1 — proposition n° ${id.round} (les cartes complètes sont affichées au client dans le fil) : ${id.list.map((x) => `${x.key} « ${x.name} » (slogan « ${x.slogan} », territoire ${x.territory}, fond ${x.ground})`).join(" ; ")}.`,
    "Présente-les en 3 lignes courtes au plus (la différence de chacune), sans recopier les cartes, puis demande laquelle il préfère. Il peut : en choisir une ; MÉLANGER (ex. le nom de A avec les couleurs de C → identity.choose key « A », mix {palette: « C »}) ; retoucher le nom ou le slogan avec ses mots (identity.choose name / slogan) ; ou demander une nouvelle proposition (identity.propose avec guidance = ses mots, et redo = les identités à refaire s'il en garde certaines). Ne choisis jamais à sa place ; en cas de doute sur son choix, pose UNE question.",
  ];
  if (id.issues.length) out.push(`Points que le contrôle du Studio n'a pas pu valider (dis-les honnêtement au client, en mots simples) : ${id.issues.join(" ; ")}.`);
  return out;
}
