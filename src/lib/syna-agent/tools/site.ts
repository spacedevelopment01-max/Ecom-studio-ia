/** Site et thème : mêmes moteurs que l'onglet Site (opérations natives, versions, galerie de thèmes, constructeur). */
import { z } from "zod";
import { HttpError } from "../../auth";
import { currentTheme, listThemeVersions, saveThemeVersion, themeVersion, remember } from "../../projects";
import { OpSchema, applyOps, outline, validateSpec, type ThemeOp } from "../../theme/ops";
import { assertThemeOperations } from "../../theme/plan-access";
import { assertSectionGeneration } from "../../theme/custom-access";
import { projectKind } from "../../theme/project-kind";
import { one } from "../../db";
import { assetData, assetUrl, getAsset, saveAsset } from "../../library";
import { aiSiteMockup, siteMockupMaxMicro } from "../../ai/media-providers";
import { getStrategyState } from "../../marketing-strategy";
import { buildShop, themeFileName } from "../../engine/shop";
import { DIRECTIONS } from "../../theme/directions";
import { themeRecommendation } from "../../theme/theme-recommendation";
import { assertThemeAllowed } from "../../plan-gates";
import { duplicatePage, removePage, setNavigation, updatePage } from "../../theme/pages";
import { enqueue } from "../../jobs";
import { L } from "../../i18n-server";
import { stableHash } from "../../brain/hash";
import type { AgentTool, Change } from "../types";
import { project, short } from "./common";

const previewUrl = (pid: string, vid: string, page = "") => `/preview/${pid}/v/${vid}${page}`;

function setting(spec: any, o: any): unknown {
  if (o.op === "set_global") return spec.settings?.[o.key];
  const c = o.template?.startsWith("group:") ? spec.groups?.[o.template.slice(6)] : spec.templates?.[o.template];
  const s = c?.sections?.[o.section];
  return o.block ? s?.blocks?.[o.block]?.settings?.[o.key] : s?.settings?.[o.key];
}

const outlineTool: AgentTool<{ templates?: string[] }> = {
  name: "site.outline", module: "site", kind: "read", needsProject: true,
  description: "Lit la structure du site courant : version, thème, modèles (templates), sections et blocs avec leurs identifiants et textes, pages et leurs URL d'aperçu. À utiliser avant toute retouche pour trouver les bons identifiants.",
  args: z.object({ templates: z.array(z.string().max(80)).max(12).optional() }).strict(),
  run: (ctx, a) => {
    const p = project(ctx), cur = currentTheme(p.id);
    if (!cur) return { ok: true, summary: L("Aucun site encore construit pour ce projet.", "No site built yet."), data: { site: null } };
    const templates = Object.keys(cur.spec.templates);
    const wanted = a.templates?.length ? a.templates : ["group:header", ...templates.filter((t) => /^(index|product|page\.|collection)/.test(t)).slice(0, 8), "group:footer"];
    return {
      ok: true, summary: L(`Site v${cur.version.number}, thème ${cur.spec.name}.`, `Site v${cur.version.number}, theme ${cur.spec.name}.`),
      data: { versionId: cur.version.id, number: cur.version.number, theme: cur.spec.name, direction: cur.spec.direction, templates, pages: (cur.spec as any).store?.pages?.map((x: any) => ({ handle: x.handle, title: x.title, status: x.status })) ?? [], preview: previewUrl(p.id, cur.version.id), outline: outline(cur.spec, wanted).slice(0, 14000) },
    };
  },
};

