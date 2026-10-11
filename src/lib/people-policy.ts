/**
 * Règle de présence humaine (règle du propriétaire) : si le client n'a fourni AUCUNE image contenant une personne,
 * le studio n'introduit pas de personne dans ses images ni ses vidéos sans autorisation explicite. S'applique aux
 * moteurs, aux recherches d'images, aux publicités, aux sites et aux vidéos ; une personne ajoutée sans autorisation
 * fait REFUSER le média (code fatal `unauthorized_person` de la barrière de qualité), jamais publier.
 *
 * Autorisation (l'une ou l'autre) :
 *  - réglage du projet `settings.peopleAllowed === true` (accord explicite du client) ;
 *  - au moins une image fournie par le client (envoyée ou reprise de son site) marquée `meta.hasPerson === true`.
 *    Le studio n'invente aucune détection : ce repère est posé par le client, ou par la lecture de ses propres photos
 *    quand l'IA de vision les a déjà regardées (photos de l'activité, entreprise de services).
 */
import { json, one } from "./db";

/** Réglage du projet (absent du type `ProjectSettings` pour l'instant : lu ici avec un type local). */
type PeopleSettings = { peopleAllowed?: boolean };

/** Le client a-t-il fourni une image contenant une personne (repère `hasPerson` posé sur l'image) ? */
export function clientImageWithPerson(projectId: string): boolean {
  try {
    return !!one(
      "SELECT 1 FROM assets WHERE project_id = ? AND origin IN ('upload','site') AND deleted_at IS NULL AND json_extract(meta, '$.hasPerson') = 1 LIMIT 1",
      projectId,
    );
  } catch {
    return false;
  }
}

/** Personnes autorisées pour ce projet. Sans projet (ou en cas de doute) : non autorisées. */
export function peopleAllowed(projectId: string | null | undefined): boolean {
  if (!projectId) return false;
  try {
    const row = one<{ settings_json: string | null }>("SELECT settings_json FROM projects WHERE id = ?", projectId);
    if (json<PeopleSettings>(row?.settings_json ?? null, {}).peopleAllowed === true) return true;
  } catch {
    return false;
  }
  return clientImageWithPerson(projectId);
}

/** Même règle à partir d'un projet déjà chargé (réglages lus sans nouvelle requête). */
export function peopleAllowedFor(p: { id: string; settings?: unknown }): boolean {
  if ((p.settings as PeopleSettings | undefined)?.peopleAllowed === true) return true;
  return clientImageWithPerson(p.id);
}

/** Clause des consignes de génération (modèles d'images et de vidéo : en anglais). */
export const NO_PEOPLE_EN = "No people: no person, no face, no hands, no body parts, no silhouettes, no reflections of people, no mannequins with faces; show only places, objects, tools, materials and results.";

/** Mots qui désignent une personne (ou une partie du corps) dans une description de banque d'images ou une consigne. */
export const PERSON_RE =
  /\b(man|men|woman|women|person|persons|people|human|humans|worker|workers|craftsm[ae]n|craftswom[ae]n|artisans?|professionals?|girls?|boys?|child|children|kids?|baby|babies|faces?|portraits?|selfie|hands?|fingers?|arms?|team|staff|clients?|customers?|couples?|family|lady|ladies|guys?|models?|owners?|guests?|patients?|students?|someone|plasterers?|painters?|decorators?|tilers?|plumbers?|electricians?|carpenters?|joiners?|bricklayers?|masons?|roofers?|gardeners?|landscapers?|mechanics?|hairdressers?|barbers?|beauticians?|therapists?|physiotherapists?|chefs?|cooks?|bakers?|waiters?|waitress|photographers?|technicians?|trainers?|coach|architects?|builders?|locksmiths?|glaziers?|advisors?|caterers?|wearing)\b/i;

/** Le texte parle-t-il d'une personne ? */
export const mentionsPerson = (text: string | null | undefined) => !!text && PERSON_RE.test(text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""));

/** Retire d'une requête les mots qui désignent une personne (« plasterer plastering wall » → « plastering wall »). */
export function withoutPeopleWords(query: string): string {
  return query
    .split(/\s+/)
    .filter((w) => w && !PERSON_RE.test(w.toLowerCase()))
    .join(" ")
    .trim();
}

/** Requêtes de banque d'images sans personne : mots de personne retirés, requêtes vides ou d'un seul mot écartées. */
export function peopleFreeQueries(queries: string[]): string[] {
  return [...new Set(queries.map(withoutPeopleWords).filter((q) => q.split(" ").length >= 2))];
}

/**
 * Consigne des contrôles visuels (en français) : demande le champ `personVisible`. Quand les personnes ne sont pas
 * autorisées, toute personne visible est un échec rédhibitoire.
 */
export function personCheckFr(allowed: boolean): string {
  return allowed
    ? "« personVisible » : vrai si une personne (visage, main, corps, silhouette) est visible."
    : "Présence humaine NON autorisée par le client : « personVisible » = vrai si une personne, un visage, une main, un bras, un corps, une silhouette ou un reflet de personne est visible, même flou ou partiel ; dans ce cas l'image est refusée.";
}

/** Consigne équivalente pour les relectures rédigées en anglais. */
export function personCheckEn(allowed: boolean): string {
  return allowed
    ? 'People are allowed for this project; still set "personVisible" to true when a person is visible.'
    : 'People are NOT allowed for this project: set "personVisible" to true if any person, face, hand, arm, body, silhouette or reflection of a person is visible, even blurred or partial — the image will then be rejected.';
}

/** Code fatal de la barrière : personne visible alors qu'elle n'est pas autorisée. */
export const UNAUTHORIZED_PERSON = "unauthorized_person";

/** Code à ajouter selon la relecture (rien quand les personnes sont autorisées). */
export const personCodes = (personVisible: boolean | null | undefined, allowed: boolean): string[] => (!allowed && personVisible === true ? [UNAUTHORIZED_PERSON] : []);

/** Requêtes à envoyer aux banques : inchangées si les personnes sont autorisées, sinon sans mots de personne. */
export function queriesFor(queries: string[], allowed: boolean): string[] {
  if (allowed) return queries;
  const free = peopleFreeQueries(queries);
  return free.length ? free : queries;
}

/** Consigne des rédacteurs de requêtes de banque d'images (anglais). */
export const NO_PEOPLE_QUERY_EN = " The scene must contain no people: describe places, tools, materials and finished results only.";
