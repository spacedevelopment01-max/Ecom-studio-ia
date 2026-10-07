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
import { currentAiUser, currentQuotaScope, currentUserHasAiCredits } from "./access";
import { assertQuota, consumeQuota, refundQuota, userPlan } from "../quotas";
import { all } from "../db";
import { PLANS } from "../plans";
import { PermanentError, UserFacingError } from "../jobs";
import { activeProviderKey, requirePrice, routeFor, usdToEur } from "./config";
import { L } from "../i18n-server";

type Ctx = { userId: string; projectId: string; jobId?: string | null; usageKey?: string };

/** Quota du forfait concerné par une génération (selon la portée de la tâche en cours), null si rien n'est décompté. */
function quotaFor(media: "image" | "video") {
  const scope = currentQuotaScope();
  if (scope === "ugc") return null; // la vidéo UGC est décomptée une fois, en entier
  if (media === "image") return scope === "creation" ? null : "visuals";
  return "aiVideos";
}

/** Avant une génération : quota du forfait (message clair s'il est épuisé), puis budget IA caché. */
function gate(ctx: Ctx, micro: number, media: "image" | "video") {
  const q = quotaFor(media);
  if (q) assertQuota(ctx.userId, q);
  assertCanSpend(ctx.userId, micro);
}

/** Après une génération : consommation réelle (budget caché) et décompte du quota. */
function recordMedia(u: Parameters<typeof recordUsage>[0]) {
  recordUsage(u);
  const q = quotaFor(u.task === "video_generation" ? "video" : "image");
  if (q) consumeQuota(u.userId, q, 1, u.idempotencyKey ? `${q}:${u.idempotencyKey}` : null);
}

/**
 * Image générée puis écartée (contrôle de fidélité non concluant, erreur avant l'enregistrement) : jamais montrée
 * au client, elle ne lui coûte pas de visuel. Rend les décomptes faits sous la clé `key` (préfixe des appels).
 * Le coût réel (budget caché) reste comptabilisé.
 */
export function refundMediaQuota(userId: string, key: string, quota: "visuals" | "aiVideos" = "visuals"): number {
  const esc = (v: string) => v.replace(/[\\%_]/g, (c) => `\\${c}`);
  const refs = all<{ ref: string }>("SELECT ref FROM quota_events WHERE user_id = ? AND (ref = ? OR ref LIKE ? ESCAPE '\\')", userId, `${quota}:${key}`, `${quota}:${esc(key)}:%`);
  let n = 0;
  for (const r of refs) if (refundQuota(userId, r.ref)) n++;
  return n;
}

/** Pendant une tâche, un compte sans forfait (découverte gratuite) ne crée ni images ni vidéos par l'IA. */
function mediaAllowed() {
  const u = currentAiUser();
  return currentUserHasAiCredits() && (!u || !!userPlan(u));
}

function cost(provider: string, model: string, units: { input?: number; output?: number; imageIn?: number; imageOut?: number; images?: number; seconds?: number }) {
  // Sans tarif connu, la génération est refusée (sinon elle serait comptée 0 € hors enveloppe).
  const p = requirePrice(provider, model);
  let usd = 0;
  if (p.unit === "tokens") usd = ((units.input ?? 0) * p.inputPerM + (units.imageIn ?? 0) * (p.imageInputPerM ?? p.inputPerM) + (units.output ?? 0) * p.outputPerM + (units.imageOut ?? 0) * (p.imageOutputPerM ?? p.outputPerM)) / 1e6;
  if (p.unit === "image") usd = (units.images ?? 1) * p.perImage;
  if (p.unit === "video_second") usd = (units.seconds ?? 0) * p.perSecond;
  return { micro: Math.round(usd * usdToEur() * EUR), estimated: p.unit !== "tokens" };
}

