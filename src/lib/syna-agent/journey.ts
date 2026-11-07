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

export const JOURNEY_STEPS = [
  { n: 0, fr: "Questions de départ", en: "Getting started" },
  { n: 1, fr: "3 identités de marque", en: "3 brand identities" },
  { n: 2, fr: "3 logos", en: "3 logos" },
  { n: 3, fr: "Image de marque complète", en: "Full brand kit" },
  { n: 4, fr: "5 angles marketing", en: "5 marketing angles" },
  { n: 5, fr: "L'activité complète", en: "The full business" },
  { n: 6, fr: "Thème ou maquettes", en: "Theme or mockups" },
  { n: 7, fr: "Site codé d'après la maquette", en: "Site coded from the mockup" },
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
export const READY_STEPS: number[] = [0, 1];
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
  identityChoice?: { key: "A" | "B" | "C"; mix: Partial<Record<string, "A" | "B" | "C">>; at: number };
};

export const emptyJourney = (): Journey => ({
  version: 1,
  steps: Object.fromEntries(JOURNEY_STEPS.map((s) => [s.n, { status: s.n === 0 ? "doing" : "todo" }])) as Journey["steps"],
  start: {}, keep: [], mode: "creation", imported: [],
});

const stateOf = (cid: string) => one<{ state_json: string | null }>("SELECT state_json FROM agent_conversations WHERE id=?", cid);

export function journeyOf(cid: string): Journey {
  const row = stateOf(cid);
  if (!row) throw new HttpError(404, L("Conversation introuvable.", "Conversation not found."));
  const st = json<any>(row.state_json ?? "{}", {});
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
    change(j);
    run("UPDATE agent_conversations SET state_json=?, updated_at=? WHERE id=?", JSON.stringify({ ...st, parcours: j }), now(), cid);
    return j;
  });
}

export function setStep(j: Journey, n: number, status: StepStatus, note?: string) {
  j.steps[n] = { status, at: now(), ...(note ? { note } : {}) };
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
  const lines = [`Parcours de création (étapes 0 à 13) : ${steps}. Étape en cours : ${cur}.`];
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
  if (READY_STEPS.includes(cur) && STEP_GUIDES[cur]) lines.push(STEP_GUIDES[cur]);
  return lines.join("\n");
}

/**
 * Consignes des étapes préparées dans le code mais pas encore ouvertes (READY_STEPS) : elles s'appliquent dès que
 * l'étape est ouverte, après ses essais réels.
 */
export const STEP_GUIDES: Partial<Record<number, string>> = {
  6: "Étape 6 (thème ou maquettes) : demande au client s'il préfère un de nos thèmes (étape 8) ou des maquettes sur mesure. Pour des maquettes : mockup.pages (liste exacte des pages, ordinateur et téléphone), puis mockup.prepare avec 1 à 3 directions graphiques vraiment différentes (gratuit) ; annonce le coût des images (coutMaxMicro, en % du budget) et attends son accord écrit avant mockup.generate ; une image ratée est dite ratée. Le client peut aussi fournir ses propres images (mockup.attach). Il choisit une maquette COMPLÈTE (mockup.choose), jamais à sa place.",
  7: "Étape 7 (site codé d'après la maquette) : annonce le devis de site.code_from_mockup et attends l'accord du client ; à la fin, lis mockup.report et dis honnêtement, page par page, ce qui est conforme et ce qui ne l'est pas. Le site codé est une version inactive : le client décide de l'appliquer (site.use_version).",
  11: "Étape 11 (calendrier de publication, MANUEL pour l'instant : le client publie lui-même, la publication automatique viendra après les accords des plateformes) : demande d'abord au client, UNE question à la fois et seulement si l'information manque : sur combien de jours (7, 15 ou 30), combien de publications par jour, à quelles heures, sur quels réseaux, avec ou sans émojis, avec ou sans les publicités. Puis appelle calendar.plan ; montre-lui le calendrier (calendar.read) jour par jour et dis-lui qu'il peut l'ajouter à son agenda (fichier .ics) et cocher chaque publication une fois postée (calendar.mark_done). S'il manque des publications pour remplir les jours, dis-le simplement et propose d'en créer (payant, devis d'abord).",
};

/** Étape 1 : que faire selon l'état des propositions. */
function identityStepContext(j: Journey): string[] {
  const id = j.identities;
  if (!id?.list.length) return [
    "Étape 1 (3 identités de marque) : rien n'est encore proposé. Si le client est prêt (il dit oui, on continue, vas-y…), appelle identity.propose (sans guidance) en annonçant que la création prend environ une minute. S'il pose une question, réponds-y d'abord. N'invente aucune identité toi-même : seul identity.propose les crée.",
  ];
  const out = [
    `Étape 1 — proposition n° ${id.round} (les cartes complètes sont affichées au client dans le fil) : ${id.list.map((x) => `${x.key} « ${x.name} » (slogan « ${x.slogan} », territoire ${x.territory}, fond ${x.ground}, logo ${x.logoStyle})`).join(" ; ")}.`,
    "Présente-les en 3 lignes courtes au plus (la différence de chacune), sans recopier les cartes, puis demande laquelle il préfère. Il peut : en choisir une ; MÉLANGER (ex. le nom de A avec les couleurs de C → identity.choose key « A », mix {palette: « C »}) ; retoucher le nom ou le slogan avec ses mots (identity.choose name / slogan) ; ou demander une nouvelle proposition (identity.propose avec guidance = ses mots, et redo = les identités à refaire s'il en garde certaines). Ne choisis jamais à sa place ; en cas de doute sur son choix, pose UNE question.",
  ];
  if (id.issues.length) out.push(`Points que le contrôle du Studio n'a pas pu valider (dis-les honnêtement au client, en mots simples) : ${id.issues.join(" ; ")}.`);
  return out;
}
