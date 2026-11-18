/**
 * Le site du client, créé par SINA EN UNE FOIS (lot 4, 16 novembre 2026). Règles du propriétaire : « SINA le conçoit pour
 * cette marque, pas en copier-coller, et il doit être bon du premier coup » ; le client voit son site fini, jamais un
 * modèle ni un catalogue ; un seul accord pour toute l'étape (décision du lot 2).
 *
 * Un outil (site.create), une carte d'accord, une tâche de fond reprenable (« syna.site ») :
 *  1) la conception de tout le site (stratégie, parcours et partition de chaque page, pièces du thème unique, tenue de
 *     la marque), relue et corrigée par le juge de l'ordre (le directeur commercial), revérifiée par un second regard
 *     qui ne corrige pas, et jugée pour son originalité : trois regards séparés du concepteur. Une page qui enfreint
 *     une règle est reprise ICI, avant le montage : aucun texte n'est écrit, aucune image n'est créée avant la fin de
 *     cette étape (les étapes 2 et 3 ne commencent qu'une fois « site:design » rendue) ;
 *  2) une fiche par produit et le menu, calculés depuis le catalogue (sans IA) ;
 *  3) le montage à la marque : plan des textes, textes, relecture, photos (les siennes d'abord, puis celles créées par
 *     OpenAI, chacune relue), regards en image sur téléphone ;
 *  4) le contrôle par l'image (controle-image.ts, 17 novembre 2026) : l'accueil, capturé sur téléphone et ordinateur,
 *     est comparé aux derniers sites du Studio ; trop proche, il est corrigé sans IA ; si rien ne suffit, il n'est pas
 *     présenté comme fini, et c'est dit en tête du compte rendu ;
 *  5) le site devient la version active du moteur des thèmes, quand rien n'y reste « à compléter » : c'est elle que le
 *     Studio met en ligne ou envoie vers la boutique du client.
 * Les familles de sections restent en coulisses : le client ne choisit ni famille, ni concept, ni thème.
 */
import { z } from "zod";
import { one } from "../../db";
import type { User } from "../../auth";
import { L } from "../../i18n-server";
import { enqueue, pendingJob, UserFacingError, type JobContext } from "../../jobs";
import { listProducts } from "../../products/catalog";
import { loadProject, notify } from "../../projects";
import { CostCapReached } from "../../ai/trace";
import { jobSpentMicro } from "../budget";
import { journeyOf, setStep, updateJourney } from "../journey";
import type { AgentTool, CostEstimate, ToolContext } from "../types";
import { project } from "../tools/common";
import { clientImages, productSlotSection, COPY_REVIEW_CAP_MICRO, MAX_COPY_FIXES, MAX_PHOTO_FIXES, PHOTO_REVIEW_CAP_MICRO, runCustomBrandJob, SECTION_TEXT_CAP_MICRO, SITE_PLAN_CAP_MICRO, type CustomBrandPayload } from "./brand";
import { galleryCheckMaxMicro } from "./gallery";
import { installCustomTheme } from "./install";
import { LOOK_CAP_MICRO, LOOK_PAGES_MAX, LOOK_TYPICAL_MICRO } from "./looks";
import { proposeMenu, validMenu } from "./menu";
import { menuProducts } from "./render";
import { isTenueSection, tenueSection } from "./tenue";
import { libSection } from "./library";
import { allSections, applyStructure, checkCustomTheme, loadCustomTheme, MAX_PRODUCT_PAGES, saveCustomTheme, type CustomTheme } from "./theme";
import { momentsTenables, piecesPossibles, type OrdreFacts } from "./ordre";
import { MIN_SECTIONS_IMPORTANTE, TYPES_ACCUEIL, partitionsPermises, typesAccueilPermis, type PageKind } from "./partitions";
import type { PreuveId } from "./tenue-ordre";
import { refusSansPreuves } from "./preuves";
import { lignePhotosAImporter, photosProduitsRepondu, rappelCarte, refusSansPhotosProduits } from "./photos-produits";
import { clientNotes } from "./site-facts";
import { controleParImage, ligneControle, type ControleImage } from "./controle-image";
import { SEUIL } from "./ressemblance";
import { dossierPreuves, preuvesRepondues, buildKnowledge, buildTool, COPY_FIXES_TYPICAL, COPY_REVIEW_TYPICAL_MICRO, customPhotoDeps, designCost, keepWork, PHOTO_FIX_TYPICAL_MICRO, PHOTO_REVIEW_TYPICAL_MICRO, photoUnit, runDesign, SECTION_TEXT_TYPICAL_MICRO, SITE_PLAN_TYPICAL_MICRO, siteKind, type BuildArgs, type DesignRun } from "./tools";

