/**
 * Réalisations d'un artisan (#239, phase 3) : projets saisis une fois dans le studio (onglet Réalisations) et injectés au
 * rendu dans les sections prévues par les thèmes — aperçu, export, site hébergé — comme les biens et la carte. Le thème
 * enregistré n'est jamais modifié ; sans réalisation publiée, rien n'est injecté (démonstrations identiques au pixel).
 *
 * - Sections remplies : `portfolio` (Atelier Rive et anciens thèmes de services), `ap-cards` « projects » / « gallery »
 *   (APLAT), `ph-cards` « projects » / « gallery » (PHASE). Une page « Réalisations » filtrable est ajoutée quand le site
 *   n'en a pas ; chaque réalisation a sa fiche dans les thèmes qui en dessinent une (Rive, APLAT, PHASE), avec les
 *   sections de leur démonstration, et seulement les informations saisies.
 * - États : brouillon (studio seulement) → publiée ↔ retirée ; archivée (hors de tout affichage, jamais effacée).
 * - Photos : uniquement des images de CE projet ; « avant » facultative (comparaison avant / après). Lieu et date ne sont
 *   affichés que s'ils sont saisis : rien n'est déduit ni inventé.
 * - Adresse d'une fiche (`/pages/realisation-…`) : fixée à la création, elle ne change plus (liens partagés stables).
 */
import { z } from "zod";
import { HttpError } from "../auth";
import { all, id as newId, now, one, run, tx } from "../db";
import { L } from "../i18n-server";
import { slugify } from "../blog-html";
import { pick } from "../i18n";
import { themeLang, type SectionInstance, type StorePage, type TemplateJson, type ThemeSpec } from "../theme/spec";

let ready = false;
function ensureTables() {
  if (ready) return;
  run(`CREATE TABLE IF NOT EXISTS realisations (
    id TEXT PRIMARY KEY, project_id TEXT NOT NULL, handle TEXT NOT NULL, title TEXT NOT NULL, summary TEXT NOT NULL DEFAULT '',
    need TEXT NOT NULL DEFAULT '', work TEXT NOT NULL DEFAULT '', category TEXT NOT NULL DEFAULT '', location TEXT NOT NULL DEFAULT '',
    period TEXT NOT NULL DEFAULT '', photos TEXT NOT NULL DEFAULT '[]', before TEXT, status TEXT NOT NULL, position INTEGER NOT NULL,
    created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, published_at INTEGER)`);
  run("CREATE UNIQUE INDEX IF NOT EXISTS realisations_handle ON realisations(project_id, handle)");
  run("CREATE INDEX IF NOT EXISTS realisations_project ON realisations(project_id, position)");
  ready = true;
}

export const REALISATION_STATUSES = ["draft", "published", "withdrawn", "archived"] as const;
export type RealisationStatus = (typeof REALISATION_STATUSES)[number];

const photo = z.object({ assetId: z.string().min(1).max(40), alt: z.string().trim().max(200).default("") });
export const realisationSchema = z.object({
  title: z.string().trim().min(1, "titre du projet").max(120),
  summary: z.string().trim().max(160).default(""),
  need: z.string().trim().max(1200).default(""),
  work: z.string().trim().max(2000).default(""),
  category: z.string().trim().max(40).default(""),
  location: z.string().trim().max(80).default(""),
  period: z.string().trim().max(40).default(""),
  photos: z.array(photo).max(12).default([]),
  before: photo.nullable().default(null),
});
export type RealisationData = z.infer<typeof realisationSchema>;
export type Realisation = RealisationData & { id: string; handle: string; status: RealisationStatus; position: number; createdAt: number; updatedAt: number; publishedAt: number | null };
type Row = { id: string; handle: string; title: string; summary: string; need: string; work: string; category: string; location: string; period: string; photos: string; before: string | null; status: RealisationStatus; position: number; created_at: number; updated_at: number; published_at: number | null };
const parse = <T,>(s: string | null, d: T): T => { try { return s ? (JSON.parse(s) as T) : d; } catch { return d; } };
const toReal = (r: Row): Realisation => ({
  id: r.id, handle: r.handle, title: r.title, summary: r.summary, need: r.need, work: r.work, category: r.category, location: r.location, period: r.period,
  photos: parse(r.photos, []), before: parse(r.before, null), status: r.status, position: r.position, createdAt: r.created_at, updatedAt: r.updated_at, publishedAt: r.published_at,
});