export function imageProviderAvailable(): "openai" | "google" | null {
  if (!mediaAllowed()) return null;
  const r = routeFor("image_generation");
  if (activeProviderKey(r.provider)) return r.provider === "openai" || r.provider === "google" ? r.provider : null;
  if (activeProviderKey("openai")) return "openai";
  if (activeProviderKey("google")) return "google";
  return null;
}

export function videoProviderAvailable(): "google" | "fal" | null {
  if (!mediaAllowed()) return null;
  const r = routeFor("video_generation");
  if ((r.provider === "google" || r.provider === "fal") && activeProviderKey(r.provider)) return r.provider;
  if (activeProviderKey("google")) return "google";
  if (activeProviderKey("fal")) return "fal";
  return null;
}

/**
 * Décor peint autour du produit (OpenAI, retouche par masque).
 * `composite` : image PNG du cadre avec le produit déjà placé ;
 * `productMask` : PNG de même taille, opaque là où se trouve le produit.
 */
export async function openaiScene(ctx: Ctx, input: { composite: Buffer; productMask: Buffer; prompt: string; size: "1024x1024" | "1024x1536" | "1536x1024" }) {
  const key = activeProviderKey("openai");
  if (!key) throw new UserFacingError(L("Aucune clé OpenAI configurée pour la génération d'images.", "No OpenAI key configured for image generation."));
  const route = routeFor("image_generation");
  const model = route.provider === "openai" ? route.model : "gpt-image-1";
  gate(ctx, cost("openai", model, { input: 400, imageIn: 1500, imageOut: 6300 }).micro, "image");
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
      prompt: `${input.prompt} Keep the existing product exactly as it is (shape, colours, label, proportions); only paint the surrounding environment, surface and lighting. The product stands on the surface with a natural contact shadow, the camera height and perspective match the product photo. No text, no extra products.`,
      size: input.size,
      quality: "high",
      n: 1,
    } as any);
  } catch (e: any) {
    if (e?.status === 401) throw new PermanentError(L("Clé OpenAI refusée : vérifiez-la dans l'administration.", "OpenAI key rejected: check it in the admin panel."));
    if (e?.status === 400) throw new PermanentError(L(`Génération d'image refusée par OpenAI : ${e.message}`, `Image generation rejected by OpenAI: ${e.message}`));
    throw e;
  }
  const b64 = res.data?.[0]?.b64_json;
  if (!b64) throw new Error(L("Réponse d'image vide.", "Empty image response."));
  const u = res.usage ?? {};
  const c = cost("openai", model, { input: u.input_tokens_details?.text_tokens ?? 0, imageIn: u.input_tokens_details?.image_tokens ?? 0, imageOut: u.output_tokens ?? 0 });
  recordMedia({ userId: ctx.userId, projectId: ctx.projectId, jobId: ctx.jobId, task: "image_generation", provider: "openai", model, unit: "tokens", inputUnits: u.input_tokens ?? 0, outputUnits: u.output_tokens ?? 0, quantity: 1, costMicro: c.micro, estimated: !res.usage, idempotencyKey: ctx.usageKey });
  return Buffer.from(b64, "base64");
}

