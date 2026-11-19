/**
 * La tâche de fond « dessiner puis coder » (syna.dessin) : le plan de l'accueil, le juge des faits, les dessins
 * (ordinateur et téléphone), les photos, le code du thème Shopify, puis les contrôles du Studio (Theme Check, affichage
 * réel sur téléphone, tablette et ordinateur). Chaque étape a son point de reprise : rien de fait n'est repayé.
 * Rien n'est posé sur le site du client : le résultat (dessins, captures, thème) est rangé dans ses fichiers.
 */
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import sharp from "sharp";
import { one } from "../../db";
import { L } from "../../i18n-server";
import { UserFacingError, type JobContext } from "../../jobs";
import { DATA_DIR } from "../../db";
import { loadProject, currentTheme, remember } from "../../projects";
import type { Project } from "../../projects";
import { assetData, assetUrl, getAsset, saveAsset } from "../../library";
import { llmJson } from "../../ai/llm";
import { withTrace } from "../../ai/trace";
import { aiSitePageMockup, aiSitePhoto, photoRequestMaxMicro, PUBLICATION_PROMPT_MAX_BYTES, withQuotedImageRoute } from "../../ai/media-providers";
import { getSetting } from "../../settings";
import type { CostEstimate } from "../types";
import { jobSpentMicro } from "../budget";
import { journeyOf } from "../journey";
import { brandBrief, photothequeDe, siteCopyModel } from "../custom-theme/brand";
import { loadCustomTheme } from "../custom-theme/theme";
import { listProducts } from "../../products/catalog";
import { educated } from "../custom-theme/knowledge";
import { mockupImageRoute } from "../mockup-code/tools";
import { chromiumPath } from "../../theme/snapshot";
import { renderPage, fontFilePath } from "../../theme/render";
import { loadThemeCheck } from "../../theme/shopify-docs";
import type { ThemeSpec } from "../../theme/spec";
import { buildSpec } from "../../theme/directions";
import { contentFromInput, libraryFiller } from "../../theme/library-fill";
import { localCopy } from "../../engine/local-copy";
import { emptyProduct } from "../../project-types";
import { appliquerJugement, morceauxSurs, nettoyerPlan, corrigerFichiers, textesDuCode, CODE_SYSTEM, CodeSchema, cheminSur, consignesDessins, demandeCode, JUGE_SYSTEM, JugementSchema, PLAN_SYSTEM, PlanSchema, slugMarque, type Identite, type PlanPage } from "./methode";

export const SINA_DESSIN_JOB = "syna.dessin";
export type DessinPayload = { projectId: string; userId: string; conversationId: string; runId: string; capMicro: number; consigne?: string | null };

/** Le modèle qui code (réglage « site.code_model ») : Sol 6.2 d'OpenAI, choisi par le propriétaire le 19 novembre 2026. */
export function codeModel(): { provider: "anthropic" | "openai" | "google"; model: string } {
  const m = /^(anthropic|openai|google):([\w.-]+)$/.exec((getSetting("site.code_model") ?? "").trim());
  return m ? { provider: m[1] as "anthropic" | "openai" | "google", model: m[2] } : { provider: "openai", model: "gpt-6.2-sol" };
}

/** Longueur de la réponse du code : assez pour un accueil entier (essai réel : environ 8 000 à 16 000 jetons). */
export const CODE_OUTPUT_TOKENS = 48_000;
/** Mesures de l'essai du 19 novembre 2026 (micro-euros), avec leur plafond. */
export const DESSIN_COUTS = {
  plan: { probable: 120_000, max: 400_000 },
  juge: { probable: 60_000, max: 300_000 },
  // Réserve prise par le Studio avant chaque dessin : 0,186 € mesuré le 19 novembre 2026 (essai réel : un plafond de
  // 0,16 € a arrêté la tâche avant le premier dessin). Le plafond suit la vraie réserve (imageMaxMicro).
  image: { probable: 115_000, max: 200_000 },
  code: { probable: 300_000, max: 900_000 },
} as const;
/** Plafond d'un dessin : la réserve que le Studio prend avant l'envoi (jamais moins), sinon la mesure. */
export function imageMaxMicro(): number {
  try { return Math.max(DESSIN_COUTS.image.max, photoRequestMaxMicro(mockupImageRoute(), { prompt: "x".repeat(PUBLICATION_PROMPT_MAX_BYTES), references: 7, aspect: "2:3", quality: "high" })); } catch { return DESSIN_COUTS.image.max; }
}
/** Nombre de photos voulues sur un accueil (essai : 9 sections, 8 photos). */
export const PHOTOS_ACCUEIL = 8;

