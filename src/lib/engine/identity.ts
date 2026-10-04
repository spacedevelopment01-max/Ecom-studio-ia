/**
 * Identité visuelle : trois propositions de logo (logotype, symbole + nom, emblème), application du
 * choix du client et déclinaisons livrables (SVG, PNG, version claire, marque réduite, favicon).
 * Le logo de la boutique existante est remplacé sans recomposer le thème (les retouches restent).
 */
import { all, json, one } from "../db";
import { saveAsset, type Asset } from "../library";
import { currentTheme, loadProject, saveBrand, saveThemeVersion, type Project } from "../projects";
import { logoPng, logoSet, type LogoSpec, type SymbolKind } from "../media/logo";
import { canvasFamily, CANVAS_FONTS } from "../media/fonts";
import { directionById } from "../theme/directions";
import { isDark, withLightness } from "../color";
import type { JobContext } from "../jobs";
import { C, L } from "../i18n-server";

export type LogoProposal = { key: "logotype" | "symbole" | "embleme"; label: string; concept: string; spec: Omit<LogoSpec, "color"> };

const SECTOR_SYMBOL: Record<string, SymbolKind> = {
  beaute: "drop", mode: "hanger", bijoux: "facet", maison: "arch", hightech: "orbit", sport: "wave",
  alimentation: "sun", enfants: "sun", animaux: "paw", artisanat: "spark",
};
const KEYWORD_SYMBOL: [RegExp, SymbolKind][] = [
  [/\bth[ée]s?\b|\bteas?\b|matcha|infusion|tisane|herbal/i, "leaf"],
  [/caf[ée]|coffee|espresso|barista|mousseur|frother/i, "bean"],
  [/v[êe]tement|clothing|apparel|t-?shirt|sweat|hoodie|robe|\bdress|pantalon|trousers|\bpants\b|veste|jacket|textile|\blin\b|linen|coton|cotton/i, "hanger"],
  [/plante|\bplants?\b|botani|v[ée]g[ée]tal|bio\b|organic/i, "leaf"],
  [/\bchats?\b|\bcats?\b|chien|\bdogs?\b|animal|animaux|\bpets?\b/i, "paw"],
  [/lampe|\blamps?\b|lumi[èe]re|bougie|candle/i, "sun"],
  [/tasse|\bcups?\b|mug|th[ée]i[èe]re|teapot/i, "cup"],
];

/** Symbole cohérent avec l'univers : d'abord les mots du produit, puis le secteur. */
export function symbolFor(p: Project): SymbolKind {
  const text = `${p.product.name} ${p.product.category} ${p.product.summary} ${p.catalog.map((c) => `${c.name} ${c.category}`).join(" ")}`;
  // Le mot-clé cité en premier l'emporte (« gant pour poils de chat… sur les vêtements » → patte, pas cintre).
  let best: { sym: SymbolKind; at: number } | null = null;
  for (const [re, sym] of KEYWORD_SYMBOL) {
    const m = new RegExp(re.source, re.flags.replace("g", "")).exec(text);
    if (m && (!best || m.index < best.at)) best = { sym, at: m.index };
  }
  return best?.sym ?? SECTOR_SYMBOL[p.product.sector ?? ""] ?? "spark";
}

