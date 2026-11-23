/**
 * Le marqueur dans les liens des publicités (décision du 22 novembre 2026) : le Studio ajoute lui-même les paramètres de
 * suivi (utm_source, utm_medium, utm_campaign, utm_content) au lien de chaque publicité, pour que les visites et les
 * demandes venues d'une publicité se comptent sur le site du client, sans aucun branchement à Meta ni aux autres régies.
 * Module pur (utilisé par le serveur et par l'écran des campagnes). Le Studio n'engage jamais aucune dépense de diffusion.
 */

/** Mot simple pour un lien : minuscules, sans accents, tirets, 60 caractères au plus. */
export function motDeLien(s: string): string {
  return String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/&/g, " et ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60).replace(/-+$/, "");
}

/** La source et le moyen d'une publicité selon son réseau (formats du Studio ou réseaux des campagnes). */
export function sourceDuReseau(reseau: string): { source: string; medium: string } {
  const r = String(reseau ?? "").toLowerCase();
  if (r.startsWith("meta")) return { source: "meta", medium: "paid_social" };
  if (r === "google_display") return { source: "google", medium: "display" };
  if (r === "youtube") return { source: "youtube", medium: "paid_video" };
  return { source: motDeLien(r) || "publicite", medium: "paid_social" };
}

/**
 * Le lien de la publicité avec son marqueur. Les paramètres déjà présents restent ; un marqueur déjà posé n'est jamais
 * écrasé. Adresse invalide ou sans « http(s) » : null (rien n'est inventé).
 */
export function lienAvecMarqueur(url: string | null | undefined, o: { reseau: string; campagne: string; contenu?: string | null }): string | null {
  if (!url?.trim()) return null;
  let u: URL;
  try { u = new URL(url.trim()); } catch { return null; }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  const { source, medium } = sourceDuReseau(o.reseau);
  const set = (k: string, v: string) => { if (v && !u.searchParams.has(k)) u.searchParams.set(k, v); };
  set("utm_source", source);
  set("utm_medium", medium);
  set("utm_campaign", motDeLien(o.campagne) || "publicites");
  set("utm_content", motDeLien(o.contenu ?? ""));
  return u.toString();
}
