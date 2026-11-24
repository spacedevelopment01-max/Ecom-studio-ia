/**
 * LA MÉTHODE DES GRAPHISTES, temps 5 et 6 : la finalisation d'une esquisse choisie, puis la relecture du logo fini
 * (24 novembre 2026, plan accepté par le chef d'orchestre ; preuve : docs/studio/essais-logos-api/methode-graphiste-reflet/
 * finalisation-sans-proprietaire/finaliser.py, branche du chef d'orchestre).
 *
 * 5. GPT-6.2 Astra regarde l'esquisse et écrit le texte de finalisation avec la consigne de finaliser.py, MOT POUR MOT,
 *    plus une ligne : « demande toujours de faire évoluer l'idée de l'esquisse vers une identité plus aboutie et plus
 *    distinctive, jamais de seulement la nettoyer ou l'agrandir ». Un contrôle gratuit vérifie le début et la fin attendus,
 *    dix phrases au plus et la présence de l'évolution ; sinon une réécriture, à la charge du Studio. Puis POST
 *    /v1/images/edits en multipart (GPT Image 2.6 Sunburst, l'esquisse dans image[], le texte tel quel). Le texte envoyé
 *    est enregistré dans les détails de l'image et dans la fiche du logo.
 * 6. Le relecteur le plus fort, effort élevé (un autre modèle que le rédacteur), reçoit le logo sur blanc, l'esquisse, le
 *    nom, le vrai métier et le texte envoyé. Il refuse si le nom est mal écrit (le code le compare aussi), si l'idée de
 *    l'esquisse est perdue, s'il y a une arche, s'il y a une phrase inventée qui ne dit pas le vrai métier, ou si sa note
 *    est sous 8 sur 10 (décision du chef). Il ne refuse JAMAIS un logo parce qu'il est trop proche de l'esquisse : lors de
 *    l'essai réel du 24 novembre 2026, quatre logos finis propres et fidèles ont tous été refusés pour cette seule raison,
 *    et le propriétaire a fait retirer la règle (« Ouais », à « Je fais retirer cette règle et je relance la finalisation
 *    du R bordeaux ? »). La ligne d'évolution du texte de finalisation reste. En plus, gratuit : le fond se retire
 *    proprement (garde `detourerLeLogo`). Refusé : refait UNE fois, avec toutes les raisons à la fin du texte. Refusé
 *    deux fois : l'identité n'est pas construite, SINA le dit et propose une autre esquisse.
 * La phrase sous le nom choisie par le client (24 novembre 2026 au soir, phrase-sous-le-nom.ts) : une ligne de plus dans
 * la consigne (`ligneDeLaPhrase`), le contrôle gratuit vérifie qu'elle figure mot pour mot dans le texte, et la relecture
 * ne la dit jamais « inventée » : le code la compare, lettre pour lettre, à ce que lit le relecteur ; mal écrite, le logo
 * est refusé. Sans choix du client, rien ne change.
 * Les couleurs du client ne vont jamais au dessinateur : rien ici ne les lit.
 */
import sharp from "sharp";
import { z } from "zod";
import { NOTE_DU_PROPRIETAIRE } from "./note-du-proprietaire";
import { nomExact } from "./esquisses";
import { phraseExacte, type PhraseVoulue } from "./phrase-sous-le-nom";

// ---------------------------------------------------------------- 5. le texte de finalisation

/** La ligne ajoutée à la consigne de finaliser.py (plan accepté du 24 novembre 2026). */
export const LIGNE_D_EVOLUTION = "- demande toujours de faire évoluer l'idée de l'esquisse vers une identité plus aboutie et plus distinctive, jamais de seulement la nettoyer ou l'agrandir ;";

/** La fin attendue du texte (la consigne de finaliser.py, mot pour mot). */
export const FIN_DU_TEXTE = "style vectoriel, fond blanc uni, pas de maquette, pas d'ombre, pas d'effet 3D, pas de texture réaliste, pas de dégradé excessif";
/** Le début attendu du texte. */
export const debutDuTexte = (nom: string, metier: string) => `Transforme cette esquisse en véritable logo contemporain pour ${nom}, ${metier}.`;

/**
 * La ligne ajoutée quand le client a choisi la phrase sous le nom (24 novembre 2026 au soir : « si le client veux le
 * slogan de la 5 et le logo 1, sina doit pouvoir le faire ») : sa phrase, à écrire exactement, ou aucune. Placée juste
 * après la ligne descriptive de finaliser.py, qu'elle remplace pour ce logo.
 */