export const SINA_SITE_JOB = "syna.site";
export type SitePayload = { projectId: string; userId: string; conversationId: string; runId: string; capMicro: number; consigne?: string | null };

/**
 * Taille d'un site AVANT sa conception (le devis est annoncé avant tout appel payant) : le nombre de sections à écrire
 * et de photos à créer n'est connu qu'une fois le site conçu. Le devis prend donc une taille haute ; le plafond annoncé
 * n'est jamais dépassé, et le coût réel est dit à la fin.
 *
 * Depuis le 17 novembre 2026, la taille se CALCULE d'après les partitions du cahier « ordre et variété » (partitions.ts)
 * au lieu d'être écrite à la main (44 et 48 sections au plus dataient d'avant « minimum 10 sections par page ») :
 *  - au plus : pour chaque page importante, la partition la plus longue que ce genre de site peut tenir avec un dossier
 *    complet (toutes les preuves) ; sur l'accueil et la page qui vend, une pièce de plus (la pièce signature, une pièce
 *    propre au produit ou au métier) ;
 *  - d'ordinaire : ce que la page porte de pièces réelles avec un dossier ordinaire (le profil, sans avis, sans chiffres,
 *    sans équipe), jamais moins que le minimum bloquant de dix sur l'accueil et la fiche produit ;
 *  - les photos : celles des pièces de ces pages (leur trait), sans les photos que le client seul peut donner ni les
 *    emplacements de ses produits ;
 *  - les pages utilitaires et la coque, comptées une à une (voir FIXES).
 */
const DOSSIER_COMPLET: PreuveId[] = ["avis", "realisations", "qualifications", "anciennete", "chiffres", "presse", "documents", "equipe", "clients", "avant-apres", "offre-visite", "delais", "annulation", "privatisation", "reseaux", "horaires", "adresse", "acces"];
const DOSSIER_ORDINAIRE: PreuveId[] = ["horaires"];
/**
 * Hors pages importantes. Services : réserver ou demander un devis (1, 2 au plus), « bien reçu » (1), informations
 * légales (1), page introuvable (1), en-tête et pied (2), et au plus un bandeau et une fenêtre (2). Boutique : panier
 * (1), compte (1), informations légales (1), page introuvable (1), en-tête et pied (2), et au plus un bandeau, le
 * panier de côté et une fenêtre (3). Photos : celle de la page introuvable, et au plus celle du rendez-vous.
 */
const FIXES = { services: { max: 9, usual: 6, photosMax: 2, photosUsual: 1 }, products: { max: 9, usual: 7, photosMax: 1, photosUsual: 1 } } as const;
const median = (list: number[]) => { const s = [...list].sort((a, b) => a - b); return s.length ? s[Math.floor((s.length - 1) / 2)] : 0; };
const photosDe = (ids: string[], business: "products" | "services") => ids.reduce((n, id) => { const s = tenueSection(id); return n + (!s || s.authentic || (business === "products" && productSlotSection(s)) ? 0 : s.trait.photos ?? 0); }, 0);
/** Une page importante de ce genre de site : sections et photos, au plus et d'ordinaire, d'après ses partitions. */
export function pageSizeGuess(kind: PageKind, o: { business: "products" | "services"; products: number }): { sections: number; sectionsUsual: number; photos: number; photosUsual: number } {
  const types = o.business === "services" ? TYPES_ACCUEIL.filter((t) => t.business.includes("services")).map((t) => t.id) : typesAccueilPermis({ business: "products", products: o.products });
  const list = partitionsPermises(kind, { types, business: o.business });
  const facts = (preuves: PreuveId[]): OrdreFacts => ({ business: o.business, products: o.products, types, mobile: false, zoneConnue: true, preuves: new Set(preuves) });
  const full = list.map((p) => ({ moments: momentsTenables(p, facts(DOSSIER_COMPLET)).length, pieces: piecesPossibles(p, facts(DOSSIER_COMPLET)) }));
  // Une partition que ce genre de site ne sait pas monter (la fiche d'un bien sans agence, la carte sans restaurant)
  // ne compte pas dans l'ordinaire : seules comptent celles qui tiennent au moins la moitié du minimum.
  const all = list.map((p) => piecesPossibles(p, facts(DOSSIER_ORDINAIRE))), able = all.filter((x) => x.length >= MIN_SECTIONS_IMPORTANTE / 2);
  const plain = able.length ? able : all;
  const vend = kind === "accueil" || kind === "fiche" || kind === "prestation";
  const sections = Math.max(0, ...full.map((x) => x.moments)) + (vend ? 1 : 0);
  const floor = kind === "accueil" || kind === "fiche" ? MIN_SECTIONS_IMPORTANTE : 0;
  return {
    sections, sectionsUsual: Math.min(sections, Math.max(floor, median(plain.map((x) => x.length)))),
    photos: Math.max(0, ...full.map((x) => photosDe(x.pieces, o.business))), photosUsual: median(plain.map((x) => photosDe(x, o.business))),
  };
}
/** Les pages importantes d'un site de ce genre (les réalisations d'un artisan ne sont pas une page obligatoire : non comptées). */
export const pagesImportantes = (o: { business: "products" | "services"; products: number }): PageKind[] => (o.business === "services" ? ["accueil", "prestation", "a-propos", "contact", "questions"] : ["accueil", "fiche", ...(o.products > 1 ? ["boutique" as const] : []), "a-propos", "contact", "questions"]);
export function siteSizeGuess(o: { business: "products" | "services"; products: number }): { sections: number; sectionsUsual: number; photos: number; photosUsual: number } {
  const fiches = o.business === "products" ? Math.min(Math.max(0, o.products - 1), MAX_PRODUCT_PAGES - 1) : 0;
  const fixes = FIXES[o.business];
  const out = { sections: fixes.max, sectionsUsual: fixes.usual, photos: fixes.photosMax, photosUsual: fixes.photosUsual };
  for (const kind of pagesImportantes(o)) {
    const g = pageSizeGuess(kind, o), times = kind === "fiche" ? 1 + fiches : 1;
    out.sections += g.sections * times; out.sectionsUsual += g.sectionsUsual * times;
    // Les photos de la fiche produit sont comptées UNE fois : c'est le budget de TOUTES les fiches ensemble. Depuis le
    // 17 novembre 2026 le concepteur le sait (photo-budget.ts) : une pièce à photo de la fiche compte une fois par fiche.
    out.photos += g.photos; out.photosUsual += g.photosUsual;
  }
  return out;
}

