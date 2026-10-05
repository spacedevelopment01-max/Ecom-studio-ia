/**
 * Thème entièrement sur mesure (forfait Dominer).
 *
 * L'IA conçoit d'abord un plan de page pour la marque (suite de sections : intention, contenu, mise en page,
 * effets), puis écrit chaque section Liquid complète (HTML, CSS et JS limités à la section, schéma avec
 * réglages et blocs modifiables dans l'éditeur Shopify, textes tirés des faits du projet, images du projet).
 * Chaque section passe les contrôles du studio (Liquid, schéma, allégations, rendu de l'aperçu), avec deux
 * corrections automatiques au plus, puis Theme Check (outil officiel de Shopify) sur le thème complet.
 * Une section qui échoue malgré les corrections est remplacée, à cet endroit, par la section de la
 * bibliothèque qu'elle devait remplacer, et le client en est informé. Le résultat est une nouvelle version
 * du thème : la version précédente reste restaurable.
 */
import { z } from "zod";
import { loadProject, currentTheme, notify, saveThemeVersion, themeVersion, type Project } from "../projects";
import { id as newId, now, run } from "../db";
import { JobCancelled, JobPaused, PermanentError, UserFacingError, type JobContext } from "../jobs";
import { applyOps, outline, validateCustomSection, validateSpec, type ThemeOp } from "../theme/ops";
import { availableSectionTypes, cloneSpec, parseSchemaBlock, sectionSchema, storeProducts, type SectionInstance, type ThemeSpec } from "../theme/spec";
import { renderPage } from "../theme/render";
import { themeCheck, type ThemeCheckOffense } from "../theme/theme-check";
import { snapshotTheme } from "../theme/snapshot";
import { tidyComposition } from "../theme/tidy";

/** Note minimale de la relecture visuelle pour appliquer un thème sur mesure (en dessous : défauts visibles). */
export const MIN_REVIEW_SCORE = 5;
import { llmConfigured, llmJson } from "../ai/llm";
import { projectContext } from "../ai/context";
import { charter, designBar, placeholder } from "../ai/prompts";
import { aiReviewHome, lintClaims } from "../ai/tasks";
import { contentLang, L, uiLang } from "../i18n-server";

// ---------------------------------------------------------------- schémas des réponses de l'IA

const Value = z.union([z.string(), z.number(), z.boolean(), z.null()]);

export const CustomPlanSchema = z.object({
  /** Pourquoi cette page convient à la marque (langue de l'interface). */
  reasoning: z.string(),
  sections: z
    .array(
      z.object({
        template: z.enum(["index", "product"]),
        /** Identifiant court (lettres minuscules, chiffres, tirets) : le type devient « es-custom-<key> ». */
        key: z.string(),
        /** Nom de la section dans l'éditeur Shopify (25 caractères au plus). */
        name: z.string(),
        intent: z.string(),
        content: z.string(),
        layout: z.string(),
        effects: z.string(),
        /** Fichiers d'images du thème à utiliser. */
        images: z.array(z.string()).default([]),
        /** Fiche produit : avant ou après la section d'achat (main-product, conservée). */
        position: z.enum(["before", "after"]).nullable().optional(),
        /** Section actuelle (identifiant) que cette section remplace, si elle existe. */
        replaces: z.string().nullable().optional(),
        /** Section de la bibliothèque à utiliser si l'écriture échoue. */
        fallback: z.string().nullable().optional(),
      }),
    )
    .min(3)
    .max(16),
});
export type CustomPlan = z.infer<typeof CustomPlanSchema>;
export type PlanItem = CustomPlan["sections"][number] & { type: string };

export const CustomSectionSchema = z.object({
  liquid: z.string(),
  /** Réglages de l'instance placée dans la page (textes, images…) ; les défauts du schéma s'appliquent sinon. */
  settings: z.record(z.string(), Value).optional(),
  blocks: z.array(z.object({ type: z.string(), settings: z.record(z.string(), Value).optional() })).max(24).optional(),
  /** Court résumé de la section (langue de l'interface). */
  notes: z.string().optional(),
});
export type CustomSectionOut = z.infer<typeof CustomSectionSchema>;

/** Résultat de l'écriture d'une section (enregistré comme point de reprise de la tâche). */
export type SectionOutcome =
  | { ok: true; type: string; name: string; liquid: string; settings?: Record<string, unknown>; blocks?: { type: string; settings?: Record<string, unknown> }[]; rounds: number }
  | { ok: false; type: string; name: string; reason: string; rounds: number; /** Message déjà écrit pour le client (forfait, IA indisponible…). */ userMessage?: string };

type Base = { userId: string; projectId: string; jobId?: string | null; usageKey?: string };

// ---------------------------------------------------------------- consignes

const SALES = /^(featured-product|featured-collection|collection-list|product-|shipping-journey|featured-offer|countdown|main-)/;

