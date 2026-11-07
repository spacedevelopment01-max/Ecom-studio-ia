/**
 * Règle du propriétaire (06/11/2026) : un angle marketing reste valable quand seuls des FAITS de l'offre changent
 * (prix, dimensions, matières, présentation). Seule une nouvelle offre (nom, catégorie, secteur, public) le périme.
 * Aucun appel d'IA : recherche simulée explicitement (fixture), angle activé nativement.
 */
import { describe, expect, it } from "vitest";

describe("faits de l'offre : l'angle choisi reste valable", async () => {
  const { createUser } = await import("@/lib/auth");
  const { loadProject } = await import("@/lib/projects");
  const { seedImageFixture } = await import("./image-v2-fixtures");
  const { grantProjectPlan } = await import("./communication-choice-fixture");
  const { chooseGeneralistForTest } = await import("./strategy-choice-fixture");
  const { seedSourcedAnglesForTest } = await import("./sourced-strategy-fixture");
  const { updateOfferFacts } = await import("@/lib/preparation/engine");
  const { stateOf, inputHash } = await import("@/lib/preparation/store");
  const { assertStrategyInputsCurrent } = await import("@/lib/strategy-consumption");
  const { activeStrategy, getStrategyState } = await import("@/lib/marketing-strategy");
  const { marketingResearch } = await import("@/lib/marketing-strategy/research");
  const { inputDigest, inputDigestV1, sameStrategyInputs } = await import("@/lib/marketing-strategy/proposals");

  async function projetAvecAngle(label: string) {
    const u = await createUser(`faits-${label}-${Date.now()}@test.fr`, "motdepasse-test", "Faits");
    const pid = seedImageFixture(u.id, "cosmetic");
    grantProjectPlan(pid, "dominer");
    // Parcours du Pilote conservé (fiche validée, recherche simulée explicitement), puis angle activé nativement.
    seedSourcedAnglesForTest(pid);
    chooseGeneralistForTest(pid);
    return pid;
  }

  it("prix, matières et présentation changent : angle, recherche et étapes validées restent à jour, fiche et Pilote synchronisés", async () => {
    const pid = await projetAvecAngle("prix");
    const before = activeStrategy(pid)!;
    expect(() => assertStrategyInputsCurrent(pid)).not.toThrow();
    const s0 = stateOf(pid)!;
    const freshBefore = (["research", "brand", "content", "media"] as const).filter((k) => s0.stages[k] && s0.stages[k]!.inputHash === inputHash(s0, k));
    updateOfferFacts(pid, (prof) => {
      prof.price = { amount: 8900, currency: "EUR", status: "confirmed" };
      prof.summary = "Présentation corrigée par le client, avec ses dimensions exactes.";
      prof.facts.push({ key: "dimensions", label: "Dimensions", value: "45 × 30 × 15 cm", status: "confirmed", source: "user" });
    });
    const p = loadProject(pid), s1 = stateOf(pid)!;
    expect(p.product.price.amount).toBe(8900);
    // Même comparaison que le Studio (assertFresh) : les alias techniques du moteur de thème ne sont pas l'offre.
    const semantic = ({ contentAliases, ...rest }: any) => JSON.stringify(rest);
    if (s1.stages.brief?.status === "approved") expect(semantic(p.product)).toBe(semantic(s1.stages.brief.data.profile));
    expect(() => assertStrategyInputsCurrent(pid)).not.toThrow();
    expect(activeStrategy(pid)!.id).toBe(before.id);
    for (const k of freshBefore) expect(s1.stages[k]!.inputHash).toBe(inputHash(s1, k));
    expect(marketingResearch(p).research.status).not.toBe("stale");
    expect(getStrategyState(pid).active?.angleId).toBe(before.angleId);
  });

  it("le nom ou le public visé changent : c'est une nouvelle offre, refusée par la porte des faits", async () => {
    const pid = await projetAvecAngle("nom");
    expect(() => updateOfferFacts(pid, (prof) => { prof.name = "Autre produit"; })).toThrow(/change l’offre/);
    expect(() => updateOfferFacts(pid, (prof) => { prof.facts.push({ key: "public", label: "Public principal", value: "Enfants", status: "confirmed", source: "user" }); })).toThrow(/change l’offre/);
    expect(() => assertStrategyInputsCurrent(pid)).not.toThrow();
  });

  it("empreinte v2 : insensible aux faits ; ancienne empreinte v1 encore acceptée tant que rien ne change", async () => {
    const pid = await projetAvecAngle("v1");
    const p = loadProject(pid);
    expect(inputDigest(p)).toMatch(/^v2:/);
    expect(sameStrategyInputs(inputDigestV1(p), p)).toBe(true);
    const autre = { ...p, product: { ...p.product, price: { amount: 1234, currency: "EUR", status: "confirmed" as const } }, catalog: [] as any };
    expect(inputDigest(autre)).toBe(inputDigest(p));
    expect(sameStrategyInputs(inputDigestV1(p), autre)).toBe(false);
    const autreOffre = { ...p, product: { ...p.product, category: "Autre catégorie" } };
    expect(inputDigest(autreOffre)).not.toBe(inputDigest(p));
  });
});
