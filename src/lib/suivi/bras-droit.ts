/**
 * LE BRAS DROIT QUI INFORME SANS CONSULTER (22 novembre 2026, recherche 08, point 11 ; engagement 17).
 *
 * La limite légale, écrite par le ministère de la Justice (réponse à la question n° 3177, JO du 8 avril 2025) : « Les
 * plateformes en ligne ne sont donc pas autorisées à délivrer des consultations juridiques ». Le critère retenu (avis
 * personnalisé qui applique le droit aux faits) vaut aussi pour les impôts ; la tenue des comptes est réservée à
 * l'expert-comptable. Et même les outils juridiques des grands éditeurs se trompent souvent sur leurs sources (Stanford,
 * 2025). Donc, PAR LE CODE :
 *  1. une question de droit, de comptabilité ou d'impôts est repérée ; SINA donne la règle générale et la page officielle
 *     qui la dit, jamais ce qu'il doit faire dans son cas ;
 *  2. seulement des sources officielles d'une liste fixe, OUVERTES par le Studio (lecture gratuite), avec la date que la
 *     page affiche ; une source non ouverte n'est jamais citée ; chaque phrase citée entre guillemets doit être sur la page ;
 *  3. quand il faut un professionnel (litige, contrat à signer, contrôle, déclaration, comptes), SINA dit lequel et prépare
 *     les questions à lui poser.
 * ALLUMÉ par défaut (décision du 22 novembre 2026 ; « 0 » dans le réglage `suivi.brasDroit` l'éteint), dans la
 * conversation de SINA : outil `droit.informer` (`syna-agent/tools/suivi.ts`), qui dit au client, mot pour mot : « Je
 * t'informe à partir des pages officielles (datées). Pour une décision qui t'engage, voici le professionnel à consulter
 * et les questions à lui poser. »
 */
import { L } from "../i18n-server";

export const SOURCES_OFFICIELLES = ["legifrance.gouv.fr", "service-public.gouv.fr", "entreprendre.service-public.gouv.fr", "impots.gouv.fr", "bofip.impots.gouv.fr", "urssaf.fr", "cnil.fr", "economie.gouv.fr", "eur-lex.europa.eu", "ec.europa.eu", "digital-strategy.ec.europa.eu"] as const;