export function logoProposals(p: Project, base?: Omit<LogoSpec, "color">): LogoProposal[] {
  const brand = p.brand!;
  const d = directionById(brand.direction);
  const heading = canvasFamily(brand.fonts.heading ?? d.fonts.heading, "Cormorant");
  const body = canvasFamily(brand.fonts.body ?? d.fonts.body, "Jost");
  const family = CANVAS_FONTS[heading] ? heading : "Cormorant";
  const heavy = ["brut", "elan", "pop", "flux"].includes(d.id);
  const symbol = symbolFor(p);
  const word: Omit<LogoSpec, "color"> = base ?? {
    name: brand.name,
    family,
    weight: heavy ? 800 : 500,
    case: ["terroir", "pop", "gourmand"].includes(d.id) ? "title" : "upper",
    tracking: ["atelier", "galerie", "joaillerie"].includes(d.id) ? 0.18 : 0.04,
    layout: brand.name.length > 12 && brand.name.includes(" ") ? "stacked" : "wordmark",
    emblem: d.id === "elan" ? "line" : "none",
  };
  const sans = CANVAS_FONTS[body] && CANVAS_FONTS[body].kind !== "serif" ? body : "Jost";
  return [
    {
      key: "logotype",
      label: L("Logotype", "Wordmark"),
      concept: C(
        `Logotype typographique en ${word.family}, ${word.case === "upper" ? "capitales" : "minuscules"}${word.tracking >= 0.15 ? " espacées" : ""} : la marque par son nom seul.`,
        `Typographic wordmark in ${word.family}, ${word.tracking >= 0.15 ? "widely spaced " : ""}${word.case === "upper" ? "uppercase" : "lowercase"}: the brand, by its name alone.`,
      ),
      spec: { ...word, name: brand.name },
    },
    { key: "symbole", label: L("Symbole + nom", "Symbol + name"), concept: C(`Symbole « ${SYMBOL_LABEL[symbol]} » au trait et nom en ${heavy ? family : sans} : lisible en petit, reconnaissable en icône.`, `Line-drawn "${SYMBOL_LABEL_EN[symbol]}" symbol with the name in ${heavy ? family : sans}: legible at small sizes, recognizable as an icon.`), spec: { name: brand.name, family: heavy ? family : sans, weight: heavy ? 800 : 500, case: "upper", tracking: 0.08, layout: "lockup", emblem: "none", symbol } },
    { key: "embleme", label: L("Emblème", "Emblem"), concept: C(`Emblème rond (symbole « ${SYMBOL_LABEL[symbol]} ») avec le nom et la signature : esprit sceau, idéal sur étiquettes et emballages.`, `Round emblem ("${SYMBOL_LABEL_EN[symbol]}" symbol) with the name and tagline: a seal-like badge, ideal for labels and packaging.`), spec: { name: brand.name, tagline: brand.tagline, family, weight: heavy ? 800 : 500, case: word.case, tracking: 0.06, layout: "badge", emblem: "circle", symbol } },
  ];
}

export const SYMBOL_LABEL: Record<SymbolKind, string> = {
  leaf: "feuille", drop: "goutte", hanger: "cintre", orbit: "orbite", bean: "grain", paw: "patte", arch: "arche", wave: "vague", facet: "facette", sun: "soleil", cup: "tasse", spark: "étoile",
};
export const SYMBOL_LABEL_EN: Record<SymbolKind, string> = {
  leaf: "leaf", drop: "drop", hanger: "hanger", orbit: "orbit", bean: "bean", paw: "paw", arch: "arch", wave: "wave", facet: "facet", sun: "sun", cup: "cup", spark: "star",
};

/** Proposition retenue par défaut selon la direction de la boutique. */
export function defaultProposal(direction: string): LogoProposal["key"] {
  if (["atelier", "galerie", "joaillerie", "clinique"].includes(direction)) return "logotype";
  if (["terroir", "pop", "gourmand"].includes(direction)) return "embleme";
  return "symbole";
}

function logoColors(p: Project) {
  const pal = p.brand!.palette;
  const color = isDark(pal.dark) ? pal.dark : withLightness(pal.dark, 0.12);
  // Accent du symbole : la couleur principale si elle reste lisible sur fond clair.
  const accent = isDark(pal.primary) ? pal.primary : color;
  return { color, accent };
}

/**
 * Crée (ou recrée) les propositions, applique celle choisie et met à jour la boutique.
 * `choice` : clé de proposition ; à défaut, celle déjà choisie, puis celle de la direction.
 */