export const ligneDeLaPhrase = (p: PhraseVoulue): string => "aucune" in p
  ? "- le client ne veut aucune phrase sous le nom : demande de n'en écrire aucune, pas même une ligne descriptive."
  : `- le client a choisi la phrase à écrire en petit sous le nom : demande de l'écrire exactement « ${p.texte} », sans en changer une lettre ni un accent ; elle remplace la ligne descriptive.`;

/**
 * LA CONSIGNE DU RÉDACTEUR : celle de finaliser.py, MOT POUR MOT (le nom et le métier y sont mis), plus la ligne
 * d'évolution, placée avec les autres demandes, avant « N'ajoute aucune idée ». Quand le client a choisi la phrase sous
 * le nom (sa phrase, ou aucune), une seule ligne de plus : `ligneDeLaPhrase`. Sans son choix, rien ne change.
 */
export function consigneDeFinalisation(nom: string, metier: string, phrase?: PhraseVoulue): string {
  return `Tu es la directrice artistique d'un studio de création de marques. Le client ${nom} (${metier}) a choisi
l'esquisse de logo jointe parmi les esquisses proposées. Tu écris le texte qui sera envoyé tel quel à un modèle d'image pour transformer
cette esquisse en logo fini. Ce texte, en français :
- commence par « ${debutDuTexte(nom, metier)} » ;
- nomme précisément l'idée centrale de l'esquisse, celle qui la distingue, et demande de la conserver ;
- demande d'améliorer fortement le dessin : lettres plus soignées et plus distinctives, proportions, espacement,
  équilibre visuel et présence de marque, en restant très lisible ;
- demande de simplifier ce qui fait trop illustration pour que le signe reste graphique ;
${LIGNE_D_EVOLUTION}
- donne une direction de palette adaptée au métier et à l'esquisse ;
- finit par : style vectoriel, fond blanc uni, pas de maquette, pas d'ombre, pas d'effet 3D, pas de texture réaliste,
  pas de dégradé excessif ;
- garde une ligne descriptive discrète seulement si elle dit exactement le métier du client ; toute autre phrase est retirée.
${phrase ? `${ligneDeLaPhrase(phrase)}\n` : ""}N'ajoute aucune idée qui n'est pas dans l'esquisse. Dix phrases au plus.
Réponds uniquement en JSON : {"idee_centrale": "…", "texte": "…"}`;
}
export const DEMANDE_AU_REDACTEUR = "Voici l'esquisse choisie.";
export const TexteDeFinalisationSchema = z.object({ idee_centrale: z.string().min(3).max(600), texte: z.string().min(40).max(4000) });
export type TexteDeFinalisation = z.infer<typeof TexteDeFinalisationSchema>;

const plat = (t: string) => t.normalize("NFC").replace(/[’ʼ]/g, "'").replace(/\s+/g, " ").trim();
/** Les phrases d'un texte (un point, un point d'exclamation ou d'interrogation suivi d'une espace ou de la fin). */
export const phrasesDe = (t: string): string[] => plat(t).split(/(?<=[.!?])\s+(?=\p{Lu}|«|\p{N})/u).map((p) => p.trim()).filter((p) => /\p{L}/u.test(p));
/** L'évolution demandée dans le texte (« fais évoluer », « fais-la évoluer », « évolution »…). */
const EVOLUTION = /\b(fais|faire|fait)[- ](?:\p{L}+[- ])?évoluer\b|\bévolu(er|e|tion)\b|\bplus aboutie?\b/iu;

/**
 * Le contrôle gratuit du texte écrit par le rédacteur. Une liste vide : bon. Avec la phrase choisie par le client : elle
 * doit y figurer mot pour mot (le rédacteur ne la change jamais) ; elle ne compte pas dans les dix phrases.
 */
