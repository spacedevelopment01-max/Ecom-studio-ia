/**
 * Prix de l'IA (choix du propriétaire, 16/10) : jamais d'euros montrés au client, tout coût est un % du budget IA du
 * mois de son compte (même base que la jauge « Reste … % ») ; devis = coût probable (un essai, sans marge de
 * sécurité ni reprise comptée d'avance) ; le plafond des tâches reste plus large (reprises), jamais montré comme prix.
 */
import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CAP_FACTOR, formatBudgetPct, formatPct, formatPctShort, pctOfBudget, pctToMicro } from "@/lib/budget-pct";

let routed: { provider: string; model: string; reason: string } | null = null;
vi.mock("@/lib/ai/media-providers", async (orig) => ({ ...(await orig<object>()), mediaRouteFor: () => routed }));

describe("format des % du budget IA", () => {
  // Français : espace fine insécable avant « % » (typographie).
  it("français : « ≈ 3,2 % de votre budget IA » ; anglais : « ≈ 3.2% of your AI budget »", () => {
    expect(formatBudgetPct(3.2, "fr")).toBe("≈ 3,2\u202f% de votre budget IA");
    expect(formatBudgetPct(3.2, "en")).toBe("≈ 3.2% of your AI budget");
    expect(formatPctShort(12.6, "fr")).toBe("≈ 13\u202f%");
    expect(formatPctShort(12.6, "en")).toBe("≈ 13%");
  });

  it("une décimale sous 10 % ; un coût non nul n'est jamais affiché « 0 % » ; sans budget connu : aucun chiffre inventé", () => {
    expect(formatPct(0.38, "fr")).toBe("0,4\u202f%");
    expect(formatPct(0.38, "en")).toBe("0.4%");
    expect(formatBudgetPct(0.38, "fr")).toBe("≈ 0,4\u202f% de votre budget IA");
    expect(formatPct(0.04, "fr")).toBe("< 0,1\u202f%");
    expect(formatBudgetPct(0.04, "fr")).toBe("< 0,1\u202f% de votre budget IA");
    expect(formatPct(23.6, "fr")).toBe("24\u202f%");
    expect(formatBudgetPct(null, "fr")).toBe("sur votre budget IA");
    expect(formatBudgetPct(null, "en")).toBe("from your AI budget");
    expect(formatPctShort(null, "fr")).toBe("—");
  });

  it("aucun « € » dans les textes de prix", () => {
    for (const lang of ["fr", "en"] as const) for (const v of [0.2, 3, 47.5, null]) expect(formatBudgetPct(v, lang)).not.toMatch(/€|eur/i);
  });

  it("calcul : part d'un coût dans le budget ; plafond en % → montant interne", () => {
    expect(pctOfBudget(150_000, 7_000_000)).toBeCloseTo(2.142857, 5);
    expect(pctOfBudget(150_000, 0)).toBeNull();
    expect(pctToMicro(10, 7_000_000)).toBe(700_000);
    expect(pctToMicro(10, null)).toBe(0);
  });
});

describe("devis au coût probable", async () => {
  const { estimateMicro, aiPostProbableMicro, capMicro } = await import("@/lib/ai/estimate");
  const { aiPostCapMicro } = await import("@/lib/engine/ai-post-image");
  const { DEFAULT_PRICES, usdToEur } = await import("@/lib/ai/config");
  const { EUR } = await import("@/lib/billing");
  const { setJsonSetting } = await import("@/lib/settings");
  const qwen = { provider: "alibaba", model: "qwen-image-3.0-pro", reason: "test" };
  const perImage = (DEFAULT_PRICES as Record<string, { perImage: number }>)["alibaba:qwen-image-3.0-pro"].perImage;

  beforeEach(() => {
    routed = null;
    setJsonSetting("billing.markup", 1);
  });

  it("image : la part image du devis est le tarif d'UNE image Qwen (sans les 20 % de sécurité ni 2e essai)", () => {
    routed = { provider: "alibaba", model: "modele-sans-tarif", reason: "test" };
    const withoutImage = estimateMicro("image");
    routed = qwen;
    expect(estimateMicro("image") - withoutImage).toBeCloseTo(perImage * usdToEur() * EUR, -1);
  });

  it("le coefficient de l'administration (billing.markup) reste compris, comme au débit réel", () => {
    routed = qwen;
    const one = estimateMicro("image");
    setJsonSetting("billing.markup", 2);
    expect(estimateMicro("image")).toBeCloseTo(2 * one, -1);
  });

  it("publication : coût probable d'un essai, bien en dessous du plafond (3 essais) de la tâche", () => {
    routed = qwen;
    const probable = aiPostProbableMicro();
    expect(probable).toBeGreaterThan(0);
    expect(probable).toBeLessThan(aiPostCapMicro() / 2);
    expect(capMicro(probable)).toBe(Math.round(probable * CAP_FACTOR));
  });
});

describe("base des % : la même réserve que la jauge « Reste … % »", async () => {
  const { createUser } = await import("@/lib/auth");
  const { createSubscription } = await import("@/lib/project-subscriptions");
  const { aiPctBaseMicro, balance } = await import("@/lib/billing");

  it("forfait actif : le budget IA du mois du forfait ; sans abonnement : aucun budget (aucun % inventé)", async () => {
    const u = await createUser(`pct-${Date.now()}@test.fr`, "motdepasse-test", "P");
    const key = createSubscription(u.id, { plan: "creer", source: "admin" });
    // Rien d'utilisé : la base est tout le budget du mois (le disponible de la jauge).
    expect(aiPctBaseMicro(key)).toBeGreaterThan(0);
    expect(aiPctBaseMicro(key)).toBe(balance(key).available);
    expect(aiPctBaseMicro(`noplan:${u.id}`)).toBe(0);
  });
});

describe("écrans du client : aucun prix d'IA en euros", () => {
  const files = [
    "src/components/studio/ai-image-actions.tsx",
    "src/components/studio/social-create.tsx",
    "src/components/studio/ad-editor/ai-ad-creator.tsx",
    "src/components/studio/guided-video.tsx",
    "src/components/studio/tab-videos.tsx",
    "src/components/studio/video-v2-panel.tsx",
    "src/components/studio/workflow-panel.tsx",
    "src/components/studio/logo-v2-panel.tsx",
    "src/components/studio/social-studio.tsx",
    "src/components/studio/social-autopilot.tsx",
  ];
  for (const f of files) {
    it(`${f} : ni « € » ni formatEur, prix par useBudgetPct`, () => {
      const s = fs.readFileSync(path.join(process.cwd(), f), "utf8");
      expect(s).not.toMatch(/€|formatEur/);
      expect(s).toContain("useBudgetPct");
    });
  }

  it("devis renvoyés par le serveur : un champ pct (part du budget IA) à côté du montant interne", () => {
    const routes = ["src/app/api/projects/[id]/images/route.ts", "src/app/api/projects/[id]/creative/image/[assetId]/route.ts", "src/app/api/projects/[id]/campaigns/v2/route.ts", "src/app/api/projects/[id]/social/v2/route.ts", "src/app/api/projects/[id]/creative/video/route.ts"];
    for (const r of routes) expect(fs.readFileSync(path.join(process.cwd(), r), "utf8"), r).toMatch(/budgetPctOf\(/);
  });
});
