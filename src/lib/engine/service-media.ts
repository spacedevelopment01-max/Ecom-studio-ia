/**
 * Médias d'une entreprise de services (artisan, coach, salon, cabinet, agence, restaurant…).
 * Pas de produit à détourer : les visuels partent des photos réelles fournies (réalisations, équipe, lieu)
 * ou, sans photo, d'une composition typographique et graphique à la marque. Les textes viennent de l'offre
 * réelle (`project.services`) : jamais d'avis, de chiffres, de tarifs ou de diplômes inventés.
 * Avec une IA d'images : images d'ambiance de l'activité, sous consignes d'honnêteté.
 */
import sharp from "sharp";
import { loadImage } from "@napi-rs/canvas";
import { z } from "zod";
import { all, json } from "../db";
import { assetData, saveAsset, type Asset } from "../library";
import { loadProject, type Project } from "../projects";
import type { ServiceItem } from "../project-types";
import { FORMATS, renderServiceCard, type Format } from "../media/compose";
import { renderServiceCreatives, SERVICE_SIZES, type ServiceCard, type ServiceFormat, type ServiceIcon } from "../media/creative-html";
import type { VideoFormat, VideoScene, VideoSpec } from "../media/video";
import { ambianceImage, imageProviderAvailable, refundMediaQuota } from "../ai/media-providers";
import { aiQcScene, qcScore, qcTier, type QcTier } from "../ai/tasks";
import { llmConfigured, llmJson } from "../ai/llm";
import { projectContext } from "../ai/context";
import { JobCancelled, JobPaused, UserFacingError, type JobContext } from "../jobs";
import { C, L } from "../i18n-server";
import { brandTypo, palette } from "./images";
import { paletteKey } from "../route-palette";
import { avoidPrompt, photoLine, photoLineInput, photoLinePrompt } from "./photo-line";

// ---------------------------------------------------------------- textes (purs, testables)


/** Contrôle obligatoire d'une image d'ambiance générée (aucun texte ou logo inventé, aucune personne déformée). */
async function checkAmbiance(b: { userId: string; projectId: string; jobId?: string | null; usageKey: string }, img: Buffer): Promise<{ ok: boolean; tier: QcTier; reason: string }> {
  if (!llmConfigured()) return { ok: false, tier: "warn", reason: L("contrôle indisponible : vérifiez l'image", "check unavailable: check the image") };
  let r: Awaited<ReturnType<typeof aiQcScene>>;
  try {
    r = await aiQcScene(b, img);
  } catch (e) {
    if (e instanceof JobCancelled || e instanceof JobPaused) throw e;
    return { ok: false, tier: "warn", reason: L("contrôle automatique impossible : vérifiez l'image", "automatic check unavailable: check the image") };
  }
  const tier = qcTier(r);
  return { ok: tier === "good", tier, reason: tier === "good" ? "" : r.issues.join(L(" ; ", "; ")) || `${qcScore(r.score)}/10` };
}

/**
 * Image d'ambiance contrôlée, avec UNE reprise corrigée si elle est ratée : la consigne reprend les défauts relevés
 * pour qu'ils ne se reproduisent pas. Le raté n'est ni gardé ni décompté au client ; seule la meilleure des deux
 * images est rendue (le but : pas de raté livré, pas de dépense sans image utilisable).
 */
async function ambianceChecked(ictx: { userId: string; projectId: string; jobId?: string | null }, usageKey: string, input: Parameters<typeof ambianceImage>[1]): Promise<{ img: Buffer; check: Awaited<ReturnType<typeof checkAmbiance>>; usageKey: string }> {
  const img = await ambianceImage({ ...ictx, usageKey }, input);
  const check = await checkAmbiance({ ...ictx, usageKey: `${usageKey}:qc` }, img);
  if (check.tier !== "bad") return { img, check, usageKey };
  refundMediaQuota(ictx.userId, usageKey);
  const retryKey = `${usageKey}:retry`;
  try {
    const img2 = await ambianceImage({ ...ictx, usageKey: retryKey }, { ...input, prompt: `${input.prompt} A previous attempt was rejected for: ${check.reason}. Avoid exactly these defects.` });
    const check2 = await checkAmbiance({ ...ictx, usageKey: `${retryKey}:qc` }, img2);
    return { img: img2, check: check2, usageKey: retryKey };
  } catch (e) {
    if (e instanceof JobCancelled || e instanceof JobPaused) throw e;
    return { img, check, usageKey };
  }
}

export const isServices = (p: Pick<Project, "business"> | null | undefined) => p?.business === "services";

const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || C("activite", "business");

/** Coupe un texte sur un mot (jamais au milieu), sans points de suspension inventés au-delà d'un « … ». */
export function clip(text: string | undefined, max: number): string {
  const t = (text ?? "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const first = t.split(/(?<=[.!?])\s/)[0];
  if (first.length <= max) return first;
  return `${t.slice(0, max - 1).replace(/\s+\S*$/, "").replace(/[\s,;:–-]+$/, "")}…`;
}

/** Nom de l'activité (pour un service, `product` décrit l'activité). */
export const activityName = (p: Project) => p.product.name || p.brand?.name || p.name;

/** Prestations réellement saisies (nom non vide). */
export const serviceItems = (p: Project): ServiceItem[] => (p.services?.services ?? []).filter((s) => s.name?.trim());

/** Durée et tarif, uniquement s'ils ont été donnés par le client. */
export const serviceMeta = (s: ServiceItem) => [s.duration?.trim(), s.price?.trim()].filter(Boolean) as string[];

/** Appel à l'action selon le mode de contact choisi (jamais « Acheter »). */
export function serviceCta(p: Project, short = false): string {
  switch (p.services?.contactMode) {
    case "booking": return short ? C("Réserver", "Book now") : C("Prenez rendez-vous", "Book an appointment");
    case "quote": return short ? C("Demander un devis", "Get a quote") : C("Demandez votre devis", "Request a quote");
    case "call": return short ? C("Appeler", "Call us") : C("Appelez-nous", "Give us a call");
    default: return short ? C("Nous contacter", "Contact us") : C("Contactez-nous", "Get in touch");
  }
}

const host = (u: string) => u.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/$/, "");

