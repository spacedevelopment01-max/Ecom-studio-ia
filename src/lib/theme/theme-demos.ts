/**
 * Démos intégrales des thèmes (demande de Thomas, revue de la PR #149) : avant de choisir un thème, le client ouvre la
 * boutique de démonstration COMPLÈTE de ce thème — toutes ses pages, ses menus, son panier simulé — avec nos contenus de
 * démonstration (FRAISE, ONDE, ORBE, Atelier Rive, SILLON), jamais ceux de son projet.
 *
 * Ces boutiques sont les exports statiques de scripts/reference-static-preview.ts (pages HTML plates, liens relatifs,
 * paiement désactivé). Elles sont rangées hors du dépôt (`<DATA_DIR>/theme-demos`, ou THEME_DEMOS_DIR) parce que leurs
 * visuels viennent en partie du kit privé de Thomas. Préparation : une fois par serveur, puis à chaque nouvelle version du
 * code, dans un processus séparé qui travaille sur SA PROPRE base temporaire (scripts/prepare-theme-demos.ts) : aucune base
 * de projet n'est lue ni modifiée, aucun appel IA, aucune dépense. Pendant la préparation, l'ancienne démo reste servie.
 */
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { DATA_DIR } from "../db";
import { REFERENCE_THEMES } from "./theme-fit";

export const themeDemosDir = () => process.env.THEME_DEMOS_DIR || path.join(DATA_DIR, "theme-demos");

/** Chaque thème du catalogue actif est montré avec sa propre démonstration (même identifiant). */
export const DEMO_THEMES = REFERENCE_THEMES as readonly string[];
export const isDemoTheme = (id: string) => DEMO_THEMES.includes(id);

export type ThemeDemoPage = { file: string; label: string };
/**
 * `missing` : visuels de la démo absents du serveur au moment de la préparation (kit privé non copié dans
 * public/demo/<id>/, diagnostic du 22 octobre). Une telle démo n'est jamais servie comme prête : elle s'afficherait sans
 * aucune image.
 */
export type ThemeDemoStatus = { id: string; ready: boolean; preparing: boolean; stale: boolean; title?: string; services?: boolean; version?: string; date?: string; pages: ThemeDemoPage[]; missing?: string[] };

/** Dossier du kit privé d'une démo (FRAISE, ONDE, ORBE, MAISON & HORIZON) ; les autres thèmes ont leurs médias suivis dans le
 * dépôt (Atelier Rive depuis le dossier du 23 octobre : public/theme-assets/rive/). MAISON & HORIZON (issue #172) : les 90
 * images ne sont pas publiées sur GitHub (consigne du dossier), elles restent dans public/demo/maison-horizon/. */
export const KIT_THEMES = ["fraise", "onde", "orbe", "maison-horizon"] as const;
export const kitDir = (id: string, root = process.cwd()) => path.join(root, "public", "demo", id);

const LOCK = () => path.join(themeDemosDir(), ".preparation.json");
const LOCK_TTL = 45 * 60_000;

/** Version du code servi (commit git lu sans lancer git ; à défaut THEME_DEMOS_VERSION, ou rien : jamais « périmée »). */
export function codeVersion(root = process.cwd()): string | null {
  if (process.env.THEME_DEMOS_VERSION) return process.env.THEME_DEMOS_VERSION;
  try {
    const git = path.join(root, ".git");
    const head = fs.readFileSync(path.join(git, "HEAD"), "utf8").trim();
    if (!head.startsWith("ref: ")) return head;
    const ref = head.slice(5);
    const loose = path.join(git, ref);
    if (fs.existsSync(loose)) return fs.readFileSync(loose, "utf8").trim();
    const packed = fs.readFileSync(path.join(git, "packed-refs"), "utf8").split("\n").find((l) => l.endsWith(` ${ref}`));
    return packed?.split(" ")[0] ?? null;
  } catch {
    return null;
  }
}

