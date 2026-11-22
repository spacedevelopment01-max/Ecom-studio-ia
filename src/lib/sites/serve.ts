/**
 * Service d'un site publié (#232) : nom d'hôte → adresse active → publication en ligne → fichier de l'artefact. Aucun
 * rendu Liquid, aucune session : seul ce qui a été figé à la publication est servi. Le studio n'est jamais servi sous
 * un nom de site ; un nom inconnu, désactivé ou non vérifié reçoit 404.
 */
import fs from "node:fs";
import path from "node:path";
import { one } from "../db";
import { L } from "../i18n-server";
import { identifyProject } from "../access-scope";
import { projectPlan } from "../project-billing";
import { customDomainsEnabled } from "./host-match";
import { manifestOf, pageFile, postedFile } from "./publish";
import { recordTraffic } from "./maintenance";
import { customDomainServable } from "./domains";
import { receiveSiteRequest } from "./requests";
import { aCompter, CHEMIN_REFUS, compterVue, MENTION_MESURE, pageRefus } from "./visites";
import { suiviAllume } from "../suivi/reglages";
import { appUrl } from "../settings";
import { BADGE_IA, bulleAssistante, premierMessage } from "../suivi/assistante";
import { addresses, addressOf, livePublication, publicationDir, type Publication, type SiteAddress } from "./store";

const SECURITY = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "SAMEORIGIN",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

