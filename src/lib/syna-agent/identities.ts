/**
 * Étape 1 du parcours SINA (#492) : 3 identités de marque VRAIMENT différentes (charte qualité 2026 § 2.1,
 * docs/syna/CHARTE-QUALITE-2026.md). Claude (modèle fort) les crée à partir de la fiche de départ ; le Studio contrôle
 * ensuite gratuitement ce qui se mesure (noms, slogans, palettes et contrastes, polices, styles de logo, éléments gardés
 * en refonte) ; une seule reprise, annoncée, si le contrôle échoue. Rien d'inventé : ni chiffre, ni avis, ni garantie.
 */
import { z } from "zod";
import { FONT_FILES, FONT_HANDLES } from "../theme/render";
import { BRAND_RULES } from "../media/identity-board";
import { contrast, hexToRgb, luminance, onColor, sameColor } from "../color";
import { FIELD_LABEL, START_FIELDS, type Journey } from "./journey";

/** Styles de logo de la charte (§ 2.2) : les 3 identités en prennent 3 différents. */
export const LOGO_STYLES = ["lettrage", "symbole", "monogramme", "embleme", "cachet", "mascotte", "trait", "abstrait", "pixel", "brutaliste", "isometrie", "aquarelle", "artdeco", "popart"] as const;
export const LOGO_STYLE_LABEL: Record<(typeof LOGO_STYLES)[number], string> = {
  lettrage: "lettrage seul raffiné", symbole: "symbole + nom", monogramme: "monogramme", embleme: "emblème ou badge fermé",
  cachet: "cachet ou tampon", mascotte: "mascotte illustrée", trait: "trait continu (line art)", abstrait: "icône abstraite colorée",
  pixel: "pixel", brutaliste: "brutaliste à ombre décalée", isometrie: "isométrie 3D", aquarelle: "tache d'aquarelle",
  artdeco: "art déco", popart: "pop art",
};

/** Polices proposables (toutes sur Google Fonts et rendues par le thème), avec leur caractère. */
export const FONT_CHARACTER: Record<string, string> = {
  newsreader: "serif éditoriale", anton: "sans serif condensée très grasse", nunito: "ronde épaisse", lato: "sans serif humaniste",
  instrument_serif: "serif fine contrastée", cormorant: "serif fine contrastée, luxe", inter: "sans serif neutre", jost: "sans serif géométrique",
  dm_sans: "sans serif géométrique douce", archivo: "grotesque grasse", chivo: "grotesque", lora: "serif douce",
  work_sans: "sans serif simple", space_grotesk: "grotesque technique", montserrat: "sans serif géométrique large", karla: "grotesque légère",
  libre_baskerville: "serif classique", playfair_display: "serif contrastée", poppins: "sans serif géométrique ronde", space_mono: "chasse fixe",
  oswald: "sans serif condensée",
};
const fontKey = (handle: string) => handle.replace(/_[ni]\d$/, "");
export const fontFamily = (handle: string) => FONT_FILES[fontKey(handle)]?.family ?? handle;
const FONT_LIST = Object.entries(FONT_FILES).map(([k, f]) => `${k} (${f.family}, ${FONT_CHARACTER[k] ?? f.fallback} ; graisses ${Object.keys(f.files).join("/")})`).join("\n");

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const IdentitySchema = z.object({
  key: z.enum(["A", "B", "C"]),
  name: z.string().min(1).max(40),
  nameStyle: z.string().max(120).default(""),
  nameWhy: z.string().max(400).default(""),
  slogan: z.string().max(90),
  sloganTone: z.string().max(80).default(""),
  promise: z.string().max(260),
  territory: z.string().max(160),
  /** Fond de page (règle du propriétaire, 6 novembre) : un blanc, un crème, un sombre dans chaque série. */
  ground: z.enum(["blanc", "creme", "sombre"]),
  palette: z.object({ dark: hex, primary: hex, secondary: hex, accent: hex, light: hex }),
  paletteFamily: z.string().max(120).default(""),
  fonts: z.object({ heading: z.string().max(40), body: z.string().max(40) }),
  fontStyle: z.string().max(120).default(""),
  tone: z.object({ adjectives: z.array(z.string().max(40)).min(3).max(3), avoid: z.array(z.string().max(60)).min(3).max(3) }),
  logoStyle: z.enum(LOGO_STYLES),
  logoIdea: z.string().max(400),
  why: z.string().max(500),
});
export type Identity = z.infer<typeof IdentitySchema>;
export const IdentitiesSchema = z.object({
  identities: z.array(IdentitySchema).length(3),
  /** Comparaison axe par axe faite par Claude (charte : au moins 4 axes sur 6 différents, dont le territoire). */
  comparison: z.string().max(1500).default(""),
});

