/**
 * LA FICHE GOOGLE TENUE À LA MAIN, GUIDÉE PAR SINA (22 novembre 2026, recherche 08, point 7 ; engagements 4 et 12).
 * Le branchement de la fiche par programme demande l'accord de Google : il est mis de côté (règle du propriétaire du
 * 15 novembre 2026). Tout se fait par le client, guidé geste par geste, sans aucun branchement :
 *  - le guide, chemin exact par geste, d'après les pages d'aide officielles de Google (lues le 22 novembre 2026) ;
 *  - le paquet du mois : quatre publications de fiche, une par semaine, reprises des publications déjà acceptées du
 *    calendrier, sans numéro de téléphone dans le texte (Google peut refuser la publication) et sans mot-dièse ;
 *  - une réponse propre à CHAQUE avis collé ou transféré : prénom de l'auteur, un détail de son avis, signature du
 *    client, aucune offre ni promotion (Google le déconseille), jamais trop proche d'une réponse déjà donnée (les
 *    réponses toutes faites rebutent la moitié des clients, BrightLocal 2026). Relue par le code avant d'être montrée.
 * ÉTEINT tant que le propriétaire n'a pas dit oui (réglage `suivi.ficheGoogle`). Une réponse à un avis coûte un appel
 * (estimé à moins d'un centime avec le modèle le plus fort, effort faible ; non mesuré).
 */
import { z } from "zod";
import { all, id, now, run } from "../db";
import { L } from "../i18n-server";
import { TEXT_MODEL_BY_TIER } from "../orchestrator/policy";
import { aLaChargeDuStudio } from "../billing";

export type Geste = { cle: string; titre: string; chemin: string[]; prepare: string; source: string };

/** Le guide, geste par geste (pages officielles de Google, en anglais : le client voit les mots de son écran). */
export const guideFicheGoogle = (): Geste[] => [
  { cle: "avis", titre: L("Répondre à un avis", "Reply to a review"), chemin: [L("Ouvre ta fiche", "Open your profile"), "« Read reviews »", L("« Reply » à côté de l'avis", "“Reply” next to the review"), L("colle la réponse", "paste the reply"), "« Reply »"], prepare: L("La réponse, propre à cet avis.", "The reply, specific to this review."), source: "https://support.google.com/business/answer/3474050?hl=en" },
  { cle: "publier", titre: L("Publier sur ta fiche", "Post on your profile"), chemin: [L("Ouvre ta fiche", "Open your profile"), "« Posts »", "« Add post »", L("choisis « Update », « Offer » ou « Event »", "choose Update, Offer or Event"), L("colle le texte et l'image", "paste the text and image"), "« Post »"], prepare: L("Le texte, l'image et le bouton.", "The text, image and button."), source: "https://support.google.com/business/answer/7342169?hl=en" },
  { cle: "programmer", titre: L("Programmer le mois en une fois", "Schedule the month at once"), chemin: [L("même chemin que « Publier »", "same path as Post"), L("« Schedule this post » : date et heure", "“Schedule this post”: date and time")], prepare: L("Le paquet du mois : quatre publications avec leur date.", "The month's pack: four posts with their dates."), source: "https://support.google.com/business/answer/7342169?hl=en" },
  { cle: "alertes", titre: L("Être prévenu des nouveaux avis", "Get notified of new reviews"), chemin: [L("Ouvre ta fiche", "Open your profile"), "« More »", "« Notifications »", L("allume « Customer activity »", "turn on Customer activity")], prepare: L("Transfère-moi l'e-mail de Google : je prépare la réponse.", "Forward me Google's e-mail: I'll prepare the reply."), source: "https://support.google.com/business/answer/7198436?hl=en" },
  { cle: "lien-avis", titre: L("Le lien pour demander un avis", "The link to ask for a review"), chemin: [L("Ouvre ta fiche", "Open your profile"), "« Read reviews »", "« Get more reviews »", L("copie le lien et colle-le-moi", "copy the link and paste it to me")], prepare: L("Le message de demande d'avis, et le code à scanner.", "The review request message, and the QR code."), source: "https://support.google.com/business/answer/16816815?hl=en" },
];