/** Le plafond d'une création de site : le prix probable multiplié par ce nombre (le prix probable et sa moitié). */
export const MARGE_PLAFOND_SITE = 1.5;
/** Devis de la création du site entier, en une fois. */
export function siteQuote(o: { business: "products" | "services"; products: number }): CostEstimate & { sections: number; photos: number } {
  return siteQuoteFor(siteSizeGuess(o));
}
/** Le devis d'un site d'une taille donnée (sections à écrire et photos à créer, au plus et d'ordinaire). */
export function siteQuoteFor(g: ReturnType<typeof siteSizeGuess>): CostEstimate & { sections: number; photos: number } {
  const unit = (customPhotoDeps.unit ?? photoUnit)();
  if (unit == null) throw new Error(L("Aucun modèle d'images utilisable pour les photos du site.", "No usable image model."));
  const check = galleryCheckMaxMicro();
  // La conception : le concepteur, le juge de l'ordre, au plus une reprise, le second regard (deux avis au plus) et le
  // juge de l'originalité (deux avis au plus), avec la lecture de leurs cahiers.
  const design = designCost(true);
  const fixes = Math.min(MAX_COPY_FIXES, g.sections), artFixes = Math.min(MAX_PHOTO_FIXES, g.photos);
  const books = buildKnowledge({ sections: g.sections, fixes, fixesUsual: COPY_FIXES_TYPICAL, review: true, briefCalls: 0, artReview: true, artFixes });
  const booksUsual = buildKnowledge({ sections: g.sectionsUsual, fixes: COPY_FIXES_TYPICAL, fixesUsual: COPY_FIXES_TYPICAL, review: true, briefCalls: 0, artReview: true, artFixes: 1 });
  const max = design.max + SITE_PLAN_CAP_MICRO + g.sections * SECTION_TEXT_CAP_MICRO + COPY_REVIEW_CAP_MICRO + fixes * SECTION_TEXT_CAP_MICRO
    + PHOTO_REVIEW_CAP_MICRO + artFixes * SECTION_TEXT_CAP_MICRO + LOOK_CAP_MICRO * LOOK_PAGES_MAX + books.max + g.photos * (unit + check);
  const usual = design.usual + SITE_PLAN_TYPICAL_MICRO + g.sectionsUsual * SECTION_TEXT_TYPICAL_MICRO + COPY_REVIEW_TYPICAL_MICRO + COPY_FIXES_TYPICAL * SECTION_TEXT_TYPICAL_MICRO
    + PHOTO_REVIEW_TYPICAL_MICRO + PHOTO_FIX_TYPICAL_MICRO + LOOK_TYPICAL_MICRO * LOOK_PAGES_MAX + booksUsual.usual + Math.round(g.photosUsual * (unit * 0.8 + check * 0.5));
  // Le plafond annoncé : le prix probable et sa moitié, jamais le pire cas de tout à la fois (décision du propriétaire du
  // 18 novembre 2026 : « l'écart de prix annoncé par SINA est beaucoup trop large et fait même peur le plus haut » ; mesuré
  // sur les trois premiers sites : 5,30 €, 7,25 € et 11,98 €, pour des plafonds annoncés jusqu'à 34 €). La création tient
  // ce plafond : elle économise sur la fin du travail (les relectures, puis les photos des pages secondaires).
  const plafond = Math.min(max, Math.round(usual * MARGE_PLAFOND_SITE));
  return { maxMicro: Math.max(plafond, Math.min(usual, max)), probableMicro: Math.min(usual, max), sections: g.sections, photos: g.photos,
    label: L("ton site entier, créé pour ta marque : sa conception, toutes ses pages, tous ses textes relus, ses photos créées et relues, puis mon regard sur le résultat", "your whole site, designed and built for your brand") };
}

