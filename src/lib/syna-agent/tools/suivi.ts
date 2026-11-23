/**
 * Les outils du suivi dans la durée (22 novembre 2026, recherche 08, points 7 et 11), allumés par décision du chef
 * d'orchestre au nom des engagements acceptés le 15 novembre (référence, partie 14). Chacun garde son interrupteur
 * (`suivi.ficheGoogle`, `suivi.brasDroit`) : « 0 » dans le réglage le ferme.
 *  - google.fiche : le guide de la fiche Google geste par geste et le paquet du mois (gratuit) ;
 *  - google.avis : la réponse propre à un avis, relue par le code (un appel, moins d'un centime estimé) ;
 *  - droit.informer : le bras droit, qui informe à partir des pages officielles ouvertes et datées, sans consulter.
 */
import { z } from "zod";
import { L } from "../../i18n-server";
import { aiActiveFor } from "../../ai/access";
import { jsonCallMaxMicro } from "../../ai/llm";
import { TEXT_MODEL_BY_TIER } from "../../orchestrator/policy";
import { suiviAllume } from "../../suivi/reglages";
import { guideFicheGoogle, paquetDuMois, reponseAvis } from "../../suivi/fiche-google";
import { CONSIGNE_BRAS_DROIT, domaineDe, ouvrirPage, professionnelPour, sourceOfficielle, SOURCES_OFFICIELLES, verifierCitations, type PageOuverte } from "../../suivi/bras-droit";
import { calendarView, readCalendar } from "../calendar";
import type { Project } from "../../projects";
import type { AgentTool } from "../types";
import { project } from "./common";

/** La formule du bras droit, mot pour mot (décision du chef d'orchestre, 22 novembre 2026). */
export const FORMULE_BRAS_DROIT = {
  fr: "Je t'informe à partir des pages officielles (datées). Pour une décision qui t'engage, voici le professionnel à consulter et les questions à lui poser.",
  en: "I'm informing you from the official pages (dated). For a decision that commits you, here is the professional to consult and the questions to ask them.",
} as const;

const eteint = (quoi: string) => ({ ok: false, summary: L(`${quoi} est fermé dans les réglages du Studio.`, `${quoi} is turned off in the Studio settings.`), hint: "Dis-le simplement au client, sans rien proposer à la place." });

/** Les publications du mois déjà acceptées dans son calendrier (une par texte, la première image), pour la fiche. */
export function publicationsDuMois(p: Project, month: string): { ymd: string; copyText: string; image: string | null }[] {
  const cal = readCalendar(p.id);
  if (!cal) return [];
  const vus = new Set<string>(), out: { ymd: string; copyText: string; image: string | null }[] = [];
  try {
    for (const d of calendarView(p, cal, { from: `${month}-01`, to: `${month}-31` }).days)
      for (const i of d.items) if (i.kind === "publication" && i.status !== "introuvable" && i.copyText.trim() && !vus.has(i.copyText.trim())) { vus.add(i.copyText.trim()); out.push({ ymd: i.ymd, copyText: i.copyText, image: i.files[0]?.href ?? null }); }
  } catch { return []; }
  return out;
}

const ficheTool: AgentTool<{ mois?: string }> = {
  name: "google.fiche", module: "fiche Google", kind: "read", needsProject: true,
  description: "Sa fiche Google, tenue par lui et guidée par toi (gratuit) : le guide geste par geste (répondre à un avis, publier, programmer le mois, être prévenu des avis, lien pour demander un avis), chacun avec la page d'aide de Google, et le paquet du mois (4 publications, une par semaine, reprises de ses publications acceptées, sans téléphone ni mot-dièse). mois : AAAA-MM (ce mois par défaut). Aucun branchement à Google.",
  args: z.object({ mois: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional() }).strict(),
  run: (ctx, a) => {
    if (!suiviAllume("ficheGoogle")) return eteint(L("Le guide de la fiche Google", "The Google profile guide"));
    const p = project(ctx), mois = a.mois ?? new Date().toISOString().slice(0, 7);
    const gestes = guideFicheGoogle(), paquet = paquetDuMois(publicationsDuMois(p, mois), mois);
    return {
      ok: true,
      summary: L(`Guide de ta fiche Google (${gestes.length} gestes) ; paquet de ${mois} : ${paquet.length} publication(s) prête(s).`, `Google profile guide; ${mois} pack: ${paquet.length} post(s).`),
      data: { gestes, paquet },
      hint: `Montre-lui un geste à la fois, avec le chemin exact et la page de Google. ${paquet.length ? "Le paquet reprend ses publications acceptées, nettoyées pour la fiche : ne change pas leur texte." : "Aucune publication acceptée ce mois-ci : dis-le, n'en invente aucune."} Pour un avis, google.avis (il colle l'avis ou te transfère l'e-mail de Google).`,
    };
  },
};

type AvisArgs = { auteur: string; texte: string; note?: number; signature: string };
const avisMax = () => jsonCallMaxMicro("anthropic", TEXT_MODEL_BY_TIER.strong, 2500, 800, 800, "low")?.maxMicro ?? 50_000;

