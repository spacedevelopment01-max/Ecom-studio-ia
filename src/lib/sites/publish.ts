/**
 * Publication d'un site de services (#232) : « publier, c'est figer ». Toutes les pages accessibles depuis l'accueil sont
 * rendues par le moteur du studio (mode public), avec leurs fichiers (CSS, scripts, médias, polices), dans un artefact
 * immuable `DATA_DIR/sites/<projet>/<publication>/` décrit par un manifeste (empreintes SHA-256, version du thème, code).
 * Le site en ligne ne dépend ensuite plus des données vivantes du studio ; restaurer une publication la remet en ligne
 * à l'identique, sans nouveau rendu.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { HttpError } from "../auth";
import { all, id, logError, now, one, run } from "../db";
import { L } from "../i18n-server";
import { currentTheme, loadProject } from "../projects";
import { requirePlan } from "../plan-gates";
import { withContenus } from "../contenus";
import { carteChangedSince } from "../contenus/carte";
import { compileTheme, importedBinary, themeAssetBinary, themeFingerprint } from "../theme/compile";
import { libraryLoader } from "../theme/loader";
import { fontFilePath, renderPage } from "../theme/render";
import type { ThemeSpec } from "../theme/spec";
import { stableHash } from "../brain/hash";
import { rdvRules, rdvSection, serviceUrlFor } from "../rendez-vous";
import { ensureMaintenanceTables, purgeOldPublications, verifyPublication } from "./maintenance";
import { defaultStudioAddress, ensureSiteTables, livePublication, publication, publicationDir, setLive, sitesRoot, type Publication } from "./store";

/** Bornes d'une publication : un site vitrine reste petit ; au-delà, refus explicite plutôt qu'un artefact démesuré. */
export const LIMITS = { pages: 80, bytes: 250 * 1024 * 1024 };
/** Fiches de contenus métier (biens…) : comptées à part, une agence pouvant avoir des centaines de biens (#239). */
export const DETAIL_LIMIT = 600;
const isDetail = (pathname: string) => /^\/pages\/bien\//.test(pathname);
/** Chemins jamais publiés comme pages : boutique, compte, recherche, envoi de formulaire. */
const SKIPPED = /^\/(cart|account|checkout|search|password|contact$|collections\/all|products\/?)/;
/** Textes laissés à compléter : un site public ne les montre jamais. */
const PLACEHOLDER = /\[(?:À|A) (?:compléter|définir|préciser|renseigner|confirmer)[^\]]*\]|\[To (?:complete|define|be confirmed)[^\]]*\]|\[Por completar[^\]]*\]|À compléter dans Shopify/i;

/** Valeur laissée vide affichée seule par certains thèmes (mentions légales, coordonnées) : « À renseigner ». */
const BARE = /(?:^|\n|:)[ \t]*(?:À|A) renseigner[ \t]*:?[ \t]*(?=\n|$)/;

/** Champ piège ajouté aux formulaires de contact publiés : rempli = robot, la demande est ignorée. */
export const HONEYPOT = "contact[site_web]";
const HONEYPOT_HTML = `<div aria-hidden="true" style="position:absolute;left:-10000px;top:auto;width:1px;height:1px;overflow:hidden"><label>Ne pas remplir<input type="text" name="${HONEYPOT}" tabindex="-1" autocomplete="off" value=""></label></div>`;
/** Envoi réel des formulaires de contact publiés : le thème n'affiche son message de réussite qu'après l'enregistrement. */
const CONTACT_TRANSPORT = `<script>window.__esContactTransport=function(d){return fetch("/contact",{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify(d),credentials:"omit"}).then(function(r){if(!r.ok)throw new Error("envoi")})};</script>`;

/** Fichier de l'artefact pour un chemin de page : « / » → index.html, « /pages/contact » → pages/contact/index.html. */
export function pageFile(pathname: string): string {
  const clean = pathname.replace(/\/+$/, "") || "/";
  return clean === "/" ? "index.html" : `${clean.slice(1)}/index.html`;
}

