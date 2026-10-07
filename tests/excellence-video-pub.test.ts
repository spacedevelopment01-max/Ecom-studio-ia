/**
 * Passe « excellence » des publicités, des montages vidéo et des scripts UGC : réponses d'IA simulées
 * excellentes, moyennes et mauvaises ; la boucle (contrôles déterministes + directeur de création noté, seuil 8/10,
 * une reprise ciblée, meilleure version gardée) doit relever le niveau, et le moteur local respecter les règles du
 * métier (accroche immédiate, rupture toutes les 1,5 à 2,5 s, structure UGC, budget de test honnête).
 * Cas réel : compagnon pour enfant rose à oreilles (marque inventée).
 */
import { describe, expect, it, vi } from "vitest";

const llm = vi.hoisted(() => ({ queues: {} as Record<string, unknown[]>, calls: [] as { task: string; prompt: string }[], fail: new Set<string>() }));
vi.mock("@/lib/ai/llm", async (orig) => ({
  ...(await orig<typeof import("@/lib/ai/llm")>()),
  llmConfigured: () => true,
  llmJson: async (call: { task: string; prompt: string }, schema: { parse: (v: unknown) => unknown }) => {
    llm.calls.push({ task: call.task, prompt: call.prompt });
    if (llm.fail.has(call.task)) throw new Error("fournisseur indisponible");
    const q = llm.queues[call.task] ?? [];
    return schema.parse(q.length > 1 ? q.shift() : q[0]);
  },
}));
vi.mock("@/lib/ai/context", async (orig) => ({ ...(await orig<typeof import("@/lib/ai/context")>()), projectContext: () => "<contexte_projet></contexte_projet>", brainContext: () => "<contexte_projet></contexte_projet>", brainView: () => ({ stable: "<contexte_projet></contexte_projet>", kept: [], label: "test", hash: "h", brainVersion: "test" }) }));

import { draftAds, localAdStrategy, localAds } from "@/lib/engine/ads";
import { adPolicyIssues, audienceIssues, craftLoop, craftPassed, craftScore, honestTestBudget, paceVideoPlan, RUBRICS, ugcCraftIssues, ugcStructure, videoPlanIssues } from "@/lib/engine/ad-craft";
import { localVideoPlan } from "@/lib/engine/local";
import { localUgcScript } from "@/lib/engine/ugc";
import { ugcIssues } from "@/lib/ugc-rules";
import { punchIn, type VideoSpec } from "@/lib/media/video";
import { lintClaims } from "@/lib/ai/tasks";
import { runWithLang } from "@/lib/i18n-server";
import { emptyProduct, type Brand } from "@/lib/project-types";
import type { Project } from "@/lib/projects";

const brand = {
  name: "Pompon",
  nameStatus: "proposed",
  alternatives: [],
  tagline: "Une lueur rose à portée de main",
  positioning: "Petit compagnon rose pour la chambre d'enfant",
  audience: "Parents de jeunes enfants qui aménagent la chambre",
  personality: ["tendre", "simple"],
  tone: { voice: "doux et concret", do: ["décrire ce qu'on voit"], dont: ["promettre le sommeil"] },
  palette: { primary: "#C98A8E", secondary: "#F2DCDB", accent: "#7A4E8C", light: "#FBF4F3", dark: "#2B1E22" },
  fonts: { heading: "Fraunces", body: "Jost" },
  logo: { concept: "Deux oreilles arrondies", status: "proposed", route: { key: "concept", name: "Oreilles douces", heading: "Fraunces", headingWeight: 600, body: "Jost", colors: { ink: "#2B1E22", accent: "#7A4E8C", ground: "#FBF4F3", tint: "#F2DCDB" }, source: "local" } },
  story: "",
  values: [],
  direction: "atelier",
  validated: [],
  generatedBy: "local",
} as unknown as Brand;

