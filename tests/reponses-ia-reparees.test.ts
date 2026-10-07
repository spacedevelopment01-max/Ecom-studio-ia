/** Réponse de l'IA hors format pour un détail : réparée gratuitement au lieu d'être repayée ou de faire échouer l'étape. */
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { salvage } from "@/lib/ai/llm";

const S = z.object({
  network: z.enum(["instagram", "facebook"]),
  tags: z.array(z.enum(["a", "b"])).max(2),
  title: z.string().max(20),
  scale: z.number().min(70).max(140),
  count: z.number(),
  email: z.string(),
  posts: z.array(z.object({ kind: z.enum(["photo", "video"]), text: z.string() })).min(1),
});

describe("réparation sans nouvel appel", () => {
  it("liste trop longue, texte trop long, casse, nombre hors bornes ou en texte, champ oublié, élément invalide", () => {
    const r = salvage(S, { network: "Instagram", tags: ["a", "zz", "b", "a"], title: "Un titre beaucoup trop long pour la limite", scale: 200, count: "12", posts: [{ kind: "photo", text: "ok" }, { kind: "carousel", text: "x" }] });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data).toMatchObject({ network: "instagram", tags: ["a", "b"], scale: 140, count: 12, email: "" });
    expect(r.data.title.length).toBeLessThanOrEqual(20);
    expect(r.data.title).not.toMatch(/\s$/);
    expect(r.data.posts).toEqual([{ kind: "photo", text: "ok" }]);
  });
  it("fond manquant (liste obligatoire vide) : pas de réparation inventée", () => {
    expect(salvage(S, { network: "instagram", tags: [], title: "t", scale: 100, count: 1, email: "", posts: [{ kind: "carousel", text: "x" }] }).ok).toBe(false);
    expect(salvage(S, "pas du JSON").ok).toBe(false);
  });
});