/** Le prix de l'accueil dessiné puis codé : le plan, le juge, cinq dessins, les photos qui manquent, le code. */
export function dessinQuote(photosACreer: number): CostEstimate {
  const c = DESSIN_COUTS, images = 5 + Math.max(0, photosACreer);
  // Deux relectures du juge : le plan, puis les textes du site codé.
  const probable = c.plan.probable + 2 * c.juge.probable + images * c.image.probable + c.code.probable;
  const max = c.plan.max + 2 * c.juge.max + images * imageMaxMicro() + c.code.max;
  return { probableMicro: probable, maxMicro: Math.min(max, Math.round(probable * 1.6)), label: L("l'accueil de ton site, réfléchi, dessiné sur ordinateur et sur téléphone, puis codé et vérifié", "your home page, planned, drawn, coded and checked") };
}

/** Le nom lisible d'une police du Studio (« archivo_black_n4 » → « Archivo Black »). */
export const nomPolice = (id: string | null | undefined) => (id ?? "").replace(/_[ni]\d$/, "").split("_").filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");

/** L'identité donnée aux dessins et au code (marque, couleurs, polices, menu, coordonnées). */
export function identiteDe(p: Project): Identite {
  const b = p.brand, pal = b?.palette ?? {} as Record<string, string | undefined>;
  const t = loadCustomTheme(p.id);
  const menu = (t?.pages ?? []).filter((pg) => !/^(home|legal|404|cart|panier|search|recherche)/.test(pg.key)).map((pg) => pg.label).slice(0, 6);
  const sv = p.business === "services" ? p.services : null;
  return {
    marque: b?.name ?? p.name,
    couleurs: [pal.primary && `couleur principale ${pal.primary}`, pal.dark && `sombre ${pal.dark}`, pal.accent && `touches ${pal.accent}`, pal.light && `clair ${pal.light}`, pal.secondary && `secondaire ${pal.secondary}`].filter(Boolean).join(", "),
    polices: `Titres en ${nomPolice(b?.fonts?.heading) || "une linéale grasse"}, textes en ${nomPolice(b?.fonts?.body) || "une linéale simple"}`,
    menu: menu.length ? menu : [L("Accueil", "Home"), L("À propos", "About"), L("Contact", "Contact")],
    telephone: sv?.phone?.trim() || null, horaires: sv?.hours?.trim() || null, zone: sv?.area?.trim() || null,
    liensPied: [L("Mentions légales", "Legal notice"), L("Confidentialité", "Privacy"), L("Contact", "Contact")],
  };
}

/** Version claire du logo, sans IA : les pixels sombres passent à la couleur claire de la marque (fonds sombres). */
export async function logoClair(png: Buffer, clair = "#FFF6E0"): Promise<Buffer> {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(clair.slice(i, i + 2), 16));
  for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 0 && data[i] < 90 && data[i + 1] < 90 && data[i + 2] < 120) { data[i] = r; data[i + 1] = g; data[i + 2] = b; }
  return sharp(data, { raw: info }).png().toBuffer();
}

/** Dossier du thème d'une tâche, dans les fichiers du projet. */
export const dossierTheme = (p: Project, jobId: string) => path.join(DATA_DIR, "storage", p.userId, p.id, "dessin", jobId, "theme");

/** Réglages par défaut du thème (Shopify les crée à l'installation), sans IA. */
export function reglagesParDefaut(schemaJson: string): string {
  const cur: Record<string, unknown> = {};
  try { for (const g of JSON.parse(schemaJson)) for (const s of g.settings ?? []) if (s.id && "default" in s) cur[s.id] = s.default; } catch { /* schéma illisible : aucun réglage */ }
  return JSON.stringify({ current: cur }, null, 1);
}

