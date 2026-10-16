/**
 * MÉMOIRE CRÉATIVE propre à chaque projet (guide créatif, règle 13), persistante (table `memory`, portée « video »),
 * relue à chaque publicité vidéo et modifiable par le client (API `/api/projects/[id]/videos/creative-memory`).
 *
 * Elle garde : marque et logo autorisés, références produit et reconstructions, palette et typographies, préférences
 * (style, animation), médias utilisés et leur provenance, choix validés, corrections demandées, concepts déjà faits.
 */
import { all, id, now, run } from "../db";
import type { Project } from "../projects";
import type { PaletteFamily } from "./creative-guide";

export type CreativeMemory = {
  allowedBrand: { name: string; logoAssetId: string | null } | null;
  productReferences: { assetId: string; reconstructed: boolean }[];
  palette: Record<string, string> | null;
  fonts: { heading: string; body: string } | null;
  preferences: { family?: PaletteFamily; animation?: string; voice?: "on" | "off"; music?: "on" | "off" };
  media: { assetId: string; source: string; ref: string; license: string; role: string }[];
  validated: string[];
  corrections: string[];
  directionsUsed: string[];
};

type Row = { key: string; value: string; status: string };
const KEYS = { pref: "video.pref.", media: "video.media.", validated: "video.validated.", correction: "video.correction.", direction: "video.direction." } as const;

/** Relit la mémoire créative du projet (vide pour un nouveau projet). */
export function loadCreativeMemory(projectId: string, p?: Project | null): CreativeMemory {
  const rows = all<Row>("SELECT key, value, status FROM memory WHERE project_id = ? AND scope = 'video' AND status != 'rejected' ORDER BY created_at", projectId);
  const by = (prefix: string) => rows.filter((r) => r.key.startsWith(prefix));
  const preferences: CreativeMemory["preferences"] = {};
  for (const r of by(KEYS.pref)) (preferences as Record<string, string>)[r.key.slice(KEYS.pref.length)] = r.value;
  const media = by(KEYS.media).flatMap((r) => {
    try {
      return [JSON.parse(r.value)];
    } catch {
      return [];
    }
  });
  const refs = productReferences(projectId);
  return {
    allowedBrand: p?.brand ? { name: p.brand.name, logoAssetId: p.brand.logo?.assetId ?? null } : null,
    productReferences: refs,
    palette: p?.brand?.palette ? { ...p.brand.palette } : null,
    fonts: p?.brand?.fonts ? { heading: p.brand.fonts.heading, body: p.brand.fonts.body } : null,
    preferences,
    media,
    validated: by(KEYS.validated).map((r) => r.value),
    corrections: by(KEYS.correction).map((r) => r.value),
    directionsUsed: by(KEYS.direction).map((r) => r.value),
  };
}

/** Références produit stables : reconstructions validées d'abord, puis détourages valides, puis photos du client. */
export function productReferences(projectId: string): { assetId: string; reconstructed: boolean }[] {
  const rows = all<{ id: string; role: string; meta: string | null; origin: string; status: string }>(
    "SELECT id, role, meta, origin, status FROM assets WHERE project_id = ? AND deleted_at IS NULL AND role IN ('original','cutout') AND status != 'rejected' ORDER BY created_at DESC",
    projectId,
  );
  const meta = (m: string | null) => {
    try {
      return m ? JSON.parse(m) : {};
    } catch {
      return {};
    }
  };
  const rebuilt = rows.filter((r) => r.role === "original" && meta(r.meta).reconstructed && r.status === "ready").map((r) => ({ assetId: r.id, reconstructed: true }));
  const cut = rows.filter((r) => r.role === "cutout" && r.status !== "review").map((r) => ({ assetId: r.id, reconstructed: !!meta(r.meta).fromReconstruction }));
  const own = rows.filter((r) => r.role === "original" && r.origin === "upload").map((r) => ({ assetId: r.id, reconstructed: false }));
  return [...rebuilt, ...cut, ...own];
}

function put(projectId: string, key: string, value: string, source: "user" | "engine", replace: boolean) {
  if (replace) run("UPDATE memory SET status = 'rejected', updated_at = ? WHERE project_id = ? AND scope = 'video' AND key = ? AND status != 'rejected'", now(), projectId, key);
  run("INSERT INTO memory (id, project_id, kind, key, value, status, source, scope, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)", id(), projectId, "decision", key, value, "confirmed", source === "engine" ? "ai" : "user", "video", now(), now());
}

export const rememberPreference = (projectId: string, name: keyof CreativeMemory["preferences"], value: string) => put(projectId, `${KEYS.pref}${name}`, value, "user", true);
export const rememberCorrection = (projectId: string, text: string) => put(projectId, `${KEYS.correction}${Date.now()}`, text.slice(0, 300), "user", false);
export const rememberValidated = (projectId: string, what: string) => put(projectId, `${KEYS.validated}${Date.now()}`, what.slice(0, 200), "user", false);
export const rememberDirection = (projectId: string, concept: string) => put(projectId, `${KEYS.direction}${Date.now()}`, concept.slice(0, 200), "engine", false);
/** Média utilisé et sa provenance (banque, identifiant, page, licence) : jamais perdu. */
export const rememberMedia = (projectId: string, m: CreativeMemory["media"][number]) => put(projectId, `${KEYS.media}${m.assetId}`, JSON.stringify(m), "engine", true);
