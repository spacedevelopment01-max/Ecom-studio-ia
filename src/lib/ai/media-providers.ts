/**
 * Fournisseurs de génération d'images et de vidéo.
 * Principe de fidélité : le produit n'est jamais « réinventé ».
 *  - OpenAI : retouche par masque — seul le décor autour du produit est peint,
 *    puis les pixels d'origine du produit sont replacés par-dessus.
 *  - Gemini : génération d'un décor vide (sans produit), sur lequel le
 *    détourage réel est composé.
 *  - Vidéo (Veo / fal) : plans d'ambiance générés à partir d'une scène
 *    contenant le produit réel ; ils sont vérifiés puis intégrés au montage.
 */
import OpenAI, { toFile } from "openai";
import sharp from "sharp";
import { assertCanSpend, EUR, recordUsage } from "../billing";
import { PermanentError, UserFacingError } from "../jobs";
import { priceFor, providerKey, routeFor, usdToEur } from "./config";

type Ctx = { userId: string; projectId: string; jobId?: string | null; usageKey?: string };

function cost(provider: string, model: string, units: { input?: number; output?: number; imageIn?: number; imageOut?: number; images?: number; seconds?: number }) {
  const p = priceFor(provider, model);
  if (!p) return { micro: 0, estimated: true };
  let usd = 0;
  if (p.unit === "tokens") usd = ((units.input ?? 0) * p.inputPerM + (units.imageIn ?? 0) * (p.imageInputPerM ?? p.inputPerM) + (units.output ?? 0) * p.outputPerM + (units.imageOut ?? 0) * (p.imageOutputPerM ?? p.outputPerM)) / 1e6;
  if (p.unit === "image") usd = (units.images ?? 1) * p.perImage;
  if (p.unit === "video_second") usd = (units.seconds ?? 0) * p.perSecond;
  return { micro: Math.round(usd * usdToEur() * EUR), estimated: p.unit !== "tokens" };
}

export function imageProviderAvailable(): "openai" | "google" | null {
  const r = routeFor("image_generation");
  if (providerKey(r.provider)) return r.provider === "openai" || r.provider === "google" ? r.provider : null;
  if (providerKey("openai")) return "openai";
  if (providerKey("google")) return "google";
  return null;
}

export function videoProviderAvailable(): "google" | "fal" | null {
  const r = routeFor("video_generation");
  if ((r.provider === "google" || r.provider === "fal") && providerKey(r.provider)) return r.provider;
  if (providerKey("google")) return "google";
  if (providerKey("fal")) return "fal";
  return null;
}

/**
 * Décor peint autour du produit (OpenAI, retouche par masque).
 * `composite` : image PNG du cadre avec le produit déjà placé ;
 * `productMask` : PNG de même taille, opaque là où se trouve le produit.
 */
export async function openaiScene(ctx: Ctx, input: { composite: Buffer; productMask: Buffer; prompt: string; size: "1024x1024" | "1024x1536" | "1536x1024" }) {
  const key = providerKey("openai");
  if (!key) throw new UserFacingError("Aucune clé OpenAI configurée pour la génération d'images.");
  const route = routeFor("image_generation");
  const model = route.provider === "openai" ? route.model : "gpt-image-1";
  assertCanSpend(ctx.userId, cost("openai", model, { input: 400, imageIn: 1500, imageOut: 6300 }).micro);
  // Le masque OpenAI : zones transparentes = zones à peindre. On rend donc
  // transparent tout ce qui n'est pas le produit.
  const { data, info } = await sharp(input.productMask).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const mask = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0; i < info.width * info.height; i++) {
    const a = data[i * 4 + 3];
    mask[i * 4] = mask[i * 4 + 1] = mask[i * 4 + 2] = 0;
    mask[i * 4 + 3] = a > 8 ? 255 : 0;
  }
  const maskPng = await sharp(mask, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
  const client = new OpenAI({ apiKey: key, maxRetries: 2, timeout: 300_000 });
  let res: any;
  try {
    res = await client.images.edit({
      model,
      image: await toFile(input.composite, "scene.png", { type: "image/png" }),
      mask: await toFile(maskPng, "mask.png", { type: "image/png" }),
      prompt: `${input.prompt}. Keep the existing product exactly as it is; only paint the surrounding environment, surface and lighting. No text, no extra products.`,
      size: input.size,
      quality: "high",
      n: 1,
    } as any);
  } catch (e: any) {
    if (e?.status === 401) throw new PermanentError("Clé OpenAI refusée : vérifiez-la dans l'administration.");
    if (e?.status === 400) throw new PermanentError(`Génération d'image refusée par OpenAI : ${e.message}`);
    throw e;
  }
  const b64 = res.data?.[0]?.b64_json;
  if (!b64) throw new Error("Réponse d'image vide.");
  const u = res.usage ?? {};
  const c = cost("openai", model, { input: u.input_tokens_details?.text_tokens ?? 0, imageIn: u.input_tokens_details?.image_tokens ?? 0, imageOut: u.output_tokens ?? 0 });
  recordUsage({ userId: ctx.userId, projectId: ctx.projectId, jobId: ctx.jobId, task: "image_generation", provider: "openai", model, unit: "tokens", inputUnits: u.input_tokens ?? 0, outputUnits: u.output_tokens ?? 0, quantity: 1, costMicro: c.micro, estimated: !res.usage, idempotencyKey: ctx.usageKey });
  return Buffer.from(b64, "base64");
}