const editTool: AgentTool<{ ops: ThemeOp[]; summary?: string }> = {
  name: "site.edit", module: "site", kind: "write", needsProject: true,
  description: "Modifie le site courant par opérations natives (même moteur que l'éditeur du Site) : set_setting (texte, image, lien d'une section ou d'un bloc), set_global, set_scheme_color, section_colors, add/remove/move/toggle/duplicate/replace_section, add/remove/move_block, use_media (image de la bibliothèque), lock. Crée une nouvelle version (l'ancienne reste restaurable). Les identifiants viennent de site.outline. Plusieurs opérations dans un même appel = une seule version.",
  args: z.object({ ops: z.array(OpSchema).min(1).max(30), summary: z.string().max(200).optional() }).strict(),
  sensitive: (a) => a.ops.filter((o) => o.op === "remove_section").length >= 3,
  run: (ctx, a) => {
    const p = project(ctx), cur = currentTheme(p.id);
    if (!cur) throw new HttpError(409, L("Aucun site à modifier : construisez-le d'abord.", "No site to edit: build it first."));
    if (a.ops.some((o) => o.op === "custom_section")) assertSectionGeneration(ctx.user, p.id);
    assertThemeOperations(p.id, cur.spec, a.ops);
    const targeted = new Set(a.ops.filter((o: any) => o.template && o.section).map((o: any) => `${o.template}:${o.section}`));
    const res = applyOps(cur.spec, a.ops, { targeted, storeKind: projectKind(p), mediaFile: (assetId) => { const x = getAsset(assetId); return x && x.project_id === p.id ? { filename: themeFileName(x, x.role ?? "media") } : null; } });
    if (!res.applied.length) return { ok: false, summary: L("Aucune modification applicable : ", "No applicable change: ") + res.rejected.map((r) => r.reason).join(" ; ") };
    const problems = validateSpec(res.spec);
    if (problems.length) return { ok: false, summary: L("Modification refusée par la validation du thème : ", "Change refused by theme validation: ") + problems.slice(0, 4).join(" ; ") };
    const v = saveThemeVersion(p.id, res.spec, a.summary ?? res.applied.join(" ; ").slice(0, 200), "user", undefined, cur.version.id);
    const read = currentTheme(p.id)!;
    const ok = read.version.id === v.id && stableHash("syna-site", read.spec) === stableHash("syna-site", res.spec);
    const changes: Change[] = a.ops.filter((o) => ["set_setting", "set_global", "use_media"].includes(o.op)).map((o: any) => ({
      module: "site", object: o.op === "set_global" ? `réglage ${o.key}` : `${o.template} › ${o.section}${o.block ? ` › ${o.block}` : ""} › ${o.key}`,
      summary: `${short(setting(cur.spec, o), 80)} → ${short(setting(read.spec, o), 80)}`, before: setting(cur.spec, o), after: setting(read.spec, o), verified: ok,
    }));
    if (changes.length < res.applied.length) changes.push({ module: "site", object: `version ${v.number}`, summary: res.applied.join(" ; ").slice(0, 300), verified: ok });
    return { ok, summary: L(`Site : version ${v.number} enregistrée et relue (${res.applied.length} modification(s)${res.rejected.length ? `, ${res.rejected.length} refusée(s)` : ""}).`, `Site: version ${v.number} saved and read back.`), data: { versionId: v.id, number: v.number, preview: previewUrl(p.id, v.id), rejected: res.rejected.map((r) => r.reason) }, changes };
  },
};

const versionsTool: AgentTool<{}> = {
  name: "site.versions", module: "site", kind: "read", needsProject: true,
  description: "Liste les versions du site (numéro, résumé, auteur, date) pour comparer ou restaurer.",
  args: z.object({}).strict(),
  run: (ctx) => { const p = project(ctx); return { ok: true, summary: L("Versions du site.", "Site versions."), data: listThemeVersions(p.id).slice(0, 30).map((v: any) => ({ id: v.id, number: v.number, summary: short(v.summary, 120), author: v.author, active: v.active ?? undefined, at: v.created_at })) }; },
};

