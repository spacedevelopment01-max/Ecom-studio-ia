/**
 * ESSAI RÉEL (payant, accord du propriétaire) — Qwen-Image d'Alibaba Cloud : un logo et une publicité « tout par l'IA »
 * pour un produit de démonstration. Même requête que le studio (alibaba.ts : qwenImageBody, alibabaHeaders,
 * qwenImageUrl). Ne s'exécute qu'avec --confirm, sous un plafond (--max-usd, 0,25 $ par défaut) ; UN SEUL envoi par
 * image, aucune nouvelle tentative automatique.
 *   NODE_USE_ENV_PROXY=1 npx tsx scripts/alibaba-qwen-essai.ts --confirm --spec=<fichier.json> --out=<dossier>
 * Spécification : { model, items: [{ id, aspect, prompt, reference? (chemin d'une image) }] }.
 * Clé : injectée par la passerelle réseau (secret de l'environnement) — jamais lue ni affichée ici.
 * Sorties : <out>/<id>.png (image ORIGINALE reçue), <out>/<id>.response.json (réponse et adresse de l'image, gardées
 * avant le téléchargement) et <out>/essai.json (modèle, paramètres, coût borné, durée).
 * L'image se télécharge depuis le stockage d'Alibaba (*.aliyuncs.com, hors dashscope) : cet hôte doit être autorisé
 * par le réseau. Sinon : relancer plus tard `--fetch-only` (gratuit, adresse valable environ 24 h).
 */
import fs from "node:fs";
import path from "node:path";
import { alibabaBase, alibabaError, alibabaHeaders, qwenImageBody, qwenImageUrl } from "@/lib/ai/alibaba";
import { GATEWAY_KEY } from "@/lib/ai/gateway";
import { DEFAULT_PRICES } from "@/lib/ai/config";

const args = process.argv.slice(2);
const arg = (k: string) => args.find((a) => a.startsWith(`--${k}=`))?.split("=").slice(1).join("=");
// --fetch-only (gratuit) : télécharge les images déjà payées dont l'adresse a été gardée, sans rien redemander.
if (args.includes("--fetch-only")) {
  const dir = path.resolve(arg("out") ?? "reports/alibaba-qwen-essai");
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".response.json"))) {
    const id = f.replace(/\.response\.json$/, "");
    if (fs.existsSync(path.join(dir, `${id}.png`))) continue;
    const { url } = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
    const dl = await fetch(url).catch((e) => e as Error);
    if (dl instanceof Error || !dl.ok) console.error(`${id} : téléchargement impossible (${dl instanceof Error ? dl.message : `HTTP ${dl.status}`}).`);
    else fs.writeFileSync(path.join(dir, `${id}.png`), Buffer.from(await dl.arrayBuffer())), console.log(`${id} : récupérée.`);
  }
  process.exit(0);
}
if (!args.includes("--confirm")) {
  console.error("Appel PAYANT : relancez avec --confirm après accord explicite.");
  process.exit(1);
}
const spec = JSON.parse(fs.readFileSync(arg("spec")!, "utf8")) as { model: string; items: { id: string; aspect: string; prompt: string; reference?: string }[] };
const OUT = path.resolve(arg("out") ?? "reports/alibaba-qwen-essai");
const maxUsd = Number(arg("max-usd") ?? "0.25");
const price = (DEFAULT_PRICES as Record<string, { perImage?: number }>)[`alibaba:${spec.model}`]?.perImage;
if (!price) {
  console.error(`Tarif inconnu pour alibaba:${spec.model} : rien n'est envoyé.`);
  process.exit(1);
}
const bound = +(price * spec.items.length).toFixed(4);
if (bound > maxUsd) {
  console.error(`Coût maximal (${bound} $) supérieur au plafond (${maxUsd} $) : rien n'est envoyé.`);
  process.exit(1);
}
fs.mkdirSync(OUT, { recursive: true });
const { base } = alibabaBase();
const report: Record<string, unknown>[] = [];
for (const it of spec.items) {
  const refs = it.reference ? [`data:image/jpeg;base64,${fs.readFileSync(it.reference).toString("base64")}`] : [];
  const body = qwenImageBody({ model: spec.model, prompt: it.prompt, aspect: it.aspect, references: refs, people: false });
  const t0 = Date.now();
  const r = await fetch(`${base}/services/aigc/multimodal-generation/generation`, { method: "POST", headers: alibabaHeaders(GATEWAY_KEY), body: JSON.stringify(body) });
  const text = await r.text();
  if (!r.ok) {
    console.error(`${it.id} : ${alibabaError(r.status, text).message}`);
    report.push({ id: it.id, ok: false, status: r.status, error: text.slice(0, 500) });
    continue;
  }
  const j = JSON.parse(text);
  const url = qwenImageUrl(j);
  if (!url) {
    report.push({ id: it.id, ok: false, error: "réponse sans image", raw: text.slice(0, 500) });
    continue;
  }
  // Image payée : réponse et adresse gardées AVANT le téléchargement (l'adresse reste valable environ 24 h), pour
  // la récupérer sans repayer si le téléchargement échoue (hôte de stockage bloqué, coupure…).
  fs.writeFileSync(path.join(OUT, `${it.id}.response.json`), JSON.stringify({ at: new Date().toISOString(), url, response: j }, null, 2));
  try {
    const dl = await fetch(url);
    if (!dl.ok) throw new Error(`HTTP ${dl.status}`);
    fs.writeFileSync(path.join(OUT, `${it.id}.png`), Buffer.from(await dl.arrayBuffer()));
  } catch (e) {
    const host = new URL(url).host;
    console.error(`${it.id} : image créée (payée) mais téléchargement impossible depuis ${host} (${(e as Error).message}). Adresse gardée dans ${it.id}.response.json — récupérer avec --fetch-only.`);
    report.push({ id: it.id, ok: false, paid: true, downloadHost: host, error: (e as Error).message });
    continue;
  }
  report.push({ id: it.id, ok: true, model: spec.model, aspect: it.aspect, size: body.parameters.size, references: refs.length, usage: j.usage ?? null, requestId: j.request_id ?? null, seconds: Math.round((Date.now() - t0) / 1000), maxCostUsd: price, prompt: it.prompt });
  console.log(`${it.id} : OK (${Math.round((Date.now() - t0) / 1000)} s)`);
}
fs.writeFileSync(path.join(OUT, "essai.json"), JSON.stringify({ at: new Date().toISOString(), model: spec.model, boundUsd: bound, items: report }, null, 2));
