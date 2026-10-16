/**
 * Démonstration du moteur RÉEL de publicités vidéo (vidéo en scènes, guide créatif) : mêmes fonctions que le studio
 * (`runThreeScenes` + `realThreeScenesDeps`), sans IA de texte (plan du studio).
 *
 *   service (gratuit : plans Pixabay + voix locale Kokoro) :
 *     KOKORO_DIR=…/kokoro-multi-lang-v1_0 NODE_USE_ENV_PROXY=1 npx tsx scripts/demo-pub-video.ts service <dossier-sortie>
 *   produit (PAYANT : une image Qwen + un plan Wan par scène, accord du propriétaire obligatoire) :
 *     … npx tsx scripts/demo-pub-video.ts product <dossier-sortie> --project=<id> --confirm
 *
 * Démo service : vraies personnes au travail autorisées dans les plans libres (réglage `peopleAllowed`, comme un artisan
 * qui l'accepte) ; sans ce réglage, la règle de présence humaine écarte tout plan qui montre une personne.
 * Sorties : <dossier>/pub-<cas>.mp4, storyboard.json (fiche créative, storyboard, contrôle du fichier final, notes).
 */
import fs from "node:fs";
import path from "node:path";
import { all, id, now, one, run } from "../src/lib/db";
import { localBrand } from "../src/lib/engine/local";
import { emptyProduct } from "../src/lib/project-types";
import { loadProject } from "../src/lib/projects";
import { getAsset, assetData, assetMeta } from "../src/lib/library";
import { runWithLang } from "../src/lib/i18n-server";
import { realThreeScenesDeps, runThreeScenes } from "../src/lib/video-v2/three-scenes";

const [kind, outDir] = process.argv.slice(2);
const arg = (k: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=")[1];
if (!kind || !outDir) throw new Error("usage : demo-pub-video.ts service|product <dossier> [--project=<id> --confirm]");
fs.mkdirSync(outDir, { recursive: true });

/** Artisan plâtrier peintre de démonstration (entreprise fictive, coordonnées « à compléter »). */
function painterProject(userId: string): string {
  // --fresh : nouveau projet (un plan déjà utilisé dans un projet n'y est jamais repris).
  const existing = process.argv.includes("--fresh") ? null : one<{ id: string }>("SELECT id FROM projects WHERE name = 'DEMO Atelier Murs & Couleurs' AND user_id = ? ORDER BY created_at DESC LIMIT 1", userId);
  if (existing) return existing.id;
  const product = { ...emptyProduct(), name: "Atelier Murs & Couleurs", nameStatus: "provided" as const, category: "Plâtrier peintre", sector: null, summary: "Plâtrerie et peinture intérieure : préparation des murs, enduits, peinture des pièces, finitions soignées.", analyzedBy: "local" as const };
  const services = { services: [{ name: "Peinture intérieure", description: "Préparation, protection et mise en peinture des pièces." }, { name: "Plâtrerie et enduits", description: "Rebouchage, enduits et ponçage avant peinture." }], area: "[À compléter : zone d'intervention]", contactMode: "quote" };
  const { brand, strategy } = localBrand(product, "Murs & Couleurs", { business: "services", services } as never);
  const pid = id();
  run(
    "INSERT INTO projects (id, user_id, name, status, platform, product_json, brand_json, strategy_json, settings_json, sources_json, business_type, business_json, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
    pid, userId, "DEMO Atelier Murs & Couleurs", "ready", "wordpress", JSON.stringify(product), JSON.stringify(brand), JSON.stringify(strategy), JSON.stringify({ language: "fr", peopleAllowed: true }), "[]", "services", JSON.stringify(services), now(), now(),
  );
  return pid;
}

await runWithLang({ ui: "fr", content: "fr" }, async () => {
  const owner = all<{ user_id: string }>("SELECT user_id FROM projects WHERE id = ?", arg("project") ?? "rmaxpkesycrs866k")[0]?.user_id;
  if (!owner) throw new Error("compte de démonstration introuvable");
  let pid: string;
  if (kind === "service") pid = painterProject(owner);
  else {
    if (!process.argv.includes("--confirm")) throw new Error("Produit : appel PAYANT (Qwen + Wan). Relancer avec --confirm après accord écrit du propriétaire.");
    pid = arg("project")!;
  }
  const p = loadProject(pid);
  const t0 = Date.now();
  const r = await runThreeScenes(null, pid, { as: "ad", scenes: kind === "service" ? 5 : 4, totalS: kind === "service" ? 20 : 18, aspect: "9:16", key: `demo-pub:${kind}:${pid}:${Date.now()}` }, realThreeScenesDeps(null, { userId: p.userId, projectId: pid }, { aiText: false }));
  const video = r.videoAssetId ? getAsset(r.videoAssetId) : null;
  if (video) fs.writeFileSync(path.join(outDir, `pub-${kind}.mp4`), assetData(video));
  const meta = video ? assetMeta<Record<string, unknown>>(video) : {};
  fs.writeFileSync(path.join(outDir, "storyboard.json"), JSON.stringify({ project: pid, seconds: Math.round((Date.now() - t0) / 1000), costMicro: r.costMicro, brief: r.brief, storyboard: r.storyboard, notes: r.notes, finalCheck: meta.finalCheck ?? null }, null, 2));
  console.log(JSON.stringify({ project: pid, video: !!video, costMicro: r.costMicro, notes: r.notes, check: (meta.finalCheck as { summary?: unknown } | null)?.summary ?? null }, null, 2));
});
