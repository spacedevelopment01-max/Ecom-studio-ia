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
import { latestSocialKit } from "./social-kit";
import { brandFromAi } from "../ai/tasks";
import { aiBrandChecked, finalizeBrand } from "./brand-check";
import { llmConfigured } from "../ai/llm";
import { localBrand, paletteFromColors } from "./local";
import { applySiteIdentity, loadSiteImport } from "./existing-site";
import type { JobContext } from "../jobs";
import { directionById } from "../theme/directions";
import type { Brand } from "../project-types";
import { effectivePalette } from "../route-palette";

export async function buildBrand(ctx: JobContext, projectId: string, opts: { providedBrand?: string; guidance?: string } = {}) {
  const p = loadProject(projectId);
  let brand: Brand;
  let logoSpec: Omit<LogoSpec, "color">;
  const keepValidated = p.brand?.validated ?? [];
  // « J'ai déjà mon site et mon logo » : l'identité vient du site (nom, logo, palette, polices) ; seuls le ton et la stratégie sont déduits.
  const site = p.settings.existingSite?.status === "read" ? loadSiteImport(projectId) : null;
  if (llmConfigured()) {
    ctx.progress(0.1, L("Direction de marque (IA)", "Brand direction (AI)"));
    // Proposition contrôlée (nom, signature, allégations, formules creuses) avec une reprise ciblée au besoin.
    const r = await ctx.step("brand-ai", () => aiBrandChecked({ userId: p.userId, projectId, jobId: ctx.job.id, usageKey: `${ctx.job.id}:brand` }, p, opts.guidance));
    const out = brandFromAi(r, { concept: r.logo.concept, status: "proposed" }, paletteFromColors(p.product.visual.colors.length ? p.product.visual.colors : [{ hex: "#7A6552", share: 1 }], p.product.sector));
    brand = out.brand;
    saveStrategy(projectId, out.strategy);
    logoSpec = { name: r.name, family: r.logo.family, weight: r.logo.weight, italic: r.logo.italic, case: r.logo.case, tracking: r.logo.tracking, layout: r.logo.layout, emblem: r.logo.emblem };
    if (!site) remember(projectId, { kind: "decision", key: "direction_boutique", value: `${directionById(r.direction).name} — ${r.directionReason}`, status: "inferred", source: "ai", scope: "shop" });
  } else {
    ctx.progress(0.1, L("Direction de marque", "Brand direction"));
    const out = localBrand(p.product, opts.providedBrand || p.brand?.name, p);
    brand = out.brand;
    saveStrategy(projectId, out.strategy);
    logoSpec = out.logoSpec;
  }
  if (site) brand = applySiteIdentity(projectId, brand, site);
  // Les éléments déjà validés par le client sont conservés.
  if (p.brand && keepValidated.length) {
    for (const k of keepValidated) (brand as any)[k] = (p.brand as any)[k];
    brand.validated = [...new Set([...keepValidated, ...(site ? brand.validated : [])])];
  }
  if (opts.providedBrand) {
    brand.name = opts.providedBrand;
    brand.nameStatus = "provided";
    logoSpec.name = opts.providedBrand;
  }

  // Contrôle final sans IA (palette lisible, nom déjà pris, allégations) ; un site existant garde son identité.
  if (!site) {
    const fin = finalizeBrand(brand, loadProject(projectId).strategy, p);
    // Les éléments validés par le client ne sont jamais modifiés.
    for (const k of keepValidated) (fin.brand as any)[k] = (brand as any)[k];
    if (fin.brand.name !== brand.name) logoSpec.name = fin.brand.name;
    brand = fin.brand;
    if (fin.strategy) saveStrategy(projectId, fin.strategy);
  }

  // Signatures : la proposition retenue et d'autres pistes au choix (une signature validée est conservée).
  const lines = proposeTaglines({ ...p, brand });
  // Site existant : seule la signature du site est reprise ; les pistes restent de simples propositions.
  if (!keepValidated.includes("tagline") && !brand.tagline && !site) brand.tagline = lines[0] ?? "";
  // Site existant : aucune autre signature proposée (la marque du client n'est pas réinventée).
  brand.taglineAlternatives = site ? [] : lines.filter((x) => x !== brand.tagline).slice(0, 5);

  // Logo : celui du client est conservé ; sinon trois propositions vectorielles, la plus adaptée appliquée.
  const clientLogo = one<Asset>("SELECT * FROM assets WHERE project_id = ? AND role = 'logo' AND origin = 'upload' AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1", projectId);
  if (clientLogo && !site) brand.logo = { assetId: clientLogo.id, concept: C("Logo fourni par le client", "Logo provided by the client"), status: "provided" };
  saveBrand(projectId, brand);
  // Site existant : jamais de logo généré (celui du site ou du client est conservé).
  if (!site && !clientLogo && !keepValidated.includes("logo")) {
    // Point de reprise : une création reprise après une interruption ne repaie pas les pistes déjà faites.
    await ctx.step("logos", () => generateLogos(ctx, projectId, { base: { ...logoSpec, name: brand.name }, redrawSymbol: true }));
    // Avec l'IA d'images : deux logos complets (symbole et nom) dessinés en parallèle, proposés dans l'onglet Marque.
    const { imageProviderAvailable } = await import("../ai/media-providers");
    const { llmConfigured } = await import("../ai/llm");
    if (llmConfigured() && imageProviderAvailable()) {
      const { enqueue } = await import("../jobs");
      enqueue({ userId: p.userId, projectId, type: "brand.fulllogo", label: L("Logos dessinés par l'IA", "Logos drawn by AI"), payload: { projectId }, parentId: ctx.job.id, idempotencyKey: `full-logo:${ctx.job.id}` });
    }
  }
  // Charte finale seulement avec un logo réel (fourni, choisi ou validé par la barrière), jamais sur un logo provisoire.
  if (!loadProject(projectId).brand?.logo.provisional) {
    await saveBrandGuide(projectId);
    ctx.progress(0.9, L("Charte de marque (PDF)", "Brand guidelines (PDF)"));
    await saveBrandBook(projectId);
  }
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
  // Piste de logo retenue : la charte reprend ses typographies (logo, kit et charte parlent d'une seule voix).
  const route = b.logo.route;
  const kit = latestSocialKit(projectId);
  const { pages, pdf } = renderBrandBook({
    // Couleurs de la piste de logo retenue (celles du site et des visuels), pas la palette de départ.
    brand: { ...b, palette: effectivePalette(b) ?? b.palette },
    strategy: p.strategy,
    headingFamily: route?.heading ?? canvasFamily(b.fonts.heading ?? d.fonts.heading, "Cormorant"),
    bodyFamily: route?.body ?? canvasFamily(b.fonts.body ?? d.fonts.body, "Jost"),
    social: kit ? await img(kit.sheet) : null,
    voice: b.social ?? null,
    logo: await img(main),
    logoLight: await img(derived("logo-light")),
    logoWeb: await img(derived("logo-horizontal") ?? main),
    mark: await img(derived("logo-mark")),
    // Détourage utilisable seulement (jamais un détourage refusé au contrôle ou écarté par le client).
    product: await img(all<Asset>("SELECT * FROM assets WHERE project_id = ? AND role = 'cutout' AND deleted_at IS NULL AND status != 'rejected' ORDER BY created_at DESC LIMIT 1", projectId)[0]),
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
  const b0 = p.brand;
  if (!b0) return;
  // Couleurs de la piste de logo retenue.
  const b = { ...b0, palette: effectivePalette(b0) ?? b0.palette };
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
${b.checks?.length ? `## Points à vérifier\n${b.checks.map((c) => `- ${c}`).join("\n")}\n` : ""}
_Document généré par E-COM STUDIO IA (${b.generatedBy === "ai" ? "IA" : "version simplifiée"}). Les éléments « À compléter » restent à confirmer._
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
${b.checks?.length ? `## To check\n${b.checks.map((c) => `- ${c}`).join("\n")}\n` : ""}
_Document generated by E-COM STUDIO IA (${b.generatedBy === "ai" ? "AI" : "simplified version"}). Items marked "To complete" still need to be confirmed._
`);
  const prev = all<Asset>("SELECT * FROM assets WHERE project_id = ? AND role = 'brand-guide' AND deleted_at IS NULL ORDER BY version DESC LIMIT 1", projectId)[0];
  await saveAsset({ projectId, userId: p.userId, data: Buffer.from(md, "utf8"), name: C("charte-de-marque.md", "brand-guidelines.md"), mime: "text/markdown", kind: "document", role: "brand-guide", folderKey: "brand.guide", origin: "generated", versionOf: prev ? prev.version_of ?? prev.id : null, meta: { recipe: C("Charte de marque", "Brand guidelines") } });
}
