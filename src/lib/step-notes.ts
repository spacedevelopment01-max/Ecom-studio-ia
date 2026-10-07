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
  "cutout.sorted": (p, l) => cutoutParts(p, l, true).join(", "),
  "cutout.none": (p, l) => {
    const parts = cutoutParts(p, l, false);
    const head = l === "en" ? "No usable cutout" : "Aucun détourage valable";
    const tail =
      l === "en"
        ? "add a sharp photo of the product alone, on a plain background, in the Product tab. Creation continues with your other photos."
        : "ajoutez une photo nette du produit seul, sur fond uni, dans l'onglet Produit. La création continue avec vos autres photos.";
    return `${head}${parts.length ? ` (${parts.join(", ")})` : ""}${l === "en" ? ": " : " : "}${tail}`;
  },
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
  "brand.toCheck": ({ name, direction, n }, l) => (l === "en" ? `${name} — ${direction} direction; ${n} point${s(+n)} for you to check (Brand tab)` : `${name} — direction ${direction} ; ${n} point${s(+n)} à vérifier par vous (onglet Marque)`),
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
  "skip.brandKept": ({ name }, l) => (l === "en" ? `Existing brand kept${name ? ` (${name})` : ""}: not redone. Use “Redo the brand” to regenerate it.` : `Marque existante conservée${name ? ` (${name})` : ""} : pas refaite. « Refaire la marque » pour la régénérer.`),
  "skip.copyFinal": (_, l) => (l === "en" ? "Store copy already validated by the quality check: not rewritten." : "Textes déjà validés par le contrôle qualité : pas réécrits."),
  "skip.videosNone": (_, l) => (l === "en" ? "Videos not requested at launch: create them whenever you like in the Videos tab" : "Vidéos non demandées au lancement : créez-les quand vous voulez dans l'onglet Vidéos"),
  "skip.servicePhotos": ({ n }, l) => (l === "en" ? `${n} business photo${s(+n)} kept as they are` : `${n} photo${s(+n)} de l'activité gardée${s(+n)} telle${s(+n)} quelle${s(+n)}`),
  "skip.serviceNoPhoto": (_, l) => (l === "en" ? "No photo provided: you can add some in the Business tab" : "Aucune photo fournie : vous pourrez en ajouter dans l'onglet Activité"),
  "skip.noCutout": (_, l) => (l === "en" ? "No usable product cutout yet: add a sharp photo of the product alone, on a plain background, in the Product tab, then run this step again." : "Pas encore de détourage valable du produit : ajoutez une photo nette du produit seul, sur fond uni, dans l'onglet Produit, puis relancez cette étape."),
  "skip.noCutoutSite": (_, l) => (l === "en" ? "Waiting for a clear product photo (Product tab): visuals and videos are created next." : "En attente d'une photo nette du produit (onglet Produit) : les visuels et vidéos se créent ensuite."),
  "stopped": (_, l) => (l === "en" ? "Stopped at your request: restart whenever you like." : "Arrêtée à votre demande : relancez quand vous voulez."),
};

/** Bilan du tri des photos et des détourages, dans l'ordre où le client le lit. */
function cutoutParts(p: Record<string, string | number>, l: Lang, withCut: boolean): string[] {
  const n = (k: string) => Number(p[k]) || 0;
  const en = l === "en";
  const parts: string[] = [];
  if (withCut) parts.push(en ? `${n("cut")} photo${s(n("cut"))} cut out` : `${n("cut")} photo${s(n("cut"))} détourée${s(n("cut"))}`);
  if (n("life")) parts.push(en ? `${n("life")} lifestyle photo${s(n("life"))} kept` : `${n("life")} photo${s(n("life"))} en situation gardée${s(n("life"))}`);
  if (n("text")) parts.push(en ? `${n("text")} visual${s(n("text"))} with text set aside` : `${n("text")} visuel${s(n("text"))} avec texte écarté${s(n("text"))}`);
  if (n("other")) parts.push(en ? `${n("other")} other visual${s(n("other"))} set aside` : `${n("other")} autre${s(n("other"))} visuel${s(n("other"))} écarté${s(n("other"))}`);
  if (n("busy")) parts.push(en ? `${n("busy")} photo${s(n("busy"))} with a busy background not cut out` : `${n("busy")} photo${s(n("busy"))} sur fond chargé non détourée${s(n("busy"))}`);
  if (n("rejected")) parts.push(en ? `${n("rejected")} cutout${s(n("rejected"))} rejected by the check` : `${n("rejected")} détourage${s(n("rejected"))} refusé${s(n("rejected"))} au contrôle`);
  if (n("failed")) parts.push(en ? `${n("failed")} cutout${s(n("failed"))} not possible on this machine` : `${n("failed")} détourage${s(n("failed"))} impossible${s(n("failed"))} sur cette machine`);
  return parts;
}

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

