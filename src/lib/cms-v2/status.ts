/**
 * État de l'export d'un projet vers une plateforme (onglet Boutique › Exporter) : capacités réelles (registre), limites,
 * informations manquantes (« [À compléter : …] » restant dans la boutique), exports déjà générés avec leur verdict.
 * Lecture seule ; aucun appel d'IA.
 */
import { all } from "../db";
import type { ThemeSpec } from "../theme/spec";
import { CAPABILITIES, type CapabilityKey } from "./capabilities";
import type { CmsPlatform } from "./types";

export type ExportRecord = { id: string; name: string; createdAt: number; themeVersion: number | null; verdict: string | null; scope: string | null; message: string | null; issues: string[] };

/** Informations encore à compléter dans la boutique (jamais inventées par le studio). */
export function missingInfo(spec: ThemeSpec): string[] {
  const found = new Set<string>();
  for (const m of JSON.stringify(spec).matchAll(/\[(?:À compléter|To complete)[^\]]{0,120}\]/g)) found.add(m[0].replace(/\\"/g, '"'));
  return [...found].slice(0, 30);
}

export function exportsOf(projectId: string, platform: CmsPlatform): ExportRecord[] {
  return all<{ id: string; name: string; created_at: number; meta: string }>("SELECT id, name, created_at, meta FROM assets WHERE project_id = ? AND role = 'theme-export' AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 60", projectId)
    .map((a) => ({ a, m: JSON.parse(a.meta || "{}") as Record<string, any> }))
    .filter(({ m }) => m.platform === platform)
    .slice(0, 10)
    .map(({ a, m }) => ({ id: a.id, name: a.name, createdAt: a.created_at, themeVersion: m.themeVersion ?? null, verdict: m.gate?.verdict ?? null, scope: m.scope ?? null, message: m.message ?? null, issues: (m.issues ?? []).slice(0, 5) }));
}

export function exportStatus(projectId: string, spec: ThemeSpec, platform: CmsPlatform, lang: "fr" | "en") {
  const e = CAPABILITIES[platform];
  const pick = (x: { fr: string; en: string }) => x[lang];
  const order: CapabilityKey[] = ["theme_generation", "native_export", "installation", "native_editing", "products", "cart", "checkout", "forms", "animations", "seo", "multilingual", "direct_push"];
  const services = spec.store.business === "services";
  return {
    platform,
    label: e.label,
    delivery: e.delivery,
    target: pick(e.target),
    capabilities: order
      .filter((k) => !(services && ["products", "cart", "checkout"].includes(k)))
      .map((k) => ({ key: k, status: e.capabilities[k].status, verified: e.capabilities[k].verified, note: pick(e.capabilities[k].note) })),
    limits: e.limits.map(pick),
    missing: missingInfo(spec),
    exports: exportsOf(projectId, platform),
  };
}