/** Décor vide généré par Gemini (le produit réel est composé ensuite). */
export async function geminiPlate(ctx: Ctx, input: { prompt: string; reference?: Buffer; aspect: "1:1" | "4:5" | "9:16" | "16:9" | "2:3" }) {
  const key = providerKey("google");
  if (!key) throw new UserFacingError("Aucune clé Google Gemini configurée pour la génération d'images.");
  const route = routeFor("image_generation");
  const model = route.provider === "google" ? route.model : "gemini-2.5-flash-image";
  assertCanSpend(ctx.userId, cost("google", model, { images: 1 }).micro);
  const parts: any[] = [{ text: `Photograph of an empty product-photography set, ${input.prompt}. The center foreground surface must be empty and clear (a product will be placed there later). Aspect ratio ${input.aspect}. No text, no logo, no product, no people.` }];
  if (input.reference) {
    const jpeg = await sharp(input.reference).resize(768, 768, { fit: "inside" }).jpeg({ quality: 85 }).toBuffer();
    parts.push({ text: "Color and mood reference for the product that will be placed (do not draw it):" }, { inline_data: { mime_type: "image/jpeg", data: jpeg.toString("base64") } });
  }
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: input.aspect } } }),
  });
  if (r.status === 401 || r.status === 403) throw new PermanentError("Clé Google refusée : vérifiez-la dans l'administration.");
  if (r.status === 400) throw new PermanentError(`Requête refusée par Gemini : ${(await r.text()).slice(0, 300)}`);
  if (!r.ok) throw new Error(`Gemini ${r.status} : ${(await r.text()).slice(0, 200)}`);
  const j: any = await r.json();
  const img = j.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData || p.inline_data);
  const b64 = img?.inlineData?.data ?? img?.inline_data?.data;
  if (!b64) throw new Error("Gemini n'a pas renvoyé d'image (contenu filtré ou indisponible).");
  const c = cost("google", model, { images: 1 });
  recordUsage({ userId: ctx.userId, projectId: ctx.projectId, jobId: ctx.jobId, task: "image_generation", provider: "google", model, unit: "image", quantity: 1, costMicro: c.micro, estimated: true, idempotencyKey: ctx.usageKey });
  return Buffer.from(b64, "base64");
}

/**
 * Plan vidéo image-vers-vidéo (Veo via l'API Gemini). Retourne un MP4.
 * `people` : plan avec une personne (UGC) — le prompt est transmis tel quel et Veo 3 génère aussi la voix et le son.
 */
export async function veoClip(ctx: Ctx, input: { image: Buffer; prompt: string; aspect: "16:9" | "9:16"; seconds?: number; people?: boolean }, onWait?: (msg: string) => void) {
  const key = providerKey("google");
  if (!key) throw new UserFacingError("Aucune clé Google configurée pour la vidéo.");
  const route = routeFor("video_generation");
  const model = route.provider === "google" ? route.model : "veo-3.0-generate-001";
  const seconds = input.seconds ?? 8;
  assertCanSpend(ctx.userId, cost("google", model, { seconds }).micro);
  const jpeg = await sharp(input.image).jpeg({ quality: 90 }).toBuffer();
  const start = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:predictLongRunning`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      instances: [{ prompt: input.people ? input.prompt : `${input.prompt}. The product must remain exactly identical (shape, label, colors); slow, elegant camera movement; no text overlay.`, image: { bytesBase64Encoded: jpeg.toString("base64"), mimeType: "image/jpeg" } }],
      parameters: { aspectRatio: input.aspect, personGeneration: input.people ? "allow_adult" : "dont_allow" },
    }),
  });
  if (start.status === 401 || start.status === 403) throw new PermanentError("Clé Google refusée pour Veo.");
  if (!start.ok) throw new PermanentError(`Veo a refusé la demande : ${(await start.text()).slice(0, 300)}`);
  const op: any = await start.json();
  const name = op.name;
  for (let i = 0; i < 90; i++) {
    await new Promise((r) => setTimeout(r, 10_000));
    onWait?.(`Génération du plan vidéo par Veo (${(i + 1) * 10} s)…`);
    const s = await fetch(`https://generativelanguage.googleapis.com/v1beta/${name}`, { headers: { "x-goog-api-key": key } });
    const j: any = await s.json();
    if (j.error) throw new PermanentError(`Veo : ${j.error.message}`);
    if (j.done) {
      const uri = j.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
      if (!uri) throw new PermanentError("Veo n'a renvoyé aucune vidéo (contenu filtré).");
      const v = await fetch(uri, { headers: { "x-goog-api-key": key } });
      if (!v.ok) throw new Error(`Téléchargement Veo impossible (${v.status}).`);
      const c = cost("google", model, { seconds });
      recordUsage({ userId: ctx.userId, projectId: ctx.projectId, jobId: ctx.jobId, task: "video_generation", provider: "google", model, unit: "video_second", quantity: seconds, costMicro: c.micro, estimated: true, idempotencyKey: ctx.usageKey });
      return Buffer.from(await v.arrayBuffer());
    }
  }
  throw new Error("Délai dépassé pour la génération Veo.");
}