export async function generateLogos(ctx: JobContext | null, projectId: string, opts: { base?: Omit<LogoSpec, "color">; choice?: LogoProposal["key"] } = {}) {
  const p = loadProject(projectId);
  if (!p.brand) throw new Error(L("La marque doit exister avant le logo.", "The brand must exist before the logo."));
  // Sans base fournie, le logotype garde le dessin de la proposition précédente (police, casse, interlettrage).
  const prevWord = latestProposals(projectId).find((x) => x.info.key === "logotype")?.info.spec;
  const proposals = logoProposals(p, opts.base ?? (prevWord ? { ...prevWord, name: p.brand.name } : undefined));
  const { color, accent } = logoColors(p);
  const common = { projectId, userId: p.userId, folderKey: "brand.logos", origin: "generated" as const };
  ctx?.progress(0.6, L("Propositions de logo", "Logo proposals"));
  const batch = Date.now().toString(36);
  for (const pr of proposals) {
    const png = await logoPng({ ...pr.spec, color, accent }, 900);
    await saveAsset({ ...common, data: png, name: `proposition-${pr.key}.png`, mime: "image/png", role: "logo-proposal", meta: { key: pr.key, label: pr.label, concept: pr.concept, spec: pr.spec, batch } });
  }
  const choice = opts.choice ?? p.brand.logo.proposal ?? defaultProposal(p.brand.direction);
  return applyLogo(ctx, projectId, proposals.find((x) => x.key === choice) ?? proposals[0]);
}

/** Déclinaisons livrables d'une proposition, puis remplacement du logo dans la boutique. */
export async function applyLogo(ctx: JobContext | null, projectId: string, pr: LogoProposal) {
  const p = loadProject(projectId);
  const brand = p.brand!;
  const { color, accent } = logoColors(p);
  ctx?.progress(0.75, L("Déclinaisons du logo", "Logo variations"));
  const spec: LogoSpec = { ...pr.spec, name: brand.name, ...(pr.spec.layout === "badge" ? { tagline: brand.tagline } : {}), color, accent };
  const set = await logoSet(spec, "#FFFFFF");
  // Un emblème rond sert sur les étiquettes et emballages ; le site utilise la version horizontale.
  const webSpec: LogoSpec = spec.layout === "badge" ? { ...spec, layout: "lockup", tagline: undefined } : spec;
  const web = webSpec === spec ? null : await logoSet(webSpec, "#FFFFFF");
  const base = { projectId, userId: p.userId, folderKey: "brand.logos", origin: "generated" as const, meta: { spec: pr.spec, concept: pr.concept, proposal: pr.key } };
  const main = await saveAsset({ ...base, data: set.mainPng, name: "logo-principal.png", mime: "image/png", role: "logo", status: "review" });
  await saveAsset({ ...base, data: Buffer.from(set.mainSvg), name: "logo-principal.svg", mime: "image/svg+xml", kind: "logo", role: "logo-svg", sourceAssetId: main.id });
  const light = await saveAsset({ ...base, data: (web ?? set).lightPng, name: "logo-clair.png", mime: "image/png", role: "logo-light", sourceAssetId: main.id });
  await saveAsset({ ...base, data: Buffer.from((web ?? set).lightSvg), name: "logo-clair.svg", mime: "image/svg+xml", kind: "logo", role: "logo-light-svg", sourceAssetId: main.id });
  const horizontal = web ? await saveAsset({ ...base, data: web.mainPng, name: "logo-horizontal.png", mime: "image/png", role: "logo-horizontal", sourceAssetId: main.id }) : main;
  if (web) await saveAsset({ ...base, data: Buffer.from(web.mainSvg), name: "logo-horizontal.svg", mime: "image/svg+xml", kind: "logo", role: "logo-horizontal-svg", sourceAssetId: main.id });
  await saveAsset({ ...base, data: set.monoPng, name: "marque-reduite.png", mime: "image/png", role: "logo-mark", sourceAssetId: main.id });
  await saveAsset({ ...base, data: Buffer.from(set.monoSvg), name: "marque-reduite.svg", mime: "image/svg+xml", kind: "logo", role: "logo-mark-svg", sourceAssetId: main.id });
  const fav = await saveAsset({ ...base, data: set.faviconPng, name: "favicon.png", mime: "image/png", role: "favicon", sourceAssetId: main.id });
  saveBrand(projectId, { ...brand, logo: { ...brand.logo, assetId: main.id, concept: pr.concept, status: "proposed", proposal: pr.key } });
  swapThemeLogos(projectId, { logo: horizontal.id, light: light.id, favicon: fav.id });
  return { main, proposal: pr.key };
}