const SHAPE = `{"identities": [{"key": "A", "name": "", "nameStyle": "", "nameWhy": "", "slogan": "", "sloganTone": "", "promise": "", "territory": "", "ground": "blanc|creme|sombre", "palette": {"dark": "#RRGGBB", "primary": "#RRGGBB", "secondary": "#RRGGBB", "accent": "#RRGGBB", "light": "#RRGGBB"}, "paletteFamily": "", "fonts": {"heading": "playfair_display_n7", "body": "inter_n4"}, "fontStyle": "", "tone": {"adjectives": ["", "", ""], "avoid": ["", "", ""]}, "logoStyle": "${LOGO_STYLES.join("|")}", "logoIdea": "", "why": ""}, {"key": "B", …}, {"key": "C", …}], "comparison": ""}`;

/** Consignes stables (mises en cache) : charte § 2.1 et 2.2, règles de cohésion de marque. */
export const IDENTITY_SYSTEM = `Tu es directrice de création d'une agence de marque de premier plan, en 2026. Tu crées pour UN client trois identités de marque complètes et VRAIMENT différentes, au niveau des meilleures marques de 2026 (jamais une finition « années 2000 »).

Les trois identités diffèrent sur au moins 4 des 6 axes, dont toujours le premier :
1. Territoire émotionnel (ex. évasion / fierté artisanale / complicité joyeuse).
2. Style du nom (ex. mot inventé court / mot français évocateur / nom composé ou initiales).
3. Famille de couleurs et fond de page (un fond blanc, un fond crème, un fond sombre ; teintes nettement différentes).
4. Famille de polices (ex. serif fine contrastée / sans serif condensée très grasse / ronde épaisse).
5. Ton du slogan (ex. poétique / direct et impératif / complice et léger).
6. Style de logo : trois styles DIFFÉRENTS parmi ${LOGO_STYLES.map((s) => `${s} (${LOGO_STYLE_LABEL[s]})`).join(", ")}, choisis pour le métier du client et pour chaque identité.

Chaque identité contient :
- name : un nom de marque qui marque les esprits, au niveau des marques qui réussissent en 2026. Pour CHAQUE identité, explore mentalement au moins 20 pistes (mot inventé, mot détourné, mot d'une autre langue, onomatopée, prénom, lieu, image forte, contraction…) et garde la plus forte : courte (1 mot de préférence, 2 au plus, 12 lettres au plus), sonore, facile à dire, à écrire et à retenir, qui crée une image ou une émotion, propre à cette marque (dépôt et nom de domaine plausibles), jamais le nom d'une marque connue. Interdits, car banals et descriptifs : les formules « Maison … », « L'Atelier de … », « Les Délices de … », « Saveurs de … », « Grand … », « Le Comptoir … », « … & … », le nom du produit ou du métier lui-même (ex. « Confiture… », « Plâtre… »), les jeux de mots faciles en -ou / -ette. nameStyle dit son style, nameWhy pourquoi il parle à la cible.
- slogan : 6 mots au plus, en français, sans promesse invérifiable ; sloganTone dit son ton.
- promise : la promesse en une phrase, du point de vue du client final.
- territory : le territoire émotionnel en quelques mots.
- ground : le fond de page de l'identité. Les trois identités ont trois fonds DIFFÉRENTS : une « blanc » (fond blanc pur ou presque, ex. #FFFFFF), une « creme » (fond crème ou ivoire nettement teinté, ex. #F5EEDC), une « sombre » (fond très foncé, presque noir ou nuit profonde, texte clair dessus).
- palette : 5 couleurs en hexadécimal. light = le neutre clair (le fond si ground est blanc ou creme, sinon la couleur du texte) ; dark = le neutre foncé (la couleur du texte si ground est blanc ou creme, sinon le fond) ; primary = couleur de marque (titres, lisible sur le fond) ; secondary = couleur de surface (bandeaux, cartes) ; accent = boutons (texte lisible dessus). Contraste d'au moins 4,5:1 pour texte/fond, titre/fond, texte/surface et texte/bouton. paletteFamily nomme la famille de couleurs.
- Couleurs de 2026 : vives, franches et actuelles (ex. vert électrique, bleu outremer, rouge tomate, jaune citron, violet profond, corail, rose fluo si le client l'accepte…), jamais ternes, boueuses, délavées ou « vintage » sauf demande expresse du client. La couleur de marque et l'accent sont saturés. D'une identité à l'autre, la couleur de marque et l'accent appartiennent à des familles de teintes NETTEMENT différentes (jamais trois orangés, jamais trois verts).
- fonts : deux poignées « clé_nN » de la liste autorisée (N = graisse / 100 disponible pour cette police) ; heading = titres, body = textes (graisse 4). Trois polices de titres différentes d'une identité à l'autre. fontStyle nomme la famille de polices.
- tone : 3 adjectifs du ton de voix et 3 choses à ne jamais dire ou faire.
- logoStyle et logoIdea : l'idée du logo, simple et astucieuse, tirée du métier ou du nom (ex. un éclair qui forme le V d'un électricien, une goutte qui contient une gourde), décrite en une ou deux phrases ; aucun WordArt, aucun dégradé gratuit.
- why : en une ou deux phrases, pourquoi cette identité convient à CE client (cible, image voulue, différence).

Règles de cohésion de toute création : ${BRAND_RULES.join(" ")}

Interdits : inventer un chiffre, un avis, une note, une certification, une garantie, un délai, un prix ; reprendre une couleur que le client refuse ; utiliser une police hors liste ; copier une marque existante. Le vocabulaire du client est repris tel quel. Tout est rédigé en français et en tutoyant le client quand tu t'adresses à lui (why, nameWhy).

Polices autorisées (clé, famille, caractère, graisses) :
${FONT_LIST}

Réponds UNIQUEMENT avec un objet JSON de cette forme exacte :
${SHAPE}
« comparison » : ta comparaison axe par axe des trois identités (au moins 4 axes différents par paire, dont le territoire).`;

