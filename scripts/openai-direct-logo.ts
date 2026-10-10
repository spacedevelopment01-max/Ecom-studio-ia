/**
 * TEST RÉEL (payant) — une seule image OpenAI, demande simple et directe, SANS le moteur du studio : pour voir ce
 * qu'OpenAI produit réellement. Ne s'exécute qu'avec --confirm et sous un plafond (--max-eur, 0,30 € par défaut).
 *   npx tsx scripts/openai-direct-logo.ts --confirm [--max-eur=0.31] [--stream]
 * --stream : réponse en flux avec 2 images partielles (la connexion reçoit des données pendant la génération au lieu
 * de rester silencieuse 1 à 2 minutes). UN SEUL envoi : aucune nouvelle tentative automatique, même en cas d'erreur.
 * Authentification : dans Claude Cloud, ajoutée par le proxy réseau (secret réseau) — lancer avec NODE_USE_ENV_PROXY=1 ;
 * dans le Codespace, OPENAI_API_KEY ou la clé enregistrée dans Administration › Fournisseurs IA. Aucune clé n'est
 * écrite ni affichée.
 * Sorties : reports/openai-real-brand-test/direct-<horodatage>.png (image ORIGINALE, telle que reçue) et .json
 * (modèle demandé et servi, paramètres, jetons facturés, coût calculé, durée).
 */
import fs from "node:fs";
import path from "node:path";
import OpenAI from "openai";
import { providerKey } from "@/lib/ai/config";

const args = process.argv.slice(2);
if (!args.includes("--confirm")) {
  console.error("Appel PAYANT : relancez avec --confirm après accord explicite.");
  process.exit(1);
}
const maxEur = Number(args.find((a) => a.startsWith("--max-eur="))?.split("=")[1] ?? "0.30");
const STREAM = args.includes("--stream");
const PARTIALS = 2;

// Paramètres (GPT Image 2 : pas de fond transparent — refusé par l'API pour ce modèle).
const MODEL = "gpt-image-2";
const PARAMS = { size: "1024x1024", quality: "high", output_format: "png", background: "opaque", n: 1 } as const;
// Tarifs publics relevés (non confirmés sur la page officielle, inaccessible depuis l'environnement) — USD par million
// de jetons : texte en entrée 5, image en sortie 30. Borne du devis : 0,30 € (≈ 0,21 $ annoncés en haute qualité 1024²).
const USD = { textIn: 5, imageIn: 8, imageOut: 30 };
const USD_TO_EUR = 0.86;
// Images partielles : environ 100 jetons de sortie en plus chacune (indication de la documentation OpenAI, à confirmer)
// → 2 × 100 × 30 $/M ≈ 0,006 $ ; borne arrondie à +0,01 €.
const BOUND_EUR = STREAM ? 0.31 : 0.3;
if (BOUND_EUR > maxEur) {
  console.error(`Coût maximal estimé (${BOUND_EUR} €) supérieur au plafond autorisé (${maxEur} €) : rien n'est envoyé.`);
  process.exit(1);
}

const PROMPT = `Design a professional logo for a French craftsman: "Sébastien Blanc", plasterer and painter (plâtrerie, peinture, enduits).
A real agency-quality logo: a crafted monogram of the initials S and B, drawn with care and personality, combined with an element of the trade (for example a roofline, a trowel stroke or a brush stroke), with a subtle material texture.
Two tones: deep charcoal grey (#2E2E33) and warm sand beige (#C8A27A).
Below the monogram, the name in clean, bold, perfectly legible capitals: "SÉBASTIEN BLANC" (the word BLANC in the beige tone), and underneath, smaller and spaced: "PLÂTRERIE • PEINTURE".
Spell every word exactly, with the accents. No other text. Centered, generous margins, plain white background, flat logo artwork only — no mockup, no wall, no paper, no photo.`;