/**
 * Image d'ouverture d'un plan UGC : une personne générée tient ou utilise le produit réel.
 * Le détourage du produit est fourni en référence (forme, étiquette, couleurs à conserver) ;
 * `persona` (image du premier plan) garde la même personne et le même décor d'un plan à l'autre.
 */
export async function ugcFrame(ctx: Ctx, input: { prompt: string; product: Buffer; persona?: Buffer; aspect: "9:16" | "16:9" }) {
  const provider = imageProviderAvailable();
  if (!provider) throw new UserFacingError("Aucun fournisseur d'images configuré (Google Gemini ou OpenAI) pour créer la personne de la vidéo UGC.");
  const product = await sharp(input.product).flatten({ background: "#ffffff" }).resize(1024, 1024, { fit: "contain", background: "#ffffff" }).jpeg({ quality: 90 }).toBuffer();
  const persona = input.persona ? await sharp(input.persona).resize(768, 768, { fit: "inside" }).jpeg({ quality: 85 }).toBuffer() : null;
  const text = `${input.prompt}
The product shown in the first reference image must appear exactly as it is: same shape, proportions, label, logo, text and colors; do not redesign it, do not add another product.${persona ? " Keep the same person, outfit and room as in the second reference image." : ""}
Authentic smartphone video still, natural light, realistic skin and hands, no text overlay, no watermark. Aspect ratio ${input.aspect}.`;
  if (provider === "google") {
    const key = providerKey("google")!;
    const route = routeFor("image_generation");
    const model = route.provider === "google" ? route.model : "gemini-2.5-flash-image";
    assertCanSpend(ctx.userId, cost("google", model, { images: 1 }).micro);
    const parts: any[] = [{ text }, { inline_data: { mime_type: "image/jpeg", data: product.toString("base64") } }];
    if (persona) parts.push({ inline_data: { mime_type: "image/jpeg", data: persona.toString("base64") } });
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: input.aspect } } }),
    });
    if (r.status === 401 || r.status === 403) throw new PermanentError("Clé Google refusée : vérifiez-la dans l'administration.");
    if (r.status === 400) throw new PermanentError(`Requête refusée par Gemini : ${(await r.text()).slice(0, 300)}`);
    if (!r.ok) throw new Error(`Gemini ${r.status} : ${(await r.text()).slice(0, 200)}`);
    const j: any = await r.json();
    const img = j.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData || p.inline_data);
    const b64 = img?.inlineData?.data ?? img?.inline_data?.data;
    if (!b64) throw new Error("Gemini n'a pas renvoyé d'image (contenu filtré ou indisponible).");
    recordUsage({ userId: ctx.userId, projectId: ctx.projectId, jobId: ctx.jobId, task: "image_generation", provider: "google", model, unit: "image", quantity: 1, costMicro: cost("google", model, { images: 1 }).micro, estimated: true, idempotencyKey: ctx.usageKey });
    return Buffer.from(b64, "base64");
  }
  const key = providerKey("openai")!;
  const route = routeFor("image_generation");
  const model = route.provider === "openai" ? route.model : "gpt-image-1";
  assertCanSpend(ctx.userId, cost("openai", model, { input: 400, imageIn: 3000, imageOut: 6300 }).micro);
  const client = new OpenAI({ apiKey: key, maxRetries: 2, timeout: 300_000 });
  const images = [await toFile(product, "produit.jpg", { type: "image/jpeg" })];
  if (persona) images.push(await toFile(persona, "personne.jpg", { type: "image/jpeg" }));
  let res: any;
  try {
    res = await client.images.edit({ model, image: images as any, prompt: text, size: input.aspect === "9:16" ? "1024x1536" : "1536x1024", quality: "high" } as any);
  } catch (e: any) {
    if (e?.status === 401 || e?.status === 403) throw new PermanentError("Clé OpenAI refusée : vérifiez-la dans l'administration.");
    if (e?.status === 400) throw new PermanentError(`Requête refusée par OpenAI : ${String(e?.message ?? "").slice(0, 300)}`);
    throw e;
  }
  const b64 = res.data?.[0]?.b64_json;
  if (!b64) throw new Error("OpenAI n'a pas renvoyé d'image.");
  const u = res.usage ?? {};
  recordUsage({ userId: ctx.userId, projectId: ctx.projectId, jobId: ctx.jobId, task: "image_generation", provider: "openai", model, unit: "tokens", inputUnits: u.input_tokens ?? 0, outputUnits: u.output_tokens ?? 0, quantity: 1, costMicro: cost("openai", model, { input: u.input_tokens_details?.text_tokens ?? 0, imageIn: u.input_tokens_details?.image_tokens ?? 0, imageOut: u.output_tokens ?? 0 }).micro, estimated: !res.usage, idempotencyKey: ctx.usageKey });
  return Buffer.from(b64, "base64");
}