/** Mention courte du mode de contact (pastille), jamais de promesse (« gratuit », « 24 h/24 »). */
export function modeLabel(p: Project): string {
  switch (p.services?.contactMode) {
    case "booking": return C("Sur rendez-vous", "By appointment");
    case "quote": return C("Sur devis", "Quote on request");
    case "call": return C("Par téléphone", "By phone");
    default: return "";
  }
}

/** Ligne de contact (téléphone, lien de réservation ou e-mail), si elle existe. */
export function contactLine(p: Project): string {
  const s = p.services;
  if (!s) return "";
  if (s.contactMode === "call" && s.phone) return s.phone;
  if (s.contactMode === "booking" && s.bookingUrl) return host(s.bookingUrl);
  return s.phone || (s.bookingUrl ? host(s.bookingUrl) : "") || s.email || "";
}

/** Lieu : zone d'intervention ou adresse d'accueil. */
export const placeLine = (p: Project) => (p.services?.area || p.services?.address || "").trim();

/** Infos pratiques réellement renseignées (aucune ligne vide ni inventée). */
export function infoRows(p: Project): { icon: ServiceIcon; text: string }[] {
  const s = p.services;
  if (!s) return [];
  const rows: { icon: ServiceIcon; text: string }[] = [];
  if (s.hours?.trim()) rows.push({ icon: "clock", text: s.hours.trim() });
  if (s.area?.trim()) rows.push({ icon: "pin", text: C(`Zone : ${s.area.trim()}`, `Area: ${s.area.trim()}`) });
  if (s.address?.trim() && s.address.trim() !== s.area?.trim()) rows.push({ icon: "pin", text: s.address.trim() });
  if (s.phone?.trim()) rows.push({ icon: "phone", text: s.phone.trim() });
  if (s.email?.trim()) rows.push({ icon: "mail", text: s.email.trim() });
  if (s.bookingUrl?.trim()) rows.push({ icon: "web", text: host(s.bookingUrl.trim()) });
  return rows.slice(0, 5);
}

/** Citation de marque : signature ou première phrase de l'histoire, attribuée à la marque (jamais à un client). */
export function brandQuote(p: Project): { text: string; author: string } | null {
  const t = (p.brand?.tagline ?? "").trim();
  const story = (p.brand?.story ?? "").split(/(?<=[.!?])\s/)[0]?.trim() ?? "";
  const text = t.length >= 12 ? t : story.length >= 20 && story.length <= 150 ? story : "";
  return text ? { text: text.replace(/^[«"“]\s*|\s*[»"”]$/g, ""), author: p.brand?.name ?? activityName(p) } : null;
}

export type CardPlan = { card: Omit<ServiceCard, "photo"> & { photo?: number }; role: "banner" | "social" | "ad"; folder: string; name: string; group?: string };

/**
 * Jeu de visuels d'une activité de services, à partir de l'offre réelle. `photos` : nombre de photos disponibles
 * (réalisations, équipe, lieu, ambiances) ; une carte référence une photo par son index.
 * `tips` : conseils d'expert (écrits par l'IA ou le client) ; sans eux, le carrousel détaille les prestations.
 */