const OUT = path.resolve(process.env.LOGO_TEST_OUT || "reports/openai-real-brand-test");
fs.mkdirSync(OUT, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
// Clé : variable d'environnement ou administration du studio (Codespace) ; sinon marqueur remplacé par le proxy (Cloud).
const apiKey = process.env.OPENAI_API_KEY || (() => {
  try {
    return providerKey("openai");
  } catch {
    return null;
  }
})() || "injected-by-network-proxy";
const client = new OpenAI({ apiKey, maxRetries: 0, timeout: 300_000 });
const t0 = Date.now();
const events: { atMs: number; type: string; bytes?: number }[] = [];
console.log(`Envoi unique : ${MODEL} ${JSON.stringify(PARAMS)}${STREAM ? ` stream=true partial_images=${PARTIALS}` : ""} — plafond ${maxEur} €`);
let res: any;
let png: Buffer;
try {
  if (STREAM) {
    const stream: any = await client.images.generate({ model: MODEL, prompt: PROMPT, ...PARAMS, stream: true, partial_images: PARTIALS } as any);
    let final: any = null;
    for await (const ev of stream) {
      const b64 = ev.b64_json as string | undefined;
      events.push({ atMs: Date.now() - t0, type: ev.type, ...(b64 ? { bytes: Math.round(b64.length * 0.75) } : {}) });
      console.log(`  ${((Date.now() - t0) / 1000).toFixed(1)} s — ${ev.type}`);
      if (ev.type === "image_generation.partial_image" && b64) fs.writeFileSync(path.join(OUT, `direct-${stamp}-partiel-${ev.partial_image_index}.png`), Buffer.from(b64, "base64"));
      if (ev.type === "image_generation.completed") final = ev;
    }
    if (!final?.b64_json) throw new Error("Flux terminé sans image finale.");
    res = { data: [{ b64_json: final.b64_json }], usage: final.usage };
  } else res = await client.images.generate({ model: MODEL, prompt: PROMPT, ...PARAMS } as any);
} catch (e: any) {
  // Échec : rien n'est relancé. Durée et journal des événements écrits pour le diagnostic (le coût reste à vérifier
  // dans le tableau de bord OpenAI : une génération coupée en route peut avoir été facturée).
  const fail = { at: new Date().toISOString(), requestedModel: MODEL, params: PARAMS, stream: STREAM, durationMs: Date.now() - t0, events, error: { status: e?.status ?? null, message: String(e?.message ?? e).slice(0, 300) } };
  fs.writeFileSync(path.join(OUT, `direct-${stamp}-echec.json`), JSON.stringify(fail, null, 2));
  console.error(`ÉCHEC après ${(fail.durationMs / 1000).toFixed(1)} s : ${fail.error.status ?? ""} ${fail.error.message} — aucune nouvelle tentative.`);
  process.exit(2);
}
const ms = Date.now() - t0;
const b64 = res.data?.[0]?.b64_json;
if (!b64) throw new Error("OpenAI n'a pas renvoyé d'image.");
png = Buffer.from(b64, "base64");
fs.writeFileSync(path.join(OUT, `direct-${stamp}.png`), png);
const u = res.usage ?? {};
const textIn = u.input_tokens_details?.text_tokens ?? u.input_tokens ?? 0;
const imageIn = u.input_tokens_details?.image_tokens ?? 0;
const out = u.output_tokens ?? 0;
const usd = (textIn * USD.textIn + imageIn * USD.imageIn + out * USD.imageOut) / 1e6;
const record = {
  at: new Date().toISOString(),
  requestedModel: MODEL,
  params: PARAMS,
  prompt: PROMPT,
  usage: res.usage ?? null,
  costUsd: Math.round(usd * 10000) / 10000,
  costEur: Math.round(usd * USD_TO_EUR * 10000) / 10000,
  rates: { ...USD, usdToEur: USD_TO_EUR, note: "tarifs publics relevés, non confirmés sur la page officielle" },
  stream: STREAM ? { partialImages: PARTIALS, events } : false,
  durationMs: ms,
  bytes: png.length,
  file: `direct-${stamp}.png`,
};
fs.writeFileSync(path.join(OUT, `direct-${stamp}.json`), JSON.stringify(record, null, 2));
console.log(JSON.stringify({ ...record, prompt: undefined }, null, 2));
