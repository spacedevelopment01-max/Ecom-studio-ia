/**
 * Langues du studio (interface et contenus créés). Fichier utilisable côté navigateur et serveur.
 * Deux langues distinctes :
 * - la langue de l'interface (choix du visiteur, cookie « ecs-lang ») ;
 * - la langue des contenus d'un projet (réglage du projet, remplaçable action par action).
 */
export type Lang = "fr" | "en";

export const LANGS: { id: Lang; label: string; short: string; flag: string }[] = [
  { id: "fr", label: "Français", short: "FR", flag: "🇫🇷" },
  { id: "en", label: "English", short: "EN", flag: "🇬🇧" },
];

export const LANG_COOKIE = "ecs-lang";
/** En-tête envoyé par le studio pour créer un contenu dans une autre langue que celle du projet. */
export const CONTENT_LANG_HEADER = "x-content-lang";

export const isLang = (v: unknown): v is Lang => v === "fr" || v === "en";

/** Choisit la version de la langue demandée. */
export const pick = <T,>(lang: Lang, fr: T, en: T): T => (lang === "en" ? en : fr);

/** Locale Intl / date-fns correspondante. */
export const intlLocale = (lang: Lang) => (lang === "en" ? "en-GB" : "fr-FR");

/** Langue préférée d'après l'en-tête Accept-Language : français si demandé en premier, anglais sinon. */
export function langFromAcceptLanguage(h: string | null | undefined): Lang {
  if (!h) return "fr";
  const first = h.split(",")[0]?.trim().toLowerCase() ?? "";
  if (first.startsWith("fr")) return "fr";
  if (first.startsWith("en")) return "en";
  return /\bfr\b/.test(h.toLowerCase()) ? "fr" : "en";
}

/** Lit la langue dans une chaîne de cookies (« a=1; ecs-lang=en »). */
export function langFromCookieHeader(cookie: string | null | undefined): Lang | null {
  const m = /(?:^|;\s*)ecs-lang=(fr|en)\b/.exec(cookie ?? "");
  return m ? (m[1] as Lang) : null;
}