export function serviceCardPlan(p: Project, photos: number, tips?: { title: string; items: { title: string; text: string }[] } | null, assign?: Partial<Record<PhotoSlot, number>>): CardPlan[] {
  const out: CardPlan[] = [];
  const name = activityName(p);
  const items = serviceItems(p);
  const cta = serviceCta(p);
  const ctaShort = serviceCta(p, true);
  const contact = contactLine(p);
  const place = placeLine(p);
  const ph = (i: number) => (photos ? i % photos : undefined);
  // Emplacement d'image de chaque visuel (une image différente par visuel ; mêmes formats d'une publicité = même image).
  const at = (slot: PhotoSlot, i: number) => (assign && assign[slot] !== undefined ? assign[slot] : ph(i));
  const tagline = p.brand?.tagline || name;
  const summary = clip(p.product.summary, 140);

  // Bannières du site : prestations (avec texte), puis ouverture (sans texte, enregistrée en dernier = choisie par le site).
  if (items.length) out.push({ role: "banner", folder: "images.banners", name: C("banniere-prestations", "services-banner"), card: { template: "services", format: "landscape", eyebrow: name, title: C("Nos prestations", "Our services"), items: items.map((s) => ({ name: clip(s.name, 48), meta: serviceMeta(s).join(" · ") })), cta, contact, photo: at("banner", 1) } });
  else out.push({ role: "banner", folder: "images.banners", name: C("banniere-activite", "business-banner"), card: { template: "announce", format: "landscape", eyebrow: name, title: tagline, text: summary, cta, contact, photo: at("banner", 1) } });

  // Réseaux : annonce d'une prestation (deux au plus), carrousel, citation, infos pratiques.
  const announce = items.length ? items.slice(0, 2) : [null];
  announce.forEach((s, i) => out.push({ role: "social", folder: "images.social", name: s ? `${C("prestation", "service")}-${slug(s.name)}` : C("annonce-activite", "business-post"), card: s ? { template: "announce", format: "portrait", eyebrow: C("Prestation", "Service"), title: clip(s.name, 60), text: clip(s.description, 150), chips: serviceMeta(s), cta, photo: at(`service:${i}` as PhotoSlot, i) } : { template: "announce", format: "portrait", eyebrow: name, title: tagline, text: summary, cta, photo: at("service:0", 0) } }));

  const slides = tips?.items.length ? tips.items.slice(0, 4).map((t) => ({ title: clip(t.title, 70), text: clip(t.text, 260) })) : items.slice(0, 4).map((s) => ({ title: clip(s.name, 70), text: clip([s.description, serviceMeta(s).join(" · ")].filter(Boolean).join(" · "), 260) }));
  if (slides.length) {
    const total = slides.length + 2;
    const group = tips?.items.length ? "tips" : "services";
    const coverTitle = tips?.items.length ? clip(tips.title, 80) : C(`${name} : nos prestations en détail`, `${name}: our services in detail`);
    const eyebrow = tips?.items.length ? C("Conseil d'expert", "Expert tip") : C("Nos prestations", "Our services");
    out.push({ role: "social", folder: "images.social", group, name: `${C("carrousel", "carousel")}-${group}-01`, card: { template: "carousel-cover", format: "square", eyebrow, title: coverTitle, index: 1, total, swipe: C("Faites glisser", "Swipe") } });
    slides.forEach((s, k) => out.push({ role: "social", folder: "images.social", group, name: `${C("carrousel", "carousel")}-${group}-${String(k + 2).padStart(2, "0")}`, card: { template: "carousel-slide", format: "square", eyebrow, title: s.title, text: s.text, index: k + 2, total } }));
    out.push({ role: "social", folder: "images.social", group, name: `${C("carrousel", "carousel")}-${group}-${String(total).padStart(2, "0")}`, card: { template: "carousel-end", format: "square", eyebrow: name, title: cta, text: place, contact, cta: ctaShort, index: total, total } });
  }
  const q = brandQuote(p);
  if (q) out.push({ role: "social", folder: "images.social", name: C("citation", "quote"), card: { template: "quote", format: "square", title: q.text, author: `— ${q.author}` } });
  const rows = infoRows(p);
  if (rows.length) out.push({ role: "social", folder: "images.social", name: C("infos-pratiques", "practical-info"), card: { template: "info", format: "portrait", eyebrow: name, title: rows.some((r) => r.icon === "clock") && place ? C("Horaires et zone", "Hours and area") : rows.some((r) => r.icon === "clock") ? C("Nos horaires", "Opening hours") : C("Infos pratiques", "Practical info"), rows, cta } });

  // Publicités : « Prenez rendez-vous » aux formats des régies (9:16, 1:1, 16:9).
  const adText = [name, place].filter(Boolean).join(" · ");
  out.push({ role: "ad", folder: "images.ads", name: `${C("publicite", "ad")}-9x16`, card: { template: "booking", format: "story", eyebrow: modeLabel(p) || name, title: cta, text: adText, contact, cta: ctaShort, photo: at("ad", 0) } });
  out.push({ role: "ad", folder: "images.ads", name: `${C("publicite", "ad")}-1x1`, card: { template: "booking", format: "square", eyebrow: name, title: items[0] ? clip(items[0].name, 60) : tagline, text: items[0] ? clip(items[0].description, 110) : summary, chips: items[0] ? serviceMeta(items[0]) : [], cta: ctaShort, photo: at("ad", 1) } });
  out.push({ role: "ad", folder: "images.ads", name: `${C("publicite", "ad")}-16x9`, card: { template: "booking", format: "landscape", eyebrow: name, title: cta, text: [summary || tagline, place].filter(Boolean).join(" · "), contact, cta: ctaShort, photo: at("ad", 2) } });

  out.push({ role: "banner", folder: "images.banners", name: C("banniere-ouverture", "hero-banner"), card: { template: "graphic", format: "banner", photo: at("hero", 0) } });
  return out;
}

// ---------------------------------------------------------------- photos de l'activité

/**
 * Photos réelles fournies par le client (réalisations, équipe, lieu : importées au départ comme photos de
 * l'activité, ou originaux), sans les photos refusées.
 */
export function realActivityPhotos(projectId: string): Asset[] {
  return all<Asset>("SELECT * FROM assets WHERE project_id = ? AND kind = 'image' AND deleted_at IS NULL AND status != 'rejected' AND (role = 'original' OR (role = 'lifestyle' AND origin != 'generated')) ORDER BY created_at LIMIT 8", projectId);
}

/** Photos réelles d'abord, puis ambiances générées par IA. */
/**
 * Nouvelle piste de logo : les bannières du site sans photo (compositions typographiques) sont redessinées
 * aux nouvelles couleurs, sans IA. Celles faites avec une photo réelle gardent leur photo et sont aussi refaites.
 */
export async function refreshSiteBanners(projectId: string) {
  const p = loadProject(projectId);
  if (p.business !== "services" || !p.brand) return [];
  const photos = activityPhotos(projectId);
  const plan = serviceCardPlan(p, photos.length, null, assignPhotoSlots(p, photos)).filter((x) => x.role === "banner");
  const saved = await saveCards(p, plan.map((x) => ({ ...x, photoAsset: x.card.photo !== undefined ? photos[x.card.photo] : undefined })), `piste-${Date.now().toString(36)}`);
  return saved.map((s) => s.id);
}

export function activityPhotos(projectId: string): Asset[] {
  const amb = all<Asset>("SELECT * FROM assets WHERE project_id = ? AND role = 'lifestyle' AND origin = 'generated' AND kind = 'image' AND deleted_at IS NULL AND status != 'rejected' ORDER BY created_at DESC LIMIT 8", projectId);
  return [...realActivityPhotos(projectId), ...amb];
}

/**
 * Emplacements d'image des visuels d'une activité de services : chaque visuel a sa propre image (une même image
 * n'est reprise que pour les formats d'un même visuel : la publicité en 9:16, 1:1 et 16:9).
 */
export type PhotoSlot = "hero" | "banner" | "service:0" | "service:1" | "ad";

