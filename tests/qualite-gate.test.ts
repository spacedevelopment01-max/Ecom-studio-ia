/**
 * Barrière de qualité (phase 1A) : FINAL seulement si la barrière est réellement franchie ; une panne du contrôle
 * n'est jamais FINAL ; défauts fatals et bloquants ; reprise seulement avec un diagnostic ; résultats provisoires
 * (logo de remplacement, thème entre 5 et 8) ; règle unique de réutilisation ; gain de qualité d'une reprise.
 */
import { describe, expect, it } from "vitest";
import { decide } from "@/lib/quality/gate";
import { POLICIES, DELIVERABLES } from "@/lib/quality/policies";
import { isAutoUsable, manuallySelectable } from "@/lib/quality/usable";
import { gateMeta, qualityTrail, saveCheck, statusFor } from "@/lib/quality/store";
import { recordCall, withCandidate } from "@/lib/ai/trace";

const ai = (score: number | null, extra: object = {}) => ({ checker: "ai" as const, score, ...extra });

describe("barrière de qualité", () => {
  it("chaque livrable a une politique cohérente", () => {
    for (const d of DELIVERABLES) {
      const p = POLICIES[d];
      expect(p.final).toBeGreaterThanOrEqual(p.retryFloor);
      expect(p.finalCheckers).not.toContain("none");
    }
  });
  it("panne du contrôle ou contrôle impossible : jamais FINAL, on refait le contrôle (pas la génération)", () => {
    for (const d of DELIVERABLES) {
      const a = decide(d, { checker: "ai", score: 9.5, error: "délai dépassé" });
      expect(a.verdict).not.toBe("FINAL");
      expect(a).toMatchObject({ verdict: "RETRY", action: "recheck", checked: false });
      expect(decide(d, { checker: "none", score: null }).verdict).not.toBe("FINAL");
      expect(decide(d, ai(null)).verdict).not.toBe("FINAL");
    }
  });
  it("logos notés 4,4 et 5,9 : refusés, jamais proposés", () => {
    expect(decide("logo_route", ai(4.4, { issues: ["symbole générique"] })).verdict).toBe("REJECTED");
    expect(decide("logo_route", ai(5.9, { issues: ["typographie faible"] })).verdict).toBe("REJECTED");
    expect(decide("logo_full", ai(5.9, { issues: ["x"] })).verdict).toBe("REJECTED");
  });
  it("logo 8,5 avec le nom mal écrit : jamais FINAL (reprise ciblée, puis refus)", () => {
    const first = decide("logo_full", ai(8.5, { codes: ["name_mismatch"], issues: ["« Sebastein » au lieu de « Sébastien »"] }));
    expect(first).toMatchObject({ verdict: "RETRY", action: "regenerate" });
    expect(first.feedback).toMatch(/Sebastein/);
    expect(decide("logo_full", ai(8.5, { codes: ["name_mismatch"] }), { attempt: 1 }).verdict).toBe("REJECTED");
  });
  it("défaut fatal : refusé et marqué fatal, sans reprise", () => {
    const d = decide("logo_route", ai(9, { codes: ["resembles_known_brand"] }));
    expect(d).toMatchObject({ verdict: "REJECTED", fatal: true, action: "none" });
    expect(decide("image_product", ai(8, { codes: ["wrong_product"] })).fatal).toBe(true);
  });
  it("reprise seulement avec un diagnostic précis, et dans la limite de la politique", () => {
    expect(decide("logo_route", ai(7.2, { issues: ["typographie faible", "symbole générique"] }))).toMatchObject({ verdict: "RETRY", action: "regenerate" });
    // Sans défaut cité : pas de reprise « à l'aveugle ».
    expect(decide("logo_route", ai(7.2)).verdict).toBe("REJECTED");
    // Reprises épuisées.
    expect(decide("logo_route", ai(7.2, { issues: ["x"] }), { attempt: 2 }).verdict).toBe("REJECTED");
  });
  it("la note n'est pas tout : critère faible ou contrôle peu sûr empêchent FINAL", () => {
    const weak = decide("logo_route", ai(8.6, { criteria: { relevance: 6.8, craft: 9 } }));
    expect(weak.verdict).toBe("RETRY");
    expect(weak.weakCriteria).toEqual(["relevance"]);
    expect(decide("logo_route", ai(8.6, { confidence: 0.4, issues: ["lecture incertaine"] })).verdict).toBe("RETRY");
    expect(decide("logo_route", ai(8.6, { criteria: { relevance: 8, craft: 8.5 } })).verdict).toBe("FINAL");
  });
  it("version du studio d'un logo : provisoire (remplacement technique), jamais FINAL", () => {
    const d = decide("logo_route", { checker: "local", score: null });
    expect(d.verdict).toBe("PROVISIONAL");
    expect(d.provisional).toEqual({ use: "auto", label: "placeholder" });
  });
  it("thème : ≥ 8 FINAL ; de 5 à moins de 8 provisoire « à améliorer » (pas de boucle coûteuse) ; < 5 refusé", () => {
    expect(decide("theme_home", ai(8.2)).verdict).toBe("FINAL");
    const mid = decide("theme_home", ai(6.4, { issues: ["hiérarchie faible"] }));
    expect(mid).toMatchObject({ verdict: "PROVISIONAL", action: "none" });
    expect(mid.provisional?.label).toBe("needs_improvement");
    expect(decide("theme_home", ai(5)).verdict).toBe("PROVISIONAL");
    expect(decide("theme_home", ai(6.5))).toMatchObject({ verdict: "PROVISIONAL", provisional: { use: "auto", label: "needs_improvement" } });
    expect(decide("theme_custom", ai(6.5)).verdict).toBe("PROVISIONAL");
    expect(decide("theme_home", ai(4.9)).verdict).toBe("REJECTED");
  });
  it("photo libre : contrôle par métadonnées accepté (forfait sans IA), hors sujet fatal", () => {
    expect(decide("stock_photo", { checker: "metadata", score: 7 }).verdict).toBe("FINAL");
    expect(decide("stock_photo", ai(9, { codes: ["off_topic"] })).fatal).toBe(true);
    expect(decide("stock_photo", ai(6.5, { issues: ["warn"] })).verdict).toBe("REJECTED");
  });
  it("statut d'asset correspondant au verdict", () => {
    expect(statusFor({ verdict: "FINAL" }, "ready")).toBe("ready");
    expect(statusFor({ verdict: "RETRY" })).toBe("review");
    expect(statusFor({ verdict: "PROVISIONAL" })).toBe("review");
    expect(statusFor({ verdict: "REJECTED" })).toBe("rejected");
  });
});

