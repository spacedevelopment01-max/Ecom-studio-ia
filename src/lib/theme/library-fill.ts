/**
 * Remplissage des sections de la bibliothèque utilisées par les thèmes du catalogue (theme-catalog.ts), côté serveur :
 * mêmes textes et mêmes photos que l'ajout d'une section depuis le studio (section-defaults + section-copy).
 *
 * Une section est « complète » quand elle n'attend aucune information du marchand ([À compléter : …]), qu'elle a du
 * contenu et les médias qui la font exister (vidéo d'une section vidéo, photos d'une galerie). Sinon le thème la pose
 * masquée : prête à compléter dans le studio, jamais montrée à moitié vide aux visiteurs.
 */
import type { BuildInput, LibraryFill } from "./directions";
import type { ContentContext } from "./section-content";
import { withProjectMedia } from "./section-defaults";
import { sectionSchema, type ThemeSpec } from "./spec";

type Blocks = { type: string; settings: Record<string, unknown> }[];

const PLACEHOLDER = /\[(?:À compléter|A compléter|To complete)/i;
/** Sections qui n'existent qu'avec une vidéo. */
const NEEDS_VIDEO = new Set(["immersive-video", "video-carousel", "video-stories", "video-reels", "video-showcase", "cv-stories"]);
/** Sections qui n'existent qu'avec des photos. */
const NEEDS_IMAGE = new Set(["slideshow", "hero", "hero-flex", "double-banner", "editorial-visual", "editorial-gallery", "media-gallery", "customer-wall", "floating-scene", "before-after", "day-night", "visual-menu", "alternating-content", "situations", "gallery-mosaic", "v2-banner", "v2-media", "product-360", "exploded-view"]);
/** Sections dont les blocs forment un tout (tableau, routine dans l'ordre) : jamais amputées d'un bloc. */
const WHOLE = new Set(["comparison-table", "routine-steps", "how-to", "exploded-view", "shipping-journey", "scroll-steps"]);
/** Sections de structure, sans texte propre : toujours complètes. */
const STRUCTURAL = new Set(["creative-divider", "wave-divider", "product-reviews", "product-recommendations", "featured-collection", "collection-list"]);

const strings = (o: Record<string, unknown>) => Object.entries(o).filter(([k, v]) => typeof v === "string" && v.trim() && !/color_scheme|_scheme$|^layout$|^style$|^ratio$|^size$|^align/.test(k)).map(([, v]) => v as string);

/** Contexte de rédaction tiré des données de construction (aperçus et essais sans projet enregistré). */
export function contentFromInput(input: BuildInput): ContentContext {
  const c = input.copy;
  const lang = input.language ?? "fr";
  const real = (x: string) => !!x && !x.includes("[");
  return {
    lang,
    sample: false,
    shopName: input.shopName,
    brand: { name: input.shopName, tagline: real(c.statement.heading) ? c.statement.heading : "", story: real(c.about.intro) ? c.about.intro : "", positioning: "", audience: "", personality: [], values: c.about.values },
    product: {
      name: input.product.title,
      summary: real(c.product.short) ? c.product.short : "",
      category: "",
      sector: "",
      facts: c.specs.items.filter((x) => real(x.value) && real(x.label)).map((x) => ({ label: x.label, value: x.value })),
      price: input.product.price ?? null,
      currency: input.product.currency || "EUR",
      variants: [],
    },
    strategy: null,
    collections: (input.collections ?? []).map((x) => ({ title: x.title, handle: x.handle })),
    products: [input.product, ...(input.products ?? [])].map((x) => ({ title: x.title, handle: x.handle })),
    business: input.business ?? "products",
    services: input.services ?? { services: [], area: "", address: "", phone: "", email: "", hours: "", bookingUrl: "", contactMode: "form" },
  };
}

/**
 * Remplisseur pour buildSpec : `files` sont les fichiers du thème (photos, vidéos du projet), `ctx` le contexte de
 * rédaction (celui du projet enregistré, ou contentFromInput à défaut).
 */
export function libraryFiller(files: Record<string, string>, ctx: ContentContext, social?: BuildInput["social"]): LibraryFill {
  const spec = { files, customSections: {}, language: ctx.lang, store: { shopName: ctx.shopName, product: { title: ctx.product.name }, collections: ctx.collections } } as unknown as ThemeSpec;
  return (type, settings, blocks, opts) => {
    const schema = sectionSchema(spec, type);
    if (!schema) return { settings, blocks: blocks ?? [], complete: false };
    // Galerie sociale : le compte réel de la marque (jamais un compte inventé).
    const preset = { ...settings };
    if (type === "social-gallery") {
      const net = String(settings.network ?? "instagram") as keyof NonNullable<BuildInput["social"]>;
      const handle = social?.[net]?.trim();
      if (handle && schema.settings.some((x) => x.id === "handle")) preset.handle = handle.replace(/^https?:\/\/[^/]+\//, "@").replace(/\/$/, "");
    }
    const r = withProjectMedia(spec, type, preset, blocks, ctx);
    // Seuls les réglages et blocs connus de la section sont gardés (Shopify refuse les autres).
    const known = new Set(schema.settings.map((x) => x.id).filter(Boolean));
    const out = Object.fromEntries(Object.entries(r.settings).filter(([k]) => known.has(k)));
    const outBlocks: Blocks = (r.blocks ?? [])
      .filter((b) => schema.blocks.some((x) => x.type === b.type) && !opts?.dropBlocks?.includes(b.type))
      .map((b) => {
        const ids = new Set((schema.blocks.find((x) => x.type === b.type)?.settings ?? []).map((x) => x.id));
        return { type: b.type, settings: Object.fromEntries(Object.entries(b.settings ?? {}).filter(([k]) => ids.has(k))) };
      });
    // Blocs qui attendent une information du marchand : retirés quand les autres suffisent à faire tenir la section
    // (une ouverture garde son titre et son bouton sans le chiffre « [À compléter] »).
    const realBlocks = outBlocks.filter((b) => !PLACEHOLDER.test(JSON.stringify(b.settings)));
    if (realBlocks.length < outBlocks.length && realBlocks.length >= Math.min(2, outBlocks.length) && !WHOLE.has(type)) outBlocks.splice(0, outBlocks.length, ...realBlocks);
    const json = JSON.stringify([out, outBlocks]);
    const hasText = strings(out).length > 0 || outBlocks.some((b) => strings(b.settings).length > 0);
    const emptyBlocks = outBlocks.length > 0 && outBlocks.every((b) => !strings(b.settings).length);
    const hasVideo = /"video[a-z_]*_asset":"[^"]+"/.test(json);
    const hasImage = /"(?:image|product|day_image|night_image|image_before|image_after|detail|poster)[a-z_]*_asset":"[^"]+"/.test(json);
    const complete = STRUCTURAL.has(type) || (!PLACEHOLDER.test(json) && hasText && !emptyBlocks && (!NEEDS_VIDEO.has(type) || hasVideo) && (!NEEDS_IMAGE.has(type) || hasImage));
    return { settings: out, blocks: outBlocks, complete };
  };
}