/** Emplacements à illustrer, dans l'ordre d'importance (les vraies photos du client les remplissent en premier). */
export function photoSlots(p: Project): PhotoSlot[] {
  const announced = Math.max(1, Math.min(2, serviceItems(p).length));
  return ["hero", "banner", ...(["service:0", "service:1"] as PhotoSlot[]).slice(0, announced), "ad"];
}

/**
 * Image de chaque emplacement : les vraies photos du client d'abord (une par visuel), puis l'image d'ambiance
 * générée pour cet emplacement, puis une image encore inutilisée ; en dernier recours seulement, une image déjà prise.
 */
export function assignPhotoSlots(p: Project, pool: Asset[]): Partial<Record<PhotoSlot, number>> {
  const slots = photoSlots(p);
  const out: Partial<Record<PhotoSlot, number>> = {};
  if (!pool.length) return out;
  const used = new Set<number>();
  const slotOf = (a: Asset) => (a.origin === "generated" ? (json<any>(a.meta as any, {}).slot as PhotoSlot | undefined) : undefined);
  const real = pool.map((a, i) => (a.origin !== "generated" ? i : -1)).filter((i) => i >= 0);
  let r = 0;
  for (const slot of slots) {
    if (r < real.length) {
      out[slot] = real[r++];
      used.add(out[slot]!);
      continue;
    }
    const own = pool.findIndex((a, i) => !used.has(i) && slotOf(a) === slot);
    const free = own >= 0 ? own : pool.findIndex((a, i) => !used.has(i) && !slotOf(a));
    const any = free >= 0 ? free : pool.findIndex((_, i) => !used.has(i));
    out[slot] = any >= 0 ? any : slots.indexOf(slot) % pool.length;
    used.add(out[slot]!);
  }
  return out;
}

/**
 * Image IA propre à une publication du calendrier (une image différente par publication), d'après son sujet, au
 * format du réseau. Contrôle qualité comme les ambiances ; refusée ou impossible (pas d'IA d'images, quota épuisé) :
 * null, et la publication reprend une photo existante. Rôle à part (« post-photo ») : elle ne prend jamais la place
 * des images des visuels de l'onglet Images.
 */
export async function postAmbiance(ictx: { userId: string; projectId: string; jobId?: string | null }, p: Project, post: { key: string; topic: string; aspect: "1:1" | "4:5" | "9:16" | "16:9"; name: string }): Promise<Asset | null> {
  if (!imageProviderAvailable()) return null;
  const [, , base, look] = ambianceParts(p);
  const prompt = `${base} Photograph illustrating this social media post: "${clip(post.topic, 220)}". Show the real work, tools, materials or place it talks about, a fresh angle and framing specific to this subject. ${look}`;
  const usageKey = `${ictx.jobId ?? "post"}:post-ambiance:${post.key}`;
  let generated = false;
  try {
    const { img, check, usageKey: finalKey } = await ambianceChecked(ictx, usageKey, { prompt, aspect: post.aspect });
    generated = true;
    // Image payée gardée : utilisée si bonne ou à défaut mineur (signalé) ; inutilisable → écartée mais visible.
    const a = await saveAsset({ projectId: p.id, userId: p.userId, data: await sharp(img).jpeg({ quality: 92 }).toBuffer(), name: post.name, mime: "image/jpeg", role: "post-photo", folderKey: "content.calendar", origin: "generated", meta: { recipe: L("Image générée par IA pour cette publication (illustration, pas une photo de vos clients ni de vos locaux)", "AI-generated image for this post (illustration, not a photo of your customers or premises)"), aiGenerated: true, business: "services", format: post.aspect, ...(check.tier === "good" ? {} : { qcWarning: check.reason }) }, status: check.tier === "bad" ? "rejected" : "review" });
    if (check.tier === "bad") {
      refundMediaQuota(ictx.userId, finalKey);
      return null;
    }
    return a;
  } catch (e) {
    if (e instanceof JobCancelled || e instanceof JobPaused) throw e;
    console.warn("[calendrier] image de publication indisponible :", (e as Error).message);
    // Image faite mais non montrée (contrôle qualité ou enregistrement en échec) : le visuel n'est pas décompté.
    if (generated) refundMediaQuota(ictx.userId, usageKey);
    return null;
  }
}

/** Consignes d'ambiance par emplacement (une image IA par visuel), pour ceux que les vraies photos ne couvrent pas. */
export function ambianceSlots(p: Project): { slot: PhotoSlot; aspect: "16:9" | "4:5" | "1:1"; prompt: string }[] {
  const [place, hands, base, look] = ambianceParts(p);
  const items = serviceItems(p);
  const serviceShot = (i: number) => {
    const s = items[i];
    return s
      ? `${base} The service "${s.name}"${s.description ? ` (${clip(s.description, 160)})` : ""} in progress: the tools and materials of this specific job on site, the result taking shape, 50mm lens, natural light, no people, no hands. ${look}`
      : `${base} A typical job of this activity in progress, tools and materials in place, 35mm lens, natural light, no people, no hands. ${look}`;
  };
  const all: { slot: PhotoSlot; aspect: "16:9" | "4:5" | "1:1"; prompt: string }[] = [
    { slot: "hero", aspect: "16:9", prompt: place },
    { slot: "banner", aspect: "16:9", prompt: `${base} Wide view of a finished, high-quality job typical of this activity, clean and well lit, nobody in frame, real materials visible, 24mm lens. ${look}` },
    { slot: "service:0", aspect: "4:5", prompt: serviceShot(0) },
    { slot: "service:1", aspect: "4:5", prompt: serviceShot(1) },
    { slot: "ad", aspect: "1:1", prompt: hands },
  ];
  const wanted = new Set(photoSlots(p));
  return all.filter((x) => wanted.has(x.slot));
}

/** Consignes d'ambiance pour l'IA d'images (anglais pour les modèles), à partir de l'activité réelle. */
export function ambiancePrompts(p: Project): string[] {
  const [place, hands] = ambianceParts(p);
  return [place, hands];
}

