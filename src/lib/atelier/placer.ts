/**
 * POSER UNE CRÉATION À L'ENDROIT CHOISI (22 novembre 2026, limites de l'atelier, point 3). Depuis « Mes créations »
 * (ou par SINA, quand le client le lui demande), une création réussie va vraiment là où il la veut :
 *  - « Une publication » : un brouillon de publication avec l'image (rien n'est publié) ;
 *  - « Une publicité » : une publicité préparée avec l'image, en brouillon (aucune diffusion, aucune dépense) ;
 *  - « Mon site » : la photo d'une section de son site, celle qu'il a désignée.
 *
 * Règles du propriétaire appliquées ici, pour l'écran comme pour SINA : une création ratée, « produit modifié »
 * (gardée à part), refusée par le client ou mise de côté par la vérification ne part nulle part ; les photos de ses
 * produits restent sur les emplacements produit (une création ne remplace jamais une photo de produit ni un emplacement
 * de produit) ; jamais deux fois la même photo sur son site ; aucun texte inventé (les textes restent à écrire).
 */
import { HttpError, type User } from "../auth";
import { json, one } from "../db";
import { listProducts } from "../products/catalog";
import { L } from "../i18n-server";
import { addUsage, assetUrl, getAsset, type Asset } from "../library";
import type { Project } from "../projects";
import { createManualPost } from "../social-v2/manual";
import { saveManualCampaign } from "../campaigns/manual";
import { assertAdvertising } from "../job-entitlements";
import { findSection, loadCustomTheme, saveCustomTheme, sectionHtml, allSections, type CustomTheme } from "../syna-agent/custom-theme/theme";
import { isCutoutPhoto, libSection } from "../syna-agent/custom-theme/library";
import { riskCount } from "../syna-agent/custom-theme/risk";
import { deCote } from "./verification-photos";

export type Cible = "publication" | "publicite" | "site";

/** Rôles des sections qui montrent les produits : leurs photos restent celles des produits. */
const ROLES_PRODUIT = new Set(["produit", "produits", "produit vedette", "panier", "rayons", "looks", "commande", "comparatif", "lot"]);
/** Rôles des photos de produit du client dans la bibliothèque. */
const PHOTOS_PRODUIT = new Set(["original", "packshot", "product", "cutout", "catalog-original", "variant-original"]);

/** La création à poser, si elle peut partir (sinon la raison, en tutoyant). */
export function creationAPoser(projectId: string, creationId: string): { assetId: string; asset: Asset; kind: "image" | "video" } {
  const c = one<{ asset_id: string | null; status: string; kind: "image" | "video" }>("SELECT asset_id, status, kind FROM atelier_creations WHERE id = ? AND project_id = ?", creationId, projectId);
  if (!c) throw new HttpError(404, L("Création introuvable.", "Creation not found."));
  if (c.status === "rate") throw new HttpError(409, L("Cette création est ratée : elle ne part nulle part.", "This creation failed: it doesn't go anywhere."), "creation_ratee");
  if (c.status === "produit_modifie") throw new HttpError(409, L("Ton produit a changé sur cette création : je la garde à part, elle ne part nulle part.", "Your product changed on this creation: I keep it aside, it doesn't go anywhere."), "creation_a_part");
  const a = c.asset_id ? getAsset(c.asset_id) : null;
  if (!a || a.project_id !== projectId || a.deleted_at) throw new HttpError(404, L("Cette création n'a pas d'image retenue.", "This creation has no kept image."));
  const meta = json<Record<string, unknown>>(a.meta, {});
  if (a.status === "rejected" || meta.userRejected) throw new HttpError(409, L("Tu as refusé cette image : elle ne part nulle part.", "You refused this image: it doesn't go anywhere."), "creation_refusee");
  if (deCote(meta)) throw new HttpError(409, L("Cette image est gardée de côté tant qu'elle n'est pas vérifiée : elle ne part nulle part.", "This image is kept aside until it is checked: it doesn't go anywhere."), "photo_a_verifier");
  return { assetId: a.id, asset: a, kind: c.kind };
}

/** « Une publication » : un brouillon avec l'image (le même brouillon si elle y est déjà ; rien n'est publié). */
export function poserDansPublication(p: Project, user: User, creationId: string): { postId: string; lien: string; deja: boolean } {
  const c = creationAPoser(p.id, creationId);
  const deja = one<{ id: string }>("SELECT id FROM posts WHERE project_id = ? AND status = 'review' AND media LIKE ? ORDER BY created_at DESC LIMIT 1", p.id, `%"${c.assetId}"%`);
  if (deja) return { postId: deja.id, lien: `/studio/${p.id}/publications`, deja: true };
  const { id } = createManualPost(p, user.id, { network: "instagram", format: c.kind === "video" ? "reel" : "image", title: "", caption: "", hashtags: "", media: [c.assetId] }, { brief: { atelier: { creationId } } });
  return { postId: id, lien: `/studio/${p.id}/publications`, deja: false };
}