/** Décor vide généré par Gemini (le produit réel est composé ensuite). */
export async function geminiPlate(ctx: Ctx, input: { prompt: string; reference?: Buffer; aspect: "1:1" | "4:5" | "9:16" | "16:9" | "2:3" }) {
  const key = activeProviderKey("google");
  if (!key) throw new UserFacingError(L("Aucune clé Google Gemini configurée pour la génération d'images.", "No Google Gemini key configured for image generation."));
  const route = routeFor("image_generation");
  const model = route.provider === "google" ? route.model : "gemini-2.5-flash-image";
  gate(ctx, cost("google", model, { images: 1 }).micro, "image");
  // Aucune image du produit n'est envoyée : les modèles d'image la redessinent presque toujours dans le décor,
  // ce qui donnerait un second produit (réinventé) à côté du vrai. Le décor est décrit par le texte seul.
  const parts: any[] = [{ text: `Photograph of an empty product-photography set, ${input.prompt}. The center foreground surface must be empty, flat and clear, seen at eye level from slightly above (a real product will be placed there later, standing on that surface). Aspect ratio ${input.aspect}. No text, no lettering, no logo, no product, no packaging, no bottle, no device, no people, no hands.` }];
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: input.aspect } } }),
  });
  if (r.status === 401 || r.status === 403) throw new PermanentError(L("Clé Google refusée : vérifiez-la dans l'administration.", "Google key rejected: check it in the admin panel."));
  if (r.status === 400) throw new PermanentError(L("Requête refusée par Gemini : ", "Request rejected by Gemini: ") + (await r.text()).slice(0, 300));
  if (!r.ok) throw new Error(`Gemini ${r.status}${L(" : ", ": ")}${(await r.text()).slice(0, 200)}`);
  const j: any = await r.json();
  const img = j.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData || p.inline_data);
  const b64 = img?.inlineData?.data ?? img?.inline_data?.data;
  if (!b64) throw new Error(L("Gemini n'a pas renvoyé d'image (contenu filtré ou indisponible).", "Gemini returned no image (content filtered or unavailable)."));
  const c = cost("google", model, { images: 1 });
  recordMedia({ userId: ctx.userId, projectId: ctx.projectId, jobId: ctx.jobId, task: "image_generation", provider: "google", model, unit: "image", quantity: 1, costMicro: c.micro, estimated: true, idempotencyKey: ctx.usageKey });
  return Buffer.from(b64, "base64");
}

/**
 * Image d'ambiance d'une activité de services (texte vers image) : lieu, gestes, matériaux, lumière.
 * Consignes d'honnêteté ajoutées à chaque demande : aucun visage identifiable présenté comme un client,
 * aucun texte, logo, diplôme, certificat ni récompense. `reference` : photo réelle de l'activité (ambiance seulement).
 */
export async function ambianceImage(ctx: Ctx, input: { prompt: string; aspect: "1:1" | "4:5" | "9:16" | "16:9"; reference?: Buffer | null }) {
  const text = `${input.prompt}
Editorial photograph that conveys the atmosphere of this activity, natural light, realistic, premium. Hands, tools, materials and the place are welcome; people only from behind, out of focus or partially framed, never a recognizable face presented as a customer. No text, no lettering, no logo, no signage, no diploma, no certificate, no award, no badge, no price. Aspect ratio ${input.aspect}.${input.reference ? " The reference photo shows the real business: use it only for mood, colors and kind of place; do not copy any person." : ""}`;
  return generateImage(ctx, { text, aspect: input.aspect, reference: input.reference ?? null, quality: "high" });
}

/**
 * Symbole de logo dessiné par l'IA d'images (meilleure en dessin que le modèle de texte) : forme plate d'une seule
 * couleur sur fond blanc, sans texte, pensée pour être vectorisée. `reference` : photo du produit (silhouette à styliser).
 */
export async function logoSymbolImage(ctx: Ctx, input: { concept: string; reference?: Buffer | null }) {
  const text = `Design a single flat vector-style logo symbol (brand mark): ${input.concept}
Rules: one solid black shape (or up to three bold black shapes) on a pure white background, centered, generous margins. Bold, simple geometric forms that stay recognizable at 16 pixels: thick strokes, no thin lines, no gradients, no shading, no texture, no outlines of the canvas, no 3D, no mockup. Absolutely no text, no letters, no numbers, no words. Think like a senior brand designer: a meaningful sign drawn from the idea, not a literal illustration of an object. Timeless, distinctive, not a cliché of the sector.${input.reference ? " The reference photo is context only: do not copy it." : ""}`;
  return generateImage(ctx, { text, aspect: "1:1", reference: input.reference ?? null, quality: "medium" });
}