const applyVersionTool: AgentTool<{ versionId: string; reason?: string }> = {
  name: "site.use_version", module: "site", kind: "write", needsProject: true,
  description: "Fait d'une version existante (ancienne version ou prototype de thème déjà préparé) le site de travail. Une nouvelle version est créée, rien n'est effacé.",
  args: z.object({ versionId: z.string().max(40), reason: z.string().max(200).optional() }).strict(),
  run: (ctx, a) => {
    const p = project(ctx), cur = currentTheme(p.id), target = themeVersion(p.id, a.versionId);
    if (!target) return { ok: false, summary: L("Version introuvable dans ce projet.", "Version not found in this project.") };
    assertThemeAllowed(p.id, target.spec.direction, cur?.spec.direction);
    if (validateSpec(target.spec).length) return { ok: false, summary: L("Cette version ne passe pas la validation du thème.", "This version fails theme validation.") };
    const v = saveThemeVersion(p.id, target.spec, a.reason ?? `Version ${target.version.number} reprise avec SINA`, "user", JSON.parse(target.version.qc || "null"), cur?.version.id ?? null);
    const read = currentTheme(p.id)!, ok = read.version.id === v.id && stableHash("syna-site", read.spec) === stableHash("syna-site", target.spec);
    return { ok, summary: L(`Site de travail : ${target.spec.name} (version ${v.number}), relu.`, `Working site: ${target.spec.name} (version ${v.number}).`), data: { versionId: v.id, preview: previewUrl(p.id, v.id) },
      changes: [{ module: "site", object: "site de travail", summary: `${cur?.spec.name ?? "aucun"} v${cur?.version.number ?? "-"} → ${read.spec.name} v${v.number}`, before: cur?.version.id ?? null, after: v.id, verified: ok }] };
  },
};

const mockupsTool: AgentTool<{ directions?: string[]; count?: number }> = {
  name: "site.mockups", module: "site", kind: "generate", needsProject: true,
  description: "PROTOTYPES de thèmes de la galerie (pas des maquettes) : prépare jusqu'à 3 versions COMPLÈTES du site (pages, produits, marque) dans des thèmes différents de la galerie, sans changer le site courant (versions inactives, gratuit, moteur natif). Sans `directions`, prend le thème recommandé et ses alternatives pour ce type de projet. Exige une marque (brand.save ou brand.create). Le client choisit ensuite ; appliquez son choix avec site.use_version.",
  args: z.object({ directions: z.array(z.string().max(60)).max(3).optional(), count: z.number().int().min(1).max(3).default(3) }).strict(),
  run: async (ctx, a) => {
    const p = project(ctx);
    if (!p.brand) return { ok: false, summary: L("Une marque (nom, couleurs, polices) est nécessaire avant de composer des maquettes : crée-la d'abord.", "A brand is needed first."), hint: "Marque à enregistrer d'abord (brand.save)." };
    const rec = themeRecommendation(p, "fr");
    const pool = [rec.recommended, ...rec.alternatives.map((x) => x.id), ...rec.eligible].filter((x): x is string => !!x);
    const chosen = (a.directions?.length ? a.directions : [...new Set(pool)]).filter((d) => rec.eligible.includes(d)).slice(0, a.count);
    if (!chosen.length) return { ok: false, summary: L("Aucun thème de la galerie ne convient à ce type de projet.", "No gallery theme fits this project."), data: { eligible: rec.eligible } };
    const out: any[] = [], changes: Change[] = [];
    for (const [i, direction] of chosen.entries()) {
      try {
        const r = await buildShop(null, p.id, { direction: direction as any, useAi: false, prepareOnly: true });
        const v = themeVersion(p.id, r.versionId);
        if (!v || v.spec.direction !== direction || validateSpec(v.spec).length) { out.push({ n: i + 1, direction, ok: false }); continue; }
        const name = DIRECTIONS.find((d) => d.id === direction)?.name ?? direction;
        out.push({ n: i + 1, direction, name, versionId: v.version.id, preview: previewUrl(p.id, v.version.id), productPreview: previewUrl(p.id, v.version.id, "/products") });
        changes.push({ module: "site", object: `maquette ${i + 1}`, summary: `${name} — version inactive ${v.version.number}`, after: v.version.id, verified: true });
      } catch (e: any) { out.push({ n: i + 1, direction, ok: false, error: short(e?.message, 200) }); }
    }
    remember(p.id, { kind: "artifact", key: `syna.mockups.${ctx.runId}`, value: JSON.stringify(out), source: "local", origin: "system" as any });
    const okCount = out.filter((x) => x.versionId).length;
    return { ok: okCount > 0, summary: L(`${okCount} maquette(s) prête(s), le site courant n'a pas changé. Le client choisit, puis site.use_version.`, `${okCount} mockup(s) ready.`), data: { mockups: out, current: currentTheme(p.id)?.version.id ?? null }, changes };
  },
};