/** Lieu, gestes, contexte de l'activité et ligne photographique de la marque (communs à toutes les ambiances). */
function ambianceParts(p: Project): [string, string, string, string] {
  const what = [p.product.category, p.product.summary || activityName(p)].filter(Boolean).join(" — ");
  const services = serviceItems(p).slice(0, 4).map((s) => s.name).join(", ");
  const base = `Business activity: ${what}.${services ? ` Services offered: ${services}.` : ""}${placeLine(p) ? ` Location: ${placeLine(p)}.` : ""}`;
  // Ligne photographique de la marque : ambiances, bannières et visuels forment une même campagne.
  const line = photoLine(photoLineInput(p));
  const look = `${photoLinePrompt(line)} ${avoidPrompt(line)}`;
  return [
    `${base} The place where this activity happens (workshop, practice room, studio, salon or venue), tidy, lived-in and inviting, seen at eye level with a 35mm lens, nobody looking at the camera, real tools and materials of the trade visible. ${look}`,
    `${base} Close-up of the real tools and materials of this activity on the work surface, a job in progress, 50mm lens slightly above, shallow depth of field, the tools sharp and the background soft. No people, no hands. ${look}`,
    base,
    look,
  ];
}

const aspectFor = (f: ServiceFormat | "product"): "1:1" | "4:5" | "9:16" | "16:9" => (f === "story" ? "9:16" : f === "square" ? "1:1" : f === "landscape" || f === "banner" ? "16:9" : "4:5");

// ---------------------------------------------------------------- conseils d'expert (IA)

const TipsSchema = z.object({ title: z.string(), tips: z.array(z.object({ title: z.string(), text: z.string() })).min(2).max(4) });

/** Conseils pratiques écrits par l'IA pour le carrousel : généraux, vérifiables, sans chiffre ni promesse. */
export async function aiServiceTips(b: { userId: string; projectId: string; jobId?: string | null; usageKey?: string }, p: Project, topic?: string) {
  const r = await llmJson(
    {
      task: "copywriting",
      userId: b.userId,
      projectId: b.projectId,
      jobId: b.jobId,
      usageKey: b.usageKey,
      system: C(
        "Tu écris des carrousels « conseil d'expert » pour une entreprise de services. Conseils pratiques, généraux et vérifiables, utiles au client final. Interdits : chiffres, statistiques, pourcentages, délais, tarifs, promesses de résultat, avis ou témoignages, diplômes, labels, certifications, comparaison avec des concurrents, conseil médical ou juridique personnalisé. Phrases courtes, ton de la marque, en français.",
        "You write \"expert tip\" carousels for a service business. Practical, general, verifiable advice that helps the end customer. Forbidden: figures, statistics, percentages, timeframes, prices, promises of results, reviews or testimonials, diplomas, labels, certifications, comparisons with competitors, personalized medical or legal advice. Short sentences, in the brand's tone, in English.",
      ),
      context: projectContext(p, "images"),
      prompt: C(
        `Sujet : ${topic || "un conseil utile lié aux prestations"}. Réponds { "title": "titre de couverture (8 mots max)", "tips": [{ "title": "6 mots max", "text": "2 phrases max" }] } avec 3 conseils.`,
        `Topic: ${topic || "a useful tip related to the services"}. Reply { "title": "cover title (8 words max)", "tips": [{ "title": "6 words max", "text": "2 sentences max" }] } with 3 tips.`,
      ),
      maxTokens: 1500,
    },
    TipsSchema,
  );
  const banned = /\d+\s?(%|€|\$|ans|years|jours|days|semaines|weeks|mois|months)|dipl[oô]m|certifi|label|garanti|guarantee|avis|review|témoign|testimon/i;
  const items = r.tips.filter((t) => !banned.test(`${t.title} ${t.text}`));
  return items.length >= 2 ? { title: r.title, items } : null;
}

/** Conseils saisis par le client : une ligne par conseil, « Titre : texte » ou texte seul. */
export function parseTips(lines: string[]): { title: string; text: string }[] {
  return lines.map((l) => l.trim()).filter(Boolean).slice(0, 4).map((l) => {
    const m = l.match(/^(.{3,70}?)\s*[:–-]\s+(.+)$/);
    const cap = (t: string) => t.charAt(0).toLocaleUpperCase() + t.slice(1);
    return m ? { title: m[1].trim(), text: cap(m[2].trim()) } : { title: clip(l, 70), text: l.length > 70 ? l : "" };
  });
}

// ---------------------------------------------------------------- rendu et enregistrement

type Saved = { id: string; role: string };

async function renderCards(p: Project, cards: ServiceCard[]) {
  const brand = { palette: palette(p), typo: brandTypo(p), brand: p.brand?.name ?? p.name };
  const html = await renderServiceCreatives(brand, cards).catch((e) => {
    console.warn("[services] rendu HTML indisponible :", (e as Error).message);
    return null;
  });
  if (html) return html.map((r) => ({ jpg: r.jpg, label: r.label, engine: "html" as const }));
  // Repli sans navigateur : composition Skia (même textes, mise en page simplifiée).
  const out: { jpg: Buffer; label: string; engine: "canvas" }[] = [];
  for (const c of cards) {
    const f: Format = SERVICE_SIZES[c.format];
    const lines = c.items?.map((i) => [i.name, i.meta].filter(Boolean).join(" · ")) ?? c.rows?.map((r) => r.text) ?? (c.chips ?? []);
    out.push({ jpg: await renderServiceCard({ palette: brand.palette, typo: brand.typo, format: f, brand: brand.brand, eyebrow: c.eyebrow, title: c.title ?? "", text: [c.text, c.author].filter(Boolean).join(" "), lines, cta: c.cta, photo: c.photo ? await loadImage(await sharp(c.photo).rotate().jpeg().toBuffer()) : null, textless: c.template === "graphic" }), label: f.label, engine: "canvas" });
  }
  return out;
}

