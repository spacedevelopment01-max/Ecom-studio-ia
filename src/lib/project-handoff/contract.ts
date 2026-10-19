/** Remise structurée au moteur existant. Aucune génération, composition ou mutation de thème. */
import { stableHash } from "../brain/hash";
import { blockText } from "../seo-v2/doc";
import type { Asset } from "../library";
import type { Project } from "../projects";
import type { ReadyContract } from "../preparation/types";
import { recommendProjectCategory, type CategoryRecommendation } from "./categories";
import { inspectSiteMediaLineage } from "./media-pool";

const metadata = (a: Asset) => { try { return JSON.parse(a.meta || "{}"); } catch { return {}; } };
const usable = (a: Asset | undefined, pid: string) => !!a && a.project_id === pid && !a.deleted_at && a.status !== "rejected";

export function buildProjectHandoff(p: Project, ready: ReadyContract, assets: readonly Asset[] = [], categoryOverride?: CategoryRecommendation) {
  if (p.id !== ready.projectId) throw new Error("Contrat d’un autre projet : transmission refusée.");
  const issues: string[] = [];
  // Les métadonnées des parents archivés sont nécessaires à l'audit de filiation.
  // Aucun parent n'est pour autant ajouté aux médias finaux ni exposé comme fichier utilisable.
  const assetById = new Map(assets.map(a => [a.id, a]));
  const category = categoryOverride ?? recommendProjectCategory(p, ready.clientBrief);
  if (category.clarification) issues.push(category.clarification);
  const identity = structuredClone(ready.brand);
  if (stableHash("offer", p.product) !== stableHash("offer", ready.profile) || (p.business === "services" && stableHash("services", p.services) !== stableHash("services", ready.services)) || stableHash("strategy", p.strategy) !== stableHash("strategy", ready.strategy)) issues.push("L’offre ou la stratégie a changé : la remise des données doit être revalidée.");
  if (stableHash("identity", p.brand) !== stableHash("identity", ready.brand)) issues.push("L’identité active a changé : revalidez les textes et médias avant remise au thème.");
  if (!identity.artIdentity?.colorRoles) issues.push("Les rôles de la palette et l’ambiance de la direction validée manquent.");
  if (!identity.logo.assetId || !usable(assetById.get(identity.logo.assetId), p.id)) issues.push("Le logo de l’identité active est absent ou inutilisable.");
  const identityAssets = assets.filter(a => usable(a, p.id) && (a.id === identity.logo.assetId || a.id === identity.logo.markAssetId || a.source_asset_id === identity.logo.assetId)).map(a => ({ assetId: a.id, role: a.role, mime: a.mime, width: a.width, height: a.height, url: `/api/files/${a.id}`, sourceAssetId: a.source_asset_id }));
  const blocksSeen = new Set<string>();
  const pages = ready.pages.map(page => {
    const documents = ready.documents.filter(d => d.doc.page.key === page.key);
    if (documents.length !== 1) issues.push(`Un document complet est requis pour la page ${page.key}.`);
    const doc = documents[0];
    if (doc && (!doc.doc.meta.seoTitle.trim() || !doc.doc.meta.metaDescription.trim())) issues.push(`Métadonnées SEO incomplètes : ${page.key}.`);
    const sections = page.sections.map(section => {
      const editorial = ready.editorial.filter(b => b.pageKey === page.key && b.sectionKey === section.key);
      if (!editorial.length) issues.push(`Texte non affecté à la section ${page.key}/${section.key}.`);
      const sourceBlocks = editorial.flatMap(e => e.blockIds.map(id => {
        const source = ready.documents.find(d => d.docKey === e.docKey && d.doc.page.key === page.key);
        const block = source?.doc.blocks.find(b => b.id === id);
        const key = `${e.docKey}:${id}`;
        if (!block) issues.push(`Bloc absent de sa page : ${page.key}/${id}.`);
        else if (blocksSeen.has(key)) issues.push(`Bloc affecté plusieurs fois : ${page.key}/${id}.`);
        else blocksSeen.add(key);
        return block ? structuredClone(block) : null;
      })).filter((b): b is NonNullable<typeof b> => !!b);
      for (const e of editorial) if (e.mediaSlotKeys.some(key => !ready.media.some(s => s.key === key && s.pageKey === page.key && s.sectionKey === section.key))) issues.push(`Association texte-image incohérente : ${page.key}/${section.key}.`);
      return { ...structuredClone(section), editorial: structuredClone(editorial), blocks: sourceBlocks, text: sourceBlocks.map(blockText).join("\n\n"), mediaSlotKeys: [...new Set(editorial.flatMap(b => b.mediaSlotKeys))] };
    });
    return { ...structuredClone(page), documentKey: doc?.docKey ?? null, document: doc ? structuredClone(doc.doc) : null, seo: doc ? structuredClone(doc.doc.meta) : null, sections };
  });
  for (const d of ready.documents) {
    if (!ready.pages.some(pg => pg.key === d.doc.page.key)) issues.push(`Document sans page : ${d.doc.page.key}.`);
    for (const block of d.doc.blocks) if (!blocksSeen.has(`${d.docKey}:${block.id}`)) issues.push(`Bloc non transmis aux sections : ${d.doc.page.key}/${block.id}.`);
  }
  for (const required of ["home", p.business === "services" ? "service" : "product", "brand", "contact"]) if (!pages.some(pg => pg.kind === required)) issues.push(`Page indispensable manquante : ${required}.`);
  const media = ready.media.map(slot => {
    const a = slot.assetId ? assetById.get(slot.assetId) : undefined;
    const lineage = a ? inspectSiteMediaLineage(a, p.id, id => assetById.get(id)) : null;
    const allowed = usable(a, p.id) && !!lineage?.verified;
    if (lineage?.issue) issues.push(`${slot.key} : ${lineage.issue}`);
    if (!allowed) issues.push(`Média du site absent, refusé ou issu du pool social : ${slot.key}.`);
    if (!pages.some(pg => pg.key === slot.pageKey && pg.sections.some(s => s.key === slot.sectionKey && s.mediaSlotKeys.includes(slot.key)))) issues.push(`Média sans association éditoriale : ${slot.key}.`);
    const meta = a && allowed ? metadata(a) : {};
    if (allowed && (meta.gate?.verdict !== "FINAL" || meta.gate?.fatal)) issues.push(`Contrôle final du média requis : ${slot.key}.`);
    if (ready.provenance === "production" && meta.simulation) issues.push(`Média simulé interdit comme résultat de production : ${slot.key}.`);
    if (slot.source === "pixabay" && (!meta.stock?.id || meta.stock?.source !== "pixabay" || !meta.stock?.page || !meta.stock?.license)) issues.push(`Provenance Pixabay incomplète : ${slot.key}.`);
    if (slot.source === "ai" && (!allowed || a!.origin !== "generated" || meta.stock)) issues.push(`Création IA propre au site requise : ${slot.key}.`);
    if (allowed && a!.kind !== (slot.kind ?? "image")) issues.push(`Type de média incompatible : ${slot.key}.`);
    if (allowed && slot.source === "ai" && slot.kind === "image" && slot.aspect) {
      const [w, h] = slot.aspect.split(":").map(Number);
      if (!a!.width || !a!.height || Math.abs((a!.width / a!.height) / (w / h) - 1) > .025) issues.push(`Format IA incompatible : ${slot.key}.`);
    }
    const poster = slot.posterId ? assetById.get(slot.posterId) : undefined;
    if (slot.kind === "video" && (!allowed || !a!.duration || !usable(poster, p.id) || poster!.source_asset_id !== a!.id)) issues.push(`Vidéo ou poster associé incomplet : ${slot.key}.`);
    if (!slot.reviewed || slot.alignment?.status !== "accepted") issues.push(`Média ou cohérence texte-image non validé : ${slot.key}.`);
    return { ...structuredClone(slot), pool: "website" as const, file: a && allowed ? { assetId: a.id, url: `/api/files/${a.id}`, mime: a.mime, width: a.width, height: a.height, duration: a.duration, origin: a.origin, role: a.role } : null,
      poster: slot.kind === "video" && usable(poster, p.id) && poster!.source_asset_id === a?.id ? { assetId: poster!.id, url: `/api/files/${poster!.id}`, mime: poster!.mime, width: poster!.width, height: poster!.height } : null,
      provenance: slot.source === "pixabay" ? { source: "pixabay" as const, stock: structuredClone(meta.stock ?? null), illustrationOnly: true } : { source: "ai" as const, originalAssetId: a && allowed ? a.source_asset_id : null, illustrationOnly: p.business==="services" },
      framing: { preserveAspectRatio: true, productMustRemainWhole: p.business === "products", mobilePosterFallback: slot.kind === "video" },
    };
  });
  if (media.filter(m => m.kind === "image").length !== 10 || media.filter(m => m.kind === "video").length !== (p.business === "products" ? 1 : 2)) issues.push("Le pool du site est incomplet : dix images et le nombre de vidéos attendu sont requis.");
  if (new Set(media.map(m => m.file?.assetId).filter(Boolean)).size !== media.length) issues.push("Chaque emplacement final du site exige un média distinct ; les déclinaisons sociales ne comptent pas.");
  if (p.business === "products") for (const [aspect, count] of [["1:1", 4], ["16:9", 4], ["9:16", 2]] as const) if (media.filter(m => m.kind === "image" && m.source === "ai" && m.aspect === aspect).length !== count) issues.push(`Répartition du site incorrecte : ${count} images IA ${aspect} requises.`);
  if (!media.some(m => m.kind === "video" && m.pageKey === "home" && m.sectionKey === "hero")) issues.push("Vidéo du hero approuvée manquante.");
  const payload = { projectId: p.id, revision: ready.revision, provenance: ready.provenance, clientBrief: structuredClone(ready.clientBrief), offer: { business: p.business, product: structuredClone(ready.profile), services: structuredClone(ready.services), storeType: p.storeType, catalogue: structuredClone(p.catalog), strategy: structuredClone(ready.strategy) }, identity, identityAssets, colorRoles: identity.artIdentity?.colorRoles ?? null, pages, media, category };
  return { schemaVersion: 1 as const, kind: "theme_data_handoff" as const, ...payload, sourceHash: stableHash("theme-data-handoff", payload), status: issues.length ? "review_required" as const : "ready" as const, issues: [...new Set(issues)], socialAssetsIncluded: false as const,
    integration: { status: "awaiting_theme_consumer" as const, installedThemeChanged: false as const, required: ["Raccorder les identifiants des quatre thèmes aux références et catégories explicites.", "Consommer identité, documents complets, blocs éditoriaux, SEO et médias affectés dans le moteur existant.", "Filtrer la bibliothèque et les opérations manuelles/IA par thème installé ET catégorie ; préserver les retouches et signaler les conflits."] },
  };
}
export type ProjectHandoff = ReturnType<typeof buildProjectHandoff>;
