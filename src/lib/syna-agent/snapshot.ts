/** État du projet relu à chaque étape de SINA : bref, à jour, avec les identifiants utiles. */
import { all, json, one } from "../db";
import { currentTheme, loadProject } from "../projects";
import { listProducts } from "../products/catalog";
import { stateOf } from "../preparation/store";
import type { ToolContext } from "./types";
import { changesOf } from "./store";
import { loadMockupSet } from "./mockup-code/mockup-set";
import { loadSiteCopy } from "./mockup-code/copy";

export async function projectSnapshot(ctx: ToolContext): Promise<string> {
  const p = loadProject(ctx.projectId!);
  const t = currentTheme(p.id);
  const products = listProducts(p.id).slice(0, 12).map((x) => `${x.data.title} [${x.id}] ${x.data.price == null ? "prix non fixé" : `${(x.data.price / 100).toFixed(2)} ${x.data.currency}`}${x.variants.length > 1 ? `, variantes : ${x.variants.map((v) => v.options.join("/") + (v.price != null ? ` ${(v.price / 100).toFixed(2)}` : "")).join(" ; ")}` : ""}`);
  const s = stateOf(p.id);
  // Maquettes et textes du site : résumés en une ligne, jamais recopiés (essai réel du 8 novembre : 224 000 caractères
  // relus à chaque pas, demande refusée au-delà de 100 000 jetons).
  const decisions = all<{ key: string; value: string }>("SELECT key,value FROM memory WHERE project_id=? AND key LIKE 'syna.%' AND key NOT LIKE 'syna.mockups.%' AND key NOT IN ('syna.mockup_set','syna.mockup_copy') ORDER BY created_at DESC LIMIT 15", p.id);
  const set = loadMockupSet(p.id), copy = loadSiteCopy(p.id);
  const mockups = one<{ value: string }>("SELECT value FROM memory WHERE project_id=? AND key LIKE 'syna.mockups.%' ORDER BY created_at DESC LIMIT 1", p.id);
  const pending = all<{ id: string; type: string; status: string }>("SELECT id,type,status FROM jobs WHERE project_id=? AND status IN ('queued','running','blocked') ORDER BY created_at DESC LIMIT 8", p.id);
  const counts = {
    images: one<{ n: number }>("SELECT COUNT(*) n FROM assets WHERE project_id=? AND kind='image' AND deleted_at IS NULL", p.id)?.n ?? 0,
    videos: one<{ n: number }>("SELECT COUNT(DISTINCT doc_key) n FROM video_documents WHERE project_id=?", p.id)?.n ?? 0,
    ads: one<{ n: number }>("SELECT COUNT(DISTINCT doc_key) n FROM ad_documents WHERE project_id=?", p.id)?.n ?? 0,
    posts: one<{ n: number }>("SELECT COUNT(*) n FROM posts WHERE project_id=?", p.id)?.n ?? 0,
  };
  const recent = changesOf(ctx.conversationId).slice(-12).map((c) => `${c.module}/${c.object} : ${c.summary}${c.verified ? "" : " (non vérifié)"}`);
  return [
    `Projet « ${p.name} » [${p.id}] — ${p.business === "services" ? "activité de services" : `boutique (${p.storeType})`}.`,
    `Offre : ${p.product.name || "?"} (${p.product.nameStatus}) — ${p.product.category || "catégorie ?"} — ${p.product.summary?.slice(0, 300) || "pas de résumé"}.`,
    p.business === "services" ? `Services : ${p.services.services.map((x) => x.name).join(", ") || "aucune prestation"} ; contact principal ${p.services.contactMode} ; horaires ${p.services.hours || "?"}.` : "",
    `Marque : ${p.brand ? `${p.brand.name} — « ${p.brand.tagline} » — logo ${p.brand.logo.assetId ? `${p.brand.logo.status} (${p.brand.logo.assetId})` : "aucun"} — validés : ${(p.brand.validated ?? []).join(", ") || "rien"}` : "aucune"}.`,
    `Site : ${t ? `${t.spec.name} (direction ${t.spec.direction}), version ${t.version.number} [${t.version.id}], aperçu /preview/${p.id}/v/${t.version.id}` : "pas encore construit"}.`,
    `Catalogue (${products.length}) : ${products.join(" | ") || "vide"}.`,
    `Parcours Pilote : ${s ? Object.entries(s.stages).map(([k, v]: any) => `${k}=${v?.status}`).join(", ") : "non démarré"}.`,
    `Médias : ${counts.images} images, ${counts.videos} vidéos, ${counts.ads} visuels pub, ${counts.posts} publications.`,
    mockups ? `Dernières maquettes préparées : ${json<any[]>(mockups.value, []).map((m) => `${m.n}. ${m.name ?? m.direction} [${m.versionId ?? "échec"}]`).join(" ; ")}.` : "",
    set ? `Anciennes maquettes (projet commencé avec elles) : ${set.directions.map((d) => `${d.key} « ${d.name} » (${d.images.filter((i) => i.status === "ready").length}/${d.images.length} images prêtes${readyLine(d, set.pages)}${versionsLine(ctx.projectId!, d)})`).join(" ; ")}${set.chosen ? ` ; choisie : ${set.chosen}` : ""}.` : "",
    copy ? `Textes du site écrits pour : ${Object.keys(copy.pages).join(", ")}.` : "",
    decisions.length ? `Décisions mémorisées : ${decisions.map((d) => `${d.key.slice(5)} = ${d.value.length > 300 ? `${d.value.slice(0, 300)}…` : d.value}`).join(" ; ")}.` : "",
    pending.length ? `Tâches en cours : ${pending.map((j) => `${j.type} ${j.status} [${j.id}]`).join(", ")}.` : "",
    recent.length ? `Changements déjà faits dans ce fil : ${recent.join(" ; ")}.` : "",
  ].filter(Boolean).join("\n");
}