const RECIPE: Record<ServiceCard["template"], [string, string]> = {
  announce: ["Annonce d'une prestation", "Service announcement"],
  "carousel-cover": ["Carrousel : couverture", "Carousel: cover"],
  "carousel-slide": ["Carrousel : page", "Carousel: slide"],
  "carousel-end": ["Carrousel : appel à l'action", "Carousel: call to action"],
  quote: ["Citation de la marque", "Brand quote"],
  info: ["Horaires, zone et contact", "Hours, area and contact"],
  booking: ["Publicité « prise de rendez-vous »", "\"Book an appointment\" ad"],
  services: ["Liste des prestations", "List of services"],
  graphic: ["Bannière d'ouverture sans texte (textes dans le site)", "Hero banner without text (text lives in the site)"],
};

async function saveCards(p: Project, plans: (CardPlan & { photoAsset?: Asset })[], jobId: string): Promise<Saved[]> {
  const cards: ServiceCard[] = plans.map((x) => ({ ...x.card, photo: x.photoAsset ? assetData(x.photoAsset) : null }));
  const rendered = await renderCards(p, cards);
  const base = slug(activityName(p));
  const saved: Saved[] = [];
  for (const [k, r] of rendered.entries()) {
    const x = plans[k];
    const a = await saveAsset({
      projectId: p.id,
      userId: p.userId,
      data: r.jpg,
      name: `${base}-${x.name}-${r.label.replace(":", "x")}.jpg`,
      mime: "image/jpeg",
      role: x.role,
      folderKey: x.folder,
      origin: "generated",
      sourceAssetId: x.photoAsset?.id ?? null,
      meta: {
        recipe: L(RECIPE[x.card.template][0], RECIPE[x.card.template][1]) + (x.photoAsset ? L(" · photo réelle de l'activité", " · real photo of the business") : L(" · composition typographique", " · typographic layout")),
        format: r.label,
        business: "services",
        template: x.card.template,
        text: { headline: x.card.title, sub: x.card.text, cta: x.card.cta },
        ...(x.group ? { carousel: { group: `${jobId}:${x.group}`, index: x.card.index, total: x.card.total } } : {}),
        engine: r.engine,
        // Couleurs avec lesquelles la carte a été dessinée : une carte d'une autre palette n'illustre plus le site.
        palette: paletteKey(palette(p)),
      },
      status: "review",
    });
    saved.push({ id: a.id, role: x.role });
  }
  return saved;
}

/** Photo de l'activité recadrée au format du site (aucune génération, simple recadrage et compression). */
async function photoCrop(buf: Buffer, f: Format) {
  return sharp(buf).rotate().resize(f.w, f.h, { fit: "cover", position: sharp.strategy.attention }).jpeg({ quality: 90, mozjpeg: true }).toBuffer();
}

export type ServiceSetOptions = { withAi?: boolean; social?: boolean; banner?: boolean };

/** Jeu complet pour une entreprise de services. Idempotent par étape (points de reprise du job). */
export async function generateServiceImageSet(ctx: JobContext, projectId: string, opts: ServiceSetOptions = {}) {
  const project = loadProject(projectId);
  const created: string[] = [];
  const base = slug(activityName(project));
  const ictx = { userId: project.userId, projectId, jobId: ctx.job.id };

  // 1. Photos réelles recadrées (4:5 HD) : elles alimentent le site (ouverture, galeries).
  const originals = realActivityPhotos(projectId).slice(0, 6);
  if (originals.length) {
    const ids = await ctx.step("svc:photos", async () => {
      ctx.progress(0.1, L("Recadrage des photos de l'activité", "Cropping the business photos"));
      const out: string[] = [];
      for (const [i, o] of originals.entries()) {
        const a = await saveAsset({ projectId, userId: project.userId, data: await photoCrop(assetData(o), FORMATS.product), name: `${base}-photo-${i + 1}.jpg`, mime: "image/jpeg", role: "scene", folderKey: "images.scenes", origin: "generated", sourceAssetId: o.id, meta: { recipe: L("Photo réelle de l'activité recadrée en 4:5 (aucune génération)", "Real business photo cropped to 4:5 (nothing generated)"), format: FORMATS.product.label, business: "services" }, status: "review" });
        out.push(a.id);
      }
      return out;
    });
    created.push(...ids);
  }

  // 2. Images d'ambiance (IA d'images disponible) : consignes honnêtes, aucun faux client identifiable.
  const withAi = opts.withAi !== false && !!imageProviderAvailable();
  if (withAi) {
    // Une image par visuel : les vraies photos du client couvrent les premiers emplacements, l'IA complète les autres.
    const todo = ambianceSlots(project).slice(realActivityPhotos(projectId).length);
    for (const [i, { slot, aspect, prompt }] of todo.entries()) {
      const ids = await ctx.step(`svc:ambiance:${slot}`, async () => {
        ctx.progress(0.2 + (i / Math.max(1, todo.length)) * 0.3, L("Images d'ambiance de l'activité (IA)", "Business mood images (AI)"));
        let generated = false;
        try {
          const { img, check, usageKey: finalKey } = await ambianceChecked(ictx, `${ctx.job.id}:ambiance:${i}`, { prompt, aspect, reference: originals[i] ? assetData(originals[i]) : null });
          generated = true;
          // Image payée toujours gardée : défaut mineur signalé ; inutilisable (texte inventé, mains déformées…)
          // écartée mais visible dans Images, non utilisée et non décomptée.
          if (check.tier === "bad") refundMediaQuota(ictx.userId, finalKey);
          const a = await saveAsset({ projectId, userId: project.userId, data: await sharp(img).jpeg({ quality: 92 }).toBuffer(), name: `${base}-${C("ambiance", "mood")}-${i + 1}.jpg`, mime: "image/jpeg", role: "lifestyle", folderKey: "images.scenes", origin: "generated", meta: { recipe: L("Image d'ambiance générée par IA (illustration, pas une photo de vos clients ni de vos locaux)", "AI-generated mood image (illustration, not a photo of your customers or premises)"), aiGenerated: true, business: "services", format: aspect, slot, ...(check.tier === "good" ? {} : { qcWarning: check.reason }) }, status: check.tier === "bad" ? "rejected" : "review" });
          return check.tier === "bad" ? ([] as string[]) : [a.id];
        } catch (e) {
          if (e instanceof JobCancelled || e instanceof JobPaused) throw e;
          console.warn("[services] image d'ambiance indisponible :", (e as Error).message);
          if (generated) refundMediaQuota(ictx.userId, `${ctx.job.id}:ambiance:${i}`);
          return [] as string[];
        }
      });
      created.push(...ids);
    }
  }

  // 3. Conseils d'expert (IA de texte) pour le carrousel ; sinon le carrousel détaille les prestations.
  const tips = llmConfigured() && opts.social !== false
    ? await ctx.step("svc:tips", async () => {
        try {
          return await aiServiceTips({ ...ictx, usageKey: `${ctx.job.id}:tips` }, project);
        } catch (e) {
          if (e instanceof JobCancelled || e instanceof JobPaused) throw e;
          return null;
        }
      })
    : null;

  // 4. Visuels : bannières, réseaux, publicités.
  const photos = activityPhotos(projectId);
  const plan = serviceCardPlan(project, photos.length, tips, assignPhotoSlots(project, photos)).filter((x) => (opts.banner === false ? x.role !== "banner" : true) && (opts.social === false ? x.role === "banner" : true));
  const ids = await ctx.step("svc:visuals", async () => {
    ctx.progress(0.55, L("Bannières, visuels réseaux et publicités", "Banners, social visuals and ads"));
    const saved = await saveCards(project, plan.map((x) => ({ ...x, photoAsset: x.card.photo !== undefined ? photos[x.card.photo] : undefined })), ctx.job.id);
    return saved.map((s) => s.id);
  });
  created.push(...ids);
  ctx.progress(0.98, L("Images prêtes", "Images ready"));
  return { created };
}

