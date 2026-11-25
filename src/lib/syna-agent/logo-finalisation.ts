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
 *    du R bordeaux ? »). Il ne juge plus l'idée non plus (25 novembre 2026) : c'est le client qui l'a choisie parmi les
 *    esquisses ; il juge seulement l'exécution (le nom, l'idée bien gardée, un dessin net, pas d'arche, pas de phrase
 *    inventée, un fond qui se retire), une note sous 8 doit tenir à un défaut d'exécution écrit, et le code écarte toute
 *    raison qui juge l'idée (« cliché du secteur », « idée banale », « peu originale »…), même si le modèle la donne
 *    (`lectureDeLaNote`). Lors de l'essai réel du 25 novembre, quatre logos finis de Racine ont été refusés à 6,5, 7, 7
 *    et 7, dont la feuille sur le i pour « un cliché courant du secteur végétal » ; le propriétaire, à la question « Ces
 *    logos finis te paraissent assez bons pour être montrés à un client ? » : « Oui très bien je mettrais 9/10 ». La
 *    ligne d'évolution du texte de finalisation reste. En plus, gratuit : le fond se retire
 *    proprement (garde `detourerLeLogo`). Refusé : refait UNE fois, à la charge du Studio, à partir du logo refusé (et non
 *    plus de l'esquisse), avec les corrections précises au début du texte (`debutDeReprise`, 25 novembre 2026). Refusé
 *    deux fois : l'identité n'est pas construite, SINA le dit et propose une autre esquisse.
 *    Les petites finitions (25 novembre 2026 au soir, devant le second essai de la feuille sur le i refusé à 7 : « Le
 *    racine du milieu est très bien aussi ») : le relecteur sépare les défauts graves (`defauts`) des petites finitions
 *    (`finitions`) ; une finition ne fait jamais refuser, elle est écrite au compte rendu et devient une correction
 *    seulement s'il y a une reprise pour une autre raison.
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

const listeDeLignes = z.preprocess((x) => (typeof x === "string" ? x.split(/\s*[;\n]\s*/) : x), z.array(z.string().max(400)).max(12)).catch([]).transform((d) => d.map((x) => x.trim()).filter(Boolean));
export const RelectureDuLogoSchema = z.object({
  nomLu: z.string().max(80).default(""),
  ideeConservee: z.boolean().catch(false),
  arche: z.boolean().catch(true),
  /** Une phrase écrite dans le logo qui n'est pas le nom ; vide s'il n'y en a pas. */
  phrase: z.string().max(200).default(""),
  /** Cette phrase dit-elle exactement le vrai métier du client ? */
  phraseDitLeMetier: z.boolean().catch(false),
  /**
   * Les défauts d'exécution GRAVES, un par ligne (25 novembre 2026) : ceux qui font refuser (une lettre fausse, manquante
   * ou illisible, un nom qui se lit autrement de façon évidente, une forme cassée, un fond qui n'est pas blanc uni…) ;
   * jamais un reproche sur l'idée. Dans un verdict d'avant les finitions, tous les défauts écrits sont ici.
   */
  defauts: listeDeLignes,
  /**
   * Les petites finitions, une par ligne (25 novembre 2026 au soir, « Le racine du milieu est très bien aussi ») : un petit
   * défaut qu'un client ne remarquerait pas comme une faute (une feuille-point un peu haute ou décalée, une coupe en biais).
   * Elles ne font jamais refuser ; elles servent de corrections seulement s'il y a une reprise pour une autre raison.
   */
  finitions: listeDeLignes,
  note: z.number().min(0).max(10).catch(0),
  pourquoi: z.string().max(500).default(""),
});
/** Un verdict du relecteur ; `defauts` est absent d'un verdict d'avant le 25 novembre 2026, `finitions` d'un verdict d'avant le soir du 25. */
export type RelectureDuLogo = Omit<z.infer<typeof RelectureDuLogoSchema>, "defauts" | "finitions"> & { defauts?: readonly string[]; finitions?: readonly string[] };

/**
 * Le repère du propriétaire, mot pour mot (25 novembre 2026) : devant les quatre logos finis de l'essai de Racine, tous
 * refusés à 6,5, 7, 7 et 7, à la question « Ces logos finis te paraissent assez bons pour être montrés à un client ? ».
 * Aucune image d'essai n'est montrée au relecteur : seulement ces mots.
 */
export const QUESTION_DU_REPERE = "Ces logos finis te paraissent assez bons pour être montrés à un client ?";
export const REPONSE_DU_PROPRIETAIRE = "Oui très bien je mettrais 9/10";
/**
 * Le second repère, mot pour mot (25 novembre 2026 au soir) : devant le second essai de la feuille sur le i
 * (essai finalisation-execution, esquisse-04-logo-2-brut.png), refusé à 7 pour une feuille-point un peu décalée et le
 * haut du i coupé en biais. Le relecteur était plus sévère que lui sur les petites finitions.
 */
export const SECOND_REPERE_DU_PROPRIETAIRE = "Le racine du milieu est très bien aussi";

/**
 * LE RELECTEUR DU LOGO FINI juge l'exécution, jamais l'idée (25 novembre 2026) : c'est le client qui a choisi l'idée
 * parmi les esquisses. Il juge le nom exact, l'idée de l'esquisse bien gardée, un dessin net (raccords, proportions,
 * lisibilité en petit), pas d'arche, pas de phrase inventée, un fond qui se retire. Sa note est étalonnée : un logo propre
 * et fidèle à l'esquisse choisie, au dessin net et sans défaut visible, vaut 8 ou plus.
 */
export const RELECTEUR_DU_LOGO_FINI = `Tu es le relecteur d'un studio de création de marques. On te montre un logo fini (image 1, sur fond blanc) et l'esquisse dont il est tiré (image 2).
Le client a choisi lui-même cette esquisse, et son idée, parmi celles qu'on lui a proposées. Tu ne juges jamais l'idée : ni son originalité, ni si elle est courante dans son métier, ni si elle est assez marquante. Tu juges seulement l'exécution : le nom écrit exactement, l'idée de l'esquisse bien gardée, un dessin net (raccords propres, proportions justes, lisible en petit), pas d'arche, pas de phrase inventée, un fond blanc uni qui se retire.
Réponds en JSON :
- nomLu : le nom de la marque tel qu'il est écrit dans le logo, lettre pour lettre, accents compris ;
- ideeConservee : l'idée centrale de l'esquisse est toujours là, bien gardée ;
- arche : le dessin est posé dans une arche, une demi-lune ou un cadre arrondi en arc ;
- phrase : toute phrase écrite dans le logo en plus du nom, recopiée lettre pour lettre, accents compris, sans rien corriger (vide s'il n'y en a pas) ;
- phraseDitLeMetier : cette phrase dit exactement le vrai métier donné ci-dessous (faux si elle invente autre chose) ;
- defauts : la liste des défauts d'exécution graves, ceux qu'un client verrait comme une faute, un seul par ligne, en mots simples : une lettre fausse, manquante ou illisible ; un nom qui se lit autrement de façon évidente ; une forme cassée ; un fond qui n'est pas blanc uni ; jamais un reproche sur l'idée ; une liste vide s'il n'y en a pas ;
- finitions : la liste des petits défauts de finition, ceux qu'un client ne remarquerait pas comme une faute (par exemple une feuille qui sert de point un peu haute ou décalée, une coupe en biais, un raccord un peu lourd), un seul par ligne, en mots simples ; une liste vide s'il n'y en a pas ;
- note : ta note de 0 à 10 sur l'exécution seule. Un logo propre et fidèle à l'esquisse choisie, au dessin net et sans défaut visible, vaut 8 ou plus. Une petite finition ne fait jamais descendre la note sous 8 ; une note sous 8 s'explique par au moins un défaut grave écrit dans defauts. Ton repère : à la question « ${QUESTION_DU_REPERE} », posée devant des logos finis propres et fidèles à leurs esquisses, le propriétaire du Studio a répondu : « ${REPONSE_DU_PROPRIETAIRE} ». Ton second repère : devant un logo fini d'essai, pour une autre marque, dont la feuille qui sert de point sur le i était un peu décalée et le haut du i coupé en biais, il a dit : « ${SECOND_REPERE_DU_PROPRIETAIRE} » ;
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
 * Ce qui juge l'idée, et non l'exécution (25 novembre 2026) : un cliché, une idée banale, courante ou répandue, propre au
 * secteur, peu originale ou pas assez singulière ou distinctive, la comparaison aux agences, l'audace, l'ambition, et
 * « trop proche de l'esquisse » (retiré le 24 novembre). Lu sans accents ni majuscules. Une raison qui en porte un seul
 * mot est écartée EN ENTIER : un reproche sur l'idée ne fait jamais refuser un logo, même mêlé à autre chose.
 */
const JUGE_L_IDEE = /clich|banal|peu original|pas original|pas tres original|pas assez original|manque d'original|originalite|singularit|singulier|distinctif|distinctive|distinction|convenu|deja vu|vu et revu|repandu|generique|stereotyp|previsible|(tres|trop|assez|idee) attendue?|(tres|trop|assez|lieu|idee) commune?\b|secteur|agence|audac|ambitie|ambition|memorab|personnalite|trop proche|pas assez transform|pas assez evolu|manque d'evolution|copie (nettoyee|de l'esquisse)/;
const sansAccents = (t: string) => t.normalize("NFD").replace(/\p{M}/gu, "").replace(/[’ʼ]/g, "'").toLowerCase();
/** Vrai si ce texte juge l'idée (son originalité, sa banalité, sa place dans le secteur…) plutôt que l'exécution. */
export const jugeLIdee = (t: string): boolean => JUGE_L_IDEE.test(sansAccents(t));

/**
 * Ce que le code retient du verdict : les défauts graves (ceux qui jugent l'idée sont écartés), les petites finitions
 * (idem) et, quand la note est sous 8, si elle compte (une note de 8 ou plus ne fait jamais refuser, comme avant). Elle
 * compte pour un défaut grave écrit. Elle ne compte pas quand
 * elle ne tient qu'à l'idée (25 novembre 2026) ou qu'à de petites finitions (25 novembre 2026 au soir, « Le racine du
 * milieu est très bien aussi »), ni, sans rien d'écrit, quand le « pourquoi » juge l'idée. Une note sous 8 sans aucune
 * explication reste un refus, par prudence. Un verdict d'avant les finitions : tous ses défauts écrits sont graves.
 */
export function lectureDeLaNote(v: Pick<RelectureDuLogo, "note" | "pourquoi" | "defauts" | "finitions">): { compte: boolean; defauts: string[]; finitions: string[]; ecartes: string[] } {
  const propre = (l?: readonly string[]) => (l ?? []).map((d) => d.trim()).filter(Boolean);
  const ecrits = propre(v.defauts), petites = propre(v.finitions);
  const defauts = ecrits.filter((d) => !jugeLIdee(d)), finitions = petites.filter((d) => !jugeLIdee(d));
  const ecartes = [...ecrits, ...petites].filter((d) => jugeLIdee(d));
  if (v.note >= NOTE_DU_PROPRIETAIRE) return { compte: false, defauts, finitions, ecartes };
  if (defauts.length) return { compte: true, defauts, finitions, ecartes };
  if (finitions.length || ecartes.length) return { compte: false, defauts, finitions, ecartes };
  if (jugeLIdee(v.pourquoi)) return { compte: false, defauts, finitions, ecartes: [v.pourquoi.trim()] };
  return { compte: true, defauts, finitions, ecartes };
}

/**
 * Les raisons du refus d'un logo fini : le nom, l'idée perdue, l'arche, la phrase inventée et la note de 8. Vide : gardé.
 * Jamais « trop proche de l'esquisse » (retiré le 24 novembre 2026 avec le « Ouais » du propriétaire), et jamais l'idée
 * elle-même (25 novembre 2026, « Oui très bien je mettrais 9/10 » devant quatre logos refusés pour elle) : une note sous 8
 * ne fait refuser que pour l'exécution (`lectureDeLaNote`), avec ses défauts dans la raison.
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
  const n = lectureDeLaNote(v);
  if (n.compte) r.push(`il n'est pas au niveau (${v.note}/10, il faut ${NOTE_DU_PROPRIETAIRE})${n.defauts.length ? ` : ${n.defauts.join(" ; ")}` : ""}`);
  return r;
}