export async function runDessinJob(ctx: JobContext) {
  const a = ctx.payload as DessinPayload;
  const p = loadProject(a.projectId);
  const j = (() => { try { return journeyOf(a.conversationId); } catch { return null; } })();
  const left = () => Math.max(0, a.capMicro - jobSpentMicro(ctx.job.id));
  const trace = (step: string, cap: number) => ({ jobId: ctx.job.id, projectId: p.id, step, costCapMicro: jobSpentMicro(ctx.job.id) + Math.min(cap, left()) });
  const logoId = p.brand?.logo?.assetId;
  const logoAsset = logoId ? getAsset(logoId) : null;
  if (!logoAsset) throw new UserFacingError(L("Il faut d'abord le logo de la marque.", "The brand logo is needed first."));
  const logo = assetData(logoAsset);
  const id = identiteDe(p), slug = slugMarque(id.marque);
  // L'état RÉEL des photos des produits, lu dans le catalogue (essai réel du 19 novembre 2026 : une vieille note disait les
  // photos « pas encore importées » alors qu'elles l'étaient, et l'ouverture est restée vide).
  const etatPhotos = p.business === "services" ? "" : `PHOTOS DES PRODUITS, ÉTAT ACTUEL DU CATALOGUE (fait foi, avant toute note plus ancienne) : ${listProducts(p.id).map((x) => `« ${x.data.title} » : ${x.data.images.some((im) => im.assetId) ? "a sa vraie photo (peut être mis en scène)" : "SANS photo (n'apparaît dans aucune photo ; sa carte garde « Ta photo ici »)"}`).join(" ; ")}.`;
  const dossier = [brandBrief(p, j), etatPhotos, a.consigne ? `DEMANDE DU CLIENT (ses mots, prioritaire) : « ${a.consigne} »` : ""].filter(Boolean).join("\n");

  // 1) Le plan de toute la page (le dessinateur choisit seul les 8 à 10 sections).
  ctx.progress(0.03, L("Je réfléchis à ton accueil, section par section", "Planning your home page"));
  const plan0 = await ctx.step("plan", () => withTrace(trace("dessin-plan", DESSIN_COUTS.plan.max), () =>
    llmJson({ nouvelleSiChangee: true, sansRelanceCoupee: true, task: "strategy", userId: p.userId, projectId: p.id, jobId: ctx.job.id, system: educated(PLAN_SYSTEM, "dessinateur"), promptKey: "syna-dessin-plan-1", prompt: dossier, maxTokens: 12_000, maxOutputTokens: 12_000, usageKey: `${ctx.job.id}:plan`, routing: { difficulty: "complex", prefer: siteCopyModel() } }, PlanSchema, { strict: true })));
  // 2) Le juge des faits, avant le moindre dessin payé.
  ctx.progress(0.12, L("Je relis chaque texte contre ton dossier", "Checking every fact"));
  const jugement = await ctx.step("juge", () => withTrace(trace("dessin-juge", DESSIN_COUTS.juge.max), () =>
    llmJson({ nouvelleSiChangee: true, sansRelanceCoupee: true, task: "quality_control", userId: p.userId, projectId: p.id, jobId: ctx.job.id, system: educated(JUGE_SYSTEM, "jugeDessin"), promptKey: "syna-dessin-juge-1", prompt: `DOSSIER DU PROJET :\n${dossier}\n\nPLAN À RELIRE :\n${plan0.sections.map((s, i) => `${i + 1}. « ${s.nom} » : ${s.textes.map((t) => `« ${t} »`).join(" ")}`).join("\n")}`, maxTokens: 6_000, maxOutputTokens: 6_000, usageKey: `${ctx.job.id}:juge`, routing: { difficulty: "complex" } }, JugementSchema, { strict: true })));
  const juge = appliquerJugement(plan0, jugement);
  const net = nettoyerPlan(juge.plan);
  const plan: PlanPage = net.plan;

  // 3) Les dessins : trois pour l'ordinateur, deux pour le téléphone.
  const produitsAvecPhoto = p.business === "services" ? [] : listProducts(p.id).flatMap((x) => { const ph = x.data.images.find((im) => im.assetId)?.assetId; return ph ? [{ titre: x.data.title, photo: ph }] : []; }).slice(0, 4);
  const consignes = consignesDessins(plan, id);
  const dessins: Record<string, string> = {};
  for (const [i, c] of consignes.entries()) {
    ctx.progress(0.18 + 0.32 * (i / consignes.length), L(`Je dessine ton accueil : ${i < 3 ? "ordinateur" : "téléphone"} (${i + 1} sur ${consignes.length})`, `Drawing (${i + 1}/${consignes.length})`));
    dessins[c.nom] = await ctx.step(`dessin:${c.nom}`, async () => {
      const refs: { role: "logo" | "style" | "scene"; data: Buffer }[] = c.refs.map((k) => ({ role: (k === "logo" ? "logo" : "style") as "logo" | "style", data: k === "logo" ? logo : assetData(getAsset(dessins[{ haut: "1-haut", milieu: "2-milieu", bas: "3-bas", tel1: "4-tel-haut" }[k as "haut"]])!) }));
      // Les vraies photos des produits, pour que les produits dessinés soient les vrais (essai réel du 19 novembre 2026 :
      // les sacs dessinés étaient inventés).
      const premier = refs.length + 1;
      for (const x of produitsAvecPhoto) refs.push({ role: "scene", data: assetData(getAsset(x.photo)!) });
      const prompt = produitsAvecPhoto.length ? `${c.prompt}\nLES PRODUITS : les images ${premier} à ${refs.length} sont les VRAIES photos des produits (${produitsAvecPhoto.map((x) => `« ${x.titre} »`).join(", ")}, dans cet ordre). Chaque produit dessiné est EXACTEMENT l'un d'eux : même forme, même couleur, mêmes détails ; jamais un produit inventé.` : c.prompt;
      const img = await withTrace(trace(`dessin-${c.nom}`, imageMaxMicro()), () => withQuotedImageRoute(mockupImageRoute(), () => aiSitePageMockup({ userId: p.userId, projectId: p.id, jobId: ctx.job.id, usageKey: `${ctx.job.id}:dessin:${c.nom}` }, { prompt, references: refs })));
      const asset = await saveAsset({ projectId: p.id, userId: p.userId, data: img as Buffer, name: `dessin-accueil-${c.nom}.png`, mime: "image/png", role: "dessin", origin: "generated", meta: { dessin: { jobId: ctx.job.id, morceau: c.nom } } });
      return asset.id;
    });
  }

  // 4) Les photos (décision du propriétaire du 19 novembre 2026 : « sina doit forcément faire toutes les images du site
  // en dehors de celle du produit ») : une photo CRÉÉE par section du plan, dans l'allure de son dessin ; un produit qui a
  // sa vraie photo y est mis en scène (sa photo jointe en modèle) ; un produit sans photo n'apparaît dans aucune image.
  // Les cartes des produits prennent leurs vraies photos. Une photo qui échoue prend une photo déjà faite pour la marque.
  const theme = dossierTheme(p, ctx.job.id);
  fs.mkdirSync(path.join(theme, "assets"), { recursive: true });
  const catalogue = p.business === "services" ? [] : listProducts(p.id).map((x) => ({ titre: x.data.title, photo: x.data.images.find((im) => im.assetId)?.assetId ?? null }));
  const [m1, m2] = morceauxSurs(plan);
  const voulues = plan.sections.map((s, i) => ({ s, n: i + 1 })).filter((x) => x.s.photo).slice(0, PHOTOS_ACCUEIL);
  const creees = await ctx.step("photos", async () => {
    const out: { n: number; id: string | null; description: string; produit: string | null }[] = [];
    for (const [i, { s, n }] of voulues.entries()) {
      ctx.progress(0.5 + 0.1 * (i / Math.max(1, voulues.length)), L(`Je crée les photos de ton accueil (${i + 1} sur ${voulues.length})`, `Creating photos (${i + 1}/${voulues.length})`));
      const prod = s.produit ? catalogue.find((x) => x.titre.trim().toLowerCase() === s.produit!.trim().toLowerCase() && x.photo) : undefined;
      const dessin = dessins[m1.includes(n) ? "1-haut" : m2.includes(n) ? "2-milieu" : "3-bas"];
      const refs: { role: "product" | "style"; data: Buffer }[] = [...(prod ? [{ role: "product" as const, data: assetData(getAsset(prod.photo!)!) }] : []), ...(dessin ? [{ role: "style" as const, data: assetData(getAsset(dessin)!) }] : [])];
      const aspect = n === 1 || s.format === "paysage" ? "3:2" : s.format === "portrait" ? "2:3" : "1:1";
      // Variété (essai réel : même rebord de pierre et même fenêtre sur les huit photos, la même besace trois fois).
      const deja = out.filter((o) => o.id).map((o) => `- ${o.description.slice(0, 160)}${o.produit ? ` (avec « ${o.produit} »)` : ""}`);
      const prompt = `Photo de site pour la marque « ${id.marque} », section « ${s.nom} » : ${s.photo}. ${prod ? `Le produit « ${prod.titre} » est mis en scène : UN seul exemplaire, fidèle à sa vraie photo jointe (forme, matière, détails), dans EXACTEMENT la même couleur que sur sa photo (jamais une autre teinte), entier, jamais déformé.` : "Aucun produit de la marque n'apparaît dans cette photo (un produit ne s'invente jamais)."}${deja.length ? ` PHOTOS DÉJÀ FAITES POUR CETTE PAGE (la tienne est NETTEMENT différente : un autre décor, une autre surface, un autre cadrage ou une autre distance, une autre lumière du jour ; pas la même fenêtre ni le même rebord) :\n${deja.join("\n")}\n` : ""} La photo suit l'allure de la page dessinée jointe (lumière, couleurs, ambiance) mais n'en recopie ni la mise en page ni les textes. Couleurs : ${id.couleurs}. Lumière naturelle travaillée, niveau d'une campagne haut de gamme. Aucune personne, aucun visage, aucune main. Aucun texte, aucune lettre, aucun chiffre, aucun logo.`;
      try {
        const img = await withTrace(trace(`dessin-photo-${n}`, imageMaxMicro()), () => withQuotedImageRoute(mockupImageRoute(), () => aiSitePhoto({ userId: p.userId, projectId: p.id, jobId: ctx.job.id, usageKey: `${ctx.job.id}:photo:${n}` }, { prompt, references: refs, aspect })));
        const asset = await saveAsset({ projectId: p.id, userId: p.userId, data: img as Buffer, name: `photo-accueil-section-${n}.png`, mime: "image/png", role: "site", origin: "generated", meta: { dessin: { jobId: ctx.job.id, section: n, produit: prod?.titre ?? null } } });
        out.push({ n, id: asset.id, description: s.photo!, produit: prod?.titre ?? null });
      } catch (e) { out.push({ n, id: null, description: `${s.photo} (création ratée : ${(e as Error).message.slice(0, 120)})`, produit: null }); }
    }
    return out;
  });
  const phototheque = photothequeDe(p.id, loadCustomTheme(p.id), p.business === "services" ? "services" : "products", []);
  let secours = 0;
  const photos: { fichier: string; format: string; description: string }[] = [];
  const poser = async (assetId: string, fichier: string, description: string) => {
    const ast = getAsset(assetId);
    if (!ast) return false;
    const img = sharp(assetData(ast)).rotate().resize(1600, 1600, { fit: "inside", withoutEnlargement: true });
    const meta = await img.metadata();
    fs.writeFileSync(path.join(theme, "assets", fichier), await img.webp({ quality: 82 }).toBuffer());
    photos.push({ fichier, format: `${meta.width ?? 0}x${meta.height ?? 0}`, description: description.split(". ").slice(0, 3).join(". ").slice(0, 420) });
    return true;
  };
  for (const [i, x] of catalogue.filter((x) => x.photo).entries()) await poser(x.photo!, `${slug}-produit-${i + 1}.webp`, `PHOTO DU PRODUIT « ${x.titre} » (sa vraie photo, à poser telle quelle sur la carte ou le bloc de ce produit, jamais pour une autre section)`);
  for (const c of creees) {
    const id0 = c.id ?? phototheque[secours]?.id;
    if (!c.id && id0) secours++;
    if (id0) await poser(id0, `${slug}-section-${c.n}.webp`, `PHOTO DE LA SECTION ${c.n} « ${plan.sections[c.n - 1].nom} » (${c.id ? "créée pour elle" : "photo de la marque, à défaut"}) : ${c.description}${c.produit ? ` — met en scène le produit « ${c.produit} »` : ""}`);
  }
  const logoFichier = `${slug}-logo.png`, logoClairFichier = `${slug}-logo-clair.png`;
  const logoPng = await sharp(logo).resize(600, 600, { fit: "inside", withoutEnlargement: true }).png().toBuffer();
  fs.writeFileSync(path.join(theme, "assets", logoFichier), logoPng);
  fs.writeFileSync(path.join(theme, "assets", logoClairFichier), await logoClair(logoPng, p.brand?.palette?.light ?? "#FFF6E0"));

  // 5) Le code : d'après le plan (les textes) et les dessins (l'allure).
  ctx.progress(0.6, L("J'écris le code de ton accueil", "Coding your home page"));
  const code = await ctx.step("code", () => withTrace(trace("dessin-code", DESSIN_COUTS.code.max), () =>
    llmJson({ nouvelleSiChangee: true, sansRelanceCoupee: true, task: "strategy", userId: p.userId, projectId: p.id, jobId: ctx.job.id, system: educated(CODE_SYSTEM, "codeur"), promptKey: "syna-dessin-code-1",
      prompt: demandeCode(plan, id, { photos, logo: logoFichier, logoClair: logoClairFichier, liens: "l'action principale vers la page de réservation ou de contact ; les autres pages vers /pages/<nom>." }),
      images: ["1-haut", "2-milieu", "3-bas", "4-tel-haut"].map((n) => ({ data: assetData(getAsset(dessins[n])!), label: n })),
      maxTokens: CODE_OUTPUT_TOKENS, maxOutputTokens: CODE_OUTPUT_TOKENS, usageKey: `${ctx.job.id}:code`, routing: { difficulty: "complex", prefer: codeModel() } }, CodeSchema, { strict: true })));
  let ecrits = 0;
  for (const f of code.files) {
    const rel = f.path.replace(/^\/+/, "");
    if (!cheminSur(rel) || rel.startsWith("assets/") && /\.(png|webp|jpe?g)$/.test(rel)) continue;
    fs.mkdirSync(path.dirname(path.join(theme, rel)), { recursive: true });
    fs.writeFileSync(path.join(theme, rel), f.content);
    ecrits++;
  }
  const schemaFile = path.join(theme, "config/settings_schema.json");
  if (!fs.existsSync(schemaFile)) { fs.mkdirSync(path.dirname(schemaFile), { recursive: true }); fs.writeFileSync(schemaFile, JSON.stringify([{ name: "theme_info", theme_name: id.marque, theme_version: "0.1.0", theme_author: "SINA", theme_documentation_url: "https://help.shopify.com", theme_support_url: "https://help.shopify.com" }], null, 2)); }
  // theme_info complet (essai réel : le schéma écrit par le modèle de code en oubliait deux champs, refusés par Shopify).
  try { const sch = JSON.parse(fs.readFileSync(schemaFile, "utf8")); const info = Array.isArray(sch) ? sch.find((g: { name?: string }) => g.name === "theme_info") : null; if (info) { info.theme_name ??= id.marque; info.theme_version ??= "0.1.0"; info.theme_author ??= "SINA"; info.theme_documentation_url ??= "https://help.shopify.com"; info.theme_support_url ??= "https://help.shopify.com"; fs.writeFileSync(schemaFile, JSON.stringify(sch, null, 2)); } } catch { /* schéma illisible : Theme Check le dira */ }
  if (!fs.existsSync(path.join(theme, "config/settings_data.json"))) fs.writeFileSync(path.join(theme, "config/settings_data.json"), reglagesParDefaut(fs.readFileSync(schemaFile, "utf8")));
  fs.mkdirSync(path.join(theme, "locales"), { recursive: true });
  if (!fs.existsSync(path.join(theme, "locales/fr.default.json"))) fs.writeFileSync(path.join(theme, "locales/fr.default.json"), "{}");

  // 5 bis) Le juge relit les textes du site CODÉ contre le dossier (essai réel : « Une urgence ? Appelle-moi », un
  // service jamais proposé, était passé). Ses corrections sont posées dans les fichiers du thème.
  ctx.progress(0.8, L("Je fais relire les textes du code", "Checking the coded copy"));
  const lus = fs.readdirSync(path.join(theme, "templates")).map((f) => `templates/${f}`).concat(["sections/header.liquid", "sections/footer.liquid"]).filter((f) => fs.existsSync(path.join(theme, f))).map((f) => ({ path: f, content: fs.readFileSync(path.join(theme, f), "utf8") }));
  const jugeCode = await ctx.step("juge-code", () => withTrace(trace("dessin-juge-code", DESSIN_COUTS.juge.max), () =>
    llmJson({ nouvelleSiChangee: true, sansRelanceCoupee: true, task: "quality_control", userId: p.userId, projectId: p.id, jobId: ctx.job.id, system: educated(JUGE_SYSTEM, "jugeDessin"), promptKey: "syna-dessin-juge-code-1", prompt: `DOSSIER DU PROJET :\n${dossier}\n\nTEXTES DU SITE CODÉ (section 1 pour tous ; « avant » = le passage exact à remplacer) :\n${textesDuCode(lus)}`, maxTokens: 6_000, maxOutputTokens: 6_000, usageKey: `${ctx.job.id}:juge-code`, routing: { difficulty: "complex" } }, JugementSchema, { strict: true })));
  const fichiersTheme: { path: string; content: string }[] = [];
  const walkT = (d: string) => { for (const f of fs.readdirSync(d)) { const x = path.join(d, f); if (fs.statSync(x).isDirectory()) walkT(x); else if (/\.(liquid|json)$/.test(f)) fichiersTheme.push({ path: path.relative(theme, x), content: fs.readFileSync(x, "utf8") }); } };
  walkT(theme);
  let corrigesCode = 0;
  for (const c of jugeCode.corrections) if (c.avant.trim().length > 3 && corrigerFichiers(fichiersTheme, c.avant.trim(), c.apres.trim())) corrigesCode++;
  for (const f of fichiersTheme) fs.writeFileSync(path.join(theme, f.path), f.content);

  // 6) Les contrôles du Studio, sans IA : Theme Check, puis l'affichage réel.
  ctx.progress(0.85, L("Je vérifie le code et l'affichage sur téléphone, tablette et ordinateur", "Checking the code and the display"));
  const controle = await ctx.step("controle", async () => {
    let erreurs = 0, avertissements = 0;
    const exemples: string[] = [];
    try {
      const { check } = await loadThemeCheck();
      for (const o of await check(theme)) { if (o.severity === 0) { erreurs++; if (exemples.length < 5) exemples.push(`${o.check} : ${String(o.message).slice(0, 140)}`); } else if (o.severity === 1) avertissements++; }
    } catch (e) { exemples.push(`contrôle de Shopify non fait (${(e as Error).message.slice(0, 120)})`); }
    const captures = await capturesAccueil(p, ctx.job.id, theme);
    return { erreurs, avertissements, exemples, captures };
  });

  const res = { plan: { idee: plan.idee, sections: plan.sections.map((s) => s.nom) }, juge: { corrections: juge.appliquees, ignorees: juge.ignorees, avis: jugement.avis, code: { corrections: corrigesCode, demandees: jugeCode.corrections.length, avis: jugeCode.avis } }, dessins: Object.values(dessins), photosCreees: creees.filter((c) => c.id).length, photosSecours: secours, fichiers: ecrits, notes: code.notes, controle };
  remember(p.id, { kind: "artifact", key: `syna.dessin.${ctx.job.id}`, value: JSON.stringify(res), source: "local", origin: "system" as never });
  ctx.progress(1, L("Terminé", "Done"));
  return res;
}

