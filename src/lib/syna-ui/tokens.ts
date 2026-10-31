/**
 * SYNA — jetons visuels des deux présentations du Studio (mission #282, lot 0).
 *
 * Source unique des couleurs : `src/components/syna/syna.css` reprend exactement ces valeurs (vérifié par
 * `tests/syna-lot0-tokens.test.ts`), et chaque couple texte / fond est contrôlé au niveau AA (4,5:1 pour le texte,
 * 3:1 pour les contours de champs et l'anneau de focus).
 *
 * Ces jetons ne servent qu'à l'interface de travail du Studio, à l'intérieur d'un conteneur `.syna-ui`.
 * Ils ne touchent ni le site du client, ni son thème, ni ses exports, ni les variables globales du Studio.
 */

export const SYNA_MODES = ["encre", "plein"] as const;
export type SynaMode = (typeof SYNA_MODES)[number];

export const SYNA_SCHEMES = ["light", "dark"] as const;
export type SynaScheme = (typeof SYNA_SCHEMES)[number];

export const SYNA_ACCENTS = ["encre", "cobalt", "prusse"] as const;
export type SynaAccent = (typeof SYNA_ACCENTS)[number];

/** Couleurs de surface et de texte d'une présentation dans un schéma (clair ou sombre). */
export type SynaPalette = {
  paper: string; // fond de page
  sheet: string; // surface des cartes et de la conversation
  wash: string; // fond de l'espace de travail
  ink: string; // texte principal
  ink2: string; // texte secondaire
  muted: string; // texte discret (toujours ≥ 4,5:1)
  rule: string; // filet décoratif
  ruleStrong: string; // filet appuyé (séparations)
  control: string; // contour des champs et commandes (≥ 3:1)
  ok: string; okSoft: string;
  warn: string; warnSoft: string;
  bad: string; badSoft: string;
  na: string; naSoft: string;
};

/** Bleu signature : couleur, version appuyée, fond doux, et texte posé sur le bleu. */
export type SynaAccentSet = { accent: string; accentStrong: string; accentSoft: string; accentInk: string };

export const SYNA_PALETTES: Record<SynaMode, Record<SynaScheme, SynaPalette>> = {
  encre: {
    light: {
      paper: "#F4F5F7", sheet: "#FFFFFF", wash: "#EEF1F7", ink: "#0E1526", ink2: "#394158", muted: "#5F6780",
      rule: "#DCE0E8", ruleStrong: "#C9CFDB", control: "#7E869C",
      ok: "#1D6B4A", okSoft: "#E2F1E9", warn: "#8A5600", warnSoft: "#F8EDD7", bad: "#A3271D", badSoft: "#F9E3E0", na: "#545B70", naSoft: "#ECEEF2",
    },
    dark: {
      paper: "#0B0F19", sheet: "#111726", wash: "#0E1320", ink: "#E9ECF3", ink2: "#C1C7D6", muted: "#959DB2",
      rule: "#222A3B", ruleStrong: "#2D3649", control: "#5D6680",
      ok: "#67CF9C", okSoft: "#12271E", warn: "#E9B45A", warnSoft: "#2B2211", bad: "#FF8A7E", badSoft: "#2F1715", na: "#A3AABC", naSoft: "#1A2030",
    },
  },
  plein: {
    light: {
      paper: "#F2F3F5", sheet: "#FFFFFF", wash: "#ECEEF2", ink: "#101114", ink2: "#464A55", muted: "#646975",
      rule: "#E3E5EA", ruleStrong: "#D3D6DD", control: "#80858F",
      ok: "#1D6B4A", okSoft: "#E2F1E9", warn: "#8A5600", warnSoft: "#F8EDD7", bad: "#A3271D", badSoft: "#F9E3E0", na: "#555A66", naSoft: "#ECEEF2",
    },
    dark: {
      paper: "#0E0F12", sheet: "#17191E", wash: "#121418", ink: "#EEF0F4", ink2: "#C3C7D0", muted: "#979CA7",
      rule: "#262932", ruleStrong: "#313541", control: "#686D7A",
      ok: "#67CF9C", okSoft: "#12271E", warn: "#E9B45A", warnSoft: "#2B2211", bad: "#FF8A7E", badSoft: "#2F1715", na: "#A3A8B3", naSoft: "#1C1F26",
    },
  },
};

