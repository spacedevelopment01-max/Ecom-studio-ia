/**
 * Parcours de création d'un projet par SINA. Le client voit NEUF étapes (PHASES : faire connaissance, la marque, les
 * angles, l'activité, le site, la mise en ligne, la communication, la publicité, dans la durée). Le Studio garde pour
 * l'instant ses repères internes (JOURNEY_STEPS, 0 à 13), suivis par fil : l'état vit dans
 * `agent_conversations.state_json.parcours`, donc il existe dès le brouillon (avant la création du projet).
 *
 * Faire connaissance (repère 0) : SINA mène la conversation elle-même. Elle choisit ses questions, une à la fois,
 * selon le métier et ce que le client vient de dire ; elle n'enregistre que ce qu'il a dit ; ce qu'elle peut trouver
 * seule (son site), elle le lit. La fiche (START_FIELDS) dit les sujets à avoir abordés avant le résumé ; tout autre
 * fait utile va dans les notes libres.
 */
import { QUESTION_DES_PREUVES } from "./custom-theme/preuves";
import { QUESTION_DES_PHOTOS } from "./custom-theme/photos-produits";
import { HttpError } from "../auth";
import { json, now, one, run, tx } from "../db";
import { L } from "../i18n-server";
import { getJsonSetting } from "../settings";
import { domainLine } from "./brand-domains";
import type { Board } from "./brand-board";
import type { Identity } from "./identities";
import type { SinaPosts } from "./posts-plan";
import type { SinaLogo } from "./logos";
import type { BrandKit } from "./brand-kit";
import type { SinaAngles } from "./angles";
import { ANGLE_ROLE_LABEL, roleOf, shownAngles } from "./angle-roles";
import type { ActivityPlan } from "./activity";
import type { SinaThemes } from "./themes";

export const JOURNEY_STEPS = [
  { n: 0, fr: "Questions de départ", en: "Getting started" },
  // Depuis le 12 novembre 2026 : 2, 3 ou 4 identités selon le forfait, puis UN logo pour l'identité choisie.
  { n: 1, fr: "Identités de marque", en: "Brand identities" },
  { n: 2, fr: "Logo", en: "Logo" },
  { n: 3, fr: "Image de marque complète", en: "Full brand kit" },
  { n: 4, fr: "3 angles marketing", en: "3 marketing angles" },
  { n: 5, fr: "L'activité complète", en: "The full business" },
  { n: 6, fr: "Le site, créé pour la marque", en: "The site, built for the brand" },
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
/**
 * Étapes construites et testées avec une IA simulée, mais pas encore validées par un essai réel du propriétaire (son
 * parcours : « chaque étape essayée en réel et validée avant la suivante ») : fermées par défaut. Il les ouvre une à
 * une avec le réglage « sina.etapes_ouvertes » (liste de numéros, ex. [9]).
 */
export const BUILT_STEPS: number[] = [9, 10, 11, 12, 13];
/** L'étape est-elle ouverte dans le parcours ? (Construite depuis longtemps, ou ouverte par le propriétaire.) */
export function stepReady(n: number): boolean {
  if (READY_STEPS.includes(n)) return true;
  if (!BUILT_STEPS.includes(n)) return false;
  const open = getJsonSetting<unknown>("sina.etapes_ouvertes", []);
  return Array.isArray(open) && open.includes(n);
}
/** Les neuf étapes que le client voit, et les repères internes que chacune couvre. */
export const PHASES = [
  { n: 1, fr: "Faire connaissance", en: "Getting to know you", steps: [0] },
  { n: 2, fr: "La marque", en: "The brand", steps: [1, 2, 3] },
  { n: 3, fr: "Les angles", en: "The angles", steps: [4] },
  { n: 4, fr: "L'activité", en: "The business", steps: [5] },
  { n: 5, fr: "Le site", en: "The site", steps: [6, 8] },
  { n: 6, fr: "La mise en ligne", en: "Going live", steps: [7] },
  { n: 7, fr: "La communication", en: "Communication", steps: [9, 11, 12] },
  { n: 8, fr: "La publicité", en: "Advertising", steps: [10] },
  { n: 9, fr: "Dans la durée", en: "Over time", steps: [13] },
] as const;
export type Phase = (typeof PHASES)[number];
/** L'étape du client à laquelle appartient un repère interne. */
export const phaseOf = (step: number): Phase => PHASES.find((p) => (p.steps as readonly number[]).includes(step)) ?? PHASES[PHASES.length - 1];

/** à faire · en cours · à valider par le client · validée · sans objet (ex. étape 7 quand le client choisit un de nos thèmes). */
export type StepStatus = "todo" | "doing" | "review" | "done" | "skipped";

/** Champs de la fiche de départ, dans l'ordre où SINA les demande. */
/**
 * Ordre des questions. Ajouts du 6 novembre (validés par le propriétaire) : image voulue (pour 3 identités dans ce que
 * le client veut), organisation (nombre de produits ou façon d'être contacté : thème et bouton principal du site),
 * photos du client (règle : jamais de personne sans photo fournie par le client ou son accord écrit) et langue du site.
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
  /** Le début du fil relu par SINA, et l'étape où il a été fixé (il ne bouge qu'au changement d'étape). */
  fil?: { depuis: number; etape: number };
  steps: Record<number, { status: StepStatus; at?: number; note?: string }>;
  start: Partial<Record<StartField, FieldAnswer>>;
  /** Les notes du client (faits, goûts, refus, avec leur portée) vivent dans sa fiche (`fiche.ts`), plus ici. */
  keep: Keepable[];
  mode: "creation" | "refonte";
  imported: ImportedSite[];
  /** Textes exacts gardés en refonte (nom, slogan), repris mot pour mot ensuite. */
  keptValues?: { name?: string; slogan?: string };
  /** Dernière proposition des identités (2, 3 ou 4 planches selon le forfait) et choix du client. */
  identities?: {
    list: Identity[]; issues: string[]; comparison: string; at: number; round: number; guidance?: string; corrected?: string[];
    /** Chaîne de création de la marque (12 novembre 2026) : tâche qui a fait cette proposition (son atelier se reprend sans repayer). */
    chainJobId?: string;
    /** Noms déjà montrés au client, toutes propositions confondues : jamais reproposés. */
    shownNames?: string[];
    /** « Ce que j'ai compris de ton marché » : paroles réelles lues sur le web (avec leur page), concurrents, moule de la catégorie. */
    study?: { quotes: { text: string; url: string }[]; quoteCount: number; sources: number; competitors: string[]; mould: string; substitutes: string[]; notFound: string[] };
    /** Planches dont le logo a été refait SEUL : leur maquette du site montre encore l'ancien logo, refaite au choix. */
    siteAncienLogo?: string[];
  };
  identityChoice?: { key: "A" | "B" | "C" | "D"; mix: Partial<Record<string, "A" | "B" | "C" | "D">>; edits?: { name?: string; slogan?: string }; at: number };
  /**
   * La marque finie de l'identité choisie (lot 2) : `prepaidMicro` = la part du devis des identités qui couvre déjà sa
   * fin (le client a donné son accord une fois pour le tout) ; `images` = les images de l'identité retenue, mélange
   * compris (celles de sa planche, puis l'objet, les signes et les publications créés après le choix).
   */
  brandFinish?: { prepaidMicro?: number; images?: NonNullable<Board["images"]>; at?: number; issues?: string[]; /** Image de planche dont le logo de la marque est tiré. */ logoFrom?: string | null };
  /** Le logo de la marque, adopté par la fin de marque (`brand-finish.ts`) : celui de la planche, ou le nom dessiné en secours. */
  logos?: { list: SinaLogo[]; at: number; round: number; notes?: string[] };
  logoChoice?: { source: "A" | "B" | "C"; assetId: string; at: number };
  /** Étape 3 : image de marque complète (déclinaisons, favicons, avatar, planche, charte PDF). */
  brandKit?: BrandKit;
  /** Étape des angles : les trois angles montrés (et la réserve gardée par le juge), puis l'angle choisi par le client. */
  angles?: SinaAngles;
  /** L'angle choisi par le client (id ; `ids` ne contient que lui : forme gardée pour ce qui la lit déjà). */
  angleChoice?: { id: string; ids?: string[]; at: number };
  /** Étape 5 : le plan de l'activité tel qu'affiché au client (coordonnées, stratégie, offre, produits). */
  activity?: ActivityPlan;
  /** Étape 6 : thèmes montrés au client (site composé dans chacun) et thème qu'il a choisi. */
  themes?: SinaThemes;
  /** Étape 6 : familles de sections montrées en image (Classique, Moderne) et celle que le client a choisie. */
  families?: { cards: { family: string; style: string; title: string; titleEn: string; pitch: string; pitchEn: string; mood: string; preview: string; demo?: string; sections: number }[]; chosen: string | null };
  /** Étape 6 : le choix DU CLIENT entre un thème du Studio et un thème sur mesure (jamais fait à sa place). */
  siteMode?: { mode: "theme" | "mockup"; at: number };
  /** Compte rendu de la création du site par SINA (lot 4) : relu en entier à l'étape du site. */
  site?: { report: import("./custom-theme/site-job").SiteReport; at: number };
  themeChoice?: { id: string; jobId: string; at: number };
  /** Thème sur mesure choisi par le client (custom.choose) : l'étape 7 est alors sa mise en boutique, pas encore prête. */
  customChosenAt?: number;
  /** Étape 9 : le plan des 3 groupes de publications (écrit, contrôlé, jugé), puis les publications créées. */
  posts?: SinaPosts;
  /** Étape 10 : la campagne de publicités lancée (moteur de publicités du Studio). */
  ads?: { jobId: string; platforms: string[]; count: number; at: number };
  /** Étape 12 : les articles demandés (moteur de blog du Studio), deux au plus pour l'étape. */
  blog?: { at: number; jobs: string[]; topics: string[] };
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
  if (!stepReady(n)) return false;
  return true;
}

