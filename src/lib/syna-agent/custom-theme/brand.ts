/**
 * Montage du thème sur mesure À LA MARQUE du client (consigne du propriétaire du 9 novembre 2026 : « sina monte le thème
 * avec toutes les sections prévues, avec image et texte ») : tâche de fond « syna.custom.brand », reprenable (chaque
 * section et chaque photo a son point de reprise : une reprise ne repaie rien de ce qui est fait).
 *  1) Textes : pour chaque section, un appel écrit TOUS ses textes pour la marque (faits du client seulement, jamais ceux
 *     d'un modèle, « [À compléter : …] » pour un fait inconnu) et décrit chaque photo à créer.
 *  2) Photos : la vraie photo d'un produit du client quand la photo montre ce produit, sinon une photo créée par l'IA
 *     d'images des sites, dans la direction artistique de la famille choisie (personnes seulement si autorisées).
 * Le thème est ensuite en place dans l'onglet Boutique, où le client demande ses changements.
 */
import { z } from "zod";
import { L } from "../../i18n-server";
import { UserFacingError, type JobContext } from "../../jobs";
import { loadProject, notify, type Project } from "../../projects";
import { assetData, assetUrl, getAsset, saveAsset } from "../../library";
import { llmJson } from "../../ai/llm";
import { withTrace } from "../../ai/trace";
import { aiSiteImageHd, withQuotedImageRoute } from "../../ai/media-providers";
import { loadWordingRules, wordingPromptLine } from "../../client-wording";
import { listProducts } from "../../products/catalog";
import { peopleAllowed } from "../../people-policy";
import { familyArtUniverse, loadFamilyChoice } from "../section-families";
import { activityPlan } from "../activity";
import { journeyOf, setStep, updateJourney, type Journey } from "../journey";
import { angleDetails, COPY_MODEL } from "../mockup-code/copy";
import { codePhotoPrompt } from "../mockup-code/code-mockup";
import { hdAspect } from "../mockup-code/prompts";
import { mockupImageRoute } from "../mockup-code/tools";
import { libSection, withBrandName } from "./library";
import { allSections, loadCustomTheme, replaceOnce, saveCustomTheme, sectionHtml, type CustomTheme } from "./theme";

export const CUSTOM_BRAND_JOB = "syna.custom.brand";
export type CustomBrandPayload = { projectId: string; capMicro: number; conversationId?: string | null; photos?: boolean };

/** Plafond d'un appel d'écriture d'une section (même modèle que les textes du site). */
export const SECTION_TEXT_CAP_MICRO = 150_000;
const RATIOS = ["1:1", "4:5", "2:3", "16:9", "9:16"] as const;

export const SectionWriteSchema = z.object({
  edits: z.array(z.object({ find: z.string().min(1).max(4000), replace: z.string().max(8000) })).max(80),
  photos: z.array(z.object({ find: z.string().min(3).max(200), description: z.string().min(20).max(2500), ratio: z.enum(RATIOS), product: z.string().max(160).nullable() })).max(14),
});
export type SectionWrite = z.infer<typeof SectionWriteSchema>;

