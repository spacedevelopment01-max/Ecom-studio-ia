import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Règle des hooks React : un hook appelé après un « return » anticipé change l'ordre des hooks d'un rendu à l'autre
 * (erreur « React has detected a change in the order of Hooks », vue sur la page Pilote, BrandPropagationCard).
 * Vérifie que useBudgetPct() n'est jamais appelé après un retour anticipé du même composant.
 */
function files(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(path.join(dir, e.name)) : e.name.endsWith(".tsx") ? [path.join(dir, e.name)] : []));
}

describe("hooks : aucun useBudgetPct() après un retour anticipé", () => {
  it("dans tous les composants du studio", () => {
    const bad: string[] = [];
    for (const f of files(path.join(process.cwd(), "src/components"))) {
      const lines = fs.readFileSync(f, "utf8").split("\n");
      lines.forEach((l, n) => {
        if (!l.includes("useBudgetPct()") || l.includes("export function useBudgetPct")) return;
        let i = n - 1;
        while (i > 0 && !/^(export )?(default )?function |^ {2}const [A-Z]\w* = \(/.test(lines[i])) i--;
        for (let j = i; j < n; j++) if (/^ {2}(if \(.*\) )?return\b/.test(lines[j])) bad.push(`${path.relative(process.cwd(), f)}:${n + 1}`);
      });
    }
    expect(bad).toEqual([]);
  });
});