export type ServiceSingleRequest = {
  kind: "banner" | "service" | "tips" | "quote" | "info" | "booking" | "ambiance" | "social" | "ad" | "scene";
  format?: string;
  headline?: string;
  subline?: string;
  cta?: string;
  useAi?: boolean;
  serviceIndex?: number;
  items?: string[];
  usePhoto?: boolean;
  photoId?: string;
};

const FORMAT_OF: Record<string, ServiceFormat> = { square: "square", portrait: "portrait", story: "story", landscape: "landscape", banner: "banner", product: "portrait", packshot: "square", pin: "portrait" };

/** Image unique à la demande (studio Images) pour une entreprise de services. */
export async function generateServiceSingleImage(ctx: JobContext, projectId: string, req: ServiceSingleRequest) {
  const p = loadProject(projectId);
  const photos = activityPhotos(projectId);
  const photo = req.usePhoto === false ? undefined : (req.photoId && photos.find((a) => a.id === req.photoId)) || photos[0];
  const kind = req.kind === "scene" ? "ambiance" : req.kind === "social" ? "service" : req.kind === "ad" ? "booking" : req.kind;
  const items = serviceItems(p);
  const name = activityName(p);
  ctx.progress(0.2, L("Composition de l'image", "Composing the image"));

  if (kind === "ambiance") {
    if (!imageProviderAvailable() || req.useAi === false) throw new UserFacingError(L("Les images d'ambiance sont créées par l'IA d'images (non disponible ici). Importez plutôt des photos de vos réalisations, de votre équipe ou de votre lieu.", "Mood images are created by the AI image generator (not available here). Upload photos of your work, team or premises instead."));
    const f = FORMAT_OF[req.format ?? "portrait"] ?? "portrait";
    const prompts = ambiancePrompts(p);
    const img = await ctx.step("ambiance", async () => {
      const { img: buf, check, usageKey: finalKey } = await ambianceChecked({ userId: p.userId, projectId, jobId: ctx.job.id }, `${ctx.job.id}:ambiance`, { prompt: req.subline ? `${prompts[0]} ${req.subline}` : prompts[Date.now() % 2], aspect: aspectFor(f), reference: photo && photo.origin !== "generated" ? assetData(photo) : null });
      if (check.tier === "bad") refundMediaQuota(p.userId, finalKey);
      return JSON.stringify({ b64: buf.toString("base64"), tier: check.tier, reason: check.reason });
    });
    // Image payée toujours livrée : signalée (défaut mineur) ou écartée (visible, non décomptée) selon le contrôle.
    const got = JSON.parse(img) as { b64: string; tier: QcTier; reason: string };
    const a = await saveAsset({ projectId, userId: p.userId, data: await sharp(Buffer.from(got.b64, "base64")).jpeg({ quality: 92 }).toBuffer(), name: `${slug(name)}-${C("ambiance", "mood")}-${Date.now().toString(36)}.jpg`, mime: "image/jpeg", role: "lifestyle", folderKey: "images.scenes", origin: "generated", meta: { recipe: L("Image d'ambiance générée par IA (illustration, pas une photo de vos clients ni de vos locaux)", "AI-generated mood image (illustration, not a photo of your customers or premises)"), aiGenerated: true, business: "services", format: aspectFor(f), ...(got.tier === "good" ? {} : { qcWarning: got.reason }) }, status: got.tier === "bad" ? "rejected" : "review" });
    return { assetId: a.id };
  }

  const cta = req.cta || serviceCta(p, kind === "booking");
  const pick = (template: CardPlan["card"]["template"]) => serviceCardPlan(p, photo ? 1 : 0).find((x) => x.card.template === template);
  let plans: CardPlan[] = [];
  if (kind === "banner") {
    const f = FORMAT_OF[req.format ?? "banner"] === "landscape" ? "landscape" : "banner";
    plans = [{ role: "banner", folder: "images.banners", name: C("banniere-ouverture", "hero-banner"), card: { template: "graphic", format: f, photo: photo ? 0 : undefined } }];
  } else if (kind === "service") {
    const s = items[Math.max(0, Math.min(items.length - 1, req.serviceIndex ?? 0))];
    plans = [{ role: "social", folder: "images.social", name: s ? `${C("prestation", "service")}-${slug(s.name)}` : C("annonce", "post"), card: { template: "announce", format: FORMAT_OF[req.format ?? "portrait"] ?? "portrait", eyebrow: s ? C("Prestation", "Service") : name, title: req.headline || (s ? clip(s.name, 60) : p.brand?.tagline || name), text: req.subline ?? (s ? clip(s.description, 150) : clip(p.product.summary, 140)), chips: s ? serviceMeta(s) : [], cta, photo: photo ? 0 : undefined } }];
  } else if (kind === "tips") {
    const given = parseTips(req.items ?? []);
    const tips = given.length >= 2 ? { title: req.headline || C("Nos conseils", "Our tips"), items: given } : llmConfigured() ? await ctx.step("tips", () => aiServiceTips({ userId: p.userId, projectId, jobId: ctx.job.id, usageKey: `${ctx.job.id}:tips` }, p, req.headline)) : null;
    if (!tips && !items.length) throw new UserFacingError(L("Écrivez au moins deux conseils (un par ligne) ou ajoutez vos prestations : le carrousel n'invente rien.", "Write at least two tips (one per line) or add your services: the carousel doesn't make anything up."));
    plans = serviceCardPlan(p, 0, tips).filter((x) => x.card.template.startsWith("carousel"));
  } else if (kind === "quote") {
    const q = req.headline ? { text: req.headline, author: p.brand?.name ?? name } : brandQuote(p);
    if (!q) throw new UserFacingError(L("Aucune phrase de marque à citer : écrivez-la dans le champ « Titre » (votre engagement, votre signature).", "No brand line to quote: write it in the \"Headline\" field (your promise, your signature)."));
    plans = [{ role: "social", folder: "images.social", name: C("citation", "quote"), card: { template: "quote", format: FORMAT_OF[req.format ?? "square"] ?? "square", title: q.text, author: `— ${q.author}` } }];
  } else if (kind === "info") {
    const base = pick("info");
    if (!base) throw new UserFacingError(L("Renseignez d'abord vos horaires, votre zone ou vos coordonnées (onglet Produit / Activité).", "First fill in your hours, area or contact details (Product / Business tab)."));
    plans = [{ ...base, card: { ...base.card, format: FORMAT_OF[req.format ?? "portrait"] ?? "portrait", title: req.headline || base.card.title, cta } }];
  } else {
    const f = FORMAT_OF[req.format ?? "story"] ?? "story";
    plans = [{ role: "ad", folder: "images.ads", name: `${C("publicite", "ad")}-${SERVICE_SIZES[f].label.replace(":", "x")}`, card: { template: "booking", format: f, eyebrow: name, title: req.headline || serviceCta(p), text: req.subline ?? [name, placeLine(p)].filter(Boolean).join(" · "), contact: contactLine(p), cta, photo: photo ? 0 : undefined } }];
  }
  const saved = await saveCards(p, plans.map((x) => ({ ...x, photoAsset: x.card.photo !== undefined ? photo : undefined })), ctx.job.id);
  return { assetId: saved[0].id, assetIds: saved.map((s) => s.id) };
}

