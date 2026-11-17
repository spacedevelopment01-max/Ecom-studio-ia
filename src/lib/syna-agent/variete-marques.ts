/**
 * Une identité vraiment différente pour chaque marque (demande du propriétaire du 17 novembre 2026, devant les deux
 * premiers sites de SINA : « les thèmes entre les deux marques sont très identiques ») : les deux marques avaient reçu
 * la même police de titres et deux fonds clairs presque pareils ; le site reprend la police et la palette de la marque,
 * donc deux marques pareilles donnent deux sites pareils.
 *
 * La règle, contre les 20 dernières marques du Studio (autres projets, lues dans `projects.brand_json`) :
 *  - jamais la même police de titres qu'une de ces marques, ni une police de la même lignée (Archivo et Archivo Black
 *    sont une seule police pour l'œil) ; jamais deux fois la même lignée dans une même série d'identités ;
 *  - un fond clair (`palette.light`, le fond des pages du site) nettement différent : écart de couleur CIEDE2000 d'au
 *    moins `FOND_ECART_MIN`.
 *
 * Aucune porte de sortie (« elle doit y arriver, on ne laisse pas de porte de sortie sinon elle va la prendre ») : SINA
 * reçoit ces marques avant de proposer ses identités ; puis le Studio corrige lui-même, sans IA, avant toute image
 * payante (le logo et la planche montrent la police et les couleurs) :
 *  - une police de titres déjà prise est remplacée par une police du catalogue de la même allure (mêmes empattements,
 *    même graisse, même chasse, même écriture), libre, en accord avec la police de texte ;
 *  - un fond clair trop proche est remplacé par un fond tiré des couleurs de la marque elle-même (une teinte pâle de
 *    son bouton, de son accent, de sa surface, ou son propre fond plus profond), le plus proche possible de celui
 *    choisi, qui ne crée aucun défaut de contraste. La couleur vedette (le bouton) et les couleurs données par le client
 *    ne changent jamais ; un fond « blanc » reste blanc (règle du propriétaire : un blanc pur par série).
 */
import { all } from "../db";
import { FONT_FILES, FONT_HANDLES } from "../theme/render";
import { hexToRgb, sameColor } from "../color";
import { bodyFontOk, fontFamily, fontKeyOf, oklch, paletteIssues, type Identity } from "./identities";
import type { Journey } from "./journey";

/** Nombre de marques récentes comparées (les plus récentes d'abord). */
export const MARQUES_COMPAREES = 20;
/**
 * Écart de couleur minimal (CIEDE2000) entre deux fonds clairs. Les deux fonds de l'essai du 17 novembre 2026
 * (#FFF6E0 et #FFFCF7), que le propriétaire voit pareils, sont à 6,9 ; un crème et un blanc pur (#FFF6E0 et #FFFFFF)
 * sont à 9,4 et se confondent encore d'un site à l'autre. Deux fonds vus sur deux sites, jamais côte à côte, doivent
 * donc s'écarter de 10 au moins : c'est le palier où un fond pâle prend une couleur à lui (un crème contre un rose
 * poudré #FFE9E3 : 11,1 ; contre un lavande #F4F1FF : 16,6).
 */
export const FOND_ECART_MIN = 10;

// ---------------------------------------------------------------- l'écart de couleur (CIEDE2000)