/** Génération d'image par le fournisseur d'images configuré (Gemini ou OpenAI), décomptée et facturée. */
async function generateImage(ctx: Ctx, input: { text: string; aspect: "1:1" | "4:5" | "9:16" | "16:9"; reference: Buffer | null; quality: "medium" | "high" }) {
  const provider = imageProviderAvailable();
  if (!provider) throw new UserFacingError(L("Aucun fournisseur d'images configuré (Google Gemini ou OpenAI).", "No image provider configured (Google Gemini or OpenAI)."));
  const text = input.text;
  const ref = input.reference ? await sharp(input.reference).rotate().resize(768, 768, { fit: "inside" }).jpeg({ quality: 85 }).toBuffer() : null;
  if (provider === "google") {
    const key = activeProviderKey("google")!;
    const route = routeFor("image_generation");
    const model = route.provider === "google" ? route.model : "gemini-2.5-flash-image";
    gate(ctx, cost("google", model, { images: 1 }).micro, "image");
    const parts: any[] = [{ text }];
    if (ref) parts.push({ inline_data: { mime_type: "image/jpeg", data: ref.toString("base64") } });
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: input.aspect } } }),
    });
    if (r.status === 401 || r.status === 403) throw new PermanentError(L("Clé Google refusée : vérifiez-la dans l'administration.", "Google key rejected: check it in the admin panel."));
    if (r.status === 400) throw new PermanentError(L("Requête refusée par Gemini : ", "Request rejected by Gemini: ") + (await r.text()).slice(0, 300));
    if (!r.ok) throw new Error(`Gemini ${r.status}${L(" : ", ": ")}${(await r.text()).slice(0, 200)}`);
    const j: any = await r.json();
    const img = j.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData || p.inline_data);
    const b64 = img?.inlineData?.data ?? img?.inline_data?.data;
    if (!b64) throw new Error(L("Gemini n'a pas renvoyé d'image (contenu filtré ou indisponible).", "Gemini returned no image (content filtered or unavailable)."));
    recordMedia({ userId: ctx.userId, projectId: ctx.projectId, jobId: ctx.jobId, task: "image_generation", provider: "google", model, unit: "image", quantity: 1, costMicro: cost("google", model, { images: 1 }).micro, estimated: true, idempotencyKey: ctx.usageKey });
    return Buffer.from(b64, "base64");
  }
  const key = activeProviderKey("openai")!;
  const route = routeFor("image_generation");
  const model = route.provider === "openai" ? route.model : "gpt-image-1";
  gate(ctx, cost("openai", model, { input: 300, imageOut: 6300 }).micro, "image");
  const client = new OpenAI({ apiKey: key, maxRetries: 2, timeout: 300_000 });
  const size = input.aspect === "16:9" ? "1536x1024" : input.aspect === "1:1" ? "1024x1024" : "1024x1536";
  let res: any;
  try {
    res = ref
      ? await client.images.edit({ model, image: [await toFile(ref, "reference.jpg", { type: "image/jpeg" })] as any, prompt: text, size, quality: input.quality } as any)
      : await client.images.generate({ model, prompt: text, size, quality: input.quality } as any);
  } catch (e: any) {
    if (e?.status === 401 || e?.status === 403) throw new PermanentError(L("Clé OpenAI refusée : vérifiez-la dans l'administration.", "OpenAI key rejected: check it in the admin panel."));
    if (e?.status === 400) throw new PermanentError(L(`Requête refusée par OpenAI : ${String(e?.message ?? "").slice(0, 300)}`, `Request rejected by OpenAI: ${String(e?.message ?? "").slice(0, 300)}`));
    throw e;
  }
  const b64 = res.data?.[0]?.b64_json;
  if (!b64) throw new Error(L("OpenAI n'a pas renvoyé d'image.", "OpenAI returned no image."));
  const u = res.usage ?? {};
  recordMedia({ userId: ctx.userId, projectId: ctx.projectId, jobId: ctx.jobId, task: "image_generation", provider: "openai", model, unit: "tokens", inputUnits: u.input_tokens ?? 0, outputUnits: u.output_tokens ?? 0, quantity: 1, costMicro: cost("openai", model, { input: u.input_tokens_details?.text_tokens ?? 0, imageIn: u.input_tokens_details?.image_tokens ?? 0, imageOut: u.output_tokens ?? 0 }).micro, estimated: !res.usage, idempotencyKey: ctx.usageKey });
  return Buffer.from(b64, "base64");
}

