/**
 * Vidéos d'exemple montées sur de VRAIS plans Pixabay, avec le moteur vidéo du studio (Video V2), sans IA ni dépense :
 *   PIXABAY_API_KEY=… npx tsx scripts/pixabay-videos.ts <dossier>
 * Deux projets de démonstration (artisan peintre, sérum cosmétique) : chaque moment de la vidéo reçoit son plan
 * Pixabay, cherché pour le métier ou l'univers du produit ; le vrai produit est montré par ses photos ; fin composée.
 * Écrit <dossier>/<projet>.mp4, une image par plan (<projet>-planN.jpg) et <dossier>/sources.txt (plans et auteurs).
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

process.env.DATA_DIR ??= fs.mkdtempSync(path.join(os.tmpdir(), "pixabay-videos-"));
const out = path.resolve(process.argv[2] ?? "pixabay-videos");
fs.mkdirSync(out, { recursive: true });
if (!process.env.PIXABAY_API_KEY) {
  console.error("PIXABAY_API_KEY manquante (variable d'environnement) : aucune recherche possible.");
  process.exit(1);
}

const { createUser } = await import("../src/lib/auth");
const { loadProject } = await import("../src/lib/projects");
const { runWithLang } = await import("../src/lib/i18n-server");
const { assetData, assetMeta, getAsset } = await import("../src/lib/library");
const { runVideoEngineV2 } = await import("../src/lib/video-v2/engine");
const { realVideoDeps } = await import("../src/lib/video-v2/deps");
const { latestVideo } = await import("../src/lib/video-v2/store");
const { seedImageFixture, seedCutout } = await import("../tests/image-v2-fixtures");

const u = await createUser(`pixabay-videos-${Date.now()}@demo.local`, "motdepasse-demo", "Démo");
const sources: string[] = [];
for (const [name, fixture] of [["peintre", "artisan"], ["serum", "cosmetic"]] as const) {
  const pid = seedImageFixture(u.id, fixture);
  if (fixture === "cosmetic") await seedCutout(u.id, pid);
  const p = loadProject(pid);
  const deps = realVideoDeps(null, p, false);
  const r = await runWithLang({ ui: "fr", content: "fr" }, () => runVideoEngineV2(null, pid, { ask: { text: "Reel Instagram de 15 secondes", platform: "reels", aspect: "9:16", durationS: 15, allowGeneration: false } }, deps));
  if (!r.videoAssetId) {
    sources.push(`${name} : aucune vidéo (${r.reason})`);
    continue;
  }
  const file = path.join(out, `${name}.mp4`);
  fs.writeFileSync(file, assetData(getAsset(r.videoAssetId)!));
  const doc = latestVideo(pid, r.docKey!)!.doc;
  let t = 0;
  for (const [k, c] of doc.clips.entries()) {
    const mid = t + c.durationS / 2;
    t += c.durationS;
    execFileSync("ffmpeg", ["-y", "-v", "error", "-ss", String(mid), "-i", file, "-frames:v", "1", "-vf", "scale=360:-2", path.join(out, `${name}-plan${k + 1}.jpg`)]);
    const src = c.source.kind === "video" ? assetMeta<any>(getAsset(c.source.assetId)!) : null;
    sources.push(`${name} plan ${k + 1} (${c.part}, ${c.durationS.toFixed(1)} s) : ${src?.stock ? `${src.stock.page} — ${src.stock.author} (${src.stock.license})` : c.source.kind === "image" ? "photo du projet" : "composition du studio"}`);
  }
  console.log(`${name} : ${file}`);
}
fs.writeFileSync(path.join(out, "sources.txt"), sources.join("\n") + "\n");
console.log(sources.join("\n"));