const kindOf = (ctx: ToolContext) => { const k = siteKind(ctx); return { business: k.business, products: k.products ?? 1 }; };

/**
 * GARDE-FOU SANS IA (deuxième essai réel, 17 novembre 2026 : à « refais tout le site », SINA a lancé la création sans
 * avoir demandé au client ses preuves, puis lui a écrit que son site n'en montrait aucune « parce que je ne t'en ai pas
 * encore demandé »). Une consigne ne suffit pas : tant que le dossier n'a aucune preuve ET que le client n'a répondu à
 * aucune question sur ses preuves (réponse notée dans la mémoire du projet), le site ne se lance pas. Le refus tombe
 * AVANT la carte de dépense (il part du devis) et de nouveau au lancement. « Je n'en ai pas » se note, puis le site se
 * crée sans preuve.
 */
export function refusPreuves(ctx: ToolContext): string | null {
  try { return refusSansPreuves({ preuves: dossierPreuves(ctx).a.length, repondu: preuvesRepondues(ctx) }); } catch { return null; }
}
/** Les produits du catalogue qui n'ont aucune photo du client (boutique seulement). */
export function produitsSansPhoto(projectId: string, business?: string | null): string[] {
  if (business === "services") return [];
  try { return listProducts(projectId).filter((x) => x.status === "active" && !x.data.images.some((i) => !!i.assetId)).map((x) => x.data.title); } catch { return []; }
}
/**
 * GARDE-FOU SANS IA (décision du propriétaire, 17 novembre 2026 : « elle lui dit qu'elle peux monter le site mais qu'elle
 * devra importer ses photos par la suite »). Pour une boutique dont un produit n'a pas de photo, le site ne se lance pas
 * tant que SINA n'a pas prévenu le client et noté sa réponse (note de mémoire, même mécanisme que les preuves). Le refus
 * tombe AVANT la carte de dépense (il part du devis) et de nouveau au lancement. S'il envoie ses photos, elles sont
 * posées sur les produits avant la création, et plus rien n'est demandé.
 */
export function refusPhotosProduits(ctx: ToolContext): string | null {
  try { const p = project(ctx); return refusSansPhotosProduits({ sans: produitsSansPhoto(p.id, p.business), repondu: photosProduitsRepondu(clientNotes(p.id)) }); } catch { return null; }
}
/** Refus d'un outil pendant son devis, pour SINA seule : le client ne le lit pas. */
export class RefusInterne extends Error { readonly internal = true; }

