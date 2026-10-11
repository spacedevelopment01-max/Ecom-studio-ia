/**
 * Décors libres de droits pour les images du PRODUIT réel (Image V2) : les banques d'images n'ont pas votre produit,
 * mais elles ont des décors vides (plan de travail, étagère, table, socle, fond flou). Le studio y pose le produit réel
 * (pixels d'origine, ombre de contact) : aucune image payante, aucun second produit redessiné par une IA.
 *
 * Le choix se fait d'abord sur la description de la banque (gratuit) : surface libre, fond, lieu de la famille de
 * produits ; une personne ou un autre objet au premier plan écartent la photo. La relecture IA (si disponible) juge
 * ensuite le résultat composé avec la photo de référence du produit.
 */
import type { Project } from "../projects";
import { mentionsPerson } from "../people-policy";
import { fitsFormat } from "./formats";
import { resolveProductCategory } from "./categories";
import type { RankedCandidate, StockCandidate, VisualBrief } from "./types";

const norm = (s: string) => ` ${s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim()} `;

/** Signes d'un décor où poser un produit (surface libre, fond, socle). */
const PLATE_WORDS = ["empty", "table", "tabletop", "surface", "shelf", "counter", "countertop", "podium", "pedestal", "platform", "background", "backdrop", "blur", "blurred", "bokeh", "copy space", "wooden", "wood", "marble", "stone", "desk", "concrete", "linen", "display", "mockup", "stand", "scene"];
/** Objets qui feraient concurrence au produit posé (un autre produit au premier plan). */
const COMPETING = ["bottle", "bottles", "phone", "smartphone", "laptop", "headphones", "drone", "camera", "cup", "mug", "glass", "jar", "box", "packaging", "car", "shoe", "shoes", "watch", "food", "plate", "cake", "fruit", "flowers", "bouquet", "toy", "book", "logo", "text"];

/** Requêtes de décors vides (anglais : vocabulaire des banques), propres à la famille du produit puis génériques. */
export function plateQueries(p: Project, brief: Pick<VisualBrief, "variant" | "environment">): string[] {
  const cat = resolveProductCategory(p.product);
  const v = brief.variant?.index ?? 0;
  const envs = [brief.environment, ...cat.environments].filter((x): x is string => !!x);
  const own = envs.map((e) => `empty ${e.replace(/\bin natural light\b/, "").trim()}`);
  const generic = ["empty table blurred background", "product display podium background", "empty wooden tabletop bokeh", "empty marble surface background"];
  const rot = <T,>(xs: T[]) => (xs.length ? [...xs.slice(v % xs.length), ...xs.slice(0, v % xs.length)] : xs);
  return [...new Set([...rot(own).slice(0, 2), ...rot(generic).slice(0, 2)])];
}

/** Pertinence d'un résultat comme DÉCOR (0-10), sur sa seule description et ses dimensions (gratuit). */
export function scorePlate(c: StockCandidate, brief: VisualBrief): RankedCandidate & { metadataMatch: boolean; offTopicLikely: boolean } {
  const text = norm(c.alt);
  const reasons: string[] = [];
  let s = 4;
  const plateHits = PLATE_WORDS.filter((w) => text.includes(` ${w} `)).length;
  if (plateHits) {
    s += Math.min(4, plateHits * 1.2);
    reasons.push(`${plateHits} signe(s) de décor libre`);
  }
  const envHits = norm(brief.environment ?? "").trim().split(" ").filter((w) => w.length > 3 && text.includes(` ${w} `)).length;
  if (envHits) {
    s += Math.min(1.5, envHits * 0.5);
    reasons.push("lieu de la famille du produit");
  }
  // Un décor ne montre personne (le produit posé deviendrait celui d'une personne réelle) : toujours écarté.
  const person = mentionsPerson(text);
  if (person) {
    s -= 6;
    reasons.push("personne visible");
  }
  const rival = COMPETING.find((w) => text.includes(` ${w} `));
  if (rival) {
    s -= 2.5;
    reasons.push(`autre objet au premier plan probable (${rival})`);
  }
  const fit = c.width && c.height ? fitsFormat(c.width, c.height, brief.format.aspect) : { ok: true, reason: null };
  if (!fit.ok) {
    s -= 2;
    reasons.push(fit.reason ?? "format");
  }
  if (!c.alt.trim()) {
    s -= 1;
    reasons.push("aucune description");
  }
  const relevance = Math.max(0, Math.min(10, Math.round(s * 10) / 10));
  return { ...c, relevance, reasons, metadataMatch: !person && !rival && plateHits >= 2, offTopicLikely: person || !plateHits };
}
