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
import { all } from "../db";
import { assetData, saveAsset, type Asset } from "../library";
import { loadProject, type Project } from "../projects";
import type { ServiceItem } from "../project-types";
import { FORMATS, renderServiceCard, type Format } from "../media/compose";
import { renderServiceCreatives, SERVICE_SIZES, type ServiceCard, type ServiceFormat, type ServiceIcon } from "../media/creative-html";
import type { VideoFormat, VideoScene, VideoSpec } from "../media/video";
import { ambianceImage, imageProviderAvailable, refundMediaQuota } from "../ai/media-providers";
import { aiQcScene, qcScore, QC_MIN_SCORE } from "../ai/tasks";
import { llmConfigured, llmJson } from "../ai/llm";
import { projectContext } from "../ai/context";
import { JobCancelled, JobPaused, UserFacingError, type JobContext } from "../jobs";
import { C, L } from "../i18n-server";
import { brandTypo, palette } from "./images";

// ---------------------------------------------------------------- textes (purs, testables)


/** Contrôle obligatoire d'une image d'ambiance générée (aucun texte ou logo inventé, aucune personne déformée). */
async function checkAmbiance(b: { userId: string; projectId: string; jobId?: string | null; usageKey: string }, img: Buffer): Promise<{ ok: boolean; reason: string }> {
  if (!llmConfigured()) return { ok: false, reason: L("contrôle indisponible", "check unavailable") };
  const r = await aiQcScene(b, img);
  const ok = r.ok && qcScore(r.score) >= QC_MIN_SCORE;
  return { ok, reason: ok ? "" : r.issues.join(L(" ; ", "; ")) || `${qcScore(r.score)}/10` };
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
export function serviceCardPlan(p: Project, photos: number, tips?: { title: string; items: { title: string; text: string }[] } | null): CardPlan[] {
  const out: CardPlan[] = [];
  const name = activityName(p);
  const items = serviceItems(p);
  const cta = serviceCta(p);
  const ctaShort = serviceCta(p, true);
  const contact = contactLine(p);
  const place = placeLine(p);
  const ph = (i: number) => (photos ? i % photos : undefined);
  const tagline = p.brand?.tagline || name;
  const summary = clip(p.product.summary, 140);

  // Bannières du site : prestations (avec texte), puis ouverture (sans texte, enregistrée en dernier = choisie par le site).
  if (items.length) out.push({ role: "banner", folder: "images.banners", name: C("banniere-prestations", "services-banner"), card: { template: "services", format: "landscape", eyebrow: name, title: C("Nos prestations", "Our services"), items: items.map((s) => ({ name: clip(s.name, 48), meta: serviceMeta(s).join(" · ") })), cta, contact, photo: ph(1) } });
  else out.push({ role: "banner", folder: "images.banners", name: C("banniere-activite", "business-banner"), card: { template: "announce", format: "landscape", eyebrow: name, title: tagline, text: summary, cta, contact, photo: ph(1) } });

  // Réseaux : annonce d'une prestation (deux au plus), carrousel, citation, infos pratiques.
  const announce = items.length ? items.slice(0, 2) : [null];
  announce.forEach((s, i) => out.push({ role: "social", folder: "images.social", name: s ? `${C("prestation", "service")}-${slug(s.name)}` : C("annonce-activite", "business-post"), card: s ? { template: "announce", format: "portrait", eyebrow: C("Prestation", "Service"), title: clip(s.name, 60), text: clip(s.description, 150), chips: serviceMeta(s), cta, photo: ph(i) } : { template: "announce", format: "portrait", eyebrow: name, title: tagline, text: summary, cta, photo: ph(0) } }));

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
  out.push({ role: "ad", folder: "images.ads", name: `${C("publicite", "ad")}-9x16`, card: { template: "booking", format: "story", eyebrow: modeLabel(p) || name, title: cta, text: adText, contact, cta: ctaShort, photo: ph(0) } });
  out.push({ role: "ad", folder: "images.ads", name: `${C("publicite", "ad")}-1x1`, card: { template: "booking", format: "square", eyebrow: name, title: items[0] ? clip(items[0].name, 60) : tagline, text: items[0] ? clip(items[0].description, 110) : summary, chips: items[0] ? serviceMeta(items[0]) : [], cta: ctaShort, photo: ph(1) } });
  out.push({ role: "ad", folder: "images.ads", name: `${C("publicite", "ad")}-16x9`, card: { template: "booking", format: "landscape", eyebrow: name, title: cta, text: [summary || tagline, place].filter(Boolean).join(" · "), contact, cta: ctaShort, photo: ph(2) } });

  out.push({ role: "banner", folder: "images.banners", name: C("banniere-ouverture", "hero-banner"), card: { template: "graphic", format: "banner", photo: ph(0) } });
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
export function activityPhotos(projectId: string): Asset[] {
  const amb = all<Asset>("SELECT * FROM assets WHERE project_id = ? AND role = 'lifestyle' AND origin = 'generated' AND kind = 'image' AND deleted_at IS NULL AND status != 'rejected' ORDER BY created_at DESC LIMIT 4", projectId);
  return [...realActivityPhotos(projectId), ...amb];
}

/** Consignes d'ambiance pour l'IA d'images (anglais pour les modèles), à partir de l'activité réelle. */
export function ambiancePrompts(p: Project): string[] {
  const what = [p.product.category, p.product.summary || activityName(p)].filter(Boolean).join(" — ");
  const services = serviceItems(p).slice(0, 4).map((s) => s.name).join(", ");
  const base = `Business activity: ${what}.${services ? ` Services offered: ${services}.` : ""}${placeLine(p) ? ` Location: ${placeLine(p)}.` : ""}`;
  return [
    `${base} The place where this activity happens (workshop, practice room, studio, salon or venue), tidy, warm and inviting, nobody looking at the camera.`,
    `${base} Close-up of skilled hands at work with the real tools and materials of this activity, shallow depth of field.`,
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
    for (const [i, prompt] of ambiancePrompts(project).entries()) {
      const ids = await ctx.step(`svc:ambiance:${i}`, async () => {
        ctx.progress(0.2 + i * 0.1, L("Images d'ambiance de l'activité (IA)", "Business mood images (AI)"));
        try {
          const img = await ambianceImage({ ...ictx, usageKey: `${ctx.job.id}:ambiance:${i}` }, { prompt, aspect: i === 0 ? "16:9" : "4:5", reference: originals[i] ? assetData(originals[i]) : null });
          const check = await checkAmbiance({ ...ictx, usageKey: `${ctx.job.id}:ambianceqc:${i}` }, img);
          if (!check.ok) {
            // Image refusée (texte inventé, visage, mains déformées…) ou impossible à vérifier : ni montrée ni décomptée.
            console.warn("[services] image d'ambiance écartée :", check.reason);
            refundMediaQuota(ictx.userId, `${ctx.job.id}:ambiance:${i}`);
            return [] as string[];
          }
          const a = await saveAsset({ projectId, userId: project.userId, data: await sharp(img).jpeg({ quality: 92 }).toBuffer(), name: `${base}-${C("ambiance", "mood")}-${i + 1}.jpg`, mime: "image/jpeg", role: "lifestyle", folderKey: "images.scenes", origin: "generated", meta: { recipe: L("Image d'ambiance générée par IA (illustration, pas une photo de vos clients ni de vos locaux)", "AI-generated mood image (illustration, not a photo of your customers or premises)"), aiGenerated: true, business: "services", format: i === 0 ? "16:9" : "4:5" }, status: "review" });
          return [a.id];
        } catch (e) {
          if (e instanceof JobCancelled || e instanceof JobPaused) throw e;
          console.warn("[services] image d'ambiance indisponible :", (e as Error).message);
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
  const plan = serviceCardPlan(project, photos.length, tips).filter((x) => (opts.banner === false ? x.role !== "banner" : true) && (opts.social === false ? x.role === "banner" : true));
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
      const buf = await ambianceImage({ userId: p.userId, projectId, jobId: ctx.job.id, usageKey: `${ctx.job.id}:ambiance` }, { prompt: req.subline ? `${prompts[0]} ${req.subline}` : prompts[Date.now() % 2], aspect: aspectFor(f), reference: photo && photo.origin !== "generated" ? assetData(photo) : null });
      const check = await checkAmbiance({ userId: p.userId, projectId, jobId: ctx.job.id, usageKey: `${ctx.job.id}:ambianceqc` }, buf);
      if (!check.ok) {
        refundMediaQuota(p.userId, `${ctx.job.id}:ambiance`);
        throw new UserFacingError(L(`L'image d'ambiance générée a été écartée au contrôle qualité (${check.reason}). Elle ne vous est pas décomptée ; relancez-la.`, `The generated mood image was rejected by the quality check (${check.reason}). It isn't counted; try again.`));
      }
      return buf.toString("base64");
    });
    const a = await saveAsset({ projectId, userId: p.userId, data: await sharp(Buffer.from(img, "base64")).jpeg({ quality: 92 }).toBuffer(), name: `${slug(name)}-${C("ambiance", "mood")}-${Date.now().toString(36)}.jpg`, mime: "image/jpeg", role: "lifestyle", folderKey: "images.scenes", origin: "generated", meta: { recipe: L("Image d'ambiance générée par IA (illustration, pas une photo de vos clients ni de vos locaux)", "AI-generated mood image (illustration, not a photo of your customers or premises)"), aiGenerated: true, business: "services", format: aspectFor(f) }, status: "review" });
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