/**
 * Versions des images d'une maquette qui en ont plusieurs (demande du propriétaire du 8 novembre : retoucher la
 * version qu'il préfère, pas la dernière) : « ; B10 : 5 versions, actuelle n° 5 ».
 */
function versionsLine(projectId: string, d: { key: string; images: { id: string; assetId: string | null }[] }): string {
  const rows = all<{ id: string; meta: string }>("SELECT id, meta FROM assets WHERE project_id=? AND deleted_at IS NULL AND role='mockup' ORDER BY created_at ASC, rowid ASC", projectId);
  const byImage = new Map<string, string[]>();
  for (const r of rows) { try { const m = JSON.parse(r.meta || "{}").synaMockup; if (m?.direction === d.key) byImage.set(m.image, [...(byImage.get(m.image) ?? []), r.id]); } catch { /* méta illisible */ } }
  const parts = d.images.flatMap((i) => { const v = byImage.get(i.id) ?? []; return v.length > 1 ? [`${i.id} : ${v.length} versions, actuelle n° ${v.indexOf(i.assetId ?? "") + 1 || "?"}`] : []; });
  return parts.length ? ` ; ${parts.join(" ; ")}` : "";
}

/**
 * Images prêtes d'une maquette, avec leur identifiant (essai réel du 8 novembre : SINA ne savait pas quelle image était
 * le contact en ordinateur pour la retoucher) : « ; prêtes : B01 accueil (ordinateur), B30 contact (téléphone) ».
 */
function readyLine(d: { images: { id: string; status: string; viewport: string; pages: string[] }[] }, pages: { key: string; fr: string }[]): string {
  const ready = d.images.filter((i) => i.status === "ready");
  if (!ready.length) return "";
  const name = (k: string) => pages.find((p) => p.key === k)?.fr.toLocaleLowerCase("fr-FR") ?? k;
  return ` ; prêtes : ${ready.map((i) => `${i.id} ${i.pages.map(name).join(" + ")} (${i.viewport === "desktop" ? "ordinateur" : "téléphone"})`).join(", ")}`;
}
