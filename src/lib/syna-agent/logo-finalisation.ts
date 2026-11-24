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
 *    l'esquisse est perdue, si le logo est trop proche de l'esquisse sans évolution, s'il y a une arche, s'il y a une
 *    phrase inventée qui ne dit pas le vrai métier, ou si sa note est sous 8 sur 10 (décision du chef). En plus, gratuits :
 *    le fond se retire proprement (garde `detourerLeLogo`) ; l'écart mesuré entre l'esquisse et le logo lui est donné
 *    comme indice. Refusé : refait UNE fois, avec toutes les raisons à la fin du texte. Refusé deux fois : l'identité
 *    n'est pas construite, SINA le dit et propose une autre esquisse.
 * Les couleurs du client ne vont jamais au dessinateur : rien ici ne les lit.
 */
import sharp from "sharp";
import { z } from "zod";
import { NOTE_DU_PROPRIETAIRE } from "./note-du-proprietaire";
import { nomExact } from "./esquisses";

// ---------------------------------------------------------------- 5. le texte de finalisation

/** La ligne ajoutée à la consigne de finaliser.py (plan accepté du 24 novembre 2026). */
export const LIGNE_D_EVOLUTION = "- demande toujours de faire évoluer l'idée de l'esquisse vers une identité plus aboutie et plus distinctive, jamais de seulement la nettoyer ou l'agrandir ;";

/** La fin attendue du texte (la consigne de finaliser.py, mot pour mot). */
export const FIN_DU_TEXTE = "style vectoriel, fond blanc uni, pas de maquette, pas d'ombre, pas d'effet 3D, pas de texture réaliste, pas de dégradé excessif";
/** Le début attendu du texte. */
export const debutDuTexte = (nom: string, metier: string) => `Transforme cette esquisse en véritable logo contemporain pour ${nom}, ${metier}.`;

/**
 * LA CONSIGNE DU RÉDACTEUR : celle de finaliser.py, MOT POUR MOT (le nom et le métier y sont mis), plus la ligne
 * d'évolution, placée avec les autres demandes, avant « N'ajoute aucune idée ».
 */
export function consigneDeFinalisation(nom: string, metier: string): string {
  return `Tu es la directrice artistique d'un studio de création de marques. Le client ${nom} (${metier}) a choisi
l'esquisse de logo jointe parmi douze. Tu écris le texte qui sera envoyé tel quel à un modèle d'image pour transformer
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
N'ajoute aucune idée qui n'est pas dans l'esquisse. Dix phrases au plus.
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

/** Le contrôle gratuit du texte écrit par le rédacteur. Une liste vide : bon. */
export function controleDuTexte(texte: string, nom: string, metier: string): string[] {
  const t = plat(texte), fautes: string[] = [];
  if (!t.startsWith(plat(debutDuTexte(nom, metier)))) fautes.push(`il doit commencer exactement par « ${debutDuTexte(nom, metier)} »`);
  if (!t.replace(/[.\s]+$/, "").toLowerCase().endsWith(plat(FIN_DU_TEXTE).toLowerCase())) fautes.push(`il doit finir exactement par « ${FIN_DU_TEXTE} »`);
  const n = phrasesDe(t).length;
  if (n > 10) fautes.push(`dix phrases au plus (il en a ${n})`);
  if (!EVOLUTION.test(t)) fautes.push("il doit demander de faire évoluer l'idée de l'esquisse vers une identité plus aboutie et plus distinctive");
  return fautes;
}

// ---------------------------------------------------------------- 6. la relecture du logo fini

export const RelectureDuLogoSchema = z.object({
  nomLu: z.string().max(80).default(""),
  ideeConservee: z.boolean().catch(false),
  evolution: z.boolean().catch(false),
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
- evolution : le logo a vraiment évolué vers une identité plus aboutie et plus distinctive (faux s'il n'est qu'une copie nettoyée ou agrandie de l'esquisse) ;
- arche : le dessin est posé dans une arche, une demi-lune ou un cadre arrondi en arc ;
- phrase : toute phrase écrite dans le logo en plus du nom (vide s'il n'y en a pas) ;
- phraseDitLeMetier : cette phrase dit exactement le vrai métier donné ci-dessous (faux si elle invente autre chose) ;
- note : ta note de 0 à 10 face aux logos des meilleures agences ;
- pourquoi : une ou deux phrases simples.`;

export function demandeAuRelecteurDuLogo(o: { nom: string; metier: string; texte: string; ecart: number | null }): string {
  return [
    `Marque : « ${o.nom} ». Son vrai métier : ${o.metier}.`,
    `Le texte envoyé au dessinateur : « ${o.texte} »`,
    o.ecart != null ? `Indice mesuré par le Studio : l'écart entre l'esquisse et le logo vaut ${Math.round(o.ecart * 100)} sur 100 (0 : identiques).` : "",
  ].filter(Boolean).join("\n");
}

/** Un écart sous ce seuil (sur 100) est donné comme « très proche » au relecteur ; jamais un refus à lui seul. */
export const ECART_TRES_PROCHE = 0.04;
/**
 * L'écart mesuré entre l'esquisse et le logo fini (0 : identiques, 1 : tout diffère), gratuit : chacun recadré sur son
 * dessin, posé sur 128 × 128 en niveaux de gris, différence moyenne. Un simple indice pour le relecteur.
 */
export async function ecartMesure(esquisse: Buffer, logo: Buffer): Promise<number> {
  const prep = async (b: Buffer) => {
    const blanc = await sharp(b).flatten({ background: "#FFFFFF" }).png().toBuffer();
    const t = await sharp(blanc).trim({ background: "#FFFFFF", threshold: 20 }).png().toBuffer().catch(() => blanc);
    return (await sharp(t).resize(128, 128, { fit: "contain", background: "#FFFFFF" }).greyscale().raw().toBuffer());
  };
  const [a, b] = await Promise.all([prep(esquisse), prep(logo)]);
  let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]);
  return Math.min(1, s / (a.length * 255));
}