/**
 * Plan vidéo image-vers-vidéo (Veo via l'API Gemini). Retourne un MP4.
 * `people` : plan avec une personne (UGC) — le prompt est transmis tel quel et Veo 3 génère aussi la voix et le son.
 */
export async function veoClip(ctx: Ctx, input: { image: Buffer; prompt: string; aspect: "16:9" | "9:16"; seconds?: number; people?: boolean }, onWait?: (msg: string) => void) {
  const key = activeProviderKey("google");
  if (!key) throw new UserFacingError(L("Aucune clé Google configurée pour la vidéo.", "No Google key configured for video."));
  const route = routeFor("video_generation");
  const chosen = route.provider === "google" ? route.model : "veo-3.0-generate-001";
  // Forfait « Créer » : vidéos en qualité standard (modèle rapide) ; les autres forfaits gardent le modèle réglé.
  const plan = userPlan(ctx.userId);
  const model = plan && PLANS[plan].videoQuality === "fast" && chosen === "veo-3.0-generate-001" ? "veo-3.0-fast-generate-001" : chosen;
  const seconds = input.seconds ?? 8;
  gate(ctx, cost("google", model, { seconds }).micro, "video");
  const jpeg = await sharp(input.image).jpeg({ quality: 90 }).toBuffer();
  const start = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:predictLongRunning`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      instances: [{ prompt: input.people ? input.prompt : `${input.prompt}. The product must remain exactly identical (shape, label, colors); slow, elegant camera movement; no people in frame; no text overlay.`, image: { bytesBase64Encoded: jpeg.toString("base64"), mimeType: "image/jpeg" } }],
      // Veo 3 n'accepte que « allow_adult » à partir d'une image (« dont_allow » est refusé) : l'absence de personnes passe par la consigne.
      parameters: { aspectRatio: input.aspect, personGeneration: veoPersonGeneration(model, !!input.people) },
    }),
  });
  if (start.status === 401 || start.status === 403) throw new PermanentError(L("Clé Google refusée pour Veo.", "Google key rejected for Veo."));
  if (!start.ok) throw new PermanentError(L("Veo a refusé la demande : ", "Veo rejected the request: ") + (await start.text()).slice(0, 300));
  const op: any = await start.json();
  const name = op.name;
  for (let i = 0; i < 90; i++) {
    await new Promise((r) => setTimeout(r, 10_000));
    onWait?.(L(`Génération du plan vidéo par Veo (${(i + 1) * 10} s)…`, `Veo is generating the video shot (${(i + 1) * 10} s)…`));
    const s = await fetch(`https://generativelanguage.googleapis.com/v1beta/${name}`, { headers: { "x-goog-api-key": key } });
    const j: any = await s.json();
    if (j.error) throw new PermanentError(L(`Veo : ${j.error.message}`, `Veo: ${j.error.message}`));
    if (j.done) {
      const uri = j.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
      if (!uri) throw new PermanentError(L("Veo n'a renvoyé aucune vidéo (contenu filtré).", "Veo returned no video (content filtered)."));
      const v = await fetch(uri, { headers: { "x-goog-api-key": key } });
      if (!v.ok) throw new Error(L(`Téléchargement Veo impossible (${v.status}).`, `Couldn't download the Veo video (${v.status}).`));
      const c = cost("google", model, { seconds });
      recordMedia({ userId: ctx.userId, projectId: ctx.projectId, jobId: ctx.jobId, task: "video_generation", provider: "google", model, unit: "video_second", quantity: seconds, costMicro: c.micro, estimated: true, idempotencyKey: ctx.usageKey });
      return Buffer.from(await v.arrayBuffer());
    }
  }
  throw new Error(L("Délai dépassé pour la génération Veo.", "Veo generation timed out."));
}

