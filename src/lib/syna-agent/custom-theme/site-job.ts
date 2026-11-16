/**
 * Le site du client, créé par SINA EN UNE FOIS (lot 4, 16 novembre 2026). Règles du propriétaire : « SINA le conçoit pour
 * cette marque, pas en copier-coller, et il doit être bon du premier coup » ; le client voit son site fini, jamais un
 * modèle ni un catalogue ; un seul accord pour toute l'étape (décision du lot 2).
 *
 * Un outil (site.create), une carte d'accord, une tâche de fond reprenable (« syna.site ») :
 *  1) la conception de tout le site (stratégie, parcours de chaque page, pièces du thème unique, tenue de la marque),
 *     relue par un directeur commercial et par un juge de l'originalité, séparés du concepteur ;
 *  2) une fiche par produit et le menu, calculés depuis le catalogue (sans IA) ;
 *  3) le montage à la marque : plan des textes, textes, relecture, photos (les siennes d'abord, puis celles créées par
 *     OpenAI, chacune relue), regards en image sur téléphone ;
 *  4) le site devient la version active du moteur des thèmes, quand rien n'y reste « à compléter » : c'est elle que le
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
import { clientImages, COPY_REVIEW_CAP_MICRO, MAX_COPY_FIXES, MAX_PHOTO_FIXES, PHOTO_REVIEW_CAP_MICRO, runCustomBrandJob, SECTION_TEXT_CAP_MICRO, SITE_PLAN_CAP_MICRO, type CustomBrandPayload } from "./brand";
import { DESIGN_CALLS_MAX, DESIGN_CAP_MICRO, DESIGN_TYPICAL_MICRO } from "./design";
import { galleryCheckMaxMicro } from "./gallery";
import { installCustomTheme } from "./install";
import { LOOK_CAP_MICRO, LOOK_PAGES_MAX, LOOK_TYPICAL_MICRO } from "./looks";
import { proposeMenu, validMenu } from "./menu";
import { ORIGINALITY_CALLS_MAX, ORIGINALITY_CAP_MICRO, ORIGINALITY_TYPICAL_MICRO } from "./originality";
import { menuProducts } from "./render";
import { isTenueSection } from "./tenue";
import { libSection } from "./library";
import { allSections, applyStructure, checkCustomTheme, loadCustomTheme, MAX_PRODUCT_PAGES, saveCustomTheme, type CustomTheme } from "./theme";
import { buildKnowledge, buildTool, COPY_FIXES_TYPICAL, COPY_REVIEW_TYPICAL_MICRO, customPhotoDeps, designKnowledge, keepWork, PHOTO_FIX_TYPICAL_MICRO, PHOTO_REVIEW_TYPICAL_MICRO, photoUnit, runDesign, SECTION_TEXT_TYPICAL_MICRO, SITE_PLAN_TYPICAL_MICRO, siteKind, type BuildArgs, type DesignRun } from "./tools";

export const SINA_SITE_JOB = "syna.site";
export type SitePayload = { projectId: string; userId: string; conversationId: string; runId: string; capMicro: number; consigne?: string | null };

/**
 * Taille d'un site AVANT sa conception (le devis est annoncé avant tout appel payant) : le nombre de sections à écrire
 * et de photos à créer n'est connu qu'une fois le site conçu. Le devis prend donc une taille haute ; le plafond annoncé
 * n'est jamais dépassé, et le coût réel est dit à la fin.
 */
export function siteSizeGuess(o: { business: "products" | "services"; products: number }): { sections: number; sectionsUsual: number; photos: number; photosUsual: number } {
  const fiches = o.business === "products" ? Math.min(Math.max(0, o.products - 1), MAX_PRODUCT_PAGES - 1) : 0;
  const base = o.business === "services" ? 44 : 48;
  return { sections: base + fiches * 8, sectionsUsual: (o.business === "services" ? 30 : 34) + fiches * 7, photos: 16, photosUsual: 10 };
}