const rebuildTool: AgentTool<{ direction?: string }> = {
  name: "site.build", module: "site", kind: "write", needsProject: true,
  description: "Construit (ou reconstruit) le site complet avec le moteur natif à partir du projet actuel (catalogue, marque, pages), dans le thème donné ou le thème courant. Tâche de fond ; les retouches manuelles sont reportées quand c'est possible et l'ancienne version reste restaurable.",
  args: z.object({ direction: z.string().max(60).optional() }).strict(),
  run: (ctx, a) => {
    const p = project(ctx), cur = currentTheme(p.id);
    if (!p.brand) return { ok: false, summary: L("Une marque est nécessaire avant de construire le site.", "A brand is needed first.") };
    const direction = a.direction ?? cur?.spec.direction ?? themeRecommendation(p, "fr").recommended;
    if (!direction) return { ok: false, summary: L("Choisissez d'abord un thème (site.mockups).", "Choose a theme first.") };
    assertThemeAllowed(p.id, direction, cur?.spec.direction);
    const j = enqueue({ userId: ctx.user.id, projectId: p.id, type: "shop.direction", label: L("Construction du site avec SINA", "Site build with SINA"), payload: { projectId: p.id, direction }, maxAttempts: 1 });
    return { ok: true, summary: L("Construction du site lancée ; SINA relira le résultat.", "Site build started."), jobs: [j.id], data: { direction } };
  },
};

const pagesTool: AgentTool<any> = {
  name: "site.pages", module: "site", kind: "write", needsProject: true,
  description: "Gère les pages du site : update (titre, adresse, SEO titre/description, statut draft/published), duplicate, navigation (afficher/masquer dans le menu), remove (accord requis).",
  args: z.discriminatedUnion("action", [
    z.object({ action: z.literal("update"), handle: z.string().max(120), title: z.string().max(160).optional(), newHandle: z.string().max(120).optional(), seo: z.object({ title: z.string().max(70), description: z.string().max(320) }).optional(), status: z.enum(["draft", "published"]).optional() }).strict(),
    z.object({ action: z.literal("duplicate"), handle: z.string().max(120) }).strict(),
    z.object({ action: z.literal("navigation"), handle: z.string().max(120), show: z.boolean() }).strict(),
    z.object({ action: z.literal("remove"), handle: z.string().max(120) }).strict(),
  ]),
  sensitive: (a: any) => a.action === "remove",
  run: (ctx, a: any) => {
    const p = project(ctx), cur = currentTheme(p.id);
    if (!cur) throw new HttpError(409, L("Aucun site.", "No site."));
    const page = (s: any) => s.store?.pages?.find((x: any) => x.handle === (a.newHandle ?? a.handle)) ?? null;
    const before = (cur.spec as any).store?.pages?.find((x: any) => x.handle === a.handle) ?? null;
    let spec: any;
    if (a.action === "update") spec = updatePage(cur.spec, a.handle, { title: a.title, handle: a.newHandle, seo: a.seo, status: a.status });
    else if (a.action === "duplicate") spec = duplicatePage(cur.spec, a.handle);
    else if (a.action === "navigation") spec = setNavigation(cur.spec, a.handle, a.show);
    else spec = removePage(cur.spec, a.handle, true);
    spec = (spec as any).spec ?? spec;
    const problems = validateSpec(spec);
    if (problems.length) return { ok: false, summary: problems.slice(0, 3).join(" ; ") };
    const v = saveThemeVersion(p.id, spec, `Page ${a.handle} : ${a.action} (SINA)`, "user", undefined, cur.version.id);
    const read = currentTheme(p.id)!, after = a.action === "remove" ? null : page(read.spec);
    const ok = read.version.id === v.id && (a.action === "remove" ? !page(read.spec) : true);
    return { ok, summary: L(`Page ${a.handle} : ${a.action} enregistré (version ${v.number}).`, `Page ${a.handle}: ${a.action} saved.`), data: { versionId: v.id }, changes: [{ module: "site", object: `page ${a.handle}`, summary: `${a.action}`, before, after, verified: ok }] };
  },
};


