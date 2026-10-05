/**
 * Outils purs des articles de blog (serveur et navigateur) : HTML simple et sûr, nombre de mots,
 * slug, longueurs SEO, passages « [À compléter : …] ».
 */

import sanitizeHtml from "sanitize-html";

export const PH_RE = /\[(?:À compléter|A compléter|To complete)\s*:[^\]]*\]/gi;
export const placeholders = (text: string) => text.match(PH_RE) ?? [];

export const stripTags = (html: string) =>
  html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

export function countWords(html: string): number {
  return stripTags(html).split(" ").filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

export function slugify(s: string): string {
  return (
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/œ/g, "oe")
      .replace(/æ/g, "ae")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80)
      .replace(/-+$/g, "") || "article"
  );
}

/** Coupe à une limite de caractères sur une frontière de mot. */
export function fitLength(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max + 1);
  const i = cut.lastIndexOf(" ");
  return (i > max * 0.6 ? cut.slice(0, i) : t.slice(0, max)).replace(/[\s,;:.\-–—]+$/, "");
}

export const escHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const ALLOWED = ["h2", "h3", "p", "ul", "ol", "li", "strong", "em", "a", "br", "blockquote"];
/** Balises dont le contenu n'est pas du texte d'article : retirées avec tout ce qu'elles contiennent. */
const DROP_WITH_CONTENT = ["script", "style", "textarea", "option", "select", "noscript", "iframe", "object", "embed", "svg", "math", "template", "title", "head", "xmp", "plaintext", "noembed", "noframes"];
const EMPTY_DROPPED = new Set(["p", "h2", "h3", "li", "strong", "em"]);

/** Lien interne sûr : « /chemin », jamais « // » ni « /\ » (que les navigateurs lisent comme une autre adresse). */
const INTERNAL_HREF = /^\/(?![/\\])[^\s"<>\\]*$/;
const EXTERNAL_HREF = /^https?:\/\/[^\s"<>\\]+$/i;

/** Retire les liens sans adresse (refusés) en gardant leur texte. Le HTML reçu est déjà nettoyé : tout « < » du texte est échappé. */
function dropBareLinks(s: string): string {
  const stack: boolean[] = [];
  return s.replace(/<a(?: href="[^"]*")?>|<\/a>/g, (m) => {
    if (m === "</a>") return stack.pop() === false ? "" : m;
    const kept = m !== "<a>";
    stack.push(kept);
    return kept ? m : "";
  });
}

/**
 * HTML simple et sûr : h2/h3/p/ul/ol/li/strong/em/a/br/blockquote, sans attributs (sauf href des liens).
 * Analyseur HTML éprouvé (sanitize-html, liste blanche) : une balise ouverte et jamais fermée, un « < » isolé
 * ou un commentaire sans fin restent du texte échappé, jamais du code.
 * `links` : « known » garde seulement les liens internes connus (sortie de l'IA : aucune adresse inventée) ;
 * « any » garde les liens internes et http(s) (saisie du client).
 */
export function sanitizeBlogHtml(html: string, opts: { links: "any" | { known: Set<string> } } = { links: "any" }): string {
  const okHref = (href: string) => {
    const h = href.trim();
    const internal = INTERNAL_HREF.test(h);
    return opts.links === "any" ? internal || EXTERNAL_HREF.test(h) : internal && opts.links.known.has(h.split(/[?#]/)[0].replace(/\/$/, ""));
  };
  const s = sanitizeHtml(String(html ?? ""), {
    allowedTags: ALLOWED,
    allowedAttributes: { a: ["href"] },
    allowedSchemes: ["http", "https"],
    allowedSchemesAppliedToAttributes: ["href"],
    allowProtocolRelative: false,
    disallowedTagsMode: "discard",
    nonTextTags: DROP_WITH_CONTENT,
    selfClosing: ["br"],
    transformTags: {
      h1: "h2",
      h4: "h3",
      h5: "h3",
      h6: "h3",
      b: "strong",
      i: "em",
      // Lien refusé : marqué sans adresse, puis retiré ci-dessous (le texte reste).
      a: (_tag, attribs) => ({ tagName: "a", attribs: attribs.href && okHref(attribs.href) ? { href: attribs.href.trim() } : ({} as Record<string, string>) }),
    },
    // Balises vides retirées.
    exclusiveFilter: (frame) => EMPTY_DROPPED.has(frame.tag) && !frame.text.trim() && !frame.mediaChildren.length,
  });
  return dropBareLinks(s)
    .replace(/<br \/>/g, "<br>")
    .replace(/<(p|h2|h3|li|strong|em)>\s*<\/\1>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
