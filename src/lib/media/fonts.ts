/** Polices embarquées (OFL) pour les compositions d'images, logos et vidéos. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GlobalFonts } from "@napi-rs/canvas";

/**
 * Dossier des polices. Il ne dépend pas seulement du dossier de lancement : lancé ailleurs (script, service,
 * travailleur démarré depuis un autre dossier), le rendu retombait EN SILENCE sur une police système de graisse
 * normale — un logo « Montserrat 800 » sortait fin. On cherche donc FONT_DIR (variable d'environnement), puis
 * assets/fonts en remontant depuis le dossier courant et depuis ce fichier.
 */
export function findFontDir(): string {
  const probe = (dir: string) => fs.existsSync(path.join(dir, "Inter-400.ttf"));
  if (process.env.FONT_DIR && probe(process.env.FONT_DIR)) return process.env.FONT_DIR;
  const starts = [process.cwd()];
  try {
    starts.push(path.dirname(fileURLToPath(import.meta.url)));
  } catch {
    // Module sans URL de fichier (paquet) : le dossier courant suffit.
  }
  for (const start of starts) {
    let dir = start;
    for (let i = 0; i < 8; i++) {
      const cand = path.join(dir, "assets", "fonts");
      if (probe(cand)) return cand;
      const up = path.dirname(dir);
      if (up === dir) break;
      dir = up;
    }
  }
  return path.join(process.cwd(), "assets", "fonts");
}

export const FONT_DIR = findFontDir();

/** Familles disponibles pour la composition (nom canvas → fichiers par graisse). */
export const CANVAS_FONTS: Record<string, { file: Record<number, string>; italic?: string; kind: "serif" | "sans" | "display" }> = {
  "Cormorant": { file: { 400: "Cormorant-400.ttf", 500: "Cormorant-500.ttf", 600: "Cormorant-600.ttf" }, italic: "Cormorant-500italic.ttf", kind: "serif" },
  "Jost": { file: { 400: "Jost-400.ttf", 500: "Jost-500.ttf", 600: "Jost-600.ttf" }, kind: "sans" },
  "DM Sans": { file: { 400: "DMSans-400.ttf", 500: "DMSans-500.ttf", 700: "DMSans-700.ttf" }, kind: "sans" },
  "Archivo": { file: { 400: "Archivo-400.ttf", 600: "Archivo-600.ttf", 800: "Archivo-800.ttf" }, kind: "display" },
  "Chivo": { file: { 400: "Chivo-400.ttf", 600: "Chivo-600.ttf", 800: "Chivo-800.ttf" }, kind: "sans" },
  "Lora": { file: { 400: "Lora-400.ttf", 600: "Lora-600.ttf" }, kind: "serif" },
  "Work Sans": { file: { 400: "WorkSans-400.ttf", 500: "WorkSans-500.ttf", 600: "WorkSans-600.ttf" }, kind: "sans" },
  "Space Grotesk": { file: { 400: "SpaceGrotesk-400.ttf", 500: "SpaceGrotesk-500.ttf", 700: "SpaceGrotesk-700.ttf" }, kind: "display" },
  "Montserrat": { file: { 400: "Montserrat-400.ttf", 600: "Montserrat-600.ttf", 800: "Montserrat-800.ttf" }, kind: "display" },
  "Karla": { file: { 400: "Karla-400.ttf", 600: "Karla-600.ttf" }, kind: "sans" },
  "Libre Baskerville": { file: { 400: "LibreBaskerville-400.ttf", 700: "LibreBaskerville-700.ttf" }, kind: "serif" },
  "Playfair Display": { file: { 400: "PlayfairDisplay-400.ttf", 600: "PlayfairDisplay-600.ttf", 700: "PlayfairDisplay-700.ttf" }, kind: "serif" },
  "Bricolage Grotesque": { file: { 400: "BricolageGrotesque-400.ttf", 600: "BricolageGrotesque-600.ttf", 800: "BricolageGrotesque-800.ttf" }, kind: "display" },
  "Instrument Serif": { file: { 400: "InstrumentSerif-400.ttf" }, italic: "InstrumentSerif-400italic.ttf", kind: "serif" },
  "Inter": { file: { 400: "Inter-400.ttf", 500: "Inter-500.ttf", 600: "Inter-600.ttf", 700: "Inter-700.ttf" }, kind: "sans" },
};

/** Correspondance entre les polices Shopify des directions et les familles locales. */
export const SHOPIFY_TO_CANVAS: Record<string, string> = {
  cormorant: "Cormorant",
  jost: "Jost",
  dm_sans: "DM Sans",
  archivo: "Archivo",
  chivo: "Chivo",
  lora: "Lora",
  work_sans: "Work Sans",
  space_grotesk: "Space Grotesk",
  montserrat: "Montserrat",
  karla: "Karla",
  libre_baskerville: "Libre Baskerville",
  playfair_display: "Playfair Display",
};

