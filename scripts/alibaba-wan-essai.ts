/**
 * ESSAI RÉEL (payant, accord du propriétaire) — clips vidéo Wan d'Alibaba Cloud (image → vidéo), même requête que le
 * studio (alibaba.ts : wanVideoBody, wanTask), en 1080P ou 720P. Ne s'exécute qu'avec --confirm, sous un plafond
 * (--max-usd) calculé au tarif de la liste officielle ; UN SEUL envoi par clip, aucune nouvelle tentative.
 *   NODE_USE_ENV_PROXY=1 npx tsx scripts/alibaba-wan-essai.ts --confirm --spec=<fichier.json> --out=<dossier> --max-usd=3.2
 * Spécification : { model, resolution: "1080P"|"720P", usdPerSecond, parameters? (ex. { audio: false }), items: [{ id, image, seconds, prompt }] }.
 * usdPerSecond = tarif le PLUS CHER possible pour le modèle (le plafond reste sûr même si une option est ignorée).
 * L'identifiant de chaque tâche est gardé dès sa création (<out>/<id>.task.json) : relancer avec --resume récupère
 * les vidéos déjà payées sans en commander de nouvelles. Clé : injectée par la passerelle réseau, jamais affichée.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { alibabaBase, alibabaError, alibabaHeaders, wanTask, wanVideoBody } from "@/lib/ai/alibaba";
import { GATEWAY_KEY } from "@/lib/ai/gateway";

const args = process.argv.slice(2);
const arg = (k: string) => args.find((a) => a.startsWith(`--${k}=`))?.split("=").slice(1).join("=");
const spec = JSON.parse(fs.readFileSync(arg("spec")!, "utf8")) as { model: string; resolution: "1080P" | "720P"; usdPerSecond: number; parameters?: Record<string, unknown>; items: { id: string; image: string; seconds: number; prompt: string }[] };
const OUT = path.resolve(arg("out") ?? "ARVEN_PUBLICITE_VIDEO/clips");
const resume = args.includes("--resume");
if (!resume && !args.includes("--confirm")) {
  console.error("Appel PAYANT : relancez avec --confirm après accord explicite (ou --resume pour récupérer des tâches déjà payées).");
  process.exit(1);
}
const bound = +spec.items.reduce((s, i) => s + i.seconds * spec.usdPerSecond, 0).toFixed(3);
const maxUsd = Number(arg("max-usd") ?? "0");
if (!resume && bound > maxUsd) {
  console.error(`Coût (${bound} $) supérieur au plafond (${maxUsd} $) : rien n'est envoyé.`);
  process.exit(1);
}
fs.mkdirSync(OUT, { recursive: true });
const { base } = alibabaBase();
const headers = (async = false) => alibabaHeaders(GATEWAY_KEY, { async });

async function start(it: (typeof spec.items)[number]) {
  const taskFile = path.join(OUT, `${it.id}.task.json`);
  if (fs.existsSync(taskFile)) return JSON.parse(fs.readFileSync(taskFile, "utf8")).taskId as string;
  if (resume) return null;
  const image = `data:image/jpeg;base64,${(await sharp(it.image).jpeg({ quality: 92 }).toBuffer()).toString("base64")}`;
  const body = wanVideoBody({ model: spec.model, prompt: it.prompt, image, seconds: it.seconds, people: false });
  Object.assign(body.parameters as Record<string, unknown>, { resolution: spec.resolution }, spec.parameters ?? {});
  const r = await fetch(`${base}/services/aigc/video-generation/video-synthesis`, { method: "POST", headers: headers(true), body: JSON.stringify(body) });
  const text = await r.text();
  if (!r.ok) throw new Error(`${it.id} : ${alibabaError(r.status, text).message}`);
  const t = wanTask(JSON.parse(text));
  if (!t.id) throw new Error(`${it.id} : tâche sans identifiant (${text.slice(0, 200)})`);
  fs.writeFileSync(taskFile, JSON.stringify({ at: new Date().toISOString(), taskId: t.id, model: spec.model, resolution: spec.resolution, seconds: it.seconds, prompt: it.prompt }, null, 2));
  console.log(`${it.id} : tâche ${t.id} lancée`);
  return t.id;
}

async function finish(id: string, taskId: string) {
  for (let i = 0; i < 180; i++) {
    const r = await fetch(`${base}/tasks/${encodeURIComponent(taskId)}`, { headers: headers() });
    const j = await r.json().catch(() => ({}));
    const t = wanTask(j);
    if (t.status === "SUCCEEDED" && t.videoUrl) {
      fs.writeFileSync(path.join(OUT, `${id}.result.json`), JSON.stringify(j, null, 2));
      const v = await fetch(t.videoUrl);
      if (!v.ok) throw new Error(`${id} : téléchargement impossible (HTTP ${v.status}), adresse gardée dans ${id}.result.json`);
      fs.writeFileSync(path.join(OUT, `${id}.mp4`), Buffer.from(await v.arrayBuffer()));
      console.log(`${id} : vidéo récupérée (usage ${JSON.stringify(j.usage ?? {})})`);
      return;
    }
    if (t.status === "FAILED" || t.status === "CANCELED" || t.status === "UNKNOWN") throw new Error(`${id} : ${t.status} — ${t.message ?? ""}`);
    await new Promise((res) => setTimeout(res, 10_000));
  }
  throw new Error(`${id} : toujours en cours après 30 min (tâche ${taskId} gardée, relancer avec --resume)`);
}

const tasks = await Promise.all(spec.items.map(async (it) => [it.id, await start(it)] as const));
const results = await Promise.allSettled(tasks.filter(([, t]) => t).map(([id, t]) => finish(id, t!)));
for (const r of results) if (r.status === "rejected") console.error(String(r.reason?.message ?? r.reason));
