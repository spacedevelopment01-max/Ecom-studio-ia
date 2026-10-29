/**
 * Politiques d'un site publié par le studio (#232) : mentions légales, confidentialité, conditions. Les textes générés
 * renvoient aujourd'hui à Shopify (« À compléter dans Shopify ») ; un site hébergé par le studio doit pouvoir les rédiger
 * ici. Texte simple (paragraphes), échappé ; enregistré comme une nouvelle version restaurable du site.
 */
import { HttpError } from "../auth";
import { L } from "../i18n-server";
import { currentTheme, saveThemeVersion } from "../projects";
import type { ThemeSpec } from "../theme/spec";

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
/** HTML → texte lisible pour l'édition (paragraphes séparés par une ligne vide). */
export const policyText = (html: string) => html.replace(/<\/(p|h[1-6]|li)>/gi, "\n\n").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/\n{3,}/g, "\n\n").trim();
/** Texte → HTML échappé : une ligne vide sépare deux paragraphes, un retour à la ligne devient <br>. */
export const policyHtml = (text: string) => text.trim().split(/\n\s*\n/).map((p) => `<p>${escape(p.trim()).replace(/\n/g, "<br>")}</p>`).join("\n");

export function sitePolicies(projectId: string) {
  const cur = currentTheme(projectId);
  return ((cur?.spec as ThemeSpec | undefined)?.store.policies ?? []).map((p) => ({ handle: p.handle, title: p.title, text: policyText(p.body_html) }));
}

export function updatePolicy(projectId: string, handle: string, title: string, text: string) {
  const cur = currentTheme(projectId);
  if (!cur) throw new HttpError(409, L("Créez d'abord le site.", "Create the site first."));
  const spec = structuredClone(cur.spec) as ThemeSpec;
  const policy = spec.store.policies.find((p) => p.handle === handle);
  if (!policy) throw new HttpError(404, L("Page légale introuvable.", "Legal page not found."));
  if (!text.trim()) throw new HttpError(400, L("Le texte ne peut pas être vide.", "The text can't be empty."));
  policy.title = title.trim() || policy.title;
  policy.body_html = policyHtml(text);
  return saveThemeVersion(projectId, spec, L(`Page légale « ${policy.title} » rédigée`, `Legal page “${policy.title}” written`), "user", undefined, cur.version.id);
}