/** Pour le compte rendu : une note sous 8 qui n'a pas été comptée (elle jugeait l'idée, ou de petites finitions) ; null sinon. */
export function noteEcartee(v: RelectureDuLogo): string | null {
  const n = lectureDeLaNote(v);
  if (v.note >= NOTE_DU_PROPRIETAIRE || n.compte) return null;
  if (n.ecartes.length && !n.finitions.length) return `note de ${v.note}/10 non comptée : elle jugeait l'idée choisie par le client, pas l'exécution (« ${n.ecartes.join(" ; ")} »)`;
  return `note de ${v.note}/10 non comptée : elle ne tenait qu'à de petites finitions (« ${n.finitions.join(" ; ")} »)${n.ecartes.length ? ` et à l'idée choisie par le client (« ${n.ecartes.join(" ; ")} »)` : ""}`;
}
/** Pour le compte rendu : les petites finitions notées par le relecteur, qui ne font pas refuser ; null sans finition. */
export function finitionsNotees(v: RelectureDuLogo): string | null {
  const f = lectureDeLaNote(v).finitions;
  return f.length ? `petites finitions notées, sans refus : ${f.join(" ; ")}` : null;
}

/**
 * LA REPRISE UNIQUE (25 novembre 2026, décision du chef d'orchestre après l'essai réel de Racine : la feuille sur le i,
 * refusée deux fois à 7 pour les mêmes défauts ; son constat : « il redessine les mêmes défauts, parce qu'on lui redonne
 * l'esquisse, qui porte déjà ce i coupé »). À la reprise, le dessinateur reçoit le logo refusé (et non plus l'esquisse) et,
 * AU DÉBUT du texte, les corrections précises ; le texte de finalisation suit, tel qu'il était. Le relecteur de la reprise
 * reçoit toujours l'esquisse, comme référence de l'idée.
 *
 * Les corrections : les raisons du refus, sauf celle de la note, remplacée par ses défauts d'exécution écrits (« il n'est
 * pas au niveau (7/10, il faut 8) : A ; B » donne « A » et « B ») ; une note sous 8 sans défaut écrit reste telle quelle.
 */
