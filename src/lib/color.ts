/** Outils couleur : contraste WCAG, mélanges, palettes cohérentes. */

export type RGB = [number, number, number];

export function hexToRgb(hex: string): RGB {
  const h = hex.replace("#", "");
  const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.padEnd(6, "0").slice(0, 6);
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}

export function rgbToHex([r, g, b]: RGB): string {
  return "#" + [r, g, b].map((x) => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, "0")).join("").toUpperCase();
}

export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

export function mix(a: string, b: string, t: number): string {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return rgbToHex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]);
}

export function rgbToHsl([r, g, b]: RGB): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s, l];
}

export function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return rgbToHex([(r + m) * 255, (g + m) * 255, (b + m) * 255]);
}

export const hsl = (hex: string) => rgbToHsl(hexToRgb(hex));

export function withLightness(hex: string, l: number, satScale = 1): string {
  const [h, s] = hsl(hex);
  return hslToHex(h, Math.min(1, s * satScale), l);
}

/** Texte lisible (noir ou blanc teinté) sur un fond donné. */
export function onColor(bg: string, dark = "#141414", light = "#FFFFFF"): string {
  return contrast(bg, dark) >= contrast(bg, light) ? dark : light;
}

/** Ajuste une couleur de texte jusqu'au contraste minimal demandé. */
export function ensureContrast(fg: string, bg: string, ratio = 4.5): string {
  if (contrast(fg, bg) >= ratio) return fg;
  const target = luminance(bg) > 0.4 ? "#000000" : "#FFFFFF";
  for (let t = 0.1; t <= 1.0001; t += 0.1) {
    const c = mix(fg, target, t);
    if (contrast(c, bg) >= ratio) return c;
  }
  return target;
}

export const isDark = (hex: string) => luminance(hex) < 0.22;

const COLOR_WORDS = {
  fr: { white: "blanc", black: "noir", offWhite: "blanc cassé", lightGray: "gris clair", gray: "gris", charcoal: "anthracite", brown: "brun", pale: (b: string) => `${b} pâle`, deep: (b: string) => `${b} profond`,
    hues: ["rouge", "orange", "ambre", "jaune", "vert anis", "vert", "turquoise", "bleu", "violet", "magenta", "rose", "rouge"] },
  en: { white: "white", black: "black", offWhite: "off-white", lightGray: "light gray", gray: "gray", charcoal: "charcoal", brown: "brown", pale: (b: string) => `pale ${b}`, deep: (b: string) => `deep ${b}`,
    hues: ["red", "orange", "amber", "yellow", "lime green", "green", "turquoise", "blue", "purple", "magenta", "pink", "red"] },
};
const HUE_MAX = [15, 40, 55, 70, 100, 160, 195, 240, 275, 320, 345, 361];

/** Nom approximatif de la couleur (français par défaut, ou anglais), pour les textes et l'accessibilité. */
export function colorName(hex: string, lang: "fr" | "en" = "fr"): string {
  const w = COLOR_WORDS[lang === "en" ? "en" : "fr"];
  const [h, s, l] = hsl(hex);
  if (l > 0.92) return w.white;
  if (l < 0.1) return w.black;
  if (s < 0.18 || (s < 0.3 && l > 0.8)) return l > 0.8 ? w.offWhite : l > 0.6 ? w.lightGray : l > 0.35 ? w.gray : w.charcoal;
  const idx = HUE_MAX.findIndex((max) => h < max);
  let base = w.hues[idx < 0 ? 0 : idx];
  if (idx === 1 && l < 0.45 && s < 0.6) base = w.brown;
  if (l > 0.75) return w.pale(base);
  if (l < 0.3) return w.deep(base);
  return base;
}