/** Conventions du thème du studio pour écrire une section qui s'y intègre (référence stable, mise en cache). */
function sectionGuide(spec: ThemeSpec): string {
  return `<guide_sections_sur_mesure>
Tu écris UNE section Shopify Online Store 2.0 (un fichier sections/<type>.liquid) pour le thème du studio. Elle doit passer Theme Check sans erreur et s'afficher à l'identique dans l'aperçu du studio et sur Shopify.
Structure attendue :
<section id="es-{{ section.id }}" class="es-section es-cx-<clé> color-{{ section.settings.color_scheme }}" style="--pt: {{ section.settings.padding_top }}px; --pb: {{ section.settings.padding_bottom }}px;">
  <div class="es-container"> … </div>
</section>
puis {% stylesheet %} … {% endstylesheet %} (ou une balise <style> préfixée par #es-{{ section.id }}), éventuellement un <script> en ligne, puis {% schema %} … {% endschema %}.
Variables CSS du thème (couleurs du schéma choisi, typographies, arrondis) : var(--c-bg), var(--c-text), var(--c-muted), var(--c-accent), var(--c-accent-text), var(--c-surface), var(--c-border), rgb(var(--c-accent-rgb) / .2), rgb(var(--c-text-rgb) / .6), var(--font-heading), var(--font-body), var(--radius-card), var(--radius-button), var(--ease-out), var(--gutter). N'impose aucune police ni couleur en dur : la section suit les réglages globaux.
Classes du thème réutilisables : es-container, es-heading es-h1 / es-h2 / es-h3, es-eyebrow (surtitre), es-rte (texte riche), es-button, es-button es-button--secondary, es-cover (image qui couvre son cadre). Apparitions au défilement déjà gérées par le thème : data-reveal="up" | "words" | "zoom" | "mask" | "curtain" (avec style="--d: 1" pour décaler).
Images : pour chaque image, deux réglages : { "type": "image_picker", "id": "image" } et { "type": "text", "id": "image_asset", "default": "<fichier du thème>" } ; affichage : {% render 'es-image', image: section.settings.image, asset: section.settings.image_asset, alt: <texte alternatif>, sizes: '(min-width: 990px) 50vw, 100vw', class: 'es-cover' %}. Même principe dans les blocs (block.settings.image / block.settings.image_asset). N'utilise que les fichiers fournis.
Blocs : {% for block in section.blocks %}<div {{ block.shopify_attributes }}>…</div>{% endfor %}, chaque bloc avec "name" (25 caractères au plus) et ses réglages ; "max_blocks" si utile.
Schéma : "name" de 25 caractères au plus ; "tag": "div" ; réglages avec "type", "id" et "label" ; textes par défaut ("default") = les vrais textes de la marque ; { "type": "color_scheme", "id": "color_scheme", "label": "…", "default": "scheme-1" } (scheme-1 fond principal, scheme-2 surface douce, scheme-3 contraste sombre, scheme-4 accent) ; { "type": "range", "id": "padding_top", "min": 0, "max": 200, "step": 8, "unit": "px", "label": "…", "default": 96 } et padding_bottom ; "presets": [{ "name": "<25 caractères au plus>", "blocks": [...] }]. Types de réglages autorisés : text, textarea, richtext (contenu en <p>…</p>), inline_richtext, image_picker, url, checkbox, range (bornes et pas cohérents avec le défaut), select (options value/label, défaut parmi les options), color_scheme, video_url, product, collection.
JavaScript : vanilla, léger, sans dépendance ni ressource externe, limité à la section (document.getElementById('es-{{ section.id }}')), sans eval, sans cookies ; animations et défilements désactivés si window.matchMedia('(prefers-reduced-motion: reduce)').matches ; contenu lisible sans JavaScript.
Liquid : objets et filtres Shopify standard uniquement ; pas de {% include %} ; pas de filtre de traduction « t » ; pas de lien ni de script vers un autre site. ${spec.store.business === "services" ? "Site de services : aucune notion de panier, de commande ou de livraison." : "Fiche produit : l'objet « product » est disponible (product.title, product.price | money, product.featured_image) ; ne refais pas le formulaire d'achat (la section main-product reste en place)."}
Accessibilité : un seul titre par niveau logique (h2 dans les sections, jamais h1 hors de l'ouverture), contrastes AA, textes alternatifs, boutons d'au moins 44 px, rien d'essentiel porté seulement par l'animation.
Véracité : textes issus des faits confirmés du projet, de la marque et des textes déjà rédigés ; aucun avis, note, étoile, chiffre, certification, label, promotion, délai ou promesse non confirmés ; une information manquante s'écrit « ${placeholder(contentLang())} ».
</guide_sections_sur_mesure>`;
}

function systemPrompt(): string {
  const lang = contentLang();
  return `${charter(lang)}

Rôle : directeur artistique et développeur Shopify senior d'une agence premium. Tu crées un thème ENTIÈREMENT sur mesure pour une marque : chaque section de la page d'accueil et de la fiche produit est pensée et codée pour elle, sans reprendre les sections d'une bibliothèque.

${designBar(lang)}

Langues : textes de la boutique (titres, paragraphes, boutons, textes par défaut des schémas, noms des sections et des réglages dans l'éditeur) en ${lang === "en" ? "anglais" : "français"} ; « reasoning » et « notes » dans la langue de l'interface.`;
}

function filesList(spec: ThemeSpec): string {
  const files = Object.keys(spec.files);
  return files.length ? files.join(", ") : "aucun fichier d'image (prévois des emplacements d'image vides : le marchand choisira ses images dans l'éditeur)";
}