/* ---------- Maquettes du site par l'IA d'images (une planche par direction) ---------- */
type MockupArgs = { directions: { name: string; style: string }[] };

/** Pages montrées sur la planche, selon l'activité. */
const MOCKUP_PAGES = {
  products: ["Accueil", "Fiche produit", "Panier", "Notre histoire", "Questions fréquentes", "Contact"],
  services: ["Accueil", "Prestations", "Réalisations", "À propos", "Demande de devis ou rendez-vous", "Contact"],
};

/** Logo validé et photo du produit (références envoyées à l'IA d'images). */
function mockupReferences(p: any): { logo: Buffer | null; product: Buffer | null; problem: string | null } {
  const logoId = p.brand?.logo?.assetId as string | undefined;
  if (!p.brand || !logoId) return { logo: null, product: null, problem: L("L'identité visuelle (logo, couleurs, polices) doit être créée et validée avant les maquettes.", "Create and validate the visual identity (logo, colours, fonts) before the mockups.") };
  const la = getAsset(logoId);
  if (!la || la.project_id !== p.id || la.deleted_at) return { logo: null, product: null, problem: L("Logo introuvable dans les Fichiers : refaites ou validez l'identité visuelle.", "Logo not found.") };
  const photo = one<{ id: string }>("SELECT id FROM assets WHERE project_id=? AND deleted_at IS NULL AND kind='image' AND role IN ('original','product') ORDER BY created_at ASC LIMIT 1", p.id);
  const pa = photo ? getAsset(photo.id) : null;
  return { logo: assetData(la), product: pa ? assetData(pa) : null, problem: null };
}

