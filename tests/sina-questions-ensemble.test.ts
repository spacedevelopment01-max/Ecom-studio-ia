/**
 * SINA pose ensemble ses questions simples (décision du propriétaire du 19 novembre 2026, essai réel Braise : douze
 * questions de preuves posées une à une, douze messages relus en entier, trois fois plus cher). Sans IA.
 */
import { describe, expect, it } from "vitest";

process.env.STUDIO_SYNA_AGENT = "1";

describe("SINA : les questions simples ensemble, les autres seules", async () => {
  const { SYNA_SYSTEM } = await import("@/lib/syna-agent/prompt");
  const PR = await import("@/lib/syna-agent/custom-theme/preuves");

  it("règle générale : questions simples et indépendantes ensemble (six au plus), réflexion, choix et accord seuls ; « faire connaissance » inchangé", () => {
    expect(SYNA_SYSTEM).toMatch(/pose-les ENSEMBLE dans une seule « question », numérotées et courtes, six au plus/);
    expect(SYNA_SYSTEM).toMatch(/Une question qui demande réflexion, un choix entre tes propositions ou son accord se pose SEULE/);
    expect(SYNA_SYSTEM).toMatch(/Pendant « faire connaissance », c'est une question à la fois/);
    expect(SYNA_SYSTEM).not.toMatch(/UNE seule question à la fois, jamais/);
  });

  it("les preuves se demandent en un ou deux messages, plus jamais une à une", () => {
    for (const t of [PR.QUESTION_DES_PREUVES, PR.refusSansPreuves({ preuves: 0, repondu: false })!]) {
      expect(t).toMatch(/en UN ou deux messages au plus : ces questions ENSEMBLE, numérotées et courtes/);
      expect(t).not.toMatch(/une question à la fois/);
    }
    expect(PR.QUESTION_DES_PREUVES).toMatch(/dans le même message que les preuves quand il reste de la place/);
  });
});
