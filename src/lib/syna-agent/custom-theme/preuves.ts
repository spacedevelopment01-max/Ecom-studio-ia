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
import { REGLE_PERSONNES } from "../../people-policy";

/** Les preuves que SINA crée quand le client n'en a pas assez (règle des artisans) : jamais « absentes, moment sauté ». */
export const PREUVES_CREEES: PreuveId[] = ["realisations"];

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
/**
 * Les FAITS du dossier qu'une pièce demande pour exister (module « partitions », 17 novembre 2026) : une offre de
 * première visite, des délais, des conditions d'annulation, une privatisation, des comptes sur les réseaux, des
 * horaires, une adresse à montrer, l'accès. Ce ne sont pas des preuves, mais la règle est la même : sans eux au dossier,
 * la pièce ne se pose pas et le moment est sauté. Les trois derniers et les réseaux se constatent aussi dans les
 * données du Studio (profil des services, site existant lu), données en « extra » à `preuvesDe` ; les horaires et
 * l'adresse ne viennent QUE de là (c'est le profil qui les pose dans la page).
 */
export const FAITS: PreuveInfo[] = [
  { id: "offre-visite", label: "une offre de première visite que le client fait vraiment", demande: "s'il fait une offre à ceux qui viennent pour la première fois, et laquelle (sans lui en suggérer)", mots: /(?:premi[èe]re (?:visite|séance|fois|consultation|venue)|(?:offre|séance|cours|bilan) (?:de bienvenue|découverte|d['’]essai)|(?:séance|cours|bilan|essai) (?:offerte?|gratuite?))/iu },
  { id: "delais", label: "ses délais réels (rappel, visite, devis, chantier, réponse)", demande: "ses délais réels : sous combien de temps il rappelle, vient voir, envoie son devis, commence", mots: /(?<!\p{L})(?:délais?|(?:rappel\p{L}*|répon\p{L}*|devis|visite|interv\p{L}*) (?:sous|dans les|en moins de)|sous \d+\s*(?:h|heures?|jours?|semaines?))(?!\p{L})/iu },
  { id: "annulation", label: "ses conditions d'annulation, de retard ou d'acompte", demande: "ce qui se passe quand un rendez-vous est annulé, déplacé ou manqué, et s'il prend un acompte", mots: /(?<!\p{L})(?:annul\p{L}*|report\p{L}*|acomptes?|arrhes|désistement\p{L}*|rendez-vous manqué\p{L}*)(?!\p{L})/iu },
  { id: "privatisation", label: "une privatisation de son lieu pour les groupes", demande: "s'il réserve son lieu à des groupes, pour combien de personnes et à quelles conditions", mots: /(?<!\p{L})(?:privatis\p{L}*|location de (?:la )?salle|(?:repas|soirées?|évènements?|événements?|réceptions?) (?:de groupe|privée?s?|d['’]entreprise)|séminaires?)(?!\p{L})/iu },
  { id: "reseaux", label: "ses comptes sur les réseaux", demande: "ses comptes sur les réseaux, avec leur nom exact ou leur lien", mots: /(?<!\p{L})(?:instagram|facebook|tiktok|linkedin|pinterest|youtube)(?!\p{L})[^\n]{0,40}(?:@[\w.]{2,}|\.com\/)|(?:instagram|facebook|tiktok|linkedin|pinterest|youtube)\.com\/[\w.@-]{2,}/iu },
  { id: "horaires", label: "ses horaires", demande: "ses jours et ses heures d'ouverture", mots: /(?!)/u },
  { id: "adresse", label: "une adresse où l'on vient, qu'il veut montrer", demande: "l'adresse où ses clients viennent, s'il veut la montrer", mots: /(?!)/u },
  { id: "acces", label: "l'accès à son lieu (stationnement, transports, accès sur place)", demande: "comment on vient chez lui : où se garer, l'arrêt le plus proche, l'accès sur place", mots: /(?<!\p{L})(?:stationn\p{L}*|parkings?|se garer|arrêt (?:de )?(?:bus|tram\p{L}*|métro)|métro|accès (?:en fauteuil|pmr|handicap\p{L}*|de plain-pied)|ascenseur)(?!\p{L})/iu },
];
const TOUT: PreuveInfo[] = [...PREUVES, ...FAITS];
const PAR_ID = new Map(TOUT.map((p) => [p.id, p]));
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
    for (const p of TOUT) {
      const inTitle = p.mots.test(title), inValue = p.mots.test(value);
      if (!inTitle && !inValue) continue;
      // « avis : aucun pour l'instant » ; « pas d'assurance décennale »
      // Un fait rangé sous son propre titre (« annulation : gratuite jusqu'à la veille, pas d'acompte ») est bien donné.
      const absent = ABSENT.test(value) || (inValue && !(inTitle && FAITS.includes(p)) && new RegExp(`(?:pas (?:encore )?d['’e]\\s?|aucune?s?\\s|sans\\s)(?:\\p{L}+\\s){0,2}${p.mots.source}`, "iu").test(value));
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
  /** Faits du dossier qu'une pièce demande pour exister (offre de première visite, délais, réseaux, horaires…). */
  faits: { id: PreuveId; label: string; detail: string }[];
  faitsAbsents: { id: PreuveId; label: string }[];
  /** Preuves ET faits au dossier. */
  ids: Set<PreuveId>;
};
/** Range ce qui a été trouvé : ce que le dossier a, et ce qu'il n'a pas. `extra` : preuves constatées dans les données du Studio. */
export function preuvesDe(lines: DossierLine[], extra: Partial<Record<PreuveId, string>> = {}): Preuves {
  const found = preuvesDansLignes(lines).a;
  for (const [id, detail] of Object.entries(extra) as [PreuveId, string][]) if (detail) found.set(id, detail);
  // « a » et « manque » ne parlent que des preuves ; « faits » de ce qu'une pièce demande d'autre ; « ids » réunit les deux.
  const a = PREUVES.filter((p) => found.has(p.id)).map((p) => ({ id: p.id, label: p.label, detail: found.get(p.id)! }));
  const faits = FAITS.filter((p) => found.has(p.id)).map((p) => ({ id: p.id, label: p.label, detail: found.get(p.id)! }));
  return { a, manque: PREUVES.filter((p) => !found.has(p.id)).map((p) => ({ id: p.id, label: p.label })), faits, faitsAbsents: FAITS.filter((p) => !found.has(p.id)).map((p) => ({ id: p.id, label: p.label })), ids: new Set([...a, ...faits].map((x) => x.id)) };
}

/** Une note qui parle des preuves en général (« preuves : aucune pour l'instant », « rien à montrer »). */
const NOTE_GENERALE = /(?<!\p{L})preuves?(?!\p{L})/iu;
/**
 * La question des preuves a-t-elle reçu une RÉPONSE du client ? (deuxième essai réel, 17 novembre 2026 : le site a été
 * créé sans que la question soit posée.) Vrai quand ses notes portent au moins une preuve, une preuve qu'il a dit ne
 * pas avoir, ou une note générale sur ses preuves. Les faits qu'une pièce demande (horaires, délais, accès) ne
 * comptent pas : ce ne sont pas des preuves.
 */
export function preuvesDemandees(lines: DossierLine[]): boolean {
  const found = preuvesDansLignes(lines), ids = new Set(PREUVES.map((p) => p.id));
  return [...found.a.keys(), ...found.pas].some((id) => ids.has(id)) || lines.some((l) => NOTE_GENERALE.test(l.title ?? "") || (NOTE_GENERALE.test(l.value ?? "") && ABSENT.test((l.value ?? "").trim())));
}
/** La façon de demander ses preuves (une seule source : le refus de lancer et la question de l'étape du site). */
const PREUVES_ENSEMBLE = ", simplement, en UN ou deux messages au plus : ces questions ENSEMBLE, numérotées et courtes (il répond en une fois, même en quelques mots ; tu ne redemandes ensuite que ce qui reste flou ; essai réel du 19 novembre 2026 : posées une à une, elles avaient pris douze messages)";
/**
 * Refus de créer le site tant que la question des preuves n'a pas eu de réponse (message pour SINA seule, jamais montré
 * au client). `null` : le site peut se créer.
 */
export function refusSansPreuves(o: { preuves: number; repondu: boolean }): string | null {
  if (o.preuves > 0 || o.repondu) return null;
  return `Le site n'est pas lancé et rien n'est payé : le dossier ne contient AUCUNE preuve, et le client n'a pas encore répondu à la question des preuves. Demande-lui d'abord ses vraies preuves${PREUVES_ENSEMBLE} : ${PREUVES.map((p) => p.demande).join(" ; ")}. Note chaque réponse avec start.note (portee « site »), sous un sujet qui dit la preuve, avec ses mots exacts. S'il n'en a aucune, note-le (start.note, sujet « preuves », valeur « aucune pour l'instant ») puis relance site.create : son site se créera sans partie « preuves », et tu le lui dis. Ne lui en suggère aucune, n'en invente jamais.`;
}

/** Ce qui est dit au concepteur et aux juges. */
export function preuvesBrief(p: Preuves): string {
  return [
    `PREUVES RÉELLES AU DOSSIER (les seules qu'une section peut montrer) : ${p.a.length ? p.a.map((x) => `${x.label} (« ${x.detail} »)`).join(" ; ") : "aucune pour l'instant"}.`,
    `PREUVES ABSENTES DU DOSSIER : ${p.manque.filter((x) => !PREUVES_CREEES.includes(x.id)).map((x) => x.label).join(" ; ") || "aucune"}. Un moment d'une partition qui en dépend est SAUTÉ, jamais rempli, jamais remplacé par la marque qui se cite elle-même. Sans vraie preuve, la confiance vient des faits vrais du dossier (ce que le client garantit, sa façon de travailler, ses prix clairs).`,
    `CE QUE LE CLIENT A DONNÉ D'AUTRE, qu'une pièce demande pour exister : ${p.faits.length ? p.faits.map((x) => `${x.label} (« ${x.detail} »)`).join(" ; ") : "rien pour l'instant"}. NON DONNÉ : ${p.faitsAbsents.map((x) => x.label).join(" ; ") || "rien"}. Une pièce qui en dépend (offre de première visite, délais, annulation, privatisation, réseaux, horaires, adresse, accès) ne se pose JAMAIS sans ce que le client a donné : son moment est sauté.`,
    // Règle du propriétaire (10 et 14 novembre 2026, « on fait comme c'est ») : les réalisations d'un artisan que le dossier
    // n'a pas en assez grand nombre sont créées par SINA ; leur moment n'est jamais sauté faute de preuve.
    ...(p.manque.some((x) => PREUVES_CREEES.includes(x.id)) ? [`RÉALISATIONS (artisan ou service) : il n'en a pas assez au dossier ; SINA les crée pour son site. ${REGLE_PERSONNES}`] : []),
  ].join("\n");
}

/** La question des preuves que SINA pose avant de créer le site (règle générale, sans exemple de métier). */
export const QUESTION_DES_PREUVES = `LES PREUVES, AVANT DE LANCER : le site ne montre que de vraies preuves, et une partie de la page qui en dépend n'existe pas sans elles. Demande donc au client${PREUVES_ENSEMBLE}, ce qu'il a déjà et que tu ne sais pas encore : ${PREUVES.map((p) => p.demande).join(" ; ")}. Note chaque réponse avec start.note (portee « site »), sous un sujet qui dit la preuve (« avis », « assurance », « diplômes », « depuis quand », « chiffres », « réalisations », « presse », « équipe », « clients entreprises ») et avec ses mots exacts ; s'il n'en a pas, note-le aussi (« aucun pour l'instant ») : cela ne se redemande pas ; s'il n'a AUCUNE preuve du tout, note-le sous le titre « preuves » (« aucune pour l'instant »). Tant qu'aucune réponse n'est notée et que le dossier n'a aucune preuve, site.create refuse de se lancer. Ne lui en suggère aucune et n'en invente jamais : sans avis, ton site n'aura pas de partie « avis », et tu le lui dis. CE QUE CERTAINES PARTIES DEMANDENT EN PLUS (dans le même message que les preuves quand il reste de la place), seulement quand cela a un sens pour son métier et que tu ne le sais pas encore : ${FAITS.filter((p) => !["horaires", "adresse"].includes(p.id)).map((p) => p.demande).join(" ; ")}. Même règle : ses mots exacts, notés avec start.note sous un sujet clair (« offre de première visite », « délais », « annulation », « privatisation », « réseaux », « accès »), rien de suggéré, et « aucun » se note aussi.`;
