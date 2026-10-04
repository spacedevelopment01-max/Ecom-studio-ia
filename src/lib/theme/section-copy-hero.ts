/**
 * Rédaction des sections du groupe « hero » (ouvertures, appels à l'action, offres, newsletter,
 * contact, collections et menus) — voir section-content.ts.
 *
 * Règles : textes tirés du vrai projet (marque, signature, produit, résumé, faits confirmés, collections) ;
 * sinon des formulations neutres qui n'affirment rien ; espaces réservés courts uniquement pour ce qui
 * exige une vérité du marchand (avis, remises, codes, dates, conditions). En aperçu (`sample`), ces
 * espaces réservés deviennent des exemples réalistes marqués « Exemple ».
 */
import type { ContentContext, CopyFn } from "./section-content";
import { exampleTag, todo, tr } from "./section-content";
import type { SectionSchema } from "./spec";

type Settings = Record<string, unknown>;
type Block = { type: string; settings?: Settings };

/* ---------- Données du projet, nettoyées ---------- */

/** Texte réel du projet (les espaces réservés « [À définir…] » du projet comptent comme vides). */
const real = (s?: string | null) => {
  const v = (s ?? "").trim();
  return v && !/^\[/.test(v) && !/\[(À|A) (compléter|définir|préciser)|\[To (complete|define)/i.test(v) ? v : "";
};
const sentence = (s: string) => (s && !/[.!?…]$/.test(s) ? `${s}.` : s);
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const p = (s: string) => (s ? `<p>${esc(s)}</p>` : "");

function facts(ctx: ContentContext) {
  return ctx.product.facts.map((f) => ({ label: real(f.label), value: real(f.value).replace(/\.$/, "") })).filter((f) => f.label && f.value);
}

function data(ctx: ContentContext) {
  const brand = real(ctx.brand?.name) || ctx.shopName;
  const product = real(ctx.product.name) || brand;
  const tagline = real(ctx.brand?.tagline);
  const summary = sentence(real(ctx.product.summary));
  const price = ctx.product.price != null ? money(ctx, ctx.product.price) : "";
  const message = real(ctx.strategy?.keyMessages?.[0]);
  return { brand, product, tagline, summary, price, message, facts: facts(ctx) };
}

/** Prix confirmé (en centimes) au format de la boutique. */
function money(ctx: ContentContext, cents: number) {
  try {
    return new Intl.NumberFormat(ctx.lang === "en" ? "en-US" : "fr-FR", { style: "currency", currency: ctx.product.currency || "EUR" }).format(cents / 100).replace(/ /g, " ");
  } catch {
    return "";
  }
}

/** Identifiant Shopify (handle) dérivé d'un titre, comme ceux de la boutique générée. */
const handleize = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Coupe une signature en deux lignes (titres en deux temps) : à la virgule, sinon au milieu. */
function splitLine(s: string): [string, string] | null {
  const words = s.split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > 8 || s.length > 48) return null;
  const comma = words.findIndex((w, i) => i < words.length - 1 && /,$/.test(w));
  const cut = comma >= 0 ? comma + 1 : Math.floor(words.length / 2);
  return [words.slice(0, cut).join(" "), words.slice(cut).join(" ")];
}

/** Date AAAA-MM-JJ dans n jours (exemples d'aperçu). */
function inDays(n: number) {
  const d = new Date(Date.now() + n * 86400000);
  return d.toISOString().slice(0, 10);
}
function longDate(ctx: ContentContext, iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString(ctx.lang === "en" ? "en-US" : "fr-FR", { day: "numeric", month: "long", timeZone: "UTC" });
}

/* ---------- Écriture des réglages ---------- */

/** Écrit un réglage seulement s'il est vide ou resté à la valeur du préréglage / par défaut. */
function writer(schema: SectionSchema, base: Settings) {
  const out: Settings = { ...base };
  const defs = new Map(schema.settings.map((s) => [s.id, s]));
  const set = (id: string, v: unknown) => {
    const d = defs.get(id);
    if (!d || v === undefined) return;
    const cur = out[id];
    if (cur === undefined || cur === "" || cur === null || cur === (d as { default?: unknown }).default) out[id] = v;
  };
  return { out, set };
}
function blockWriter(schema: SectionSchema, b: Block) {
  const defs = schema.blocks.find((x) => x.type === b.type)?.settings ?? [];
  const s: Settings = { ...(b.settings ?? {}) };
  const set = (id: string, v: unknown) => {
    const d = defs.find((x) => x.id === id) as { default?: unknown } | undefined;
    if (!d || v === undefined) return;
    const cur = s[id];
    if (cur === undefined || cur === "" || cur === null || cur === d.default) s[id] = v;
  };
  return { s, set };
}

/** Espace réservé du marchand, ou exemple marqué en aperçu. */
function need(ctx: ContentContext, flag: { used: boolean }, placeholder: [string, string], sample: [string, string]) {
  if (ctx.sample) {
    flag.used = true;
    return tr(ctx, sample[0], sample[1]);
  }
  return todo(ctx, placeholder[0], placeholder[1]);
}

/* ---------- Sections ---------- */

export const COPY: Record<string, CopyFn> = {
  hero(ctx, base, schema) {
    const d = data(ctx);
    const { out, set } = writer(schema, base.settings);
    set("eyebrow", d.tagline ? d.product : d.brand);
    set("heading", d.tagline || d.product);
    set("text", p(d.summary || d.message || tr(ctx, `${d.product} : à découvrir chez ${d.brand}.`, `${d.product}: now at ${d.brand}.`)));
    set("button_label", tr(ctx, "Découvrir", "Discover"));
    set("image_alt", d.product);
    return { settings: out };
  },

  "hero-editorial"(ctx, base, schema) {
    const d = data(ctx);
    const { out, set } = writer(schema, base.settings);
    const lines = splitLine(d.tagline) ?? splitLine(d.product) ?? [d.brand, tr(ctx, "l'essentiel.", "the essentials.")];
    set("eyebrow", d.brand);
    set("heading_line1", lines[0]);
    set("heading_line2", lines[1]);
    set("text", p(d.summary || tr(ctx, `${d.product}, à découvrir chez ${d.brand}.`, `${d.product}, now at ${d.brand}.`)));
    set("button_label", tr(ctx, "Découvrir", "Discover"));
    set("image_alt", d.product);
    return { settings: out };
  },

  "hero-flex"(ctx, base, schema) {
    const d = data(ctx);
    const flag = { used: false };
    const lines = splitLine(d.tagline);
    const fs = d.facts.slice(0, 3);
    const blocks = (base.blocks ?? []).map((b) => {
      const { s, set } = blockWriter(schema, b);
      switch (b.type) {
        case "eyebrow":
          set("text", d.brand);
          break;
        case "badge":
          set("text", tr(ctx, `Nouveau chez ${d.brand}`, `New at ${d.brand}`));
          set("icon", "sparkle");
          break;
        case "heading":
          set("heading", lines ? lines[0] : d.product);
          set("accent", lines ? lines[1] : "");
          break;
        case "text":
          set("text", p(d.summary || tr(ctx, `${d.product} : à découvrir chez ${d.brand}.`, `${d.product}: now at ${d.brand}.`)));
          break;
        case "buttons":
          set("label", tr(ctx, "Découvrir", "Discover"));
          set("label_2", "");
          break;
        case "rating":
          if (ctx.sample) {
            flag.used = true;
            set("stars", 5);
            set("text", tr(ctx, `4,8/5 · 126 avis · ${exampleTag(ctx)}`, `4.8/5 · 126 reviews · ${exampleTag(ctx)}`));
          } else set("text", todo(ctx, "note et nombre d'avis", "rating and review count"));
          break;
        case "features": {
          // Faits confirmés du produit d'abord ; en aperçu, des chiffres de boutique d'exemple complètent.
          const samples: [string, string, string, string][] = [
            ["4,8/5", "Note clients", "4.8/5", "Customer rating"],
            ["48 h", "Expédition", "48 h", "Dispatch"],
            ["30 jours", "Pour changer d'avis", "30 days", "To change your mind"],
          ];
          for (let i = 1; i <= 3; i++) {
            const f = fs[i - 1];
            if (f) {
              s[`value_${i}`] = f.value;
              s[`label_${i}`] = f.label;
            } else if (ctx.sample) {
              flag.used = true;
              const x = samples[i - 1];
              s[`value_${i}`] = tr(ctx, x[0], x[2]);
              s[`label_${i}`] = `${tr(ctx, x[1], x[3])} · ${exampleTag(ctx)}`;
            } else if (i === 1 && !fs.length) {
              s.value_1 = todo(ctx, "chiffre", "figure");
              s.label_1 = tr(ctx, "Caractéristique", "Feature");
            } else {
              s[`value_${i}`] = "";
              s[`label_${i}`] = "";
            }
          }
          break;
        }
        case "logos":
          set("label", need(ctx, flag, ["ex. Ils parlent de nous", "e.g. As seen in"], ["Ils parlent de nous", "As seen in"]));
          break;
        case "checklist":
          if (fs.length) set("lines", fs.map((f) => `${f.label}${tr(ctx, " : ", ": ")}${f.value}`).join("\n"));
          break;
      }
      return { type: b.type, settings: s };
    });
    return { settings: { ...base.settings }, blocks, samples: flag.used };
  },

  "hero-fullbleed"(ctx, base, schema) {
    const d = data(ctx);
    const { out, set } = writer(schema, base.settings);
    set("eyebrow", d.brand);
    set("heading", d.tagline || d.product);
    set("text", p(d.summary));
    set("button_label", tr(ctx, "Voir la boutique", "Shop now"));
    return { settings: out };
  },

  "hero-split"(ctx, base, schema) {
    const d = data(ctx);
    const { out, set } = writer(schema, base.settings);
    const f = d.facts[0];
    set("eyebrow", d.brand);
    set("heading", d.product);
    set("text", p(d.summary || d.tagline || tr(ctx, `${d.product} : à découvrir chez ${d.brand}.`, `${d.product}: now at ${d.brand}.`)));
    if (f) set("badge", `${f.label}${tr(ctx, " : ", ": ")}${f.value}`);
    set("button_label", d.price ? tr(ctx, `Commander · ${d.price}`, `Shop now · ${d.price}`) : tr(ctx, "Commander", "Shop now"));
    return { settings: out };
  },

  slideshow(ctx, base, schema) {
    const d = data(ctx);
    const col = ctx.collections[0];
    const factLine = d.facts.slice(0, 2).map((f) => `${f.label}${tr(ctx, " : ", ": ")}${f.value}`).join(" · ");
    const slides: Record<string, unknown>[] = [
      { eyebrow: d.brand, heading: d.tagline || d.product, text: p(d.summary), button_label: tr(ctx, "Découvrir", "Discover") },
      {
        eyebrow: d.tagline ? d.product : d.brand,
        heading: tr(ctx, `${d.product}, de plus près`, `${d.product}, up close`),
        text: p(factLine ? sentence(factLine) : tr(ctx, "Chaque détail compte : prenez le temps de le découvrir.", "Every detail matters: take the time to discover it.")),
        button_label: tr(ctx, "Voir le produit", "View product"),
      },
      {
        eyebrow: d.brand,
        heading: col ? col.title : tr(ctx, `L'univers ${d.brand}`, `The ${d.brand} world`),
        text: p(tr(ctx, `Toute la sélection ${d.brand}, réunie au même endroit.`, `The full ${d.brand} selection, all in one place.`)),
        button_label: tr(ctx, "Explorer", "Explore"),
      },
    ];
    const blocks = (base.blocks ?? []).map((b, i) => {
      if (b.type !== "slide") return b;
      const { s, set } = blockWriter(schema, b);
      const c = slides[i % slides.length];
      // Le préréglage donne déjà des titres (« Une deuxième diapositive »…) : on les remplace.
      for (const [k, v] of Object.entries(c)) {
        if (k === "heading" && typeof s.heading === "string" && /diapositive|slide/i.test(s.heading)) s.heading = v;
        else set(k, v);
      }
      set("image_alt", d.product);
      return { type: b.type, settings: s };
    });
    return { settings: { ...base.settings }, blocks };
  },

  "cta-banner"(ctx, base, schema) {
    const d = data(ctx);
    const { out, set } = writer(schema, base.settings);
    set("heading", tr(ctx, "Envie d'essayer ?", "Ready to try it?"));
    const line = d.price ? `${d.product} · ${d.price}` : d.product;
    set("text", `<p>${esc(line)}${d.tagline ? `<br>${esc(d.tagline)}` : ""}</p>`);
    set("button_label", tr(ctx, "Commander", "Shop now"));
    return { settings: out };
  },

  countdown(ctx, base, schema) {
    const d = data(ctx);
    const { out, set } = writer(schema, base.settings);
    set("heading", tr(ctx, "L'offre se termine dans", "The offer ends in"));
    set("end_message", tr(ctx, "Cette offre est terminée.", "This offer has ended."));
    set("button_label", tr(ctx, "J'en profite", "Shop the offer"));
    if (ctx.sample) {
      set("eyebrow", tr(ctx, "Offre de lancement", "Launch offer"));
      set("text", tr(ctx, `<p>${esc(d.product)} : -15 % avec le code <strong>BIENVENUE15</strong> · ${exampleTag(ctx)}</p>`, `<p>${esc(d.product)}: 15% off with code <strong>WELCOME15</strong> · ${exampleTag(ctx)}</p>`));
      set("end_date", inDays(5));
      set("end_time", "23:59");
      return { settings: out, samples: true };
    }
    set("text", p(todo(ctx, "offre et conditions", "offer and terms")));
    return { settings: out };
  },

  "featured-offer"(ctx, base, schema) {
    const d = data(ctx);
    const { out, set } = writer(schema, base.settings);
    set("eyebrow", tr(ctx, "Offre", "Offer"));
    set("product", ctx.products[0]?.handle || handleize(d.product));
    set("button_label", tr(ctx, "J'en profite", "Shop the offer"));
    if (ctx.sample) {
      const end = longDate(ctx, inDays(5));
      set("highlight", tr(ctx, "-20 %", "20% off"));
      set("heading", tr(ctx, "Offre de bienvenue", "Welcome offer"));
      set("text", p(tr(ctx, `Votre première commande ${d.brand}, à prix doux.`, `Your first ${d.brand} order, for less.`)));
      set("code", tr(ctx, "BIENVENUE20", "WELCOME20"));
      set("validity", tr(ctx, `Jusqu'au ${end} · ${exampleTag(ctx)}`, `Until ${end} · ${exampleTag(ctx)}`));
      set("conditions", p(tr(ctx, "Conditions d'exemple : une utilisation par client, non cumulable avec d'autres offres.", "Example terms: one use per customer, cannot be combined with other offers.")));
      return { settings: out, samples: true };
    }
    set("highlight", todo(ctx, "remise", "discount"));
    set("heading", d.product);
    set("text", p(todo(ctx, "contenu de l'offre", "what the offer includes")));
    set("validity", todo(ctx, "dates", "dates"));
    set("conditions", p(todo(ctx, "conditions", "terms")));
    return { settings: out };
  },

  newsletter(ctx, base, schema) {
    const d = data(ctx);
    const { out, set } = writer(schema, base.settings);
    set("eyebrow", tr(ctx, "Newsletter", "Newsletter"));
    set("heading", tr(ctx, `Les nouvelles de ${d.brand}`, `News from ${d.brand}`));
    set("text", p(tr(ctx, `Nouveautés, coulisses et conseils ${d.brand}, sans excès.`, `New arrivals, behind the scenes and tips from ${d.brand}, never too often.`)));
    set("button_label", tr(ctx, "S'inscrire", "Subscribe"));
    set("legal", tr(ctx, "Désinscription possible à tout moment.", "Unsubscribe at any time."));
    return { settings: out };
  },

  "newsletter-media"(ctx, base, schema) {
    const d = data(ctx);
    const { out, set } = writer(schema, base.settings);
    set("eyebrow", tr(ctx, "Newsletter", "Newsletter"));
    set("heading", tr(ctx, `Rejoignez ${d.brand}`, `Join ${d.brand}`));
    set("text", p(tr(ctx, `Les nouveautés ${d.brand}, les coulisses et nos conseils, directement dans votre boîte mail.`, `New from ${d.brand}, behind the scenes and our tips, straight to your inbox.`)));
    set("perk_1", tr(ctx, "Les nouveautés en premier", "New arrivals first"));
    set("perk_2", tr(ctx, "Conseils et coulisses", "Tips and behind the scenes"));
    set("button_label", tr(ctx, "S'inscrire", "Subscribe"));
    set("consent_label", tr(ctx, "J'accepte de recevoir la newsletter par e-mail.", "I agree to receive the newsletter by email."));
    if (ctx.sample) {
      set("perk_3", tr(ctx, `-10 % sur la première commande · ${exampleTag(ctx)}`, `10% off your first order · ${exampleTag(ctx)}`));
      set("media_badge", tr(ctx, `-10 % · ${exampleTag(ctx)}`, `10% off · ${exampleTag(ctx)}`));
      set("legal", p(tr(ctx, "Désinscription en un clic depuis chaque e-mail.", "Unsubscribe in one click from any email.")));
      return { settings: out, samples: true };
    }
    set("legal", `<p>${esc(tr(ctx, "Désinscription possible à tout moment.", "Unsubscribe at any time."))} ${esc(todo(ctx, "lien politique de confidentialité", "privacy policy link"))}</p>`);
    return { settings: out };
  },

  "contact-form"(ctx, base, schema) {
    const d = data(ctx);
    const { out, set } = writer(schema, base.settings);
    set("eyebrow", tr(ctx, "Contact", "Contact"));
    set("heading", tr(ctx, "Écrivez-nous", "Get in touch"));
    set("text", p(tr(ctx, `Une question sur un produit, une commande ou un conseil ? L'équipe ${d.brand} est à votre écoute.`, `A question about a product, an order or some advice? The ${d.brand} team is here to help.`)));
    if (ctx.sample) {
      const domain = handleize(d.brand) || "boutique";
      set("email", `${tr(ctx, "bonjour", "hello")}@${domain}.${ctx.lang === "en" ? "com" : "fr"} · ${exampleTag(ctx)}`);
      set("hours", tr(ctx, `Du lundi au vendredi, 9 h – 18 h · ${exampleTag(ctx)}`, `Monday to Friday, 9am – 6pm · ${exampleTag(ctx)}`));
      set("response", tr(ctx, `Réponse sous 24 h ouvrées · ${exampleTag(ctx)}`, `Reply within 1 business day · ${exampleTag(ctx)}`));
      return { settings: out, samples: true };
    }
    return { settings: out };
  },

  "collection-list"(ctx, base, schema) {
    const d = data(ctx);
    const { out, set } = writer(schema, base.settings);
    set("eyebrow", tr(ctx, "Collections", "Collections"));
    set("heading", tr(ctx, `L'univers ${d.brand}`, `The ${d.brand} world`));
    // Cartes sans collection (elles mènent à la liste des collections) : repères neutres, la dernière ouvre toute la boutique.
    const extra = ctx.lang === "en" ? ["New in", "Our picks", "In use", "Gift ideas"] : ["Nouveautés", "Notre sélection", "En situation", "Idées cadeaux"];
    let k = 0;
    const blocks = (base.blocks ?? []).map((b, i, all) => {
      if (b.type !== "collection") return b;
      const { s, set: bset } = blockWriter(schema, b);
      if (!s.collection) {
        const last = i === all.length - 1;
        bset("title", last ? tr(ctx, "Toute la boutique", "Shop all") : extra[k++] ?? tr(ctx, "Toute la boutique", "Shop all"));
      }
      return { type: b.type, settings: s };
    });
    return { settings: out, blocks };
  },

  "featured-collection"(ctx, base, schema) {
    const d = data(ctx);
    const { out, set } = writer(schema, base.settings);
    const col = ctx.collections[0];
    if (col) set("collection", col.handle);
    set("eyebrow", d.brand);
    set("heading", col ? col.title : tr(ctx, `La sélection ${d.brand}`, `The ${d.brand} edit`));
    return { settings: out };
  },

  "product-recommendations"(ctx, base, schema) {
    const { out, set } = writer(schema, base.settings);
    set("eyebrow", tr(ctx, "Sélectionnés pour vous", "Picked for you"));
    set("heading", tr(ctx, "Vous aimerez aussi", "You may also like"));
    const col = ctx.collections[0];
    if (col) set("fallback_collection", col.handle);
    return { settings: out };
  },

  "visual-menu"(ctx, base, schema) {
    const d = data(ctx);
    const { out, set } = writer(schema, base.settings);
    set("heading", tr(ctx, `Explorer ${d.brand}`, `Explore ${d.brand}`));
    // Libellés : vraies collections d'abord, puis repères neutres (tous mènent à de vraies pages de la boutique).
    const neutral = ctx.lang === "en" ? ["New in", "Our picks", "Essentials", "In use", "Gift ideas", "Shop all"] : ["Nouveautés", "Notre sélection", "Essentiels", "En situation", "Idées cadeaux", "Tout voir"];
    const cols = ctx.collections.slice(0, 2);
    const presetLabels = new Set(["Nouveautés", "Notre sélection", "L'univers", "En situation", "Idées cadeaux", "Tout voir"]);
    const blocks = (base.blocks ?? []).map((b, i, all) => {
      if (b.type !== "item") return b;
      const s: Settings = { ...(b.settings ?? {}) };
      const preset = !s.label || presetLabels.has(String(s.label));
      if (!preset) return { type: b.type, settings: s };
      const c = cols[i];
      if (c && !s.collection) {
        s.collection = c.handle;
        s.label = c.title;
      } else if (i === all.length - 1) s.label = neutral[5];
      else s.label = neutral[Math.min(i, 4)];
      return { type: b.type, settings: s };
    });
    return { settings: out, blocks };
  },
};