/** Les trois bleus proposés (aucune couleur libre : chacun est contrôlé sur clair et sombre). */
export const SYNA_ACCENT_SETS: Record<SynaAccent, Record<SynaScheme, SynaAccentSet>> = {
  encre: {
    light: { accent: "#1F3C99", accentStrong: "#172E78", accentSoft: "#E7ECF8", accentInk: "#FFFFFF" },
    dark: { accent: "#8EA6FF", accentStrong: "#B4C4FF", accentSoft: "#18213C", accentInk: "#0B1020" },
  },
  cobalt: {
    light: { accent: "#2443D6", accentStrong: "#1A33A8", accentSoft: "#E8ECFC", accentInk: "#FFFFFF" },
    dark: { accent: "#7C93FF", accentStrong: "#A3B3FF", accentSoft: "#1A2148", accentInk: "#0B1020" },
  },
  prusse: {
    light: { accent: "#1E4E8C", accentStrong: "#163B6B", accentSoft: "#E4EDF7", accentInk: "#FFFFFF" },
    dark: { accent: "#7DB2EA", accentStrong: "#A8CCF2", accentSoft: "#14243A", accentInk: "#0B1020" },
  },
};

/** Bleu par défaut de chaque présentation : bleu d'encre pour Encre, cobalt pour Plein cadre. */
export const SYNA_DEFAULT_ACCENT: Record<SynaMode, SynaAccent> = { encre: "encre", plein: "cobalt" };

/** Typographies (polices sous licence SIL OFL 1.1, servies depuis `public/syna/fonts/` et `/fonts/bricolage.woff2`). */
export const SYNA_FONTS: Record<SynaMode, { voice: string; ui: string; display: string; mono: string }> = {
  encre: { voice: "Syna Newsreader", ui: "Syna Geist", display: "Syna Newsreader", mono: "Syna Geist Mono" },
  plein: { voice: "Syna Onest", ui: "Syna Onest", display: "Syna Bricolage", mono: "Syna Geist Mono" },
};

// ——— Contraste (WCAG 2.x) ———

function channel(v: number): number {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Luminance relative d'une couleur « #RRGGBB ». */
export function luminance(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) throw new Error(`Couleur invalide : ${hex}`);
  const n = parseInt(m[1], 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

/** Rapport de contraste entre deux couleurs (1 à 21). */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export type ContrastCheck = { mode: SynaMode; scheme: SynaScheme; accent: SynaAccent; fg: string; bg: string; ratio: number; min: number };

/** Tous les couples texte / fond et contours / fond que les composants SYNA utilisent réellement. */
export function contrastChecks(): ContrastCheck[] {
  const out: ContrastCheck[] = [];
  for (const mode of SYNA_MODES) for (const scheme of SYNA_SCHEMES) for (const accent of SYNA_ACCENTS) {
    const p = SYNA_PALETTES[mode][scheme], a = SYNA_ACCENT_SETS[accent][scheme];
    const push = (fg: string, fgv: string, bg: string, bgv: string, min: number) => out.push({ mode, scheme, accent, fg, bg, ratio: contrastRatio(fgv, bgv), min });
    for (const fg of ["ink", "ink2", "muted"] as const) for (const bg of ["paper", "sheet", "wash"] as const) push(fg, p[fg], bg, p[bg], 4.5);
    for (const s of ["ok", "warn", "bad", "na"] as const) {
      push(s, p[s], `${s}Soft`, p[`${s}Soft`], 4.5);
      push(s, p[s], "sheet", p.sheet, 4.5);
    }
    for (const bg of ["paper", "sheet", "wash"] as const) {
      push("accent", a.accent, bg, p[bg], 4.5);
      push("control", p.control, bg, p[bg], 3);
    }
    push("accent", a.accent, "accentSoft", a.accentSoft, 4.5);
    push("accentInk", a.accentInk, "accent", a.accent, 4.5);
    push("ink", p.ink, "accentSoft", a.accentSoft, 4.5);
  }
  return out;
}