/** Plan de page : suite de sections pensées pour la marque. */
export async function aiCustomThemePlan(b: Base, p: Project, spec: ThemeSpec): Promise<CustomPlan> {
  const library = availableSectionTypes(spec).filter((t) => !/^(main-|header|footer|announcement|cart-drawer|apps|custom-liquid|legal-page)/.test(t));
  const catalog = (spec.store.products?.length ?? 0) > 0;
  return llmJson(
    {
      task: "theme_custom",
      userId: b.userId,
      projectId: b.projectId,
      jobId: b.jobId,
      usageKey: b.usageKey,
      system: systemPrompt(),
      context: projectContext(p, "shop"),
      reference: sectionGuide(spec),
      prompt: `Conçois le PLAN d'un thème entièrement sur mesure pour cette marque (direction actuelle : ${spec.direction}).
Composition actuelle (sections de bibliothèque, à remplacer ; leurs textes déjà rédigés et validés sont à reprendre) :
${outline(spec, ["index", "product"])}
Fichiers d'images du thème : ${filesList(spec)}
${spec.store.business === "services" ? "SITE D'ENTREPRISE DE SERVICES : présenter l'activité et ses prestations, amener à prendre rendez-vous, demander un devis ou appeler. Aucune section de vente (panier, produit, livraison).\n" : ""}${catalog ? `Boutique à plusieurs produits (${(spec.store.products?.length ?? 0) + 1} produits ; collections : ${(spec.store.collections ?? []).map((c) => c.handle).join(", ")}) : prévois une section qui présente les produits (collections.all.products ou la collection voulue).\n` : ""}Donne :
- 7 à 10 sections pour la page d'accueil (template « index »), dans l'ordre, avec un vrai rythme (accroche immersive, preuve visuelle, détails, usage, engagements réels, appel à l'action) ;
- 1 à 3 sections pour la fiche produit (template « product »), placées avant ou après la section d'achat (position « before » ou « after ») qui reste en place.
Pour chaque section : key (minuscules, chiffres, tirets, 30 caractères au plus, unique), name (25 caractères au plus), intent (rôle dans la page), content (textes précis à afficher, tirés du contexte et des textes actuels), layout (mise en page ordinateur et téléphone), effects (animations et interactions, sobres et respectueuses de « réduire les animations »), images (fichiers du thème à utiliser), replaces (identifiant de la section actuelle qu'elle remplace, ou null), fallback (type de section de la bibliothèque équivalente, utilisé seulement si l'écriture échoue : ${library.join(", ")}).
Chaque section doit être différente, propre à cette marque, sans reprendre la structure d'une section de bibliothèque. Aucune section d'avis, de notes ou de chiffres non confirmés.`,
      maxTokens: 12000,
    },
    CustomPlanSchema,
  );
}