describe("réutilisation automatique", () => {
  const asset = (gate: object | null, status = "review") => ({ status, deleted_at: null, meta: JSON.stringify(gate ? { gate } : {}) }) as any;
  it("FINAL oui ; RETRY et REJECTED non ; ancien asset sans verdict : comme avant (sauf rejected)", () => {
    expect(isAutoUsable(asset({ verdict: "FINAL" }))).toBe(true);
    expect(isAutoUsable(asset({ verdict: "RETRY" }))).toBe(false);
    expect(isAutoUsable(asset({ verdict: "REJECTED" }, "rejected"))).toBe(false);
    expect(isAutoUsable(asset(null, "ready"))).toBe(true);
    expect(isAutoUsable(asset(null, "rejected"))).toBe(false);
  });
  it("provisoire : seulement s'il est prévu comme remplacement automatique", () => {
    expect(isAutoUsable(asset({ verdict: "PROVISIONAL", provisional: { use: "auto", label: "placeholder" } }))).toBe(true);
    expect(isAutoUsable(asset({ verdict: "PROVISIONAL", provisional: { use: "manual", label: "needs_improvement" } }))).toBe(false);
  });
  it("choix humain : un RETRY approuvé par le client est utilisable ; un FATAL jamais (inspection seulement)", () => {
    expect(isAutoUsable(asset({ verdict: "RETRY" }, "approved"))).toBe(true);
    expect(isAutoUsable(asset({ verdict: "REJECTED", fatal: true }, "approved"))).toBe(false);
    expect(manuallySelectable(asset({ verdict: "RETRY" }))).toBe(true);
    expect(manuallySelectable(asset({ verdict: "REJECTED", fatal: true }))).toBe(false);
  });
});

describe("historique d'un candidat : gain de qualité et coût de la reprise", () => {
  it("essai 1 à 7,2, défauts relevés, essai 2 à 8,6 : gain +1,4 et coût de chaque essai", async () => {
    const cand = `piste-test-${Date.now()}`;
    const d1 = decide("logo_route", ai(7.2, { issues: ["typographie faible", "symbole générique"] }));
    const c1 = await withCandidate(cand, 0, async () => {
      recordCall({ userId: "u", task: "logo_symbol", provider: "anthropic", requestedModel: "m", unit: "tokens", costMicro: 120_000, status: "ok" });
      return saveCheck(d1, { userId: "u", candidateId: cand });
    });
    const d2 = decide("logo_route", ai(8.6), { attempt: 1 });
    await withCandidate(cand, 1, async () => {
      recordCall({ userId: "u", task: "logo_symbol", provider: "anthropic", requestedModel: "m", unit: "tokens", costMicro: 90_000, status: "ok" });
      recordCall({ userId: "u", task: "image_generation", provider: "openai", requestedModel: "gpt-image-1", unit: "tokens", costMicro: 40_000, status: "ok" });
      return saveCheck(d2, { userId: "u", candidateId: cand, previousCheckId: c1 });
    });
    const trail = qualityTrail(cand);
    expect(trail.map((t) => [t.attempt, t.score, t.verdict])).toEqual([[0, 7.2, "RETRY"], [1, 8.6, "FINAL"]]);
    expect(trail[0].feedback).toMatch(/typographie faible/);
    expect(trail[1].qualityDelta).toBe(1.4);
    expect(trail[1].costMicro).toBe(130_000);
    expect(gateMeta(d2, "id")).toMatchObject({ verdict: "FINAL", fatal: false, checkId: "id" });
  });
});
