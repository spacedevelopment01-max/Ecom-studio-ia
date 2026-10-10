/**
 * TEST RÉEL (payant) — une seule image OpenAI, demande simple et directe, SANS le moteur du studio : pour voir ce
 * qu'OpenAI produit réellement. Ne s'exécute qu'avec --confirm et sous un plafond (--max-eur, 0,30 € par défaut).
 *   npx tsx scripts/openai-direct-logo.ts --confirm [--max-eur=0.30]
 * L'authentification est ajoutée par le proxy réseau de l'environnement (secret réseau) : aucune clé n'est lue,
 * écrite ni affichée ici ; la valeur passée au SDK n'est qu'un marqueur sans valeur.
 * Sorties : reports/openai-real-brand-test/direct-<horodatage>.png (image ORIGINALE, telle que reçue) et .json
 * (modèle demandé et servi, paramètres, jetons facturés, coût calculé, durée).
 */
import fs from "node:fs";
import path from "node:path";
import OpenAI from "openai";

const args = process.argv.slice(2);
if (!args.includes("--confirm")) {
  console.error("Appel PAYANT : relancez avec --confirm après accord explicite.");
  process.exit(1);
}
const maxEur = Number(args.find((a) => a.startsWith("--max-eur="))?.split("=")[1] ?? "0.30");

// Paramètres (GPT Image 2 : pas de fond transparent — refusé par l'API pour ce modèle).
const MODEL = "gpt-image-2";
const PARAMS = { size: "1024x1024", quality: "high", output_format: "png", background: "opaque", n: 1 } as const;
// Tarifs publics relevés (non confirmés sur la page officielle, inaccessible depuis l'environnement) — USD par million
// de jetons : texte en entrée 5, image en sortie 30. Borne du devis : 0,30 € (≈ 0,21 $ annoncés en haute qualité 1024²).
const USD = { textIn: 5, imageIn: 8, imageOut: 30 };
const USD_TO_EUR = 0.86;
const BOUND_EUR = 0.3;
if (BOUND_EUR > maxEur) {
  console.error(`Coût maximal estimé (${BOUND_EUR} €) supérieur au plafond autorisé (${maxEur} €) : rien n'est envoyé.`);
  process.exit(1);
}

const PROMPT = `Design a professional logo for a French craftsman: "Sébastien Blanc", plasterer and painter (plâtrerie, peinture, enduits).
A real agency-quality logo: a crafted monogram of the initials S and B, drawn with care and personality, combined with an element of the trade (for example a roofline, a trowel stroke or a brush stroke), with a subtle material texture.
Two tones: deep charcoal grey (#2E2E33) and warm sand beige (#C8A27A).
Below the monogram, the name in clean, bold, perfectly legible capitals: "SÉBASTIEN BLANC" (the word BLANC in the beige tone), and underneath, smaller and spaced: "PLÂTRERIE • PEINTURE".
Spell every word exactly, with the accents. No other text. Centered, generous margins, plain white background, flat logo artwork only — no mockup, no wall, no paper, no photo.`;

const OUT = path.resolve("reports/openai-real-brand-test");
fs.mkdirSync(OUT, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const client = new OpenAI({ apiKey: "injected-by-network-proxy", maxRetries: 0, timeout: 300_000 });
const t0 = Date.now();
console.log(`Envoi : ${MODEL} ${JSON.stringify(PARAMS)} — plafond ${maxEur} €`);
const res: any = await client.images.generate({ model: MODEL, prompt: PROMPT, ...PARAMS } as any);
const ms = Date.now() - t0;
const b64 = res.data?.[0]?.b64_json;
if (!b64) throw new Error("OpenAI n'a pas renvoyé d'image.");
const png = Buffer.from(b64, "base64");
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
  durationMs: ms,
  bytes: png.length,
  file: `direct-${stamp}.png`,
};
fs.writeFileSync(path.join(OUT, `direct-${stamp}.json`), JSON.stringify(record, null, 2));
console.log(JSON.stringify({ ...record, prompt: undefined }, null, 2));
