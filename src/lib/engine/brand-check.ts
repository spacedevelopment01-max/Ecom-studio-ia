/**
 * Contrôle qualité de la marque (IA ou moteur local) avant qu'elle serve au logo, à la charte et à la boutique :
 * nom déjà porté par une marque connue ou trop générique, allégations non confirmées et formules creuses dans
 * la signature, l'histoire ou les valeurs, palette sans contraste. Les défauts deviennent des consignes de
 * correction pour l'IA ; ceux qui restent sont corrigés (palette) ou signalés honnêtement au client.
 */
import { contrast, ensureContrast, hsl, withLightness } from "../color";
import { aiBrand, lintClaims, lintHollow, scrubClaims } from "../ai/tasks";
import { L } from "../i18n-server";
import type { Brand, Strategy } from "../project-types";
import type { BrandPalette } from "../theme/directions";
import type { Project } from "../projects";
import { json, one } from "../db";

/**
 * Marques mondialement connues (ou très présentes en France) qu'un générateur de noms propose volontiers.
 * Liste volontairement courte : elle évite les collisions évidentes, elle ne remplace pas une recherche INPI / EUIPO.
 */
const FAMOUS = new Set(
  [
    // Technologie
    "apple", "pixel", "signal", "nova", "galaxy", "echo", "alexa", "kindle", "surface", "xbox", "playstation", "nest", "ring", "fitbit", "garmin", "gopro", "dji", "bose", "sonos", "beats", "jbl", "marshall", "anker", "belkin", "logitech", "razer", "corsair", "nothing", "oneplus", "oppo", "honor", "realme", "xiaomi", "huawei", "lenovo", "asus", "acer", "dell", "intel", "nvidia", "tesla", "slack", "zoom", "notion", "figma", "spotify", "deezer", "uber", "airbnb", "orange", "free", "bouygues", "sfr", "meta", "google", "amazon", "microsoft", "netflix", "prime", "orbit", "halo", "tile",
    // Beauté, mode, bijoux
    "dove", "nivea", "loreal", "l'oréal", "lancome", "lancôme", "clarins", "sephora", "aesop", "glossier", "fenty", "dior", "chanel", "hermes", "hermès", "gucci", "prada", "zara", "mango", "uniqlo", "nike", "adidas", "puma", "reebok", "vans", "converse", "lacoste", "kenzo", "sandro", "maje", "sezane", "sézane", "pandora", "swarovski", "cartier", "tiffany", "dawn", "allure", "line", "poise",
    // Maison, alimentation, enfants, animaux
    "ikea", "habitat", "maisons du monde", "dyson", "seb", "tefal", "moulinex", "le creuset", "nespresso", "lavazza", "danone", "evian", "volvic", "perrier", "badoit", "orangina", "oasis", "innocent", "michel et augustin", "bonne maman", "lu", "kinder", "haribo", "nutella", "lego", "playmobil", "fisher-price", "vtech", "chicco", "babybjorn", "bébé confort", "petit bateau", "jacadi", "cadum", "mustela", "doudou et compagnie", "sophie la girafe", "pampers", "huggies", "snuggle", "royal canin", "purina", "whiskas", "pedigree", "felix", "ember", "nook",
    // Sport, plein air
    "decathlon", "quechua", "salomon", "rossignol", "patagonia", "the north face", "columbia", "asics", "new balance", "under armour",
  ].map((x) => norm(x)),
);

function norm(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, " et ").replace(/[^a-z0-9]+/g, " ").trim();
}

/** Mots d'habillage d'un nom (« Maison X », « X & Co », « The X Co ») : seul le cœur du nom compte. */
const WRAPPERS = new Set(["maison", "atelier", "les", "le", "la", "the", "co", "et", "and", "studio", "house", "company", "shop", "store", "paris", "france"]);

/** Nom déjà porté par une marque connue (nom complet ou cœur du nom). */
export function famousBrandClash(name: string): string | null {
  const n = norm(name);
  if (!n) return null;
  if (FAMOUS.has(n)) return name.trim();
  const core = n.split(" ").filter((w) => !WRAPPERS.has(w)).join(" ");
  return core && FAMOUS.has(core) ? core : null;
}

/**
 * Mots vus sur les photos, l'emballage ou la page du fournisseur (marque imprimée sur le produit, nom du vendeur,
 * titre de l'annonce) : la marque créée par le studio est INVENTÉE, elle ne les reprend jamais.
 * Exception : le site existant du client (c'est sa propre marque), et un nom fourni par le client lui-même.
 */