/** Les raisons du refus d'un logo fini (les cinq raisons du plan, plus la note de 8). Vide : gardé. */
export function raisonsDuRefus(v: RelectureDuLogo, nom: string): string[] {
  const r: string[] = [];
  if (!nomExact(v.nomLu, nom)) r.push(v.nomLu ? `le nom est mal écrit (« ${v.nomLu} » au lieu de « ${nom} »)` : `le nom « ${nom} » n'y est pas écrit`);
  if (!v.ideeConservee) r.push("l'idée de l'esquisse est perdue");
  if (!v.evolution) r.push("le logo est trop proche de l'esquisse, sans évolution");
  if (v.arche) r.push("le dessin est posé dans une arche");
  if (v.phrase.trim() && !v.phraseDitLeMetier) r.push(`la phrase « ${v.phrase.trim()} » est inventée et ne dit pas le vrai métier`);
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
export type EssaiDeFinalisation = { tour: number; texte: string; ideeCentrale: string; png: Buffer | null; detoure: Buffer | null; verdict: RelectureDuLogo | null; ecart: number | null; raisons: string[] };
export type Finalisation = { ok: true; logo: Buffer; detoure: Buffer; texte: string; essais: EssaiDeFinalisation[]; notes: string[] }
  | { ok: false; raison: string; essais: EssaiDeFinalisation[]; notes: string[] };

/**
 * Une esquisse choisie devient un logo fini : le texte écrit (et contrôlé), le logo dessiné, relu ; refusé une fois, il
 * est refait avec toutes les raisons à la fin du texte, à la charge du Studio ; refusé deux fois, il n'est pas gardé.
 * Une panne du fournisseur n'est jamais relancée toute seule (l'erreur remonte, le parcours le dit).
 */
export async function finaliserUneEsquisse(deps: FinalisationDeps, o: { nom: string; metier: string; esquisse: Buffer }): Promise<Finalisation> {
  const notes: string[] = [], essais: EssaiDeFinalisation[] = [];
  const consigne = consigneDeFinalisation(o.nom, o.metier);
  let ecrit = await deps.rediger(consigne, o.esquisse, 1);
  let fautes = controleDuTexte(ecrit.texte, o.nom, o.metier);
  if (fautes.length) {
    notes.push(`texte de finalisation réécrit à la charge du Studio : ${fautes.join(" ; ")}`);
    ecrit = await deps.aLaChargeDuStudio(() => deps.rediger(`${consigne}\n\nTon premier texte ne convenait pas : ${fautes.join(" ; ")}. Réécris-le.`, o.esquisse, 2));
    fautes = controleDuTexte(ecrit.texte, o.nom, o.metier);
    if (fautes.length) return { ok: false, raison: `le texte de finalisation ne tient pas la forme attendue (${fautes.join(" ; ")})`, essais, notes };
  }
  const essai = async (tour: number, texte: string): Promise<EssaiDeFinalisation> => {
    const png = await deps.finaliser(o.esquisse, texte, tour);
    const e: EssaiDeFinalisation = { tour, texte, ideeCentrale: ecrit.idee_centrale, png, detoure: null, verdict: null, ecart: null, raisons: [] };
    const d = await deps.detourer(png);
    if (!d.ok) { e.raisons = [d.why]; return e; }
    e.detoure = d.png;
    e.ecart = await ecartMesure(o.esquisse, png).catch(() => null);
    const surBlanc = await sharp(d.png).flatten({ background: "#FFFFFF" }).png().toBuffer();
    e.verdict = await deps.relire(surBlanc, o.esquisse, demandeAuRelecteurDuLogo({ nom: o.nom, metier: o.metier, texte, ecart: e.ecart }), tour);
    e.raisons = raisonsDuRefus(e.verdict, o.nom);
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