export function controleDuTexte(texte: string, nom: string, metier: string, phrase?: PhraseVoulue): string[] {
  const t = plat(texte), fautes: string[] = [];
  if (!t.startsWith(plat(debutDuTexte(nom, metier)))) fautes.push(`il doit commencer exactement par « ${debutDuTexte(nom, metier)} »`);
  if (!t.replace(/[.\s]+$/, "").toLowerCase().endsWith(plat(FIN_DU_TEXTE).toLowerCase())) fautes.push(`il doit finir exactement par « ${FIN_DU_TEXTE} »`);
  const voulue = phrase && "texte" in phrase ? plat(phrase.texte) : "";
  if (voulue && !t.includes(voulue)) fautes.push(`il doit demander d'écrire sous le nom, exactement, la phrase choisie par le client : « ${phrase && "texte" in phrase ? phrase.texte : ""} »`);
  const n = phrasesDe(voulue ? t.split(voulue).join("phrase du client") : t).length;
  if (n > 10) fautes.push(`dix phrases au plus (il en a ${n})`);
  if (!EVOLUTION.test(t)) fautes.push("il doit demander de faire évoluer l'idée de l'esquisse vers une identité plus aboutie et plus distinctive");
  return fautes;
}

// ---------------------------------------------------------------- 6. la relecture du logo fini

export const RelectureDuLogoSchema = z.object({
  nomLu: z.string().max(80).default(""),
  ideeConservee: z.boolean().catch(false),
  arche: z.boolean().catch(true),
  /** Une phrase écrite dans le logo qui n'est pas le nom ; vide s'il n'y en a pas. */
  phrase: z.string().max(200).default(""),
  /** Cette phrase dit-elle exactement le vrai métier du client ? */
  phraseDitLeMetier: z.boolean().catch(false),
  note: z.number().min(0).max(10).catch(0),
  pourquoi: z.string().max(500).default(""),
});
export type RelectureDuLogo = z.infer<typeof RelectureDuLogoSchema>;

export const RELECTEUR_DU_LOGO_FINI = `Tu es le relecteur le plus exigeant d'un studio de création de marques. On te montre un logo fini (image 1, sur fond blanc) et l'esquisse dont il est tiré (image 2). Réponds en JSON :
- nomLu : le nom de la marque tel qu'il est écrit dans le logo, lettre pour lettre, accents compris ;
- ideeConservee : l'idée centrale de l'esquisse est toujours là ;
- arche : le dessin est posé dans une arche, une demi-lune ou un cadre arrondi en arc ;
- phrase : toute phrase écrite dans le logo en plus du nom, recopiée lettre pour lettre, accents compris, sans rien corriger (vide s'il n'y en a pas) ;
- phraseDitLeMetier : cette phrase dit exactement le vrai métier donné ci-dessous (faux si elle invente autre chose) ;
- note : ta note de 0 à 10 face aux logos des meilleures agences ;
- pourquoi : une ou deux phrases simples.`;

export function demandeAuRelecteurDuLogo(o: { nom: string; metier: string; texte: string; /** La phrase choisie par le client (absente : la règle d'avant). */ phrase?: PhraseVoulue }): string {
  return [
    `Marque : « ${o.nom} ». Son vrai métier : ${o.metier}.`,
    ...(!o.phrase ? [] : "aucune" in o.phrase
      ? ["Le client ne veut aucune phrase sous le nom."]
      : [`Le client a choisi la phrase à écrire sous le nom : « ${o.phrase.texte} ». Elle n'est pas inventée : vérifie seulement qu'elle est écrite exactement, lettre pour lettre, et recopie dans « phrase » ce que tu lis vraiment.`]),
    `Le texte envoyé au dessinateur : « ${o.texte} »`,
  ].join("\n");
}

/**
 * Les raisons du refus d'un logo fini : le nom, l'idée perdue, l'arche, la phrase inventée et la note de 8. Vide : gardé.
 * Jamais « trop proche de l'esquisse » (retiré le 24 novembre 2026 avec le « Ouais » du propriétaire).
 * Avec la phrase choisie par le client : elle n'est jamais « inventée » ; le code compare ce que le relecteur lit à la
 * phrase choisie, lettre pour lettre, comme pour le nom ; mal écrite ou absente, le logo est refusé. Avec « aucune » :
 * toute phrase fait refuser le logo.
 */