export function sourceOfficielle(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    const h = u.hostname.toLowerCase().replace(/^www\./, "");
    return SOURCES_OFFICIELLES.some((d) => h === d || h.endsWith(`.${d}`));
  } catch { return false; }
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[’']/g, "'").replace(/\s+/g, " ").trim();

export type Domaine = "droit" | "comptabilite" | "impots";
const DOMAINES: [Domaine, RegExp][] = [
  ["impots", /\b(impots?|tva|fiscal\w*|urssaf|cotisations?|cfe|micro-?entrepreneur|declaration de revenus|taxe)\b/],
  ["comptabilite", /\b(comptab\w*|bilan|amortiss\w*|grand livre|expert-?comptable|tresorerie|liasse)\b/],
  ["droit", /\b(contrat|juridique|loi|legal\w*|litige|avocat|tribunal|mise en demeure|rgpd|cgv|conditions generales|garantie decennale|retractation|licenci\w*|bail|assurance)\b/],
];
/** Le domaine réglementé d'une question, s'il y en a un. */
export function domaineDe(question: string): Domaine | null {
  const q = norm(question);
  return DOMAINES.find(([, re]) => re.test(q))?.[0] ?? null;
}

export type Professionnel = { qui: string; pourquoi: string; questions: string[] };
/** Quand il faut un professionnel : lequel, et les questions prêtes à lui poser. */
export function professionnelPour(question: string): Professionnel | null {
  const q = norm(question);
  if (/\b(litige|tribunal|mise en demeure|impaye|plainte|proces|attaqu)\w*/.test(q)) return { qui: L("un avocat (ou la chambre des métiers, pour un premier avis gratuit)", "a lawyer"), pourquoi: L("un litige se règle avec quelqu'un qui peut appliquer la loi à ton cas", "a dispute needs someone who can apply the law to your case"), questions: [L("Quels sont mes droits dans cette situation, et quels documents dois-je garder ?", "What are my rights here?"), L("Quel est le délai pour agir ?", "What is the deadline to act?"), L("Combien coûterait la procédure, et existe-t-il une voie amiable ?", "What would it cost, and is there an amicable route?")] };
  if (/\b(contrat|bail|signer|clause|statuts)\b/.test(q)) return { qui: L("un avocat ou un notaire", "a lawyer or notary"), pourquoi: L("un contrat à signer engage : il doit être relu pour ton cas", "a contract binds you: it must be reviewed for your case"), questions: [L("Quelles clauses me sont défavorables ?", "Which clauses are unfavourable?"), L("Comment en sortir si ça ne va pas ?", "How can I exit if it goes wrong?"), L("Que se passe-t-il si l'autre partie ne respecte pas le contrat ?", "What if the other party breaches it?")] };
  if (/\b(controle fiscal|redressement|declaration|declarer|tva a payer|regime)\b/.test(q)) return { qui: L("un expert-comptable, ou ton centre des impôts", "an accountant or your tax office"), pourquoi: L("une déclaration ou un contrôle se traite avec tes chiffres à toi", "a return or audit is handled with your own figures"), questions: [L("Quel régime fiscal convient à mon activité et à mon chiffre d'affaires ?", "Which tax regime fits my business?"), L("Quelles dates de déclaration et de paiement dois-je noter ?", "Which filing and payment dates should I note?"), L("Quels justificatifs dois-je garder, et combien de temps ?", "Which records should I keep, and for how long?")] };
  if (/\b(comptab\w*|bilan|comptes|amortiss\w*|liasse)\b/.test(q)) return { qui: L("un expert-comptable", "an accountant"), pourquoi: L("la tenue des comptes lui est réservée par la loi", "bookkeeping is reserved to accountants by law"), questions: [L("Que dois-je vous transmettre chaque mois ?", "What should I send you each month?"), L("Combien coûte votre accompagnement pour une activité comme la mienne ?", "What does your support cost?"), L("Quelles erreurs dois-je éviter dans mes factures ?", "Which invoice mistakes should I avoid?")] };
  return null;
}

export type PageOuverte = { url: string; titre: string; texte: string; verifieLe: string | null };
/** Remplaçable par les essais (aucun appel réel). */
export const brasDroitDeps: { fetch?: typeof fetch } = {};

/** La date que la page officielle affiche (« Vérifié le 9 septembre 2022 », « Mise à jour le … »), sinon rien. */
export function dateAffichee(texte: string): string | null {
  const m = texte.match(/(V[ée]rifi[ée] le|Mise? à jour le|Modifi[ée] le|Publi[ée] le)\s+(\d{1,2}(?:er)?\s+[a-zéû]+\s+\d{4}|\d{2}\/\d{2}\/\d{4})/i);
  return m ? `${m[1]} ${m[2]}` : null;
}

/** Ouvre une page officielle (lecture gratuite) ; une adresse hors de la liste est refusée sans être ouverte. */
export async function ouvrirPage(url: string): Promise<PageOuverte> {
  if (!sourceOfficielle(url)) throw new Error(L("Seules les sources officielles de la liste sont ouvertes.", "Only listed official sources are opened."));
  const r = await (brasDroitDeps.fetch ?? fetch)(url, { headers: { Accept: "text/html" }, redirect: "follow" });
  if (!r.ok) throw new Error(L(`La page officielle n'a pas pu être ouverte (${r.status}) : elle ne sera pas citée.`, `The official page couldn't be opened (${r.status}).`));
  const html = await r.text();
  const titre = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").replace(/\s+/g, " ").trim();
  const texte = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&#8217;|&rsquo;/g, "’").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&laquo;/g, "«").replace(/&raquo;/g, "»").replace(/\s+/g, " ").trim();
  return { url, titre, texte, verifieLe: dateAffichee(texte) };
}

/**
 * La relecture d'une réponse du bras droit : chaque adresse citée doit être une page ouverte, chaque phrase entre
 * guillemets doit être sur l'une d'elles. Rend les problèmes (vide : la réponse peut être montrée).
 */
export function verifierCitations(reponse: string, pages: PageOuverte[]): string[] {
  const out: string[] = [];
  const ouvertes = new Set(pages.map((p) => p.url.replace(/\/$/, "")));
  for (const m of reponse.matchAll(/https?:\/\/[^\s)»"]+/g)) {
    const u = m[0].replace(/[.,;]$/, "").replace(/\/$/, "");
    if (!sourceOfficielle(u)) out.push(L(`source non officielle : ${u}`, `unofficial source: ${u}`));
    else if (!ouvertes.has(u)) out.push(L(`source citée sans avoir été ouverte : ${u}`, `source cited but not opened: ${u}`));
  }
  const corpus = norm(pages.map((p) => p.texte).join(" "));
  for (const m of reponse.matchAll(/«\s*([^»]{8,400}?)\s*»|"([^"]{8,400})"/g)) {
    const c = norm(m[1] ?? m[2] ?? "");
    if (c && !corpus.includes(c)) out.push(L(`phrase citée introuvable sur les pages ouvertes : « ${(m[1] ?? m[2] ?? "").trim()} »`, `quoted sentence not found on the opened pages`));
  }
  return out;
}

/** La consigne du bras droit, pour une question d'un domaine réglementé. */
export const CONSIGNE_BRAS_DROIT = `Question de droit, de comptabilité ou d'impôts : tu INFORMES, tu ne consultes pas. Tu donnes la règle générale, avec la page officielle ouverte qui la dit et la date que cette page affiche ; tu ne dis jamais au client ce qu'il doit faire dans son cas précis, et tu n'appliques pas la règle à sa situation. Tu cites seulement les pages ouvertes, mot pour mot entre guillemets. Si la question demande un avis sur son cas (litige, contrat à signer, contrôle, déclaration, comptes), tu dis quel professionnel consulter et tu donnes les questions à lui poser. Les calculs (prix de revient, marge, prix de vente) : tu les fais avec ses chiffres, en montrant tout le calcul, sans toucher à sa comptabilité ni à ses déclarations.`;