// ---------------------------------------------------------------- vidéo (découpage local)

/**
 * Découpage d'une vidéo de présentation d'activité : ouverture (photo ou typographie), prestations,
 * photos, infos pratiques, appel à prendre rendez-vous. Textes tirés de l'offre réelle uniquement.
 */
export function localServiceVideoPlan(p: Project, format: VideoFormat, imageCount: number, url?: string, opts: { short?: boolean } = {}): VideoSpec {
  const name = activityName(p);
  const brand = p.brand?.name ?? name;
  const items = serviceItems(p);
  const tagline = p.brand?.tagline || name;
  const scenes: VideoScene[] = [];
  if (imageCount > 0) scenes.push({ kind: "hook", duration: 2.8, image: 0, headline: clip(tagline, 70), tag: brand });
  else scenes.push({ kind: "title", duration: 2.6, text: clip(tagline, 70), sub: tagline === name ? clip(p.product.summary, 90) || undefined : name, bg: "brand" });
  if (items.length) scenes.push({ kind: "list", duration: Math.min(5.5, 2 + items.slice(0, 4).length * 0.8), heading: C("Nos prestations", "Our services"), items: items.slice(0, 4).map((s) => [clip(s.name, 44), serviceMeta(s).join(" · ")].filter(Boolean).join(" · ")) });
  else if (p.product.summary) scenes.push({ kind: "words", duration: 2.4, items: [clip(p.product.summary, 80)] });
  if (imageCount > 1 && !opts.short) scenes.push({ kind: "scene", duration: 2.4, image: 1, caption: items[0] ? clip(items[0].name, 50) : undefined });
  else if (items[0]?.description && !opts.short) scenes.push({ kind: "words", duration: 2.4, items: [clip(items[0].description, 80)] });
  const rows = infoRows(p).filter((r) => r.icon !== "mail").slice(0, 3);
  if (rows.length) scenes.push({ kind: "info", duration: 3.2, heading: C("Infos pratiques", "Practical info"), rows });
  scenes.push({ kind: "end", duration: 3, headline: brand, cta: serviceCta(p), url: url || contactLine(p) || undefined });
  return { format, scenes, transition: imageCount ? "fade" : "panel", music: "calm", captions: true };
}
