/**
 * Design system centralisé (Theme Engine V2) : la direction artistique devient les réglages RÉELS du thème
 * (config/settings_data.json) — schémas de couleurs, typographies, échelle des titres, densité, rayons, boutons,
 * animations, largeur de page, langage visuel (data-ds). Ces réglages restent modifiables dans le studio et dans
 * l'éditeur de thème Shopify. Contraste vérifié pour chaque schéma.
 */
import { contrast, ensureContrast, mix, onColor, withLightness, hsl } from "../color";
import type { ArtDirection } from "./art-direction";

type Scheme = { background: string; surface: string; text: string; muted: string; accent: string; accent_text: string; border: string };

/** Accent dont le texte posé dessus (bouton) atteint 4,5:1 : on éclaircit ou fonce l'accent si besoin. */
function buttonSafe(acc: string): string {
  // Sens fixé une fois (texte clair → accent plus foncé, texte foncé → accent plus clair) : pas d'oscillation.
  const on = onColor(acc);
  let a = acc;
  for (let i = 0; i < 20 && contrast(a, on) < 4.6; i++) {
    const l = hsl(a)[2];
    a = withLightness(a, on === "#FFFFFF" ? Math.max(0, l - 0.03) : Math.min(1, l + 0.03));
  }
  return a;
}

/**
 * Couleur lisible sur un fond : rapprochée du noir OU du blanc (le sens qui atteint le contraste demandé, sinon le plus
 * lisible des deux). Sur un fond de luminance moyenne, un seul sens fonctionne.
 */
function readable(fg: string, bg: string, ratio: number): string {
  if (contrast(fg, bg) >= ratio) return fg;
  const tries = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1].flatMap((k) => [mix(fg, "#000000", k), mix(fg, "#FFFFFF", k)]);
  return tries.find((c) => contrast(c, bg) >= ratio) ?? [...tries, fg].sort((a, b) => contrast(b, bg) - contrast(a, bg))[0];
}

function scheme(bg: string, text: string, accent: string, surfaceT = 0.05): Scheme {
  const t = readable(text, bg, 7);
  // Accent lisible comme TEXTE (chiffres, liens) sur le fond et sur sa surface, et comme fond de bouton.
  const surface = mix(bg, t, surfaceT);
  let acc = buttonSafe(accent);
  if (contrast(acc, bg) < 4.6 || contrast(acc, surface) < 4.6) acc = buttonSafe(ensureContrast(ensureContrast(acc, bg, 4.6), surface, 4.6));
  return { background: bg, surface, text: t, muted: readable(readable(mix(t, bg, 0.4), surface, 5), bg, 4.6), accent: acc, accent_text: onColor(acc), border: mix(bg, t, 0.14) };
}

/** Quatre schémas : 1 principal, 2 surface, 3 inversé, 4 bande d'accent. */
export function colorSchemesV2(a: ArtDirection): Record<string, { settings: Scheme }> {
  const p = a.palette;
  const base1 = scheme(p.bg, p.text, p.accent);
  // Surface du langage (cartes, encarts) : le texte secondaire reste lisible dessus aussi.
  const s1 = { ...base1, surface: p.surface, muted: readable(base1.muted, p.surface, 5) };
  const s2 = scheme(p.surface, p.text, p.accent, 0.06);
  const invAccent = contrast(p.accent, p.inverseBg) >= 3 ? p.accent : withLightness(p.accent, hsl(p.inverseBg)[2] > 0.5 ? 0.38 : 0.72, 1.05);
  const s3 = scheme(p.inverseBg, p.inverseText, invAccent, 0.07);
  // Bande d'accent : fond assez marqué pour que le texte posé dessus reste lisible (4,5:1 au moins).
  const band = buttonSafe(p.accent);
  const s4 = scheme(band, onColor(band), onColor(band), 0.08);
  return { "scheme-1": { settings: s1 }, "scheme-2": { settings: s2 }, "scheme-3": { settings: s3 }, "scheme-4": { settings: s4 } };
}

export type DesignTokens = Record<string, unknown>;

/** Réglages globaux du thème produits par le design system. */
export function designSettings(a: ArtDirection): DesignTokens {
  return {
    color_schemes: colorSchemesV2(a),
    type_heading_font: a.typography.heading,
    type_body_font: a.typography.body,
    heading_scale: 100,
    body_scale: 100,
    heading_case: a.typography.headingCase,
    heading_tracking: 0,
    heading_weight_boost: 0,
    page_width: a.pageWidth,
    spacing_scale: a.density === "airy" ? 110 : a.density === "compact" ? 90 : 100,
    style_preset: a.preset,
    header_shape: "bar",
    button_radius: a.shapes.buttonRadius,
    card_radius: a.shapes.cardRadius,
    button_style: "solid",
    button_uppercase: false,
    button_shine: false,
    glow_enabled: false,
    card_style: "minimal",
    motion_enabled: true,
    motion_intensity: a.motion,
    motion_parallax: a.motion !== "subtle",
    ds_language: a.language,
    ds_ratio: Math.round(a.typography.ratio * 100 / 2) * 2,
    ds_density: a.density,
  };
}
