/**
 * LA BOÎTE DES DEMANDES, COMPLÉTÉE (22 novembre 2026, recherche 08, points 4 et 5). Les demandes elles-mêmes sont celles
 * que le site reçoit déjà (`sites/requests.ts`) ; ce module ajoute, PAR LE CODE et sans aucun appel à l'IA :
 *  - le tri en quatre cases (devis, rendez-vous, question, urgence), chacune avec sa raison en une ligne ; une demande que
 *    le code ne sait pas classer va dans « à regarder », jamais dans une case au hasard (4.4) ;
 *  - le résumé à cinq champs (qui, quoi, où, quand, coordonnées), un champ vide écrit « non donné » ;
 *  - les liens pour envoyer la réponse prête d'un geste (4.3) : SMS écrit selon le téléphone (`&body=` sur iPhone,
 *    `?body=` sur Android), WhatsApp (`wa.me`, numéro international sans « + »), e-mail ; sur ordinateur, seulement
 *    « copier », WhatsApp et e-mail (le lien SMS n'y fait rien). Rien ne part sans l'appui du client.
 * Pas encore vérifié sur de vrais téléphones de 2026 (essai gratuit à faire par le propriétaire sur un iPhone et un
 * Android) : le texte prérempli d'un SMS n'est pas garanti par Apple. ÉTEINT tant que le propriétaire n'a pas dit oui
 * (réglage `suivi.envoiGeste`).
 */
import { L } from "../i18n-server";

export type Case = "devis" | "rendez-vous" | "question" | "urgence" | "a-regarder";
export type Tri = { case: Case; raison: string };

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const URGENCE = /\b(urgent|urgence|fuite|inond|degat des eaux|plus d'eau|plus de courant|panne|bloque dehors|enferme|odeur de gaz|au plus vite|tout de suite|aujourd'hui meme|ce soir)\b/;
const DEVIS = /\b(devis|estimation|chiffrage|chiffrer|combien (?:ca|cela) (?:couterait|coute)|tarif pour|prix pour)\b/;
const RDV = /\b(rendez-vous|rdv|reserver|reservation|disponibilit|creneau|passer (?:vous )?voir|prendre (?:un )?rendez)\b/;
const QUESTION = /\?|\b(est-ce que|pouvez-vous|savez-vous|avez-vous|quels? sont|quand|ou se trouve|comment)\b/;

/** Le tri d'une demande, avec la raison (le mot trouvé) ; l'urgence passe avant tout. */
export function trierDemande(fields: Record<string, string>, kind?: "contact" | "devis"): Tri {
  const texte = norm(Object.entries(fields).filter(([k]) => !/^(email|phone|telephone|tel|name|nom|prenom)$/i.test(k)).map(([, v]) => v).join(" "));
  const u = texte.match(URGENCE);
  if (u) return { case: "urgence", raison: L(`le message dit « ${u[0]} »`, `the message says "${u[0]}"`) };
  const d = texte.match(DEVIS);
  if (d) return { case: "devis", raison: L(`le message demande « ${d[0]} »`, `the message asks for "${d[0]}"`) };
  if (kind === "devis") return { case: "devis", raison: L("envoyée par le formulaire de devis", "sent through the quote form") };
  const r = texte.match(RDV);
  if (r) return { case: "rendez-vous", raison: L(`le message parle de « ${r[0]} »`, `the message mentions "${r[0]}"`) };
  const q = texte.match(QUESTION);
  if (q) return { case: "question", raison: L("le message pose une question", "the message asks a question") };
  return { case: "a-regarder", raison: L("je ne sais pas la classer : à regarder", "I can't sort it: to look at") };
}

export type Resume = { qui: string; quoi: string; ou: string; quand: string; coordonnees: string };
const pick = (f: Record<string, string>, re: RegExp) => Object.entries(f).filter(([k, v]) => re.test(k) && v.trim()).map(([, v]) => v.trim());

/** Le résumé à cinq champs, lu dans les champs du formulaire ; rien de deviné : un champ absent est « non donné ». */
export function resumerDemande(fields: Record<string, string>): Resume {
  const nd = L("non donné", "not given");
  const quoi = pick(fields, /^(body|message|demande|projet|details?|besoin)$/i).join(" ").replace(/\s+/g, " ");
  return {
    qui: pick(fields, /^(name|nom|prenom|first_?name|last_?name)$/i).join(" ") || nd,
    quoi: quoi ? (quoi.length > 220 ? `${quoi.slice(0, 217)}…` : quoi) : nd,
    ou: pick(fields, /^(adresse|address|ville|city|code_?postal|zip|lieu|commune)$/i).join(", ") || nd,
    quand: pick(fields, /^(date|quand|delai|when|creneau|jour)$/i).join(", ") || nd,
    coordonnees: [...pick(fields, /^email$/i), ...pick(fields, /^(phone|telephone|tel|portable|mobile)$/i)].join(" · ") || nd,
  };
}

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

/** Les liens d'un geste pour une réponse prête. Le texte est encodé ; rien ne part sans que le client appuie. */
export function liensEnvoi(texte: string, a: { telephone?: string | null; email?: string | null; sujet?: string; appareil: Appareil }): Liens {
  const t = texte.trim(), enc = encodeURIComponent(t);
  const num = a.telephone ? numeroInternational(a.telephone) : null;
  const sms = a.appareil === "ordinateur" || !a.telephone ? null
    : a.appareil === "iphone" ? `sms:${a.telephone.replace(/[^\d+]/g, "")}&body=${enc}` : `sms:${a.telephone.replace(/[^\d+]/g, "")}?body=${enc}`;
  const email = a.email && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(a.email) ? `mailto:${a.email}?subject=${encodeURIComponent(a.sujet ?? L("Votre demande", "Your request"))}&body=${enc}` : null;
  return { copier: t, sms, whatsapp: num ? `https://wa.me/${num}?text=${enc}` : null, email, trop_long: t.length > LONGUEUR_MAX_REPONSE };
}
