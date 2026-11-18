/**
 * Essai réel du 18 novembre 2026 (Atelier Vasco) : la reprise d'une création de site s'arrêtait net dès qu'une étape déjà
 * payée avait une demande différente (une règle du Studio avait changé entre deux tentatives) : « Cette demande a changé ».
 * Désormais, pour les appels marqués reprenables, l'étape changée devient une nouvelle action sous une clé tirée de sa
 * demande : payée une fois, puis reprise sans repayer ; les étapes inchangées restent reprises gratuitement. Sans IA.
 */
import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("reprise d'une tâche : une étape changée devient une nouvelle action, au lieu de tout bloquer", async () => {
  const { reserve, existingOperation, DemandeChangee, requestHash } = await import("@/lib/billing");
  const { account } = await import("./conversation209-fixtures");

  it("même clé, demande différente : refus typé (jamais rendu ni repayé sous la même clé) ; la clé tirée de la demande est libre", async () => {
    const u = await account();
    const key = `essai-reprise-${Date.now()}`;
    const avant = requestHash({ prompt: "conception, avec l'ancienne règle" }), apres = requestHash({ prompt: "conception, avec la nouvelle règle" });
    reserve(u.id, 1_000, { task: "strategy", provider: "anthropic", model: "x", usageKey: key, requestHash: avant });
    expect(existingOperation(u.id, { task: "strategy", usageKey: key, requestHash: avant })).toBeTruthy();
    expect(() => existingOperation(u.id, { task: "strategy", usageKey: key, requestHash: apres })).toThrow(DemandeChangee);
    expect(existingOperation(u.id, { task: "strategy", usageKey: `${key}~${apres.slice(0, 12)}`, requestHash: apres })).toBeUndefined();
  });

  it("l'appel à l'IA, quand il est marqué reprenable, prend la clé tirée de la demande ; tous les appels de la création du site le sont", () => {
    const llm = fs.readFileSync("src/lib/ai/llm.ts", "utf8");
    expect(llm).toContain("if (!(e instanceof DemandeChangee) || !call.nouvelleSiChangee || !operation.usageKey) throw e;");
    expect(llm).toContain("operation.usageKey = `${operation.usageKey}~${String(operation.requestHash).slice(0, 12)}`;");
    for (const f of ["src/lib/syna-agent/custom-theme/tools.ts", "src/lib/syna-agent/custom-theme/brand.ts"]) {
      const src = fs.readFileSync(f, "utf8");
      const appels = (src.match(/llmJson\(\{ /g) ?? []).length;
      expect(appels, f).toBeGreaterThan(0);
      expect((src.match(/llmJson\(\{ nouvelleSiChangee: true, /g) ?? []).length, f).toBe(appels);
    }
  });

  it("le numéro de variation de la conception suit le début de la tâche, pas l'heure de la reprise ; le rejeu sans paiement existe", () => {
    const tools = fs.readFileSync("src/lib/syna-agent/custom-theme/tools.ts", "utf8");
    expect(tools).toContain('const seed = `${p.id}:${mode.kind === "concept" ? mode.label : "site"}:${debut >> 22}`;');
    expect(tools).not.toContain("${Date.now() >> 22}");
    const llm = fs.readFileSync("src/lib/ai/llm.ts", "utf8");
    expect(llm).toContain('if (call.acquiredOnly || process.env.STUDIO_RECUS_SEULEMENT === "1") throw new UserFacingError(');
  });
});
