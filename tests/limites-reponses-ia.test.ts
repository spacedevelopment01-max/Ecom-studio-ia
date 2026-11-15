/**
 * Réponses d'IA jamais coupées faute de place (essai réel du 10 novembre 2026, Éclat de thé : la conception d'un site
 * complet a atteint sa limite de 14 000 jetons, la réflexion du modèle comptant dedans, et 0,34 € ont été payés pour
 * rien ; dans les essais du 7 novembre, la recherche des angles était coupée puis refaite à chaque fois).
 * llmJson relance d'elle-même une réponse coupée avec plus de place, mais seulement jusqu'à maxOutputTokens : chaque
 * grande réponse du parcours SINA garde donc une marge (maxOutputTokens au-dessus de maxTokens), et la recherche des
 * angles part d'une place qui couvre les réponses réellement observées.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (f: string) => fs.readFileSync(path.join(process.cwd(), f), "utf8");

describe("limites de sortie des grandes réponses d'IA du parcours SINA", () => {
  it("chaque appel garde une marge de relance (maxOutputTokens > maxTokens)", async () => {
    for (const f of ["src/lib/syna-agent/custom-theme/brand.ts", "src/lib/syna-agent/tools/identity.ts", "src/lib/syna-agent/mockup-code/tools.ts", "src/lib/syna-agent/loop.ts"]) {
      for (const m of read(f).matchAll(/maxTokens: (\d[\d_]*), maxOutputTokens: (\d[\d_]*)/g)) {
        const [a, b] = [Number(m[1].replace(/_/g, "")), Number(m[2].replace(/_/g, ""))];
        expect(b, `${f} : ${m[0]}`).toBeGreaterThan(a);
      }
    }
    // Conception du thème sur mesure : 32 000 jetons d'emblée, relance possible au-delà.
    const D = await import("@/lib/syna-agent/custom-theme/design");
    expect(D.DESIGN_OUTPUT_TOKENS).toBeGreaterThanOrEqual(32_000);
    expect(read("src/lib/syna-agent/custom-theme/tools.ts")).toContain("maxTokens: DESIGN_OUTPUT_TOKENS, maxOutputTokens: DESIGN_OUTPUT_TOKENS * 1.5");
  });

  it("recherche des angles : place de départ au-dessus des réponses réelles (15 000 à 21 000 jetons)", () => {
    const src = read("src/lib/preparation/research-ai.ts");
    const max = Number(/promptKey: "preparation\.research"[^]*?maxTokens: (\d+)/.exec(src)![1]);
    const cap = Number(/promptKey: "preparation\.research"[^]*?maxOutputTokens: (\d+)/.exec(src)![1]);
    expect(max).toBeGreaterThanOrEqual(22_000);
    expect(cap).toBeGreaterThan(max);
  });
});