export function sourceWords(p: Pick<Project, "product"> & Partial<Project>): string[] {
  if (p.settings?.existingSite) return [];
  const texts: string[] = [...(p.product?.visual?.labelText ?? [])];
  if (p.product?.nameStatus === "detected" && p.product.name) texts.push(p.product.name);
  if (p.id) {
    const link = json<any>(one<{ value: string }>("SELECT value FROM memory WHERE project_id = ? AND kind = 'artifact' AND key = 'link_import'", p.id)?.value, null);
    for (const v of [link?.title, link?.product?.title, link?.product?.vendor, link?.product?.brand, link?.platform === "custom" ? null : null]) if (typeof v === "string") texts.push(v);
  }
  const words = new Set<string>();
  for (const t of texts) for (const w of norm(t).split(" ")) if (w.length >= 3 && !WRAPPERS.has(w)) words.add(w);
  return [...words];
}

/** Le nom reprend-il un mot vu chez le fournisseur ? (mot identique, ou mot de 4 lettres et plus contenu dans le nom) */
export function copiesSource(name: string, words: string[]): string | null {
  const n = norm(name);
  if (!n) return null;
  const parts = n.split(" ");
  const joined = parts.join("");
  for (const w of words) {
    if (parts.includes(w) || joined === w) return w;
    if (w.length >= 4 && (joined.includes(w) || (joined.length >= 4 && w.includes(joined)))) return w;
  }
  return null;
}

export type BrandIssue = { code: "name_copied" | "name_taken" | "name_generic" | "name_length" | "claim" | "hollow" | "tagline" | "palette"; field: string; message: string; blocking: boolean };

/** Contraste minimal attendu : texte sombre sur fond clair (lecture longue) et couleur principale (boutons, liens). */
const MIN_TEXT = 7;
const MIN_PRIMARY = 4.5;