const pompon = (withPrice = true) =>
  ({
    id: "p-pompon",
    userId: "u",
    business: "products",
    settings: { language: "fr" },
    catalog: [],
    brand,
    strategy: { keyMessages: [], angles: [], pillars: [] },
    product: {
      ...emptyProduct(),
      name: "Pompon",
      nameStatus: "provided",
      sector: "enfants",
      category: "Compagnon pour enfant",
      summary: "Boîtier rose à oreilles de lapin, disque blanc au centre.",
      facts: [
        { key: "color", label: "Couleur", value: "Rose poudré", status: "confirmed", source: "photo" },
        { key: "shape", label: "Forme", value: "Deux oreilles de lapin", status: "confirmed", source: "photo" },
        { key: "function", label: "Fonction", value: "", status: "unknown", source: "ai" },
      ],
      price: withPrice ? { amount: 3490, currency: "EUR", status: "confirmed" } : { amount: null, currency: "EUR", status: "unknown" },
      visual: { colors: [], description: "Boîtier rond rose, deux oreilles, disque blanc", labelText: [] },
    },
  }) as unknown as Project;

const reset = () => {
  llm.queues = {};
  llm.calls = [];
  llm.fail = new Set();
};
const review = (n: number, fixes: string[] = []) => ({ scores: Object.fromEntries(Object.keys(RUBRICS.ads).map((k) => [k, n])), strengths: ["Accroche visuelle"], fixes });
const strategy = { summary: "Test de 3 accroches sur deux audiences de parents.", audiences: [{ name: "Parents", who: "Parents d'enfants de 2 à 6 ans", signals: "Advantage+", why: "Acheteurs" }, { name: "Cadeau", who: "Grands-parents qui cherchent un cadeau de naissance", signals: "Intérêt cadeaux", why: "Achat cadeau" }], structure: ["1 campagne Ventes", "2 ensembles", "3 annonces par ensemble"], tests: [{ variable: "Accroche", hypothesis: "Le détail des oreilles arrête mieux le défilement" }], kpis: ["Taux d'arrêt 3 s", "Coût par achat"] };
const EXCELLENT = {
  strategy,
  hooks: [{ text: "Deux oreilles de lapin, rose poudré", visual: "Gros plan, la main pose le boîtier sur la table de nuit", lever: "Détail" }],
  ads: [
    { angle: "Les oreilles", lever: "Détail", hook: "Deux oreilles de lapin, rose poudré", primary: "Deux oreilles de lapin, rose poudré.\n\nUn boîtier rond qui tient dans la main, disque blanc au centre.", headline: "Pompon, de près", description: "Pompon", cta: "Voir le produit", visual: "9:16 gros plan" },
    { angle: "La chambre", lever: "Situation", hook: "Sa place : la table de nuit", primary: "Sa place : la table de nuit.\n\nRose poudré, il se fond dans la chambre.", headline: "Pompon dans la chambre", description: "Pompon", cta: "Découvrir", visual: "1:1 photo en situation" },
    { angle: "Le cadeau", lever: "Cadeau", hook: "Une idée de cadeau de naissance", primary: "Une idée de cadeau de naissance.\n\nDeux oreilles de lapin, un disque blanc, rose poudré.", headline: "Un cadeau tout rose", description: "Pompon", cta: "Acheter", visual: "4:5 carrousel" },
  ],
};
const MEDIUM = {
  strategy,
  hooks: [{ text: "Découvrez Pompon", visual: "Packshot", lever: "Découverte" }],
  ads: [
    { angle: "Le produit", hook: "Découvrez Pompon", primary: "Découvrez Pompon.\n\nUn joli compagnon rose.", headline: "Découvrez Pompon", description: "Pompon", cta: "Découvrir" },
    { angle: "La chambre", hook: "Pompon dans la chambre", primary: "Pompon dans la chambre.\n\nRose poudré.", headline: "Pompon dans la chambre", description: "Pompon", cta: "Découvrir" },
    { angle: "Le cadeau", hook: "Une idée de cadeau", primary: "Une idée de cadeau.\n\nRose poudré.", headline: "Un cadeau", description: "Pompon", cta: "Acheter" },
  ],
};
const BAD = {
  strategy: { ...strategy, audiences: [{ name: "Enfants", who: "Enfants de 3 à 6 ans", signals: "Dessins animés", why: "Utilisateurs" }] },
  hooks: [{ text: "VOUS ÊTES ÉPUISÉE ??", visual: "", lever: "" }],
  ads: [
    { angle: "Sommeil", hook: "VOUS ÊTES ÉPUISÉE ??", primary: "VOUS ÊTES ÉPUISÉE ?? Pompon aide votre bébé à s'endormir, sans danger pour les bébés et recommandé par les pédiatres, cliquez ici pour en profiter avant la fin de la promotion exceptionnelle.", headline: "Le compagnon révolutionnaire !", description: "Livraison offerte en 24 h partout en France", cta: "Commander" },
  ],
};