export function listRealisations(projectId: string, opts: { archived?: boolean } = {}): Realisation[] {
  ensureTables();
  return all<Row>(`SELECT * FROM realisations WHERE project_id = ? ${opts.archived ? "" : "AND status != 'archived'"} ORDER BY position, created_at`, projectId).map(toReal);
}
export function getRealisation(projectId: string, rid: string): Realisation {
  ensureTables();
  const r = one<Row>("SELECT * FROM realisations WHERE id = ? AND project_id = ?", rid, projectId);
  if (!r) throw new HttpError(404, L("Réalisation introuvable dans ce projet.", "Project not found in this site."));
  return toReal(r);
}

function assertMedia(projectId: string, d: RealisationData) {
  for (const p of [...d.photos, ...(d.before ? [d.before] : [])]) {
    const a = one<{ kind: string }>("SELECT kind FROM assets WHERE id = ? AND project_id = ? AND deleted_at IS NULL", p.assetId, projectId);
    if (!a || a.kind !== "image") throw new HttpError(400, L("Une photo choisie n'appartient pas aux médias de ce projet.", "A chosen photo is not one of this project's media."));
  }
}
/** Ce qui manque pour publier : un titre, au moins une photo, et une phrase sur le travail réalisé. */
export function missingForPublication(d: RealisationData): string[] {
  const out: string[] = [];
  if (!d.photos.length) out.push(L("au moins une photo du chantier", "at least one photo of the work"));
  if (!d.summary.trim() && !d.work.trim()) out.push(L("un résumé ou la description du travail réalisé", "a summary or a description of the work done"));
  return out;
}
function uniqueHandle(projectId: string, title: string) {
  const base = `realisation-${slugify(title).slice(0, 60).replace(/-+$/, "") || "projet"}`;
  let h = base;
  for (let i = 2; one("SELECT 1 FROM realisations WHERE project_id = ? AND handle = ?", projectId, h); i++) h = `${base}-${i}`;
  return h;
}

export function createRealisation(projectId: string, raw: unknown): Realisation {
  ensureTables();
  const d = realisationSchema.parse(raw);
  assertMedia(projectId, d);
  const rid = newId();
  const position = one<{ p: number }>("SELECT COALESCE(MAX(position), -1) + 1 p FROM realisations WHERE project_id = ?", projectId)!.p;
  run("INSERT INTO realisations (id, project_id, handle, title, summary, need, work, category, location, period, photos, before, status, position, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'draft',?,?,?)",
    rid, projectId, uniqueHandle(projectId, d.title), d.title, d.summary, d.need, d.work, d.category, d.location, d.period, JSON.stringify(d.photos), d.before ? JSON.stringify(d.before) : null, position, now(), now());
  return getRealisation(projectId, rid);
}
export function updateRealisation(projectId: string, rid: string, raw: unknown): Realisation {
  const cur = getRealisation(projectId, rid);
  const d = realisationSchema.parse({ ...cur, ...(raw as object) });
  assertMedia(projectId, d);
  const missing = cur.status === "published" ? missingForPublication(d) : [];
  if (missing.length) throw new HttpError(400, L(`Cette réalisation est en ligne : gardez ${missing.join(" et ")}, ou retirez-la d'abord.`, `This project is live: keep ${missing.join(" and ")}, or withdraw it first.`));
  run("UPDATE realisations SET title = ?, summary = ?, need = ?, work = ?, category = ?, location = ?, period = ?, photos = ?, before = ?, updated_at = ? WHERE id = ? AND project_id = ?",
    d.title, d.summary, d.need, d.work, d.category, d.location, d.period, JSON.stringify(d.photos), d.before ? JSON.stringify(d.before) : null, now(), rid, projectId);
  return getRealisation(projectId, rid);
}
export function setRealisationStatus(projectId: string, rid: string, status: RealisationStatus): Realisation {
  const cur = getRealisation(projectId, rid);
  const missing = status === "published" ? missingForPublication(cur) : [];
  if (missing.length) throw new HttpError(400, L(`Pour publier cette réalisation, ajoutez ${missing.join(" et ")}.`, `To publish this project, add ${missing.join(" and ")}.`));
  run("UPDATE realisations SET status = ?, published_at = CASE WHEN ? = 'published' THEN COALESCE(published_at, ?) ELSE published_at END, updated_at = ? WHERE id = ? AND project_id = ?", status, status, now(), now(), rid, projectId);
  return getRealisation(projectId, rid);
}
export function reorderRealisations(projectId: string, ids: string[]) {
  ensureTables();
  tx(() => ids.forEach((rid, i) => run("UPDATE realisations SET position = ?, updated_at = ? WHERE id = ? AND project_id = ?", i, now(), rid, projectId)));
}

