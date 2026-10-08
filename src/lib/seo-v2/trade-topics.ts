/**
 * Vocabulaire des métiers pour le SEO (savoir général, jamais propre à un client) : les spécialités qu'un client
 * peut rechercher pour chaque métier canonique (« pose de plaques de plâtre », « bandes à joints »…), en français,
 * anglais et espagnol. Une spécialité n'est présentée comme une prestation QUE si le client l'a déclarée (ses
 * prestations, sa description) ; sinon c'est une opportunité « à confirmer », jamais une affirmation.
 */
import { fold } from "./lang";
import type { ContentLang } from "./types";

export type TradeTopic = { key: string; fr: string; en: string; es: string; match: RegExp; questionsFr: string[] };

const T = (key: string, fr: string, en: string, es: string, match: RegExp, questionsFr: string[] = []): TradeTopic => ({ key, fr, en, es, match, questionsFr });

export const TRADE_TOPICS: Record<string, TradeTopic[]> = {
  plasterer: [
    T("plasterboard", "pose de plaques de plâtre", "plasterboard installation", "instalación de placas de yeso", /plaque|placo|cloison|doublage|faux[- ]plafond|plasterboard|drywall/, ["pose de placo au m² : quel prix prévoir", "cloison ou doublage : quelle différence"]),
    T("coating", "enduits", "plaster coating", "enduidos", /enduit|ratissage|coating|skim/, ["quel enduit pour un mur abîmé"]),
    T("joints", "bandes à joints", "drywall taping", "cintas de juntas", /bande|joint|taping/, ["comment faire des bandes à joints propres"]),
    T("smoothing", "lissage des murs", "wall smoothing", "alisado de paredes", /lissage|lisser|smooth/, ["lissage des murs avant peinture : est-ce nécessaire"]),
    T("prep", "préparation des supports", "surface preparation", "preparación de soportes", /pr[ée]paration|support|rebouch|surface prep/, ["comment préparer un mur avant peinture"]),
    T("finishes", "finitions", "finishing work", "acabados", /finition|finish/, []),
    T("renovation", "rénovation intérieure", "interior renovation", "reforma interior", /r[ée]nov|renovation/, ["rénovation intérieure : par où commencer"]),
  ],
  painter: [
    T("interior_paint", "peinture intérieure", "interior painting", "pintura interior", /peinture int|peintre|interior paint|pintura/, ["peinture intérieure au m² : quel prix prévoir", "combien de couches de peinture"]),
    T("prep", "préparation des supports", "surface preparation", "preparación de soportes", /pr[ée]paration|support|rebouch|surface prep/, ["comment préparer un mur avant peinture"]),
    T("ceilings", "peinture de plafonds", "ceiling painting", "pintura de techos", /plafond|ceiling|techo/, []),
    T("wallpaper", "pose de papier peint", "wallpaper hanging", "colocación de papel pintado", /papier peint|wallpaper|papel pintado/, []),
    T("finishes", "finitions", "finishing work", "acabados", /finition|finish/, []),
    T("renovation", "rénovation intérieure", "interior renovation", "reforma interior", /r[ée]nov|renovation/, []),
  ],
  electrician: [
    T("install", "installation électrique", "electrical installation", "instalación eléctrica", /installation|tableau|panel/, ["mise aux normes électrique : quel prix prévoir"]),
    T("standards", "mise aux normes", "code compliance upgrade", "adecuación a normativa", /norme|conformit|compliance/, []),
    T("troubleshoot", "dépannage électrique", "electrical repairs", "averías eléctricas", /d[ée]pann|panne|repair/, []),
  ],
  plumber: [
    T("leak", "recherche et réparation de fuites", "leak repair", "reparación de fugas", /fuite|leak/, []),
    T("bathroom", "installation de salle de bain", "bathroom installation", "instalación de baños", /salle de bain|douche|bathroom/, []),
    T("heater", "chauffe-eau", "water heater", "calentador de agua", /chauffe|ballon|heater/, []),
  ],
  tiler: [
    T("floor", "pose de carrelage au sol", "floor tiling", "colocación de suelo", /sol|floor/, []),
    T("wall", "faïence murale", "wall tiling", "alicatado", /fa[iï]ence|mur|wall/, []),
  ],
  carpenter: [
    T("joinery", "menuiserie sur mesure", "custom joinery", "carpintería a medida", /mesure|custom|dressing|placard/, []),
    T("windows", "pose de fenêtres", "window installation", "instalación de ventanas", /fen[eê]tre|window/, []),
  ],
  caterer: [
    T("lunch", "déjeuner", "lunch", "almuerzo", /d[ée]jeuner|midi|lunch/, ["où déjeuner le midi : ce qu'il faut savoir"]),
    T("dinner", "dîner", "dinner", "cena", /d[îi]ner|soir|dinner/, []),
    T("daily", "plat du jour", "daily specials", "plato del día", /plat du jour|jour|special/, []),
    T("seasonal", "cuisine de marché", "seasonal cooking", "cocina de mercado", /march[ée]|saison|seasonal/, []),
  ],
  hairdresser: [
    T("cut", "coupe", "haircut", "corte", /coupe|cut/, []),
    T("colour", "coloration", "hair colouring", "coloración", /couleur|coloration|colou?r/, []),
  ],
};

/** Spécialités du métier : celles que le client a déclarées (prestations, résumé) et celles à confirmer. */
export function tradeTopics(parts: string[], declaredText: string): { declared: TradeTopic[]; toConfirm: TradeTopic[] } {
  const all = new Map<string, TradeTopic>();
  for (const part of parts) for (const t of TRADE_TOPICS[part] ?? []) if (!all.has(t.key)) all.set(t.key, t);
  const text = fold(declaredText);
  const declared: TradeTopic[] = [];
  const toConfirm: TradeTopic[] = [];
  for (const t of all.values()) (t.match.test(text) ? declared : toConfirm).push(t);
  return { declared, toConfirm };
}

export const topicLabel = (t: TradeTopic, lang: ContentLang) => (lang === "en" ? t.en : lang === "es" ? t.es : t.fr);
