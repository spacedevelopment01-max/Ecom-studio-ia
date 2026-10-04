/** Marque : direction (IA ou locale), logo vectoriel et charte. */
import { all, one } from "../db";
import { saveAsset, type Asset } from "../library";
import { loadProject, saveBrand, saveStrategy, remember } from "../projects";
import type { LogoSpec } from "../media/logo";
import { loadImage } from "@napi-rs/canvas";
import { renderBrandBook } from "../media/brand-book";
import { canvasFamily } from "../media/fonts";
import { assetData, getAsset } from "../library";
import { sectorLabel } from "../project-types";
import { C, L, contentLang } from "../i18n-server";
import { generateLogos, proposeTaglines } from "./identity";
import { aiBrand, brandFromAi } from "../ai/tasks";
import { llmConfigured } from "../ai/llm";
import { localBrand } from "./local";
import type { JobContext } from "../jobs";
import { directionById } from "../theme/directions";
import type { Brand } from "../project-types";

export async function buildBrand(ctx: JobContext, projectId: string, opts: { providedBrand?: string; guidance?: string } = {}) {
  const p = loadProject(projectId);
  let brand: Brand;
  let logoSpec: Omit<LogoSpec, "color">;
  const keepValidated = p.brand?.validated ?? [];
  if (llmConfigured()) {
    ctx.progress(0.1, L("Direction de marque (IA)", "Brand direction (AI)"));
    const r = await ctx.step("brand-ai", () => aiBrand({ userId: p.userId, projectId, jobId: ctx.job.id, usageKey: `${ctx.job.id}:brand` }, p, opts.guidance));
    const out = brandFromAi(r, { concept: r.logo.concept, status: "proposed" });
    brand = out.brand;
    saveStrategy(projectId, out.strategy);
    logoSpec = { name: r.name, family: r.logo.family, weight: r.logo.weight, italic: r.logo.italic, case: r.logo.case, tracking: r.logo.tracking, layout: r.logo.layout, emblem: r.logo.emblem };
    remember(projectId, { kind: "decision", key: "direction_boutique", value: `${directionById(r.direction).name} — ${r.directionReason}`, status: "inferred", source: "ai", scope: "shop" });
  } else {
    ctx.progress(0.1, L("Direction de marque (moteur local)", "Brand direction (local engine)"));
    const out = localBrand(p.product, opts.providedBrand || p.brand?.name, p);
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

  // Signatures : la proposition retenue et d'autres pistes au choix (une signature validée est conservée).
  const lines = proposeTaglines({ ...p, brand });
  if (!keepValidated.includes("tagline") && !brand.tagline) brand.tagline = lines[0] ?? "";
  brand.taglineAlternatives = lines.filter((x) => x !== brand.tagline).slice(0, 5);

  // Logo : celui du client est conservé ; sinon trois propositions vectorielles, la plus adaptée appliquée.
  const clientLogo = one<Asset>("SELECT * FROM assets WHERE project_id = ? AND role = 'logo' AND origin = 'upload' AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1", projectId);
  if (clientLogo) brand.logo = { assetId: clientLogo.id, concept: C("Logo fourni par le client", "Logo provided by the client"), status: "provided" };
  saveBrand(projectId, brand);
  if (!clientLogo && !keepValidated.includes("logo")) await generateLogos(ctx, projectId, { base: { ...logoSpec, name: brand.name } });
  await saveBrandGuide(projectId);
  ctx.progress(0.9, L("Charte de marque (PDF)", "Brand guidelines (PDF)"));
  await saveBrandBook(projectId);
  return loadProject(projectId).brand!;
}

/** Charte mise en page (PDF + planches), à partir du logo et des choix actuels. */
export async function saveBrandBook(projectId: string) {
  const p = loadProject(projectId);
  const b = p.brand;
  if (!b) return null;
  const latest = (role: string) => all<Asset>("SELECT * FROM assets WHERE project_id = ? AND role = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1", projectId, role)[0];
  const main = b.logo.assetId ? getAsset(b.logo.assetId) ?? latest("logo") : latest("logo");
  const derived = (role: string) => (main ? all<Asset>("SELECT * FROM assets WHERE project_id = ? AND role = ? AND source_asset_id = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1", projectId, role, main.id)[0] : undefined) ?? latest(role);
  const img = async (a?: Asset) => (a ? loadImage(assetData(a)) : null);
  const d = directionById(b.direction);
  const { pages, pdf } = renderBrandBook({
    brand: b,
    strategy: p.strategy,
    headingFamily: canvasFamily(b.fonts.heading ?? d.fonts.heading, "Cormorant"),
    bodyFamily: canvasFamily(b.fonts.body ?? d.fonts.body, "Jost"),
    logo: await img(main),
    logoLight: await img(derived("logo-light")),
    logoWeb: await img(derived("logo-horizontal") ?? main),
    mark: await img(derived("logo-mark")),
    product: await img(latest("cutout")),
    sectorLabel: sectorLabel(p.product.sector, contentLang()),
    date: new Date(),
  });
  const batch = Date.now().toString(36);
  const prev = latest("brand-book");
  const book = await saveAsset({ projectId, userId: p.userId, data: pdf, name: `${C("charte", "brand-guidelines")}-${b.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`, mime: "application/pdf", kind: "document", role: "brand-book", folderKey: "brand.guide", origin: "generated", versionOf: prev ? prev.version_of ?? prev.id : null, meta: { pages: pages.length, batch } });
  for (const [i, jpg] of pages.entries()) await saveAsset({ projectId, userId: p.userId, data: jpg, name: `${C("charte-planche", "brand-guidelines-page")}-${i + 1}.jpg`, mime: "image/jpeg", role: "brand-book-page", folderKey: "brand.guide", origin: "generated", sourceAssetId: book.id, meta: { page: i + 1, batch } });
  return book;
}

/** Charte de marque au format Markdown (rangée dans « Charte & palette »). */
export async function saveBrandGuide(projectId: string) {
  const p = loadProject(projectId);
  const b = p.brand;
  if (!b) return;
  const d = directionById(b.direction);
  const md = C(`# Charte de marque — ${b.name}

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

## Direction artistique ${p.business === "services" ? "du site" : "de la boutique"}
${d.name} — ${d.description}

${b.story ? `## Histoire\n${b.story}\n` : ""}
${b.values.length ? `## Valeurs\n${b.values.map((v) => `- **${v.title}** : ${v.text}`).join("\n")}\n` : ""}
_Document généré par E-COM STUDIO IA (${b.generatedBy === "ai" ? "IA" : "moteur local"}). Les éléments « À compléter » restent à confirmer._
`, `# Brand guidelines — ${b.name}

${b.tagline ? `> ${b.tagline}\n` : ""}
## Positioning
${b.positioning}

**Audience:** ${b.audience}

## Personality and tone
- Personality: ${b.personality.join(", ") || "to be defined"}
- Voice: ${b.tone.voice}
- Do: ${b.tone.do.join("; ")}
- Don't: ${b.tone.dont.join("; ")}

## Palette
| Role | Color |
|---|---|
| Primary | ${b.palette.primary} |
| Secondary | ${b.palette.secondary} |
| Accent | ${b.palette.accent} |
| Light | ${b.palette.light} |
| Dark | ${b.palette.dark} |

## Typography (Shopify font library)
- Headings: ${b.fonts.heading}
- Body: ${b.fonts.body}

## Logo
${b.logo.concept}

## ${p.business === "services" ? "Website" : "Store"} art direction
${d.name} — ${d.description}

${b.story ? `## Story\n${b.story}\n` : ""}
${b.values.length ? `## Values\n${b.values.map((v) => `- **${v.title}**: ${v.text}`).join("\n")}\n` : ""}
_Document generated by E-COM STUDIO IA (${b.generatedBy === "ai" ? "AI" : "local engine"}). Items marked "To complete" still need to be confirmed._
`);
  const prev = all<Asset>("SELECT * FROM assets WHERE project_id = ? AND role = 'brand-guide' AND deleted_at IS NULL ORDER BY version DESC LIMIT 1", projectId)[0];
  await saveAsset({ projectId, userId: p.userId, data: Buffer.from(md, "utf8"), name: C("charte-de-marque.md", "brand-guidelines.md"), mime: "text/markdown", kind: "document", role: "brand-guide", folderKey: "brand.guide", origin: "generated", versionOf: prev ? prev.version_of ?? prev.id : null, meta: { recipe: C("Charte de marque", "Brand guidelines") } });
}