const TEL = /(?:\+|00)?\d[\d .\-]{7,}\d/;
const FORMULES = /\b(n'h[ée]sitez pas|au plaisir de vous revoir|nous sommes ravis que|votre satisfaction est notre priorit[ée]|merci pour votre confiance)\b/i;

/** Une publication de fiche : sans téléphone, sans mot-dièse, 1 500 caractères au plus. Rend les défauts. */
export function defautsPublicationFiche(texte: string): string[] {
  const d: string[] = [];
  if (TEL.test(texte)) d.push(L("un numéro de téléphone dans le texte (Google peut refuser la publication)", "a phone number in the text"));
  if (/#\w/.test(texte)) d.push(L("des mots-dièse (inutiles sur une fiche Google)", "hashtags"));
  if (texte.length > 1500) d.push(L("plus de 1 500 caractères", "over 1,500 characters"));
  if (!texte.trim()) d.push(L("texte vide", "empty text"));
  return d;
}

/** Nettoie un texte de publication pour la fiche : mots-dièse et numéros retirés, longueur tenue. */
export const pourLaFiche = (texte: string) => texte.replace(/(^|\s)#[\p{L}\d_]+/gu, "").replace(new RegExp(TEL.source, "g"), "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").replace(/[ \t]{2,}/g, " ").trim().slice(0, 1500);

export type PublicationFiche = { date: string; texte: string; image: string | null; type: "Update" };

/**
 * Le paquet du mois : quatre publications (le premier jour ouvré de chaque semaine), reprises des publications du mois
 * déjà acceptées dans le calendrier, nettoyées pour la fiche. Sans publication acceptée : rien (jamais un texte inventé).
 */
export function paquetDuMois(publications: { ymd: string; copyText: string; image?: string | null }[], month: string): PublicationFiche[] {
  const lundis: string[] = [];
  const [y, m] = month.split("-").map(Number);
  for (let d = 1; d <= 31; d++) {
    const t = new Date(Date.UTC(y, m - 1, d));
    if (t.getUTCMonth() !== m - 1) break;
    if (t.getUTCDay() === 1) lundis.push(t.toISOString().slice(0, 10));
  }
  const dispo = publications.filter((p) => p.ymd.startsWith(month) && p.copyText.trim()).sort((a, b) => a.ymd.localeCompare(b.ymd));
  const prises = new Set<number>();
  const out: PublicationFiche[] = [];
  for (const date of lundis.slice(0, 4)) {
    let i = dispo.findIndex((p, k) => !prises.has(k) && p.ymd >= date);
    if (i < 0) i = dispo.findIndex((_p, k) => !prises.has(k));
    if (i < 0) break;
    prises.add(i);
    out.push({ date, texte: pourLaFiche(dispo[i].copyText), image: dispo[i].image ?? null, type: "Update" });
  }
  return out;
}

/* ---------- Les réponses aux avis ---------- */

const mots = (s: string) => new Set(s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").match(/[a-z]{4,}/g) ?? []);
/** Ressemblance de deux réponses (part des mots en commun) ; 0,6 ou plus : trop proche, réponse refusée. */
export function ressemblance(a: string, b: string): number {
  const A = mots(a), B = mots(b);
  if (!A.size || !B.size) return 0;
  let n = 0; for (const w of A) if (B.has(w)) n++;
  return n / Math.min(A.size, B.size);
}
export const OFFRE = /\b(remise|r[ée]duction|promo\w*|code promo|offert\w*|cadeau\w*|gratuit\w*)\b|-\s?\d+\s?%|\d+\s?%\s?(?:de\s)?(?:remise|r[ée]duction)/i;

export type Avis = { auteur: string; texte: string; note?: number | null };

/** Les défauts d'une réponse à un avis, relevés par le code. */
export function defautsReponse(rep: string, avis: Avis, signature: string, precedentes: string[]): string[] {
  const d: string[] = [];
  const prenom = avis.auteur.trim().split(/\s+/)[0];
  if (prenom && !rep.toLowerCase().includes(prenom.toLowerCase())) d.push(L("le prénom de l'auteur manque", "the reviewer's first name is missing"));
  if (signature && !rep.trim().toLowerCase().endsWith(signature.trim().toLowerCase())) d.push(L("la signature manque à la fin", "the sign-off is missing"));
  if (OFFRE.test(rep)) d.push(L("une offre ou une promotion (Google le déconseille, et jamais rien en échange d'un avis)", "an offer or promotion"));
  if (FORMULES.test(rep)) d.push(L("une formule toute faite", "a stock phrase"));
  if (TEL.test(rep) || /@/.test(rep)) d.push(L("une coordonnée privée dans la réponse publique", "private contact details in a public reply"));
  const detail = [...mots(avis.texte)].filter((w) => w.length >= 5);
  if (detail.length && !detail.some((w) => mots(rep).has(w))) d.push(L("aucun détail repris de l'avis", "no detail taken from the review"));
  if (precedentes.some((p) => ressemblance(p, rep) >= 0.6)) d.push(L("trop proche d'une réponse déjà donnée", "too close to a previous reply"));
  return d;
}

export const ReponseAvisSchema = z.object({ reponse: z.string().min(20).max(1200) });
export const REPONSE_AVIS_SYSTEM = `Tu écris, pour un professionnel, la réponse publique à UN avis Google, dans sa voix, en français simple. Tu t'adresses à l'auteur par son prénom et tu reprends un détail précis de son avis. Avis positif : un merci sincère et précis, sans formule toute faite. Avis négatif : tu reconnais ce qui est vrai, tu ne promets rien, tu proposes d'en parler directement (sans donner de numéro ni d'adresse e-mail), jamais de détail privé. Jamais d'offre, de remise, de cadeau ni de promotion. Tu termines par la signature donnée, telle quelle. Réponse : uniquement le JSON demandé.`;

/** Remplaçable par les essais (aucun appel réel). */
export const ficheGoogleDeps: { ecrire?: (system: string, prompt: string, usageKey: string) => Promise<unknown> } = {};

function ensure() { run("CREATE TABLE IF NOT EXISTS fiche_google_reponses (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, auteur TEXT NOT NULL, avis TEXT NOT NULL, reponse TEXT NOT NULL, created_at INTEGER NOT NULL)"); }
export const reponsesDonnees = (projectId: string) => (ensure(), all<{ reponse: string }>("SELECT reponse FROM fiche_google_reponses WHERE project_id=? ORDER BY created_at DESC LIMIT 50", projectId).map((r) => r.reponse));

/** La réponse à un avis : un appel, puis la relecture par le code ; une seule reprise avec les défauts, sinon refusée. */
export async function reponseAvis(p: { id: string; userId: string; name: string }, avis: Avis, signature: string): Promise<{ reponse: string; negatif: boolean }> {
  const precedentes = reponsesDonnees(p.id);
  const negatif = (avis.note ?? 5) <= 3;
  let defauts: string[] = [];
  for (let essai = 0; essai < 2; essai++) {
    const prompt = `PROFESSIONNEL : ${p.name}\nSIGNATURE : ${signature}\nAVIS DE ${avis.auteur}${avis.note ? ` (${avis.note} sur 5)` : ""} :\n${avis.texte}\n${precedentes.length ? `\nRÉPONSES DÉJÀ DONNÉES (ne pas les reprendre) :\n${precedentes.slice(0, 5).map((r) => `- ${r}`).join("\n")}\n` : ""}${defauts.length ? `\nÀ CORRIGER : ${defauts.join(" ; ")}\n` : ""}\nRéponds { "reponse": "…" }.`;
    const usageKey = `fiche-google:avis:${p.id}:${id()}`;
    // Une réponse réécrite après la relecture est une reprise du Studio : jamais débitée au client (règle du propriétaire).
    const ecrire = async () => ficheGoogleDeps.ecrire
      ? ficheGoogleDeps.ecrire(REPONSE_AVIS_SYSTEM, prompt, usageKey)
      : (await import("../ai/llm")).llmJson({ task: "copywriting", userId: p.userId, projectId: p.id, jobId: null, system: REPONSE_AVIS_SYSTEM, promptKey: "suivi-reponse-avis-1", prompt, maxTokens: 800, usageKey, routing: { difficulty: "standard", prefer: { provider: "anthropic", model: TEXT_MODEL_BY_TIER.strong, effort: "low" } } }, ReponseAvisSchema);
    const raw = await (essai > 0 ? aLaChargeDuStudio(ecrire) : ecrire());
    const rep = ReponseAvisSchema.parse(raw).reponse.trim();
    defauts = defautsReponse(rep, avis, signature, precedentes);
    if (!defauts.length) {
      ensure();
      run("INSERT INTO fiche_google_reponses(id,project_id,auteur,avis,reponse,created_at) VALUES(?,?,?,?,?,?)", id(), p.id, avis.auteur, avis.texte, rep, now());
      return { reponse: rep, negatif };
    }
  }
  throw new Error(L(`Réponse refusée par la relecture : ${defauts.join(" ; ")}.`, `Reply refused: ${defauts.join("; ")}.`));
}
