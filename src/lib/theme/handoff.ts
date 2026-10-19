/**
 * Raccordement au contrat du parcours amont (Codex, PR #138, artefact `project.ready_for_theme`) pour le placement
 * automatique des textes et des médias (mission du 19 octobre, issue #137, §3).
 *
 * Le contrat prépare, pour un projet de produits, 10 images IA (4 carrées, 4 paysage, 2 stories) et 1 vidéo d'ouverture ;
 * pour un projet de services, 10 photos et 2 vidéos. Chaque média y est décrit par un emplacement (`key`, `pageKey`,
 * `sectionKey`, `purpose`, `aspect`, `kind`) et l'identifiant de l'asset. Ce module LIT ces emplacements et les
 * affecte explicitement aux emplacements d'images du thème (ImageSlots) : rien n'est inventé ni comblé artificiellement ;
 * un média sans emplacement de thème est listé « non placé », un emplacement de thème sans média reste vide (le thème
 * masque alors la section). Les médias du site restent distincts des 20 créations sociales (chantier Publications).
 * Les textes : la rédaction du contrat (`copy`) est reprise telle quelle quand le contrat la dit prête (`copyReadiness.mapped`).
 */
import type { ShopCopy } from "./copy";
import type { ImageSlots } from "./directions";
import { readyContractOf } from "./theme-recommendation";

type Slot = { key: string; pageKey?: string; sectionKey?: string; purpose?: string; kind?: "image" | "video"; aspect?: "1:1" | "16:9" | "9:16"; assetId?: string; webAssetId?: string; posterId?: string; alt?: string; caption?: string };
type Contract = { revision?: number; provenance?: string; media?: Slot[]; copy?: ShopCopy; copyReadiness?: { status?: "review_required" | "mapped" } };

export type HandoffReport = {
  revision: number | null;
  provenance: string | null;
  /** Emplacement du thème ← emplacement du contrat (clé) et asset. */
  placed: { slot: string; key: string; assetId: string; purpose: string }[];
  /** Médias du contrat sans emplacement de thème disponible (jamais placés au hasard). */
  unplaced: { key: string; purpose: string; aspect: string; kind: string }[];
  /** Emplacements du thème restés vides faute de média affecté. */
  empty: string[];
  copy: "contract" | "project";
};

/** Mots qui décrivent l'emplacement (clé sans sa page, section, usage) ; la page seule ne décide jamais (« home » ≠ ouverture). */
const text = (s: Slot) => `${s.key.split(".").slice(1).join(" ")} ${s.sectionKey ?? ""} ${s.purpose ?? ""}`.toLowerCase();
const is = (s: Slot, re: RegExp) => re.test(text(s));

/** Ordre d'affectation : chaque média du contrat va au premier emplacement du thème compatible encore libre. */
function targetsFor(s: Slot): (keyof ImageSlots)[] {
  if (s.kind === "video") return s.aspect === "9:16" ? [] : ["video"];
  if (s.aspect === "9:16") return ["scene3", "lifestyle2"];
  if (s.aspect === "1:1") return is(s, /packshot|fond|pack|product|produit|hero|ouverture|opening/) ? ["packshot", "detail1", "detail2"] : ["detail1", "detail2", "packshot"];
  // Paysage : ouverture, bannière, scènes.
  if (is(s, /hero|ouverture|opening|accueil|home|cover/)) return ["lifestyle", "hero", "banner", "scene1", "scene2", "scene3"];
  if (is(s, /bann|banner|cta|final/)) return ["banner", "scene3", "scene2", "hero"];
  return ["scene1", "scene2", "scene3", "banner", "lifestyle2"];
}

/**
 * Place les médias du contrat dans les emplacements du thème. `resolve` fournit le nom de fichier du thème pour un asset
 * du projet (null si l'asset n'existe pas ou n'appartient pas au projet). Les emplacements déjà remplis par le projet
 * sont remplacés par l'affectation explicite du contrat (c'est le contrat qui décide), les autres restent inchangés.
 */
export function applyHandoff(projectId: string, slots: ImageSlots, files: Record<string, string>, resolve: (assetId: string, hint: string) => { filename: string } | null): HandoffReport | null {
  const c = readyContractOf(projectId) as Contract | null;
  if (!c?.media?.length) return null;
  const report: HandoffReport = { revision: c.revision ?? null, provenance: c.provenance ?? null, placed: [], unplaced: [], empty: [], copy: c.copyReadiness?.status === "mapped" && c.copy ? "contract" : "project" };
  const taken = new Set<keyof ImageSlots>();
  const reels: { video: string; poster?: string }[] = [];
  for (const s of c.media) {
    const assetId = s.webAssetId ?? s.assetId;
    if (!assetId) continue;
    if (s.kind === "video" && s.aspect === "9:16") {
      const f = resolve(assetId, `story-${reels.length + 1}`);
      if (!f) { report.unplaced.push({ key: s.key, purpose: s.purpose ?? "", aspect: s.aspect ?? "", kind: s.kind ?? "" }); continue; }
      files[f.filename] = assetId;
      const poster = s.posterId ? resolve(s.posterId, `story-affiche-${reels.length + 1}`) : null;
      if (poster) files[poster.filename] = s.posterId!;
      reels.push({ video: f.filename, poster: poster?.filename });
      report.placed.push({ slot: `reels[${reels.length - 1}]`, key: s.key, assetId, purpose: s.purpose ?? "" });
      continue;
    }
    const target = targetsFor(s).find((t) => !taken.has(t));
    if (!target) { report.unplaced.push({ key: s.key, purpose: s.purpose ?? "", aspect: s.aspect ?? "", kind: s.kind ?? "" }); continue; }
    const f = resolve(assetId, String(target));
    if (!f) { report.unplaced.push({ key: s.key, purpose: s.purpose ?? "", aspect: s.aspect ?? "", kind: s.kind ?? "" }); continue; }
    files[f.filename] = assetId;
    (slots as Record<string, unknown>)[target] = f.filename;
    taken.add(target);
    if (target === "video" && s.posterId) {
      const poster = resolve(s.posterId, "video-affiche");
      if (poster) { files[poster.filename] = s.posterId; slots.videoPoster = poster.filename; taken.add("videoPoster"); }
    }
    report.placed.push({ slot: String(target), key: s.key, assetId, purpose: s.purpose ?? "" });
  }
  if (reels.length) slots.reels = reels;
  for (const k of ["lifestyle", "hero", "packshot", "detail1", "detail2", "scene1", "scene2", "scene3", "banner", "video"] as (keyof ImageSlots)[]) if (!slots[k]) report.empty.push(String(k));
  return report;
}

/** Rédaction du contrat amont quand elle est prête (`copyReadiness.status === "mapped"`), sinon null. */
export function handoffCopy(projectId: string): ShopCopy | null {
  const c = readyContractOf(projectId) as Contract | null;
  return c?.copy && c.copyReadiness?.status === "mapped" ? c.copy : null;
}