/**
 * Image d'ouverture d'un plan UGC : une personne générée tient ou utilise le produit réel.
 * Le détourage du produit est fourni en référence (forme, étiquette, couleurs à conserver) ;
 * `persona` (image du premier plan) garde la même personne et le même décor d'un plan à l'autre.
 */
export async function ugcFrame(ctx: Ctx, input: { prompt: string; product: Buffer; persona?: Buffer; aspect: "9:16" | "16:9"; subject?: "product" | "service" }) {
  const provider = imageProviderAvailable();
  if (!provider) throw new UserFacingError(L("Aucun fournisseur d'images configuré (Google Gemini ou OpenAI) pour créer la personne de la vidéo UGC.", "No image provider configured (Google Gemini or OpenAI) to create the person in the UGC video."));
  const product = await sharp(input.product).flatten({ background: "#ffffff" }).resize(1024, 1024, { fit: "contain", background: "#ffffff" }).jpeg({ quality: 90 }).toBuffer();
  const persona = input.persona ? await sharp(input.persona).resize(768, 768, { fit: "inside" }).jpeg({ quality: 85 }).toBuffer() : null;
  // Entreprise de services : la première image n'est qu'une référence d'ambiance (lieu, couleurs), pas un produit à tenir.
  const subject = input.subject === "service"
    ? "The first reference image only gives the mood, colors and kind of place of the business: do not copy any person from it, add no text, logo, diploma or certificate. The presenter is not a customer."
    : "The product shown in the first reference image must appear exactly as it is: same shape, proportions, label, logo, text and colors; do not redesign it, do not add another product.";
  const text = `${input.prompt}
${subject}${persona ? " Keep the same person, outfit and room as in the second reference image." : ""}
Authentic smartphone video still, natural light, realistic skin and hands, no text overlay, no watermark. Aspect ratio ${input.aspect}.`;
  if (provider === "google") {
    const key = activeProviderKey("google")!;
    const route = routeFor("image_generation");
    const model = route.provider === "google" ? route.model : "gemini-2.5-flash-image";
    gate(ctx, cost("google", model, { images: 1 }).micro, "image");
    const parts: any[] = [{ text }, { inline_data: { mime_type: "image/jpeg", data: product.toString("base64") } }];
    if (persona) parts.push({ inline_data: { mime_type: "image/jpeg", data: persona.toString("base64") } });
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: input.aspect } } }),
    });
    if (r.status === 401 || r.status === 403) throw new PermanentError(L("Clé Google refusée : vérifiez-la dans l'administration.", "Google key rejected: check it in the admin panel."));
    if (r.status === 400) throw new PermanentError(L("Requête refusée par Gemini : ", "Request rejected by Gemini: ") + (await r.text()).slice(0, 300));
    if (!r.ok) throw new Error(`Gemini ${r.status}${L(" : ", ": ")}${(await r.text()).slice(0, 200)}`);
    const j: any = await r.json();
    const img = j.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData || p.inline_data);
    const b64 = img?.inlineData?.data ?? img?.inline_data?.data;
    if (!b64) throw new Error(L("Gemini n'a pas renvoyé d'image (contenu filtré ou indisponible).", "Gemini returned no image (content filtered or unavailable)."));
    recordMedia({ userId: ctx.userId, projectId: ctx.projectId, jobId: ctx.jobId, task: "image_generation", provider: "google", model, unit: "image", quantity: 1, costMicro: cost("google", model, { images: 1 }).micro, estimated: true, idempotencyKey: ctx.usageKey });
    return Buffer.from(b64, "base64");
  }
  const key = activeProviderKey("openai")!;
  const route = routeFor("image_generation");
  const model = route.provider === "openai" ? route.model : "gpt-image-1";
  gate(ctx, cost("openai", model, { input: 400, imageIn: 3000, imageOut: 6300 }).micro, "image");
  const client = new OpenAI({ apiKey: key, maxRetries: 2, timeout: 300_000 });
  const images = [await toFile(product, "produit.jpg", { type: "image/jpeg" })];
  if (persona) images.push(await toFile(persona, "personne.jpg", { type: "image/jpeg" }));
  let res: any;
  try {
    res = await client.images.edit({ model, image: images as any, prompt: text, size: input.aspect === "9:16" ? "1024x1536" : "1536x1024", quality: "high" } as any);
  } catch (e: any) {
    if (e?.status === 401 || e?.status === 403) throw new PermanentError(L("Clé OpenAI refusée : vérifiez-la dans l'administration.", "OpenAI key rejected: check it in the admin panel."));
    if (e?.status === 400) throw new PermanentError(L(`Requête refusée par OpenAI : ${String(e?.message ?? "").slice(0, 300)}`, `Request rejected by OpenAI: ${String(e?.message ?? "").slice(0, 300)}`));
    throw e;
  }
  const b64 = res.data?.[0]?.b64_json;
  if (!b64) throw new Error(L("OpenAI n'a pas renvoyé d'image.", "OpenAI returned no image."));
  const u = res.usage ?? {};
  recordMedia({ userId: ctx.userId, projectId: ctx.projectId, jobId: ctx.jobId, task: "image_generation", provider: "openai", model, unit: "tokens", inputUnits: u.input_tokens ?? 0, outputUnits: u.output_tokens ?? 0, quantity: 1, costMicro: cost("openai", model, { input: u.input_tokens_details?.text_tokens ?? 0, imageIn: u.input_tokens_details?.image_tokens ?? 0, imageOut: u.output_tokens ?? 0 }).micro, estimated: !res.usage, idempotencyKey: ctx.usageKey });
  return Buffer.from(b64, "base64");
}

