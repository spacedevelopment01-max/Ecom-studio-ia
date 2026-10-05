/**
 * Theme Check (outil officiel de Shopify) sur un thème compilé, à l'exécution.
 * Utilisé par le thème entièrement sur mesure : chaque section écrite par l'IA doit passer sans erreur.
 * Sans l'outil installé sur le serveur, le contrôle est simplement signalé comme indisponible.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { compileTheme } from "./compile";
import type { ThemeSpec } from "./spec";

export type ThemeCheckOffense = { file: string; check: string; message: string; line: number | null };
export type ThemeCheckResult = { available: boolean; errors: ThemeCheckOffense[] };

/** Noms de fichiers d'assets cités dans les réglages (images fournies avec le thème). */
function referencedAssets(spec: ThemeSpec): string[] {
  const out = new Set(Object.keys(spec.files));
  const walk = (v: unknown) => {
    if (typeof v === "string") {
      if (/^es-[\w.-]+\.(jpe?g|png|webp|gif|svg|mp4|webm)$/i.test(v)) out.add(v);
    } else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk([spec.templates, spec.groups, spec.settings]);
  return [...out];
}

export async function themeCheck(spec: ThemeSpec): Promise<ThemeCheckResult> {
  let check: (root: string) => Promise<{ severity: number; check: string; uri: string; message: string; start?: { line: number } }[]>;
  try {
    // Chargement à la demande : l'outil n'est nécessaire que pour le worker.
    const mod = (await import("@shopify/theme-check-node")) as any;
    check = mod.check;
    if (typeof check !== "function") return { available: false, errors: [] };
  } catch {
    return { available: false, errors: [] };
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "es-theme-check-"));
  try {
    for (const [p, c] of compileTheme(spec)) {
      fs.mkdirSync(path.dirname(path.join(dir, p)), { recursive: true });
      fs.writeFileSync(path.join(dir, p), c);
    }
    fs.mkdirSync(path.join(dir, "assets"), { recursive: true });
    for (const f of referencedAssets(spec)) if (!fs.existsSync(path.join(dir, "assets", f))) fs.writeFileSync(path.join(dir, "assets", f), "");
    const offenses = await check(dir);
    return {
      available: true,
      errors: offenses
        .filter((o) => o.severity === 0)
        .map((o) => ({ file: decodeURIComponent(o.uri).match(/((?:sections|snippets|templates|layout|config|locales|assets|blocks)\/[^/]+)$/)?.[1] ?? o.uri, check: o.check, message: o.message, line: o.start ? o.start.line + 1 : null })),
    };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
