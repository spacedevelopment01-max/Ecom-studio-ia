/**
 * La leçon de SINA sur les angles marketing : le cahier `docs/sina-savoir/angles-marketing.md`, écrit à la demande du
 * propriétaire le 16 novembre 2026 à partir de recherches sur le web. Il est relu à chaque création d'angles et donné
 * à celle qui dresse les types de clients, aux trois stratèges et au juge. Sans la liste des sources (utile aux
 * humains, pas au modèle).
 *
 * Un cahier absent n'est jamais remplacé en silence : la création s'arrête avant tout appel payant et le dit.
 */
import fs from "node:fs";
import path from "node:path";
import { brandKnowledgeDir, withoutSources } from "./brand-knowledge";

export const ANGLES_BOOK = "angles-marketing.md";
const cache = new Map<string, string>();

/** Le texte de la leçon, de sa première partie à la dernière, sans l'en-tête ni les sources. */
export function anglesLesson(): string {
  const file = path.join(brandKnowledgeDir(), ANGLES_BOOK);
  const hit = cache.get(file);
  if (hit) return hit;
  let md: string;
  try { md = fs.readFileSync(file, "utf8"); } catch { throw new Error(`Cahier de métier introuvable : ${file}.`); }
  const body = withoutSources(md), start = body.search(/^## 1\./m);
  const text = (start < 0 ? body : body.slice(start)).slice(0, 12_000).trim();
  if (text.length < 2000) throw new Error(`Cahier de métier trop court ou vide : ${file}.`);
  cache.set(file, text);
  return text;
}

/** La consigne d'un spécialiste, suivie de sa leçon. */
export const withAnglesLesson = (system: string): string => `${system}\n\n# Ta leçon sur les angles marketing (à appliquer, sans jamais en recopier les exemples)\n${anglesLesson()}`;

export function anglesKnowledgeReady(): { ok: true } | { ok: false; reason: string } {
  try { anglesLesson(); return { ok: true }; } catch (e) { return { ok: false, reason: (e as Error).message }; }
}