/** Réglage « personnes » de Veo en image → vidéo : Veo 3 n'accepte que « allow_adult ». */
export function veoPersonGeneration(model: string, people: boolean): "allow_adult" | "dont_allow" {
  return people || /^veo-3/.test(model) ? "allow_adult" : "dont_allow";
}

/** Plan vidéo via fal.ai (file d'attente officielle). */
export async function falClip(ctx: Ctx, input: { image: Buffer; prompt: string; seconds?: number }, onWait?: (msg: string) => void) {
  const key = activeProviderKey("fal");
  if (!key) throw new UserFacingError(L("Aucune clé fal.ai configurée.", "No fal.ai key configured."));
  const route = routeFor("video_generation");
  const model = route.provider === "fal" ? route.model : "fal-ai/kling-video/v2.1/pro/image-to-video";
  const seconds = input.seconds ?? 5;
  gate(ctx, cost("fal", model, { seconds }).micro, "video");
  const dataUri = `data:image/jpeg;base64,${(await sharp(input.image).jpeg({ quality: 90 }).toBuffer()).toString("base64")}`;
  const headers = { Authorization: `Key ${key}`, "Content-Type": "application/json" };
  const r = await fetch(`https://queue.fal.run/${model}`, { method: "POST", headers, body: JSON.stringify({ prompt: input.prompt, image_url: dataUri, duration: String(seconds) }) });
  if (r.status === 401 || r.status === 403) throw new PermanentError(falRefusal(r.status, await r.text().catch(() => "")));
  if (!r.ok) throw new PermanentError(L("fal.ai a refusé la demande : ", "fal.ai rejected the request: ") + (await r.text()).slice(0, 300));
  const q: any = await r.json();
  for (let i = 0; i < 120; i++) {
    await new Promise((res) => setTimeout(res, 6000));
    onWait?.(L(`Génération du plan vidéo (${(i + 1) * 6} s)…`, `Generating the video shot (${(i + 1) * 6} s)…`));
    const st: any = await (await fetch(q.status_url, { headers })).json();
    if (st.status === "COMPLETED") {
      const out: any = await (await fetch(q.response_url, { headers })).json();
      const url = out.video?.url;
      if (!url) throw new PermanentError(L("fal.ai n'a renvoyé aucune vidéo.", "fal.ai returned no video."));
      const v = await fetch(url);
      const c = cost("fal", model, { seconds });
      recordMedia({ userId: ctx.userId, projectId: ctx.projectId, jobId: ctx.jobId, task: "video_generation", provider: "fal", model, unit: "video_second", quantity: seconds, costMicro: c.micro, estimated: true, idempotencyKey: ctx.usageKey });
      return Buffer.from(await v.arrayBuffer());
    }
    if (st.status === "FAILED" || st.status === "ERROR") throw new PermanentError(L("La génération fal.ai a échoué.", "fal.ai generation failed."));
  }
  throw new Error(L("Délai dépassé pour la génération fal.ai.", "fal.ai generation timed out."));
}