export const SECTION_WRITE_SYSTEM = `Tu es concepteur-rédacteur web senior et directeur artistique. Tu adaptes UNE section de site (son HTML) à une petite marque, en français.
Règles absolues :
- Tu remplaces TOUS les textes visibles de la section (titres, paragraphes, boutons, libellés, listes, textes alternatifs des images, questions et réponses) par des textes pour CETTE marque, dans sa voix (tutoiement si elle tutoie), de longueur proche de l'original pour garder la mise en page.
- RIEN d'inventé : aucun avis, note, nombre d'avis, chiffre, label, certification, promesse de santé, délai, prix, ingrédient ou matière qui ne soit pas dans les faits fournis. Ne remplace jamais un fait du client par un autre (s'il dit « tout est bio », tu gardes le bio). Un fait inconnu s'écrit « [À compléter : …] » ou n'est pas écrit.
- Les textes de la section d'origine viennent d'une démonstration : tu n'en reprends JAMAIS une phrase, même traduite ou retouchée.
- Noms et prix de produits : seulement ceux de la liste fournie, écrits exactement.
- Le vocabulaire imposé par le client est respecté.
- Tu ne touches ni aux balises, ni aux classes, ni aux attributs (sauf alt et les textes) : chaque modification est un remplacement { find, replace } où find est un passage EXACT du HTML fourni, présent une seule fois (prends assez de contexte pour qu'il soit unique), et replace le même passage avec les nouveaux textes.
- Pour CHAQUE image de la section dont la source commence par « photos/ », décris la photo à créer pour la marque : find = la source exacte (ex. « photos/sl-b1.webp »), description = UNE photo décrite en phrases complètes, dans l'ordre : type de photo, format, point de vue, cadrage ; surface et fond ; chaque objet à sa place (forme, matière, couleur, état) ; « La scène contient exactement N objets : … » ; ce qui est dégagé ; lumière, ombres, ambiance ; « Aucun texte, aucune lettre, aucun chiffre, aucun logo, aucun filigrane. » ; ratio = format de la photo ; product = le nom exact d'un produit de la liste si la photo doit le montrer (sa vraie photo sera utilisée), sinon null.
Réponse : uniquement le JSON demandé.`;

/** Faits de la marque donnés à chaque écriture (les mêmes pour toutes les sections). */
export function brandBrief(p: Project, j: Journey | null): string {
  const plan = j ? activityPlan(p.id, j) : null;
  const d = j ? angleDetails(j) : {};
  const products = (() => { try { return listProducts(p.id).map((x) => `${x.data.title}${x.data.price != null ? ` (${(x.data.price / 100).toFixed(2).replace(".", ",")} €)` : ""}`); } catch { return []; } })();
  const wording = wordingPromptLine(loadWordingRules(p.id));
  const b = p.brand;
  return [
    `Marque : « ${b?.name ?? p.name} »${b?.tagline ? `, slogan (mot pour mot) « ${b.tagline} »` : ""}.`,
    b?.positioning ? `Positionnement : ${b.positioning}.` : "",
    b?.audience ? `Clientèle : ${b.audience}.` : "",
    b?.personality?.length ? `Personnalité : ${b.personality.join(", ")}.` : "",
    b?.tone?.voice ? `Voix : ${b.tone.voice}.` : "",
    plan?.angle ? `Angle marketing choisi : « ${plan.angle.title} »${d.emotion ? `, émotion : ${d.emotion}` : ""}${plan.angle.message ? `, accroche (titre d'ouverture de l'accueil, mot pour mot) « ${plan.angle.message} »` : ""}${plan.angle.cta ? `, appel à l'action « ${plan.angle.cta} »` : ""}.` : "",
    d.story ? `Ce qu'on raconte : ${d.story}` : "",
    plan?.keyMessages.length ? `Messages clés : ${plan.keyMessages.map((m) => `« ${m} »`).join(" ; ")}.` : "",
    products.length ? `Produits (noms et prix exacts) : ${products.join(" ; ")}.` : "",
    plan?.offer.facts.length ? `Faits confirmés par le client : ${plan.offer.facts.join(" ; ")}.` : "",
    d.toConfirm?.length ? `NON confirmés, à ne JAMAIS affirmer : ${d.toConfirm.join(" ; ")}.` : "",
    plan?.company.shipping ? `Livraison : ${plan.company.shipping}.` : "",
    plan?.company.returns ? `Retours : ${plan.company.returns}.` : "",
    ((c) => (c.length ? `Coordonnées : ${c.join(" · ")}.` : ""))([plan?.company.legalName, plan?.company.email, plan?.company.address, plan?.company.phone].filter((x): x is string => !!x)),
    wording,
  ].filter(Boolean).join("\n");
}

export function sectionWritePrompt(brief: string, place: string, title: string, does: string, html: string): string {
  return [brief, "", `Section à adapter : « ${title} » (${place}). Ce qu'elle fait : ${does}`, "HTML actuel de la section (textes de démonstration à remplacer) :", html].join("\n");
}

