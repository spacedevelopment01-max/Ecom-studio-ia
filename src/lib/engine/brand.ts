/** Marque : direction (IA ou locale), logo vectoriel et charte. */
import { all, one } from "../db";
import { saveAsset, type Asset } from "../library";
import { loadProject, saveBrand, saveStrategy, remember } from "../projects";
import { logoSet, type LogoSpec } from "../media/logo";
import { aiBrand, brandFromAi } from "../ai/tasks";
import { llmConfigured } from "../ai/llm";
import { localBrand } from "./local";
import type { JobContext } from "../jobs";
import { directionById } from "../theme/directions";
import { isDark, withLightness } from "../color";
import type { Brand } from "../project-types";

export async function buildBrand(ctx: JobContext, projectId: string, opts: { providedBrand?: string; guidance?: string } = {}) {
  const p = loadProject(projectId);
  let brand: Brand;
  let logoSpec: Omit<LogoSpec, "color">;
  const keepValidated = p.brand?.validated ?? [];
  if (llmConfigured()) {
    ctx.progress(0.1, "Direction de marque (IA)");
    const r = await ctx.step("brand-ai", () => aiBrand({ userId: p.userId, projectId, jobId: ctx.job.id, usageKey: `${ctx.job.id}:brand` }, p, opts.guidance));
    const out = brandFromAi(r, { concept: r.logo.concept, status: "proposed" });
    brand = out.brand;
    saveStrategy(projectId, out.strategy);
    logoSpec = { name: r.name, family: r.logo.family, weight: r.logo.weight, italic: r.logo.italic, case: r.logo.case, tracking: r.logo.tracking, layout: r.logo.layout, emblem: r.logo.emblem };
    remember(projectId, { kind: "decision", key: "direction_boutique", value: `${directionById(r.direction).name} — ${r.directionReason}`, status: "inferred", source: "ai", scope: "shop" });
  } else {
    ctx.progress(0.1, "Direction de marque (moteur local)");
    const out = localBrand(p.product, opts.providedBrand || p.brand?.name);
    brand = out.brand;
    saveStrategy(projectId, out.strategy);
    logoSpec = out.logoSpec;
  }
  // Les éléments déjà validés par le client sont conservés.
  if (p.brand && keepValidated.length) {
    for (const k of keepValidated) (brand as any)[k] = (p.brand as any)[k];
    brand.validated = keepValidated;
  }
  if (opts.providedBrand) {
    brand.name = opts.providedBrand;
    brand.nameStatus = "provided";
    logoSpec.name = opts.providedBrand;
  }

  // Logo : celui du client est conservé ; sinon création d'un logo vectoriel.
  const clientLogo = one<Asset>("SELECT * FROM assets WHERE project_id = ? AND role = 'logo' AND origin = 'upload' AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1", projectId);
  if (clientLogo) {
    brand.logo = { assetId: clientLogo.id, concept: "Logo fourni par le client", status: "provided" };
  } else if (!keepValidated.includes("logo")) {
    ctx.progress(0.6, "Création du logo vectoriel");
    const color = isDark(brand.palette.dark) ? brand.palette.dark : withLightness(brand.palette.dark, 0.12);
    const set = await logoSet({ ...logoSpec, name: brand.name, color }, "#FFFFFF");
    const base = { projectId, userId: p.userId, folderKey: "brand.logos", origin: "generated" as const, meta: { spec: logoSpec, concept: brand.logo.concept } };
    const main = await saveAsset({ ...base, data: set.mainPng, name: "logo-principal.png", mime: "image/png", role: "logo", status: "review" });
    await saveAsset({ ...base, data: Buffer.from(set.mainSvg), name: "logo-principal.svg", mime: "image/svg+xml", kind: "logo", role: "logo-svg", sourceAssetId: main.id });
    await saveAsset({ ...base, data: set.lightPng, name: "logo-clair.png", mime: "image/png", role: "logo-light", sourceAssetId: main.id });
    await saveAsset({ ...base, data: Buffer.from(set.lightSvg), name: "logo-clair.svg", mime: "image/svg+xml", kind: "logo", role: "logo-light-svg", sourceAssetId: main.id });
    await saveAsset({ ...base, data: set.monoPng, name: "monogramme.png", mime: "image/png", role: "logo-mark", sourceAssetId: main.id });
    await saveAsset({ ...base, data: Buffer.from(set.monoSvg), name: "monogramme.svg", mime: "image/svg+xml", kind: "logo", role: "logo-mark-svg", sourceAssetId: main.id });
    await saveAsset({ ...base, data: set.faviconPng, name: "favicon.png", mime: "image/png", role: "favicon", sourceAssetId: main.id });
    brand.logo = { assetId: main.id, concept: brand.logo.concept, status: "proposed" };
  }
  saveBrand(projectId, brand);
  await saveBrandGuide(projectId);
  return brand;
}

/** Charte de marque au format Markdown (rangée dans « Charte & palette »). */
export async function saveBrandGuide(projectId: string) {
  const p = loadProject(projectId);
  const b = p.brand;
  if (!b) return;
  const md = `# Charte de marque — ${b.name}

${b.tagline ? `> ${b.tagline}\n` : ""}
## Positionnement
${b.positioning}

**Cible :** ${b.audience}

## Personnalité et ton
- Personnalité : ${b.personality.join(", ") || "à préciser"}
- Voix : ${b.tone.voice}
- À faire : ${b.tone.do.join(" ; ")}
- À éviter : ${b.tone.dont.join(" ; ")}

## Palette
| Rôle | Couleur |
|---|---|
| Principale | ${b.palette.primary} |
| Secondaire | ${b.palette.secondary} |
| Accent | ${b.palette.accent} |
| Clair | ${b.palette.light} |
| Sombre | ${b.palette.dark} |

## Typographies (bibliothèque de polices Shopify)
- Titres : ${b.fonts.heading}
- Texte : ${b.fonts.body}

## Logo
${b.logo.concept}

## Direction artistique de la boutique
${directionById(b.direction).name} — ${directionById(b.direction).description}

${b.story ? `## Histoire\n${b.story}\n` : ""}
${b.values.length ? `## Valeurs\n${b.values.map((v) => `- **${v.title}** : ${v.text}`).join("\n")}\n` : ""}
_Document généré par E-COM STUDIO IA (${b.generatedBy === "ai" ? "IA" : "moteur local"}). Les éléments « À compléter » restent à confirmer._
`;
  const prev = all<Asset>("SELECT * FROM assets WHERE project_id = ? AND role = 'brand-guide' AND deleted_at IS NULL ORDER BY version DESC LIMIT 1", projectId)[0];
  await saveAsset({ projectId, userId: p.userId, data: Buffer.from(md, "utf8"), name: "charte-de-marque.md", mime: "text/markdown", kind: "document", role: "brand-guide", folderKey: "brand.guide", origin: "generated", versionOf: prev ? prev.version_of ?? prev.id : null, meta: { recipe: "Charte de marque" } });
}
