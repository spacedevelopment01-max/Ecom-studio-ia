/**
 * Résumés des étapes du Pilote : enregistrés sous forme de clé + paramètres, traduits à l'affichage dans la
 * langue de l'interface de la personne qui lit (et non dans celle du moment où l'étape a tourné).
 * Les anciens résumés (texte déjà rédigé) restent affichés tels quels, nettoyés des mentions techniques.
 * Ce module ne dépend ni de Next ni de la base : utilisable côté serveur, worker et navigateur.
 */
import type { Lang } from "./i18n";

export type Bi = { fr: string; en: string };
type Param = string | number | Bi;
export type StepNote = string | { k: string; p?: Record<string, Param> } | Bi;

const isBi = (v: unknown): v is Bi => !!v && typeof v === "object" && typeof (v as Bi).fr === "string" && typeof (v as Bi).en === "string";
const s = (n: number, fr = "s") => (n > 1 ? fr : "");

const CATALOG: Record<string, (p: Record<string, string | number>, lang: Lang) => string> = {
  "sources.photos": (_, l) => (l === "en" ? "Photos received" : "Photos reçues"),
  "sources.description": (_, l) => (l === "en" ? "Description saved" : "Description enregistrée"),
  "sources.serviceDescription": (_, l) => (l === "en" ? "Business description saved" : "Description de l'activité enregistrée"),
  "cutout.done": ({ n }, l) => (l === "en" ? `${n} cutout${s(+n)} done` : `${n} détourage${s(+n)} réalisé${s(+n)}`),
  "analysis.product": ({ established, unknown, questions, ai }, l) => {
    const by = ai ? (l === "en" ? " — AI analysis" : " — analyse IA") : "";
    return l === "en"
      ? `${established} fact${s(+established)} established, ${unknown} unknown${s(+unknown)}, ${questions} question${s(+questions)}${by}`
      : `${established} information${s(+established)} établie${s(+established)}, ${unknown} inconnue${s(+unknown)}, ${questions} question${s(+questions)}${by}`;
  },
  "analysis.service": ({ services, facts, missing, ai }, l) => {
    const by = ai ? (l === "en" ? " — AI analysis" : " — analyse IA") : "";
    return l === "en"
      ? `${services} service${s(+services)}, ${facts} fact${s(+facts)} established${missing ? `; to complete: ${missing}` : ""}${by}`
      : `${services} prestation${s(+services)}, ${facts} information${s(+facts)} établie${s(+facts)}${missing ? ` ; à compléter : ${missing}` : ""}${by}`;
  },
  "brand.done": ({ name, direction }, l) => (l === "en" ? `${name} — ${direction} direction` : `${name} — direction ${direction}`),
  "copy.checked": (_, l) => (l === "en" ? "Copy written and checked" : "Textes rédigés et contrôlés"),
  "copy.toCheck": ({ n }, l) => (l === "en" ? `Copy written; ${n} point${s(+n)} for you to check` : `Textes rédigés ; ${n} point${s(+n)} à vérifier par vous`),
  "copy.base": (_, l) => (l === "en" ? "Base copy assembled — to be enriched" : "Textes de base assemblés — à enrichir"),
  "images.done": ({ n }, l) => (l === "en" ? `${n} image${s(+n)} created` : `${n} image${s(+n)} créée${s(+n)}`),
  "shop.theme": ({ n }, l) => (l === "en" ? `Theme version ${n} saved` : `Version ${n} du thème enregistrée`),
  "shop.site": ({ n }, l) => (l === "en" ? `Website version ${n} saved` : `Version ${n} du site enregistrée`),
  "shop.reproduced": ({ n }, l) => (l === "en" ? `Your website reproduced as is (version ${n})` : `Votre site reproduit à l'identique (version ${n})`),
  "calendar.started": (_, l) => (l === "en" ? "7-day calendar launched: posts to approve in the Calendar tab" : "Calendrier de 7 jours lancé : publications à valider dans l'onglet Calendrier"),
  "organize.done": ({ n, loose }, l) =>
    l === "en" ? `${n} file${s(+n)} organized into folders${+loose ? `, ${loose} to sort` : ""}` : `${n} fichier${s(+n)} rangé${s(+n)} par dossier${+loose ? `, ${loose} à classer` : ""}`,
  "skip.plan": (_, l) => (l === "en" ? "Included in the plans: choose a plan in “My account”, then run this step again" : "Inclus dans les forfaits : choisissez un forfait dans « Mon compte », puis relancez cette étape"),
  "skip.videosNone": (_, l) => (l === "en" ? "Videos not requested at launch: create them whenever you like in the Videos tab" : "Vidéos non demandées au lancement : créez-les quand vous voulez dans l'onglet Vidéos"),
  "skip.servicePhotos": ({ n }, l) => (l === "en" ? `${n} business photo${s(+n)} kept as they are` : `${n} photo${s(+n)} de l'activité gardée${s(+n)} telle${s(+n)} quelle${s(+n)}`),
  "skip.serviceNoPhoto": (_, l) => (l === "en" ? "No photo provided: you can add some in the Business tab" : "Aucune photo fournie : vous pourrez en ajouter dans l'onglet Activité"),
  "skip.noCutoutSite": (_, l) => (l === "en" ? "Waiting for a clear product photo (Product tab): visuals and videos are created next." : "En attente d'une photo nette du produit (onglet Produit) : les visuels et vidéos se créent ensuite."),
  "stopped": (_, l) => (l === "en" ? "Stopped at your request: restart whenever you like." : "Arrêtée à votre demande : relancez quand vous voulez."),
};

