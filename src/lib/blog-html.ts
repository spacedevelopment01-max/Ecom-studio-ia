/**
 * Outils purs des articles de blog (serveur et navigateur) : HTML simple et sûr, nombre de mots,
 * slug, longueurs SEO, passages « [À compléter : …] ».
 */

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

const ALLOWED = new Set(["h2", "h3", "p", "ul", "ol", "li", "strong", "em", "a", "br", "blockquote"]);

/**
 * HTML simple et sûr : h2/h3/p/ul/ol/li/strong/em/a/br/blockquote, sans attributs (sauf href des liens).
 * `links` : « known » garde seulement les liens internes connus (sortie de l'IA : aucune adresse inventée) ;
 * « any » garde les liens internes et http(s) (saisie du client).
 */
export function sanitizeBlogHtml(html: string, opts: { links: "any" | { known: Set<string> } } = { links: "any" }): string {
  let s = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|iframe|object|embed|svg|math|template|noscript)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<(script|style|iframe|object|embed)[^>]*\/?>/gi, "");
  const open: string[] = [];
  s = s.replace(/<\s*(\/?)\s*([a-zA-Z0-9]+)([^>]*)>/g, (_m, close: string, rawTag: string, attrs: string) => {
    let tag = rawTag.toLowerCase();
    if (tag === "h1") tag = "h2";
    if (tag === "h4" || tag === "h5" || tag === "h6") tag = "h3";
    if (tag === "b") tag = "strong";
    if (tag === "i") tag = "em";
    if (!ALLOWED.has(tag)) return "";
    if (tag === "br") return close ? "" : "<br>";
    if (close) {
      const at = Math.max(open.lastIndexOf(tag), tag === "a" ? open.lastIndexOf("a!") : -1);
      if (at < 0) return "";
      const closing = open.splice(at).reverse();
      return closing.map((t) => (t === "a!" ? "" : `</${t.replace("!", "")}>`)).join("");
    }
    if (tag === "a") {
      const href = (attrs.match(/href\s*=\s*"([^"]*)"/i) ?? attrs.match(/href\s*=\s*'([^']*)'/i))?.[1]?.trim() ?? "";
      const internal = /^\/(?!\/)[^\s"<>]*$/.test(href);
      const okHref = opts.links === "any" ? internal || /^https?:\/\/[^\s"<>]+$/i.test(href) : internal && opts.links.known.has(href.split(/[?#]/)[0].replace(/\/$/, ""));
      if (!okHref) {
        open.push("a!"); // lien retiré : le texte reste
        return "";
      }
      open.push("a");
      return `<a href="${escHtml(href)}">`;
    }
    open.push(tag);
    return `<${tag}>`;
  });
  s += open
    .reverse()
    .map((t) => (t === "a!" ? "" : `</${t}>`))
    .join("");
  // Balises vides retirées.
  return s
    .replace(/<(p|h2|h3|li|strong|em)>\s*<\/\1>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