/**
 * Les données de boutique de l'aperçu (nom, couleurs, coordonnées, langue) : celles du site actuel s'il en a une
 * version, sinon fabriquées depuis le projet. L'accueil codé porte ses propres textes : seules ces données-là servent.
 */
export function specApercu(p: Project): ThemeSpec | undefined {
  const cur = currentTheme(p.id)?.spec as ThemeSpec | undefined;
  if (cur) return cur;
  try {
    const name = p.brand?.name ?? p.name, pal: Record<string, string | undefined> = p.brand?.palette ?? {};
    const palette = { primary: pal.primary ?? "#222222", secondary: pal.secondary ?? "#EEEEEE", accent: pal.accent ?? pal.primary ?? "#222222", light: pal.light ?? "#FFFFFF", dark: pal.dark ?? "#111111" };
    const services = p.business === "services" ? p.services : undefined;
    const copy = localCopy({ ...emptyProduct(), name, summary: p.brand?.positioning ?? "", facts: [] }, { name, tagline: p.brand?.tagline ?? "", story: "", values: [] }, services ? { business: "services", services } : null);
    const input = { direction: "atelier" as const, shopName: name, palette, copy, images: {}, files: {}, product: { title: name, handle: slugMarque(name), vendor: name, description_html: "", price: null, compare_at_price: null, currency: "EUR", options: [], variants: [], images: [], tags: [] }, language: "fr" as const, ...(services ? { business: "services" as const, services } : {}) };
    return buildSpec({ ...input, fill: libraryFiller(input.files, contentFromInput(input as never), undefined) } as never);
  } catch { return undefined; }
}