export function raisonsDuRefus(v: RelectureDuLogo, nom: string, phrase?: PhraseVoulue): string[] {
  const r: string[] = [];
  if (!nomExact(v.nomLu, nom)) r.push(v.nomLu ? `le nom est mal écrit (« ${v.nomLu} » au lieu de « ${nom} »)` : `le nom « ${nom} » n'y est pas écrit`);
  if (!v.ideeConservee) r.push("l'idée de l'esquisse est perdue");
  if (v.arche) r.push("le dessin est posé dans une arche");
  const lue = v.phrase.trim();
  if (phrase && "texte" in phrase) {
    if (!lue) r.push(`la phrase choisie par le client (« ${phrase.texte} ») n'y est pas écrite`);
    else if (!phraseExacte(lue, phrase.texte)) r.push(`la phrase choisie par le client est mal écrite (« ${lue} » au lieu de « ${phrase.texte} »)`);
  } else if (phrase) {
    if (lue) r.push(`le client ne veut aucune phrase sous le nom, et le logo porte « ${lue} »`);
  } else if (lue && !v.phraseDitLeMetier) r.push(`la phrase « ${lue} » est inventée et ne dit pas le vrai métier`);
  if (v.note < NOTE_DU_PROPRIETAIRE) r.push(`il n'est pas au niveau (${v.note}/10, il faut ${NOTE_DU_PROPRIETAIRE})`);
  return r;
}

/** Ce qui est ajouté à la fin du texte pour la reprise unique : toutes les raisons du refus. */
export const finDeReprise = (raisons: readonly string[]) => `À corriger : ${raisons.join(" ; ")}.`;

// ---------------------------------------------------------------- la finalisation entière

export type FinalisationDeps = {
  /** GPT-6.2 Astra regarde l'esquisse et écrit le texte (consigne de finaliser.py). */
  rediger: (consigne: string, esquisse: Buffer, tour: number) => Promise<TexteDeFinalisation>;
  /** POST /v1/images/edits (multipart, image[]) : le logo fini. */
  finaliser: (esquisse: Buffer, texte: string, tour: number) => Promise<Buffer>;
  /** Le relecteur le plus fort, effort élevé. */
  relire: (logoSurBlanc: Buffer, esquisse: Buffer, demande: string, tour: number) => Promise<RelectureDuLogo>;
  /** Le fond retiré par le Studio (detourerLeLogo). */
  detourer: (png: Buffer) => Promise<{ ok: true; png: Buffer } | { ok: false; why: string }>;
  aLaChargeDuStudio: <T>(fn: () => Promise<T>) => Promise<T>;
};
export type EssaiDeFinalisation = { tour: number; texte: string; ideeCentrale: string; png: Buffer | null; detoure: Buffer | null; verdict: RelectureDuLogo | null; raisons: string[] };
export type Finalisation = { ok: true; logo: Buffer; detoure: Buffer; texte: string; essais: EssaiDeFinalisation[]; notes: string[] }
  | { ok: false; raison: string; essais: EssaiDeFinalisation[]; notes: string[] };

/**
 * Une esquisse choisie devient un logo fini : le texte écrit (et contrôlé), le logo dessiné, relu ; refusé une fois, il
 * est refait avec toutes les raisons à la fin du texte, à la charge du Studio ; refusé deux fois, il n'est pas gardé.
 * Une panne du fournisseur n'est jamais relancée toute seule (l'erreur remonte, le parcours le dit).
 */