const RAISON_DE_LA_NOTE = /^il n'est pas au niveau \([^)]*\) : /;
/**
 * Les corrections de la reprise : les raisons du refus (la raison de la note remplacée par ses défauts écrits), puis les
 * petites finitions notées au premier essai (25 novembre 2026 au soir : elles ne font pas refuser, mais une reprise faite
 * pour une autre raison les corrige aussi). Sans doublon.
 */
export const correctionsDeLaReprise = (raisons: readonly string[], finitions: readonly string[] = []): string[] => [...new Set([...raisons
  .flatMap((r) => { const m = r.match(RAISON_DE_LA_NOTE); return m ? r.slice(m[0].length).split(" ; ") : [r]; }), ...finitions]
  .map((c) => c.trim().replace(/[\s.;]+$/u, ""))
  .filter(Boolean))];
/** Le début du texte de la reprise, forme stable : « Corrige uniquement : A ; B ; garde tout le reste à l'identique. » */
export const debutDeReprise = (raisons: readonly string[], finitions: readonly string[] = []) => `Corrige uniquement : ${correctionsDeLaReprise(raisons, finitions).join(" ; ")} ; garde tout le reste à l'identique.`;
/** Le texte de la reprise : les corrections d'abord, puis le texte d'origine, tel qu'il était. */
export const texteDeReprise = (raisons: readonly string[], texte: string, finitions: readonly string[] = []) => `${debutDeReprise(raisons, finitions)}\n\n${texte}`;
/** Les petites finitions d'un essai relu (vides sans relecture), pour la reprise. */
const finitionsDe = (e: EssaiDeFinalisation): string[] => (e.verdict ? lectureDeLaNote(e.verdict).finitions : []);