/**
 * Captures de l'accueil codé (téléphone 390, tablette 820, ordinateur 1 440), sans IA, avec le moteur d'aperçu du
 * Studio : débordements, boutons hors de l'écran, images manquantes. Chaque capture est rangée dans les fichiers.
 * Le moteur d'aperçu écrit déjà le nom d'une police entre guillemets : la copie d'aperçu le dit comme Shopify.
 */
export async function capturesAccueil(p: Project, jobId: string, theme: string): Promise<{ appareil: string; assetId: string | null; debordement: boolean; horsEcran: string[]; manquantes: number }[]> {
  const spec = specApercu(p);
  const exe = chromiumPath();
  if (!spec || !exe) return [];
  const files = new Map<string, string>();
  const walk = (d: string) => { for (const f of fs.readdirSync(d)) { const x = path.join(d, f); if (fs.statSync(x).isDirectory()) walk(x); else if (/\.(liquid|json|css|js)$/.test(f)) files.set(path.relative(theme, x), fs.readFileSync(x, "utf8").replace(/\.family \| json/g, ".family")); } };
  walk(theme);
  const types: Record<string, string> = { css: "text/css", js: "application/javascript", webp: "image/webp", png: "image/png", jpg: "image/jpeg", svg: "image/svg+xml" };
  const server = http.createServer(async (req, res) => {
    const u = new URL(req.url!, "http://x"), pth = decodeURIComponent(u.pathname.replace(/^\/p/, "") || "/");
    if (pth.startsWith("/assets/")) { const f = path.join(theme, "assets", path.basename(pth)); if (!fs.existsSync(f)) return void res.writeHead(404).end(); res.writeHead(200, { "Content-Type": types[f.split(".").pop()!] ?? "application/octet-stream" }); return void res.end(fs.readFileSync(f)); }
    if (pth.startsWith("/__fonts/")) { const f = fontFilePath(pth.slice(9)); if (!f) return void res.writeHead(404).end(); res.writeHead(200, { "Content-Type": "font/ttf" }); return void res.end(fs.readFileSync(f)); }
    try { const r = await renderPage({ spec, base: "/p", files, cart: [] }, pth, u.searchParams); res.writeHead(r.status, { "Content-Type": "text/html; charset=utf-8" }); res.end(r.html); } catch (e) { res.writeHead(500).end(String((e as Error).message)); }
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const port = (server.address() as { port: number }).port;
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ executablePath: exe, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const out: { appareil: string; assetId: string | null; debordement: boolean; horsEcran: string[]; manquantes: number }[] = [];
  try {
    for (const [appareil, vp] of [["telephone", { width: 390, height: 844 }], ["tablette", { width: 820, height: 1180 }], ["ordinateur", { width: 1440, height: 900 }]] as const) {
      const phone = appareil === "telephone";
      const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 1, isMobile: phone, hasTouch: phone });
      await page.goto(`http://127.0.0.1:${port}/p/`, { waitUntil: "networkidle", timeout: 60_000 }).catch(() => undefined);
      await page.addStyleTag({ content: "*{animation:none!important;transition:none!important}" });
      await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); } window.scrollTo(0, 0); });
      const m = await page.evaluate(() => {
        const W = window.innerWidth, hors: string[] = [];
        for (const el of document.querySelectorAll("a,button,[role=button]")) { const b = el.getBoundingClientRect(); const cs = getComputedStyle(el); if (!b.width || !b.height || cs.visibility === "hidden") continue; if (b.left < -1 || b.right > W + 1) hors.push((el.textContent ?? "").trim().slice(0, 40)); }
        return { debordement: document.documentElement.scrollWidth > W + 1, hors: hors.slice(0, 6), manquantes: [...document.images].filter((i) => !i.complete || !i.naturalWidth).length + (document.body.innerText.match(/Ta photo ici|\[À compléter/g) ?? []).length };
      });
      const shot = await page.screenshot({ fullPage: true, type: "jpeg", quality: 72 });
      await page.close();
      const asset = await saveAsset({ projectId: p.id, userId: p.userId, data: Buffer.from(shot), name: `accueil-code-${appareil}.jpg`, mime: "image/jpeg", role: "dessin-capture", origin: "generated", meta: { dessin: { jobId, appareil } } });
      out.push({ appareil, assetId: asset.id, debordement: m.debordement, horsEcran: m.hors, manquantes: m.manquantes });
    }
  } finally { await browser.close(); server.close(); }
  return out;
}