export async function finaliserUneEsquisse(deps: FinalisationDeps, o: { nom: string; metier: string; esquisse: Buffer; /** La phrase choisie par le client (absente : la règle d'avant). */ phrase?: PhraseVoulue }): Promise<Finalisation> {
  const notes: string[] = [], essais: EssaiDeFinalisation[] = [];
  const consigne = consigneDeFinalisation(o.nom, o.metier, o.phrase);
  let ecrit = await deps.rediger(consigne, o.esquisse, 1);
  let fautes = controleDuTexte(ecrit.texte, o.nom, o.metier, o.phrase);
  if (fautes.length) {
    notes.push(`texte de finalisation réécrit à la charge du Studio : ${fautes.join(" ; ")}`);
    ecrit = await deps.aLaChargeDuStudio(() => deps.rediger(`${consigne}\n\nTon premier texte ne convenait pas : ${fautes.join(" ; ")}. Réécris-le.`, o.esquisse, 2));
    fautes = controleDuTexte(ecrit.texte, o.nom, o.metier, o.phrase);
    if (fautes.length) return { ok: false, raison: `le texte de finalisation ne tient pas la forme attendue (${fautes.join(" ; ")})`, essais, notes };
  }
  const essai = async (tour: number, texte: string): Promise<EssaiDeFinalisation> => {
    const png = await deps.finaliser(o.esquisse, texte, tour);
    const e: EssaiDeFinalisation = { tour, texte, ideeCentrale: ecrit.idee_centrale, png, detoure: null, verdict: null, raisons: [] };
    const d = await deps.detourer(png);
    if (!d.ok) { e.raisons = [d.why]; return e; }
    e.detoure = d.png;
    const surBlanc = await sharp(d.png).flatten({ background: "#FFFFFF" }).png().toBuffer();
    e.verdict = await deps.relire(surBlanc, o.esquisse, demandeAuRelecteurDuLogo({ nom: o.nom, metier: o.metier, texte, ...(o.phrase ? { phrase: o.phrase } : {}) }), tour);
    e.raisons = raisonsDuRefus(e.verdict, o.nom, o.phrase);
    return e;
  };
  const premier = await essai(1, ecrit.texte);
  essais.push(premier);
  if (!premier.raisons.length) return { ok: true, logo: premier.png!, detoure: premier.detoure!, texte: premier.texte, essais, notes };
  notes.push(`logo refusé (${premier.raisons.join(" ; ")}) : refait une fois, à la charge du Studio, avec ces raisons à la fin du texte`);
  const second = await deps.aLaChargeDuStudio(() => essai(2, `${ecrit.texte} ${finDeReprise(premier.raisons)}`));
  essais.push(second);
  if (!second.raisons.length) return { ok: true, logo: second.png!, detoure: second.detoure!, texte: second.texte, essais, notes };
  return { ok: false, raison: `refusé deux fois (${second.raisons.join(" ; ")})`, essais, notes };
}

// ---------------------------------------------------------------- la retouche des couleurs, sur la demande du client

/**
 * Un changement de couleur demandé par le client lui-même, une fois les logos finis (plan accepté du 24 novembre 2026) :
 * une retouche sur sa demande, sur son budget, avec une carte. Le logo fini part dans image[], avec ce texte du Studio
 * et les mots du client cités tels quels ; rien d'autre ne change dans le dessin. Le relecteur vérifie le nom, l'idée,
 * l'arche, la phrase et la note, comme pour tout logo fini.
 */
export const texteDeRetouche = (demande: string) => `Garde ce logo exactement tel qu'il est (son dessin, ses lettres, ses proportions) et change seulement ses couleurs, comme le client le demande : « ${demande.trim().replace(/[«»]/g, "")} ». ${FIN_DU_TEXTE}`;
export async function retoucherLesCouleurs(deps: FinalisationDeps, o: { nom: string; metier: string; logo: Buffer; demande: string; /** La phrase choisie par le client pour ce logo : la retouche la garde, la relecture la compare. */ phrase?: PhraseVoulue }): Promise<Finalisation> {
  const notes: string[] = [], essais: EssaiDeFinalisation[] = [];
  const texte = texteDeRetouche(o.demande);
  const essai = async (tour: number, t: string): Promise<EssaiDeFinalisation> => {
    const png = await deps.finaliser(o.logo, t, tour);
    const e: EssaiDeFinalisation = { tour, texte: t, ideeCentrale: "", png, detoure: null, verdict: null, raisons: [] };
    const d = await deps.detourer(png);
    if (!d.ok) { e.raisons = [d.why]; return e; }
    e.detoure = d.png;
    const surBlanc = await sharp(d.png).flatten({ background: "#FFFFFF" }).png().toBuffer();
    e.verdict = await deps.relire(surBlanc, o.logo, demandeAuRelecteurDuLogo({ nom: o.nom, metier: o.metier, texte: t, ...(o.phrase ? { phrase: o.phrase } : {}) }), tour);
    e.raisons = raisonsDuRefus(e.verdict, o.nom, o.phrase);
    return e;
  };
  const premier = await essai(1, texte);
  essais.push(premier);
  if (!premier.raisons.length) return { ok: true, logo: premier.png!, detoure: premier.detoure!, texte, essais, notes };
  const second = await deps.aLaChargeDuStudio(() => essai(2, `${texte} ${finDeReprise(premier.raisons)}`));
  essais.push(second);
  return second.raisons.length ? { ok: false, raison: `refusé deux fois (${second.raisons.join(" ; ")})`, essais, notes } : { ok: true, logo: second.png!, detoure: second.detoure!, texte: second.texte, essais, notes };
}