// ---------------------------------------------------------------- la finalisation entière

export type FinalisationDeps = {
  /** GPT-6.2 Astra regarde l'esquisse et écrit le texte (consigne de finaliser.py). */
  rediger: (consigne: string, esquisse: Buffer, tour: number) => Promise<TexteDeFinalisation>;
  /**
   * POST /v1/images/edits (multipart, image[]) : le logo fini. L'image jointe : l'esquisse au premier essai, le logo
   * refusé à la reprise (pour la retouche : le logo à retoucher, puis la retouche refusée).
   */
  finaliser: (jointe: Buffer, texte: string, tour: number) => Promise<Buffer>;
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
 * est refait à partir du logo refusé, les corrections au début du texte, à la charge du Studio ; refusé deux fois, il
 * n'est pas gardé.
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
  // L'image jointe au dessinateur : l'esquisse au premier essai, le logo refusé à la reprise. Le relecteur reçoit toujours
  // l'esquisse, référence de l'idée.
  const essai = async (tour: number, texte: string, jointe: Buffer): Promise<EssaiDeFinalisation> => {
    const png = await deps.finaliser(jointe, texte, tour);
    const e: EssaiDeFinalisation = { tour, texte, ideeCentrale: ecrit.idee_centrale, png, detoure: null, verdict: null, raisons: [] };
    const d = await deps.detourer(png);
    if (!d.ok) { e.raisons = [d.why]; return e; }
    e.detoure = d.png;
    const surBlanc = await sharp(d.png).flatten({ background: "#FFFFFF" }).png().toBuffer();
    e.verdict = await deps.relire(surBlanc, o.esquisse, demandeAuRelecteurDuLogo({ nom: o.nom, metier: o.metier, texte, ...(o.phrase ? { phrase: o.phrase } : {}) }), tour);
    e.raisons = raisonsDuRefus(e.verdict, o.nom, o.phrase);
    const ecartee = noteEcartee(e.verdict);
    if (ecartee) notes.push(`logo ${tour} : ${ecartee}`);
    const finitions = finitionsNotees(e.verdict);
    if (finitions) notes.push(`logo ${tour} : ${finitions}`);
    return e;
  };
  const premier = await essai(1, ecrit.texte, o.esquisse);
  essais.push(premier);
  if (!premier.raisons.length) return { ok: true, logo: premier.png!, detoure: premier.detoure!, texte: premier.texte, essais, notes };
  notes.push(`logo refusé (${premier.raisons.join(" ; ")}) : refait une fois, à la charge du Studio, à partir du logo refusé, avec les corrections au début du texte`);
  const second = await deps.aLaChargeDuStudio(() => essai(2, texteDeReprise(premier.raisons, ecrit.texte, finitionsDe(premier)), premier.png!));
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
  // La reprise part de la retouche refusée ; le relecteur compare toujours au logo d'origine, référence de l'idée.
  const essai = async (tour: number, t: string, jointe: Buffer): Promise<EssaiDeFinalisation> => {
    const png = await deps.finaliser(jointe, t, tour);
    const e: EssaiDeFinalisation = { tour, texte: t, ideeCentrale: "", png, detoure: null, verdict: null, raisons: [] };
    const d = await deps.detourer(png);
    if (!d.ok) { e.raisons = [d.why]; return e; }
    e.detoure = d.png;
    const surBlanc = await sharp(d.png).flatten({ background: "#FFFFFF" }).png().toBuffer();
    e.verdict = await deps.relire(surBlanc, o.logo, demandeAuRelecteurDuLogo({ nom: o.nom, metier: o.metier, texte: t, ...(o.phrase ? { phrase: o.phrase } : {}) }), tour);
    e.raisons = raisonsDuRefus(e.verdict, o.nom, o.phrase);
    const finitions = finitionsNotees(e.verdict);
    if (finitions) notes.push(`retouche ${tour} : ${finitions}`);
    return e;
  };
  const premier = await essai(1, texte, o.logo);
  essais.push(premier);
  if (!premier.raisons.length) return { ok: true, logo: premier.png!, detoure: premier.detoure!, texte, essais, notes };
  const second = await deps.aLaChargeDuStudio(() => essai(2, texteDeReprise(premier.raisons, texte, finitionsDe(premier)), premier.png!));
  essais.push(second);
  return second.raisons.length ? { ok: false, raison: `refusé deux fois (${second.raisons.join(" ; ")})`, essais, notes } : { ok: true, logo: second.png!, detoure: second.detoure!, texte: second.texte, essais, notes };
}
