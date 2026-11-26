/**
 * CE QUE LE CLIENT LIT QUAND UN APPEL À L'IA TOMBE EN PANNE (décision du chef d'orchestre du 26 novembre 2026 : « Le client
 * ne doit jamais voir un identifiant de modèle, un texte technique ou une consigne qu'il ne peut pas suivre. »).
 *
 * Une erreur au résultat incertain (« Résultat incertain chez openai:… (Connection error.) … Vérifiez la consommation chez le
 * fournisseur ») ou une coupure du réseau pendant un appel à l'IA garde son texte technique pour le Studio : colonne `error`
 * de la tâche (page d'administration, tâches en échec), journal des erreurs, journal des appels. Le client, lui, ne lit
 * qu'une phrase de SINA, écrite par le code, tutoyée : ce qui est fait est gardé, ce qui n'a pas pu être créé et pourquoi en
 * mots simples, et qu'elle peut le refaire quand il veut. Aucun appel à l'IA ici.
 */
import { L } from "../i18n-server";

export type NatureDeLAppel = "image" | "video" | "texte";
export type ErreurTechniqueDeLIA = { nature: NatureDeLAppel; reseau: boolean };

/** Les textes que seul le Studio doit lire : résultat incertain, consigne au fournisseur, coupure du réseau du SDK. */
const INCERTAIN_RX = /R[ée]sultat incertain|Uncertain (web search )?result|V[ée]rifiez la consommation|Check the provider's usage/i;
const COUPURE_SDK_RX = /^(Connection error\.?|Request timed out\.?|Premature close|terminated|fetch failed|socket hang up|other side closed)$/i;
const RESEAU_RX = /Connection error|timed out|d[ée]lai d[ée]pass[ée]|timeout|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|ENOTFOUND|EPIPE|UND_ERR|socket hang up|fetch failed|other side closed|Premature close|terminated|network/i;
const NOMS_RESEAU_RX = /^API(Connection|ConnectionTimeout)Error$/;

function texteDe(e: unknown): string {
  const parts: string[] = [];
  let cur: any = e;
  for (let i = 0; cur != null && i < 5; i++) {
    parts.push(String(cur instanceof Error ? cur.message : typeof cur === "object" ? (cur.message ?? "") : cur));
    cur = typeof cur === "object" ? cur.cause : null;
  }
  return parts.join(" ← ");
}

/**
 * L'erreur est-elle celle d'un appel à l'IA dont le détail ne va jamais au client (résultat incertain, coupure du réseau) ?
 * Lit aussi un texte déjà enregistré (colonne `error` d'une tâche). `null` : une autre erreur, montrée comme avant.
 */
export function erreurTechniqueDeLIA(e: unknown): ErreurTechniqueDeLIA | null {
  if (e == null) return null;
  const o = typeof e === "object" ? (e as { uncertain?: unknown; nature?: unknown; name?: unknown; constructor?: { name?: string } }) : null;
  const texte = texteDe(e);
  const premier = String(e instanceof Error ? e.message : typeof e === "string" ? e : (o as { message?: unknown } | null)?.message ?? "").trim();
  const nom = typeof o?.name === "string" ? o.name : o?.constructor?.name ?? "";
  const incertain = o?.uncertain === true || INCERTAIN_RX.test(texte);
  const coupure = NOMS_RESEAU_RX.test(nom) || COUPURE_SDK_RX.test(premier);
  if (!incertain && !coupure) return null;
  const nature: NatureDeLAppel = o?.nature === "image" || o?.nature === "video" || o?.nature === "texte"
    ? o.nature
    : /vid[ée]o|video|sora|veo|kling|seedance|wan-?\d/i.test(texte) ? "video"
    : /image|dall-?e|flux|seedream|imagen|qwen-image/i.test(texte) ? "image"
    : "texte";
  return { nature, reseau: coupure || RESEAU_RX.test(texte) };
}

/** La phrase de SINA, tutoyée, sans identifiant ni mot technique. `nombre` : combien d'images (ou de vidéos) sont touchées. */
export function phraseDeSinaApresUnePanne(t: ErreurTechniqueDeLIA, nombre = 1): string {
  const n = Math.max(1, Math.round(nombre));
  const pourquoi = t.reseau ? L("à cause d'un problème de connexion", "because of a connection problem") : L("à cause d'un problème passager", "because of a temporary problem");
  const garde = L("J'ai gardé tout ce qui est fait.", "I kept everything that's done.");
  if (t.nature === "texte") return `${garde} ${L(`Une étape n'a pas pu se terminer, ${pourquoi} : je peux la reprendre quand tu veux.`, `One step couldn't finish ${pourquoi}: I can pick it up again whenever you like.`)}`;
  const image = t.nature === "image";
  if (n === 1) return `${garde} ${image
    ? L(`Une image n'a pas pu être créée, ${pourquoi} : je peux la refaire quand tu veux.`, `One image couldn't be created ${pourquoi}: I can redo it whenever you like.`)
    : L(`Une vidéo n'a pas pu être créée, ${pourquoi} : je peux la refaire quand tu veux.`, `One video couldn't be created ${pourquoi}: I can redo it whenever you like.`)}`;
  return `${garde} ${image
    ? L(`${n} images n'ont pas pu être créées, ${pourquoi} : je peux les refaire quand tu veux.`, `${n} images couldn't be created ${pourquoi}: I can redo them whenever you like.`)
    : L(`${n} vidéos n'ont pas pu être créées, ${pourquoi} : je peux les refaire quand tu veux.`, `${n} videos couldn't be created ${pourquoi}: I can redo them whenever you like.`)}`;
}

/** La phrase d'une nouvelle tentative automatique après une coupure (rien n'avait été payé) : sans le texte du réseau. */
export function phraseDeNouvelleTentative(secondes: number): string {
  return L(`Nouvelle tentative dans ${secondes} s, après un problème de connexion.`, `Retrying in ${secondes} s, after a connection problem.`);
}

/**
 * La cause d'une erreur, à glisser dans une phrase lue par le client (« photo non créée (…) ») : en mots simples pour un
 * appel à l'IA au résultat incertain ou coupé (« un problème de connexion »), sinon le message tel quel.
 */
export function causePourLeClient(e: unknown): string {
  const t = erreurTechniqueDeLIA(e);
  if (t) return t.reseau ? L("un problème de connexion", "a connection problem") : L("un problème passager", "a temporary problem");
  return String(e instanceof Error ? e.message : (e as { message?: unknown } | null)?.message ?? e);
}

/** Pour un texte d'erreur montré au client : la phrase de SINA s'il est technique, sinon le texte tel quel. */
export function pourLeClient(e: unknown, nombre = 1): string {
  const t = erreurTechniqueDeLIA(e);
  if (t) return phraseDeSinaApresUnePanne(t, nombre);
  return e instanceof Error ? e.message : String(e ?? "");
}