/** Remplace les fichiers du logo dans la version actuelle du thème (nouvelle version, retouches conservées). */
export function swapThemeLogos(projectId: string, ids: { logo: string; light: string; favicon: string }) {
  const cur = currentTheme(projectId);
  if (!cur) return null;
  const spec = structuredClone(cur.spec);
  let changed = false;
  for (const f of Object.keys(spec.files)) {
    const next = /^es-logo-clair-/.test(f) ? ids.light : /^es-logo-/.test(f) ? ids.logo : /^es-favicon-/.test(f) ? ids.favicon : null;
    if (next && spec.files[f] !== next) {
      spec.files[f] = next;
      changed = true;
    }
  }
  return changed ? saveThemeVersion(projectId, spec, L("Logo mis à jour", "Logo updated"), "system") : null;
}

/** Dernières propositions enregistrées (une par clé). */
export function latestProposals(projectId: string) {
  const rows = all<Asset>("SELECT * FROM assets WHERE project_id = ? AND role = 'logo-proposal' AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 12", projectId);
  const seen = new Map<string, Asset & { info: any }>();
  for (const r of rows) {
    const info = json<any>(r.meta as any, {});
    if (!seen.has(info.key)) seen.set(info.key, { ...r, info });
  }
  return ["logotype", "symbole", "embleme"].map((k) => seen.get(k)).filter(Boolean) as (Asset & { info: any })[];
}

export const hasClientLogo = (projectId: string) => !!one("SELECT 1 FROM assets WHERE project_id = ? AND role = 'logo' AND origin = 'upload' AND deleted_at IS NULL", projectId);

// ---------------------------------------------------------------- signatures

const SECTOR_LINES_FR: Record<string, string[]> = {
  beaute: ["Le soin, simplement.", "Des gestes simples, chaque jour.", "L'essentiel, sans détour.", "Prendre soin, tout naturellement."],
  mode: ["L'allure, simplement.", "Des pièces à vivre au quotidien.", "S'habiller sans compliquer.", "Le style qui vous ressemble."],
  bijoux: ["Des détails qui comptent.", "Briller sans en faire trop.", "À porter, à offrir, à garder."],
  maison: ["Des objets à vivre.", "La maison, en plus doux.", "Chez soi, simplement mieux."],
  hightech: ["La technologie, sans détour.", "Pensé pour être utilisé.", "Simple à prendre en main."],
  sport: ["Fait pour bouger.", "Le mouvement, au quotidien.", "Équipé pour sortir."],
  alimentation: ["Le goût des bonnes choses.", "À savourer, tout simplement.", "Un moment pour soi."],
  enfants: ["Grandir en douceur.", "Pour les petits, avec soin."],
  animaux: ["Pour nos compagnons.", "Le quotidien de votre animal, en mieux.", "Pensé pour eux, choisi par vous."],
  artisanat: ["Fait avec soin.", "Le geste et la matière."],
};
const KEYWORD_LINES_FR: [RegExp, string[]][] = [
  [/th[ée] glac|boisson|canette|soda|limonade/i, ["La fraîcheur en canette.", "Un moment de fraîcheur, à toute heure."]],
  [/\bth[ée]s?\b|infusion|matcha/i, ["Le thé, prenez le temps.", "Une tasse, un moment."]],
  [/caf[ée]|espresso/i, ["Le café comme à la maison… parce que c'est la maison.", "Votre café, votre rituel."]],
  [/v[êe]tement|t-?shirt|sweat|hoodie|robe/i, ["Des basiques bien faits.", "L'essentiel du vestiaire."]],
];

