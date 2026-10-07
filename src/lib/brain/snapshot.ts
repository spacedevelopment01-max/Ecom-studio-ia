/**
 * Project Brain — instantané en lecture seule de ce que le studio sait d'un projet (phase 2.0).
 *
 * C'est une vue au-dessus des données existantes, pas une seconde base :
 *  - projects (produit, services, marque, stratégie)  → source de vérité des faits, de l'offre et de l'identité ;
 *  - memory (hors « artifact »)                        → décisions, corrections, préférences, objectifs, refus du client ;
 *  - quality_checks (90 derniers jours)                → source de vérité des notes ; seuls des constats en sont tirés ;
 *  - assets (non supprimés, les plus récents)          → logo actuel (pointeur de la marque) et créations récentes.
 * Quatre requêtes SQL au plus, aucune IA, aucune écriture. Jamais de réglage, de clé ni de connexion lus ici.
 */
import { all, json } from "../db";
import { loadProject, type Project } from "../projects";
import { resolveTrade, tradeText, type TradeProfile } from "./trade";

export const QUALITY_WINDOW_MS = 90 * 86400_000;

export type MemoryRow = { kind: string; key: string; value: string; status: string; source: string; scope: string; origin: string | null; evidence_json: string | null };
export type QualityRow = { deliverable: string; verdict: string; fatal: number; checked: number; checker: string; blocking_json: string; fatal_json: string };
export type AssetRow = { id: string; name: string; role: string | null; kind: string; status: string; origin: string; gate_verdict: string | null; route_key: string | null; route_label: string | null };

export type LogoState = "provided" | "validated" | "FINAL" | "PROVISIONAL" | "proposed";
export type CurrentLogo = {
  assetId: string | null;
  state: LogoState;
  /** brand = pointeur de la marque (source de vérité) ; legacy = dernier logo généré (repli, ancien projet sans pointeur). */
  source: "brand" | "legacy_latest";
  name: string | null;
  concept: string | null;
};

/** Constat automatique tiré de quality_checks : un signal sur le moteur, jamais une préférence du client. */
export type AiPattern = { code: string; deliverable: string; count: number; fatal: boolean };

export type BrainSnapshot = {
  projectId: string;
  project: Project;
  trade: TradeProfile;
  memory: MemoryRow[];
  aiPatterns: AiPattern[];
  /** Contrôles ignorés car techniques (contrôle en panne, aucun contrôleur) : jamais transformés en préférence. */
  technicalFailures: number;
  currentLogo: CurrentLogo | null;
  recentAssets: AssetRow[];
  counts: { memory: number; qualityChecks: number; assets: number };
};

const LIMIT_ASSETS = 80;

export function brainSnapshot(projectOrId: string | Project): BrainSnapshot {
  const project = typeof projectOrId === "string" ? loadProject(projectOrId) : projectOrId;
  const pid = project.id;
  const memory = all<MemoryRow>("SELECT kind, key, value, status, source, scope, origin, evidence_json FROM memory WHERE project_id = ? AND kind != 'artifact' AND state = 'active' ORDER BY created_at, id", pid);
  const checks = all<QualityRow>(
    "SELECT deliverable, verdict, fatal, checked, checker, blocking_json, fatal_json FROM quality_checks WHERE project_id = ? AND created_at >= ? ORDER BY created_at DESC LIMIT 500",
    pid,
    Date.now() - QUALITY_WINDOW_MS,
  );
  const assets = all<AssetRow & { created_at: number }>(
    `SELECT id, name, role, kind, status, origin, created_at,
            json_extract(meta, '$.gate.verdict') AS gate_verdict, json_extract(meta, '$.key') AS route_key, json_extract(meta, '$.label') AS route_label
       FROM assets WHERE project_id = ? AND deleted_at IS NULL ORDER BY created_at DESC, id LIMIT ?`,
    pid,
    LIMIT_ASSETS,
  );

  // Constats récurrents du contrôle qualité : seulement des contrôles réellement faits (IA ou humain).
  const byCode = new Map<string, AiPattern>();
  let technicalFailures = 0;
  for (const q of checks) {
    if (!q.checked || q.checker === "none") {
      technicalFailures++;
      continue;
    }
    if (q.checker !== "ai" && q.checker !== "human") continue;
    if (!q.fatal && q.verdict !== "REJECTED" && q.verdict !== "RETRY") continue;
    const fatal = json<string[]>(q.fatal_json, []);
    const codes = [...fatal, ...json<string[]>(q.blocking_json, [])];
    for (const code of new Set(codes)) {
      const k = `${q.deliverable}|${code}`;
      const cur = byCode.get(k) ?? { code, deliverable: q.deliverable, count: 0, fatal: false };
      cur.count++;
      cur.fatal ||= fatal.includes(code);
      byCode.set(k, cur);
    }
  }

  return {
    projectId: pid,
    project,
    trade: resolveTrade(tradeText(project), project.product.sector ?? null),
    memory,
    aiPatterns: [...byCode.values()].sort((a, b) => b.count - a.count || a.code.localeCompare(b.code)),
    technicalFailures,
    currentLogo: currentLogoOf(project, assets),
    recentAssets: assets.filter((a) => a.origin !== "upload").slice(0, 12),
    counts: { memory: memory.length, qualityChecks: checks.length, assets: assets.length },
  };
}

/**
 * Logo actuel : le pointeur de la marque (brand.logo.assetId) fait foi. Le dernier logo généré n'est qu'un repli pour
 * un ancien projet sans pointeur — jamais un choix silencieux quand la marque en désigne un.
 */
export function currentLogoOf(p: Project, assets: AssetRow[]): CurrentLogo | null {
  const logo = p.brand?.logo;
  const validated = (p.brand?.validated ?? []).includes("logo");
  if (logo?.assetId) {
    const proposal = logo.proposalId ? assets.find((a) => a.id === logo.proposalId) : undefined;
    const state: LogoState =
      logo.status === "provided" ? "provided" : logo.status === "validated" || validated ? "validated" : logo.provisional ? "PROVISIONAL" : proposal?.gate_verdict === "FINAL" ? "FINAL" : proposal?.gate_verdict ? "PROVISIONAL" : "proposed";
    return { assetId: logo.assetId, state, source: "brand", name: logo.route?.name ?? proposal?.route_label ?? null, concept: logo.concept || null };
  }
  const latest = assets.find((a) => a.role === "logo");
  return latest ? { assetId: latest.id, state: "proposed", source: "legacy_latest", name: null, concept: null } : null;
}