type CreateArgs = { consigne?: string; refaire?: boolean };
export const siteCreateTool: AgentTool<CreateArgs> = {
  name: "site.create", module: "site", kind: "generate", needsProject: true,
  description: "Étape du site (PAYANT : un seul prix annoncé, un seul accord écrit du client) : tu CRÉES TOUT SON SITE en une fois, pour sa marque. Tu le conçois (le parcours du visiteur sur chaque page, les pièces qui conviennent à son métier, l'allure tirée de sa planche de marque : titres, boutons, cadres des photos, un signe pris sur son produit ou son métier), tu donnes sa fiche à chaque produit, tu calcules le menu, tu écris tous les textes dans l'angle qu'il a choisi, tu les relis, tu poses ses photos là où elles vont et tu crées celles qui manquent, puis tu regardes le résultat en image sur téléphone. Tâche de fond de 20 à 40 minutes : tu restes disponible pendant ce temps. À lancer quand la marque, l'angle et l'activité (produits ou prestations, coordonnées) sont validés. consigne : ce que le client a dit vouloir pour son site, avec ses mots. refaire:true seulement s'il demande de refaire tout le site (payant, même prix). Il ne choisit ni thème, ni famille, ni concept : tu ne lui montres jamais de modèle.",
  args: z.object({ consigne: z.string().max(1500).optional(), refaire: z.boolean().optional() }).strict(),
  estimate: (ctx) => { const refus = refusPreuves(ctx) ?? refusPhotosProduits(ctx); if (refus) throw new RefusInterne(refus); return siteQuote(kindOf(ctx)); },
  // La carte de dépense rappelle, en une ligne, que le site se monte sans les photos des produits (le client a été prévenu).
  preview: (ctx) => { const sans = (() => { try { const p = project(ctx); return produitsSansPhoto(p.id, p.business); } catch { return []; } })(); return [L("Ton site entier, créé pour ta marque.", "Your whole site, built for your brand."), rappelCarte(sans)].filter(Boolean).join(" "); },
  run: (ctx, a) => {
    const p = project(ctx);
    const j = journeyOf(ctx.conversationId);
    if (j.steps[4]?.status !== "done") return { ok: false, summary: L("L'angle doit être choisi avant le site.", "Choose the angle first.") };
    if (j.steps[5]?.status !== "done") return { ok: false, summary: L("L'activité (produits ou prestations, coordonnées) doit être validée avant le site.", "Validate the activity first."), hint: "Finis d'abord l'étape de l'activité avec le client." };
    if (pendingJob(p.id, SINA_SITE_JOB)) return { ok: false, summary: L("Ton site est déjà en cours de création : attends-le.", "Your site is already being created.") };
    const refus = refusPreuves(ctx) ?? refusPhotosProduits(ctx);
    if (refus) return { ok: false, internal: true, summary: refus };
    const cur = loadCustomTheme(p.id);
    if (cur && allSections(cur).some((x) => x.s.clientTexts) && !a.refaire) return { ok: false, summary: L("Le site est déjà créé.", "The site already exists."), hint: "Pour une retouche : custom.section puis custom.edit. Pour tout refaire (payant, à la demande du client seulement) : site.create avec refaire:true et sa consigne." };
    const quote = siteQuote(kindOf(ctx));
    const round = (cur?.rev ?? 0) + 1;
    const payload: SitePayload = { projectId: p.id, userId: ctx.user.id, conversationId: ctx.conversationId, runId: ctx.runId, capMicro: quote.maxMicro, consigne: a.consigne?.trim() || null };
    const job = enqueue({ userId: ctx.user.id, projectId: p.id, type: SINA_SITE_JOB, label: L("Ton site (SINA)", "Your site (SINA)"), payload, maxAttempts: 2, idempotencyKey: `syna:${ctx.runId}:site:${round}` });
    updateJourney(ctx.conversationId, (x) => setStep(x, 6, "doing"));
    return { ok: true, jobs: [job.id], data: { plafondMicro: quote.maxMicro },
      summary: L("Création de ton site lancée (20 à 40 minutes : je le conçois pour ta marque, j'écris et je relis chaque page, je crée les photos qui manquent, puis je regarde le résultat sur téléphone). Je reprends quand c'est prêt.", "Creating your site (20 to 40 minutes)."),
      hint: "Pendant la création, reste disponible : réponds au client, et profite de l'attente pour lui demander ce qui manquerait à son site (une information encore inconnue : un prix, un délai, ses horaires, sa zone). N'annonce jamais que le site est prêt avant la fin de la tâche." };
  },
};

/** Remplaçables par les tests (aucun appel réel). */
export const siteJobDeps: { design?: (ctx: ToolContext, a: { consigne?: string; jobId: string; photoBudget?: number }) => Promise<DesignRun>; build?: (ctx: JobContext) => Promise<unknown>; estimate?: (ctx: ToolContext, a: BuildArgs) => CostEstimate; image?: typeof controleParImage } = {};