/** Anciens résumés reconnus (projets créés avant les clés) : retraduits comme les nouveaux. */
const LEGACY: [RegExp, (m: RegExpMatchArray) => { k: string; p?: Record<string, Param> }][] = [
  [/^Photos (reçues|received)$/, () => ({ k: "sources.photos" })],
  [/^(Description enregistrée|Description saved)$/, () => ({ k: "sources.description" })],
  [/^(Description de l'activité enregistrée|Business description saved)$/, () => ({ k: "sources.serviceDescription" })],
  [/^(\d+) (?:détourage\(s\) réalisé\(s\)|cutout\(s\) done)(?: localement| locally)?$/, (m) => ({ k: "cutout.done", p: { n: +m[1] } })],
  [/^(\d+) information\(s\) établie\(s\), (\d+) inconnue\(s\), (\d+) question\(s\) — (analyse IA|moteur local)$/, (m) => ({ k: "analysis.product", p: { established: +m[1], unknown: +m[2], questions: +m[3], ai: m[4] === "analyse IA" ? 1 : 0 } })],
  [/^(\d+) fact\(s\) established, (\d+) unknown\(s\), (\d+) question\(s\) — (AI analysis|local engine)$/, (m) => ({ k: "analysis.product", p: { established: +m[1], unknown: +m[2], questions: +m[3], ai: m[4] === "AI analysis" ? 1 : 0 } })],
  [/^(.+) — direction (.+?)(?: \(moteur local\))?$/, (m) => ({ k: "brand.done", p: { name: m[1], direction: m[2] } })],
  [/^(.+) — (.+?) direction(?: \(local engine\))?$/, (m) => ({ k: "brand.done", p: { name: m[1], direction: m[2] } })],
  [/^(Textes rédigés et contrôlés|Copy written and checked)$/, () => ({ k: "copy.checked" })],
  [/^Textes rédigés ; (\d+) point\(s\) à vérifier par vous$|^Copy written; (\d+) point\(s\) for you to check$/, (m) => ({ k: "copy.toCheck", p: { n: +(m[1] ?? m[2]) } })],
  [/^(Textes de base assemblés|Base copy assembled)/, () => ({ k: "copy.base" })],
  [/^(\d+) (?:image\(s\) créée\(s\)|image\(s\) created)$/, (m) => ({ k: "images.done", p: { n: +m[1] } })],
  [/^Version (\d+) du thème enregistrée$|^Theme version (\d+) saved$/, (m) => ({ k: "shop.theme", p: { n: +(m[1] ?? m[2]) } })],
  [/^Version (\d+) du site enregistrée$|^Website version (\d+) saved$/, (m) => ({ k: "shop.site", p: { n: +(m[1] ?? m[2]) } })],
  [/^(Calendrier en préparation|Calendar in progress) \([a-z0-9]{4,8}\)$/i, () => ({ k: "calendar.started" })],
  [/^(\d+) fichiers rangés par dossier(?:, (\d+) à classer)?$|^(\d+) files organized into folders(?:, (\d+) to sort)?$/, (m) => ({ k: "organize.done", p: { n: +(m[1] ?? m[3]), loose: +(m[2] ?? m[4] ?? 0) } })],
  [/^Inclus dans les forfaits|^Included in the plans/, () => ({ k: "skip.plan" })],
  [/^Vidéos non demandées au lancement|^Videos not requested at launch/, () => ({ k: "skip.videosNone" })],
  [/^(Arrêtée à votre demande|Stopped at your request)/, () => ({ k: "stopped" })],
];

/** Texte d'une note (clé + paramètres, texte bilingue ou ancien texte) dans la langue demandée. */
export function stepNoteText(n: unknown, lang: Lang): string | undefined {
  if (n == null || n === "") return undefined;
  if (typeof n === "string") {
    for (const [re, to] of LEGACY) {
      const m = n.match(re);
      if (m) return stepNoteText(to(m), lang);
    }
    return cleanLegacyNote(n);
  }
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
