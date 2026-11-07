/** État du projet relu à chaque étape de SINA : bref, à jour, avec les identifiants utiles. */
import { all, json, one } from "../db";
import { currentTheme, loadProject } from "../projects";
import { listProducts } from "../products/catalog";
import { stateOf } from "../preparation/store";
import type { ToolContext } from "./types";
import { changesOf } from "./store";

export async function projectSnapshot(ctx: ToolContext): Promise<string> {
  const p = loadProject(ctx.projectId!);
  const t = currentTheme(p.id);
  const products = listProducts(p.id).slice(0, 12).map((x) => `${x.data.title} [${x.id}] ${x.data.price == null ? "prix non fixé" : `${(x.data.price / 100).toFixed(2)} ${x.data.currency}`}${x.variants.length > 1 ? `, variantes : ${x.variants.map((v) => v.options.join("/") + (v.price != null ? ` ${(v.price / 100).toFixed(2)}` : "")).join(" ; ")}` : ""}`);
  const s = stateOf(p.id);
  const decisions = all<{ key: string; value: string }>("SELECT key,value FROM memory WHERE project_id=? AND key LIKE 'syna.%' AND key NOT LIKE 'syna.mockups.%' ORDER BY created_at DESC LIMIT 15", p.id);
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
    decisions.length ? `Décisions mémorisées : ${decisions.map((d) => `${d.key.slice(5)} = ${d.value}`).join(" ; ")}.` : "",
    pending.length ? `Tâches en cours : ${pending.map((j) => `${j.type} ${j.status} [${j.id}]`).join(", ")}.` : "",
    recent.length ? `Changements déjà faits dans ce fil : ${recent.join(" ; ")}.` : "",
  ].filter(Boolean).join("\n");
}