/** Défauts de la marque proposée, du plus grave au moins grave. */
export function brandIssues(brand: Pick<Brand, "name" | "nameStatus" | "tagline" | "palette" | "positioning" | "audience" | "story" | "values" | "personality" | "alternatives"> & { tone?: Brand["tone"] }, p: Pick<Project, "product" | "business"> & Partial<Project>, strategy?: Strategy | null): BrandIssue[] {
  const out: BrandIssue[] = [];
  const name = brand.name?.trim() ?? "";
  if (brand.nameStatus !== "provided" && brand.nameStatus !== "validated") {
    const copied = copiesSource(name, sourceWords(p));
    if (copied) out.push({ code: "name_copied", field: "name", blocking: true, message: L(`Le nom « ${name} » reprend « ${copied} », vu sur les photos ou la page du fournisseur : la marque doit être entièrement inventée.`, `The name "${name}" reuses "${copied}", seen on the supplier's photos or page: the brand must be entirely invented.`) });
    const clash = famousBrandClash(name);
    if (clash) out.push({ code: "name_taken", field: "name", blocking: true, message: L(`Le nom « ${name} » est déjà celui d'une marque connue (${clash}) : risque juridique et confusion.`, `The name "${name}" is already used by a well-known brand (${clash}): legal risk and confusion.`) });
    const generic = [p.product?.name, p.product?.category].filter(Boolean).map((x) => norm(String(x)));
    if (name && generic.includes(norm(name))) out.push({ code: "name_generic", field: "name", blocking: true, message: L(`Le nom « ${name} » décrit le produit au lieu de le signer : il ne peut pas être déposé ni retenu.`, `The name "${name}" describes the product instead of branding it: it can't be registered or remembered.`) });
    if (name.length < 2 || name.length > 22 || /\d{3,}|[!?#@*_]/.test(name)) out.push({ code: "name_length", field: "name", blocking: true, message: L(`Le nom « ${name} » doit compter de 2 à 22 caractères, sans chiffres ni symboles.`, `The name "${name}" must be 2 to 22 characters, with no digits or symbols.`) });
    for (const [i, alt] of (brand.alternatives ?? []).entries()) {
      const c = famousBrandClash(alt);
      if (c) out.push({ code: "name_taken", field: `alternatives[${i}]`, blocking: false, message: L(`La piste « ${alt} » est déjà une marque connue (${c}).`, `The option "${alt}" is already a well-known brand (${c}).`) });
    }
  }
  const tag = brand.tagline?.trim() ?? "";
  if (tag.length > 60 || tag.split(/\s+/).length > 9) out.push({ code: "tagline", field: "tagline", blocking: true, message: L(`Signature trop longue (${tag.length} caractères) : 9 mots et 60 caractères au plus.`, `Tagline too long (${tag.length} characters): 9 words and 60 characters at most.`) });
  if (/\s[—–]\s/.test(tag)) out.push({ code: "tagline", field: "tagline", blocking: true, message: L("Signature : pas de tiret cadratin.", "Tagline: no em dash.") });
  const texts = { tagline: brand.tagline, positioning: brand.positioning, audience: brand.audience, story: brand.story, values: brand.values, personality: brand.personality, keyMessages: strategy?.keyMessages, angles: strategy?.angles, platform: strategy?.platform ? { persona: strategy.platform.persona, problem: strategy.platform.problem, difference: strategy.platform.difference, answers: strategy.platform.objections.map((o) => o.answer) } : undefined };
  for (const c of lintClaims(texts, p as Project)) out.push({ code: "claim", field: c.path, blocking: true, message: L(`${c.path} : « ${c.term} » (${c.label}) n'est pas confirmé par le client.`, `${c.path}: "${c.term}" (${c.label}) is not confirmed by the client.`) });
  for (const h of lintHollow(texts)) out.push({ code: "hollow", field: h.path, blocking: true, message: L(`${h.path} : formule creuse « ${h.term} », à remplacer par un trait concret.`, `${h.path}: empty phrase "${h.term}", replace it with a concrete trait.`) });
  out.push(...paletteIssues(brand.palette));
  return out;
}

export function paletteIssues(pal: BrandPalette): BrandIssue[] {
  const out: BrandIssue[] = [];
  const c1 = contrast(pal.dark, pal.light);
  if (c1 < MIN_TEXT) out.push({ code: "palette", field: "palette.dark", blocking: true, message: L(`Contraste « sombre » sur « clair » insuffisant (${c1.toFixed(1)}:1, ${MIN_TEXT}:1 attendu).`, `"Dark" on "light" contrast too low (${c1.toFixed(1)}:1, ${MIN_TEXT}:1 expected).`) });
  const c2 = contrast(pal.primary, pal.light);
  if (c2 < MIN_PRIMARY) out.push({ code: "palette", field: "palette.primary", blocking: true, message: L(`Couleur principale peu lisible sur le fond clair (${c2.toFixed(1)}:1, ${MIN_PRIMARY}:1 attendu pour les boutons et liens).`, `Primary color hard to read on the light background (${c2.toFixed(1)}:1, ${MIN_PRIMARY}:1 expected for buttons and links).`) });
  const c3 = contrast(pal.secondary, pal.dark);
  if (c3 < MIN_PRIMARY) out.push({ code: "palette", field: "palette.secondary", blocking: true, message: L(`Couleur secondaire trop sombre pour servir de fond doux (${c3.toFixed(1)}:1 avec le texte sombre).`, `Secondary color too dark to serve as a soft background (${c3.toFixed(1)}:1 with dark text).`) });
  return out;
}

/** Palette rendue lisible sans changer son caractère : fond clair très clair, texte sombre profond, principale assez dense. */
export function fixPalette(pal: BrandPalette): BrandPalette {
  const light = hsl(pal.light)[2] < 0.9 ? withLightness(pal.light, 0.95) : pal.light;
  let dark = pal.dark;
  if (contrast(dark, light) < MIN_TEXT) dark = withLightness(pal.dark, Math.min(0.14, hsl(pal.dark)[2]));
  if (contrast(dark, light) < MIN_TEXT) dark = ensureContrast(dark, light, MIN_TEXT);
  const primary = contrast(pal.primary, light) < MIN_PRIMARY ? ensureContrast(pal.primary, light, MIN_PRIMARY) : pal.primary;
  const secondary = contrast(pal.secondary, dark) < MIN_PRIMARY ? withLightness(pal.secondary, 0.86) : pal.secondary;
  return { ...pal, primary, secondary, light, dark };
}

/** Consignes de correction envoyées à l'IA. */
export const brandFeedback = (issues: BrandIssue[]) => issues.filter((i) => i.blocking).map((i) => `- ${i.message}`).join("\n");

/**
 * Direction de marque par l'IA avec contrôle qualité : une reprise ciblée si la première proposition a un défaut
 * bloquant (nom pris, allégation, formule creuse, signature trop longue). La palette est corrigée sans IA.
 */
/**
 * Corrections faites par le code, gratuitement, avant de juger s'il faut redemander la marque à l'IA : tiret de la
 * signature remplacé, signature trop longue remplacée par une alternative courte proposée par l'IA elle-même.
 * (Les allégations sont retirées par finalizeBrand ; le nom déjà pris est remplacé par une alternative libre.)
 */
export function tidyBrand<T extends { tagline?: string; taglineAlternatives?: string[] }>(r: T): T {
  const clean = (t: string) => t.replace(/\s[—–]\s/g, ", ").trim();
  const fits = (t: string) => t.length <= 60 && t.split(/\s+/).length <= 9;
  let tagline = clean(r.tagline ?? "");
  const alts = (r.taglineAlternatives ?? []).map(clean);
  if (tagline && !fits(tagline)) {
    const short = alts.find((a) => a && fits(a));
    if (short) tagline = short;
  }
  return { ...r, tagline, taglineAlternatives: alts };
}

export async function aiBrandChecked(b: Parameters<typeof aiBrand>[0], p: Project, guidance?: string) {
  let r = tidyBrand(await aiBrand(b, p, guidance));
  let issues = brandIssues({ ...r, palette: r.palette ?? fixPalette(DEFAULT_PALETTE) }, p, r.strategy as Strategy);
  // Seuls les défauts que le code ne sait pas corriger justifient une nouvelle demande payée : nom inutilisable sans
  // alternative libre, formule creuse. Allégations (retirées plus loin) et palette (corrigée) n'en coûtent pas.
  const words = sourceWords(p);
  const freeAlt = (r.alternatives ?? []).some((a: string) => a.trim() && !famousBrandClash(a) && !copiesSource(a, words) && a.length >= 2 && a.length <= 22);
  const worth = issues.some((i) => i.blocking && (i.code === "hollow" || i.code === "tagline" || (i.code.startsWith("name_") && !(freeAlt && (i.code === "name_taken" || i.code === "name_copied")))));
  if (worth) {
    const retry = tidyBrand(await aiBrand({ ...b, usageKey: `${b.usageKey}:fix` }, p, guidance, brandFeedback(issues)));
    const after = brandIssues({ ...retry, palette: retry.palette ?? fixPalette(DEFAULT_PALETTE) }, p, retry.strategy as Strategy);
    // On garde la meilleure des deux propositions (moins de défauts bloquants).
    if (after.filter((i) => i.blocking).length <= issues.filter((i) => i.blocking).length) {
      r = retry;
      issues = after;
    }
  }
  return r;
}
const DEFAULT_PALETTE: BrandPalette = { primary: "#3A3F4B", secondary: "#E6E2DC", accent: "#B5714A", light: "#F7F5F2", dark: "#16181D" };

/**
 * Dernière passe, sans IA, sur toute marque (IA ou locale) : palette rendue lisible, nom déjà pris remplacé par une
 * piste libre, allégations retirées des textes. Ce qui reste douteux est listé dans `checks`, montré au client.
 */
export function finalizeBrand(brand: Brand, strategy: Strategy | null, p: Project): { brand: Brand; strategy: Strategy | null } {
  const out: Brand = { ...brand, palette: fixPalette(brand.palette) };
  const words = sourceWords(p);
  const bad = (n: string) => !!famousBrandClash(n) || !!copiesSource(n, words);
  if (out.nameStatus === "proposed" && bad(out.name)) {
    const free = out.alternatives.find((a) => a.trim() && !bad(a));
    if (free) {
      out.alternatives = [out.name, ...out.alternatives.filter((a) => a !== free)].filter((a) => !bad(a));
      out.name = free;
    }
  }
  out.alternatives = out.alternatives.filter((a) => !bad(a));
  const texts = scrubClaims({ tagline: out.tagline, positioning: out.positioning, audience: out.audience, story: out.story, values: out.values, personality: out.personality }, p);
  Object.assign(out, texts.content);
  let strat = strategy;
  if (strategy) strat = { ...strategy, ...scrubClaims({ keyMessages: strategy.keyMessages, angles: strategy.angles, pillars: strategy.pillars }, p).content };
  // Plateforme : persona, problème, différence et réponses aux objections ne portent aucune allégation non prouvée
  // (les arguments « sans preuve » restent listés tels quels : ce sont des questions pour le client, jamais publiées).
  if (strat?.platform) {
    const pf = strat.platform;
    // Les objections sont des questions de la cible (« Est-ce sans danger ? ») : seules les réponses sont nettoyées.
    const clean = scrubClaims({ persona: pf.persona, problem: pf.problem, difference: pf.difference, answers: pf.objections.map((o) => o.answer) }, p).content;
    strat = { ...strat, platform: { ...pf, persona: clean.persona, problem: clean.problem, difference: clean.difference, objections: pf.objections.map((o, i) => ({ ...o, answer: clean.answers[i] ?? o.answer })) } };
  }
  const left = brandIssues(out, p, strat).filter((i) => i.code !== "claim");
  out.checks = [...new Set([...texts.removed.map((r) => L(`Allégation non confirmée retirée (${r.path}) : « ${r.term} ». Ajoutez la preuve dans la fiche produit pour la réutiliser.`, `Unconfirmed claim removed (${r.path}): "${r.term}". Add the proof to the product sheet to use it.`)), ...left.map((i) => i.message)])];
  return { brand: out, strategy: strat };
}