/** Écriture (ou correction) d'une section du plan. */
export async function aiCustomSection(b: Base, p: Project, spec: ThemeSpec, plan: PlanItem[], index: number, fix?: { issues: string[]; previous?: string }): Promise<CustomSectionOut> {
  const item = plan[index];
  const others = plan.map((s, i) => `${i === index ? "→" : " "} ${s.template} · ${s.name} : ${s.intent}`).join("\n");
  return llmJson(
    {
      task: "theme_custom",
      userId: b.userId,
      projectId: b.projectId,
      jobId: b.jobId,
      usageKey: b.usageKey,
      system: systemPrompt(),
      context: projectContext(p, "shop"),
      reference: sectionGuide(spec),
      prompt: `Plan complet du thème (pour rester cohérent avec les autres sections) :
${others}

Écris la section « ${item.name} » (type ${item.type}, gabarit ${item.template}${item.template === "product" ? `, ${item.position === "before" ? "avant" : "après"} la section d'achat` : ""}).
Intention : ${item.intent}
Contenu : ${item.content}
Mise en page : ${item.layout}
Effets : ${item.effects}
Images à utiliser : ${item.images.filter((f) => f in spec.files).join(", ") || "aucune imposée"} (fichiers disponibles : ${filesList(spec)})
Classe CSS de la section : es-cx-${item.type.replace(/^es-custom-/, "")}. Le schéma doit s'appeler « ${item.name.slice(0, 25)} ».
Réponds avec : liquid (le fichier complet), settings (valeurs de l'instance, seulement des identifiants du schéma ; facultatif si les défauts suffisent), blocks (blocs de l'instance : type et settings), notes (une phrase).${
        fix
          ? `\n\nCORRECTION : la version précédente a été refusée par les contrôles automatiques :\n${fix.issues.map((x) => `- ${x}`).join("\n")}\nCorrige tous ces points et renvoie la section complète.${fix.previous ? `\nVersion précédente :\n<section_precedente>\n${fix.previous.slice(0, 40000)}\n</section_precedente>` : ""}`
          : ""
      }`,
      maxTokens: 24000,
    },
    CustomSectionSchema,
  );
}

// ---------------------------------------------------------------- plan

const slugKey = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30);

/** Normalise le plan : types uniques (sans écraser une section sur mesure existante), noms courts, accueil d'au moins 3 sections. */
export function normalizePlan(plan: CustomPlan, base: ThemeSpec): PlanItem[] {
  const used = new Set(Object.keys(base.customSections ?? {}));
  const out: PlanItem[] = [];
  for (const s of plan.sections) {
    const key = slugKey(s.key) || slugKey(s.name) || "section";
    let type = `es-custom-${key.length < 2 ? `${key}-s` : key}`;
    for (let n = 2; used.has(type); n++) type = `es-custom-${key.slice(0, 36)}-${n}`;
    used.add(type);
    out.push({ ...s, key, type, name: (s.name.trim() || key).slice(0, 25), images: s.images ?? [] });
  }
  if (out.filter((s) => s.template === "index").length < 3) throw new PermanentError(L("Le plan du thème sur mesure est incomplet (moins de trois sections pour l'accueil).", "The custom theme plan is incomplete (fewer than three home sections)."));
  return out;
}

// ---------------------------------------------------------------- contrôles d'une section

/** Texte visible d'une section (sans styles, scripts, Liquid ni balises) et textes par défaut de son schéma. */
function visibleTexts(liquid: string): { text: string; defaults: unknown[] } {
  const schema = (() => {
    try {
      return parseSchemaBlock(liquid);
    } catch {
      return null;
    }
  })();
  const defaults: unknown[] = [];
  for (const s of schema?.settings ?? []) if (s.default !== undefined) defaults.push(s.default);
  for (const bl of schema?.blocks ?? []) for (const s of bl.settings ?? []) if (s.default !== undefined) defaults.push(s.default);
  for (const pr of (schema?.presets ?? []) as { blocks?: { settings?: Record<string, unknown> }[] }[]) for (const bl of pr.blocks ?? []) defaults.push(bl.settings ?? {});
  const text = liquid
    .replace(/\{%-?\s*schema\s*-?%\}[\s\S]*?\{%-?\s*endschema\s*-?%\}/g, " ")
    .replace(/\{%-?\s*(stylesheet|javascript|style|comment)\s*-?%\}[\s\S]*?\{%-?\s*end\1\s*-?%\}/g, " ")
    .replace(/<(style|script)[\s\S]*?<\/\1>/gi, " ")
    .replace(/\{\{[\s\S]*?\}\}|\{%[\s\S]*?%\}/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");
  return { text, defaults };
}

/** Problèmes d'une section écrite par l'IA (vide = acceptée). Chaque motif est donné à l'IA pour correction. */
export async function checkCustomSection(p: Project, base: ThemeSpec, item: PlanItem, out: CustomSectionOut): Promise<string[]> {
  const issues: string[] = [];
  const liquid = out.liquid;
  const invalid = validateCustomSection(liquid);
  if (invalid) return [invalid];
  const schema = parseSchemaBlock(liquid)!;
  if (!schema.presets?.length) issues.push(L("le schéma doit contenir « presets » (préréglage) pour que la section soit ajoutable dans l'éditeur Shopify", "the schema must contain “presets” so the section can be added in the Shopify editor"));
  for (const pr of (schema.presets ?? []) as { name?: string }[]) if (!pr.name || pr.name.length > 25) issues.push(L("chaque préréglage doit avoir un nom de 25 caractères au plus", "each preset needs a name of 25 characters or fewer"));
  for (const bl of schema.blocks) if (!bl.name || bl.name.length > 25) issues.push(L(`le bloc « ${bl.type} » doit avoir un nom de 25 caractères au plus`, `block “${bl.type}” needs a name of 25 characters or fewer`));
  const ids = schema.settings.filter((s) => s.id).map((s) => s.id!);
  const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
  if (dup.length) issues.push(L(`identifiants de réglages en double : ${[...new Set(dup)].join(", ")}`, `duplicate setting ids: ${[...new Set(dup)].join(", ")}`));
  if (/\{%-?\s*include\s/.test(liquid)) issues.push(L("« include » est obsolète : utiliser « render »", "“include” is deprecated: use “render”"));
  if (/<link[^>]+href\s*=\s*["']?(https?:)?\/\//i.test(liquid) || /@import\s+url\(\s*["']?(https?:)?\/\//i.test(liquid) || /url\(\s*["']?(https?:)?\/\//i.test(liquid)) issues.push(L("aucune ressource externe (feuille de style, police, image d'un autre site) : utiliser le thème et les fichiers fournis", "no external resources (stylesheet, font, image from another site): use the theme and the provided files"));
  if (/\|\s*t\b/.test(liquid.replace(/\{%-?\s*schema[\s\S]*$/, ""))) issues.push(L("pas de filtre de traduction « t » (clés absentes des traductions du thème) : écrire les textes dans les réglages", "no “t” translation filter (keys missing from the theme locales): put the texts in the settings"));
  // Instance : seulement des réglages et blocs déclarés dans le schéma.
  const unknown = Object.keys(out.settings ?? {}).filter((k) => !ids.includes(k));
  if (unknown.length) issues.push(L(`réglages de l'instance absents du schéma : ${unknown.join(", ")}`, `instance settings missing from the schema: ${unknown.join(", ")}`));
  for (const bl of out.blocks ?? []) {
    const def = schema.blocks.find((x) => x.type === bl.type);
    if (!def) issues.push(L(`bloc « ${bl.type} » absent du schéma`, `block “${bl.type}” missing from the schema`));
    else {
      const bad = Object.keys(bl.settings ?? {}).filter((k) => !(def.settings ?? []).some((s) => s.id === k));
      if (bad.length) issues.push(L(`réglages du bloc « ${bl.type} » absents du schéma : ${bad.join(", ")}`, `settings of block “${bl.type}” missing from the schema: ${bad.join(", ")}`));
    }
  }
  if (schema.max_blocks && (out.blocks?.length ?? 0) > schema.max_blocks) issues.push(L(`plus de blocs que « max_blocks » (${schema.max_blocks})`, `more blocks than “max_blocks” (${schema.max_blocks})`));
  // Véracité : aucune allégation absente des faits confirmés (avis, labels, promotions, garanties…).
  const { text, defaults } = visibleTexts(liquid);
  for (const c of lintClaims({ text, defaults, settings: out.settings ?? {}, blocks: out.blocks ?? [] }, p).slice(0, 4)) issues.push(L(`allégation non confirmée « ${c.term} » (${c.label}) : la retirer ou écrire « ${placeholder(contentLang())} »`, `unconfirmed claim “${c.term}” (${c.label}): remove it or write “${placeholder(contentLang())}”`));
  if (issues.length) return issues;

  // Application sur une copie du thème : opérations validées comme pour une retouche.
  const ops: ThemeOp[] = [
    { op: "custom_section", type: item.type, name: item.name, liquid },
    { op: "add_section", template: item.template, type: item.type, settings: (out.settings ?? {}) as Record<string, string | number | boolean | null>, blocks: out.blocks as { type: string; settings?: Record<string, string | number | boolean | null> }[] | undefined },
  ];
  const r = applyOps(base, ops);
  if (r.rejected.length) return r.rejected.map((x) => x.reason);
  const ignored = r.applied.find((a) => / — (ignoré|ignored)/.test(a));
  if (ignored) return [ignored.replace(/^.*? — (ignoré|ignored) ?: ?/, "")];
  const problems = validateSpec(r.spec);
  if (problems.length) return problems;

  // Rendu de l'aperçu : la section seule, dans sa page.
  const c = r.spec.templates[item.template];
  const sid = c.order[c.order.length - 1];
  const solo = cloneSpec(r.spec);
  solo.templates[item.template] = { sections: { [sid]: c.sections[sid] }, order: [sid], layout: false };
  const path = item.template === "product" ? `/products/${storeProducts(solo)[0].handle}` : "/";
  try {
    const page = await renderPage({ spec: solo, base: "/p", cart: [] }, path, new URLSearchParams());
    const inner = page.html.replace(/<(style|script)[\s\S]*?<\/\1>/gi, "").replace(/<[^>]+>/g, "").trim();
    if (!page.html.includes(`data-es-type="${item.type}"`) || inner.length < 2) issues.push(L("la section ne produit aucun contenu visible", "the section renders no visible content"));
  } catch (e) {
    issues.push(L(`erreur au rendu Liquid : ${(e as Error).message.split("\n")[0].slice(0, 300)}`, `Liquid rendering error: ${(e as Error).message.split("\n")[0].slice(0, 300)}`));
  }
  return issues;
}

const rethrowControl = (e: unknown) => {
  if (e instanceof JobCancelled || e instanceof JobPaused) throw e;
  // Erreurs passagères (réseau, surcharge) : la file réessaie la tâche, les sections déjà écrites sont conservées.
  if (!(e instanceof PermanentError)) throw e;
};

/** Écrit une section avec au plus `corrections` corrections automatiques. */
async function writeSection(p: Project, base: ThemeSpec, plan: PlanItem[], index: number, key: (suffix: string) => Base, opts: { corrections: number; issues?: string[]; previous?: string; tag: string }): Promise<SectionOutcome> {
  const item = plan[index];
  let issues = opts.issues ?? [];
  let previous = opts.previous;
  let rounds = 0;
  for (let attempt = 0; attempt <= opts.corrections; attempt++) {
    rounds++;
    let out: CustomSectionOut;
    try {
      out = await aiCustomSection(key(`${opts.tag}:${index}${attempt ? `:fix${attempt}` : ""}`), p, base, plan, index, issues.length ? { issues, previous } : undefined);
    } catch (e) {
      rethrowControl(e);
      return { ok: false, type: item.type, name: item.name, reason: (e as Error).message.slice(0, 300), rounds, ...(e instanceof UserFacingError ? { userMessage: (e as Error).message.slice(0, 300) } : {}) };
    }
    issues = await checkCustomSection(p, base, item, out);
    if (!issues.length) return { ok: true, type: item.type, name: item.name, liquid: out.liquid, settings: out.settings ?? undefined, blocks: out.blocks ?? undefined, rounds };
    previous = out.liquid;
  }
  return { ok: false, type: item.type, name: item.name, reason: issues.slice(0, 3).join(" ; "), rounds };
}

// ---------------------------------------------------------------- assemblage

type Fallback = { name: string; reason: string; replacement: string | null };

/** Section de la bibliothèque à cet endroit : celle que la section devait remplacer, sinon l'équivalente proposée par le plan. */
function fallbackOp(base: ThemeSpec, item: PlanItem): Extract<ThemeOp, { op: "add_section" }> | null {
  const services = base.store.business === "services";
  const old = item.replaces ? base.templates[item.template]?.sections[item.replaces] : undefined;
  if (old && !/^main-/.test(old.type) && sectionSchema(base, old.type) && !(services && SALES.test(old.type))) {
    return {
      op: "add_section",
      template: item.template,
      type: old.type,
      settings: old.settings as Record<string, string | number | boolean | null>,
      blocks: (old.block_order ?? Object.keys(old.blocks ?? {})).map((bid) => old.blocks?.[bid]).filter((x): x is NonNullable<typeof x> => !!x).map((x) => ({ type: x.type, settings: x.settings as Record<string, string | number | boolean | null> })),
    };
  }
  const t = item.fallback ?? "";
  if (t && !t.startsWith("es-custom-") && !/^main-/.test(t) && sectionSchema(base, t) && !sectionSchema(base, t)?.enabled_on?.groups?.length && !(services && SALES.test(t))) return { op: "add_section", template: item.template, type: t };
  return null;
}

/** Nouveau thème : accueil et sections autour de la fiche produit remplacés par les sections du plan, dans l'ordre. */
export function assembleCustomTheme(base: ThemeSpec, plan: PlanItem[], outcomes: SectionOutcome[]): { spec: ThemeSpec; written: string[]; fallbacks: Fallback[] } {
  const spec = cloneSpec(base);
  const idx = base.templates.index;
  spec.templates.index = { ...(idx?.layout !== undefined ? { layout: idx.layout } : {}), ...(idx?.wrapper ? { wrapper: idx.wrapper } : {}), sections: {}, order: [] };
  const prod = base.templates.product;
  const mains = prod.order.filter((sid) => /^main-/.test(prod.sections[sid]?.type ?? ""));
  spec.templates.product = { ...(prod.layout !== undefined ? { layout: prod.layout } : {}), ...(prod.wrapper ? { wrapper: prod.wrapper } : {}), sections: Object.fromEntries(mains.map((sid) => [sid, prod.sections[sid]])), order: [...mains] };
  // Les validations portaient sur les anciennes sections de ces pages.
  spec.locks = spec.locks.filter((k) => !k.startsWith("index:") && !k.startsWith("product:"));
  const written: string[] = [];
  const fallbacks: Fallback[] = [];
  let before = 0;
  let cur = spec;
  for (const [i, item] of plan.entries()) {
    const o = outcomes[i];
    const position = item.template === "product" && item.position === "before" ? { index: before } : undefined;
    let ops: ThemeOp[] = [];
    if (o?.ok) ops = [{ op: "custom_section", type: o.type, name: o.name, liquid: o.liquid }, { op: "add_section", template: item.template, type: o.type, settings: (o.settings ?? {}) as Record<string, string | number | boolean | null>, blocks: o.blocks as any, position }];
    let r = ops.length ? applyOps(cur, ops) : null;
    if (r && !r.rejected.length) {
      written.push(o!.name);
    } else {
      const fb = fallbackOp(base, item);
      const reason = o && !o.ok ? o.reason : r?.rejected.map((x) => x.reason).join(" ; ") || L("section non écrite", "section not written");
      r = fb ? applyOps(cur, [{ ...fb, position }]) : null;
      const ok = !!r && !r.rejected.length;
      fallbacks.push({ name: item.name, reason, replacement: ok ? sectionSchema(cur, fb!.type, uiLang())?.name ?? fb!.type : null });
      if (!ok) continue;
    }
    cur = r!.spec;
    if (position) before++;
  }
  return { spec: cur, written, fallbacks };
}

/** Sections sur mesure en défaut à Theme Check (erreurs uniquement). */
function offendingTypes(errors: ThemeCheckOffense[], plan: PlanItem[]): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const e of errors) {
    const m = e.file.match(/^sections\/(es-custom-[a-z0-9-]+)\.liquid$/);
    if (!m || !plan.some((s) => s.type === m[1])) continue;
    out.set(m[1], [...(out.get(m[1]) ?? []), `Theme Check ${e.check}${e.line ? ` (ligne ${e.line})` : ""} : ${e.message}`]);
  }
  return out;
}