export function canvasFamily(shopifyHandle: string | undefined, fallback = "Inter"): string {
  if (!shopifyHandle) return fallback;
  const key = shopifyHandle.replace(/_[ni]\d$/, "");
  return SHOPIFY_TO_CANVAS[key] ?? fallback;
}

let registered = false;
/** Alias effectivement enregistrés (un fichier absent ne doit jamais passer inaperçu). */
const available = new Set<string>();
/** Enregistre chaque graisse sous un alias unique : « Famille@600 », « Famille@italic ». */
export function ensureFonts() {
  if (registered) return;
  for (const [family, def] of Object.entries(CANVAS_FONTS)) {
    for (const [w, file] of Object.entries(def.file)) {
      const p = path.join(FONT_DIR, file);
      if (fs.existsSync(p) && GlobalFonts.registerFromPath(p, `${family}@${w}`)) available.add(`${family}@${w}`);
    }
    if (def.italic) {
      const p = path.join(FONT_DIR, def.italic);
      if (fs.existsSync(p) && GlobalFonts.registerFromPath(p, `${family}@italic`)) available.add(`${family}@italic`);
    }
  }
  if (!available.size) console.error(`[polices] aucune police trouvée dans ${FONT_DIR} : les logos et visuels ne peuvent pas être rendus fidèlement.`);
  registered = true;
}

/** Graisses réellement disponibles d'une famille (pour les contrôles et les tests). */
export function availableWeights(family: string): number[] {
  ensureFonts();
  return Object.keys(CANVAS_FONTS[family]?.file ?? {}).map(Number).filter((w) => available.has(`${family}@${w}`));
}

/** Chaîne CSS « font » utilisable par canvas, avec la graisse la plus proche disponible. */
export function font(family: string, weight: number, sizePx: number, italic = false): string {
  ensureFonts();
  const def = CANVAS_FONTS[family] ?? CANVAS_FONTS.Inter;
  const name = CANVAS_FONTS[family] ? family : "Inter";
  if (italic && def.italic && available.has(`${name}@italic`)) return `${sizePx}px "${name}@italic"`;
  // Graisse la plus proche parmi les fichiers réellement chargés.
  const weights = Object.keys(def.file).map(Number).filter((w) => available.has(`${name}@${w}`)).sort((a, b) => Math.abs(a - weight) - Math.abs(b - weight));
  // Aucune graisse chargée : jamais de police système en silence (un logo ou un visuel faux est pire qu'un échec).
  if (!weights.length) throw new Error(`Police « ${name} » introuvable (dossier ${FONT_DIR}) : rendu impossible sans la bonne police.`);
  return `${sizePx}px "${name}@${weights[0]}"`;
}

export function fontFile(family: string, weight = 400, italic = false): string {
  const def = CANVAS_FONTS[family] ?? CANVAS_FONTS.Inter;
  if (italic && def.italic) return path.join(FONT_DIR, def.italic);
  const weights = Object.keys(def.file).map(Number).sort((a, b) => Math.abs(a - weight) - Math.abs(b - weight));
  return path.join(FONT_DIR, def.file[weights[0]]);
}

/**
 * Catalogue des polices réellement disponibles (éditeur visuel des publicités) : graisses chargées et fichiers.
 * Le navigateur charge les MÊMES fichiers sous les MÊMES alias (« Famille@600 ») que le rendu du serveur : l'aperçu
 * de l'éditeur et l'export utilisent exactement les mêmes polices.
 */
export function fontCatalog(): Record<string, { kind: string; weights: { weight: number; alias: string; file: string }[]; italic: { alias: string; file: string } | null }> {
  ensureFonts();
  return Object.fromEntries(
    Object.entries(CANVAS_FONTS).map(([family, def]) => [
      family,
      {
        kind: def.kind,
        weights: Object.entries(def.file)
          .map(([w, file]) => ({ weight: Number(w), alias: `${family}@${w}`, file }))
          .filter((x) => available.has(x.alias)),
        italic: def.italic && available.has(`${family}@italic`) ? { alias: `${family}@italic`, file: def.italic } : null,
      },
    ]),
  );
}

/** Fichier de police servi au navigateur (liste blanche : seulement les fichiers du catalogue). */
export function fontFileByName(name: string): string | null {
  const ok = Object.values(CANVAS_FONTS).some((d) => Object.values(d.file).includes(name) || d.italic === name);
  if (!ok || !/^[A-Za-z0-9-]+\.ttf$/.test(name)) return null;
  const p = path.join(FONT_DIR, name);
  return fs.existsSync(p) ? p : null;
}