/** Compte rendu de la création du site, gardé dans le parcours (SINA le relit en entier) ; la tâche en rend l'essentiel. */
export type SiteReport = {
  /**
   * En tête du compte rendu, seulement quand SINA n'a PAS pu regarder son site en image avant de le montrer (ou pas en
   * entier) : elle doit le dire au client, avec ces mots simples, avant tout le reste.
   */
  siteNonRegarde?: string;
  /**
   * En tête aussi, seulement quand le contrôle par l'image n'a pas pu se faire, ou quand l'accueil ressemble encore trop
   * à un site déjà fait par le Studio malgré la correction sans IA : à dire au client, avec ces mots simples.
   */
  ressemblance?: string;
  /** Le contrôle par l'image, en une ligne (comparé à combien de sites, corrigé ou non, la note du plus proche). */
  controleImage?: string;
  pages: string[];
  concept: string | null;
  signe: string | null;
  aRevoir: string[];
  montage: Record<string, unknown> | null;
  /** Le site est-il devenu la version active du moteur des thèmes (prête à être mise en ligne ou envoyée en boutique) ? */
  /** En coulisses seulement : la famille du Studio choisie d'après la planche. SINA n'en dit jamais le nom au client. */
  styleEnCoulisses?: { famille: string | null; pourquoi: string | null };
  pret: boolean;
  aCompleter: string[];
  photosPagesLimitees: string[] | null;
  /**
   * Boutique : « photos de tes produits à importer : <noms> ». Ces produits n'ont pas encore de photo du client ; rien
   * n'a été inventé à leur place (« Ta photo ici »), et le site ne part pas en boutique tant qu'elles manquent.
   */
  photosProduitsAImporter?: string;
  /**
   * Le client n'a envoyé aucune image de lui ni de son atelier : la partie qui le présente n'a pas pu être posée (jamais
   * une photo inventée). À lui dire en une phrase, et à lui demander sa photo (décision du propriétaire, 18 novembre 2026 :
   * « si il faut juste le dire au client »).
   */
  photoDuClientADemander?: string;
};
/** La phrase du compte rendu quand le client n'a envoyé aucune image (null : il en a envoyé, ou la partie est déjà posée). */
export function lignephotoDuClient(o: { imagesDuClient: number; posees: string[] }): string | null {
  const s = tenueSection("tn-fondateur");
  if (o.imagesDuClient > 0 || !s || o.posees.includes("tn-fondateur")) return null;
  return L(`la partie « ${s.title} » demande ${s.authentic ?? "ta photo"} : je ne l'invente pas, elle n'est pas sur ton site. Envoie-la-moi avec le trombone 📎 et je l'ajoute (à dire au client en une phrase, et lui demander sa photo)`,
    "the founder section needs the client's own photo: ask for it");
}
const short = (v: unknown, n: number) => (typeof v === "string" ? v.slice(0, n) : v);
/** L'essentiel du compte rendu du montage (textes, photos, relectures, regards), sans ses longueurs. */
function montageSummary(m: unknown): Record<string, unknown> | null {
  if (!m || typeof m !== "object") return null;
  const r = m as Record<string, unknown>, out: Record<string, unknown> = {};
  for (const k of ["sections", "failedEdits", "photosMade", "photosReal", "photosClient", "photosToProvide", "photosLeft", "photosFailed", "photosReprises", "photosProduitsAttendues", "photosSansProduit", "faitsPoses", "repetitions", "relecture", "relecturePhotos", "regards", "regardNonFait"]) if (r[k] != null) out[k] = r[k];
  if (Array.isArray(r.problems) && r.problems.length) out.problems = r.problems.slice(0, 12).map((x) => short(x, 220));
  return out;
}