/** Ce que SINA montre au client : les dessins et les captures du code, avec leurs liens. */
export function resultatDessin(projectId: string, jobId?: string) {
  const row = jobId
    ? one<{ result: string | null }>("SELECT result FROM jobs WHERE id = ? AND project_id = ? AND type = ?", jobId, projectId, SINA_DESSIN_JOB)
    : one<{ result: string | null }>("SELECT result FROM jobs WHERE project_id = ? AND type = ? AND status = 'done' ORDER BY created_at DESC LIMIT 1", projectId, SINA_DESSIN_JOB);
  if (!row?.result) return null;
  const r = JSON.parse(row.result) as { plan: { idee: string; sections: string[] }; juge: { corrections: number; avis: string }; dessins: string[]; controle: { erreurs: number; avertissements: number; exemples: string[]; captures: { appareil: string; assetId: string | null; debordement: boolean; horsEcran: string[]; manquantes: number }[] }; notes: string; photosCreees: number };
  const lien = (id: string | null) => (id ? assetUrl({ id }) : null);
  return { ...r, images: [
    ...r.dessins.map((id, i) => ({ href: lien(id), label: i < 3 ? L(`Dessin, ordinateur (${i + 1}/3)`, `Drawing, desktop (${i + 1}/3)`) : L(`Dessin, téléphone (${i - 2}/2)`, `Drawing, phone (${i - 2}/2)`) })),
    ...r.controle.captures.map((c) => ({ href: lien(c.assetId), label: L(`Le code affiché sur ${c.appareil}`, `The code on ${c.appareil}`) })),
  ].filter((x) => x.href) };
}
