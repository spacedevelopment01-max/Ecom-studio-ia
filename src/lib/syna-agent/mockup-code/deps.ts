/**
 * SINA (#492), étape 7 : dépendances RÉELLES du déroulé (pipeline.ts). Lecture, écriture, comparaison et corrections
 * passent par Claude (payant, plafonné : devis avant chaque appel et plafond dur de la tâche) ; captures (Playwright,
 * Chromium local), rendu de l'aperçu, Theme Check, liens et SEO sont gratuits. Aucun de ces appels n'est fait dans les
 * tests : ils simulent `Step7Deps`.
 */
import sharp from "sharp";
import { z } from "zod";
import { brainContext } from "../../ai/context";
import { jsonCallMaxMicro, llmJson, routeLlm, type LlmImage } from "../../ai/llm";
import { CostCapReached } from "../../ai/trace";
import { checkCustomSection, CustomSectionSchema, sectionGuide, systemPrompt, type CustomSectionOut, type PlanItem } from "../../engine/custom-theme";
import { assetData, getAsset } from "../../library";
import type { Project } from "../../projects";
import { compatibleSectionTypes } from "../../theme/section-compat";
import { projectKind } from "../../theme/project-kind";
import { renderPage } from "../../theme/render";
import { chromiumPath, themeContext } from "../../theme/snapshot";
import { themeCheck } from "../../theme/theme-check";
import type { ThemeSpec } from "../../theme/spec";
import { jobSpentMicro } from "../budget";
import { analyzeMockupImage } from "./analyze";
import type { MockupPage } from "./pages";
import { SECTION_CORRECTIONS, type CallKind, type PlannedSection, type Shot, type Step7Deps, type WriteResult } from "./pipeline";

/** Hypothèses de taille des appels (jetons d'entrée, sortie maximale) : base du devis, vérifiée avant chaque appel. */
export const STEP7_CALLS: Record<CallKind, { input: number; output: number }> = {
  analyze: { input: 14_000, output: 16_000 },
  write: { input: 30_000, output: 24_000 },
  compare: { input: 18_000, output: 3_000 },
  fix: { input: 34_000, output: 24_000 },
};

/** Coût maximal d'un appel de chaque nature (null : tarif ou modèle inconnu, aucun appel autorisé). */
export function step7CallMaxMicro(userId: string): Record<CallKind, number> | null {
  const r = routeLlm({ task: "theme_custom", userId, images: [{ data: Buffer.alloc(1), label: "devis" }], routing: { difficulty: "complex" } });
  if (r.mode !== "llm") return null;
  const out = {} as Record<CallKind, number>;
  for (const k of Object.keys(STEP7_CALLS) as CallKind[]) {
    const m = jsonCallMaxMicro(r.provider, r.model, STEP7_CALLS[k].input, STEP7_CALLS[k].output, STEP7_CALLS[k].output * 2, r.effort ?? null);
    if (!m) return null;
    out[k] = m.maxMicro;
  }
  return out;
}

const ScoreSchema = z.object({
  score: z.number().min(0).max(10),
  differences: z.array(z.string().max(400)).max(20).default([]),
});

