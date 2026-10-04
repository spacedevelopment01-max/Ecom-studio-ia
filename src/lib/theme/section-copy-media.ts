/**
 * Rédaction des sections du groupe « media » (voir section-content.ts) : galeries, vidéos, bannières.
 * Les médias sont déjà posés (section-defaults*) ; ici on écrit les titres, légendes et boutons à partir
 * du vrai projet. Rien d'invérifiable n'est affirmé : sans fait confirmé, les textes restent neutres.
 * Seuls le compte social (pseudo) et les témoignages photo demandent une vérité du marchand :
 * espace réservé court en ajout réel, exemple marqué « Exemple » dans l'aperçu de la bibliothèque.
 */
import type { CopyFn, ContentContext } from "./section-content";
import { tr, todo, exampleTag } from "./section-content";
import type { SectionSchema } from "./spec";

type Block = { type: string; settings?: Record<string, unknown> };
type Base = { settings: Record<string, unknown>; blocks?: Block[] };

// ---------------------------------------------------------------- données du projet

/** Texte utilisable tel quel (pas un espace réservé « [À définir…] »). */
const clean = (s: string | undefined | null) => {
  const v = String(s ?? "").replace(/\s+/g, " ").trim();
  return !v || /^\[|\[(À|A) (compléter|définir|préciser)|\[To (complete|define)/i.test(v) ? "" : v;
};
/** Première phrase (bornée) d'un texte. */
function sentence(s: string, max = 170): string {
  const v = clean(s);
  if (!v) return "";
  const m = v.match(/^.+?[.!?](\s|$)/);
  let out = (m ? m[0] : v).trim();
  if (out.length > max) out = out.slice(0, out.lastIndexOf(" ", max - 1)).replace(/[,;:\s]+$/, "") + "…";
  return /[.!?…]$/.test(out) ? out : `${out}.`;
}
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const p = (s: string) => (s ? `<p>${esc(s)}</p>` : "");
const slug = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "");

function facts(ctx: ContentContext) {
  return ctx.product.facts.map((f) => ({ label: clean(f.label), value: clean(f.value) })).filter((f) => f.value);
}

function data(ctx: ContentContext) {
  const brand = clean(ctx.brand?.name) || ctx.shopName;
  const product = clean(ctx.product.name) || brand;
  const tagline = clean(ctx.brand?.tagline);
  const summary = sentence(ctx.product.summary);
  const story = sentence(ctx.brand?.story ?? "");
  const positioning = sentence(ctx.brand?.positioning ?? "");
  const key = (ctx.strategy?.keyMessages ?? []).map(clean).filter((k) => k && k.length <= 120);
  const collection = ctx.collections.find((c) => clean(c.title));
  return { brand, product, tagline, summary, story, positioning, key, collection, facts: facts(ctx) };
}

// ---------------------------------------------------------------- écriture des réglages

const isTodo = (v: unknown) => typeof v === "string" && /\[(À compléter|To complete)/.test(v);
const isEmpty = (v: unknown) => v == null || (typeof v === "string" && v.replace(/<[^>]+>/g, "").trim() === "");

/** Écrit un réglage de section s'il existe et qu'il est vide ou resté en espace réservé. */
function sectionSetter(schema: SectionSchema, out: Record<string, unknown>) {
  const ids = new Set(schema.settings.map((s) => s.id));
  return (id: string, value: unknown) => {
    if (!ids.has(id) || value == null || value === "") return;
    if (isEmpty(out[id]) || isTodo(out[id])) out[id] = value;
  };
}
/** Même chose pour un bloc ; `force` remplace aussi les libellés génériques du préréglage. */
function blockSetter(schema: SectionSchema, b: Block) {
  const ids = new Set((schema.blocks.find((x) => x.type === b.type)?.settings ?? []).map((s) => s.id));
  const s = (b.settings = { ...(b.settings ?? {}) });
  return (id: string, value: unknown, force = false) => {
    if (!ids.has(id) || value == null || value === "") return;
    if (force || isEmpty(s[id]) || isTodo(s[id])) s[id] = value;
  };
}
function prepare(base: Base) {
  return { settings: { ...base.settings }, blocks: (base.blocks ?? []).map((b) => ({ type: b.type, settings: { ...(b.settings ?? {}) } })) };
}
const pickCycle = <T,>(list: T[], i: number) => list[i % list.length];

// ---------------------------------------------------------------- rédactions

const alternatingContent: CopyFn = (ctx, base, schema) => {
  const d = data(ctx);
  const out = prepare(base);
  const set = sectionSetter(schema, out.settings);
  set("eyebrow", d.brand);
  set("heading", tr(ctx, `${d.product}, de près`, `${d.product}, up close`));
  const factLine = d.facts.slice(0, 3).map((f) => (f.label ? `${f.label} : ${f.value}` : f.value)).join(" · ");
  const rows = [
    {
      eyebrow: tr(ctx, "Le produit", "The product"),
      title: d.product,
      text: d.summary || tr(ctx, `${d.product}, sous tous les angles.`, `${d.product}, from every angle.`),
      button: tr(ctx, "Voir le produit", "View the product"),
    },
    {
      eyebrow: tr(ctx, "En détail", "In detail"),
      title: tr(ctx, "Chaque détail compte", "Every detail matters"),
      text: factLine || tr(ctx, `${d.product}, de plus près : les finitions, les couleurs, les proportions.`, `Take a closer look at ${d.product}: the finish, the colours, the proportions.`),
      button: "",
    },
    {
      eyebrow: tr(ctx, "L'univers", "The world of"),
      title: tr(ctx, `Signé ${d.brand}`, `By ${d.brand}`),
      text: d.story || d.positioning || d.tagline || tr(ctx, `Explorez l'univers ${d.brand} et trouvez la pièce qui vous ressemble.`, `Explore the ${d.brand} world and find the piece that suits you.`),
      button: tr(ctx, "Tout découvrir", "Explore all"),
    },
  ];
  out.blocks.forEach((b, i) => {
    const r = pickCycle(rows, i);
    const put = blockSetter(schema, b);
    put("eyebrow", r.eyebrow);
    put("title", r.title);
    put("text", p(r.text));
    if (r.button) put("button_label", r.button);
  });
  return out;
};

const customerWall: CopyFn = (ctx, base, schema) => {
  const d = data(ctx);
  const out = prepare(base);
  const set = sectionSetter(schema, out.settings);
  set("eyebrow", tr(ctx, "Galerie", "Gallery"));
  set("heading", tr(ctx, `${d.brand}, en images`, `${d.brand} in pictures`));
  set("text", p(tr(ctx, "Partagez vos photos : avec votre accord, elles pourront rejoindre ce mur.", "Share your photos: with your consent, they may join this wall.")));
  if (!ctx.sample) return out;
  // Aperçu : quelques photos présentées comme des photos clients, signées « Exemple ».
  const tag = exampleTag(ctx);
  const people = ["Camille R.", "Thomas L.", "Inès M.", "Julien D."];
  const captions = [
    tr(ctx, "Adopté dès le premier jour.", "Loved it from day one."),
    tr(ctx, "Exactement comme sur les photos.", "Exactly like the pictures."),
    tr(ctx, "Un cadeau qui a fait mouche.", "A gift that hit the mark."),
    tr(ctx, "Mon nouvel indispensable.", "My new essential."),
  ];
  let k = 0;
  out.blocks.forEach((b, i) => {
    if (i % 2 === 0 || k >= people.length) return;
    const put = blockSetter(schema, b);
    put("kind", "customer", true);
    put("author", `${people[k]} · ${tag}`);
    put("caption", captions[k]);
    k++;
  });
  return { ...out, samples: k > 0 };
};

const doubleBanner: CopyFn = (ctx, base, schema) => {
  const d = data(ctx);
  const out = prepare(base);
  const c = d.collection;
  const banners = [
    c
      ? { eyebrow: tr(ctx, "Collection", "Collection"), heading: c.title, text: tr(ctx, `Toute la sélection ${c.title}, réunie au même endroit.`, `The full ${c.title} selection, all in one place.`), button: tr(ctx, "Découvrir", "Discover"), link: c.handle ? `/collections/${c.handle}` : "" }
      : { eyebrow: d.brand, heading: d.product, text: d.summary || tr(ctx, `${d.product}, à découvrir dès maintenant.`, `${d.product}, ready to discover.`), button: tr(ctx, "Voir le produit", "View the product"), link: "" },
    { eyebrow: d.brand, heading: c ? d.product : tr(ctx, "Toute la boutique", "The whole shop"), text: d.tagline || tr(ctx, `Les pièces ${d.brand}, à découvrir dès maintenant.`, `${d.brand} pieces, ready to discover.`), button: tr(ctx, "Tout voir", "Shop all"), link: "/collections/all" },
  ];
  const generic = new Set(["Un univers à découvrir", "Une seconde sélection", "A world to discover", "A second selection"]);
  out.blocks.forEach((b, i) => {
    const r = pickCycle(banners, i);
    const put = blockSetter(schema, b);
    put("eyebrow", r.eyebrow);
    put("heading", r.heading, generic.has(String(b.settings.heading ?? "")));
    put("text", p(r.text));
    put("button_label", r.button, b.settings.button_label === "Découvrir" || b.settings.button_label === "Discover");
    if (r.link) put("link", r.link);
    put("image_alt", r.heading);
  });
  return out;
};

const editorialGallery: CopyFn = (ctx, base, schema) => {
  const d = data(ctx);
  const out = prepare(base);
  const set = sectionSetter(schema, out.settings);
  set("eyebrow", tr(ctx, "Carnet", "Notebook"));
  set("heading", tr(ctx, `L'univers ${d.brand},`, `The ${d.brand} world,`));
  set("heading_accent", tr(ctx, "en images", "in pictures"));
  set("text", p(d.summary || d.tagline));
  const captions = [d.product, tr(ctx, "Vue d'ensemble", "The full view"), tr(ctx, "Sous un autre angle", "From another angle"), tr(ctx, `Signé ${d.brand}`, `By ${d.brand}`)];
  const details = [d.collection?.title ?? d.brand, "", "", d.brand];
  let n = 0;
  out.blocks.forEach((b) => {
    const put = blockSetter(schema, b);
    if (b.type === "image") {
      put("caption", pickCycle(captions, n));
      put("detail", details[n % details.length]);
      n++;
    } else if (b.type === "quote") {
      put("quote", d.tagline || d.key[0] || tr(ctx, "Chaque détail a sa raison d'être.", "Every detail is there for a reason."));
      put("attribution", d.brand);
    }
  });
  return out;
};

const editorialVisual: CopyFn = (ctx, base, schema) => {
  const d = data(ctx);
  const out = prepare(base);
  const set = sectionSetter(schema, out.settings);
  set("vertical", d.brand);
  set("cartel_title", d.product);
  const factLine = d.facts.slice(0, 3).map((f) => (f.label ? `${f.label} : ${f.value}` : f.value)).join(" · ");
  // Sans fait confirmé, le cartel situe la pièce (collection, univers) sans répéter le texte principal.
  const where = d.collection ? tr(ctx, `Collection ${d.collection.title}`, `${d.collection.title} collection`) : clean(ctx.product.category) || clean(ctx.product.sector);
  set("cartel_text", factLine || where || d.brand);
  set("cartel_meta", `© ${d.brand}`);
  set("eyebrow", d.collection?.title || tr(ctx, "Éditorial", "Editorial"));
  set("text", p(d.summary || tr(ctx, `${d.product} : prenez le temps d'en observer chaque détail.`, `${d.product}, seen up close: take the time to look at every detail.`)));
  set("button_label", tr(ctx, "Voir le produit", "View the product"));
  return out;
};

const floatingScene: CopyFn = (ctx, base, schema) => {
  const d = data(ctx);
  const out = prepare(base);
  const set = sectionSetter(schema, out.settings);
  // Nom de produit long : il passe en surtitre, le titre reste court et fort.
  const long = d.product.length > 22;
  set("eyebrow", long ? d.product : d.brand);
  set("heading", long ? tr(ctx, "Chaque détail,", "Every detail,") : `${d.product},`);
  set("heading_accent", tr(ctx, "sous toutes les lumières.", "in every light."));
  set("text", p(d.summary || tr(ctx, `${d.product}, sous tous les angles.`, `${d.product}, from every angle.`)));
  set("button_label", tr(ctx, "Découvrir", "Discover"));
  set("product_alt", d.product);
  const short = (s: string) => (s && s.length <= 34 ? s : "");
  const chips = [
    ...d.facts.map((f) => short(f.value) || short(f.label ? `${f.label} : ${f.value}` : "")).filter(Boolean),
    tr(ctx, `Signé ${d.brand}`, `By ${d.brand}`),
    short(d.tagline) || short(d.collection?.title ?? "") || tr(ctx, "À découvrir", "Discover it"),
  ];
  out.blocks.forEach((b, i) => blockSetter(schema, b)("text", chips[i] ?? chips[chips.length - 1]));
  return out;
};

const galleryMosaic: CopyFn = (ctx, base, schema) => {
  const d = data(ctx);
  const out = prepare(base);
  sectionSetter(schema, out.settings)("heading", tr(ctx, `${d.product}, en images`, `${d.product} in pictures`));
  return out;
};

const immersiveVideo: CopyFn = (ctx, base, schema) => {
  const d = data(ctx);
  const out = prepare(base);
  const set = sectionSetter(schema, out.settings);
  set("eyebrow", d.brand);
  set("text", p(tr(ctx, "Chaque détail, filmé au plus près.", "Every detail, filmed up close.")));
  set("button_label", tr(ctx, "Voir le produit", "View the product"));
  return out;
};

const mediaGallery: CopyFn = (ctx, base, schema) => {
  const d = data(ctx);
  const out = prepare(base);
  const set = sectionSetter(schema, out.settings);
  set("eyebrow", d.brand);
  set("heading", tr(ctx, `${d.product},`, `${d.product},`));
  set("heading_accent", tr(ctx, "en images et en mouvement", "in pictures and in motion"));
  set("text", p(d.tagline || d.summary));
  return out;
};

const socialGallery: CopyFn = (ctx, base, schema) => {
  const d = data(ctx);
  const out = prepare(base);
  const set = sectionSetter(schema, out.settings);
  set("eyebrow", tr(ctx, "Sur les réseaux", "On social"));
  set("heading", tr(ctx, `Suivez ${d.brand}`, `Follow ${d.brand}`));
  set("text", p(tr(ctx, "Coulisses, nouveautés et inspirations : retrouvez-nous au quotidien.", "Behind the scenes, new arrivals and ideas: follow along every day.")));
  // Le compte social est une vérité du marchand.
  if (!ctx.sample) {
    out.settings.handle = todo(ctx, "@compte", "@account");
    return out;
  }
  out.settings.handle = `@${slug(d.brand) || "boutique"} · ${exampleTag(ctx)}`;
  if (isEmpty(out.settings.account_url)) out.settings.account_url = "#";
  set("button_label", tr(ctx, "Suivez-nous", "Follow us"));
  return { ...out, samples: true };
};

const storyCircles: CopyFn = (ctx, base, schema) => {
  const d = data(ctx);
  const out = prepare(base);
  sectionSetter(schema, out.settings)("heading", tr(ctx, `L'univers ${d.brand}`, `The ${d.brand} world`));
  const fits = (s: string) => s && s.length <= 20;
  const labels: { label: string; link?: string }[] = [
    ...ctx.collections.filter((c) => fits(clean(c.title))).map((c) => ({ label: c.title, link: c.handle ? `/collections/${c.handle}` : undefined })),
    ...(fits(d.product) ? [{ label: d.product }] : []),
    { label: tr(ctx, "Nouveautés", "New in") },
    { label: tr(ctx, "En détail", "In detail") },
    { label: tr(ctx, "En situation", "In use") },
    { label: tr(ctx, "Coulisses", "Behind the scenes") },
  ];
  const seen = new Set<string>();
  const uniq = labels.filter((l) => !seen.has(l.label.toLowerCase()) && seen.add(l.label.toLowerCase()));
  out.blocks.forEach((b, i) => {
    const l = pickCycle(uniq, i);
    const generic = ["Nouveautés", "New in", "New arrivals"].includes(String(b.settings.label ?? ""));
    const put = blockSetter(schema, b);
    put("label", l.label, generic);
    if (l.link) put("link", l.link);
  });
  return out;
};

const videoCarousel: CopyFn = (ctx, base, schema) => {
  const d = data(ctx);
  const out = prepare(base);
  const set = sectionSetter(schema, out.settings);
  set("heading", `${d.product},`);
  set("heading_accent", tr(ctx, "en vidéo", "on video"));
  set("subheading", d.tagline || tr(ctx, `${d.product}, sous tous les angles.`, `${d.product}, from every angle.`));
  const titles = [tr(ctx, "Vue d'ensemble", "The full view"), tr(ctx, "En détail", "In detail"), tr(ctx, "Sous un autre angle", "From another angle")];
  out.blocks.forEach((b, i) => {
    const put = blockSetter(schema, b);
    put("title", pickCycle(titles, i));
    put("caption", i === 0 ? d.product : d.brand);
  });
  return out;
};

const videoReels: CopyFn = (ctx, base, schema) => {
  const d = data(ctx);
  const out = prepare(base);
  const set = sectionSetter(schema, out.settings);
  set("heading", `${d.product},`);
  set("heading_accent", tr(ctx, "en vidéo", "on video"));
  const caps = [tr(ctx, "Vue d'ensemble", "The full view"), tr(ctx, "En détail", "In detail"), tr(ctx, "Sous un autre angle", "From another angle"), tr(ctx, `Signé ${d.brand}`, `By ${d.brand}`)];
  out.blocks.forEach((b, i) => blockSetter(schema, b)("caption", pickCycle(caps, i)));
  return out;
};

const videoShowcase: CopyFn = (ctx, base, schema) => {
  const d = data(ctx);
  const out = prepare(base);
  const set = sectionSetter(schema, out.settings);
  set("heading", tr(ctx, `${d.brand}, en mouvement`, `${d.brand}, in motion`));
  set("caption", tr(ctx, `${d.product}, sous tous les angles.`, `${d.product}, from every angle.`));
  return out;
};

const videoStories: CopyFn = (ctx, base, schema) => {
  const d = data(ctx);
  const out = prepare(base);
  const set = sectionSetter(schema, out.settings);
  set("eyebrow", d.brand);
  set("heading", `${d.product},`);
  set("heading_accent", tr(ctx, "en mouvement.", "in motion."));
  const caps = [d.summary || d.product, tr(ctx, `${d.product}, en mouvement.`, `${d.product}, in motion.`), tr(ctx, "Les détails, de près.", "The details, up close."), d.tagline || tr(ctx, `L'univers ${d.brand}.`, `The ${d.brand} world.`)];
  out.blocks.forEach((b, i) => {
    const put = blockSetter(schema, b);
    put("caption", pickCycle(caps, i));
    put("link_label", tr(ctx, "Voir le produit", "View the product"));
  });
  return out;
};

export const COPY: Record<string, CopyFn> = {
  "alternating-content": alternatingContent,
  "customer-wall": customerWall,
  "double-banner": doubleBanner,
  "editorial-gallery": editorialGallery,
  "editorial-visual": editorialVisual,
  "floating-scene": floatingScene,
  "gallery-mosaic": galleryMosaic,
  "immersive-video": immersiveVideo,
  "media-gallery": mediaGallery,
  "social-gallery": socialGallery,
  "story-circles": storyCircles,
  "video-carousel": videoCarousel,
  "video-reels": videoReels,
  "video-showcase": videoShowcase,
  "video-stories": videoStories,
};