function plain(status: number, text: string) {
  return new Response(text, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", ...SECURITY } });
}

/** Site servi par ce nom d'hôte, ou null (inconnu, désactivé, domaine personnalisé non vérifié, rien en ligne). */
export function siteFor(hostname: string): { address: SiteAddress; pub: Publication } | null {
  const address = addressOf(hostname);
  if (!address) return null;
  // Projet archivé ou masqué : son site n'est plus servi.
  const project = one<{ archived: number; hidden: number }>("SELECT archived, hidden FROM projects WHERE id = ?", address.project_id);
  if (!project || project.archived || project.hidden) return null;
  // Domaine relié : vérifié par le propriétaire actuel du projet, ni désactivé ni perdu, et mise en service globale.
  if (address.kind === "studio" ? address.status !== "active" : !customDomainServable(address) || !customDomainsEnabled()) return null;
  identifyProject(address.project_id);
  const pub = livePublication(address.project_id);
  return pub ? { address, pub } : null;
}

/** Chemin demandé → fichier de l'artefact (pages, fichiers du thème, polices), sans jamais sortir du dossier. */
function artifactPath(pub: Publication, rel: string): string | null {
  const root = path.join(publicationDir(pub.project_id, pub.id), "files");
  const file = path.resolve(root, rel);
  return file.startsWith(root + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile() ? file : null;
}

async function resized(pub: Publication, rel: string, file: string, width: number): Promise<Buffer> {
  const w = Math.max(80, Math.min(2400, Math.round(width)));
  const cache = path.join(publicationDir(pub.project_id, pub.id), "cache", `w${w}`, rel);
  if (fs.existsSync(cache)) return fs.readFileSync(cache);
  const sharp = (await import("sharp")).default;
  const data = await sharp(fs.readFileSync(file)).resize({ width: w, withoutEnlargement: true }).toBuffer();
  fs.mkdirSync(path.dirname(cache), { recursive: true });
  fs.writeFileSync(`${cache}.tmp`, data);
  fs.renameSync(`${cache}.tmp`, cache);
  return data;
}

/** Chemin de la page d'où vient l'envoi, seulement si elle est sur ce même site. */
function refererPath(req: Request, hostname: string): string | null {
  try {
    const u = new URL(req.headers.get("referer") ?? "");
    return u.hostname === hostname ? u.pathname : null;
  } catch {
    return null;
  }
}

/**
 * UNE SEULE ADRESSE PAR SITE (recherche 04, 22 novembre 2026 ; Google : « redirections permanentes côté serveur, puis
 * rel=canonical ») : quand le client a relié son domaine et qu'il est servi, c'est l'adresse principale ; l'adresse du
 * Studio et toute autre variante y renvoient en permanence. Sans domaine relié, l'adresse du Studio reste la principale.
 */
export function adressePrincipale(projectId: string): string | null {
  const custom = addresses(projectId).filter((a) => a.kind === "custom" && customDomainServable(a)).sort((a, b) => (a.verified_at ?? a.created_at) - (b.verified_at ?? b.created_at));
  if (custom.length && customDomainsEnabled()) return (custom.find((a) => !a.hostname.startsWith("www.")) ?? custom[0]).hostname;
  return addresses(projectId).find((a) => a.kind === "studio" && a.status === "active")?.hostname ?? null;
}
/** La page dit son adresse principale à Google (une seule, jamais deux). */
export function avecCanonique(html: string, url: string): string {
  if (/<link[^>]+rel=["']canonical["']/i.test(html)) return html.replace(/(<link[^>]+rel=["']canonical["'][^>]*href=["'])[^"']*(["'])/i, `$1${url}$2`);
  return html.replace(/<\/head>/i, `<link rel="canonical" href="${url.replace(/"/g, "&quot;")}"></head>`);
}

/** Les pages légales d'un site (mentions, confidentialité, cookies), à leur adresse. */
export const PAGE_LEGALE = /(mentions|legal|l[ée]gales?|confidentialit|privacy|cookies|policies\/)/i;
/**
 * La ligne de la mesure d'audience (exemption de la CNIL : le visiteur est informé et peut refuser), posée par le Studio
 * en bas des pages légales du site qu'il héberge, une fois ; jamais deux fois, jamais ailleurs.
 */
export function avecMentionMesure(html: string, pathname: string): string {
  if (!PAGE_LEGALE.test(pathname) || html.includes("data-mesure-audience")) return html;
  const ligne = `<p data-mesure-audience style="max-width:48rem;margin:2rem auto;padding:0 1rem;font-size:.85em;line-height:1.5">${MENTION_MESURE.replace(CHEMIN_REFUS, `<a href="${CHEMIN_REFUS}">${CHEMIN_REFUS}</a>`)}</p>`;
  return /<\/main>/i.test(html) ? html.replace(/<\/main>/i, `${ligne}</main>`) : html.replace(/<\/body>/i, `${ligne}</body>`);
}

/**
 * La bulle de l'assistante IA (recherche 08, point 4), posée par le Studio sur les pages qu'il héberge SEULEMENT quand le
 * réglage `suivi.assistante` est allumé (éteint par défaut : aucune page ne change).
 */
export function avecAssistante(html: string, projectId: string): string {
  if (!suiviAllume("assistante") || html.includes("data-assistante-ia")) return html;
  const nom = one<{ name: string }>("SELECT name FROM projects WHERE id=?", projectId)?.name ?? "";
  return html.replace(/<\/body>/i, `${bulleAssistante(`${appUrl()}/api/public/assistante/${projectId}`, premierMessage(nom, null), L(BADGE_IA.fr, BADGE_IA.en))}</body>`);
}

export async function serveSite(req: Request, hostname: string, pathname: string): Promise<Response> {
  const site = siteFor(hostname);
  if (!site) return plain(404, L("Site introuvable.", "Site not found."));
  const { address, pub } = site;
  const principale = adressePrincipale(address.project_id);
  // Une autre adresse que la principale : renvoi permanent (les envois de formulaire, eux, sont reçus là où ils arrivent).
  if (principale && principale !== hostname && (req.method === "GET" || req.method === "HEAD")) {
    const u = new URL(req.url);
    return new Response(null, { status: 301, headers: { Location: `${new URL(pub.origin).protocol}//${principale}${pathname}${u.search}`, "Cache-Control": "public, max-age=3600", ...SECURITY } });
  }
  // Forfait du projet expiré : le site est suspendu (pas supprimé), sans exposer de détail de facturation.
  if (!projectPlan(address.project_id)) return plain(503, L("Ce site est momentanément indisponible.", "This site is temporarily unavailable."));
  const manifest = manifestOf(pub.project_id, pub.id);
  if (!manifest) return plain(503, L("Ce site est momentanément indisponible.", "This site is temporarily unavailable."));
  const origin = `${new URL(pub.origin).protocol}//${hostname}${new URL(pub.origin).port ? `:${new URL(pub.origin).port}` : ""}`;
  if (req.method === "POST") {
    if (pathname !== "/contact") return plain(405, "Method Not Allowed");
    const r = await receiveSiteRequest(req, address, pub);
    if ((req.headers.get("accept") ?? "").includes("application/json") || (req.headers.get("content-type") ?? "").includes("application/json")) return Response.json(r.body, { status: r.status, headers: { "Cache-Control": "no-store", ...SECURITY } });
    // Envoi sans le script du thème : page de confirmation du thème si elle existe, sinon retour à la page du formulaire
    // dans son état « demande envoyée » (comme Shopify), sinon page simple (ou d'échec).
    const ok = r.body.ok;
    if (ok && manifest.files["pages/confirmation/index.html"]) return new Response(null, { status: 303, headers: { Location: "/pages/confirmation", "Cache-Control": "no-store", ...SECURITY } });
    const from = refererPath(req, hostname);
    if (ok && from !== null && manifest.files[postedFile(from)]) return new Response(null, { status: 303, headers: { Location: `${from}?contact_posted=true#contact_form`, "Cache-Control": "no-store", ...SECURITY } });
    const html = `<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${ok ? "Demande envoyée" : "Envoi impossible"}</title><body style="font-family:system-ui,sans-serif;max-width:36rem;margin:4rem auto;padding:0 1rem;line-height:1.5"><h1>${ok ? "Votre demande a bien été envoyée." : "Votre demande n'a pas pu être envoyée."}</h1><p>${ok ? "Elle a été transmise au professionnel, qui vous répondra." : "Vérifiez votre adresse e-mail et votre message, puis réessayez dans quelques minutes."}</p><p><a href="/">Retour au site</a></p></body></html>`;
    return new Response(html, { status: r.status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", ...SECURITY } });
  }
  if (req.method !== "GET" && req.method !== "HEAD") return plain(405, "Method Not Allowed");
  const etag = `"${pub.id}"`;
  if (pathname === CHEMIN_REFUS) return pageRefus(origin);
  if (pathname === "/robots.txt") return new Response(`User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=300", ...SECURITY } });
  if (pathname === "/sitemap.xml") {
    const urls = manifest.pages.map((p) => `<url><loc>${origin}${p === "/" ? "/" : p}</loc><lastmod>${new Date(pub.created_at).toISOString().slice(0, 10)}</lastmod></url>`).join("");
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=300", ...SECURITY } });
  }
  let rel: string;
  try { rel = decodeURIComponent(pathname).replace(/^\/+/, ""); } catch { return plain(400, "Bad Request"); }
  if (rel.startsWith("assets/") || rel.startsWith("__fonts/")) {
    const file = artifactPath(pub, rel);
    const entry = manifest.files[rel];
    if (!file || !entry) return plain(404, L("Fichier introuvable.", "File not found."));
    const width = Number(new URL(req.url).searchParams.get("width"));
    const data = width && entry.type.startsWith("image/") && !entry.type.includes("svg") && width < 2400 ? await resized(pub, rel, file, width) : fs.readFileSync(file);
    recordTraffic(pub.project_id, data.length);
    return new Response(req.method === "HEAD" ? null : new Uint8Array(data), { headers: { "Content-Type": entry.type, "Cache-Control": "public, max-age=300", ETag: etag, ...SECURITY } });
  }
  if (new URL(req.url).searchParams.get("contact_posted") === "true" && manifest.files[postedFile(pathname)]) {
    const html = fs.readFileSync(artifactPath(pub, postedFile(pathname))!);
    return new Response(req.method === "HEAD" ? null : new Uint8Array(html), { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex", ...SECURITY } });
  }
  const page = pageFile(pathname);
  const file = manifest.files[page] ? artifactPath(pub, page) : null;
  if (req.headers.get("if-none-match") === etag && file) return new Response(null, { status: 304, headers: { ETag: etag } });
  const status = file ? 200 : 404;
  const raw = fs.readFileSync(file ?? artifactPath(pub, "404.html")!);
  const html = status === 200 ? Buffer.from(avecAssistante(avecMentionMesure(avecCanonique(raw.toString("utf8"), `${origin}${pathname === "/" ? "/" : pathname}`), pathname), pub.project_id)) : raw;
  recordTraffic(pub.project_id, html.length);
  // Les pages vues, comptées sans traceur (exemption de la CNIL) : jamais une erreur de compte ne gêne la page.
  if (status === 200 && aCompter(req)) { try { compterVue(pub.project_id, pathname); } catch { /* compte perdu, page servie */ } }
  return new Response(req.method === "HEAD" ? null : new Uint8Array(html), { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": status === 200 ? "public, max-age=60, must-revalidate" : "no-store", ETag: etag, ...SECURITY } });
}
