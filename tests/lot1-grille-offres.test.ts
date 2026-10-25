/**
 * Lot 1 (issue #163, action 04) : la grille commerciale décidée (#150, rappelée par #163) est celle que le code
 * applique. Ce test ne crée aucune règle : il relit `plans.ts`, les droits par famille et le calcul interne du budget IA,
 * pour qu'un écart futur entre la grille, les écrans et le serveur soit vu tout de suite.
 */
import { describe, expect, it } from "vitest";
import { PACKS_FOR_SALE, PLANS, PLAN_IDS, PROJECTS_PER_SUBSCRIPTION, TOPUP_PRICE_EUR, type PlanId } from "../src/lib/plans";
import { PLAN_THEME_ORDER, planAllowsAds, planAllowsSection, planAllowsTheme, BASE_SECTIONS, ADVANCED_SECTIONS } from "../src/lib/plan-entitlements";
import { EUR, PACK_AI_SHARE, SALES_VAT_RATE, SUBSCRIPTION_AI_SHARE, htEur, monthlyAllowanceMicro } from "../src/lib/billing";

const GRID: Record<PlanId, { month: number; themes: number | "tous"; sections: number; angles: number; posts: number; horizon: number; blog: number; videos: boolean; ads: boolean; aiSections: boolean; pages: boolean; call: number | "inclus" }> = {
  creer: { month: 49, themes: 1, sections: 8, angles: 1, posts: 1, horizon: 7, blog: 0, videos: false, ads: false, aiSections: false, pages: false, call: 60 },
  vendre: { month: 89, themes: 3, sections: 12, angles: 2, posts: 3, horizon: 30, blog: 5, videos: true, ads: false, aiSections: false, pages: true, call: 30 },
  dominer: { month: 129, themes: "tous", sections: 20, angles: 5, posts: 5, horizon: 90, blog: 10, videos: true, ads: true, aiSections: true, pages: true, call: "inclus" },
};

describe("Lot 1 — grille commerciale appliquée par le code", () => {
  it("prix TTC, un projet par abonnement, recharge 10 €, anciens packs plus vendus", () => {
    expect(PLAN_IDS).toEqual(["creer", "vendre", "dominer"]);
    for (const id of PLAN_IDS) {
      expect(PLANS[id].price.month).toBe(GRID[id].month);
      // Règle historique conservée (non redécidée ici) : l'annuel = 10 mois.
      expect(PLANS[id].price.year).toBe(GRID[id].month * 10);
    }
    expect(PROJECTS_PER_SUBSCRIPTION).toBe(1);
    expect(TOPUP_PRICE_EUR).toBe(10);
    expect(PACKS_FOR_SALE).toEqual([]);
  });

  it("droits 1/3/tous par famille, sections 8/12/20 de la bibliothèque, angles 1/2/5", () => {
    for (const id of PLAN_IDS) {
      const g = GRID[id];
      expect(PLANS[id].librarySections).toBe(g.sections);
      expect(PLANS[id].marketingAngles).toBe(g.angles);
      for (const [family, order] of Object.entries(PLAN_THEME_ORDER)) {
        const real = order.filter((t): t is string => !!t);
        const allowed = real.filter((t) => planAllowsTheme(id, t));
        expect(allowed).toEqual(g.themes === "tous" ? real : real.slice(0, g.themes));
        // Bibliothèque : 8 sections de base, 12 avec les avancées ; « 20 » ouvre toute la bibliothèque de la famille.
        const f = family as keyof typeof BASE_SECTIONS;
        const base = BASE_SECTIONS[f].map((k) => `${f}.${k}`);
        const adv = ADVANCED_SECTIONS[f].map((k) => `${f}.${k}`);
        expect(base).toHaveLength(8);
        expect(base.length + adv.length).toBe(12);
        expect(base.every((k) => planAllowsSection(id, f, k))).toBe(true);
        expect(adv.every((k) => planAllowsSection(id, f, k))).toBe(g.sections >= 12);
        // Jamais une section d'une autre famille.
        const other = (Object.keys(BASE_SECTIONS) as (keyof typeof BASE_SECTIONS)[]).find((x) => x !== f)!;
        expect(planAllowsSection(id, f, `${other}.hero`)).toBe(false);
      }
    }
    expect(planAllowsTheme(null, "fraise")).toBe(false);
  });

  it("publications 1/3/5 par jour, horizon 7/30/90, blog 0/5/10, vidéo dès le 2e, publicité et sections IA au 3e, pages aux deux supérieurs", () => {
    for (const id of PLAN_IDS) {
      const g = GRID[id];
      expect(PLANS[id].postsPerDay).toBe(g.posts);
      expect(PLANS[id].calendarDays).toBe(g.horizon);
      expect(PLANS[id].quotas.blog).toBe(g.blog);
      expect(PLANS[id].videos !== "none").toBe(g.videos);
      expect(planAllowsAds(id)).toBe(g.ads);
      expect(PLANS[id].aiSections).toBe(g.aiSections);
      expect(PLANS[id].pageModels).toBe(g.pages);
    }
    expect(planAllowsAds(null)).toBe(false);
  });

  it("appel initial unique : 60 € / 30 € / inclus", () => {
    expect(PLANS.creer.callPrice).toBe(60);
    expect(PLANS.vendre.callPrice).toBe(30);
    expect(PLANS.dominer.freeFirstCall).toBe(true);
    expect(PLANS.creer.freeFirstCall || PLANS.vendre.freeFirstCall).toBe(false);
  });

  it("budget interne caché : 40 % du HT de l'abonnement, 50 % du HT d'une recharge (TVA 20 %)", () => {
    expect(SALES_VAT_RATE).toBe(0.2);
    expect(SUBSCRIPTION_AI_SHARE).toBe(0.4);
    expect(PACK_AI_SHARE).toBe(0.5);
    for (const id of PLAN_IDS) {
      const micro = monthlyAllowanceMicro({ status: "active", plan: id, billing: "month" });
      expect(micro).toBe(Math.floor(0.4 * (GRID[id].month / 1.2) * EUR));
      expect(micro / EUR).toBeLessThanOrEqual(0.4 * htEur(GRID[id].month));
    }
    // Annuel : équivalent mensuel arrondi au centime inférieur, jamais au-dessus de 40 % du HT payé.
    expect(monthlyAllowanceMicro({ status: "active", plan: "creer", billing: "year" }) / EUR).toBeLessThanOrEqual(0.4 * htEur(490 / 12));
    expect(monthlyAllowanceMicro({ status: "none", plan: "dominer", billing: "month" })).toBe(0);
  });
});
