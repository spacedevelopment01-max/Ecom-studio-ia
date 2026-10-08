/**
 * CMS Engine V2 — couche de design commune à toutes les plateformes, extraite du RENDU RÉEL de l'aperçu du studio
 * (même moteur que le thème Shopify) : variables de couleurs des schémas, typographies (@font-face), échelle V2,
 * styles propres aux sections, attributs du <body> (langage visuel, densité, classes d'animation).
 * Aucune valeur n'est recopiée à la main : si le design change dans le studio, l'export suit.
 */
import { compileTheme, type ThemeFiles } from "../theme/compile";
import { renderPage } from "../theme/render";
import type { ThemeSpec } from "../theme/spec";

export type DesignLayer = {
  /** Feuille « design » (variables, @font-face, échelle V2, styles de sections), polices en chemin relatif ../fonts/. */
  css: string;
  /** Attributs du <body> de l'aperçu (data-ds, data-density, classes hors gabarit). */
  body: { ds: string; density: string; classes: string[] };
  /** Polices utilisées (fichiers de assets/fonts). */
  fonts: string[];
  /** Feuilles du thème à charger, dans l'ordre (fichiers de theme-base/assets). */
  stylesheets: string[];
};

const attr = (tag: string, name: string) => (tag.match(new RegExp(`\\s${name}="([^"]*)"`)) ?? [])[1] ?? "";

export async function designLayer(spec: ThemeSpec, files: ThemeFiles = compileTheme(spec)): Promise<DesignLayer> {
  const r = await renderPage({ spec, base: "", files, cart: [] }, "/", new URLSearchParams());
  const head = r.html.slice(0, r.html.indexOf("<body"));
  const styles = [...head.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1].trim()).filter(Boolean);
  const fonts = new Set<string>();
  const css = styles
    .join("\n\n")
    .replace(/url\("\/__fonts\/([A-Za-z0-9-]+\.ttf)"\)/g, (_m, f: string) => {
      fonts.add(f);
      return `url("../fonts/${f}")`;
    });
  const bodyTag = (r.html.match(/<body[^>]*>/) ?? [""])[0];
  const classes = attr(bodyTag, "class")
    .split(/\s+/)
    .filter((c) => c && !c.startsWith("template-"));
  const stylesheets = [...head.matchAll(/<link href="\/assets\/([^"]+\.css)"/g)].map((m) => m[1]);
  return { css, body: { ds: attr(bodyTag, "data-ds") || "none", density: attr(bodyTag, "data-density") || "balanced", classes }, fonts: [...fonts], stylesheets };
}