/** Vérification de clé depuis l'administration (appel léger, sans génération). */
export async function pingProvider(p: "openai" | "google" | "fal"): Promise<string> {
  const key = activeProviderKey(p);
  if (!key) throw new Error(L("Aucune clé enregistrée.", "No key saved."));
  if (p === "openai") {
    const r = await fetch("https://api.openai.com/v1/models", { headers: { Authorization: `Bearer ${key}` } });
    if (!r.ok) throw new Error(`OpenAI ${r.status}`);
    return L("Clé OpenAI valide.", "OpenAI key is valid.");
  }
  if (p === "google") {
    const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models", { headers: { "x-goog-api-key": key } });
    if (!r.ok) throw new Error(`Google ${r.status}`);
    return L("Clé Gemini valide.", "Gemini key is valid.");
  }
  const shape = falKeyShapeProblem(key);
  if (shape) throw new Error(shape);
  const r = await fetch("https://queue.fal.run/fal-ai/fast-sdxl/requests/00000000-0000-0000-0000-000000000000/status", { headers: { Authorization: `Key ${key}` } });
  if (r.status === 401 || r.status === 403) throw new Error(falRefusal(r.status, await r.text().catch(() => "")));
  return L("Clé fal.ai acceptée.", "fal.ai key accepted.");
}

/** Une clé fal.ai a la forme « identifiant:secret » : sans les deux-points, elle a été copiée en partie. */
export function falKeyShapeProblem(key: string): string | null {
  return /^[^:\s]+:[^:\s]+$/.test(key) ? null : L("Clé fal.ai incomplète : elle doit contenir deux parties séparées par « : » (identifiant:secret). Recopiez-la en entier depuis fal.ai › API Keys, ou créez-en une nouvelle.", "Incomplete fal.ai key: it must have two parts separated by \":\" (id:secret). Copy it in full from fal.ai › API Keys, or create a new one.");
}

/** Raison d'un refus de fal.ai, en clair : crédit épuisé (compte bloqué) ou clé invalide, avec le message de fal.ai. */
export function falRefusal(status: number, body: string): string {
  let detail = body;
  try { const j = JSON.parse(body); detail = typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail ?? j); } catch { /* texte brut */ }
  detail = detail.replace(/\s+/g, " ").trim().slice(0, 200);
  if (/balance|locked|billing|credit|payment/i.test(detail))
    return L(`Clé fal.ai reconnue, mais le compte fal.ai est bloqué faute de crédit. Ajoutez du crédit sur fal.ai › Billing, puis testez à nouveau. (fal.ai : ${detail})`, `fal.ai key recognised, but the fal.ai account is locked for lack of credit. Add credit in fal.ai › Billing, then test again. (fal.ai: ${detail})`);
  return L(`Clé fal.ai refusée (${status}${detail ? ` : ${detail}` : ""}). Vérifiez qu'elle est copiée en entier et qu'elle n'a pas été supprimée sur fal.ai.`, `fal.ai key rejected (${status}${detail ? `: ${detail}` : ""}). Check it is copied in full and has not been deleted on fal.ai.`);
}