const SECTOR_LINES_EN: Record<string, string[]> = {
  beaute: ["Skincare, simplified.", "Simple steps, every day.", "Just the essentials.", "Self-care, naturally."],
  mode: ["Effortless style.", "Pieces for everyday life.", "Getting dressed, made easy.", "Style that feels like you."],
  bijoux: ["The details that matter.", "Shine without trying too hard.", "To wear, to give, to keep."],
  maison: ["Objects to live with.", "Home, made softer.", "Home, simply better."],
  hightech: ["Tech, without the fuss.", "Built to be used.", "Easy from day one."],
  sport: ["Made to move.", "Movement, every day.", "Geared up to get out."],
  alimentation: ["A taste for good things.", "Simply savor it.", "A moment for yourself."],
  enfants: ["Growing up gently.", "For little ones, with care."],
  animaux: ["For our companions.", "Your pet's everyday, made better.", "Made for them, chosen by you."],
  artisanat: ["Made with care.", "Craft and material."],
};
const KEYWORD_LINES_EN: [RegExp, string[]][] = [
  [/th[ée] glac|iced tea|boisson|drink|beverage|canette|\bcans?\b|soda|limonade|lemonade/i, ["Refreshment in a can.", "A refreshing moment, any time."]],
  [/\bth[ée]s?\b|\bteas?\b|infusion|matcha/i, ["Tea: take your time.", "One cup, one moment."]],
  [/caf[ée]|coffee|espresso/i, ["Coffee-shop coffee, right at home.", "Your coffee, your ritual."]],
  [/v[êe]tement|clothing|apparel|t-?shirt|sweat|hoodie|robe|\bdress/i, ["Basics, done right.", "Wardrobe essentials."]],
];

/** Signatures proposées : courtes, sans promesse invérifiable ; la liste des goûts ou gammes réelle quand elle existe. */
export function proposeTaglines(p: Project): string[] {
  const text = `${p.product.name} ${p.product.category} ${p.product.summary} ${p.catalog.map((c) => `${c.name} ${c.category}`).join(" ")}`;
  const en = C(false, true);
  const sectorLines = en ? SECTOR_LINES_EN : SECTOR_LINES_FR;
  const out: string[] = [];
  for (const [re, lines] of en ? KEYWORD_LINES_EN : KEYWORD_LINES_FR) if (re.test(text)) out.push(...lines);
  out.push(...(sectorLines[p.product.sector ?? ""] ?? sectorLines.maison));
  // Gamme réelle : variantes du produit ou catégories du catalogue.
  const range = p.product.variants[0]?.values?.length ? p.product.variants[0].values : [...new Set(p.catalog.map((c) => c.category).filter(Boolean))];
  if (range.length >= 2 && range.length <= 4) {
    const loc = en ? "en-US" : "fr-FR";
    const list = range.map((x) => x.toLocaleLowerCase(loc));
    const line = en ? `${list.slice(0, -1).join(", ")} or ${list[list.length - 1]}: your choice.` : `${list.slice(0, -1).join(", ")} ou ${list[list.length - 1]} : à vous de choisir.`;
    out.push(line.replace(/^./, (c) => c.toLocaleUpperCase(loc)));
  }
  if (p.brand?.name) out.push(en ? `${p.brand.name}, every day.` : `${p.brand.name}, au quotidien.`);
  return [...new Set(out)].filter((x) => x.length <= 70).slice(0, 6);
}