const avisTool: AgentTool<AvisArgs> = {
  name: "google.avis", module: "fiche Google", kind: "generate", needsProject: true,
  description: "Écrit la réponse publique à UN avis Google qu'il t'a collé ou transféré (PAYANT, moins d'un centime estimé) : prénom de l'auteur, un détail de son avis, sa signature à la fin, aucune offre ni coordonnée, jamais proche d'une réponse déjà donnée ; relue par le code avant de lui être montrée. auteur, texte et note : recopiés de l'avis, mot pour mot ; signature : la sienne (demande-la si tu ne l'as pas). Il la publie lui-même (geste « avis » de google.fiche).",
  args: z.object({ auteur: z.string().min(1).max(80), texte: z.string().min(1).max(4000), note: z.number().int().min(1).max(5).optional(), signature: z.string().min(1).max(120) }).strict(),
  estimate: () => ({ maxMicro: avisMax(), label: L("la réponse à cet avis Google, relue avant de t'être montrée", "the reply to this Google review, checked before it's shown") }),
  run: async (ctx, a) => {
    if (!suiviAllume("ficheGoogle")) return eteint(L("La réponse aux avis", "Review replies"));
    const p = project(ctx);
    if (!aiActiveFor(p.userId, p.id)) return { ok: false, summary: L("L'IA n'est pas active pour ce projet : aucune réponse ne peut être écrite.", "AI is not active for this project.") };
    try {
      const r = await reponseAvis({ id: p.id, userId: p.userId, name: p.name }, { auteur: a.auteur, texte: a.texte, note: a.note ?? null }, a.signature);
      return { ok: true, summary: L("Réponse à l'avis prête, relue.", "Review reply ready."), data: { reponse: r.reponse, avisNegatif: r.negatif }, hint: `Montre-lui la réponse telle quelle, à copier dans sa fiche (« Read reviews », « Reply »).${r.negatif ? " Avis négatif : propose-lui d'en parler aussi directement avec la personne." : ""}` };
    } catch (e) { return { ok: false, summary: (e as Error).message, hint: "Dis-lui honnêtement que la réponse n'a pas passé la relecture, sans la relancer toi-même." }; }
  },
};

/** Les passages d'une page qui parlent de la question (phrases qui reprennent ses mots), dans l'ordre de la page. */
export function passages(texte: string, question: string, max = 2500): string {
  const mots = new Set(question.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").match(/[a-z]{5,}/g) ?? []);
  const phrases = texte.split(/(?<=[.!?»])\s+/).map((s, i) => ({ s: s.trim(), i, n: [...new Set(s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").match(/[a-z]{5,}/g) ?? [])].filter((w) => mots.has(w)).length })).filter((x) => x.s.length > 30 && x.s.length < 600);
  const pris = [...phrases].sort((a, b) => b.n - a.n || a.i - b.i).filter((x) => x.n > 0).slice(0, 14).sort((a, b) => a.i - b.i);
  let out = "";
  for (const x of pris) { if (out.length + x.s.length > max) break; out += `${out ? " […] " : ""}${x.s}`; }
  return out || texte.slice(0, max);
}

type DroitArgs = { question: string; pages: string[]; brouillon?: string };
const droitTool: AgentTool<DroitArgs> = {
  name: "droit.informer", module: "bras droit", kind: "read", needsProject: true,
  description: "Le bras droit, gratuit, pour une question de droit, de comptabilité ou d'impôts du client : ouvre 1 à 3 pages officielles (liste fixe : service-public.gouv.fr, legifrance.gouv.fr, impots.gouv.fr, urssaf.fr, cnil.fr…) et rend leurs passages utiles, la date qu'elles affichent, le professionnel à voir et ses questions. Tu informes, tu ne consultes pas. brouillon : ta réponse, relue avant envoi (adresses et phrases entre guillemets prises sur les pages ouvertes).",
  args: z.object({ question: z.string().min(3).max(800), pages: z.array(z.string().url().max(400)).min(1).max(3), brouillon: z.string().max(6000).optional() }).strict(),
  run: async (ctx, a) => {
    if (!suiviAllume("brasDroit")) return eteint(L("Le bras droit", "The right-hand helper"));
    project(ctx);
    const hors = a.pages.filter((u) => !sourceOfficielle(u));
    if (hors.length) return { ok: false, internal: true, summary: `Pages refusées sans être ouvertes (hors de la liste officielle) : ${hors.join(", ")}.`, hint: `Seulement : ${SOURCES_OFFICIELLES.join(", ")}.` };
    const ouvertes: PageOuverte[] = [], echecs: string[] = [];
    for (const u of a.pages) { try { ouvertes.push(await ouvrirPage(u)); } catch (e) { echecs.push(`${u} : ${(e as Error).message}`); } }
    if (!ouvertes.length) return { ok: false, summary: L("Aucune page officielle n'a pu être ouverte : je ne cite rien.", "No official page could be opened."), data: { echecs }, hint: "Dis-le au client honnêtement, et donne-lui seulement le professionnel à consulter si la question l'engage." };
    const formule = L(FORMULE_BRAS_DROIT.fr, FORMULE_BRAS_DROIT.en);
    const relecture = a.brouillon ? verifierCitations(a.brouillon, ouvertes) : null;
    return {
      ok: relecture ? !relecture.length : true,
      ...(relecture?.length ? { internal: true } : {}),
      summary: relecture?.length ? L(`Brouillon refusé : ${relecture.join(" ; ")}.`, "Draft refused.") : formule,
      data: {
        domaine: domaineDe(a.question),
        formule,
        pages: ouvertes.map((p) => ({ url: p.url, titre: p.titre, date: p.verifieLe ?? L("non disponible : la page n'affiche pas de date", "not available: the page shows no date"), passages: passages(p.texte, a.question) })),
        professionnel: professionnelPour(a.question),
        ...(echecs.length ? { nonOuvertes: echecs } : {}),
        ...(relecture ? { relecture: relecture.length ? relecture : "aucun problème" } : {}),
      },
      hint: `${CONSIGNE_BRAS_DROIT} Commence ta réponse par cette phrase, mot pour mot : « ${formule} » Puis la règle générale avec chaque page et sa date ; puis, s'il y a un professionnel, lequel et ses questions. Relis ton brouillon avec ce même outil (brouillon) avant de l'envoyer.`,
    };
  },
};

export const suiviTools: AgentTool[] = [ficheTool, avisTool, droitTool];