function lab(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex).map((v) => { const n = v / 255; return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4; });
  const x = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047, y = r * 0.2126729 + g * 0.7151522 + b * 0.072175, z = (r * 0.0193339 + g * 0.119192 + b * 0.9503041) / 1.08883;
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  const fx = f(x), fy = f(y), fz = f(z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
/** Écart de couleur perçu entre deux couleurs (CIEDE2000 : 0 = identiques ; vers 2, l'œil les distingue côte à côte). */
export function deltaE2000(a: string, b: string): number {
  const [L1, a1, b1] = lab(a), [L2, a2, b2] = lab(b), rad = Math.PI / 180;
  const Cm = (Math.hypot(a1, b1) + Math.hypot(a2, b2)) / 2, G = 0.5 * (1 - Math.sqrt(Cm ** 7 / (Cm ** 7 + 25 ** 7)));
  const a1p = (1 + G) * a1, a2p = (1 + G) * a2, C1 = Math.hypot(a1p, b1), C2 = Math.hypot(a2p, b2);
  const hue = (x: number, y: number) => { if (!x && !y) return 0; const t = Math.atan2(y, x) / rad; return t < 0 ? t + 360 : t; };
  const h1 = hue(a1p, b1), h2 = hue(a2p, b2);
  let dh = 0;
  if (C1 * C2) { dh = h2 - h1; if (dh > 180) dh -= 360; else if (dh < -180) dh += 360; }
  const dL = L2 - L1, dC = C2 - C1, dH = 2 * Math.sqrt(C1 * C2) * Math.sin((dh / 2) * rad);
  const Lm = (L1 + L2) / 2, Cmp = (C1 + C2) / 2;
  let hm = h1 + h2;
  if (C1 * C2) hm = Math.abs(h1 - h2) > 180 ? (h1 + h2 + (h1 + h2 < 360 ? 360 : -360)) / 2 : (h1 + h2) / 2;
  const T = 1 - 0.17 * Math.cos((hm - 30) * rad) + 0.24 * Math.cos(2 * hm * rad) + 0.32 * Math.cos((3 * hm + 6) * rad) - 0.2 * Math.cos((4 * hm - 63) * rad);
  const dth = 30 * Math.exp(-(((hm - 275) / 25) ** 2)), Rc = 2 * Math.sqrt(Cmp ** 7 / (Cmp ** 7 + 25 ** 7));
  const Sl = 1 + (0.015 * (Lm - 50) ** 2) / Math.sqrt(20 + (Lm - 50) ** 2), Sc = 1 + 0.045 * Cmp, Sh = 1 + 0.015 * Cmp * T, Rt = -Math.sin(2 * dth * rad) * Rc;
  return Math.sqrt((dL / Sl) ** 2 + (dC / Sc) ** 2 + (dH / Sh) ** 2 + Rt * (dC / Sc) * (dH / Sh));
}
/** Deux fonds clairs trop proches pour deux marques différentes. */
export const fondsTropProches = (a: string, b: string) => deltaE2000(a, b) < FOND_ECART_MIN;

// ---------------------------------------------------------------- les polices : lignées et allures

/** Polices d'une même lignée : une seule police pour l'œil (même dessin, autre graisse ou autre version). */
const LIGNEE: Record<string, string> = { archivo_black: "archivo", cormorant_garamond: "cormorant", nunito_sans: "nunito" };
/** Lignée d'une poignée de police (« archivo_black_n4 » et « archivo_n8 » → « archivo »). */
export function ligneeDe(handle: string): string {
  const k = fontKeyOf(handle);
  return LIGNEE[k] ?? k;
}

export type AllureId = "ronde" | "condensee" | "display" | "manuscrite" | "chasse_fixe" | "serif_grasse" | "serif_fine" | "serif_lecture" | "tres_grasse" | "sans_demi" | "sans_fine";
/**
 * Allures des polices du catalogue (d'après leur caractère, `FONT_CHARACTER`), chacune avec ses polices de titres dans
 * l'ordre de ressemblance, à la graisse qui garde l'allure (« montserrat_n8 » est une très grasse, « montserrat_n6 » une
 * demi-grasse). Une police se classe dans la première allure qui la cite, dans l'ordre de ce tableau. Les voisines
 * servent seulement si toutes les polices de l'allure sont déjà prises.
 */
export const ALLURES: { id: AllureId; label: string; polices: string[]; voisines: AllureId[] }[] = [
  { id: "ronde", label: "ronde et épaisse", polices: ["nunito_n9", "nunito_n8", "rubik_n7", "poppins_n7", "nunito_n7", "outfit_n6", "rubik_n5"], voisines: ["display", "sans_demi"] },
  { id: "condensee", label: "condensée ou en capitales d'affiche", polices: ["anton_n4", "bebas_neue_n4", "oswald_n7", "barlow_n8", "oswald_n5"], voisines: ["tres_grasse"] },
  { id: "display", label: "d'affichage large, artistique ou rétro", polices: ["unbounded_n8", "syne_n8", "righteous_n4", "unbounded_n6", "syne_n6"], voisines: ["tres_grasse", "ronde"] },
  { id: "manuscrite", label: "manuscrite ou calligraphiée", polices: ["caveat_n7", "dancing_script_n7", "pacifico_n4", "satisfy_n4", "sacramento_n4", "allura_n4", "caveat_n4", "dancing_script_n4"], voisines: ["serif_fine", "display"] },
  { id: "chasse_fixe", label: "à chasse fixe (machine à écrire, technique)", polices: ["space_mono_n7", "ibm_plex_mono_n7", "jetbrains_mono_n7", "roboto_mono_n7", "space_mono_n4", "ibm_plex_mono_n4", "jetbrains_mono_n4", "roboto_mono_n4"], voisines: ["sans_demi", "tres_grasse"] },
  { id: "serif_grasse", label: "à empattements, très grasse d'affiche", polices: ["abril_fatface_n4", "alfa_slab_one_n4", "bodoni_moda_n8", "fraunces_n8", "playfair_display_n7", "merriweather_n7", "libre_baskerville_n7"], voisines: ["serif_fine", "serif_lecture"] },
  { id: "serif_fine", label: "à empattements fins et contrastés (élégante)", polices: ["instrument_serif_n4", "cormorant_n6", "playfair_display_n6", "bodoni_moda_n6", "prata_n4", "dm_serif_display_n4", "yeseva_one_n4", "cormorant_garamond_n6", "cormorant_n5", "cormorant_garamond_n5", "playfair_display_n4", "bodoni_moda_n4", "cormorant_n4", "cormorant_garamond_n4"], voisines: ["serif_grasse", "serif_lecture"] },
  { id: "serif_lecture", label: "à empattements doux ou classiques", polices: ["fraunces_n6", "lora_n6", "newsreader_n4", "libre_baskerville_n4", "merriweather_n4", "lora_n4", "fraunces_n4"], voisines: ["serif_fine", "serif_grasse"] },
  { id: "tres_grasse", label: "sans empattement très grasse", polices: ["archivo_black_n4", "archivo_n8", "chivo_n7", "montserrat_n8", "plus_jakarta_sans_n8", "manrope_n8", "geist_n8", "sora_n8", "figtree_n8", "outfit_n8", "urbanist_n8", "raleway_n8", "nunito_sans_n8", "poppins_n8", "inter_n8", "lato_n9", "space_grotesk_n7", "dm_sans_n7", "open_sans_n7", "source_sans_3_n7"], voisines: ["condensee", "display"] },
  { id: "sans_demi", label: "sans empattement demi-grasse", polices: ["montserrat_n7", "space_grotesk_n5", "jost_n6", "plus_jakarta_sans_n6", "manrope_n6", "sora_n6", "urbanist_n6", "figtree_n6", "geist_n6", "raleway_n6", "inter_n6", "work_sans_n6", "karla_n6", "archivo_n6", "chivo_n6", "barlow_n6", "nunito_sans_n6", "open_sans_n6", "source_sans_3_n6", "lato_n7", "poppins_n6", "montserrat_n6", "dm_sans_n5", "jost_n5"], voisines: ["tres_grasse", "ronde"] },
  { id: "sans_fine", label: "sans empattement légère", polices: ["jost_n4", "raleway_n4", "montserrat_n4", "work_sans_n4", "urbanist_n4", "outfit_n4", "sora_n4", "manrope_n4", "plus_jakarta_sans_n4", "figtree_n4", "geist_n4", "dm_sans_n4", "karla_n4", "inter_n4", "jost_n3", "lato_n3", "oswald_n3"], voisines: ["sans_demi"] },
];
const ALLURE = new Map(ALLURES.map((a) => [a.id, a]));
const weightOf = (handle: string) => Number(/_[ni](\d)$/.exec(handle)?.[1] ?? 4);

/** Allure d'une police de titres : la première allure qui la cite, sinon celle de sa graisse la plus proche. */
export function allureDe(handle: string): AllureId {
  const exact = ALLURES.find((a) => a.polices.includes(handle));
  if (exact) return exact.id;
  const k = fontKeyOf(handle), w = weightOf(handle);
  const near = ALLURES.flatMap((a) => a.polices.filter((p) => fontKeyOf(p) === k).map((p) => ({ a: a.id, d: Math.abs(weightOf(p) - w) }))).sort((x, y) => x.d - y.d)[0];
  return near?.a ?? "sans_demi";
}

const serifText = (handle: string) => FONT_FILES[fontKeyOf(handle)]?.fallback === "serif";
/**
 * Accord entre les titres et les textes : la même lignée (famille unique) s'accorde toujours ; sinon il faut un vrai
 * contraste. Deux serifs de lecture différentes, ou une sans légère sur une autre sans, se marchent dessus.
 */
export function accordPolices(heading: string, body: string): boolean {
  if (ligneeDe(heading) === ligneeDe(body)) return true;
  const a = allureDe(heading);
  if (a === "serif_lecture" && serifText(body)) return false;
  if (a === "sans_fine" && !serifText(body)) return false;
  return true;
}

/**
 * Police de titres de remplacement, sans IA : la première police libre de la même allure (puis des allures voisines,
 * puis de tout le catalogue), en accord avec la police de texte. Quand les titres et les textes étaient de la même
 * lignée, les textes la suivent si elle s'y prête. `prises` : lignées déjà données (marques récentes, autres identités).
 * Null seulement si le catalogue entier est pris.
 */
export function policeDeRemplacement(fonts: { heading: string; body: string }, prises: Set<string>): { heading: string; body: string } | null {
  const a = ALLURE.get(allureDe(fonts.heading))!;
  const order = [...a.polices, ...a.voisines.flatMap((v) => ALLURE.get(v)!.polices), ...ALLURES.flatMap((x) => x.polices)];
  const famille = ligneeDe(fonts.heading) === ligneeDe(fonts.body);
  for (const h of [...new Set(order)]) {
    if (!FONT_HANDLES.includes(h) || prises.has(ligneeDe(h))) continue;
    const suit = `${fontKeyOf(h)}_n4`;
    if (famille && FONT_HANDLES.includes(suit) && bodyFontOk(suit)) return { heading: h, body: suit };
    if (accordPolices(h, fonts.body)) return { heading: h, body: fonts.body };
  }
  return null;
}

// ---------------------------------------------------------------- les marques récentes du Studio

export type MarqueRecente = { heading: string | null; light: string | null };
const HEX = /^#[0-9a-fA-F]{6}$/;
/** Poignée de police d'une marque enregistrée (ancienne marque : parfois le nom de la famille). */
function handleOf(v: unknown): string | null {
  if (typeof v !== "string" || !v.trim()) return null;
  if (FONT_FILES[fontKeyOf(v)]) return v;
  const n = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const k = Object.keys(FONT_FILES).find((x) => n(FONT_FILES[x].family) === n(v) || n(x) === n(v));
  return k ? `${k}_n4` : null;
}
/** Police de titres et fond clair des dernières marques du Studio (autres projets, les plus récentes d'abord). */
export function marquesRecentes(projectId: string, n = MARQUES_COMPAREES): MarqueRecente[] {
  const rows = all<{ brand_json: string }>("SELECT brand_json FROM projects WHERE id <> ? AND archived = 0 AND brand_json IS NOT NULL AND brand_json NOT IN ('', '{}', 'null') ORDER BY updated_at DESC, rowid DESC LIMIT ?", projectId, n * 4);
  const out: MarqueRecente[] = [];
  for (const r of rows) {
    try {
      const b = JSON.parse(r.brand_json) as { fonts?: { heading?: unknown }; palette?: { light?: unknown } };
      const heading = handleOf(b?.fonts?.heading), light = typeof b?.palette?.light === "string" && HEX.test(b.palette.light) ? b.palette.light.toUpperCase() : null;
      if (heading || light) out.push({ heading, light });
    } catch { /* marque illisible : ignorée */ }
    if (out.length >= n) break;
  }
  return out;
}

/** Ce que SINA reçoit avant de proposer une identité : les polices de titres et les fonds des marques récentes. */
export function varieteMarquesBrief(recent: MarqueRecente[]): string {
  const fonts = [...new Map(recent.filter((m) => m.heading).map((m) => [ligneeDe(m.heading!), m.heading!])).values()];
  const lights = [...new Set(recent.map((m) => m.light).filter((x): x is string => !!x))];
  if (!fonts.length && !lights.length) return "";
  return [
    `# Les ${recent.length} dernières marques créées par le Studio pour d'autres clients : la tienne ne ressemble à aucune`,
    ...(fonts.length ? [`Polices de titres déjà prises (jamais la même, ni une autre graisse de la même police) : ${fonts.map((h) => `${fontFamily(h)} (${fontKeyOf(h)})`).join(", ")}. Choisis une autre police de la liste autorisée, dans le caractère demandé.`] : []),
    ...(lights.length ? [`Fonds clairs déjà pris (light) : ${lights.join(", ")}. Ton fond clair s'en écarte nettement (une autre teinte ou une autre profondeur, pas un blanc cassé de plus), sauf un fond « blanc », qui reste un blanc pur.`] : []),
    "Si tu reprends quand même une de ces polices ou un fond trop proche, le Studio les remplace lui-même avant les images.",
  ].join("\n");
}

// ---------------------------------------------------------------- le fond clair

type Fond = Pick<Identity, "palette" | "ground" | "gradient">;
/** Couleur d'OKLCH (clarté, saturation, teinte en degrés) en code hexadécimal ; null hors des couleurs d'un écran. */
export function oklchHex(L: number, C: number, h: number): string | null {
  const a = C * Math.cos((h * Math.PI) / 180), b = C * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lin = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
  if (lin.some((v) => v < -0.001 || v > 1.001)) return null;
  const enc = (v: number) => { const x = Math.min(1, Math.max(0, v)); return Math.round(255 * (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055)); };
  return `#${lin.map((v) => enc(v).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}
/** Clartés et saturations essayées : un fond de page qui reste clair et calme (jamais vif). */
const CLARTES = [0.975, 0.96, 0.945, 0.93, 0.915, 0.9, 0.885];
const SATURATIONS = [0.008, 0.016, 0.024, 0.032, 0.04, 0.05, 0.06];
/**
 * Fond clair de remplacement, sans IA, quand celui de l'identité est trop proche d'une marque récente : un fond pâle
 * pris dans les teintes de la marque elle-même (celle du fond choisi, de l'accent, du bouton, de la surface), clair et
 * peu saturé, sans aucun défaut de contraste de plus, le plus proche possible du fond choisi. Si aucun ne s'écarte assez
 * de toutes les marques récentes (cas extrême), le plus éloigné est pris. Null : rien à changer.
 */
export function fondDeRemplacement(x: Fond, recentLights: string[]): { light: string; assez: boolean } | null {
  const light = x.palette.light.toUpperCase();
  const dist = (c: string) => Math.min(...recentLights.map((r) => deltaE2000(c, r)));
  if (!recentLights.length || x.ground === "blanc" || dist(light) >= FOND_ECART_MIN) return null;
  const before = new Set(paletteIssues(x.palette, x.ground, x.gradient));
  // Teintes de la marque : celle du fond choisi (même presque blanc, il a une chaleur), puis les couleurs franches.
  const own = oklch(light);
  const hues = [own.h, ...[x.palette.accent, x.palette.primary, x.palette.secondary].map(oklch).filter((c) => c.c >= 0.02).map((c) => c.h)];
  const raw = hues.flatMap((h) => CLARTES.flatMap((L) => SATURATIONS.map((C) => oklchHex(L, C, h)))).filter((c): c is string => !!c);
  const ok = [...new Set(raw)].filter((c) => !sameColor(c, light) && paletteIssues({ ...x.palette, light: c }, x.ground, x.gradient).every((i) => before.has(i)))
    .map((c) => ({ c, far: dist(c), near: deltaE2000(c, light) }));
  const enough = ok.filter((o) => o.far >= FOND_ECART_MIN).sort((a, b) => a.near - b.near)[0];
  if (enough) return { light: enough.c, assez: true };
  const best = ok.sort((a, b) => b.far - a.far)[0];
  return best && best.far > dist(light) ? { light: best.c, assez: false } : null;
}

// ---------------------------------------------------------------- la série d'identités

/** Couleurs données par le client lui-même (site importé, codes écrits dans sa fiche) : jamais changées. */
function clientColors(j?: Journey): string[] {
  if (!j) return [];
  const site = j.imported.flatMap((s) => s.colors ?? []);
  const said = Object.values(j.start).flatMap((a) => (a?.status === "answered" ? a.value.match(/#[0-9a-fA-F]{6}\b/g) ?? [] : []));
  return [...site, ...said].filter((c) => HEX.test(c));
}
/** Parties d'une identité qui ne sont pas des textes : jamais réécrites par `swapText`. */
const NOT_TEXT = new Set(["key", "name", "palette", "gradient", "fonts"]);
/** Remplace un mot exact (nom de police, code couleur) dans les textes d'une identité (jamais son nom ni ses couleurs). */
function swapText<T>(v: T, from: string, to: string): T {
  const re = new RegExp(`(?<![\\p{L}\\p{N}])${from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\p{N}])`, "giu");
  const walk = (o: any): any => (typeof o === "string" ? o.replace(re, to) : Array.isArray(o) ? o.map(walk) : o && typeof o === "object" ? Object.fromEntries(Object.entries(o).map(([k, e]) => [k, NOT_TEXT.has(k) ? e : walk(e)])) : o);
  return walk(v);
}

/**
 * Le contrôle du Studio, sans IA, sur une série d'identités : seules celles de `modifiables` changent (les autres, déjà
 * gardées par le client, comptent comme prises). Police de titres reprise d'une marque récente ou d'une autre identité
 * de la série : remplacée ; fond clair trop proche d'une marque récente : remplacé. Rien ne change quand le client garde
 * ses polices ou ses couleurs, ni sur ses propres couleurs, ni sur la couleur du bouton.
 */
export function varierIdentites<T extends Identity>(list: T[], recent: MarqueRecente[], o: { modifiables: string[]; j?: Journey }): { list: T[]; changes: string[] } {
  const keepFonts = !!o.j?.keep.includes("polices"), keepColors = !!o.j?.keep.includes("couleurs");
  const own = clientColors(o.j), changes: string[] = [];
  const recentFonts = new Set(recent.flatMap((m) => (m.heading ? [ligneeDe(m.heading)] : [])));
  const lights = recent.flatMap((m) => (m.light ? [m.light] : []));
  const serie = new Set(list.filter((x) => !o.modifiables.includes(x.key)).map((x) => ligneeDe(x.fonts.heading)));
  const out = list.map((x) => {
    if (!o.modifiables.includes(x.key)) return x;
    let y: T = x;
    if (!keepFonts) {
      const lin = ligneeDe(y.fonts.heading);
      if (recentFonts.has(lin) || serie.has(lin)) {
        const next = policeDeRemplacement(y.fonts, new Set([...recentFonts, ...serie]));
        if (next) {
          const before = fontFamily(y.fonts.heading), after = fontFamily(next.heading);
          y = { ...swapText(y, before, after), fonts: next };
          changes.push(`Identité ${x.key} : police de titres ${before} (${recentFonts.has(lin) ? "déjà prise par une marque récente" : "déjà prise dans la série"}) remplacée par ${after}${next.body !== x.fonts.body ? `, textes en ${fontFamily(next.body)}` : ""}.`);
        }
      }
      serie.add(ligneeDe(y.fonts.heading));
    }
    if (!keepColors && !own.some((c) => sameColor(c, y.palette.light))) {
      const f = fondDeRemplacement(y, lights);
      if (f) {
        const before = y.palette.light;
        y = { ...swapText(y, before, f.light), palette: { ...y.palette, light: f.light } };
        changes.push(`Identité ${x.key} : fond clair ${before} trop proche d'une marque récente, remplacé par ${f.light}${f.assez ? "" : " (le plus éloigné possible : aucun fond tiré de ses couleurs ne s'écartait assez de toutes)"}.`);
      }
    }
    return y;
  });
  return { list: out, changes };
}