/** Le projet a-t-il une réalisation publiée (sinon rien n'est injecté) ? */
export function hasRealisations(projectId: string) {
  ensureTables();
  return !!one("SELECT 1 FROM realisations WHERE project_id = ? AND status = 'published'", projectId);
}
/** Réalisations modifiées depuis une date (pour « modifications non publiées »). */
export function realisationsChangedSince(projectId: string, at: number) {
  ensureTables();
  return one<{ n: number }>("SELECT COUNT(*) n FROM realisations WHERE project_id = ? AND updated_at > ?", projectId, at)?.n ?? 0;
}

// ── Rendu ──────────────────────────────────────────────────────────────────────────────────────────────────────────
type Pic = { file: string; alt: string };
type Shown = { r: Realisation; url: string | null; main: Pic; others: Pic[]; before: Pic | null; cat: string };
type Block = { type: string; settings: Record<string, unknown> };
type Kind = "rive" | "aplat" | "phase" | "generic";

const ext = (mime: string) => (mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg");
/** Textes saisis : affichés tels quels par certaines sections, échappés par d'autres ; aucun balisage n'est conservé. */
const plain = (s: string) => s.replace(/[<>]/g, "").trim();
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const para = (s: string) => (s.trim() ? s.trim().split(/\n{2,}/).map((x) => `<p>${esc(x).replace(/\n/g, "<br>")}</p>`).join("") : "");
const catSlug = (c: string) => slugify(c).slice(0, 40) || "";
const kindOf = (spec: ThemeSpec): Kind => (spec.direction === "rive" || spec.direction === "aplat" || spec.direction === "phase" ? spec.direction : "generic");

/** Section de réalisations d'un gabarit (accueil : liste courte ; page : galerie filtrable). */
const isGallery = (k: Kind, s: SectionInstance) =>
  k === "aplat" ? s.type === "ap-cards" && s.settings?.layout === "gallery" : k === "phase" ? s.type === "ph-cards" && s.settings?.layout === "gallery" : s.type === "portfolio";
const isTeaser = (k: Kind, s: SectionInstance) =>
  k === "aplat" ? s.type === "ap-cards" && s.settings?.layout === "projects" : k === "phase" ? s.type === "ph-cards" && s.settings?.layout === "projects" : s.type === "portfolio";

const blocksOf = (list: Block[]) => ({ blocks: Object.fromEntries(list.map((b, i) => [`es-real-${i}`, b])), block_order: list.map((_, i) => `es-real-${i}`) });
const sec = (type: string, settings: Record<string, unknown>, list: Block[] = []): SectionInstance => ({ type, settings, ...blocksOf(list) });
const tpl = (rows: [string, SectionInstance | null][]): TemplateJson => {
  const ok = rows.filter((r): r is [string, SectionInstance] => !!r[1]);
  return { order: ok.map(([k]) => k), sections: Object.fromEntries(ok) };
};

/**
 * Copie du thème avec les réalisations publiées du projet : sections prévues remplies, page « Réalisations » et fiches
 * ajoutées quand le thème en dessine. Thème enregistré intact ; sans réalisation publiée, le même objet est renvoyé.
 */
export function withRealisations(spec: ThemeSpec, projectId: string, opts: { preview?: string | null } = {}): ThemeSpec {
  if (!hasRealisations(projectId) && !opts.preview) return spec;
  const lang = themeLang(spec);
  const t = (fr: string, en: string) => pick(lang, fr, en);
  const kind = kindOf(spec);
  const detail = kind !== "generic";
  const files: Record<string, string> = {};
  const pic = (p: { assetId: string; alt: string }, fallback: string): Pic | null => {
    const a = one<{ mime: string }>("SELECT mime FROM assets WHERE id = ? AND project_id = ? AND deleted_at IS NULL", p.assetId, projectId);
    if (!a) return null;
    const file = `es-real-${p.assetId}.${ext(a.mime)}`;
    files[file] = p.assetId;
    return { file, alt: plain(p.alt) || fallback };
  };
  const shown: Shown[] = listRealisations(projectId)
    .filter((r) => r.status === "published" || (!!opts.preview && r.id === opts.preview))
    .flatMap((r) => {
      const pics = r.photos.map((p, i) => pic(p, i ? `${plain(r.title)} (${i + 1})` : plain(r.title))).filter((x): x is Pic => !!x);
      if (!pics.length) return [];
      return [{ r, url: detail ? `/pages/${r.handle}` : null, main: pics[0], others: pics.slice(1), before: r.before ? pic(r.before, t(`${plain(r.title)}, avant`, `${plain(r.title)}, before`)) : null, cat: catSlug(r.category) }];
    });
  if (!shown.length) return spec;

  const templates = { ...spec.templates };
  let pages = [...spec.store.pages];
  const pageUrl = (suffixes: string[], handles: string[]) => { const pg = pages.find((p) => suffixes.includes(p.template_suffix) || handles.includes(p.handle)); return pg ? `/pages/${pg.handle}` : ""; };
  const contactUrl = pageUrl(["contact", "ph-contact"], ["contact"]) || "/pages/contact";
  // Demande de devis : la page du thème, sinon le lien « devis » des menus du site (souvent la page de contact).
  const quoteLink = Object.values(spec.store.menus).flatMap((m) => m.links).find((l) => /devis|quote/i.test(l.title) && l.url.startsWith("/"));
  const askUrl = pageUrl(["devis", "ph-devis"], ["devis", "quote", "demande-de-devis", "request-a-quote"]) || quoteLink?.url || contactUrl;
  const askLabel = askUrl === contactUrl && !quoteLink ? t("Nous contacter", "Contact us") : t("Demander un devis", "Request a quote");
  const cats = [...new Map(shown.filter((x) => x.cat).map((x) => [x.cat, plain(x.r.category)])).entries()];
  const title = (x: Shown) => plain(x.r.title);
  const teaserText = (x: Shown) => plain(x.r.summary) || plain(x.r.location);

  // Page « Réalisations » : celle du thème si elle existe (galerie déjà dessinée), sinon une page ajoutée.
  const galleryKey = Object.keys(templates).find((k) => k.startsWith("page.") && Object.values(templates[k].sections).some((s) => isGallery(kind, s)));
  const galleryPage = galleryKey ? pages.find((p) => `page.${p.template_suffix || ""}` === galleryKey || `page.${p.handle}` === galleryKey) : undefined;
  const galleryHandle = galleryPage?.handle ?? (pages.some((p) => p.handle === t("realisations", "projects")) ? "es-realisations" : t("realisations", "projects"));
  const galleryUrl = `/pages/${galleryHandle}`;

  // Cartes et projets, dans le vocabulaire de chaque section.
  const portfolioBlock = (x: Shown, home: boolean): Block => ({ type: "project", settings: { image_asset: x.main.file, image_before_asset: x.before?.file ?? "", title: title(x), caption: home && kind === "rive" ? plain(x.r.location) || plain(x.r.summary) : teaserText(x), tag: plain(x.r.category), link: x.url ?? "" } });
  const apCard = (x: Shown): Block => ({ type: "card", settings: { title: title(x), mobile_title: title(x), subtitle: plain(x.r.category), kicker: "", text: plain(x.r.summary), image_asset: x.main.file, image_alt: x.main.alt, category: x.cat, link: x.url ?? "", link_label: x.url ? t("Découvrir ce projet", "See this project") : "", mobile_link_label: x.url ? t("Découvrir ce projet", "See this project") : "" } });
  const phCard = (x: Shown): Block => ({ type: "card", settings: { image_asset: x.main.file, alt: x.main.alt, category: x.cat, tag: "", label: plain(x.r.category) || plain(x.r.location), title: title(x), text: plain(x.r.summary), link: x.url ?? "" } });
  const cardsFor = (s: SectionInstance, list: Shown[], home: boolean): Block[] =>
    s.type === "portfolio" ? list.slice(0, 12).map((x) => portfolioBlock(x, home)) : s.type === "ap-cards" ? list.map(apCard) : list.slice(0, 12).map(phCard);
  const filterSettings = (s: SectionInstance): Record<string, unknown> =>
    s.type === "ap-cards" && s.settings?.layout === "gallery"
      ? { filters: cats.length >= 2 ? [`${t("Tout", "All")}|all`, ...cats.map(([v, l]) => `${l.replace(/[|,]/g, " ")}|${v}`)].join(",") : "" }
      : {};

  // 1. Sections déjà présentes (accueil, page de galerie) : leurs réglages et leur dessin sont gardés, seuls les projets changent.
  const homeCount = kind === "rive" ? 3 : kind === "generic" ? 6 : 2;
  let homeFilled = false;
  for (const [key, tp] of Object.entries(spec.templates)) {
    let changed = false;
    const sections: Record<string, SectionInstance> = { ...tp.sections };
    for (const [sid, s] of Object.entries(tp.sections)) {
      const home = key === "index";
      if (home ? !isTeaser(kind, s) : !isGallery(kind, s) || key !== galleryKey) continue;
      const list = home ? shown.slice(0, homeCount) : shown;
      const link = home && galleryUrl ? (s.type === "portfolio" ? { button_label: s.settings?.button_label || t("Voir toutes les réalisations", "See all projects"), button_link: galleryUrl } : s.type === "ap-cards" ? { link_label: s.settings?.link_label || t("Voir toutes les réalisations", "See all projects"), link: galleryUrl } : {}) : {};
      sections[sid] = { ...s, disabled: false, settings: { ...s.settings, ...link, ...filterSettings(s) }, ...blocksOf(cardsFor(s, list, home)) };
      changed = true;
      if (home) homeFilled = true;
    }
    if (changed) templates[key] = { ...tp, sections };
  }

  // 2. Accueil sans section de réalisations (site d'un client composé sans photo de chantier) : celle du thème, à sa place.
  if (!homeFilled && templates.index) {
    const home = shown.slice(0, homeCount);
    const row: SectionInstance =
      kind === "aplat" ? sec("ap-cards", { layout: "projects", mobile_eyebrow: t("Réalisations", "Our work"), heading: t("Nos réalisations", "Our work"), text: "", link_label: t("Voir toutes les réalisations", "See all projects"), link: galleryUrl }, home.map(apCard))
      : kind === "phase" ? sec("ph-cards", { layout: "projects", columns: 2, eyebrow: t("Réalisations", "Our work"), heading: t("Nos réalisations", "Our work"), pad_top: 66, pad_bottom: 35, pad_top_mobile: 34, pad_bottom_mobile: 32 }, home.map(phCard))
      : kind === "rive" ? sec("portfolio", { anchor: "projets", layout: "asym", eyebrow: "", heading: "", text: "", show_filters: false, show_tags: false, caption_style: "kicker", link_style: "arrow", button_label: t("Voir tous les projets", "See all projects"), button_link: galleryUrl, color_scheme: "scheme-1", padding_top: 16, padding_bottom: 32 }, home.map((x) => portfolioBlock(x, true)))
      : sec("portfolio", { eyebrow: t("Réalisations", "Our work"), heading: t("Quelques réalisations", "A few recent projects"), text: "", layout: "grid", label_before: t("Avant", "Before"), label_after: t("Après", "After"), button_label: t("Voir toutes les réalisations", "See all projects"), button_link: galleryUrl, padding_top: 104, padding_bottom: 104 }, home.map((x) => portfolioBlock(x, true)));
    const idx = templates.index;
    const types = idx.order.map((sid) => idx.sections[sid]?.type);
    // Place de la démonstration : Rive après les besoins ; APLAT avant la méthode ; PHASE et les autres avant l'appel final.
    const at = kind === "rive" ? types.indexOf("fs-needs") + 1 || 1
      : kind === "aplat" ? [types.findIndex((x, i) => x === "ap-cards" && idx.sections[idx.order[i]].settings?.layout === "steps"), types.indexOf("ap-faq"), types.indexOf("ap-cta")].find((i) => i >= 0) ?? types.length
      : kind === "phase" ? [types.indexOf("faq"), types.indexOf("ph-cta")].find((i) => i >= 0) ?? types.length
      : [types.indexOf("testimonials"), types.indexOf("faq"), types.indexOf("cta-banner")].find((i) => i >= 0) ?? types.length;
    const order = [...idx.order];
    order.splice(at, 0, "es-realisations");
    templates.index = { ...idx, order, sections: { ...idx.sections, "es-realisations": row } };
  }

  // 3. Page « Réalisations » ajoutée, avec les sections de la page de démonstration du thème.
  const first = shown[0];
  const hero = (heading: string, text: string, image: Pic) => kind === "aplat"
    ? sec("ap-hero", { layout: "fade", mobile_layout: "overlay", height: 250, mobile_height: 300, title_size: 62, image_asset: image.file, image_alt: image.alt, heading, show_rule: true, text, heading_tag: "h1" })
    : sec("ph-hero", { layout: "navy", eyebrow: t("Réalisations", "Our work"), heading, text: text ? para(text) : "", image_asset: image.file, image_alt: image.alt, mobile_navy: true, mobile_photo: "none", chips_aria: t("Filtrer les réalisations", "Filter projects"), chips_for: "projects" },
      cats.length >= 2 ? [{ type: "chip", settings: { label: t("Tout", "All"), value: "all" } }, ...cats.map(([value, label]) => ({ type: "chip", settings: { label, value } }))] : []);
  const cta = (heading: string, image: Pic) =>
    kind === "aplat" ? sec("ap-cta", { layout: "slim", heading, text: "", button_label: askLabel, button_link: askUrl })
    : kind === "phase" ? sec("ph-cta", { layout: "slim", layout_mobile: "inline", eyebrow: t("Votre projet", "Your project"), heading, title_size: 55, title_size_mobile: 23.5, copy_width: 780, button_label: askLabel, button_link: askUrl, circuit: "cta-slim" })
    : sec("cta-banner", { style: "card", heading, text: "", button_label: askLabel, button_link: askUrl, image_asset: image.file, parallax: false, overlay: 0, color_scheme: "scheme-1", padding_top: 24, padding_bottom: 56 });
  const titleRow = (show: boolean): [string, SectionInstance] => ["title", sec("main-page", { show_title: show, width: "wide", color_scheme: "scheme-1", padding_top: show ? 48 : 0, padding_bottom: 0 })];
  const phPage = (): [string, SectionInstance] => ["page", sec("ph-page", { footer_mobile: "pair", scale: 100 })];
  const similar = t("Vous avez un projet similaire ?", "Have a similar project?");

  if (!galleryKey) {
    const heading = t("Nos réalisations", "Our work");
    const rows: [string, SectionInstance | null][] =
      kind === "aplat" ? [["hero", hero(heading, "", first.main)], ["list", sec("ap-cards", { layout: "gallery", mobile_layout: "rows", filters_label: t("Filtrer les réalisations", "Filter projects"), step: 6, more_label: t("Charger plus de projets", "Load more projects"), filter_status: t("[n] réalisations affichées", "[n] projects shown"), ...filterSettings({ type: "ap-cards", settings: { layout: "gallery" } }) }, shown.map(apCard))], ["cta", cta(similar, first.main)]]
      : kind === "phase" ? [["hero", hero(heading, "", first.main)], ["list", sec("ph-cards", { layout: "gallery", columns: 3, per_page: 6, pad_top: 27, pad_bottom: 70 }, shown.map(phCard))], ["cta", cta(t("Parlons de votre projet.", "Let's talk about your project."), first.main)], phPage()]
      : kind === "rive" ? [titleRow(false), ["gallery", sec("portfolio", { layout: "asym", heading_tag: "h1", eyebrow: "", heading, text: "", show_filters: true, all_label: t("Tous", "All"), show_tags: false, caption_style: "text", link_style: "label", link_label: t("Voir le projet", "See the project"), button_label: "", color_scheme: "scheme-1", padding_top: 24, padding_bottom: 40 }, shown.slice(0, 12).map((x) => portfolioBlock(x, false)))], ["cta", cta(similar, first.main)]]
      : [titleRow(true), ["gallery", sec("portfolio", { layout: "grid", eyebrow: "", heading: "", text: "", show_filters: true, label_before: t("Avant", "Before"), label_after: t("Après", "After"), padding_top: 24, padding_bottom: 96 }, shown.slice(0, 12).map((x) => portfolioBlock(x, false)))]];
    templates["page.es-realisations"] = tpl(rows);
    pages.push({ handle: galleryHandle, title: heading, template_suffix: "es-realisations", body_html: "", seo: { title: `${heading} | ${spec.store.shopName}`.slice(0, 70), description: t(`Projets réalisés par ${spec.store.shopName} : photos et description de chaque chantier.`, `Projects by ${spec.store.shopName}: photos and a description of each job.`).slice(0, 160) } } as StorePage);
  }

  // 4. Fiche de chaque réalisation (Rive, APLAT, PHASE), sections de la fiche de démonstration, informations saisies seulement.
  if (detail) shown.forEach((x, i) => {
    const prev = shown[(i + shown.length - 1) % shown.length], next = shown[(i + 1) % shown.length];
    const facts = [
      [t("Catégorie", "Category"), plain(x.r.category)],
      [t("Lieu", "Location"), plain(x.r.location)],
      [t("Date", "Date"), plain(x.r.period)],
    ].filter(([, v]) => v);
    const photos = [...x.others, ...(x.before ? [{ ...x.before, caption: t("Avant", "Before") }] : [])];
    const others = shown.filter((o) => o.r.id !== x.r.id).slice(0, 2);
    let rows: [string, SectionInstance | null][];
    if (kind === "rive") rows = [
      titleRow(false),
      ["opening", sec("ed-scene", { layout: "split", heading_tag: "h1", label: plain(x.r.location), heading: title(x), text: para(x.r.summary), image_asset: x.main.file, image_alt: x.main.alt, text_side: "left", motion: "none", color_scheme: "scheme-1", padding_top: 24, padding_bottom: 56 })],
      ["case", sec("fs-case", { layout: "detail", eyebrow: "", heading: "", text: "", align: "left", label_request: t("Le besoin :", "The need:"), label_answer: t("Notre réponse :", "Our answer:"), label_client: t("Catégorie", "Category"), client_type: plain(x.r.category), location: plain(x.r.location), year: plain(x.r.period), label_year: t("Date", "Date"), effect: "none", nav_label: t("Autres projets", "Other projects"), prev_label: t("Projet précédent", "Previous project"), prev_title: shown.length > 1 ? title(prev) : "", prev_link: shown.length > 1 ? prev.url : "", next_label: t("Projet suivant", "Next project"), next_title: shown.length > 1 ? title(next) : "", next_link: shown.length > 1 ? next.url : "", color_scheme: "scheme-1", padding_top: 24, padding_bottom: 32 }, [
        ...(x.r.need.trim() ? [{ type: "part", settings: { kind: "request", title: "", text: para(x.r.need) } }] : []),
        ...(x.r.work.trim() ? [{ type: "part", settings: { kind: "answer", title: "", text: para(x.r.work) } }] : []),
        ...photos.slice(0, 6).map((p) => ({ type: "photo", settings: { image_asset: p.file, image_alt: p.alt, caption: "caption" in p ? p.caption : "" } })),
      ])],
      ["cta", cta(t("Un projet similaire ?", "A similar project?"), x.main)],
    ];
    else if (kind === "aplat") rows = [
      ["hero", sec("ap-hero", { layout: "fade", mobile_layout: "overlay", height: 300, mobile_height: 300, title_size: 63, image_asset: x.main.file, image_alt: x.main.alt, heading: title(x), heading_tag: "h1", show_rule: true, text: plain(x.r.summary), mobile_crumbs: true }, [
        { type: "crumb", settings: { label: t("Accueil", "Home"), link: "/" } }, { type: "crumb", settings: { label: t("Réalisations", "Our work"), link: galleryUrl } }, { type: "crumb", settings: { label: title(x), link: "" } },
        ...(facts.length ? [{ type: "aside", settings: { style: "info", title: t("Informations du projet", "Project details"), items: facts.map(([k, v]) => `${k} : ${v}`).join("\n"), show_on: "desktop" } }, { type: "aside", settings: { style: "strip", items: facts.map(([k, v]) => `${k} : ${v}`).join("\n"), show_on: "mobile" } }] : []),
      ])],
      ["story", x.r.need.trim() || x.r.work.trim() ? sec("ap-cards", { layout: "steps", mobile_layout: "timeline", heading: t("Le projet", "The project"), mobile_hide_heading: true }, [
        ...(x.r.need.trim() ? [{ type: "card", settings: { number: "01", title: t("La demande", "The request"), text: plain(x.r.need) } }] : []),
        ...(x.r.work.trim() ? [{ type: "card", settings: { number: x.r.need.trim() ? "02" : "01", title: t("Le travail réalisé", "The work done"), text: plain(x.r.work) } }] : []),
      ]) : null],
      ["details", x.others.length ? sec("ap-cards", { layout: "mosaic", heading: t("Photos du chantier", "Photos of the work") }, x.others.slice(0, 8).map((p) => ({ type: "card", settings: { title: "", image_asset: p.file, image_alt: p.alt } }))) : null],
      ["compare", x.before ? sec("ap-compare", { layout: "side", heading: t("Avant / après", "Before / after"), text: "", before_asset: x.before.file, before_alt: x.before.alt, after_asset: x.main.file, after_alt: x.main.alt, note: "" }) : null],
      ["cta", cta(similar, x.main)],
    ];
    else rows = [
      ["hero", sec("ph-hero", { layout: "plain", title_size: 86, title_size_mobile: 37, height: 300, crumb_parent: t("Réalisations", "Our work"), crumb_parent_link: galleryUrl, crumb_current: title(x), heading: title(x), text: para(x.r.summary), note_mobile: false })],
      ["project", sec("ph-project", { image_asset: x.main.file, image_alt: x.main.alt, caption: "", caption_mobile: "", eyebrow: "", eyebrow_mobile: "", pad_top: 0, pad_bottom: 26, pad_top_mobile: 0, pad_bottom_mobile: 6 }, facts.map(([label, value]) => ({ type: "fact", settings: { icon: label === t("Lieu", "Location") ? "lieu-repere" : label === t("Date", "Date") ? "devis-document" : "maison", label, value, show: "all" } })))],
      ["columns", x.r.need.trim() || x.r.work.trim() ? sec("ph-columns", { compact_mobile: true, pad_top: 4, pad_bottom: 30, pad_top_mobile: 18, pad_bottom_mobile: 10 }, [
        ...(x.r.need.trim() ? [{ type: "column", settings: { number: "01", eyebrow: t("Le besoin", "The need"), title: "", text: para(x.r.need) } }] : []),
        ...(x.r.work.trim() ? [{ type: "column", settings: { number: x.r.need.trim() ? "02" : "01", eyebrow: t("Le travail réalisé", "The work done"), title: "", text: para(x.r.work) } }] : []),
      ]) : null],
      ["gallery", photos.length ? sec("ph-gallery", { image_height: 292, layout_mobile: "pair", pad_top: 10, pad_bottom: 26, pad_top_mobile: 16, pad_bottom_mobile: 14 }, photos.slice(0, 6).map((p) => ({ type: "photo", settings: { image_asset: p.file, alt: p.alt, caption: "caption" in p ? p.caption : "", show: "all" } }))) : null],
      ["related", others.length ? sec("ph-cards", { layout: "related", columns: 2, eyebrow: t("Autres réalisations", "Other projects"), pad_top: 20, pad_bottom: 30, pad_top_mobile: 18, pad_bottom_mobile: 24 }, others.map((o, j) => ({ type: "card", settings: { image_asset: o.main.file, alt: o.main.alt, number: `0${j + 1}`, label: plain(o.r.category), title: title(o), link: o.url ?? "", show: "all" } }))) : null],
      ["cta", cta(t("Discutons de votre projet.", "Let's discuss your project."), x.main)],
      phPage(),
    ];
    const suffix = `es-real-${x.r.id}`;
    templates[`page.${suffix}`] = tpl(rows);
    pages = pages.filter((p) => p.handle !== x.r.handle);
    pages.push({ handle: x.r.handle, title: title(x), template_suffix: suffix, body_html: "", seo: { title: `${title(x)} | ${spec.store.shopName}`.slice(0, 70), description: (plain(x.r.summary) || plain(x.r.work)).slice(0, 160) } });
  });

  // 5. Menus : la page ajoutée suit le lien des prestations (en-tête, téléphone, pied de page), sans doublon.
  const menus = galleryKey ? spec.store.menus : Object.fromEntries(Object.entries(spec.store.menus).map(([k, m]) => {
    if (m.links.some((l) => l.url === galleryUrl)) return [k, m];
    const at = m.links.findIndex((l) => /\/pages\/(prestations|services)\b/.test(l.url));
    if (at < 0) return [k, m];
    const links = [...m.links];
    links.splice(at + 1, 0, { title: t("Réalisations", "Our work"), url: galleryUrl } as (typeof links)[number]);
    return [k, { ...m, links }];
  }));
  return { ...spec, templates, files: { ...spec.files, ...files }, store: { ...spec.store, pages, menus } };
}
