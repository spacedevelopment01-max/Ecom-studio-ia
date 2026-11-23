/**
 * Sortie structurée de l'IA : un écart de pure forme (texte un peu trop long) est réparé au lieu de faire perdre un
 * appel payé ; un écart de fond lève toujours l'erreur. Sans IA : la réparation elle-même (« salvage ») est contrôlée,
 * et la branche stricte de llmJson l'appelle (lecture du code).
 */
import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { salvage } from "@/lib/ai/llm";

describe("sortie structurée : réparation de forme", () => {
  const S = z.object({ avis: z.string().max(20), corrections: z.array(z.string().min(3).max(10)).max(2) }).strict();
  it("un texte trop long est coupé, une liste trop longue raccourcie ; le fond reste", () => {
    const r = salvage(S, { avis: "un avis beaucoup trop long pour le schéma", corrections: ["bonne", "une correction trop longue", "autre", "encore"] });
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.data.avis.length).toBeLessThanOrEqual(20); expect(r.data.corrections.length).toBeLessThanOrEqual(2); }
  });
  it("un champ absent reste vide, jamais inventé ; une réponse qui n'est pas un objet est refusée", () => {
    const r = salvage(S, { corrections: [] });
    expect(r.ok && r.data.avis).toBe("");
    expect(salvage(S, "texte").ok).toBe(false);
  });
  it("la branche stricte de llmJson répare avant de refuser", () => {
    const src = fs.readFileSync("src/lib/ai/llm.ts", "utf8"), strict = src.slice(src.indexOf("async function jsonStrict"), src.indexOf("async function jsonLibre"));
    expect(strict).toMatch(/salvage\(schema[^,]*, data\)/);
    expect(strict).toContain("return schema.parse(data)");
  });
});
