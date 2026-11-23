/**
 * Les liens pour envoyer une réponse d'un geste, sans dépendance au serveur (servent aussi dans l'écran des demandes).
 * Rien ne part sans l'appui du client : un lien ouvre son application d'e-mail, de SMS ou WhatsApp, texte prérempli.
 * Le SMS est écrit selon le téléphone (`&body=` sur iPhone, `?body=` sur Android) ; sur ordinateur, pas de SMS.
 */
export type Appareil = "iphone" | "android" | "ordinateur";

/** L'appareil du client, lu dans l'en-tête de son navigateur (seulement pour écrire le bon lien SMS). */
export function appareilDe(userAgent: string | null | undefined): Appareil {
  const ua = String(userAgent ?? "");
  if (/iPhone|iPad|iPod/i.test(ua)) return "iphone";
  if (/Android/i.test(ua)) return "android";
  return "ordinateur";
}

/** Un numéro français ou international, écrit pour WhatsApp : chiffres seulement, indicatif sans « + » ni 0 de tête. */
export function numeroInternational(tel: string): string | null {
  let d = tel.replace(/[^\d+]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  else if (d.startsWith("00")) d = d.slice(2);
  else if (/^0[1-9]\d{8}$/.test(d)) d = `33${d.slice(1)}`;
  return /^[1-9]\d{7,14}$/.test(d) ? d : null;
}

/** Une réponse prête tient en quelques lignes, pour passer dans un lien (un texte trop long peut être coupé). */
export const LONGUEUR_MAX_REPONSE = 600;

export type Liens = { copier: string; sms: string | null; whatsapp: string | null; email: string | null; trop_long: boolean };

/** Une adresse e-mail plausible (pour ne pas ouvrir un lien vers une adresse vide ou mal écrite). */
export const emailValide = (e: string | null | undefined): e is string => !!e && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);

/** Le lien e-mail seul : l'adresse du visiteur, un sujet et le texte prérempli. */
export const lienEmail = (email: string | null | undefined, sujet: string, texte: string): string | null =>
  emailValide(email) ? `mailto:${email}?subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(texte.trim())}` : null;

/** Tous les liens d'un geste pour une réponse prête. */
export function liensEnvoiBruts(texte: string, a: { telephone?: string | null; email?: string | null; sujet: string; appareil: Appareil }): Liens {
  const t = texte.trim(), enc = encodeURIComponent(t);
  const num = a.telephone ? numeroInternational(a.telephone) : null;
  const sms = a.appareil === "ordinateur" || !a.telephone ? null
    : a.appareil === "iphone" ? `sms:${a.telephone.replace(/[^\d+]/g, "")}&body=${enc}` : `sms:${a.telephone.replace(/[^\d+]/g, "")}?body=${enc}`;
  return { copier: t, sms, whatsapp: num ? `https://wa.me/${num}?text=${enc}` : null, email: lienEmail(a.email, a.sujet, t), trop_long: t.length > LONGUEUR_MAX_REPONSE };
}