/** Ce que le client a dit à l'étape 0, rubrique par rubrique (seules les réponses données). */
export function briefFromJourney(j: Journey): string {
  const lines = START_FIELDS.filter((f) => j.start[f]).map((f) => {
    const a = j.start[f]!;
    const v = a.status === "answered" ? (f === "business" ? (a.value === "services" ? "des services" : "des produits") : a.value) : a.status === "later" ? "plus tard" : "rien de particulier";
    return `- ${FIELD_LABEL[f].fr} : ${v}`;
  });
  return lines.join("\n");
}

/** Contraintes de refonte : ce qui est gardé tel quel se retrouve à l'identique dans les 3 identités. */
export function keepConstraints(j: Journey): string {
  if (!j.keep.length) return "Création complète : tout est à créer.";
  const site = j.imported[0];
  const out = [`Refonte : le client garde TEL QUEL ${j.keep.join(", ")} ; ces éléments sont IDENTIQUES dans les 3 identités, tout le reste diffère.`];
  if (j.keep.includes("nom")) out.push(`Nom gardé, mot pour mot dans les 3 identités : « ${j.keptValues?.name || site?.name || "[À compléter : nom]"} » (name identique ; nameStyle = « nom gardé »).`);
  if (j.keep.includes("slogan")) out.push(`Slogan gardé, mot pour mot dans les 3 identités : « ${j.keptValues?.slogan || site?.tagline || "[À compléter : slogan]"} ».`);
  if (j.keep.includes("couleurs")) out.push(`Couleurs gardées : ${site?.colors?.length ? site.colors.join(", ") : "celles du logo joint"} ; la même palette dans les 3 identités, construite à partir de ces couleurs.`);
  if (j.keep.includes("polices")) out.push(`Polices gardées : ${site?.fonts?.length ? site.fonts.join(", ") : "celles du client"} ; prends la police autorisée la plus proche, la même dans les 3 identités.`);
  if (j.keep.includes("logo")) out.push("Logo gardé (image jointe s'il y en a une) : les 3 identités s'accordent avec lui (couleurs et polices compatibles) ; logoStyle décrit le style du logo existant, logoIdea dit comment il sera décliné.");
  return out.join("\n");
}