/** Une préparation est-elle en cours (verrou récent d'un processus vivant) ? */
export function preparing(): boolean {
  try {
    const lock = JSON.parse(fs.readFileSync(LOCK(), "utf8")) as { pid: number; started: number };
    if (Date.now() - lock.started > LOCK_TTL) return false;
    process.kill(lock.pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function themeDemoStatus(id: string, version = codeVersion()): ThemeDemoStatus {
  const dir = path.join(themeDemosDir(), id);
  const busy = preparing();
  const base: ThemeDemoStatus = { id, ready: false, preparing: busy, stale: false, pages: [] };
  if (!isDemoTheme(id) || !fs.existsSync(path.join(dir, "accueil.html"))) return base;
  let plan: { title?: string; services?: boolean; pages?: ThemeDemoPage[]; missing?: string[] } = {};
  let meta: { version?: string; date?: string } = {};
  try { plan = JSON.parse(fs.readFileSync(path.join(dir, "pages.json"), "utf8")); } catch { /* démo sans plan : accueil seul */ }
  try { meta = JSON.parse(fs.readFileSync(path.join(dir, "demo.json"), "utf8")); } catch { /* préparée à la main */ }
  const pages = (plan.pages ?? [{ file: "accueil.html", label: "Accueil" }]).filter((p) => /^[a-z0-9-]+\.html$/.test(p.file) && fs.existsSync(path.join(dir, p.file)));
  const missing = (plan.missing ?? []).filter((m) => typeof m === "string");
  return { ...base, ready: missing.length === 0, stale: !!version && !!meta.version && meta.version !== version, title: plan.title, services: plan.services, version: meta.version, date: meta.date, pages, ...(missing.length ? { missing } : {}) };
}

export function themeDemoStatuses(): ThemeDemoStatus[] {
  const version = codeVersion();
  return DEMO_THEMES.map((id) => themeDemoStatus(id, version));
}

const TYPES: Record<string, string> = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".webp": "image/webp", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".gif": "image/gif", ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf", ".otf": "font/otf", ".webm": "video/webm", ".mp4": "video/mp4" };

/** Fichier d'une démo (chemin relatif à la démo, jamais au-dessus) ; null s'il n'existe pas ou sort du dossier. */
export function themeDemoFile(id: string, rel: string): { body: Buffer; type: string } | null {
  if (!isDemoTheme(id)) return null;
  const clean = (rel || "accueil.html").replace(/^\/+/, "");
  if (clean.split("/").some((part) => part === ".." || part === "." || part === "" || part.startsWith("."))) return null;
  const root = path.resolve(themeDemosDir(), id);
  const file = path.resolve(root, clean);
  if (!file.startsWith(root + path.sep)) return null;
  const type = TYPES[path.extname(file).toLowerCase()];
  if (!type) return null;
  try {
    if (!fs.statSync(file).isFile()) return null;
    return { body: fs.readFileSync(file), type };
  } catch {
    return null;
  }
}

/** Démo incomplète : le kit a-t-il été copié (ou complété) depuis sa préparation ? Sinon, inutile de la refaire en boucle. */
function kitChanged(s: ThemeDemoStatus): boolean {
  try {
    const prepared = s.date ? Date.parse(s.date) : 0;
    return fs.statSync(kitDir(s.id)).mtimeMs > prepared;
  } catch {
    return false;
  }
}

/**
 * Lance la préparation des démos absentes ou périmées dans un processus détaché (un seul à la fois). Rend vrai si une
 * préparation tourne (déjà lancée ou lancée ici). Jamais pendant les tests.
 */
export function prepareThemeDemos(statuses = themeDemoStatuses()): boolean {
  if (preparing()) return true;
  const todo = statuses.filter((s) => s.stale || (!s.ready && (!s.missing || kitChanged(s)))).map((s) => s.id);
  if (!todo.length || process.env.VITEST || process.env.THEME_DEMOS_AUTO === "0") return false;
  try {
    fs.mkdirSync(themeDemosDir(), { recursive: true });
    // Chemin construit à l'exécution (jamais résolu à la compilation : le serveur n'embarque pas tsx).
    const tsx = path.join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs");
    if (!fs.existsSync(tsx)) throw new Error("tsx absent");
    // Base temporaire propre au processus : DATA_DIR / DATABASE_FILE du studio ne lui sont jamais transmis.
    const { DATA_DIR: _d, DATABASE_FILE: _f, ...env } = process.env;
    const log = fs.openSync(path.join(themeDemosDir(), "preparation.log"), "a");
    const child = spawn(process.execPath, [tsx, path.join(process.cwd(), "scripts", "prepare-theme-demos.ts"), ...todo], { cwd: process.cwd(), detached: true, stdio: ["ignore", log, log], env: { ...env, THEME_DEMOS_DIR: themeDemosDir(), THEME_DEMOS_VERSION: codeVersion() ?? "" } });
    fs.writeFileSync(LOCK(), JSON.stringify({ pid: child.pid, started: Date.now(), themes: todo }));
    child.unref();
    return true;
  } catch (e) {
    console.warn("[theme-demos] préparation impossible :", (e as Error).message);
    return false;
  }
}
