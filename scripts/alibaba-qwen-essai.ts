/**
 * ESSAI RÉEL (payant, accord du propriétaire) — Qwen-Image d'Alibaba Cloud : un logo et une publicité « tout par l'IA »
 * pour un produit de démonstration. Même requête que le studio (alibaba.ts : qwenImageBody, alibabaHeaders,
 * qwenImageUrl). Ne s'exécute qu'avec --confirm, sous un plafond (--max-usd, 0,25 $ par défaut) ; UN SEUL envoi par
 * image, aucune nouvelle tentative automatique.
 *   NODE_USE_ENV_PROXY=1 npx tsx scripts/alibaba-qwen-essai.ts --confirm --spec=<fichier.json> --out=<dossier>
 * Spécification : { model, items: [{ id, aspect, prompt, reference? (chemin d'une image) }] }.
 * Clé : injectée par la passerelle réseau (secret de l'environnement) — jamais lue ni affichée ici.
 * Sorties : <out>/<id>.png (image ORIGINALE reçue) et <out>/essai.json (modèle, paramètres, coût borné, durée).
 */
import fs from "node:fs";
import path from "node:path";
import { alibabaBase, alibabaError, alibabaHeaders, qwenImageBody, qwenImageUrl } from "@/lib/ai/alibaba";
import { GATEWAY_KEY } from "@/lib/ai/gateway";
import { DEFAULT_PRICES } from "@/lib/ai/config";

const args = process.argv.slice(2);
const arg = (k: string) => args.find((a) => a.startsWith(`--${k}=`))?.split("=").slice(1).join("=");
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
  const img = Buffer.from(await (await fetch(url)).arrayBuffer());
  fs.writeFileSync(path.join(OUT, `${it.id}.png`), img);
  report.push({ id: it.id, ok: true, model: spec.model, aspect: it.aspect, size: body.parameters.size, references: refs.length, usage: j.usage ?? null, requestId: j.request_id ?? null, seconds: Math.round((Date.now() - t0) / 1000), maxCostUsd: price, prompt: it.prompt });
  console.log(`${it.id} : OK (${Math.round((Date.now() - t0) / 1000)} s)`);
}
fs.writeFileSync(path.join(OUT, "essai.json"), JSON.stringify({ at: new Date().toISOString(), model: spec.model, boundUsd: bound, items: report }, null, 2));
