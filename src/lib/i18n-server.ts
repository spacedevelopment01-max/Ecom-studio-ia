/**
 * Langues côté serveur : chaque requête API et chaque tâche du worker s'exécute avec
 * - `ui` : la langue de l'interface de la personne (messages, erreurs, libellés de tâches) ;
 * - `content` : la langue des contenus créés (textes de boutique, images, vidéos, publications…).
 *
 * `L(fr, en)` choisit selon la langue de l'interface, `C(fr, en)` selon la langue des contenus.
 * Ces fonctions s'appellent au moment de l'exécution (jamais dans une constante de module).
 * Ce fichier ne doit pas être importé par un composant navigateur.
 */
import { AsyncLocalStorage } from "node:async_hooks";
import { CONTENT_LANG_HEADER, LANG_COOKIE, isLang, langFromAcceptLanguage, langFromCookieHeader, type Lang } from "./i18n";
import { getSetting, setSetting } from "./settings";

type Store = { ui: Lang; content: Lang; contentForced: boolean };
const als = new AsyncLocalStorage<Store>();

export function runWithLang<T>(s: { ui?: Lang; content?: Lang; contentForced?: boolean }, fn: () => T): T {
  const ui = s.ui ?? "fr";
  return als.run({ ui, content: s.content ?? ui, contentForced: !!s.contentForced }, fn);
}

export const uiLang = (): Lang => als.getStore()?.ui ?? "fr";
export const contentLang = (): Lang => als.getStore()?.content ?? "fr";
/** La langue des contenus a-t-elle été choisie pour cette action (et non héritée du projet) ? */
export const contentLangForced = () => !!als.getStore()?.contentForced;
export const hasLangContext = () => !!als.getStore();

/** Texte dans la langue de l'interface. */
export const L = <T,>(fr: T, en: T): T => (uiLang() === "en" ? en : fr);
/** Texte dans la langue des contenus créés. */
export const C = <T,>(fr: T, en: T): T => (contentLang() === "en" ? en : fr);

/** Applique la langue du projet aux contenus, sauf si l'action a demandé une autre langue. */
export function setProjectContentLang(lang: Lang | undefined) {
  const s = als.getStore();
  if (s && !s.contentForced && lang) s.content = lang;
}

/** Exécute `fn` en créant les contenus dans `lang`. */
export function withContentLang<T>(lang: Lang, fn: () => T): T {
  const s = als.getStore();
  return als.run({ ui: s?.ui ?? "fr", content: lang, contentForced: true }, fn);
}

/** Langues d'une requête : cookie de l'interface (ou Accept-Language), et langue des contenus imposée par l'en-tête. */
export function langFromRequest(req: Request): { ui: Lang; content?: Lang; contentForced: boolean } {
  const ui = langFromCookieHeader(req.headers.get("cookie")) ?? langFromAcceptLanguage(req.headers.get("accept-language"));
  const h = req.headers.get(CONTENT_LANG_HEADER);
  return isLang(h) ? { ui, content: h, contentForced: true } : { ui, contentForced: false };
}

/** Langue d'interface mémorisée pour un compte (utilisée par le worker et les e-mails). */
export function userLang(userId: string | null | undefined): Lang {
  const v = userId ? getSetting(`user.${userId}.lang`) : null;
  return isLang(v) ? v : "fr";
}

export function setUserLang(userId: string, lang: Lang) {
  setSetting(`user.${userId}.lang`, lang === "fr" ? null : lang);
}

/** Langue de l'interface dans un composant serveur ou une page (cookie, sinon Accept-Language). */
export async function serverLang(): Promise<Lang> {
  const { cookies, headers } = await import("next/headers");
  const c = (await cookies()).get(LANG_COOKIE)?.value;
  if (isLang(c)) return c;
  return langFromAcceptLanguage((await headers()).get("accept-language"));
}
