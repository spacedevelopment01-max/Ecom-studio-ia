/**
 * Les preuves RÉELLES du dossier d'un client (cahier « ordre et variété », partie 1 : « aucune section qui demande un
 * contenu que le client n'a pas (avis, presse, chiffres, photos de clients) »). Sans IA.
 *
 * Le concepteur reçoit cette liste : un moment de la partition dont la preuve manque est sauté, pas rempli. SINA
 * demande ces preuves au client avant de créer le site (consigne de l'étape 6) et note chaque réponse avec son outil de
 * mémoire ; ces notes, les faits confirmés de la carte « Ton activité » et les données du Studio (avis d'une vraie
 * source, équipe, réalisations) sont lus ici. La lecture se fait par mots : une note qui dit « aucun », « pas encore »
 * ou « non » n'est jamais prise pour une preuve.
 */
import type { PreuveId } from "./tenue-ordre";

export type PreuveInfo = { id: PreuveId; label: string; /** Ce que SINA demande au client, en règle générale. */ demande: string; mots: RegExp };

export const PREUVES: PreuveInfo[] = [
  { id: "avis", label: "des avis réels de clients", demande: "les avis déjà reçus (où, combien, leurs mots exacts)", mots: /(?<!\p{L})(?:avis|témoignages?|recommandations?|étoiles|note (?:moyenne|sur|google))(?!\p{L})/iu },
  { id: "realisations", label: "des réalisations réelles (photos, lieu, date)", demande: "les réalisations qu'il peut montrer (photos, lieu, date)", mots: /(?<!\p{L})(?:réalisations?|chantiers? (?:réalisés?|terminés?|faits?)|travaux réalisés|portfolio|book)(?!\p{L})/iu },
  { id: "avant-apres", label: "de vraies photos avant et après", demande: "ses vraies photos avant et après", mots: /avant\s*(?:et|\/|,|-)?\s*après/iu },
  { id: "qualifications", label: "des assurances, diplômes, labels ou certifications", demande: "son assurance, ses diplômes, ses labels ou certifications", mots: /(?<!\p{L})(?:assur\p{L}*|décennale|responsabilité civile|diplôm\p{L}*|certifi\p{L}*|labels?|qualifi\p{L}*|agré\p{L}*|brevets?|titre professionnel|habilitation\p{L}*)(?!\p{L})/iu },
  { id: "anciennete", label: "une ancienneté datée", demande: "depuis quand il exerce", mots: /(?:depuis (?:\d{4}|\d+\s*ans)|ancienneté|ans d['’]expérience|années d['’]expérience|(?:créée?|fondée?|installée?|ouverte?) en \d{4})/iu },
  { id: "chiffres", label: "des chiffres vrais donnés par le client", demande: "ses chiffres vrais (ce qu'il peut compter et prouver)", mots: /(?<!\p{L})(?:chiffres?|\d{2,}\s+(?:clients?|chantiers?|interventions?|commandes?|ventes?|projets?|élèves|couverts|réparations?))(?!\p{L})/iu },
  { id: "presse", label: "des parutions réelles dans la presse", demande: "ses parutions dans la presse", mots: /(?<!\p{L})(?:presse|parutions?|paru (?:dans|sur)|articles? (?:dans|du|de la|sur)|magazines?|journal local|reportages?)(?!\p{L})/iu },
  { id: "documents", label: "des documents à montrer (analyses, certificats, fiches)", demande: "les documents qu'il peut montrer", mots: /(?<!\p{L})(?:analyses?|certificats?|rapports? d['’]essai|fiches? (?:techniques?|de sécurité|du producteur)|attestations?)(?!\p{L})/iu },
  { id: "equipe", label: "une équipe réelle (prénoms, rôles)", demande: "les personnes de son équipe", mots: /(?<!\p{L})(?:équipe|salarié\p{L}*|associé\p{L}*|collaborat\p{L}*|apprenti\p{L}*)(?!\p{L})/iu },
  { id: "clients", label: "des clients entreprises qu'il peut citer", demande: "les clients entreprises qu'il a le droit de citer", mots: /(?<!\p{L})(?:clients? (?:entreprises?|professionnels?|pros)|références? clients?|ils nous font confiance)(?!\p{L})/iu },
];
const PAR_ID = new Map(PREUVES.map((p) => [p.id, p]));
export const preuveLabel = (id: PreuveId) => PAR_ID.get(id)?.label ?? id;

/** « aucun », « pas encore », « non », « sans », « rien » : le client a répondu qu'il n'en a pas. */
const ABSENT = /^(?:\W*)(?:non|aucune?s?|pas (?:encore|d['’e]|pour)|sans|rien|néant|zéro|0)(?!\p{L})/iu;

export type DossierLine = { title?: string | null; value: string };
/**
 * Preuves trouvées dans des lignes du dossier (notes du client, faits confirmés). Une ligne compte pour une preuve
 * quand son titre ou son texte en porte les mots, et que sa réponse n'est pas « aucun ». Rend aussi les preuves que le
 * client a dit ne PAS avoir (elles ne se redemandent pas).
 */
export function preuvesDansLignes(lines: DossierLine[]): { a: Map<PreuveId, string>; pas: Set<PreuveId> } {
  const a = new Map<PreuveId, string>(), pas = new Set<PreuveId>();
  for (const l of lines) {
    const value = (l.value ?? "").replace(/\s+/g, " ").trim(), title = (l.title ?? "").trim();
    if (!value && !title) continue;
    for (const p of PREUVES) {
      const inTitle = p.mots.test(title), inValue = p.mots.test(value);
      if (!inTitle && !inValue) continue;
      // « avis : aucun pour l'instant » ; « pas d'assurance décennale »
      const absent = ABSENT.test(value) || (inValue && new RegExp(`(?:pas (?:encore )?d['’e]\\s?|aucune?s?\\s|sans\\s)(?:\\p{L}+\\s){0,2}${p.mots.source}`, "iu").test(value));
      if (absent) { if (!a.has(p.id)) pas.add(p.id); continue; }
      if (!a.has(p.id)) a.set(p.id, (title ? `${title} : ${value}` : value).slice(0, 200));
      pas.delete(p.id);
    }
  }
  return { a, pas };
}

export type Preuves = {
  /** Preuves réelles au dossier, avec la ligne qui les porte. */
  a: { id: PreuveId; label: string; detail: string }[];
  /** Preuves absentes du dossier : aucun moment qui en dépend. */
  manque: { id: PreuveId; label: string }[];
  ids: Set<PreuveId>;
};
/** Range ce qui a été trouvé : ce que le dossier a, et ce qu'il n'a pas. `extra` : preuves constatées dans les données du Studio. */
export function preuvesDe(lines: DossierLine[], extra: Partial<Record<PreuveId, string>> = {}): Preuves {
  const found = preuvesDansLignes(lines).a;
  for (const [id, detail] of Object.entries(extra) as [PreuveId, string][]) if (detail) found.set(id, detail);
  const a = PREUVES.filter((p) => found.has(p.id)).map((p) => ({ id: p.id, label: p.label, detail: found.get(p.id)! }));
  return { a, manque: PREUVES.filter((p) => !found.has(p.id)).map((p) => ({ id: p.id, label: p.label })), ids: new Set(a.map((x) => x.id)) };
}

/** Ce qui est dit au concepteur et aux juges. */
export function preuvesBrief(p: Preuves): string {
  return [
    `PREUVES RÉELLES AU DOSSIER (les seules qu'une section peut montrer) : ${p.a.length ? p.a.map((x) => `${x.label} (« ${x.detail} »)`).join(" ; ") : "aucune pour l'instant"}.`,
    `PREUVES ABSENTES DU DOSSIER : ${p.manque.map((x) => x.label).join(" ; ") || "aucune"}. Un moment d'une partition qui en dépend est SAUTÉ, jamais rempli, jamais remplacé par la marque qui se cite elle-même. Sans vraie preuve, la confiance vient des faits vrais du dossier (ce que le client garantit, sa façon de travailler, ses prix clairs).`,
  ].join("\n");
}

/** La question des preuves que SINA pose avant de créer le site (règle générale, sans exemple de métier). */
export const QUESTION_DES_PREUVES = `LES PREUVES, AVANT DE LANCER : le site ne montre que de vraies preuves, et une partie de la page qui en dépend n'existe pas sans elles. Demande donc au client, simplement et une question à la fois, ce qu'il a déjà et que tu ne sais pas encore : ${PREUVES.map((p) => p.demande).join(" ; ")}. Note chaque réponse avec memory.note, sous un titre qui dit la preuve (« avis », « assurance », « diplômes », « depuis quand », « chiffres », « réalisations », « presse », « équipe », « clients entreprises ») et avec ses mots exacts ; s'il n'en a pas, note-le aussi (« aucun pour l'instant ») : cela ne se redemande pas. Ne lui en suggère aucune et n'en invente jamais : sans avis, ton site n'aura pas de partie « avis », et tu le lui dis.`;