describe("publicités : boucle du directeur de création", () => {
  it("excellente : une seule passe, plan de test complet, budget calculé par le studio", async () => {
    reset();
    llm.queues = { ad_creative: [EXCELLENT], quality_control: [review(9)] };
    const r = await runWithLang({ content: "fr", ui: "fr" }, () => draftAds(pompon(), { userId: "u", count: 3, objective: "Ventes", networks: ["instagram", "facebook", "tiktok"] }));
    expect(llm.calls.map((c) => c.task)).toEqual(["ad_creative", "quality_control"]);
    expect(r.by).toBe("ai");
    expect(r.strategy.quality).toMatchObject({ passed: true, rounds: 1, score: 9 });
    expect(r.ads.map((a) => a.hook)).toEqual(EXCELLENT.ads.map((a) => a.hook));
    expect(r.strategy.budget.rule).toMatch(/35\s?€/);
    expect(r.strategy.budget.note).toMatch(/pas une garantie/);
    // Le budget calculé est donné au rédacteur, qui ne doit pas en inventer un autre.
    expect(llm.calls[0].prompt).toMatch(/Budget de test calculé par le studio/);
  });

  it("moyenne (6,5/10) : reprise ciblée avec les consignes du directeur de création, la meilleure est gardée", async () => {
    reset();
    llm.queues = { ad_creative: [MEDIUM, EXCELLENT], quality_control: [review(6.5, ["Accroche 1 : « Découvrez Pompon » est générique ; montre les oreilles dès la 1re seconde."]), review(8.7)] };
    const r = await runWithLang({ content: "fr", ui: "fr" }, () => draftAds(pompon(), { userId: "u", count: 3 }));
    expect(llm.calls.map((c) => c.task)).toEqual(["ad_creative", "quality_control", "ad_creative", "quality_control"]);
    expect(llm.calls[2].prompt).toMatch(/montre les oreilles dès la 1re seconde/);
    expect(r.ads[0].headline).toBe("Pompon, de près");
    expect(r.strategy.quality).toMatchObject({ rounds: 2, passed: true, score: 8.7 });
  });

  it("mauvaise : allégations, attribut personnel, majuscules et audience d'enfants déclenchent la reprise même si la note est haute", async () => {
    reset();
    llm.queues = { ad_creative: [BAD, EXCELLENT], quality_control: [review(9), review(9)] };
    const r = await runWithLang({ content: "fr", ui: "fr" }, () => draftAds(pompon(), { userId: "u", count: 1 }));
    const fb = llm.calls[2].prompt;
    expect(fb).toMatch(/attribut personnel/);
    expect(fb).toMatch(/capitales/);
    expect(fb).toMatch(/ponctuation répétée/);
    expect(fb).toMatch(/on ne cible jamais des enfants/);
    expect(fb).toMatch(/sécurité de l'enfant|sommeil/);
    expect(r.ads[0].hook).toBe("Deux oreilles de lapin, rose poudré");
    expect(lintClaims(r.ads, pompon())).toEqual([]);
  });

  it("reprise encore pire : la première version est gardée, nettoyée ; points restants signalés", async () => {
    reset();
    llm.queues = { ad_creative: [MEDIUM, BAD], quality_control: [review(6.8, ["Accroches génériques."]), review(4)] };
    const r = await runWithLang({ content: "fr", ui: "fr" }, () => draftAds(pompon(), { userId: "u", count: 3 }));
    expect(r.ads[0].hook).toBe("Découvrez Pompon");
    expect(r.strategy.quality?.passed).toBe(false);
    expect(r.strategy.quality?.remaining).toContain("Accroches génériques.");
  });

  it("relecture impossible (fournisseur) : l'annonce est livrée, contrôlée par les seules règles", async () => {
    reset();
    llm.queues = { ad_creative: [EXCELLENT] };
    llm.fail.add("quality_control");
    const r = await runWithLang({ content: "fr", ui: "fr" }, () => draftAds(pompon(), { userId: "u", count: 3 }));
    expect(r.ads).toHaveLength(3);
    expect(llm.calls.filter((c) => c.task === "ad_creative")).toHaveLength(1);
  });
});

describe("règles des régies et budget honnête", () => {
  it("attributs personnels, capitales, ponctuation, longueurs et accroches en double", () => {
    const issues = adPolicyIssues(
      [
        { hook: "Vous êtes stressée le soir ?", primary: "Votre insomnie n'est pas une fatalité !!", headline: "OFFRE SPÉCIALE", description: "Une description beaucoup trop longue pour Meta", cta: "Acheter" },
        { hook: "Vous êtes stressée le soir ?", primary: "x", headline: "Cliquez ici", cta: "Acheter" },
      ],
      pompon(),
    );
    const all = issues.join("\n");
    expect(all).toMatch(/attribut personnel/);
    expect(all).toMatch(/capitales/);
    expect(all).toMatch(/ponctuation répétée/);
    expect(all).toMatch(/description de \d+ caractères/);
    expect(all).toMatch(/même accroche/);
    expect(all).toMatch(/cliquez ici/);
    expect(adPolicyIssues(EXCELLENT.ads, pompon())).toEqual([]);
  });

  it("audience d'enfants refusée, parents acceptés", () => {
    expect(audienceIssues([{ name: "a", who: "Enfants de 3 à 6 ans" }], pompon())).toHaveLength(1);
    expect(audienceIssues([{ name: "a", who: "Parents d'enfants de 3 à 6 ans" }], pompon())).toEqual([]);
  });

  it("budget : règle d'arrêt tirée du prix ; sans prix, espace réservé ; jamais de résultat promis", () => {
    const withPrice = honestTestBudget(pompon(true), "fr");
    expect(withPrice.rule).toMatch(/35\s?€ à 70\s?€/);
    const noPrice = honestTestBudget(pompon(false), "fr");
    expect(noPrice.rule).toMatch(/\[À compléter : prix de vente et marge\]/);
    for (const b of [withPrice, noPrice]) expect(Object.values(b).join(" ")).not.toMatch(/ROAS de \d|garanti(?!e)|vous allez vendre/i);
  });

  it("moteur local : chaque annonce a une accroche, un visuel, un levier ; plan de test aux parents", () => {
    const ads = runWithLang({ content: "fr", ui: "fr" }, () => localAds(pompon(), "fr", 3));
    for (const a of ads) {
      expect(a.hook?.split(/\s+/).length).toBeLessThanOrEqual(10);
      expect(a.visual).toBeTruthy();
      expect(a.primary.split("\n")[0].length).toBeLessThanOrEqual(125);
    }
    expect(new Set(ads.map((a) => a.lever)).size).toBe(3);
    expect(adPolicyIssues(ads, pompon())).toEqual([]);
    const s = runWithLang({ content: "fr", ui: "fr" }, () => localAdStrategy(pompon(), "fr", { count: 3, networks: ["instagram", "tiktok"] }));
    expect(s.audiences[1].who).toMatch(/18 ans et plus/);
    expect(audienceIssues(s.audiences, pompon())).toEqual([]);
    expect(s.structure.join(" ")).toMatch(/TikTok/);
    expect(s.hooks).toHaveLength(3);
  });
});

describe("montage : accroche immédiate et rupture toutes les 1,5 à 2,5 s", () => {
  const BAD_PLAN: VideoSpec = {
    format: "9:16",
    transition: "fade",
    music: "calm",
    captions: true,
    scenes: [
      { kind: "title", duration: 3.2, text: "Découvrez notre toute nouvelle création pour les enfants" },
      { kind: "reveal", duration: 4.5, headline: "Pompon" },
      { kind: "scene", duration: 3, image: 0 },
      { kind: "scene", duration: 3, image: 0 },
    ],
  };
  const GOOD_PLAN: VideoSpec = {
    format: "9:16",
    transition: "push",
    music: "pulse",
    captions: true,
    scenes: [
      { kind: "hook", duration: 2, image: 0, headline: "Deux oreilles de lapin" },
      { kind: "spotlight", duration: 2.5, headline: "Rose poudré" },
      { kind: "words", duration: 2.5, items: ["Rose poudré", "Disque blanc"] },
      { kind: "detail", duration: 2, image: 1, caption: "Le disque blanc" },
      { kind: "split", duration: 2.5, image: 2, headline: "Sur la table de nuit" },
      { kind: "end", duration: 3, headline: "Pompon", cta: "Découvrir" },
    ],
  };

  it("contrôles de montage : le mauvais découpage est entièrement relevé, le bon passe", () => {
    const issues = videoPlanIssues(BAD_PLAN).join("\n");
    expect(issues).toMatch(/carte de titre/);
    expect(issues).toMatch(/trop long pour une accroche/);
    expect(issues).toMatch(/sans rupture/);
    expect(issues).toMatch(/mots à l'écran/);
    expect(issues).toMatch(/même photo/);
    expect(issues).toMatch(/écran d'appel à l'action/);
    expect(videoPlanIssues({ ...GOOD_PLAN, scenes: [GOOD_PLAN.scenes[0], { kind: "reveal", duration: 2.4, headline: "Pompon" }, { kind: "split", duration: 2.4, image: 1, headline: "Pompon" }, GOOD_PLAN.scenes[5]] }).join(" ")).toMatch(/même titre/);
    expect(videoPlanIssues(GOOD_PLAN)).toEqual([]);
  });

  it("rythme : plans photo bornés à 2,6 s, accroche à 2,2 s, coupes sur le temps avec une musique rythmée", () => {
    const paced = paceVideoPlan({ ...BAD_PLAN, music: "pulse" });
    expect(paced.scenes[0].duration).toBeLessThanOrEqual(2.2);
    for (const s of paced.scenes) {
      expect(s.duration).toBeLessThanOrEqual(3);
      expect((s.duration * 2) % 1).toBe(0);
    }
    expect(punchIn(2.6, 1.4)).toBeGreaterThan(1);
    expect(punchIn(2, 1.5)).toBe(1);
  });

  it("moteur local : jamais d'ouverture sur une carte de titre, découpage conforme une fois rythmé", () => {
    const p = pompon();
    for (const sector of ["enfants", "alimentation", "beaute", "hightech"] as const) {
      for (const roles of [[], ["lifestyle", "scene", "detail"], ["detail"]]) {
        const spec = runWithLang({ content: "fr" }, () => localVideoPlan({ ...p.product, sector }, brand, "9:16", roles, undefined, p));
        const paced = paceVideoPlan(spec);
        expect(paced.scenes[0].kind).not.toBe("title");
        const left = videoPlanIssues(paced).filter((x) => !/Durée totale/.test(x));
        expect(left, `${sector} / ${roles.join(",")}`).toEqual([]);
      }
    }
  });

  it("boucle vidéo simulée : mauvais découpage → reprise → bon découpage gardé", async () => {
    const drafts = [BAD_PLAN, GOOD_PLAN];
    const reviews = [{ scores: Object.fromEntries(Object.keys(RUBRICS.video).map((k) => [k, 5])), strengths: [], fixes: ["Ouvre sur la photo en situation."] }, { scores: Object.fromEntries(Object.keys(RUBRICS.video).map((k) => [k, 8.5])), strengths: [], fixes: [] }];
    const feedbacks: (string | undefined)[] = [];
    const r = await runWithLang({ ui: "fr" }, () =>
      craftLoop("video", {
        draft: async (fb) => (feedbacks.push(fb), drafts.shift()!),
        lint: (s) => videoPlanIssues(paceVideoPlan(s)),
        review: async () => reviews.shift()!,
      }),
    );
    expect(r.best).toBe(GOOD_PLAN);
    expect(feedbacks[1]).toMatch(/carte de titre/);
    expect(feedbacks[1]).toMatch(/Ouvre sur la photo en situation/);
    expect(r.quality).toMatchObject({ rounds: 2, passed: true });
  });
});

describe("UGC : problème → découverte → démonstration → preuve → appel, sans faux témoignage", () => {
  it("structure condensée selon le nombre de plans", () => {
    expect(ugcStructure(5).flat()).toEqual(["problem", "discovery", "demo", "proof", "cta"]);
    for (let n = 1; n <= 5; n++) {
      const flat = ugcStructure(n).flat();
      expect(flat[0]).toBe("problem");
      expect(flat[flat.length - 1]).toBe("cta");
    }
  });

  it("script local : accroche courte, rôles, aucun témoignage, appel final, pour 1 à 5 plans", () => {
    for (let n = 1; n <= 5; n++) {
      const s = runWithLang({ content: "fr", ui: "fr" }, () => localUgcScript(pompon(), { format: "9:16", beats: n, presenter: "femme", age: "25-35", setting: "chambre", tone: "naturel", angle: "presentation", url: "pompon.fr" }));
      expect(s.beats).toHaveLength(n);
      expect(ugcIssues(s)).toEqual([]);
      expect(runWithLang({ ui: "fr" }, () => ugcCraftIssues(s))).toEqual([]);
      expect(s.beats[0].role?.startsWith("problem")).toBe(true);
      for (const b of s.beats) expect(b.line.split(/\s+/).length).toBeLessThanOrEqual(22);
    }
  });

  it("script médiocre relevé : ouverture générique, accroche trop longue, pas d'appel", () => {
    const bad = { beats: [{ line: "Salut tout le monde, aujourd'hui je vais vous présenter un produit vraiment super que je trouve génial.", caption: "" }, { line: "Il est rose.", caption: "" }] };
    const issues = runWithLang({ ui: "fr" }, () => ugcCraftIssues(bad)).join("\n");
    expect(issues).toMatch(/ouverture générique/);
    expect(issues).toMatch(/appel à l'action absent/);
  });

  it("notes : seuil 8 de moyenne et aucun critère sous 6", () => {
    const ok = { scores: { hook: 9, authenticity: 8, structure: 8, demonstration: 8, honesty: 9, cta: 8 }, strengths: [], fixes: [] };
    expect(craftPassed(ok, "ugc")).toBe(true);
    expect(craftPassed({ ...ok, scores: { ...ok.scores, honesty: 5 } }, "ugc")).toBe(false);
    // Critère manquant : relecture incomplète, comptée 0.
    expect(craftScore({ ...ok, scores: { hook: 10 } }, "ugc").min).toBe(0);
  });
});