/** Devis de la création du site entier, en une fois. */
export function siteQuote(o: { business: "products" | "services"; products: number }): CostEstimate & { sections: number; photos: number } {
  const g = siteSizeGuess(o);
  const unit = (customPhotoDeps.unit ?? photoUnit)();
  if (unit == null) throw new Error(L("Aucun modèle d'images utilisable pour les photos du site.", "No usable image model."));
  const check = galleryCheckMaxMicro();
  const design = { max: DESIGN_CAP_MICRO * DESIGN_CALLS_MAX + ORIGINALITY_CAP_MICRO * ORIGINALITY_CALLS_MAX + designKnowledge(true).max, usual: DESIGN_TYPICAL_MICRO + ORIGINALITY_TYPICAL_MICRO + designKnowledge(true).usual };
  const fixes = Math.min(MAX_COPY_FIXES, g.sections), artFixes = Math.min(MAX_PHOTO_FIXES, g.photos);
  const books = buildKnowledge({ sections: g.sections, fixes, fixesUsual: COPY_FIXES_TYPICAL, review: true, briefCalls: 0, artReview: true, artFixes });
  const booksUsual = buildKnowledge({ sections: g.sectionsUsual, fixes: COPY_FIXES_TYPICAL, fixesUsual: COPY_FIXES_TYPICAL, review: true, briefCalls: 0, artReview: true, artFixes: 1 });
  const max = design.max + SITE_PLAN_CAP_MICRO + g.sections * SECTION_TEXT_CAP_MICRO + COPY_REVIEW_CAP_MICRO + fixes * SECTION_TEXT_CAP_MICRO
    + PHOTO_REVIEW_CAP_MICRO + artFixes * SECTION_TEXT_CAP_MICRO + LOOK_CAP_MICRO * LOOK_PAGES_MAX + books.max + g.photos * (unit + check);
  const usual = design.usual + SITE_PLAN_TYPICAL_MICRO + g.sectionsUsual * SECTION_TEXT_TYPICAL_MICRO + COPY_REVIEW_TYPICAL_MICRO + COPY_FIXES_TYPICAL * SECTION_TEXT_TYPICAL_MICRO
    + PHOTO_REVIEW_TYPICAL_MICRO + PHOTO_FIX_TYPICAL_MICRO + LOOK_TYPICAL_MICRO * LOOK_PAGES_MAX + booksUsual.usual + Math.round(g.photosUsual * (unit * 0.8 + check * 0.5));
  return { maxMicro: max, probableMicro: Math.min(usual, max), sections: g.sections, photos: g.photos,
    label: L("ton site entier, créé pour ta marque : sa conception, toutes ses pages, tous ses textes relus, ses photos créées et relues, puis mon regard sur le résultat", "your whole site, designed and built for your brand") };
}

const kindOf = (ctx: ToolContext) => { const k = siteKind(ctx); return { business: k.business, products: k.products ?? 1 }; };