/** Plan vidéo via fal.ai (file d'attente officielle). */
export async function falClip(ctx: Ctx, input: { image: Buffer; prompt: string; seconds?: number }, onWait?: (msg: string) => void) {
  const key = providerKey("fal");
  if (!key) throw new UserFacingError("Aucune clé fal.ai configurée.");
  const route = routeFor("video_generation");
  const model = route.provider === "fal" ? route.model : "fal-ai/kling-video/v2.1/pro/image-to-video";
  const seconds = input.seconds ?? 5;
  assertCanSpend(ctx.userId, cost("fal", model, { seconds }).micro);
  const dataUri = `data:image/jpeg;base64,${(await sharp(input.image).jpeg({ quality: 90 }).toBuffer()).toString("base64")}`;
  const headers = { Authorization: `Key ${key}`, "Content-Type": "application/json" };
  const r = await fetch(`https://queue.fal.run/${model}`, { method: "POST", headers, body: JSON.stringify({ prompt: input.prompt, image_url: dataUri, duration: String(seconds) }) });
  if (r.status === 401 || r.status === 403) throw new PermanentError("Clé fal.ai refusée.");
  if (!r.ok) throw new PermanentError(`fal.ai a refusé la demande : ${(await r.text()).slice(0, 300)}`);
  const q: any = await r.json();
  for (let i = 0; i < 120; i++) {
    await new Promise((res) => setTimeout(res, 6000));
    onWait?.(`Génération du plan vidéo (${(i + 1) * 6} s)…`);
    const st: any = await (await fetch(q.status_url, { headers })).json();
    if (st.status === "COMPLETED") {
      const out: any = await (await fetch(q.response_url, { headers })).json();
      const url = out.video?.url;
      if (!url) throw new PermanentError("fal.ai n'a renvoyé aucune vidéo.");
      const v = await fetch(url);
      const c = cost("fal", model, { seconds });
      recordUsage({ userId: ctx.userId, projectId: ctx.projectId, jobId: ctx.jobId, task: "video_generation", provider: "fal", model, unit: "video_second", quantity: seconds, costMicro: c.micro, estimated: true, idempotencyKey: ctx.usageKey });
      return Buffer.from(await v.arrayBuffer());
    }
    if (st.status === "FAILED" || st.status === "ERROR") throw new PermanentError("La génération fal.ai a échoué.");
  }
  throw new Error("Délai dépassé pour la génération fal.ai.");
}

/** Vérification de clé depuis l'administration (appel léger, sans génération). */
export async function pingProvider(p: "openai" | "google" | "fal"): Promise<string> {
  const key = providerKey(p);
  if (!key) throw new Error("Aucune clé enregistrée.");
  if (p === "openai") {
    const r = await fetch("https://api.openai.com/v1/models", { headers: { Authorization: `Bearer ${key}` } });
    if (!r.ok) throw new Error(`OpenAI ${r.status}`);
    return "Clé OpenAI valide.";
  }
  if (p === "google") {
    const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models", { headers: { "x-goog-api-key": key } });
    if (!r.ok) throw new Error(`Google ${r.status}`);
    return "Clé Gemini valide.";
  }
  const r = await fetch("https://queue.fal.run/fal-ai/fast-sdxl/requests/00000000-0000-0000-0000-000000000000/status", { headers: { Authorization: `Key ${key}` } });
  if (r.status === 401 || r.status === 403) throw new Error("Clé fal.ai refusée.");
  return "Clé fal.ai acceptée.";
}