/** Étape en cours : la première qui n'est ni validée ni sans objet. */
export function currentStep(j: Journey): number {
  return JOURNEY_STEPS.find((s) => !["done", "skipped"].includes(j.steps[s.n]?.status ?? "todo"))?.n ?? 13;
}

/** Statut d'une des neuf étapes du client, d'après ses repères internes. */
export function phaseStatus(j: Journey, p: Phase): StepStatus {
  const st = (p.steps as readonly number[]).map((n) => j.steps[n]?.status ?? "todo");
  if (st.every((x) => x === "skipped")) return "skipped";
  if (st.every((x) => x === "done" || x === "skipped")) return "done";
  if (st.includes("review")) return "review";
  return st.some((x) => x !== "todo") ? "doing" : "todo";
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

/**
 * Les sujets de la fiche : ce que SINA doit apprendre, et pourquoi. Ce ne sont pas des questions : elle les pose avec
 * ses mots, dans l'ordre qu'elle juge le meilleur pour ce client.
 */
export const TOPICS: Record<StartField, (j: Journey) => { fr: string; en: string }> = {
  business: () => ({ fr: "s'il vend des produits ou propose des services (à enregistrer : « products » ou « services ») ; tout le reste en dépend", en: "whether they sell products or offer services (\"products\" or \"services\")" }),
  offer: (j) => j.start.business?.value === "services"
    ? { fr: "ce qu'il fait, avec ses mots : ses prestations, et comment cela se passe pour son client", en: "what they do, in their words" }
    : { fr: "ce qu'il vend, avec ses mots : ce que c'est, de quoi c'est fait, comment on s'en sert ; et ses photos du vrai produit s'il en a", en: "what they sell, in their words, with photos of the real product" },
  existing: () => ({ fr: "ce qui existe déjà : un nom, un logo, des couleurs, un site, des réseaux ; s'il a un lien, tu le lis toi-même", en: "what already exists: name, logo, colours, site, social accounts" }),
  keep: () => ({ fr: "ce qu'il veut garder tel quel de l'existant ; tout le reste sera recréé", en: "what they want to keep as is" }),
  // Essais complets, Nadia (22 novembre 2026) : elle ne savait pas qui sont ses acheteuses et SINA n'a rien proposé.
  // Règle relayée du propriétaire : « ce qu'elle peut trouver seule, elle le propose ».
  audience: () => ({ fr: "à qui il s'adresse : qui achète ou réserve, dans quelle situation, ce que cette personne cherche. S'il ne sait pas, ne lui renvoie pas la question : propose-lui toi-même deux ou trois types d'acheteurs probables pour son offre, tirés de ce que tu sais de ce marché, à choisir ou à corriger", en: "who it is for; if they don't know, propose two or three likely buyer types yourself" }),
  market: (j) => j.start.business?.value === "services"
    ? { fr: "où il travaille : son adresse ou sa zone, chez le client, chez lui ou en ligne", en: "where they work" }
    : { fr: "où il vend (en ligne seulement, en boutique, sur des marchés) et où il livre", en: "where they sell and ship" },
  price: (j) => j.start.business?.value === "services"
    ? { fr: "ses tarifs et ses durées, même approximatifs", en: "prices and durations" }
    : { fr: "ses prix de vente, même approximatifs, et ses variantes (tailles, formats, couleurs)", en: "selling prices and variants" },
  difference: () => ({ fr: "ce qui le rend différent, avec ses mots : pourquoi lui plutôt qu'un autre", en: "what makes them different" }),
  image: () => ({ fr: "l'image qu'il veut donner, en quelques mots, et ce qu'il ne veut surtout pas (couleurs, styles)", en: "the image they want to convey and what they refuse" }),
  setup: (j) => j.start.business?.value === "services"
    ? { fr: "comment ses clients le contactent ou réservent : réservation en ligne, demande de devis, appel, formulaire", en: "how clients reach them" }
    : { fr: "combien de produits il vendra au lancement", en: "how many products at launch" },
  photos: () => ({ fr: "s'il a ses propres photos (son produit, lui au travail, son lieu, ses réalisations) ; sans photo d'une personne fournie par lui ni son accord écrit, aucune personne ne sera montrée", en: "whether they have their own photos" }),
  language: () => ({ fr: "la langue de son site : français seulement, ou aussi anglais", en: "site language" }),
  taste: () => ({ fr: "les sites, les marques ou les styles qu'il aime, et ceux qu'il n'aime pas (liens ou captures bienvenus)", en: "sites, brands or styles they like or dislike" }),
  contact: (j) => !j.keep.includes("nom")
    ? { fr: "ses coordonnées pour le site : e-mail, téléphone, adresse, SIRET s'il l'a (une partie maintenant, le reste plus tard) ; son nom viendra avec sa marque, ne le lui demande pas", en: "contact details for the site; the name comes with the brand" }
    : { fr: "ses coordonnées pour le site : nom de l'entreprise, e-mail, téléphone, adresse, SIRET s'il l'a (une partie maintenant, le reste plus tard)", en: "contact details for the site" },
  platform: () => ({ fr: "la plateforme où il vendra : Shopify, WooCommerce, PrestaShop, ou pas encore décidé", en: "the selling platform" }),
};

/** D'autres sujets utiles selon le métier : SINA les aborde quand la conversation s'y prête, et les note (start.note). */
export function extraTopics(j: Journey, notes: { sujet: string }[] = []): string[] {
  const common = ["son histoire : pourquoi il s'est lancé", "les concurrents qu'il connaît, et ce qu'il fait autrement", "les réseaux où il est déjà ou veut être, et ce qu'il y montre", "ce qu'il attend de son site et de sa communication dans les prochains mois"];
  const own = j.start.business?.value === "services"
    ? ["comment se passe une prestation, du premier contact à la fin", "ses années de métier, ses diplômes, ses assurances ou garanties, s'il en a", "ses jours et ses horaires"]
    : j.start.business?.value === "products" ? ["comment c'est fabriqué, d'où cela vient, ce qu'il y a dedans", "à quel moment et comment ses clients s'en servent"] : [];
  const done = new Set(notes.map((n) => n.sujet.toLowerCase()));
  return [...own, ...common].filter((t) => !done.has(t.split(" :")[0].toLowerCase()));
}

export const FIELD_LABEL: Record<StartField, { fr: string; en: string }> = {
  business: { fr: "Activité", en: "Business" }, offer: { fr: "Offre", en: "Offer" }, existing: { fr: "Existant", en: "Existing" },
  keep: { fr: "À garder", en: "To keep" }, audience: { fr: "Client idéal", en: "Ideal customer" }, market: { fr: "Où", en: "Where" },
  price: { fr: "Prix", en: "Price" }, difference: { fr: "Différence", en: "Difference" }, taste: { fr: "Goûts", en: "Taste" },
  contact: { fr: "Coordonnées", en: "Contact" }, platform: { fr: "Plateforme", en: "Platform" },
  image: { fr: "Image voulue", en: "Desired image" }, setup: { fr: "Organisation", en: "Set-up" },
  photos: { fr: "Tes photos", en: "Your photos" }, language: { fr: "Langue du site", en: "Site language" },
};

/** Texte relu par SINA à chaque pas : où en est le parcours et que faire maintenant. */
export function journeyContext(j: Journey, o: { identityCount?: number; /** Les notes de sa fiche. */ notes?: { sujet: string; value: string; genre?: string; portee?: string }[]; /** Sa fiche entière (`fiche.ts`), relue à chaque pas après les questions de départ. */ fiche?: string; /** La consigne détaillée de l'étape est donnée à part (`guideDeLEtape`), dans la partie gardée en mémoire. */ guideAPart?: boolean } = {}): string {
  const cur = currentStep(j);
  const steps = JOURNEY_STEPS.map((s) => `${s.n}. ${s.fr} = ${j.steps[s.n]?.status ?? "todo"}`).join(" ; ");
  if (j.outside) return "Projet existant (créé avant ce fil) : il n'y a PAS de parcours de création. Ne pose pas les questions de départ et ne lance aucune étape du parcours : aide le client sur ce qu'il demande, avec les outils du catalogue.";
  const phase = phaseOf(cur);
  const lines = [
    `Parcours du client, en 9 étapes : ${PHASES.map((p) => `${p.n}. ${p.fr} = ${phaseStatus(j, p)}`).join(" ; ")}. Il en est à l'étape ${phase.n} (« ${phase.fr} »). Avec lui, tu ne parles que de ces neuf étapes, par leur nom.`,
    `Repères internes du Studio (jamais dits au client ; les consignes ci-dessous les appellent « étape 0 » à « étape 13 ») : ${steps}. Repère en cours : ${cur}.`,
  ];
  if (cur === 7 && j.customChosenAt) {
    lines.push("Étape 7 (mise en boutique du thème sur mesure) : son thème est choisi et en place dans l'onglet Boutique. Quand il veut l'installer dans sa boutique Shopify, appelle custom.install (gratuit) : le Studio en fait un vrai thème Shopify (ajout au panier, panier, contact, recherche, une fiche par produit) et te rend soit le lien à télécharger, soit la liste de ce qui reste à régler (informations « À compléter », photos d'exemple) : donne-la-lui simplement et aide-le à compléter (custom.edit) ; s'il préfère retirer ce qu'il ne peut pas donner, relance avec sansLesManques:true, avec son accord écrit. Ne dis jamais que sa boutique est en ligne : c'est lui qui importe le thème dans Shopify. Continue de faire les changements qu'il demande sur son thème (consigne de l'étape 6) ; après un changement, la mise en boutique se refait (custom.install). N'utilise AUCUN outil des anciennes maquettes (mockup.*, site.code_from_mockup, site.images).");
    if (STEP_GUIDES[6] && !o.guideAPart) lines.push(STEP_GUIDES[6]);
    return lines.join("\n");
  }
  if (!stepReady(cur)) {
    const s = JOURNEY_STEPS.find((x) => x.n === cur)!;
    lines.push(`L'étape ${cur} (« ${s.fr} ») n'est pas encore disponible dans le parcours. Dis-le simplement au client (la suite arrive très bientôt), réponds à ses questions, mais n'utilise AUCUN outil payant et ne lance aucune autre étape (ni recherche, ni angles, ni marque, ni site).`);
  }
  if (cur === 0) {
    const filled = START_FIELDS.filter((f) => j.start[f]).map((f) => `${f} (${FIELD_LABEL[f].fr}) = ${j.start[f]!.status === "answered" ? `« ${j.start[f]!.value.slice(0, 400)} »` : j.start[f]!.status === "later" ? "il répondra plus tard" : "rien à dire"} (source : ${j.start[f]!.source})`);
    const missing = missingFields(j);
    lines.push("Faire connaissance. Ton but : apprendre tout ce que LUI SEUL sait et dont sa marque, son site, ses publications et ses publicités auront besoin, pour réussir du premier coup et lui éviter les reprises. Tu mènes la conversation comme une professionnelle qui s'intéresse vraiment à son projet : tu choisis toi-même la prochaine question, la plus utile maintenant, selon son métier et ce qu'il vient de dire. UNE seule question à la fois. Jamais une question dont la réponse est déjà connue (ci-dessous, ou lue sur son site). Quand une réponse est vague, ou qu'elle ouvre quelque chose d'important pour la suite, creuse avant de changer de sujet. Ce que tu peux trouver seule, tu le trouves : s'il donne un lien, lis-le (start.import) et montre-lui ce que tu as trouvé au lieu de le lui demander.");
    lines.push(`Ce que tu sais déjà : ${filled.join(" ; ") || "rien encore"}.`);
    if (o.notes?.length) lines.push(`Tes notes (autres faits qu'il a donnés) : ${o.notes.map((n) => `${n.sujet} : « ${n.value.slice(0, 300)} »${n.genre === "refuse" || n.genre === "aime" ? ` (${n.genre === "refuse" ? "refus" : "goût"}, ${n.portee ?? "tout"})` : ""}`).join(" ; ")}.`);
    lines.push(`Mode : ${j.mode}${j.keep.length ? ` ; à garder tel quel : ${j.keep.join(", ")}` : ""}.`);
    if (j.imported.length) lines.push(`Existant lu : ${j.imported.map((s) => `${s.url} (nom « ${s.name ?? "?"} », slogan « ${s.tagline ?? "?"} », logo ${s.logoSrc ? "trouvé" : "non trouvé"}, couleurs ${s.colors?.join(" ") ?? "?"}, polices ${s.fonts?.join(", ") ?? "?"}${s.warnings?.length ? `, limites : ${s.warnings.slice(0, 3).join(" / ")}` : ""})`).join(" ; ")}.`);
    const extra = extraTopics(j, o.notes ?? []);
    if (missing.length) {
      lines.push(`Sujets de la fiche pas encore abordés (chacun doit l'avoir été avec lui avant le résumé ; l'ordre et les mots sont les tiens) : ${missing.map((f) => `${f} — ${TOPICS[f](j).fr}`).join(" | ")}.`);
      if (extra.length) lines.push(`Autres sujets utiles pour ce métier, à aborder quand la conversation s'y prête et à noter avec start.note : ${extra.join(" ; ")}. Tu peux en ajouter d'autres si son projet le demande. Tu pourras aussi lui reposer une question plus tard, à l'étape où tu en auras besoin : ne garde pour maintenant que ce qui sert à bien démarrer.`);
      lines.push("Enregistre au fur et à mesure, et seulement ce qu'il a dit, avec ses mots : start.answer pour un sujet de la fiche (plusieurs s'il en donne plusieurs d'un coup), start.note pour tout autre fait utile. Tu ne réponds jamais à sa place : un sujet qu'il n'a pas abordé se demande. « Plus tard » ou « rien » ne s'enregistrent que s'il le dit lui-même.");
    } else {
      if (extra.length) lines.push(`Tous les sujets de la fiche ont été abordés. Avant le résumé, il te reste des sujets utiles pour ce métier que tu n'as pas encore notés : ${extra.join(" ; ")}. Aborde, un par un, ceux qui serviront vraiment à sa marque, à son site ou à ses publications (à noter avec start.note) ; laisse ceux qui n'apporteraient rien à ce projet.`);
      lines.push(`${extra.length ? "Quand tu n'as plus de question utile" : "Tous les sujets ont été abordés. S'il te manque encore quelque chose d'important, demande-le ; sinon"}, fais le RÉSUMÉ complet (« Voici ce que j'ai compris »), court, par rubrique, avec ses mots et ses notes, dans « message » ; la question reste courte (« Est-ce juste ? Si quelque chose est à corriger, écris-le-moi. ») ; à sa confirmation, appelle start.confirm.`);
    }
  }
  // Après les questions de départ, la fiche entière est relue à chaque pas (le socle, 21 novembre 2026) : SINA ne va
  // plus chercher ce qu'il a dit dans le fil de la conversation.
  // Dès « faire connaissance » aussi (22 novembre 2026 : ses mots corrigés n'arrivaient à SINA qu'après), à chaque pas.
  if (o.fiche) lines.push(o.fiche);
  if (cur === 1) lines.push(...identityStepContext(j, o.identityCount));
  if (cur === 2 || cur === 3) lines.push(...brandFinishContext(j));
  if (cur === 4) lines.push(...anglesStepContext(j));
  if (cur === 5) lines.push(...activityStepContext(j));
  if (cur === 6) lines.push(...themeStepContext(j));
  if (cur === 9 && stepReady(9)) lines.push(...postsStepContext(j));
  if (cur >= 10 && stepReady(cur)) lines.push(...lateStepContext(j, cur));
  if (stepReady(cur) && STEP_GUIDES[cur] && !o.guideAPart) lines.push(STEP_GUIDES[cur]);
  return lines.join("\n");
}

/**
 * La consigne détaillée de l'étape en cours, la même à chaque pas de l'étape (22 novembre 2026, audit des coûts) :
 * placée avec les notices des outils de l'étape, dans la partie gardée en mémoire chez le fournisseur, au lieu d'être
 * relue au plein prix à chaque pas. Vide hors parcours ou pour une étape sans consigne.
 */
export function guideDeLEtape(j: Journey): string {
  if (j.outside) return "";
  const cur = currentStep(j);
  if (cur === 7 && j.customChosenAt) return STEP_GUIDES[6] ?? "";
  return stepReady(cur) ? STEP_GUIDES[cur] ?? "" : "";
}

/** Consignes détaillées des étapes ouvertes (READY_STEPS), relues par SINA à chaque pas de l'étape en cours. */
export const STEP_GUIDES: Partial<Record<number, string>> = {
  6: "Étape 6, LE SITE (lot 4, 16 novembre 2026). Tu crées son site toi-même, pour sa marque, et il doit être bon du premier coup. Le client ne choisit ni thème, ni famille, ni modèle, ni concept : tu ne lui montres jamais de catalogue et tu ne lui proposes jamais « un thème du Studio ou un thème sur mesure ». Tu ne dis jamais « maquette », « thème », « section », « tenue » ni « construction » : tu parles de son site, de ses pages, de ce qu'il verra. 1) AVANT DE LANCER : relis ce que tu sais (ses produits ou ses prestations avec leurs prix, ses coordonnées, sa livraison ou sa zone, ses horaires, ses preuves, ses photos). S'il te manque une information que lui seul connaît et dont le site a besoin, demande-la maintenant, une question à la fois ; ce qu'il ne sait pas encore s'affichera « À compléter » et ne sera jamais inventé. Demande-lui aussi, en une question, s'il a une envie pour son site (ce qu'il veut qu'on ressente en arrivant) : sa réponse devient ta consigne, avec ses mots. " + QUESTION_DES_PREUVES + " " + QUESTION_DES_PHOTOS + " Pour une boutique : ses offres (lots, abonnement, promotion avec sa date de fin) s'enregistrent avec shop.offers, seulement s'il en a. 2) LA CRÉATION (payant : UNE carte d'accord pour tout le site) : site.create. Dis-lui en deux phrases ce que tu vas faire et combien de temps cela prend, puis lance. Pendant la tâche, reste avec lui : réponds, et pose les questions qui serviront à la suite. 3) LE COMPTE RENDU : quand la tâche est finie, lis son rapport et montre-lui son site (il s'affiche dans la conversation et dans l'onglet Boutique, sur ordinateur et sur téléphone). Dis-lui, à la première personne et simplement : l'idée du site (« concept ») et le signe que tu as pris sur son produit ou son métier (« signe »), par ce qu'il verra ; pourquoi son site a cette allure, en partant de SA planche de marque (« styleEnCoulisses.pourquoi » t'aide ; le nom de la famille est un mot de coulisses, tu ne le dis JAMAIS et tu ne parles jamais de « famille » ni de « style du Studio ») ; ce que tu as relu et repris (« relecture », « relecturePhotos ») ; ce que tu as vu en regardant le résultat sur téléphone (« regards ») ; si le compte rendu commence par « siteNonRegarde », tu n'as PAS pu regarder le site en image (ou pas en entier) : dis-le-lui EN PREMIER, simplement (« je n'ai pas pu regarder ton site en image avant de te le montrer »), ne dis jamais que tu l'as regardé, et propose de le regarder ensemble ; si le compte rendu porte « ressemblance », dis-le-lui aussi EN PREMIER, simplement : soit ton site n'a pas pu être comparé en image aux autres sites du Studio, soit il ressemble encore trop à un site déjà fait pour une autre marque et tu ne le lui présentes PAS comme fini (propose de reprendre la conception avec une autre direction, payant : son accord écrit avant) ; « controleImage » dit en une ligne ce que le Studio a comparé et corrigé, sans jamais nommer l'autre marque ; et HONNÊTEMENT ce qui reste : une image ratée est dite ratée, une photo qui manque est dite manquante, une information « À compléter » lui est demandée (« aCompleter »). Ne dis jamais que tout est parfait s'il reste un point. Si les photos n'ont été créées que pour certaines pages (« photosPagesLimitees »), dis-le et propose de créer les autres (custom.build, carte d'accord). Si le compte rendu porte « photosProduitsAImporter », redis-le simplement : ces produits attendent sa photo (« Ta photo ici » tient leur place, rien n'a été inventé), il peut te les envoyer ici ou les poser dans l'onglet Produits, et son site ne partira en boutique qu'avec elles. 4) LES RETOUCHES, EN CLIQUANT : dis-lui qu'il peut cliquer sur n'importe quel élément de son site (un titre, un texte, une photo, un bouton, un détail) et te dire ce qu'il veut. Un message qui commence par « [Élément désigné · section sXXXXXXXX … » vient de ce clic : le Studio t'a déjà lu CETTE section (résultat custom.section juste après son message ; sinon lis-la), change SEULEMENT cet élément (custom.edit : edits pour un texte ou une partie, image pour une photo de ses Fichiers, hide pour retirer l'élément, css avec :scope pour une couleur, une taille, un espacement, une disposition), puis dis en une phrase ce qui a changé. Avant de changer une couleur de texte, vérifie qu'il reste LISIBLE sur son fond ; ne donne jamais de code couleur, nomme la couleur. Ajouter, retirer, déplacer ou changer une partie de page, ou l'allure générale (titres, boutons, cadres des photos) : custom.structure (gratuit, ses textes et ses photos restent). « Annule » : custom.undo. Une nouvelle photo : custom.photo (payante : carte d'accord). Le menu : custom.menu. Ne remplace JAMAIS un fait du client par une affirmation qu'il n'a pas donnée : ses faits sont ceux de la carte « Ton activité » (activity.plan) : les faits de son offre ET sa livraison (transporteur, délai, prix, livraison offerte), ses retours et ses coordonnées ; ne dis jamais « non confirmé » ce qui y figure. 5) LA GALERIE DE SES PRODUITS (boutique seulement, s'il a peu de photos par produit) : gallery.plan explique pourquoi et pose ses questions ; gallery.create (payant : carte d'accord) crée les images avec son vrai produit ; jamais un fait inventé sur une image. 6) LA VALIDATION : custom.choose quand il dit que son site lui plaît, jamais à sa place. Le Studio vérifie alors que rien d'inventé ni d'exemple ne reste ; s'il manque quelque chose, la liste t'est rendue : demande-le-lui, simplement. CE QUE TU AS ÉTUDIÉ : avant de concevoir, tu as regardé des sites du même métier et d'autres plus lointains ; dis-le en une phrase à la première personne, sans jamais citer un site ni une marque, et sans jamais dire que tu copies.",
  7: "Étape 7 (site codé d'après une ANCIENNE maquette, projets commencés avec elles seulement) : appelle site.code_from_mockup (pour une partie des pages, avec pages) : le Studio montre le devis au client sur une carte d'accord ; les captures du site codé te sont jointes à côté de la maquette : compare-les vraiment (couleurs, logo, sections présentes ou absentes, textes, photos) ; à la fin, lis mockup.report et dis honnêtement, page par page, ce qui est conforme et ce qui ne l'est pas (les pages « dérivées » n'avaient pas d'image de maquette : elles sont codées dans son style). Puis propose site.images (consigne du propriétaire : toutes les photos du site recréées en haute définition par l'IA d'images des maquettes, à l'identique de la maquette) : la carte d'accord montre son prix. Le site codé est une version inactive : le client décide de l'appliquer (site.use_version).",
  8: "Étape 8 (un de nos thèmes, monté à sa marque ; consigne du propriétaire du 9 novembre 2026) : le client a choisi un thème du Studio (theme.choose) ; attends la fin de la composition (tâche de fond), puis : 1) IMAGES : theme.images (gratuit) et demande-lui, en une question à choix, s'il monte son site avec SES images ou si tu les crées ; s'il prend les siennes, dis-lui le nombre EXACT d'images à envoyer avec le trombone ; s'il en a moins, propose de créer celles qui manquent ou toutes (jamais à sa place). Puis gallery.plan : explique POURQUOI la galerie de la fiche produit, pose-lui ses questions (combien d'images par produit, 7 au moins conseillées ; garde-t-il SA photo dans la galerie ; une personne ou non ; les questions sur chaque produit pour les textes des images) et gallery.create pour chaque produit avec SES réponses (payant : carte d'accord). Toutes les images du thème sont créées par OpenAI : une partie met en scène son vrai produit, les autres l'univers sans lui ; pour un service, ses photos de chantier d'abord, SINA crée celles qui manquent. 2) MONTAGE À SA MARQUE : appelle theme.brand (avec ses choix d'images) : le Studio lui montre le devis (coût probable et plafond, en % de son budget) sur une carte d'accord et ne lance qu'après son accord ; theme.brand réécrit TOUS les textes de sa boutique avec du vrai copywriting : l'angle marketing qu'il a choisi et son émotion dans chaque texte (situation vécue, désir, soulagement), ses faits comme seules preuves, rien d'inventé ; puis pose ses images et crée celles qui manquent. Tâche de fond : attends-la, lis son rapport, dis honnêtement ce qui reste (textes à revoir, images non créées). 3) BOUTIQUE : son site est alors EN PLACE dans l'onglet Boutique : dis-lui de l'ouvrir, de le regarder en grand et de désigner un élément pour demander un changement ; fais ses changements un par un, et vérifie qu'un texte reste lisible sur son fond. 4) VALIDATION : quand il dit que son site lui plaît, theme.validate (jamais à sa place).",
  9: "Étape 9 (3 groupes de publications), dans cet ordre : 1) RÉSEAUX : demande-lui sur quels réseaux il publie (Instagram, Facebook, TikTok, Pinterest, LinkedIn, YouTube), en UNE question ; ne devine jamais. 2) LE PLAN D'ABORD (payant, peu : carte d'accord) : posts.plan écrit les trois groupes (sujet utile, titre, trois points, appel à l'action, texte, hashtags, la photo prévue), tous relus avant de lui être montrés ; le plan s'affiche dans le fil, tu ne le recopies pas ; si un groupe porte un doute, dis-le franchement, à la première personne. Il peut demander un autre plan (posts.plan avec redo = ses mots, payant, annoncé avant). 3) LES IMAGES ENSUITE (payant : carte d'accord avec le prix) : seulement quand le plan lui convient, posts.create crée chaque publication dans le format de chacun de ses réseaux ; chaque image est contrôlée avant de lui être montrée ; attends la tâche, lis son rapport, dis honnêtement ce qui a été créé et ce qui a échoué (jamais une image ratée présentée comme bonne). 4) Il valide (posts.validate), jamais à sa place. Jamais de personne dans une image sans photo fournie par lui ou son accord écrit ; aucun avis, chiffre ni promesse absent de sa fiche. Tu es la seule à lui parler : jamais « ma stratège », « le juge » ni « mon équipe ».",
  10: "Étape 10 (publicités images) : 1) demande-lui où il veut faire de la publicité (Meta : fil ou story, TikTok, Google, Pinterest, LinkedIn), en UNE question ; s'il n'en veut pas maintenant, passe l'étape (ads.validate avec skip: true), sans insister. 2) ads.create (payant : carte d'accord avec le prix) crée des idées vraiment différentes, une accroche courte et un bouton par visuel ; les promesses sont contrôlées avant l'image et chaque image avant d'être montrée. Si son forfait ne comprend pas la publicité, l'outil le dit : répète-le simplement, sans pousser à changer de forfait. 3) Attends la tâche, lis son rapport, dis honnêtement combien ont passé le contrôle et lesquelles ont été refusées ; elles sont dans l'onglet Publicités. 4) Il valide (ads.validate), jamais à sa place. Aucune promesse interdite par les régies (santé, avant/après trompeur, urgence artificielle).",
  11: "Étape 11 (calendrier de publication, MANUEL pour l'instant : le client publie lui-même, la publication automatique viendra après les accords des plateformes) : demande d'abord au client, UNE question à la fois et seulement si l'information manque : sur combien de jours (7, 15 ou 30), combien de publications par jour, à quelles heures, sur quels réseaux, avec ou sans émojis, avec ou sans les publicités. Puis appelle calendar.plan ; montre-lui le calendrier (calendar.read) jour par jour et dis-lui qu'il peut l'ajouter à son agenda (fichier .ics) et cocher chaque publication une fois postée (calendar.mark_done). S'il manque des publications pour remplir les jours, dis-le simplement et propose d'en créer (payant, devis d'abord). Quand le calendrier lui convient, il le valide (calendar.validate), jamais à sa place.",
  12: "Étape 12 (2 articles de blog) : 1) blog.topics (gratuit) te donne la matière ; propose-lui 3 ou 4 sujets UTILES à son client idéal (une question qu'il se pose, un usage, un guide, une comparaison), chacun lié à un de ses angles ; il en choisit 2, jamais toi. 2) blog.write (payant : carte d'accord), UN appel par article, avec son sujet et ce qu'il veut y lire (ses mots) : l'article est écrit, contrôlé (référencement, faits) et relu avant d'arriver en brouillon dans l'onglet Blog. 3) Attends la tâche, dis-lui où le lire et ce qui reste à vérifier ; ne dis jamais qu'il est publié : il publie lui-même. 4) Il valide (blog.validate). Aucun avis, chiffre ni promesse absent de sa fiche ; les paroles de clients relevées viennent de clients d'AUTRES marques.",
  13: "Étape 13 (rangement des fichiers, gratuit et sans IA) : files.tidy range dans leurs dossiers les fichiers qui n'en ont pas encore ; rien n'est supprimé, rien de ce qu'il a rangé lui-même n'est déplacé. Dis-lui combien ont été rangés et où les trouver (onglet Fichiers). Il valide (files.validate) : c'est la fin du parcours de création ; félicite-le simplement et dis-lui ce qu'il peut faire ensuite dans le Studio.",
};

/**
 * Après le choix de l'identité (repères 2 et 3) : la marque finie. Le logo de la planche est adopté, l'objet, les
 * signes et les publications sont créés, la charte est préparée ; le client regarde, demande ses changements, valide.
 */
export function brandFinishContext(j: Journey): string[] {
  const f = j.brandFinish, k = j.brandKit;
  if (!f?.at) return ["La marque — l'identité est choisie, il reste à la finir : appelle brand.finish (sans argument). Le Studio crée ce qui manque (le logo s'il n'y en a pas, l'objet qui le porte, les signes, trois publications), adopte son logo et prépare sa charte. Quand c'est déjà compris dans l'accord donné pour ses identités, ça part sans carte ; sinon le Studio montre le prix avant. Quelques minutes, en arrière-plan."];
  const im = f.images ?? {};
  const made = [im.logo ? "le logo" : "", im.hero ? "la grande scène" : "", im.object ? "l'objet qui porte le logo" : "", im.signs ? "les signes" : "", ...(im.posts ?? []).map((q, i) => (q ? `la publication ${i + 1}` : ""))].filter(Boolean);
  return [
    `La marque — sa marque complète est affichée dans le fil : ${made.join(", ") || "aucune image gardée"}${k ? ` ; sa charte : ${k.items.map((x) => x.label).join(", ")}${k.bookId ? `, charte PDF (${k.pageIds.length} pages)` : ""}` : " ; charte pas encore prête"}.`,
    ...(j.keep.includes("logo") ? ["Il garde son logo : il n'a pas été redessiné, il est posé tel quel."] : []),
    ...(f.issues?.length ? [`À dire honnêtement au client, en mots simples (une image ratée est dite ratée) : ${f.issues.join(" ; ")}`] : []),
    ...(k?.notes.length ? [`À dire aussi : ${k.notes.join(" ; ")}`] : []),
    "Tu VOIS ces images (jointes à ta réponse) : regarde-les avant d'en parler. Présente sa marque en 3 ou 4 phrases, d'après ce que tu vois vraiment (le nom est-il écrit juste sur le logo et sur l'objet ? le produit est-il entier ?), et dis franchement ce qui te plaît moins. Puis demande s'il la valide. S'il veut changer quelque chose : un AUTRE logo ou une image à refaire → brand.finish avec redo et guidance = ses mots (payant, le prix s'affiche avant) ; une autre identité → identity.choose ; une couleur ou une police → dis-lui que c'est noté et que ce réglage arrive plus tard dans le parcours, sans rien inventer. À sa validation (« oui », « je valide »…), appelle brand.kit_validate. Ne valide jamais à sa place.",
  ];
}

/** Étape 5 : l'activité complète (gratuite). */
/** Étape 9 : où en est le plan des publications (lu par SINA à chaque pas de l'étape). */
/** Étapes 10, 12 et 13 : où en est l'étape (lu par SINA à chaque pas). */
export function lateStepContext(j: Journey, cur: number): string[] {
  if (cur === 10) return [j.ads ? `Publicités : ${j.ads.count} idée(s) demandée(s) pour ${j.ads.platforms.join(", ")} ; lis le rapport de la tâche, puis le client valide (ads.validate).` : "Publicités : rien de lancé encore. Demande d'abord où il veut faire de la publicité."];
  if (cur === 12) return [j.blog?.topics.length ? `Articles demandés (${j.blog.topics.length} sur 2) : ${j.blog.topics.map((t) => `« ${t} »`).join(" ; ")}.` : "Articles : aucun sujet choisi encore (blog.topics donne la matière, gratuit)."];
  return [];
}

export function postsStepContext(j: Journey): string[] {
  const plan = j.posts;
  if (!plan) return ["Publications : aucun plan encore. Demande ses réseaux, puis propose le plan (posts.plan, payant, carte d'accord)."];
  const doubts = plan.groups.map((g, i) => (g.doubt ? `groupe ${i + 1} « ${g.title} » (${g.doubt})` : "")).filter(Boolean);
  return [
    `Publications : plan n° ${plan.round} montré dans le fil (${plan.groups.map((g, i) => `${i + 1}. « ${g.title} »`).join(" ; ")}).${plan.judged === "non_juges" ? " Il n'a pas pu être relu avant d'être montré : dis-le simplement." : ""}${doubts.length ? ` Tu doutes de : ${doubts.join(" ; ")} ; dis-le franchement, à la première personne.` : ""}`,
    plan.created ? `Images demandées pour ${plan.created.postIds.length} publication(s) sur ${plan.created.networks.join(", ")} : lis le rapport de la tâche, puis le client valide (posts.validate).` : "Aucune image créée encore : seulement quand le plan lui convient (posts.create, payant, carte d'accord).",
  ];
}

export function activityStepContext(j: Journey): string[] {
  const a = j.activity;
  const base = "Étape 5 (activité complète, GRATUITE) : on réunit tout ce que le site va dire. 1) appelle activity.plan : il AFFICHE la carte « Ton activité » et renvoie ce qui manque ; 2) pose les questions manquantes, y compris les facultatives (téléphone, SIRET), une fois chacune : les faits simples ENSEMBLE, numérotés et courts, six au plus (règle du propriétaire du 19 novembre 2026), une question de choix ou d'accord SEULE ; « Plus tard » se propose SEULEMENT pour le téléphone et le SIRET, JAMAIS pour le nom, l'e-mail, l'adresse, la livraison ou les retours (obligatoires pour le site) (coordonnées : activity.company avec ses mots ; « plus tard » → activity.company later ; « je n'en veux pas sur le site » (pas de téléphone…) → activity.company none, jamais later). L'ADRESSE SUR LE SITE : elle figure toujours dans les informations légales ; un métier sans local qui reçoit du public (il travaille chez lui et se déplace chez ses clients) : demande-lui, en une question, si son adresse doit s'afficher ailleurs sur le site, puis enregistre sa réponse avec activity.company addressDiscreet (true = discrète, seulement dans les informations légales ; false = affichée) ; par défaut discrète pour quelqu'un qui travaille chez lui et se déplace ; s'il l'a déjà dit, ne le redemande pas, enregistre-le ; 3) PRODUITS : s'il n'y en a aucun dans l'onglet Produits, propose la liste tirée de SA fiche (un produit par parfum, modèle ou formule, et les coffrets ou lots qu'il a cités) avec SES prix, sans en inventer aucun ; demande son accord, puis crée chaque produit avec catalogue.create (titre, prix confirmé, description courte avec les faits du client, ses mots : ingrédients, poids ou contenance qu'il a cités dans sa fiche de départ, composition ; rien d'autre) ; un prix manquant se demande, jamais il ne se devine ; 4) rappelle activity.plan pour mettre la carte à jour ; 5) quand rien ne manque, demande s'il valide (activity.validate).";
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

/** Étape 6 : le site, créé par SINA en une fois (une seule façon depuis le lot 4). */
export function themeStepContext(j: Journey): string[] {
  const st = j.steps[6]?.status ?? "todo";
  return [st === "doing" ? "Étape 6 — ton site est en cours de création (tâche de fond) : n'annonce rien avant sa fin." : st === "review" ? `Étape 6 — son site est créé : montre-le-lui, écoute ses retouches, et valide seulement quand il le dit (custom.choose).${j.site ? ` COMPTE RENDU DE LA CRÉATION (à lui dire simplement et honnêtement, à la première personne) : ${JSON.stringify(j.site.report).slice(0, 6000)}` : ""}` : "Étape 6 — le site n'est pas encore créé."];
}

/** Étape des angles : trois angles (un sûr, un d'émotion, un audacieux), écrits par trois stratèges séparées et jugés à part. */
export function anglesStepContext(j: Journey): string[] {
  const a = j.angles;
  if (!a?.shown?.length) {
    const st = j.identities?.study;
    return [
      "Étape des angles : rien n'est encore proposé. Un angle, c'est aller chercher un type de client différent, avec ses envies et ses besoins à lui, qui cherche le même produit ou la même prestation : seule la façon de le mettre en avant change, sur le site et dans la communication. Tu vas en proposer TROIS, pour trois types de clients différents : un sûr, un d'émotion, un audacieux. Dis-le au client en une ou deux phrases simples.",
      `AVANT de lancer, vérifie que tu sais ce que LUI SEUL peut savoir et dont les angles ont besoin : qui sont ses différents types de clients, et lequel il veut voir venir davantage ; ce que ses clients lui disent ou lui demandent le plus souvent ; à quel moment et pour quelle occasion on achète ou on réserve chez lui ; ce qu'on ressent en utilisant son produit ou en sortant de chez lui (goût, toucher, odeur, résultat) ; ce que ses clients faisaient avant de venir chez lui ; à quel moment leur besoin apparaît ; ce qui les surprend en bien ; ce qu'il fait que ses concurrents ne font pas, et ce qu'il refuse de faire ; ce qui fait revenir ses clients. Un type de client, c'est une situation (qui il est, pour quelle occasion il vient), jamais un âge seul ni une crainte que tous partagent. Relis ce qu'il t'a déjà dit (sa fiche, tes notes) : ne redemande JAMAIS ce que tu sais. S'il te manque quelque chose d'important, pose tes questions maintenant, une à la fois, et note chaque réponse (start.note). Un angle ne peut rien affirmer que le client n'a pas dit : mieux vaut une question de plus qu'un angle bâti sur une supposition.`,
      `Ce que tu as déjà : ${st ? `ton étude de son marché faite pour la marque (${st.quoteCount} parole(s) réelle(s) d'acheteurs, ${st.competitors.length} concurrent(s) lus)` : "pas encore d'étude de son marché"}. Tu ne la repaies pas ; tu ne retournes écouter le web que s'il te manque des paroles d'acheteurs.`,
      "Quand tu as ce qu'il te faut et que le client est prêt, appelle angles.propose : c'est payant, le Studio montre le prix sur la carte d'accord (un seul accord pour toute l'étape), puis la création prend quelques minutes en arrière-plan. N'invente aucun angle toi-même : seul angles.propose les crée. Tu es la seule à parler au client : dis « je relis », « j'écris », jamais « ma stratège » ni « le juge ».",
    ];
  }
  const shown = shownAngles(a);
  return [
    `Étape des angles — proposition n° ${a.round ?? 1} : tes ${shown.length} angles sont affichés au client en cartes dans le fil. ${shown.map((x) => `${x.id} « ${x.title} »${roleOf(a, x.id) ? ` (${ANGLE_ROLE_LABEL[roleOf(a, x.id)!].fr.toLowerCase()})` : ""}${x.client ? ` pour le type de client « ${x.client.name} »` : ""} : ${x.person ?? x.audience} ; accroche « ${x.message} » ; émotion : ${x.emotion || "?"} ; à confirmer : ${x.proofsToConfirm.join(", ") || "rien"}${x.doubt ? ` ; TON DOUTE : ${x.doubt}` : ""}`).join(" | ")}.`,
    `Celui que tu recommandes : ${a.recommendedId ?? "aucun"}${a.recommendation ? ` (${a.recommendation})` : ""}.${a.reserve?.length ? ` ${a.reserve.length} autre(s) angle(s) gardé(s) restent en réserve pour ses publications et ses publicités : ne les propose pas comme choix.` : ""}`,
    `Présente-les en trois phrases courtes au plus, sans recopier les cartes : pour chacun, la clientèle visée et ce qu'on lui montre en premier. Dis en une phrase pourquoi tu as choisi ces trois clientèles-là${a.clients?.others.length ? ` (tu as aussi repéré : ${a.clients.others.join(", ")} ; il peut te demander un angle pour l'une d'elles)` : ""}. Dis lequel tu recommandes et pourquoi, en une phrase. Si tu doutes d'un angle, dis-le franchement, à la première personne, et propose de le reprendre. Rappelle en une phrase que les « informations à confirmer » ne seront jamais écrites sans sa réponse. Puis demande lequel il choisit : UN angle, qui sera le fil conducteur de son site, de ses publications et de ses publicités → angles.choose {angleId}. Ne choisis jamais à sa place. S'il veut une nouvelle proposition, appelle angles.propose {redo: sa demande avec ses mots} (payant : le prix est annoncé).`,
    ...(a.issues?.length ? [`À dire honnêtement au client, en mots simples : ${a.issues.join(" ; ")}`] : []),
  ];
}

/** Étape 1 : que faire selon l'état des propositions. */
function identityStepContext(j: Journey, count?: number): string[] {
  const id = j.identities;
  // Le nombre exact d'identités de CE client (essai réel du 14 novembre 2026 : SINA annonçait « deux à quatre »).
  const how = count ? `${count} identités pour ce client (son forfait) : annonce ${count}, jamais « deux à quatre »` : "2, 3 ou 4 selon le forfait du client, le Studio le sait";
  if (!id?.list.length) return [
    `Étape 1 (identités de marque : ${how}) : rien n'est encore proposé. Si le client est prêt (il dit oui, on continue, vas-y…), dis-lui en une phrase ce que tu vas faire (étudier son marché, chercher l'idée et les noms, lui montrer chaque identité en planche de marque), puis appelle identity.propose (sans guidance) : la création prend plusieurs minutes, en arrière-plan. Le prix affiché couvre toute l'étape : ses identités, puis la marque complète de celle qu'il choisira (un seul accord). S'il pose une question, réponds-y d'abord. N'invente aucune identité toi-même : seul identity.propose les crée. Tu es la seule à parler au client : dis « j'étudie », « je cherche », jamais « mon équipe » ni « ma stratège ».`,
  ];
  const out = [
    `Étape 1 — proposition n° ${id.round} (${id.list.some((x) => x.board) ? "les planches de marque complètes" : "les cartes complètes"} sont affichées au client dans le fil) : ${id.list.map((x) => `${x.key} « ${x.name} » (${x.board ? `idée : ${x.board.idea.belief} ; ` : ""}slogan « ${x.slogan} », territoire ${x.territory}, fond ${x.ground})`).join(" ; ")}.`,
    ...(id.study ? [`Ton étude du marché (affichée au client au-dessus des planches) : ${id.study.sources} page(s) lue(s), ${id.study.quoteCount} parole(s) réelle(s) de clients gardée(s) mot pour mot${id.study.notFound.length ? ` ; non trouvé : ${id.study.notFound.join(" ; ")}` : ""}. Commence par dire en une phrase ce que tu as compris de son marché, à la première personne.`] : []),
    "Tu VOIS le logo, la grande scène et la maquette du haut du site de chaque planche (images jointes à ta réponse) : regarde-les avant d'en parler, et dis franchement si l'une d'elles n'est pas belle. Chaque planche montre l'idée, le nom, le logo, la grande scène, la maquette du haut de son site sur téléphone, les couleurs, les polices et la voix ; l'objet qui porte le logo, les signes en photo et trois publications sont créés pour l'identité qu'il choisit, dès son choix (déjà compris dans son accord) : dis-le en une phrase. Présente-les en une ligne courte chacune (l'idée de chacune et ce qui la distingue), sans recopier les planches, dis laquelle tu recommandes et pourquoi en une phrase, puis demande laquelle il préfère. Chaque planche dit « ce qui reste à prouver » : ne présente jamais ces points comme acquis. Il peut : en choisir une ; MÉLANGER (ex. le nom de A avec les couleurs de C → identity.choose key « A », mix {palette: « C »}) ; retoucher le nom ou le slogan avec ses mots (identity.choose name / slogan) ; ou demander une nouvelle proposition (identity.propose avec guidance = ses mots, et redo = les identités à refaire s'il en garde certaines). Ne choisis jamais à sa place ; en cas de doute sur son choix, pose UNE question.",
  ];
  if (id.issues.length) out.push(`Points que le contrôle du Studio n'a pas pu valider (dis-les honnêtement au client, en mots simples) : ${id.issues.join(" ; ")}.`);
  // Le nom de domaine de chaque nom (contrôle gratuit du registre, affiché sur la planche) : SINA le dit tel quel.
  const domains = id.list.map((x) => (x.board?.domains ? `${x.key} « ${x.name} » : ${domainLine(x.board.domains).replace(/^Nom de domaine : /, "")}` : "")).filter(Boolean);
  if (domains.length) out.push(`Noms de domaine (contrôlés à l'instant dans le registre ; le nom de la marque reste entier, une adresse « libre » n'est garantie que par sa réservation ; ne promets jamais une adresse, et n'en invente aucune autre) : ${domains.join(" | ")}`);
  return out;
}
