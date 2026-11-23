/**
 * Devis, sans aucun appel payant, de l'essai réel qui ne referait QUE les trois logos de Nadia (trois identités, trois
 * essais permis par identité), calculé avec le devis du Studio (boardImagesQuote, bornes de réservation) aux tarifs
 * vérifiés du Studio privé de recette (scripts/syna-recette/tarifs-verifies.ts). Le chiffre est écrit dans
 * le fichier du bloc-notes de l'essai quand DEVIS_SORTIE est donné ; rien n'est lancé.
 */
import { describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  const fs = process.getBuiltinModule("node:fs");
  const os = process.getBuiltinModule("node:os");
  const p = process.getBuiltinModule("node:path");
  process.env.DATA_DIR = fs.mkdtempSync(p.join(os.tmpdir(), "ecs-devis-logos-"));
});

vi.mock("@/lib/ai/config", async (orig) => ({ ...(await orig<object>()), activeProviderKey: (p: string) => (p === "openai" || p === "anthropic" ? "cle-simulee" : null) }));

describe("devis de l'essai réel des trois logos de Nadia (simulé, aucun appel)", () => {
  it("prix probable et prix au plus, en euros et en part du budget d'IA du forfait du milieu", async () => {
    const { appliquerTarifsVerifies } = await import("../scripts/syna-recette/tarifs-verifies");
    await appliquerTarifsVerifies();
    const C = await import("@/lib/syna-agent/brand-chain");
    const { LOGO_ROUTE, mediaRouteFor, photoRequestMaxMicro } = await import("@/lib/ai/media-providers");
    const { EUR, monthlyAllowanceMicro, htEur } = await import("@/lib/billing");
    const { MAX_IMAGE_RETRIES, SLOT_REFERENCES } = await import("@/lib/syna-agent/brand-images");
    expect(mediaRouteFor("logo", { text: true, references: 2 })).toMatchObject({ provider: "openai", model: "gpt-image-2.5-sunburst" });
    const s = C.chainSettings();
    // Un essai d'un logo, au devis du Studio : le dessin (modèle des logos) et sa relecture (le modèle le plus fort).
    const un = C.boardImagesQuote(1, s, ["logo"]);
    const dessinMax = photoRequestMaxMicro(LOGO_ROUTE, { prompt: "x".repeat(6000), references: SLOT_REFERENCES.logo, aspect: "1:1", quality: "high" });
    const dessinProbable = dessinMax / 1.25, relectureMax = un.maxMicro - dessinMax, relectureProbable = un.probableMicro! - dessinProbable;
    expect(relectureMax).toBeGreaterThan(0);
    // Ce que la carte d'accord montre au client pour « refaire les trois logos » (un essai par identité ; les reprises
    // sont à la charge du Studio, mais comptent dans le plafond de la tâche).
    // Ses trois planches datent d'avant « l'idée en mots simples » : un appel l'écrit d'abord pour les trois.
    const simple = C.ideesSimplesQuote(3, s);
    const carte = C.boardImagesQuote(3, s, ["logo"], [], 3);
    const essais = 1 + MAX_IMAGE_RETRIES;
    expect(essais).toBe(3);
    // Probable : comme dans l'essai réel, chaque logo refusé, donc trois essais par identité (9 dessins, 9 relectures).
    const probable = 3 * essais * (dessinProbable + relectureProbable) + simple.probableMicro!;
    // Au plus : par identité, trois essais, un dessin de plus sans trait près du nom, et une seconde lecture par relecture.
    const auPlus = 3 * ((essais + 1) * dessinMax + 2 * essais * relectureMax) + simple.maxMicro;
    const budgetCode = monthlyAllowanceMicro({ status: "active", plan: "vendre", billing: "month" } as never);
    const budget99 = { premier: 0.5 * htEur(99) * EUR, ensuite: 0.4 * htEur(99) * EUR };
    const e = (m: number) => Math.round((m / EUR) * 100) / 100, pct = (m: number, b: number) => Math.round((1000 * m) / b) / 10;
    const out = {
      ideeSimple: { max: e(simple.maxMicro), probable: e(simple.probableMicro!) }, dessin: { max: e(dessinMax), probable: e(dessinProbable) }, relecture: { max: e(relectureMax), probable: e(relectureProbable) },
      carteDuClient: { max: e(carte.maxMicro), probable: e(carte.probableMicro!) },
      essai: { probable: e(probable), auPlus: e(auPlus) },
      partDuBudget: {
        codeVendre89: { budget: e(budgetCode), probable: pct(probable, budgetCode), auPlus: pct(auPlus, budgetCode) },
        valide99PremierMois: { budget: e(budget99.premier), probable: pct(probable, budget99.premier), auPlus: pct(auPlus, budget99.premier) },
        valide99Ensuite: { budget: e(budget99.ensuite), probable: pct(probable, budget99.ensuite), auPlus: pct(auPlus, budget99.ensuite) },
      },
    };
    if (process.env.DEVIS_SORTIE) (await import("node:fs")).writeFileSync(process.env.DEVIS_SORTIE, JSON.stringify(out, null, 2));
    expect(auPlus).toBeGreaterThan(probable);
    expect(carte.maxMicro).toBeLessThan(auPlus);
  });
});