/** Image envoyée à l'IA : largeur raisonnable, hauteur bornée (pages longues), JPEG. */
const forAi = (b: Buffer) => sharp(b).resize({ width: 900, height: 7000, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();

const slug = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
/** Type stable d'une section sur mesure (même type à la correction : la section est réécrite, pas dupliquée). */
export const customType = (page: MockupPage, s: Pick<PlannedSection, "index" | "target">) =>
  s.target.kind === "group" ? `es-custom-${s.target.group}-maquette` : `es-custom-${slug(page.key).slice(0, 24) || "page"}-${s.index + 1}`;

/** Consigne d'écriture d'une section d'après la maquette (textes lus mot pour mot, mise en page, couleurs). */
export function sectionBrief(page: MockupPage, s: PlannedSection, plan: PlannedSection[], fix?: string[], hasMockup = true): string {
  const others = plan.map((x) => `${x.index === s.index ? "→" : " "} ${x.name} (${x.role})`).join("\n");
  // Page simple sans image à elle (décision du propriétaire du 8 novembre) : codée dans le style des pages déjà codées
  // d'après la maquette (mêmes réglages, classes, couleurs, polices, boutons, cartes), avec sa structure de boutique.
  const head = hasMockup
    ? `Page « ${page.fr} » du site, codée À L'IDENTIQUE de la maquette jointe (image de la page entière).`
    : `Page « ${page.fr} » du site. Elle n'a PAS d'image de maquette à elle : code-la dans le style exact des pages déjà codées d'après la maquette (mêmes variables et classes du thème, mêmes couleurs, polices, boutons, cartes, champs, espacements et détails graphiques), avec la structure d'une vraie boutique pour cette page. N'invente aucun texte : seulement ceux donnés ci-dessous, sinon « [À compléter : …] ».`;
  return `${head}
Sections de la page, dans l'ordre :
${others}

Écris la section « ${s.name} » (rôle ${s.role}). ${hasMockup ? "Reproduis exactement ce que montre la maquette pour cette section :" : "Ce qu'elle contient :"}
- mise en page ordinateur : ${s.layout}
- mise en page téléphone : ${s.phone ?? "à composer pour le téléphone dans le même esprit (rien ne déborde)"}
- textes, mot pour mot (textes par défaut du schéma, tous modifiables) : ${s.texts.map((t) => `${t.kind} « ${t.text} »`).join(" ; ") || "aucun"}
- images (réglages image_picker, l'IA d'images créera ensuite les photos ; texte alternatif factuel) : ${s.images.map((i) => i.description).join(" ; ") || "aucune"}
- couleurs lues : ${Object.entries(s.colors).filter(([, v]) => v).map(([k, v]) => `${k} ${v}`).join(", ") || "celles du thème"} (passe par les variables du thème quand elles correspondent)
- typographie : ${s.typography ?? "celle du thème"} ; espacements : ${s.spacing ?? "ceux de la maquette"}${s.effects ? ` ; effets : ${s.effects}` : ""}
Chaque texte, image, lien et bouton est un réglage ou un bloc modifiable (Studio, SINA et éditeur Shopify). Liens vers des pages qui existent seulement.${fix?.length ? `\n\nCORRECTION demandée (écarts constatés entre la maquette et le site) :\n${fix.map((x) => `- ${x}`).join("\n")}` : ""}`;
}

type Base = { userId: string; projectId: string; jobId: string | null; usageKey: string };

/** Écrit (ou réécrit) les sections sur mesure du plan ; les sections fonctionnelles de la bibliothèque sont ajoutées si besoin. */
async function writePlan(b: Base, p: Project, i: { spec: ThemeSpec; page: MockupPage; template: string; plan: PlannedSection[]; mockup: Buffer | null }, fix?: string[]): Promise<WriteResult> {
  const res: WriteResult = { ops: [], written: [], library: [], failed: [], order: [] };
  const image: LlmImage[] = i.mockup ? [{ data: await forAi(i.mockup), label: `maquette — ${i.page.fr}` }] : [];
  // Correction : seulement les sections citées dans les écarts (sinon toutes les sections sur mesure de la page).
  const named = fix ? i.plan.filter((s) => s.target.kind !== "library" && fix.some((d) => d.toLowerCase().includes(s.name.toLowerCase()))) : [];
  let toggledGroups = new Set<string>();
  for (const s of i.plan) {
    if (s.target.kind === "library") {
      const c = i.spec.templates[i.template];
      if (!fix && !c?.order.some((sid) => c.sections[sid]?.type === (s.target as { type: string }).type)) res.ops.push({ op: "add_section", template: i.template, type: s.target.type });
      res.library.push(`${s.name} (${s.target.type})`);
      res.order!.push(s.target.type);
      continue;
    }
    const type = customType(i.page, s);
    res.order!.push(type);
    if (fix && named.length && !named.includes(s)) continue;
    const where = s.target.kind === "group" ? `group:${s.target.group}` : i.template;
    // Contrôle de la section seule, rendue dans une page de son genre (en-tête et pied : sur l'accueil).
    const item = { template: i.template.startsWith("product") ? "product" : "index", key: type.slice(10), type, name: s.name, intent: s.role, content: "", layout: s.layout, effects: s.effects ?? "", images: [], position: null, replaces: null, fallback: null } as PlanItem;
    let issues = fix ?? [];
    let previous = i.spec.customSections[type]?.liquid;
    let out: CustomSectionOut | null = null;
    try {
      for (let attempt = 0; attempt <= SECTION_CORRECTIONS; attempt++) {
        const candidate = await llmJson({
          task: "theme_custom", userId: b.userId, projectId: b.projectId, jobId: b.jobId, usageKey: `${b.usageKey}:${type}:${fix ? "fix" : "w"}${attempt}`,
          system: systemPrompt(), context: brainContext(p, "theme"), reference: sectionGuide(i.spec), images: image,
          prompt: sectionBrief(i.page, s, i.plan, issues.length ? issues : undefined, !!i.mockup) + (previous && attempt ? `\n\nVersion précédente :\n<section_precedente>\n${previous.slice(0, 40000)}\n</section_precedente>` : ""),
          maxTokens: STEP7_CALLS.write.output, routing: { difficulty: "complex" },
        }, CustomSectionSchema);
        issues = await checkCustomSection(p, i.spec, item, candidate);
        if (!issues.length) { out = candidate; break; }
        previous = candidate.liquid;
      }
    } catch (e) {
      if (e instanceof CostCapReached) { res.budget = true; res.failed.push({ name: s.name, reason: "budget atteint" }); break; }
      res.failed.push({ name: s.name, reason: (e as Error).message.slice(0, 300) });
      continue;
    }
    if (!out) { res.failed.push({ name: s.name, reason: issues.slice(0, 3).join(" ; ") }); continue; }
    res.ops.push({ op: "custom_section", type, name: s.name, liquid: out.liquid });
    const exists = Object.values((where.startsWith("group:") ? i.spec.groups[where.slice(6) as "header" | "footer"] : i.spec.templates[i.template])?.sections ?? {}).some((x) => x.type === type);
    if (!exists) {
      res.ops.push({ op: "add_section", template: where, type, settings: (out.settings ?? {}) as Record<string, string | number | boolean | null>, blocks: out.blocks as any });
      // En-tête et pied de la maquette : ceux de la bibliothèque restent dans le thème, masqués (restaurables).
      if (s.target.kind === "group" && !toggledGroups.has(where)) {
        toggledGroups = new Set([...toggledGroups, where]);
        const g = i.spec.groups[s.target.group];
        for (const sid of g.order) if (!g.sections[sid].type.startsWith("es-custom-") && g.sections[sid].type === s.target.group) res.ops.push({ op: "toggle_section", template: where, section: sid, disabled: true });
      }
    }
    res.written.push(s.name);
  }
  return res;
}

/** Comparaison détaillée maquette / site codé (vision, payante). */
async function compareShots(b: Base, i: { page: MockupPage; viewport: "desktop" | "phone"; mockup: Buffer; shot: Buffer; local: number }) {
  return llmJson({
    task: "theme_custom", userId: b.userId, projectId: b.projectId, jobId: b.jobId, usageKey: `${b.usageKey}:compare:${i.page.key}:${i.viewport}`,
    system: "Tu es directeur artistique et contrôleur qualité. Tu compares une maquette et le site codé d'après elle, avec une exigence de pixel près. Réponses en français.",
    images: [{ data: await forAi(i.mockup), label: "MAQUETTE (référence)" }, { data: await forAi(i.shot), label: "SITE CODÉ (capture)" }],
    prompt: `Page « ${i.page.fr} », version ${i.viewport === "desktop" ? "ordinateur (1440 px)" : "téléphone (390 px)"}. Ressemblance mesurée localement : ${Math.round(i.local * 100)} %.
Note la fidélité du site codé à la maquette sur 10 (10 = identique : mêmes sections dans le même ordre, mêmes textes, mêmes proportions, couleurs, typographies et espacements ; 8 = écarts minimes ; sous 6 = différences visibles). Liste chaque écart sous la forme « Nom de la section : écart précis (position, taille, couleur, texte, image) ». Les photos manquantes ou provisoires ne sont pas un écart de code : signale-les à part en commençant par « image : ».`,
    maxTokens: STEP7_CALLS.compare.output, routing: { difficulty: "complex" },
  }, ScoreSchema);
}

/** Captures réelles (Chromium local, gratuit) : un seul navigateur pour toute la tâche. */
function screenshotter() {
  let browser: import("playwright").Browser | null = null;
  let unavailable = false;
  return {
    async shoot(i: { spec: ThemeSpec; path: string; width: number }): Promise<Shot | null> {
      if (unavailable) return null;
      if (!browser) {
        const executablePath = chromiumPath();
        if (!executablePath) { unavailable = true; return null; }
        const { chromium } = await import("playwright");
        browser = await chromium.launch({ executablePath, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
      }
      const phone = i.width < 600;
      const { context, url, assertResources } = await themeContext(browser, i.spec, { width: i.width, height: phone ? 844 : 900 }, phone);
      try {
        const page = await context.newPage();
        await page.goto(url(i.path), { waitUntil: "load", timeout: 60_000 });
        await page.evaluate(async () => {
          for (let y = 0; y < Math.min(document.documentElement.scrollHeight, 20000); y += Math.round(innerHeight * 0.8)) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); }
          scrollTo(0, 0);
        });
        await page.waitForTimeout(250);
        assertResources();
        const scrollWidth = await page.evaluate(() => Math.max(document.body.scrollWidth, document.documentElement.scrollWidth));
        const image = await page.screenshot({ fullPage: true, type: "jpeg", quality: 85 });
        return { image, scrollWidth };
      } finally {
        await context.close();
      }
    },
    async close() { await browser?.close().catch(() => {}); browser = null; },
  };
}

/** Dépendances réelles d'une tâche ; `close()` ferme le navigateur de captures. */
export function realStep7Deps(o: { project: Project; jobId: string | null; usageKey: string; step: Step7Deps["step"]; callMaxMicro: Record<CallKind, number> }): Step7Deps & { close(): Promise<void> } {
  const p = o.project;
  const b: Base = { userId: p.userId, projectId: p.id, jobId: o.jobId, usageKey: o.usageKey };
  const shots = screenshotter();
  return {
    step: o.step,
    callMaxMicro: o.callMaxMicro,
    async image(assetId) {
      const a = getAsset(assetId);
      if (!a || a.project_id !== p.id || a.deleted_at) throw new Error("image de maquette introuvable dans les Fichiers du projet");
      return assetData(a);
    },
    async analyzeMockup(i) {
      return analyzeMockupImage({ ...b, usageKey: `${o.usageKey}:analyze:${i.imageId}` }, { data: await sharp(i.image).resize({ width: 1600, height: 4800, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer(), label: `maquette ${i.imageId}` }, i.pages, i.viewport);
    },
    writeSections: (i) => writePlan(b, p, i),
    fix: (i) => writePlan(b, p, i, i.differences),
    screenshot: (i) => shots.shoot(i),
    compare: (i) => compareShots(b, i),
    themeCheck: (spec) => themeCheck(spec),
    render: (spec, path) => { const u = new URL(path, "http://x"); return renderPage({ spec, base: "/p", cart: [] }, u.pathname, u.searchParams); },
    spentMicro: () => (o.jobId ? jobSpentMicro(o.jobId) : 0),
    available: (spec) => compatibleSectionTypes(spec, projectKind(p)),
    close: () => shots.close(),
  };
}