/** Note d'étape à enregistrer : clé du catalogue et paramètres. */
export const note = (k: keyof typeof CATALOG & string, p?: Record<string, Param>): StepNote => ({ k, p });

/** Anciens résumés en texte : retire les mentions techniques (« moteur local », identifiants internes). */
export function cleanLegacyNote(t: string): string {
  return t
    .replace(/\s*[—-]\s*(moteur local|local engine)\b/gi, "")
    .replace(/\s*\((moteur local|local engine)\)/gi, "")
    .replace(/\s+(réalisé\(s\)) localement/g, " $1")
    .replace(/\s+done locally/g, " done")
    .replace(/^Calendrier en préparation \([a-z0-9]{4,8}\)$/i, "Calendrier de 7 jours lancé : publications à valider dans l'onglet Calendrier")
    .replace(/^Calendar in progress \([a-z0-9]{4,8}\)$/i, "7-day calendar launched: posts to approve in the Calendar tab");
}

/** Texte d'une note (clé + paramètres, texte bilingue ou ancien texte) dans la langue demandée. */
export function stepNoteText(n: unknown, lang: Lang): string | undefined {
  if (n == null || n === "") return undefined;
  if (typeof n === "string") return cleanLegacyNote(n);
  if (isBi(n)) return n[lang];
  if (typeof n === "object" && typeof (n as { k?: unknown }).k === "string") {
    const { k, p = {} } = n as { k: string; p?: Record<string, Param> };
    const params = Object.fromEntries(Object.entries(p).map(([key, v]) => [key, isBi(v) ? v[lang] : v]));
    const f = CATALOG[k];
    return f ? f(params, lang) : undefined;
  }
  return undefined;
}

/** Texte enregistré qui peut être bilingue (JSON `{"fr":…,"en":…}`) : résumé d'une version de thème, par exemple. */
export function storedText(raw: string | null | undefined, lang: Lang): string {
  if (!raw) return "";
  if (raw.startsWith('{"fr":')) {
    try {
      const v = JSON.parse(raw);
      if (isBi(v)) return v[lang];
    } catch {
      /* texte ordinaire */
    }
  }
  return cleanLegacyNote(raw);
}