/** « Une publicité » : une publicité préparée avec l'image, en brouillon (aucune diffusion ; textes à écrire). */
export function poserDansPublicite(p: Project, user: User, creationId: string): { campaignId: string; lien: string; deja: boolean } {
  const c = creationAPoser(p.id, creationId);
  if (c.kind !== "image") throw new HttpError(400, L("Une vidéo se prépare dans la vidéo guidée des publicités.", "A video is prepared in the ads guided video."));
  const deja = one<{ target_id: string }>("SELECT target_id FROM asset_usages WHERE asset_id = ? AND target_type = 'campaign' AND target_id IN (SELECT id FROM campaigns WHERE project_id = ? AND status <> 'archived') LIMIT 1", c.assetId, p.id);
  if (deja) return { campaignId: deja.target_id, lien: `/studio/${p.id}/publicites`, deja: true };
  assertAdvertising(p.id);
  const a = c.asset;
  const media = [{ id: a.id, name: a.name, url: assetUrl(a), thumbUrl: a.thumb_key ? assetUrl(a, { thumb: true }) : assetUrl(a), kind: a.kind, meta: { format: json<{ format?: string }>(a.meta, {}).format } }];
  const lang = L("fr", "en") as "fr" | "en";
  const r = saveManualCampaign(p, user, { name: L("Publicité avec ma création", "Ad with my creation"), objective: "", networks: [], brief: { language: lang, atelier: { creationId } }, plan: { ads: [{ angle: "", primary: "", headline: "", cta: "", media }] }, status: "draft" });
  addUsage(a.id, "campaign", r.id, L("Publicité", "Ad"));
  return { campaignId: r.id, lien: `/studio/${p.id}/publicites`, deja: false };
}

/** L'emplacement désigné montre-t-il un produit (section de produits, page produit, photo de produit du client) ? */
export function emplacementProduit(projectId: string, t: CustomTheme, uid: string, src: string): boolean {
  const x = findSection(t, uid);
  if (!x) return false;
  if (x.page?.product) return true;
  if (ROLES_PRODUIT.has(libSection(x.s.id)?.role ?? "")) return true;
  if (isCutoutPhoto(src)) return true;
  const id = /\/api\/files\/([\w-]+)/.exec(src)?.[1];
  const a = id ? getAsset(id) : null;
  if (a && a.project_id === projectId && (PHOTOS_PRODUIT.has(a.role ?? "") || listProducts(projectId).some((pr) => (pr.data.images ?? []).some((im) => im.assetId === a.id)))) return true;
  return false;
}

/**
 * « Mon site » : la création remplace la photo désignée d'une section (un emplacement qui n'est pas celui d'un
 * produit), jamais deux fois sur le site. La version d'avant reste dans l'historique (« annuler »).
 */
export function poserSurLeSite(p: Project, creationId: string, o: { uid: string; src: string }): { uid: string; lien: string } {
  const c = creationAPoser(p.id, creationId);
  if (c.kind !== "image") throw new HttpError(400, L("Seule une image se pose sur ton site.", "Only an image goes on your site."));
  const t = loadCustomTheme(p.id);
  if (!t) throw new HttpError(409, L("Ton site n'est pas encore créé.", "Your site isn't created yet."));
  const url = assetUrl({ id: c.assetId });
  if (allSections(t).some((x) => sectionHtml(x.s).includes(url))) throw new HttpError(409, L("Cette création est déjà sur ton site : jamais deux fois la même photo.", "This creation is already on your site: never the same photo twice."), "photo_en_double");
  const next: CustomTheme = JSON.parse(JSON.stringify(t));
  const x = findSection(next, o.uid);
  if (!x) throw new HttpError(404, L("Je ne retrouve pas cet endroit de ton site : clique à nouveau sur la photo.", "I can't find that spot on your site: click the photo again."));
  if (emplacementProduit(p.id, next, o.uid, o.src)) throw new HttpError(409, L("Les photos de tes produits restent à leur place : choisis une autre photo de ton site (l'ouverture, une ambiance, ton histoire…).", "Your product photos stay where they are: choose another photo on your site (the opening, a mood, your story…)."), "emplacement_produit");
  const html = sectionHtml(x.s), find = o.src.replace(/^https?:\/\/[^/]+/, "").replace(/[?#].*$/, "");
  const file = find.replace(/^.*\//, "");
  const trouve = find.includes("/") && html.includes(find) ? find : html.match(new RegExp(`(?:\\./)?(?:photos/)?${file.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`))?.[0];
  if (!file || !trouve) throw new HttpError(409, L("Cette photo de ton site ne se remplace pas d'un clic : demande-le à SINA.", "This photo on your site can't be replaced with a click: ask SINA."), "photo_introuvable");
  const neuf = html.split(trouve).join(url);
  if (riskCount(neuf) > riskCount(html)) throw new HttpError(409, L("Rien n'est changé.", "Nothing changed."));
  x.s.html = neuf;
  saveCustomTheme(p.id, next);
  addUsage(c.assetId, "theme_section", o.uid, L("Photo du site", "Site photo"));
  return { uid: o.uid, lien: `/studio/${p.id}/boutique` };
}