/** Applique les remplacements d'une écriture : ceux qui ne s'appliquent pas sont comptés, jamais devinés. */
export function applyWrite(html: string, w: SectionWrite): { html: string; failed: number } {
  let out = html, failed = 0;
  for (const e of w.edits) {
    if (/<\s*script\b|\son[a-z]+\s*=(?!"return false")/i.test(e.replace)) { failed++; continue; }
    try { out = replaceOnce(out, e.find, e.replace); } catch { failed++; }
  }
  return { html: out, failed };
}

/** Photos encore d'exemple dans le thème (à créer ou à remplacer), dédoublonnées par section. */
export function examplePhotoCount(t: CustomTheme): number {
  return allSections(t).reduce((n, x) => n + new Set([...sectionHtml(x.s).matchAll(/photos\/([\w-]+\.(?:webp|png|jpg))/g)].map((m) => m[1])).size, 0);
}

/** Remplaçables par les tests (aucun appel réel). */
export const customBrandDeps: {
  write?: (prompt: string, usageKey: string) => Promise<SectionWrite>;
  photo?: (prompt: string, product: Buffer | null, aspect: string, usageKey: string) => Promise<Buffer>;
} = {};

export async function runCustomBrandJob(ctx: JobContext) {
  const a = ctx.payload as CustomBrandPayload;
  const p = loadProject(a.projectId);
  let t = loadCustomTheme(p.id);
  if (!t) throw new UserFacingError(L("Aucun thème sur mesure à monter : choisis d'abord ton style.", "No custom theme yet."));
  const j = a.conversationId ? (() => { try { return journeyOf(a.conversationId!); } catch { return null; } })() : null;
  const brief = brandBrief(p, j);
  const name = p.brand?.name ?? p.name;
  const products = (() => { try { return listProducts(p.id); } catch { return []; } })();
  const fam = loadFamilyChoice(p.id), people = peopleAllowed(p.id), fu = familyArtUniverse(fam, { people });
  const direction = fu ? `${fu.style} ; ${fu.idea} ; lumière : ${fu.light} ; décors : ${fu.setting} ; couleurs de la marque : ${[p.brand?.palette?.dark, p.brand?.palette?.primary, p.brand?.palette?.accent].filter(Boolean).join(", ")}.` : null;
  const sections = allSections(t).filter((x) => !x.s.clientTexts);
  const report = { sections: 0, failedEdits: 0, photosMade: 0, photosReal: 0, problems: [] as string[] };
  const briefs: Record<string, SectionWrite["photos"]> = {};

  // 1) Textes, section par section (un point de reprise chacune).
  for (const [i, x] of sections.entries()) {
    const l = libSection(x.s.id);
    ctx.progress(0.05 + (0.45 * i) / Math.max(1, sections.length), L(`Textes : ${l?.title ?? x.s.id}`, `Copy: ${l?.title ?? x.s.id}`));
    try {
      const w = await ctx.step(`text:${x.s.uid}`, async () => {
        const html = withBrandName(sectionHtml(x.s), name);
        const prompt = sectionWritePrompt(brief, x.place, l?.title ?? x.s.id, l?.does ?? "", html);
        const usageKey = `${ctx.job.id}:text:${x.s.uid}`;
        return customBrandDeps.write ? customBrandDeps.write(prompt, usageKey)
          : SectionWriteSchema.parse(await withTrace({ jobId: ctx.job.id, projectId: p.id, step: "custom-text", costCapMicro: a.capMicro }, () =>
              llmJson({ task: "strategy", userId: p.userId, projectId: p.id, jobId: ctx.job.id, system: SECTION_WRITE_SYSTEM, promptKey: "syna-custom-section-1", prompt, maxTokens: 12000, maxOutputTokens: 12000, usageKey, routing: { difficulty: "complex", prefer: COPY_MODEL } }, SectionWriteSchema, { strict: true })));
      });
      t = loadCustomTheme(p.id)!;
      const cur = allSections(t).find((y) => y.s.uid === x.s.uid);
      if (!cur) continue;
      const r = applyWrite(withBrandName(sectionHtml(cur.s), name), w);
      cur.s.html = r.html; cur.s.clientTexts = r.failed === 0;
      t = saveCustomTheme(p.id, t);
      briefs[x.s.uid] = w.photos;
      report.sections++; report.failedEdits += r.failed;
      if (r.failed) report.problems.push(`${l?.title} : ${r.failed} texte(s) non remplacé(s)`);
    } catch (e) { report.problems.push(`${l?.title ?? x.s.id} : textes non écrits (${(e as Error).message.slice(0, 120)})`); }
  }

  // 2) Photos : vraie photo du produit, sinon photo créée dans la direction artistique de la marque.
  if (a.photos !== false) {
    const todo = Object.entries(briefs).flatMap(([uid, list]) => list.map((ph) => ({ uid, ph })));
    for (const [i, { uid, ph }] of todo.entries()) {
      ctx.progress(0.5 + (0.48 * i) / Math.max(1, todo.length), L(`Photos : ${i + 1} sur ${todo.length}`, `Photos: ${i + 1} of ${todo.length}`));
      const file = ph.find.replace(/^.*\//, "");
      try {
        const real = ph.product ? products.find((x) => x.data.title.trim().toLowerCase() === ph.product!.trim().toLowerCase())?.data.images[0]?.assetId : undefined;
        const assetId = real && getAsset(real) ? real : await ctx.step(`photo:${uid}:${file}`, async () => {
          const prodRef = ph.product ? products.find((x) => x.data.title.trim().toLowerCase() === ph.product!.trim().toLowerCase())?.data.images[0]?.assetId : undefined;
          const ref = prodRef ? getAsset(prodRef) : undefined;
          const prompt = codePhotoPrompt({ id: `ct-${uid}-${file}`, description: ph.description, ratio: ph.ratio, product: !!ph.product }, { name, logo: false, product: !!ref, direction, people: !!fu && people });
          const usageKey = `${ctx.job.id}:photo:${uid}:${file}`;
          const data = customBrandDeps.photo ? await customBrandDeps.photo(prompt, ref ? assetData(ref) : null, ph.ratio, usageKey)
            : await withTrace({ jobId: ctx.job.id, projectId: p.id, step: "custom-photo", costCapMicro: a.capMicro }, () => withQuotedImageRoute(mockupImageRoute(), () => aiSiteImageHd({ userId: p.userId, projectId: p.id, jobId: ctx.job.id, usageKey }, { prompt, product: ref ? assetData(ref) : null, aspect: hdAspect(ph.ratio) })));
          const asset = await saveAsset({ projectId: p.id, userId: p.userId, data, name: `theme-sur-mesure-${file.replace(/\.[a-z]+$/, "")}.png`, mime: "image/png", role: "site", origin: "generated", meta: { synaPhoto: { description: ph.description, ratio: ph.ratio, direction: "custom", product: !!ph.product } } });
          return asset.id;
        });
        if (real) report.photosReal++; else report.photosMade++;
        t = loadCustomTheme(p.id)!;
        const cur = allSections(t).find((y) => y.s.uid === uid);
        if (cur) { cur.s.html = sectionHtml(cur.s).split(ph.find).join(assetUrl({ id: assetId })); t = saveCustomTheme(p.id, t); }
      } catch (e) { report.problems.push(`photo ${file} non créée (${(e as Error).message.slice(0, 120)})`); }
    }
  }

  ctx.progress(1, L("Thème monté à ta marque", "Theme built for your brand"));
  if (a.conversationId) { try { updateJourney(a.conversationId, (x) => setStep(x, 6, "review", L("thème sur mesure monté à la marque, à voir dans la Boutique", "custom theme built"))); } catch { /* fil supprimé */ } }
  notify(p.userId, p.id, report.problems.length ? L("Ton thème sur mesure est monté : des points restent à voir", "Your custom theme is built: some points remain") : L("Ton thème sur mesure est monté à ta marque", "Your custom theme is built"), L("Il est en place dans l'onglet Boutique.", "It is in the Boutique tab."), report.problems.length ? "warning" : "success");
  return { ...report, version: loadCustomTheme(p.id)?.rev ?? null };
}

export const customBrandHandlers: Record<string, (ctx: JobContext) => Promise<unknown>> = {
  [CUSTOM_BRAND_JOB]: (ctx) => runCustomBrandJob(ctx),
};