type CreateArgs = { consigne?: string; refaire?: boolean };
export const siteCreateTool: AgentTool<CreateArgs> = {
  name: "site.create", module: "site", kind: "generate", needsProject: true,
  description: "Étape du site (PAYANT : un seul prix annoncé, un seul accord écrit du client) : tu CRÉES TOUT SON SITE en une fois, pour sa marque. Tu le conçois (le parcours du visiteur sur chaque page, les pièces qui conviennent à son métier, l'allure tirée de sa planche de marque : titres, boutons, cadres des photos, un signe pris sur son produit ou son métier), tu donnes sa fiche à chaque produit, tu calcules le menu, tu écris tous les textes dans l'angle qu'il a choisi, tu les relis, tu poses ses photos là où elles vont et tu crées celles qui manquent, puis tu regardes le résultat en image sur téléphone. Tâche de fond de 20 à 40 minutes : tu restes disponible pendant ce temps. À lancer quand la marque, l'angle et l'activité (produits ou prestations, coordonnées) sont validés. consigne : ce que le client a dit vouloir pour son site, avec ses mots. refaire:true seulement s'il demande de refaire tout le site (payant, même prix). Il ne choisit ni thème, ni famille, ni concept : tu ne lui montres jamais de modèle.",
  args: z.object({ consigne: z.string().max(1500).optional(), refaire: z.boolean().optional() }).strict(),
  estimate: (ctx) => siteQuote(kindOf(ctx)),
  preview: () => L("Ton site entier, créé pour ta marque.", "Your whole site, built for your brand."),
  run: (ctx, a) => {
    const p = project(ctx);
    const j = journeyOf(ctx.conversationId);
    if (j.steps[4]?.status !== "done") return { ok: false, summary: L("L'angle doit être choisi avant le site.", "Choose the angle first.") };
    if (j.steps[5]?.status !== "done") return { ok: false, summary: L("L'activité (produits ou prestations, coordonnées) doit être validée avant le site.", "Validate the activity first."), hint: "Finis d'abord l'étape de l'activité avec le client." };
    if (pendingJob(p.id, SINA_SITE_JOB)) return { ok: false, summary: L("Ton site est déjà en cours de création : attends-le.", "Your site is already being created.") };
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
export const siteJobDeps: { design?: (ctx: ToolContext, a: { consigne?: string; jobId: string }) => Promise<DesignRun>; build?: (ctx: JobContext) => Promise<unknown>; estimate?: (ctx: ToolContext, a: BuildArgs) => CostEstimate } = {};

/** Compte rendu de la création du site, gardé dans le parcours (SINA le relit en entier) ; la tâche en rend l'essentiel. */
export type SiteReport = {
  pages: string[];
  concept: string | null;
  signe: string | null;
  aRevoir: string[];
  montage: Record<string, unknown> | null;
  /** Le site est-il devenu la version active du moteur des thèmes (prête à être mise en ligne ou envoyée en boutique) ? */
  pret: boolean;
  aCompleter: string[];
  photosPagesLimitees: string[] | null;
};
const short = (v: unknown, n: number) => (typeof v === "string" ? v.slice(0, n) : v);
/** L'essentiel du compte rendu du montage (textes, photos, relectures, regards), sans ses longueurs. */
function montageSummary(m: unknown): Record<string, unknown> | null {
  if (!m || typeof m !== "object") return null;
  const r = m as Record<string, unknown>, out: Record<string, unknown> = {};
  for (const k of ["sections", "failedEdits", "photosMade", "photosReal", "photosClient", "photosToProvide", "photosLeft", "photosFailed", "relecture", "relecturePhotos", "regards"]) if (r[k] != null) out[k] = r[k];
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
    const r = await (siteJobDeps.design ?? ((c, x) => runDesign(c, x, { kind: "full" })))(tc, { consigne: a.consigne ?? undefined, jobId: ctx.job.id });
    if (!r.ok) return { ok: false as const, why: r.result.summary };
    return { ok: true as const, t: r.t, concept: r.d.concept ?? null, signe: r.d.tenue?.signe ?? null, left: r.left };
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
  const real = await ctx.step("site:quote", async () => { const est = await (siteJobDeps.estimate ?? buildTool.estimate!)(tc, args); return est.maxMicro; });
  const tight = real > left();
  const sub: CustomBrandPayload = { projectId: p.id, capMicro: jobSpentMicro(ctx.job.id) + Math.min(real, left()), conversationId: a.conversationId, photos: true, newPhotos: true,
    pages: tight ? ["home", selling] : null, images: args.images, clientAssets: own, rewrite: false, consigne: a.consigne ?? null };
  const child = Object.create(ctx, { payload: { get: () => sub } }) as JobContext;
  let montage: unknown = null;
  try { montage = await (siteJobDeps.build ?? runCustomBrandJob)(child); }
  catch (e) { if (e instanceof CostCapReached) montage = { problems: [L("plafond annoncé atteint : le montage s'est arrêté là", "announced cap reached")] }; else throw e; }

  // 4) Le site devient la version active du moteur des thèmes, si rien d'inventé ni d'exemple n'y reste.
  ctx.progress(0.97, L("Dernières vérifications", "Final checks"));
  const install = await ctx.step("site:install", async () => {
    try { const r = installCustomTheme(p.id, { activate: true }); return r.ok ? { ok: true as const, notes: r.notes } : { ok: false as const, blocking: r.blocking }; }
    catch (e) { return { ok: false as const, blocking: [(e as Error).message.slice(0, 200)] }; }
  });
  const t = loadCustomTheme(p.id)!;
  const report: SiteReport = {
    pages: t.pages.map((pg) => `${pg.label} (${pg.sections.length})`),
    concept: short(designed.concept, 400) as string | null, signe: designed.signe, aRevoir: designed.left.slice(0, 8).map((x) => x.slice(0, 220)), montage: montageSummary(montage),
    pret: install.ok, aCompleter: install.ok ? [] : install.blocking.slice(0, 30).map((x) => x.slice(0, 200)),
    photosPagesLimitees: tight ? sub.pages! : null,
  };
  try { updateJourney(a.conversationId, (x) => { x.site = { report, at: Date.now() }; setStep(x, 6, "review", L("site créé, à regarder avec le client", "site created")); }); } catch { /* fil supprimé */ }
  notify(p.userId, p.id, L("Ton site est créé", "Your site is created"), L("SINA te le montre dans la conversation.", "SINA shows it in the conversation."), "success");
  // La tâche rend l'essentiel (son résultat est coupé dans le fil) ; le compte rendu entier est dans le parcours.
  return { pages: report.pages, pret: report.pret, aCompleter: report.aCompleter.length, compteRendu: "dans le parcours (étape du site)" };
}