function mockupPrompt(p: any, d: { name: string; style: string }): string {
  const services = p.business === "services";
  const pages = MOCKUP_PAGES[services ? "services" : "products"];
  const pal = p.brand?.palette ?? {};
  const colors = Object.entries(pal).filter(([, v]) => typeof v === "string" && /^#/.test(v as string)).map(([k, v]) => `${k} ${v}`).join(", ");
  let angle = "";
  try { const st: any = getStrategyState(p.id); const a = st.active ? st.angles?.find((x: any) => x.id === st.active.angleId) ?? st.active.angle : null; if (a) angle = `Angle marketing choisi : « ${a.title ?? ""} » — accroche « ${a.message ?? a.promise ?? ""} », émotion ${a.emotion ?? ""}.`; } catch { /* sans angle actif */ }
  const price = p.product?.price?.status === "confirmed" && p.product.price.amount != null ? `${(p.product.price.amount / 100).toFixed(2).replace(".", ",").replace(",00", "")} €` : "";
  const facts = (p.product?.facts ?? []).filter((f: any) => f.status === "confirmed").map((f: any) => `${f.label} : ${f.value}`).slice(0, 8).join(" ; ");
  return [
    `Planche de présentation d'une MAQUETTE DE SITE WEB complète (design UI professionnel, rendu net et lisible), direction graphique « ${d.name} » : ${d.style}.`,
    `La planche montre côte à côte, en grille sur un fond neutre, les pages suivantes en version ordinateur, chacune avec son nom écrit au-dessus : ${pages.join(", ")}. Chaque page montre son en-tête avec le logo et le menu, ses sections et son pied de page.`,
    `Marque : « ${p.brand?.name ?? p.name} »${p.brand?.tagline ? `, signature « ${p.brand.tagline} »` : ""}. Le logo fourni en référence est reproduit à l'identique dans l'en-tête de chaque page (aucun autre logo inventé).`,
    colors ? `Couleurs de l'identité, à respecter strictement : ${colors}.` : "",
    p.brand?.fonts ? `Polices : titres ${p.brand.fonts.heading}, textes ${p.brand.fonts.body}.` : "",
    angle,
    services ? `Activité : ${p.product?.name || p.name}.` : `Produit vendu : ${p.product?.name || p.name}${price ? `, prix ${price}` : ""}. La photo du produit fournie en référence est utilisée telle quelle sur l'accueil et la fiche produit (même produit, mêmes couleurs, rien de redessiné).`,
    facts ? `Faits confirmés utilisables dans les textes : ${facts}.` : "",
    "Textes en français, courts et lisibles. Aucun avis client, note, étoile, garantie, promotion, label ou chiffre inventé. Aucune personne reconnaissable. Pas de filigrane.",
  ].filter(Boolean).join("\n");
}

const mockupImagesTool: AgentTool<MockupArgs> = {
  name: "site.mockup_images", module: "site", kind: "generate", needsProject: true,
  description: "Crée les MAQUETTES du site avec l'IA d'images : pour chaque direction graphique (1 à 3 : name + style décrit), UNE grande planche montrant toutes les pages (accueil, fiche produit, panier, histoire, FAQ, contact — ou prestations, réalisations, devis pour un service) avec le logo, les couleurs et les polices de l'identité et la photo du produit. Payant (budget autorisé). Exige l'identité visuelle validée avec un logo : brand.create d'abord. Le client choisit une maquette ; elle sert ensuite de modèle au code du site.",
  args: z.object({ directions: z.array(z.object({ name: z.string().min(1).max(60), style: z.string().min(1).max(400) }).strict()).min(1).max(3) }).strict(),
  estimate: (ctx, a) => {
    const p: any = project(ctx), refs = mockupReferences(p);
    if (refs.problem) throw new HttpError(409, refs.problem);
    const one = siteMockupMaxMicro(refs.product ? 2 : 1);
    if (one == null) throw new HttpError(409, L("Aucun modèle d'images utilisable pour les maquettes (administration › Médias, usage « texte et logo sur les images »).", "No usable image model for mockups."));
    return { maxMicro: one * a.directions.length, label: L("maquettes du site", "site mockups") };
  },
  run: async (ctx, a) => {
    const p: any = project(ctx), refs = mockupReferences(p);
    if (refs.problem) return { ok: false, summary: refs.problem };
    const out: { n: number; direction: string; assetId: string; href: string }[] = [], failed: string[] = [];
    for (const [i, d] of a.directions.entries()) {
      try {
        const prompt = mockupPrompt(p, d);
        const img = await aiSiteMockup({ userId: ctx.user.id, projectId: p.id, usageKey: `syna:${ctx.runId}:mockup:${i}:${stableHash("syna-mockup", prompt).slice(0, 12)}` }, { prompt, logo: refs.logo, product: refs.product });
        const jpeg = img[0] === 0xff && img[1] === 0xd8;
        const asset: any = await saveAsset({ projectId: p.id, userId: ctx.user.id, data: img, name: `maquette-${i + 1}-${d.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30)}.${jpeg ? "jpg" : "png"}`, mime: jpeg ? "image/jpeg" : "image/png", role: "mockup", origin: "generated", meta: { synaMockup: { runId: ctx.runId, direction: d } } });
        out.push({ n: i + 1, direction: d.name, assetId: asset.id, href: assetUrl({ id: asset.id }) });
      } catch (e: any) { failed.push(`${d.name} : ${short(e?.message, 200)}`); }
    }
    remember(p.id, { kind: "artifact", key: `syna.mockup_images.${ctx.runId}`, value: JSON.stringify(out), source: "local", origin: "system" as any });
    return { ok: out.length > 0, summary: L(`${out.length} maquette(s) créée(s)${failed.length ? ` ; échec : ${failed.join(" | ")}` : ""}. Le client choisit ; rien n'est appliqué au site.`, `${out.length} mockup(s) created.`), data: { mockups: out, failed },
      changes: out.map((m) => ({ module: "fichiers", object: `maquette ${m.n} — ${m.direction}`, summary: L("planche créée par l'IA d'images", "AI mockup board"), after: m, verified: true })) };
  },
};

export const siteTools: AgentTool[] = [outlineTool, editTool, versionsTool, applyVersionTool, mockupImagesTool, mockupsTool, rebuildTool, pagesTool];