// ---------------------------------------------------------------- tâche

export type CustomThemeResult = { versionId: string; number: number; written: number; total: number; fallbacks: Fallback[]; themeCheck: "ok" | "unavailable"; reasoning: string };

/**
 * Tâche « theme.custom » : plan, puis sections une à une (points de reprise : une reprise ne réécrit pas — et
 * ne repaie pas — les sections déjà écrites), Theme Check, relecture visuelle, nouvelle version.
 */
export async function buildCustomTheme(ctx: JobContext, projectId: string, opts: { review?: boolean } = {}): Promise<CustomThemeResult> {
  const p = loadProject(projectId);
  const start = currentTheme(projectId);
  if (!start) throw new UserFacingError(L("Créez d'abord la boutique : le thème sur mesure part de votre marque et de vos textes.", "Build the store first: the custom theme starts from your brand and copy."));
  // Thème de départ figé au lancement (une reprise repart du même).
  const baseId = await ctx.step("base", async () => start.version.id);
  const base = themeVersion(projectId, baseId)?.spec ?? start.spec;
  if (base.imported) throw new UserFacingError(L("Votre thème importé est conservé tel quel : le thème entièrement sur mesure se crée à partir d'un thème du studio. Choisissez d'abord un thème dans « Thèmes ».", "Your imported theme is kept as is: the fully custom theme is built from a studio theme. Pick a theme in “Themes” first."));
  if (!llmConfigured()) throw new UserFacingError(L("Le thème entièrement sur mesure est écrit par l'IA, indisponible pour le moment. Réessayez un peu plus tard ; votre thème actuel n'a pas changé.", "The fully custom theme is written by AI, which is unavailable right now. Try again a little later; your current theme hasn't changed."));
  const key = (suffix: string): Base => ({ userId: p.userId, projectId, jobId: ctx.job.id, usageKey: `${ctx.job.id}:${suffix}` });

  ctx.progress(0.03, L("Conception du plan de la page pour votre marque", "Designing the page plan for your brand"));
  const rawPlan = await ctx.step("plan", () => aiCustomThemePlan(key("plan"), p, base));
  const plan = normalizePlan(rawPlan, base);

  const outcomes: SectionOutcome[] = [];
  for (const [i, item] of plan.entries()) {
    ctx.progress(0.08 + (0.7 * i) / plan.length, L(`Section ${i + 1} sur ${plan.length} : ${item.name}`, `Section ${i + 1} of ${plan.length}: ${item.name}`));
    outcomes.push(await ctx.step(`section:${i}`, () => writeSection(p, base, plan, i, key, { corrections: 2, tag: "section" })));
  }
  if (!outcomes.some((o) => o.ok)) {
    // Détail technique (Zod, fournisseur, contrôles) dans les journaux ; au client, une raison simple.
    const failures = outcomes.filter((o): o is Extract<SectionOutcome, { ok: false }> => !o.ok);
    console.warn("[custom-theme] aucune section écrite :", failures.map((o) => `${o.type}: ${o.reason}`).join(" | ").slice(0, 2000));
    const userMessage = failures.find((o) => o.userMessage)?.userMessage;
    const why = userMessage ?? L("l'IA n'a pas produit de section qui passe tous les contrôles (Shopify, véracité)", "the AI didn't produce a section that passes every check (Shopify, accuracy)");
    throw new UserFacingError(L(`Aucune section n'a pu être écrite : ${why}. Votre thème actuel n'a pas changé ; réessayez plus tard.`, `No section could be written: ${why}. Your current theme hasn't changed; try again later.`));
  }

  // Theme Check sur le thème complet : une correction ciblée par section en défaut, sinon la bibliothèque à cet endroit.
  ctx.progress(0.8, L("Contrôle Theme Check (Shopify)", "Theme Check (Shopify)"));
  let built = assembleCustomTheme(base, plan, outcomes);
  let tc = await themeCheck(built.spec);
  if (tc.available) {
    const bad = offendingTypes(tc.errors, plan);
    if (bad.size) {
      for (const [type, errs] of bad) {
        const i = plan.findIndex((s) => s.type === type);
        const prev = outcomes[i];
        ctx.progress(0.84, L(`Correction de « ${plan[i].name} » (Theme Check)`, `Fixing “${plan[i].name}” (Theme Check)`));
        const fixed = await ctx.step(`tc-fix:${i}`, () => writeSection(p, base, plan, i, key, { corrections: 0, issues: errs, previous: prev.ok ? prev.liquid : undefined, tag: "tc" }));
        outcomes[i] = fixed;
      }
      built = assembleCustomTheme(base, plan, outcomes);
      tc = await themeCheck(built.spec);
      const still = offendingTypes(tc.errors, plan);
      if (still.size) {
        for (const [type, errs] of still) {
          const i = plan.findIndex((s) => s.type === type);
          outcomes[i] = { ok: false, type, name: plan[i].name, reason: errs.slice(0, 2).join(" ; "), rounds: outcomes[i].rounds + 1 };
        }
        built = assembleCustomTheme(base, plan, outcomes);
        tc = await themeCheck(built.spec);
      }
    }
    const remaining = tc.errors.filter((e) => /^sections\/es-custom-/.test(e.file) && plan.some((s) => e.file === `sections/${s.type}.liquid`));
    if (remaining.length) throw new PermanentError(L(`Theme Check : ${remaining[0].check} — ${remaining[0].message}`, `Theme Check: ${remaining[0].check} — ${remaining[0].message}`));
  }
  let spec = built.spec;

  // Relecture visuelle (captures ordinateur et téléphone) : seulement des réglages, sans revenir à la bibliothèque.
  let score: number | null = null;
  if (opts.review !== false) {
    try {
      ctx.progress(0.9, L("Relecture visuelle de la page", "Visual review of the page"));
      const review = await ctx.step("review", async () => {
        const shots = await snapshotTheme(spec);
        const product = shots ? await snapshotTheme(spec, `/products/${spec.store.product.handle}`, { desktopSheets: 2, mobileSheets: 1 }).catch(() => null) : null;
        return shots ? aiReviewHome(key("review"), p, spec, { ...shots, product }) : null;
      });
      if (review) {
        score = review.score;
        const safe = review.ops.filter((o) => ["set_setting", "set_scheme_color", "set_global", "move_section", "toggle_section"].includes(o.op));
        if (safe.length) {
          const r = applyOps(spec, safe);
          if (r.applied.length && !validateSpec(r.spec).length) spec = r.spec;
        }
      }
    } catch (e) {
      if (e instanceof JobCancelled || e instanceof JobPaused) throw e;
      console.warn("[custom-theme] relecture visuelle indisponible :", (e as Error).message);
    }
  }

  // Relecture sévère (note sous 5 : défauts visibles) : le thème n'est pas présenté comme prêt ; le thème actuel reste en place.
  if (score !== null && score < MIN_REVIEW_SCORE) {
    throw new UserFacingError(L(
      `Le thème sur mesure n'a pas atteint le niveau attendu à la relecture visuelle (${score}/10) : il n'a pas été appliqué et votre thème actuel n'a pas changé. Relancez la création pour obtenir une autre proposition.`,
      `The custom theme didn't reach the expected standard in the visual review (${score}/10): it wasn't applied and your current theme hasn't changed. Run the creation again to get another proposal.`,
    ));
  }
  spec = tidyComposition(spec);
  const problems = validateSpec(spec);
  if (problems.length) throw new PermanentError(L(`Thème invalide : ${problems.join(" ; ")}`, `Invalid theme: ${problems.join("; ")}`));
  ctx.progress(0.96, L("Enregistrement de la nouvelle version", "Saving the new version"));
  const total = plan.length;
  const written = built.written.length;
  const summary = L(
    `Thème entièrement sur mesure — ${written} section${written > 1 ? "s" : ""} sur ${total} écrite${written > 1 ? "s" : ""} par l'IA pour ${p.brand?.name ?? p.name}${built.fallbacks.length ? ` (${built.fallbacks.length} reprise${built.fallbacks.length > 1 ? "s" : ""} de la bibliothèque)` : ""}`,
    `Fully custom theme — ${written} of ${total} section${total > 1 ? "s" : ""} written by AI for ${p.brand?.name ?? p.name}${built.fallbacks.length ? ` (${built.fallbacks.length} taken from the library)` : ""}`,
  );
  const v = saveThemeVersion(projectId, spec, summary.slice(0, 300), "ai", {
    checks: L(["structure", "schémas des sections", "Liquid", "allégations", "rendu de l'aperçu", tc.available ? "Theme Check" : "Theme Check indisponible"], ["structure", "section schemas", "Liquid", "claims", "preview rendering", tc.available ? "Theme Check" : "Theme Check unavailable"]),
    problems,
    custom: { written: built.written, fallbacks: built.fallbacks, score },
  });
  // Compte rendu honnête dans la discussion de la boutique.
  const note = [
    L(`Votre thème entièrement sur mesure est prêt (version ${v.number}). ${written} section${written > 1 ? "s ont été écrites" : " a été écrite"} pour votre marque : ${built.written.join(", ")}.`, `Your fully custom theme is ready (version ${v.number}). ${written} section${written > 1 ? "s were" : " was"} written for your brand: ${built.written.join(", ")}.`),
    rawPlan.reasoning ? `\n\n${rawPlan.reasoning.slice(0, 600)}` : "",
    built.fallbacks.length
      ? L(
          `\n\nÀ savoir : ${built.fallbacks.map((f) => (f.replacement ? `« ${f.name} » n'a pas passé les contrôles malgré les corrections automatiques, la section « ${f.replacement} » de la bibliothèque est gardée à cet endroit` : `« ${f.name} » n'a pas passé les contrôles et a été retirée`)).join(" ; ")}.`,
          `\n\nPlease note: ${built.fallbacks.map((f) => (f.replacement ? `“${f.name}” didn't pass the checks despite the automatic fixes, so the library section “${f.replacement}” is kept in its place` : `“${f.name}” didn't pass the checks and was left out`)).join("; ")}.`,
        )
      : "",
    L(`\n\nLa page d'achat (formulaire d'ajout au panier) reste celle du thème, éprouvée. Votre thème précédent est conservé dans les versions.`, `\n\nThe buy form on the product page stays the theme's proven one. Your previous theme is kept in the versions.`),
  ].join("");
  run("INSERT INTO chat_messages (id, project_id, thread, role, content, theme_version_id, job_id, created_at) VALUES (?,?,?,?,?,?,?,?)", newId(), projectId, "shop", "assistant", note, v.id, ctx.job.id, now());
  notify(p.userId, projectId, L("Votre thème sur mesure est prêt", "Your custom theme is ready"), summary.slice(0, 200), "success");
  ctx.progress(0.99, L("Thème sur mesure enregistré", "Custom theme saved"));
  return { versionId: v.id, number: v.number, written, total, fallbacks: built.fallbacks, themeCheck: tc.available ? "ok" : "unavailable", reasoning: rawPlan.reasoning.slice(0, 600) };
}
