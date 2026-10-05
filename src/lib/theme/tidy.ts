/**
 * Finitions de composition : ce qu'un directeur artistique d'agence retire avant de montrer une boutique.
 * Appliqué à la composition de la direction (buildSpec) et après la composition et la relecture par l'IA
 * (jamais après une retouche demandée par le client, qui reste maître de ses choix).
 *
 * - une seule inscription à la lettre d'information (pas la section de l'accueil ET la carte du pied de page) ;
 * - pas deux sections identiques (FAQ, lettre d'information) sur l'accueil ;
 * - pas de section « Caractéristiques » faite uniquement d'espaces réservés « [À compléter : …] » ;
 * - pas de liens « Découvrir → » identiques sur toutes les cartes d'une même grille ;
 * - pas de surtitre qui répète le titre du produit (« SOVA » au-dessus de « SOVA ») ;
 * - pas de bandeau d'annonce ni de pastille qui ne font que répéter le nom de la boutique ou le titre ;
 * - aucune section vide (galerie, grille, frise… sans contenu) ;
 * - aucune image désignée par un nom de fichier qui n'existe pas (cadre cassé).
 */
import type { SectionInstance, TemplateJson, ThemeSpec } from "./spec";

const norm = (t: unknown) => String(t ?? "").replace(/<[^>]+>/g, " ").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
/** Texte qui n'est qu'un espace réservé « [À compléter : …] » / « [To complete: …] » (ou vide). */
export const isPlaceholderOnly = (t: unknown) => {
  const s = String(t ?? "").replace(/<[^>]+>/g, " ").trim();
  return !s || /^\[(?:À compléter|A compléter|To complete)[^\]]*\]\.?$/i.test(s);
};

function drop(t: TemplateJson, id: string) {
  t.order = t.order.filter((x) => x !== id);
  delete t.sections[id];
}
const blocksOf = (s: SectionInstance) => (s.block_order ?? Object.keys(s.blocks ?? {})).map((id) => [id, s.blocks?.[id]] as const).filter(([, b]) => b && !b.disabled);
function dropBlock(s: SectionInstance, id: string) {
  if (s.blocks) delete s.blocks[id];
  if (s.block_order) s.block_order = s.block_order.filter((x) => x !== id);
}

/** Sections qui n'ont de sens qu'avec des blocs (une galerie sans image, une frise sans étape…). */
const NEEDS_BLOCKS = new Set(["horizontal-gallery", "gallery-mosaic", "story-circles", "stack-cards", "timeline", "features-grid", "stats", "specs-list", "faq", "video-reels", "collection-list", "scroll-story"]);

export function tidyComposition(spec: ThemeSpec): ThemeSpec {
  const shopName = norm(spec.store.shopName);
  const productTitle = norm(spec.store.product.title);
  const index = spec.templates.index;
  const footer = spec.groups.footer;
  const footerSection = footer ? footer.order.map((id) => footer.sections[id]).find((s) => s?.type === "footer" && !s.disabled) : undefined;
  const footerNews = footerSection ? blocksOf(footerSection).some(([, b]) => b!.type === "newsletter") : false;

  if (index) {
    // Carte d'inscription du pied de page : la section « Lettre d'information » de l'accueil ferait doublon.
    if (footerNews && footerSection!.settings.style === "card") for (const id of [...index.order]) if (index.sections[id]?.type === "newsletter") drop(index, id);
    // Une seule FAQ et une seule lettre d'information sur l'accueil.
    const seen = new Set<string>();
    for (const id of [...index.order]) {
      const type = index.sections[id]?.type;
      if (type !== "faq" && type !== "newsletter") continue;
      if (seen.has(type)) drop(index, id);
      seen.add(type);
    }
    // Pastille du héros : sans le nom de la boutique ni le titre qu'elle surmonte.
    for (const id of index.order) {
      const s = index.sections[id];
      if (!s || !/^hero-/.test(s.type) || typeof s.settings.badge !== "string" || !s.settings.badge) continue;
      const head = norm(`${s.settings.heading ?? ""} ${s.settings.heading_accent ?? ""}`);
      const parts = s.settings.badge.split(/\s*[•·|]\s*/).filter((x) => { const n = norm(x); return n && n !== shopName && n !== head && n !== productTitle; });
      s.settings.badge = parts.join(" • ");
    }
  }

  for (const t of Object.values(spec.templates)) {
    for (const id of [...t.order]) {
      const s = t.sections[id];
      if (!s) continue;
      // « Caractéristiques » faite uniquement d'espaces réservés : un modèle vide, pas une fiche.
      if (s.type === "specs-list" && blocksOf(s).every(([, b]) => isPlaceholderOnly(b!.settings.value))) { drop(t, id); continue; }
      // Grille de cartes dont tous les liens mènent au même endroit : un seul appel à l'action suffit (ailleurs sur la page).
      if (s.type === "features-grid") {
        const bl = blocksOf(s);
        const links = new Set(bl.map(([, b]) => String(b!.settings.link ?? "")));
        if (bl.length >= 2 && links.size === 1 && [...links][0]) for (const [, b] of bl) { b!.settings.link = ""; b!.settings.link_label = ""; }
      }
      // Surtitre identique au titre du produit.
      if (s.type === "main-product") for (const [bid, b] of blocksOf(s)) if (b!.type === "eyebrow" && norm(b!.settings.text) === productTitle) dropBlock(s, bid);
      if (NEEDS_BLOCKS.has(s.type) && s.blocks && !blocksOf(s).length) drop(t, id);
    }
  }

  // Image inexistante (nom inventé par l'IA) : remplacée par une vraie image du produit plutôt qu'un cadre vide ou cassé.
  if (!spec.imported && Object.keys(spec.files).length) {
    const files = Object.keys(spec.files);
    const fallback = ["packshot", "hero", "en-situation", "scene", "produit-detoure"].map((h) => files.find((f) => f.includes(h) && !/\.(mp4|webm)$/.test(f))).find(Boolean) ?? "";
    const fix = (settings: Record<string, unknown>) => {
      for (const [k, v] of Object.entries(settings)) {
        if (!k.endsWith("_asset") || typeof v !== "string" || !v || spec.files[v]) continue;
        settings[k] = /video|logo|favicon/.test(k) ? "" : fallback;
      }
    };
    for (const c of [...Object.values(spec.templates), ...Object.values(spec.groups)]) {
      for (const s of Object.values(c.sections)) {
        fix(s.settings);
        for (const b of Object.values(s.blocks ?? {})) fix(b.settings);
      }
    }
  }

  // Bandeau d'annonce : ni le nom de la boutique, ni deux fois la même phrase ; une seule phrase reste fixe.
  const header = spec.groups.header;
  if (header) {
    for (const id of [...header.order]) {
      const s = header.sections[id];
      if (s?.type !== "announcement-bar") continue;
      const seen = new Set<string>();
      for (const [bid, b] of blocksOf(s)) {
        const n = norm(b!.settings.text);
        if (!n || n === shopName || seen.has(n) || isPlaceholderOnly(b!.settings.text)) dropBlock(s, bid);
        seen.add(n);
      }
      const left = blocksOf(s).length;
      if (!left) drop(header, id);
      else if (left === 1 && s.settings.style !== "static") s.settings.style = "static";
    }
  }
  return spec;
}