/** Version « demande envoyée » d'une page (même dossier, jamais confondue avec une page : pas de nom index.html). */
export function postedFile(pathname: string): string {
  return pageFile(pathname).replace(/index\.html$/, "envoye.html");
}

const internalLinks = (html: string) => [...html.matchAll(/\shref="(\/[^"#?]*)(?:[?#][^"]*)?"/g)].map((m) => decodeURI(m[1]).replace(/\/+$/, "") || "/");
const fileRefs = (text: string) => [...text.matchAll(/\/(assets|__fonts)\/([A-Za-z0-9._%+@-]+(?:\/[A-Za-z0-9._%+@-]+)*)/g)].map((m) => ({ dir: m[1] as "assets" | "__fonts", name: decodeURIComponent(m[2]) }));
const safeName = (name: string) => !name.includes("..") && !path.isAbsolute(name) && /^[A-Za-z0-9._%+@/-]+$/.test(name);
const textType = (name: string) => (name.endsWith(".css") ? "text/css; charset=utf-8" : name.endsWith(".js") ? "application/javascript; charset=utf-8" : name.endsWith(".svg") ? "image/svg+xml" : name.endsWith(".json") ? "application/json" : "text/plain; charset=utf-8");

/** Publication bloquée : les raisons, pour l'encart du studio (aucun artefact n'est écrit). */
export class PublishBlocked extends HttpError {
  constructor(public reasons: string[]) { super(409, reasons.join(" "), "publish_blocked"); }
}

function codeCommit(): string {
  return process.env.STUDIO_BUILD_COMMIT || "inconnu";
}

type Rendered = { pages: Map<string, string>; posted: Map<string, string>; notFound: string; files: Map<string, { data: Buffer; type: string }>; missing: string[] };

/** Rend le site complet (pages accessibles depuis l'accueil, menus, pages et politiques) et rassemble ses fichiers. */
export async function renderSite(spec: ThemeSpec, origin: string): Promise<Rendered> {
  const files = compileTheme(spec);
  const opts = { spec, base: "", files, cart: [], publicOrigin: origin };
  const pages = new Map<string, string>();
  const queue = ["/", ...spec.store.pages.map((p) => `/pages/${p.handle}`), ...spec.store.policies.map((p) => `/policies/${p.handle}`)];
  const seen = new Set<string>();
  while (queue.length) {
    const pathname = queue.shift()!;
    if (seen.has(pathname) || SKIPPED.test(pathname)) continue;
    seen.add(pathname);
    const details = [...pages.keys()].filter(isDetail).length;
    if (isDetail(pathname) ? details >= DETAIL_LIMIT : pages.size - details >= LIMITS.pages) throw new PublishBlocked([isDetail(pathname)
      ? L(`Le site compte plus de ${DETAIL_LIMIT} fiches : archivez les plus anciennes avant de le publier.`, `The site has more than ${DETAIL_LIMIT} listings: archive the oldest before publishing.`)
      : L(`Le site dépasse ${LIMITS.pages} pages : réduisez-le avant de le publier.`, `The site exceeds ${LIMITS.pages} pages: reduce it before publishing.`)]);
    const r = await renderPage(opts, pathname, new URLSearchParams());
    if (r.status !== 200) continue;
    pages.set(pathname, r.html);
    for (const link of internalLinks(r.html)) if (!seen.has(link) && !link.startsWith("/assets/") && !link.startsWith("/__fonts/")) queue.push(link);
  }
  // État « demande envoyée » des pages à formulaire de contact, servi après un envoi sans le script du thème.
  const posted = new Map<string, string>();
  for (const [pathname, html] of pages) {
    if (!html.includes('action="/contact#contact_form"')) continue;
    const r = await renderPage(opts, pathname, new URLSearchParams("contact_posted=true"));
    if (r.status === 200 && r.html !== html) posted.set(pathname, r.html);
  }
  const notFound = (await renderPage(opts, "/__page-introuvable__", new URLSearchParams())).html;
  // Fichiers référencés par les pages, puis par les feuilles de style et scripts eux-mêmes.
  const out = new Map<string, { data: Buffer; type: string }>();
  const missing: string[] = [];
  const todo = [...pages.values(), notFound].flatMap(fileRefs);
  const done = new Set<string>();
  while (todo.length) {
    const ref = todo.shift()!;
    const key = `${ref.dir}/${ref.name}`;
    if (done.has(key)) continue;
    done.add(key);
    if (!safeName(ref.name)) { missing.push(key); continue; }
    if (ref.dir === "__fonts") {
      const f = fontFilePath(ref.name);
      if (f) out.set(key, { data: fs.readFileSync(f), type: "font/ttf" }); else missing.push(key);
      continue;
    }
    const bin = spec.files[ref.name] ? await themeAssetBinary(spec, ref.name, libraryLoader) : importedBinary(spec, ref.name);
    if (bin) { out.set(key, { data: bin.data, type: bin.mime }); continue; }
    const text = files.get(`assets/${ref.name}`);
    if (text === undefined) { missing.push(key); continue; }
    out.set(key, { data: Buffer.from(text), type: textType(ref.name) });
    if (/\.(css|js)$/.test(ref.name)) todo.push(...fileRefs(text));
  }
  return { pages, posted, notFound, files: out, missing };
}

/**
 * Réservation en ligne des thèmes salon, cabinet et restaurant : un site public ne simule jamais une réservation. Le
 * service réel doit être activé (onglet Rendez-vous) et relié à l'adresse HTTPS du studio, sinon la publication attend.
 */
/** Contenus métier : un site public ne montre jamais de bien de démonstration (#239). */
export function contentBlockers(spec: ThemeSpec): string[] {
  const biens = spec.store.biens ?? [];
  const demo = biens.filter((b) => b.demo);
  // Classes DPE et GES obligatoires dans une annonce de vente ou de location (un terrain n'en a pas) : la fiche
  // afficherait « à renseigner » au public. Raison par bien (référence, titre), plus claire qu'un refus de page.
  const energy = biens.filter((b) => b.type !== "terrain" && (!b.dpe || !b.ges)).map((b) => L(`Bien ${b.ref} « ${b.title} » : classes DPE et GES à renseigner dans l'onglet Biens (obligatoires dans une annonce de vente ou de location).`, `Property ${b.ref} “${b.title}”: enter the DPE and GES energy classes in the Properties tab (required in a sale or rental listing).`));
  return [...energy, ...(demo.length ? [L(`${demo.length} bien(s) de démonstration sont visibles (${demo.slice(0, 3).map((b) => b.ref).join(", ")}${demo.length > 3 ? "…" : ""}) : archivez-les ou remplacez-les par vos biens avant de publier.`, `${demo.length} demonstration propert(ies) are visible (${demo.slice(0, 3).map((b) => b.ref).join(", ")}${demo.length > 3 ? "…" : ""}): archive or replace them with your own before publishing.`)] : [])];
}

/** Fiches déjà expliquées par une raison « par bien » : pas de second refus, moins clair, pour la même page. */
export function contentPagesWithReasons(spec: ThemeSpec): Set<string> {
  return new Set((spec.store.biens ?? []).filter((b) => b.type !== "terrain" && (!b.dpe || !b.ges)).map((b) => `/pages/bien/${b.handle}`));
}

/** Empreinte du contenu publié : même calcul à la publication et pour savoir si le site en ligne est à jour. */
export const siteHash = (spec: ThemeSpec) => stableHash("site-publication", spec);

export function bookingBlockers(projectId: string, spec: ThemeSpec): string[] {
  const sec = rdvSection(spec);
  if (!sec) return [];
  const s = sec.section.settings ?? {};
  if (s.booking_mode !== "live") return [L("La réservation en ligne de votre site est en mode démonstration : activez le service réel dans l'onglet Rendez-vous avant de publier (un site public ne simule jamais une réservation).", "Your site's online booking is in demonstration mode: enable the live service in the Bookings tab before publishing (a public site never simulates a booking).")];
  const expected = serviceUrlFor(projectId, sec.kind);
  if (!expected || String(s.service_url ?? "") !== expected) return [L("La réservation en ligne n'est pas reliée au service du studio : réactivez-la dans l'onglet Rendez-vous.", "Online booking isn't linked to the studio's service: enable it again in the Bookings tab.")];
  // Un calendrier sans aucun horaire n'offre jamais de créneau : le visiteur ne pourrait rien réserver.
  const r = rdvRules(projectId, sec.kind);
  const open = sec.kind === "restaurant"
    ? Object.keys(r.hours).length > 0 && r.services.some((x) => (x as { slots?: string[] }).slots?.length)
    : Object.values(r.hours ?? {}).some((v) => Array.isArray(v) && v.length > 0) || r.workshops.length > 0;
  if (!open) return [L("Aucun horaire de réservation n'est réglé : le calendrier du site ne proposerait aucun créneau. Renseignez vos horaires dans la section de réservation du site.", "No booking hours are set: the site's calendar would offer no slot. Set your hours in the site's booking section.")];
  return [];
}

/** Points qui empêchent la publication : textes à compléter, pages vides. */
export function publishBlockers(r: Pick<Rendered, "pages"> & { missing?: string[] }, skip: Set<string> = new Set()): string[] {
  const reasons: string[] = [];
  // Média ou fichier référencé introuvable (média supprimé de la bibliothèque, fichier du thème absent) : le site
  // publié aurait une image ou une mise en forme cassée.
  if (r.missing?.length) reasons.push(L(`${r.missing.length} fichier(s) du site introuvable(s) (${r.missing.slice(0, 5).map((m) => m.split("/").pop()).join(", ")}${r.missing.length > 5 ? "…" : ""}) : remplacez ou retirez ces médias dans l'éditeur du site.`, `${r.missing.length} site file(s) not found (${r.missing.slice(0, 5).map((m) => m.split("/").pop()).join(", ")}${r.missing.length > 5 ? "…" : ""}): replace or remove these media in the site editor.`));
  for (const [p, html] of r.pages) {
    if (skip.has(p)) continue;
    // Texte visible seulement (sans scripts, styles ni attributs : une aide de saisie « À renseigner » n'est pas une lacune).
    const text = html.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, "\n");
    const m = text.match(PLACEHOLDER) ?? text.match(BARE);
    if (m) reasons.push(L(`Page ${p} : texte à compléter avant publication (« ${m[0].trim().slice(0, 80)} »).`, `Page ${p}: text to complete before publishing (“${m[0].trim().slice(0, 80)}”).`));
  }
  if (!r.pages.has("/")) reasons.push(L("La page d'accueil n'a pas pu être rendue.", "The home page couldn't be rendered."));
  return reasons;
}

/** Ajouts propres au site publié : envoi réel des formulaires de contact et champ piège. */
export function finalizeHtml(html: string): string {
  if (!html.includes('name="form_type" value="contact"')) return html;
  return html
    .replace(/(<input type="hidden" name="form_type" value="contact">)/g, `$1${HONEYPOT_HTML}`)
    .replace("</head>", () => `${CONTACT_TRANSPORT}</head>`);
}

const sha = (data: Buffer | string) => crypto.createHash("sha256").update(data).digest("hex");

/** Écriture atomique : dossier temporaire complet, vérifié, puis renommé ; jamais d'artefact à moitié écrit. */
function writeArtifact(projectId: string, publicationId: string, r: Rendered, meta: Record<string, unknown>) {
  const tmp = path.join(sitesRoot(), projectId, `.tmp-${publicationId}`);
  fs.rmSync(tmp, { recursive: true, force: true });
  const entries: Record<string, { sha256: string; bytes: number; type: string }> = {};
  const put = (rel: string, data: Buffer, type: string) => {
    const file = path.join(tmp, "files", rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, data);
    entries[rel] = { sha256: sha(data), bytes: data.length, type };
  };
  for (const [p, html] of r.pages) put(pageFile(p), Buffer.from(finalizeHtml(html)), "text/html; charset=utf-8");
  for (const [p, html] of r.posted) put(postedFile(p), Buffer.from(finalizeHtml(html)), "text/html; charset=utf-8");
  put("404.html", Buffer.from(finalizeHtml(r.notFound)), "text/html; charset=utf-8");
  for (const [key, f] of r.files) put(key, f.data, f.type);
  const bytes = Object.values(entries).reduce((s, e) => s + e.bytes, 0);
  if (bytes > LIMITS.bytes) {
    fs.rmSync(tmp, { recursive: true, force: true });
    throw new PublishBlocked([L(`Le site pèse plus de ${Math.round(LIMITS.bytes / 1048576)} Mo : allégez ses médias avant de le publier.`, `The site weighs more than ${Math.round(LIMITS.bytes / 1048576)} MB: lighten its media before publishing.`)]);
  }
  const manifest = JSON.stringify({ ...meta, pages: [...r.pages.keys()], missing: r.missing, files: entries }, null, 1);
  fs.writeFileSync(path.join(tmp, "manifest.json"), manifest);
  const final = publicationDir(projectId, publicationId);
  fs.renameSync(tmp, final);
  return { bytes, manifestSha: sha(manifest) };
}

/** Lecture du manifeste d'une publication (fichiers servis et leurs empreintes). */
export function manifestOf(projectId: string, publicationId: string): { pages: string[]; files: Record<string, { sha256: string; bytes: number; type: string }>; origin: string } | null {
  try { return JSON.parse(fs.readFileSync(path.join(publicationDir(projectId, publicationId), "manifest.json"), "utf8")); } catch { return null; }
}

/**
 * Publie la version courante du site du projet et la met en ligne. Refus explicite (aucun artefact) si l'hébergement
 * n'est pas configuré, si le projet n'est pas un site de services, sans forfait actif, ou s'il reste des textes à compléter.
 */
export async function publishSite(projectId: string, userId: string): Promise<Publication> {
  ensureSiteTables();
  requirePlan(null, projectId);
  const p = loadProject(projectId);
  if (p.business !== "services") throw new HttpError(409, L("La publication par le studio est réservée aux sites d'entreprises de services ; une boutique s'exporte vers sa plateforme.", "Publishing from the studio is for service business sites; a store is exported to its platform."), "not_services");
  const cur = currentTheme(projectId);
  if (!cur) throw new HttpError(409, L("Créez d'abord le site dans l'onglet Site.", "Create the site in the Site tab first."), "no_site");
  const address = defaultStudioAddress(projectId, p.brand?.name || p.name);
  const origin = `${process.env.SITES_SCHEME === "http" ? "http" : "https"}://${address.hostname}${process.env.SITES_PORT ? `:${process.env.SITES_PORT}` : ""}`;
  const spec = withContenus(cur.spec as ThemeSpec, projectId);
  const rendered = await renderSite(spec, origin);
  const reasons = [...bookingBlockers(projectId, spec), ...contentBlockers(spec), ...publishBlockers(rendered, contentPagesWithReasons(spec))];
  if (reasons.length) throw new PublishBlocked(reasons);
  const pubId = id();
  const number = (one<{ n: number | null }>("SELECT MAX(number) n FROM site_publications WHERE project_id = ?", projectId)?.n ?? 0) + 1;
  const meta = { publicationId: pubId, projectId, number, themeVersionId: cur.version.id, specHash: siteHash(spec), themeFingerprint: themeFingerprint(spec), codeCommit: codeCommit(), origin, createdAt: now() };
  const { bytes, manifestSha } = writeArtifact(projectId, pubId, rendered, meta);
  run("INSERT INTO site_publications (id, project_id, user_id, number, theme_version_id, spec_hash, theme_fingerprint, code_commit, status, pages, bytes, manifest_sha, origin, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
    pubId, projectId, userId, number, cur.version.id, meta.specHash, meta.themeFingerprint, meta.codeCommit, "ready", rendered.pages.size, bytes, manifestSha, origin, meta.createdAt);
  setLive(projectId, pubId, "publish", userId);
  // Anciennes versions au-delà de la limite : fichiers purgés (jamais la version en ligne ni les plus récentes).
  try { purgeOldPublications(projectId); } catch (e) { logError("sites:purge", e, { projectId }); }
  return publication(projectId, pubId)!;
}

/**
 * Le site en ligne est-il à jour ? Compare l'empreinte de ce qui serait publié maintenant (thème + contenus métier)
 * à celle de la version en ligne. Dit aussi ce qui a changé (version du thème, biens modifiés depuis la publication),
 * pour que le client sache qu'il doit republier : le site public ne change jamais tout seul (#239).
 */
export function siteFreshness(projectId: string): { live: boolean; upToDate: boolean; themeChanged: boolean; changedBiens: number; changedCarte: number } {
  const live = livePublication(projectId);
  const cur = currentTheme(projectId);
  if (!live || !cur) return { live: !!live, upToDate: true, themeChanged: false, changedBiens: 0, changedCarte: 0 };
  const spec = withContenus(cur.spec as ThemeSpec, projectId);
  const changedBiens = all<{ n: number }>("SELECT COUNT(*) n FROM biens WHERE project_id = ? AND updated_at > ?", projectId, live.created_at)[0]?.n ?? 0;
  return { live: true, upToDate: siteHash(spec) === live.spec_hash, themeChanged: cur.version.id !== live.theme_version_id, changedBiens, changedCarte: carteChangedSince(projectId, live.created_at) };
}

/** Remet en ligne une publication précédente, telle quelle (son artefact est vérifié avant). */
export function restorePublication(projectId: string, publicationId: string, userId: string): Publication {
  requirePlan(null, projectId);
  const pub = publication(projectId, publicationId);
  if (!pub) throw new HttpError(404, L("Publication introuvable.", "Publication not found."));
  ensureMaintenanceTables();
  if (pub.purged_at) throw new HttpError(409, L("Les fichiers de cette ancienne publication ont été purgés (seules les plus récentes sont gardées) : elle ne peut plus être remise en ligne.", "This old publication's files were purged (only the most recent are kept): it can't be put back online."), "artifact_purged");
  // Chaque fichier est vérifié contre son empreinte avant la remise en ligne : jamais une version incomplète ou altérée.
  const check = verifyPublication(projectId, publicationId);
  if (!check.ok) throw new HttpError(409, L(`Les fichiers de cette publication sont incomplets ou altérés (${check.manifest ? `${check.missing.length} manquant(s), ${check.corrupt.length} altéré(s)` : "manifeste introuvable"}) : elle ne peut pas être restaurée.`, `This publication's files are incomplete or altered (${check.manifest ? `${check.missing.length} missing, ${check.corrupt.length} altered` : "manifest not found"}): it can't be restored.`), "artifact_invalid");
  setLive(projectId, publicationId, "restore", userId);
  return pub;
}

/** Retire le site de la ligne (les publications restent conservées et restaurables). */
export function unpublishSite(projectId: string, userId: string) {
  if (livePublication(projectId)) setLive(projectId, null, "unpublish", userId);
}