export async function runSinaSiteJob(ctx: JobContext) {
  const a = ctx.payload as SitePayload;
  const p = loadProject(a.projectId);
  const user = one<User>("SELECT * FROM users WHERE id=?", a.userId);
  if (!user) throw new UserFacingError(L("Compte introuvable.", "Account not found."));
  const tc: ToolContext = { user, projectId: p.id, conversationId: a.conversationId, runId: a.runId, attachment: () => null };
  const left = () => Math.max(0, a.capMicro - jobSpentMicro(ctx.job.id));
  const fail = (why: string): never => {
    try { updateJourney(a.conversationId, (x) => setStep(x, 6, "todo", why.slice(0, 200))); } catch { /* fil supprimé */ }
    throw new UserFacingError(why);
  };

  // 1) Conception de tout le site : payée une seule fois (point de reprise).
  ctx.progress(0.03, L("Conception de ton site", "Designing your site"));
  const designed = await ctx.step("site:design", async () => {
    // Le concepteur reçoit le nombre de photos que le prix annoncé permet (celui du devis) : il les répartit sur les pages.
    const photoBudget = (() => { try { return siteSizeGuess(kindOf(tc)).photos; } catch { return undefined; } })();
    const r = await (siteJobDeps.design ?? ((c, x) => runDesign(c, x, { kind: "full" })))(tc, { consigne: a.consigne ?? undefined, jobId: ctx.job.id, photoBudget });
    if (!r.ok) return { ok: false as const, why: r.result.summary };
    return { ok: true as const, t: r.t, concept: r.d.concept ?? null, signe: r.d.tenue?.signe ?? null, left: r.left, famille: r.d.famille ?? null, familleWhy: r.d.familleWhy ?? null };
  });
  if (!designed.ok) return fail(designed.why);

  // 2) Le site conçu est rangé ; chaque produit reçoit sa fiche ; le menu est calculé depuis les pages et le catalogue.
  await ctx.step("site:structure", async () => {
    let t: CustomTheme = { ...designed.t, chosen: false };
    keepWork(t, loadCustomTheme(p.id));
    const products = (() => { try { return listProducts(p.id); } catch { return []; } })();
    if (p.business !== "services" && products.length >= 2) {
      try { t = applyStructure(t, [{ op: "product_pages", products: products.map((x) => ({ handle: x.handle, title: x.data.title })) }]); } catch { /* fiche commune gardée */ }
    }
    if (isTenueSection(t.header ? libSection(t.header.id) : null)) {
      const { menu } = validMenu(t, proposeMenu(t, menuProducts(p.id), p.business === "services" ? "services" : "products"));
      if (menu.length) t = applyStructure(t, [{ op: "menu", menu }]);
    }
    const blocking = checkCustomTheme(t, siteKind(tc)).filter((x) => x.level === "bloquant").map((x) => x.text);
    if (blocking.length) return { ok: false as const, why: blocking.join(" ; ") };
    saveCustomTheme(p.id, t);
    return { ok: true as const };
  }).then((r) => { if (!r.ok) fail(L(`Le site conçu ne passe pas le contrôle du Studio : ${r.why}`, "The designed site fails the Studio checks.")); });

  // 3) Montage à la marque, dans ce qui reste du plafond annoncé. Si le site conçu coûte plus que le reste, les photos
  //    sont créées d'abord pour l'accueil et la page qui vend ; les autres pages le disent.
  const own = clientImages(p.id).map((x) => x.id);
  const args: BuildArgs = { images: own.length ? "mix" : "sina", clientAssets: own };
  const selling = p.business === "services" ? "prestations" : "product";
  // Le montage reçoit tout ce qui reste du plafond annoncé. Il ne se limite à l'accueil et à la page qui vend que si même
  // son prix probable n'y tient pas (son pire cas dépasse presque toujours le plafond resserré du 18 novembre 2026 ; à
  // l'intérieur, les photos passent avant les relectures).
  const real = await ctx.step("site:quote", async () => { const est = await (siteJobDeps.estimate ?? buildTool.estimate!)(tc, args); return est.probableMicro ?? est.maxMicro; });
  const tight = real > left();
  const sub: CustomBrandPayload = { projectId: p.id, capMicro: jobSpentMicro(ctx.job.id) + left(), conversationId: a.conversationId, photos: true, newPhotos: true,
    pages: tight ? ["home", selling] : null, images: args.images, clientAssets: own, rewrite: false, consigne: a.consigne ?? null };
  const child = Object.create(ctx, { payload: { get: () => sub } }) as JobContext;
  let montage: unknown = null;
  try { montage = await (siteJobDeps.build ?? runCustomBrandJob)(child); }
  catch (e) { if (e instanceof CostCapReached) montage = { problems: [L("plafond annoncé atteint : le montage s'est arrêté là", "announced cap reached")] }; else throw e; }

  // 4) Le contrôle par l'image (règle du propriétaire : jamais deux sites qui se ressemblent à l'œil) : l'accueil est
  //    comparé aux derniers sites du Studio, corrigé sans IA s'il est trop proche. Jamais en silence : sans navigateur, ou
  //    si la correction ne suffit pas, c'est la première ligne du compte rendu.
  ctx.progress(0.95, L("Je compare ton site aux autres sites du Studio", "Comparing your site with the Studio's other sites"));
  const image = await ctx.step("site:image", async (): Promise<ControleImage> => {
    const families = (() => { try { return new Set(listProducts(p.id).flatMap((x) => x.data.categories.map((c) => c.trim()).filter(Boolean))).size; } catch { return 0; } })();
    try { return await (siteJobDeps.image ?? controleParImage)(p.id, siteKind(tc), { families }); }
    catch (e) { return { statut: "non-fait", avant: null, note: null, seuil: SEUIL, compares: 0, nonCompares: 0, changements: [], raison: `contrôle interrompu (${(e as Error).message.slice(0, 160)})` }; }
  });
  const tropProche = image.statut === "trop-proche";

  // 5) Le site devient la version active du moteur des thèmes, si rien d'inventé ni d'exemple n'y reste, et s'il ne
  //    ressemble pas trop à un autre site du Studio (sinon il n'est pas présenté comme fini).
  ctx.progress(0.97, L("Dernières vérifications", "Final checks"));
  const install = tropProche
    ? { ok: false as const, blocking: [L("ton site ressemble encore trop à un site déjà fait par le Studio pour une autre marque : il n'est pas encore fini", "your site still looks too much like another Studio site: not finished yet")] }
    : await ctx.step("site:install", async () => {
      try { const r = installCustomTheme(p.id, { activate: true }); return r.ok ? { ok: true as const, notes: r.notes } : { ok: false as const, blocking: r.blocking }; }
      catch (e) { return { ok: false as const, blocking: [(e as Error).message.slice(0, 200)] }; }
    });
  const t = loadCustomTheme(p.id)!;
  const sansPhoto = produitsSansPhoto(p.id, p.business);
  // Le regard en image : fait, fait en partie, ou pas fait du tout (montage arrêté avant, navigateur absent, réponse
  // illisible). Ce n'est jamais passé sous silence : c'est la première ligne du compte rendu que SINA relit.
  const seen = montageSummary(montage) as { regards?: { pages?: unknown[] } | null; regardNonFait?: string | null } | null;
  const unseen = seen?.regardNonFait ? seen.regardNonFait : seen?.regards?.pages?.length ? null : L("je n'ai pas pu regarder le site en image", "I could not look at the site as an image");
  const imageLigne = ligneControle(image);
  const ressemblance = tropProche
    ? L(`ton site ressemble encore trop, à l'œil, à un site déjà fait par le Studio pour une autre marque, même après mes retouches : je ne te le présente pas comme fini. À dire au client en premier, simplement, puis lui proposer de reprendre la conception de son site avec une autre direction (payant : son accord écrit avant). Détail : ${imageLigne}`, "your site still looks too much like another Studio site: tell the client first")
    : image.statut === "non-fait" ? L(`je n'ai pas pu comparer ton site en image aux autres sites du Studio (${image.raison ?? "raison inconnue"}) : à dire au client en premier`, "the site could not be compared as an image: tell the client first") : null;
  const report: SiteReport = {
    ...(unseen ? { siteNonRegarde: L(`${unseen} : à dire au client en premier, et à lui proposer de le regarder ensemble sur son téléphone`, `${unseen}: tell the client first`) } : {}),
    ...(ressemblance ? { ressemblance } : {}),
    controleImage: imageLigne,
    pages: t.pages.map((pg) => `${pg.label} (${pg.sections.length})`),
    concept: short(designed.concept, 400) as string | null, signe: designed.signe, aRevoir: [...(image.statut === "trop-proche" || image.statut === "non-fait" ? [imageLigne.slice(0, 300)] : []), ...designed.left.slice(0, 8).map((x) => x.slice(0, 220))], montage: montageSummary(montage),
    styleEnCoulisses: { famille: designed.famille, pourquoi: short(designed.familleWhy, 300) as string | null },
    pret: install.ok, aCompleter: install.ok ? [] : install.blocking.slice(0, 30).map((x) => x.slice(0, 200)),
    photosPagesLimitees: tight ? sub.pages! : null,
    ...(sansPhoto.length ? { photosProduitsAImporter: lignePhotosAImporter(sansPhoto) } : {}),
    ...((): { photoDuClientADemander?: string } => { try { const l = lignephotoDuClient({ imagesDuClient: clientImages(p.id).length, posees: allSections(t).map((x) => x.s.id) }); return l ? { photoDuClientADemander: l } : {}; } catch { return {}; } })(),
  };
  try { updateJourney(a.conversationId, (x) => { x.site = { report, at: Date.now() }; setStep(x, 6, "review", tropProche ? L("site monté, trop proche d'un autre site du Studio : pas encore fini", "site built, too close to another site") : L("site créé, à regarder avec le client", "site created")); }); } catch { /* fil supprimé */ }
  if (tropProche) notify(p.userId, p.id, L("Ton site est monté, pas encore fini", "Your site is built, not finished yet"), L("Il ressemble encore trop à un autre site du Studio : SINA t'explique dans la conversation.", "It still looks too much like another Studio site: SINA explains."), "warning");
  else notify(p.userId, p.id, L("Ton site est créé", "Your site is created"), L("SINA te le montre dans la conversation.", "SINA shows it in the conversation."), "success");
  // La tâche rend l'essentiel (son résultat est coupé dans le fil) ; le compte rendu entier est dans le parcours.
  return { pages: report.pages, pret: report.pret, aCompleter: report.aCompleter.length, controleImage: image.statut, compteRendu: "dans le parcours (étape du site)" };
}