/** Formules de nom banales (retour du propriétaire du 6 novembre : « les noms sont pas ouf »). */
export const BANAL_NAME = /^(maison|l'atelier|atelier|les d[ée]lices|d[ée]lices|saveurs?|grand|le comptoir|comptoir|l'[ée]picerie|aux? )\b|&| et /i;
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
/** Couleurs refusées par le client (« pas de rose », « surtout pas le noir »…), repérées dans sa réponse « image ». */
const REFUSED_COLORS: Record<string, RegExp> = {
  rose: /\bros(e|es)\b|fuchsia|magenta/i, rouge: /\brouges?\b/i, orange: /\boranges?\b/i, jaune: /\bjaunes?\b/i, vert: /\bverts?\b|\bvertes?\b/i,
  bleu: /\bbleus?\b|\bbleues?\b/i, violet: /\bviolets?\b|\bviolettes?\b|\bmauves?\b/i, marron: /\bmarron\b|\bbruns?\b/i, noir: /\bnoirs?\b|\bnoires?\b/i, gris: /\bgris\b|\bgrises?\b/i,
};
/** Teinte d'une couleur (0-360) et saturation, pour vérifier une couleur refusée. */
function hueSat(hexColor: string): { h: number; s: number; l: number } {
  const n = parseInt(hexColor.slice(1), 16), r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  if (!d) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? 60 * (((g - b) / d) % 6) : max === g ? 60 * ((b - r) / d + 2) : 60 * ((r - g) / d + 4);
  return { h: (h + 360) % 360, s, l };
}
const HUE_RANGE: Record<string, (c: { h: number; s: number; l: number }) => boolean> = {
  rose: (c) => c.s > 0.25 && c.h >= 300 && c.h < 345 && c.l > 0.35,
  rouge: (c) => c.s > 0.35 && (c.h >= 345 || c.h < 12), orange: (c) => c.s > 0.4 && c.h >= 15 && c.h < 40 && c.l > 0.3,
  jaune: (c) => c.s > 0.4 && c.h >= 45 && c.h < 65, vert: (c) => c.s > 0.25 && c.h >= 75 && c.h < 165,
  bleu: (c) => c.s > 0.25 && c.h >= 190 && c.h < 250, violet: (c) => c.s > 0.25 && c.h >= 255 && c.h < 300,
  marron: (c) => c.s > 0.2 && c.h >= 10 && c.h < 40 && c.l < 0.35, noir: (c) => c.l < 0.08, gris: (c) => c.s < 0.08 && c.l > 0.2 && c.l < 0.8,
};
/** Couleurs que le client ne veut « surtout pas » (seulement après une négation : « pas de », « sans », « surtout pas »). */
export function refusedColors(text: string): string[] {
  const neg = text.match(/(?:pas d[eu']|pas de la|pas le|pas la|surtout pas|jamais|sans|aucun(?:e)?|ni)\s*[^.;\n]*/gi) ?? [];
  return Object.keys(REFUSED_COLORS).filter((c) => neg.some((part) => REFUSED_COLORS[c].test(part)));
}

/** OKLab : clarté, saturation perçue (chroma) et teinte (degrés), pour juger « vif » et « différent » comme l'œil. */
export function oklch(hexColor: string): { l: number; c: number; h: number } {
  const [r, g, b] = hexToRgb(hexColor).map((v) => { const n = v / 255; return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4; });
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { l: L, c: Math.hypot(A, B), h: (Math.atan2(B, A) * 180 / Math.PI + 360) % 360 };
}
const hueGap = (a: number, b: number) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };
/** Seuils (règle du propriétaire du 6 novembre : couleurs vives et à l'air du temps, vraiment différentes). */
export const COLOR_RULES = { primaryChroma: 0.13, accentChroma: 0.15, hueGap: 40 };
/**
 * Couleur vive : saturation perçue suffisante, ou couleur claire et franchement saturée. Le turquoise et le cyan
 * plafonnent naturellement plus bas en saturation perçue (essai réel : un turquoise vif #1FC7B6 jugé « terne » à tort) ;
 * un brun foncé (#8A3B12) reste terne.
 */
export function isVivid(hexColor: string, minChroma: number): boolean {
  const o = oklch(hexColor);
  if (o.c >= minChroma) return true;
  const { s } = hueSat(hexColor);
  return o.c >= 0.11 && s >= 0.7 && o.l >= 0.6;
}

/** Couleurs de l'interface d'une identité selon son fond (fond sombre : texte clair). */
export function groundPresentation(p: Identity["palette"], ground: Identity["ground"]) {
  const bg = ground === "sombre" ? p.dark : p.light, text = ground === "sombre" ? p.light : p.dark;
  return { background: bg, text, heading: p.primary, surface: p.secondary, surfaceText: onColor(p.secondary, p.dark, p.light), button: p.accent, buttonText: onColor(p.accent, p.dark, p.light) };
}

/** Contrôle d'une palette : fond conforme à son type, contrastes, couleurs vives. */
export function paletteIssues(p: Identity["palette"], ground: Identity["ground"]): string[] {
  const issues: string[] = [];
  const L = (x: string) => oklch(x);
  if (ground === "blanc" && (luminance(p.light) < 0.9 || L(p.light).c > 0.012)) issues.push(`fond « blanc » ${p.light} : un blanc pur ou presque est attendu (ex. #FFFFFF).`);
  if (ground === "creme" && (luminance(p.light) < 0.7 || L(p.light).c < 0.015 || L(p.light).c > 0.07 || L(p.light).h < 50 || L(p.light).h > 110)) issues.push(`fond « crème » ${p.light} : un crème ou ivoire nettement teinté est attendu (ex. #F5EEDC).`);
  if (ground === "sombre" && luminance(p.dark) > 0.03) issues.push(`fond « sombre » ${p.dark} : un fond très foncé est attendu (presque noir ou nuit profonde).`);
  if (ground !== "sombre" && luminance(p.dark) > 0.12) issues.push(`dark ${p.dark} : le texte doit être foncé.`);
  if (ground === "sombre" && luminance(p.light) < 0.65) issues.push(`light ${p.light} : le texte sur fond sombre doit être clair.`);
  const v = groundPresentation(p, ground);
  for (const [role, fg, bg] of [["texte/fond", v.text, v.background], ["titre/fond", v.heading, v.background], ["texte/surface", v.surfaceText, v.surface], ["texte/bouton", v.buttonText, v.button]] as const) {
    if (contrast(fg, bg) < 4.5) issues.push(`${role} : contraste ${contrast(fg, bg).toFixed(2)}:1 inférieur à 4,5:1.`);
  }
  if (!isVivid(p.primary, COLOR_RULES.primaryChroma)) issues.push(`couleur de marque ${p.primary} trop terne : une couleur plus vive est attendue.`);
  if (!isVivid(p.accent, COLOR_RULES.accentChroma)) issues.push(`accent ${p.accent} trop terne : une couleur vive est attendue.`);
  for (const [a, b] of [["primary", "secondary"], ["primary", "accent"], ["secondary", "accent"]] as const) if (sameColor(p[a], p[b])) issues.push(`${a}/${b} : couleurs indiscernables.`);
  return issues;
}

/** Contrôles gratuits (sans IA) de la série : ce qui se mesure ; la comparaison des axes reste à Claude. */
export function identityIssues(list: Identity[], j: Journey): string[] {
  const issues: string[] = [];
  const keptName = j.keep.includes("nom") ? (j.keptValues?.name || j.imported[0]?.name || "") : "";
  const keptSlogan = j.keep.includes("slogan") ? (j.keptValues?.slogan || j.imported[0]?.tagline || "") : "";
  if (list.map((x) => x.key).join("") !== "ABC") issues.push("Les trois identités doivent avoir les clés A, B et C, dans l'ordre.");
  for (const x of list) {
    const tag = `Identité ${x.key}`;
    if (keptName && x.name.trim() !== keptName.trim()) issues.push(`${tag} : le nom gardé « ${keptName} » doit être repris mot pour mot.`);
    if (keptSlogan && x.slogan.trim() !== keptSlogan.trim()) issues.push(`${tag} : le slogan gardé « ${keptSlogan} » doit être repris mot pour mot.`);
    if (!keptSlogan && words(x.slogan) > 6) issues.push(`${tag} : slogan de ${words(x.slogan)} mots (6 au plus).`);
    if (!keptName && words(x.name) > 2) issues.push(`${tag} : nom trop long (${words(x.name)} mots, 2 au plus).`);
    if (!keptName && BANAL_NAME.test(x.name)) issues.push(`${tag} : nom « ${x.name} » trop banal (formule toute faite) ; un nom plus fort et plus propre à la marque est attendu.`);
    if (!FONT_HANDLES.includes(x.fonts.heading)) issues.push(`${tag} : police de titres « ${x.fonts.heading} » hors liste (clé_nN d'une graisse disponible).`);
    if (!FONT_HANDLES.includes(x.fonts.body)) issues.push(`${tag} : police de textes « ${x.fonts.body} » hors liste.`);
    for (const p of paletteIssues(x.palette, x.ground)) issues.push(`${tag} — ${p}`);
    const refused = j.start.image?.status === "answered" ? refusedColors(j.start.image.value) : [];
    for (const c of refused) for (const role of ["primary", "secondary", "accent"] as const) {
      if (HUE_RANGE[c]?.(hueSat(x.palette[role]))) issues.push(`${tag} : ${role} ${x.palette[role]} ressemble à une couleur refusée par le client (${c}).`);
    }
  }
  if (!keptName) {
    const names = list.map((x) => norm(x.name));
    if (new Set(names).size < names.length) issues.push("Deux identités ont le même nom : trois noms différents sont attendus.");
  }
  if (!keptSlogan && new Set(list.map((x) => norm(x.slogan))).size < list.length) issues.push("Deux identités ont le même slogan.");
  if (!j.keep.includes("logo") && new Set(list.map((x) => x.logoStyle)).size < list.length) issues.push("Deux identités ont le même style de logo : trois styles différents sont attendus.");
  if (!j.keep.includes("polices") && new Set(list.map((x) => fontKey(x.fonts.heading))).size < list.length) issues.push("Deux identités ont la même police de titres : trois familles différentes sont attendues.");
  if (!j.keep.includes("couleurs")) {
    // Trois fonds de page : un blanc, un crème, un sombre (règle du propriétaire du 6 novembre).
    if (new Set(list.map((x) => x.ground)).size < list.length) issues.push(`Fonds de page : ${list.map((x) => `${x.key} ${x.ground}`).join(", ")} ; il faut un fond blanc, un fond crème et un fond sombre.`);
    for (const [i, a] of list.entries()) for (const b of list.slice(i + 1)) {
      for (const role of ["primary", "accent"] as const) {
        const gap = hueGap(oklch(a.palette[role]).h, oklch(b.palette[role]).h);
        if (gap < COLOR_RULES.hueGap) issues.push(`Identités ${a.key}/${b.key} : ${role === "primary" ? "couleurs de marque" : "accents"} de la même famille (${a.palette[role]} / ${b.palette[role]}) ; des teintes nettement différentes sont attendues.`);
      }
    }
  }
  return [...new Set(issues)];
}

/** Demande à Claude : fiche de départ, contraintes de refonte, éventuelles consignes du client et corrections du contrôle. */
export function identityPrompt(j: Journey, opts: { guidance?: string; feedback?: string[]; previous?: Identity[]; redo?: string[] } = {}): string {
  const parts = [
    "# Fiche de départ du client (étape 0, ses mots)",
    briefFromJourney(j),
    "",
    "# Existant et refonte",
    keepConstraints(j),
  ];
  if (j.imported.length) parts.push(`Site existant lu : ${j.imported.map((s) => `${s.url} (nom « ${s.name ?? "?"} », slogan « ${s.tagline ?? "?"} », couleurs ${s.colors?.join(" ") || "?"}, polices ${s.fonts?.join(", ") || "?"})`).join(" ; ")}.`);
  if (opts.guidance) parts.push("", "# Ce que le client demande pour cette nouvelle proposition", opts.guidance);
  if (opts.previous?.length && opts.redo?.length) {
    parts.push("", `# Propositions précédentes : refais seulement ${opts.redo.join(", ")}, garde les autres À L'IDENTIQUE (même contenu, mêmes clés)`, JSON.stringify(opts.previous));
  } else if (opts.previous?.length && opts.feedback?.length) {
    parts.push("", "# Ta proposition précédente (corrige-la selon le contrôle ci-dessous, garde ce qui est bon)", JSON.stringify(opts.previous));
  }
  if (opts.feedback?.length) parts.push("", "# Corrections exigées par le contrôle du Studio (à appliquer impérativement)", ...opts.feedback.map((f) => `- ${f}`));
  parts.push("", "Crée les trois identités A, B et C. Réponds avec l'objet JSON demandé.");
  return parts.join("\n");
}

/** Remise en forme tolérante (police donnée par son nom de famille, style de logo avec accent…). */
export function prepareIdentities(raw: any): any {
  const list = Array.isArray(raw) ? raw : raw?.identities;
  if (!Array.isArray(list)) return raw;
  const byFamily = (v: string, role: "heading" | "body") => {
    if (typeof v !== "string" || FONT_HANDLES.includes(v)) return v;
    const key = Object.keys(FONT_FILES).find((k) => norm(k) === norm(v) || norm(FONT_FILES[k].family) === norm(v.replace(/_?[ni]\d$/, "")));
    if (!key) return v;
    const ws = Object.keys(FONT_FILES[key].files).map(Number);
    const want = role === "body" ? 400 : 700;
    const w = ws.sort((a, b) => Math.abs(a - want) - Math.abs(b - want))[0];
    return `${key}_n${String(w)[0]}`;
  };
  return {
    ...(Array.isArray(raw) ? {} : raw),
    identities: list.map((x: any, i: number) => ({
      ...x,
      key: x?.key ?? "ABC"[i],
      logoStyle: typeof x?.logoStyle === "string" ? norm(x.logoStyle).replace(/^embleme.*/, "embleme").replace(/^artdeco.*/, "artdeco") : x?.logoStyle,
      fonts: x?.fonts ? { heading: byFamily(x.fonts.heading, "heading"), body: byFamily(x.fonts.body, "body") } : x?.fonts,
    })),
  };
}

/** Fichier de police d'une poignée « clé_nN » (cartes du fil : la vraie police est montrée au client). */
export function fontFace(handle: string): { family: string; file: string; weight: number } | null {
  const m = /^(.*)_n(\d)$/.exec(handle);
  const def = m ? FONT_FILES[m[1]] : undefined;
  if (!m || !def) return null;
  const want = Number(m[2]) * 100;
  const w = Object.keys(def.files).map(Number).sort((a, b) => Math.abs(a - want) - Math.abs(b - want))[0];
  return { family: def.family, file: def.files[w], weight: want };
}
