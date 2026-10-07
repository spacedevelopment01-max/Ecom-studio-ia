/**
 * Passe « excellence » : stratégie de marque et rédaction (boutique, blog, moteur local).
 * L'IA est simulée à trois niveaux (excellente, moyenne, mauvaise) : la relecture du directeur de création
 * doit laisser passer l'excellent en une passe, relever le moyen par UNE reprise ciblée, nettoyer le mauvais,
 * et toujours garder la meilleure version. Cas réels : veilleuse pour enfant (Mirabou) et drone pliable (Ventelle).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const llm = vi.hoisted(() => ({ copies: [] as unknown[], reviews: [] as unknown[], calls: [] as { task: string; prompt: string; system: string }[] }));
vi.mock("@/lib/ai/llm", async (orig) => ({
  ...(await orig<typeof import("@/lib/ai/llm")>()),
  llmConfigured: () => true,
  // Réponses simulées passées par le vrai schéma (tolérances comprises), comme une vraie réponse.
  llmJson: async (call: { task: string; prompt: string; system: string }, schema: { parse: (v: unknown) => unknown }) => {
    llm.calls.push(call);
    if (call.task === "copywriting") return schema.parse(llm.copies.shift());
    if (call.task === "quality_control") return schema.parse(llm.reviews.shift());
    throw new Error(`tâche inattendue ${call.task}`);
  },
}));
vi.mock("@/lib/ai/context", async (orig) => ({ ...(await orig<typeof import("@/lib/ai/context")>()), projectContext: () => "<contexte_projet></contexte_projet>", brainContext: () => "<contexte_projet></contexte_projet>", brainView: () => ({ stable: "<contexte_projet></contexte_projet>", kept: [], label: "test", hash: "h", brainVersion: "test" }) }));

import { aiShopCopyChecked, copyQuality, CopyReviewSchema, copyReviewPassed, lintClaims, lintHollow } from "@/lib/ai/tasks";
import { platformContext } from "@/lib/ai/context";
import { systemPrompts } from "@/lib/ai/prompts";
import { coversKeyword, localTopics, seoIssues, type ArticleDraft } from "@/lib/engine/blog";
import { localAnalysis, localBrand, localPlatform } from "@/lib/engine/local";
import { localCopy, localSeoTitle, objectionAnswers } from "@/lib/engine/local-copy";
import { brandIssues, finalizeBrand } from "@/lib/engine/brand-check";
import { runWithLang } from "@/lib/i18n-server";
import { droneBrand, droneExcellent, droneMedium, dronePlatform, droneProduct, kidBad, kidBrand, kidExcellent, kidMedium, kidPlatform, kidProduct, projectOf, reviewBad, reviewExcellent, reviewMedium } from "./excellence-strategie-redaction.fixtures";

const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);
const b = { userId: "u-test", projectId: "p", usageKey: "t" };

beforeEach(() => {
  llm.copies = [];
  llm.reviews = [];
  llm.calls = [];
});

describe("textes de boutique : boucle du directeur de création", () => {
  it("les textes « excellents » passent tous les contrôles (aucune allégation, aucune formule creuse, longueurs)", () => {
    for (const [copy, prod, brand, platform] of [[kidExcellent, kidProduct, kidBrand, kidPlatform], [droneExcellent, droneProduct, droneBrand, dronePlatform]] as const) {
      const p = projectOf(prod, brand, platform);
      expect(lintClaims(copy, p), brand.name).toEqual([]);
      expect(lintHollow(copy), brand.name).toEqual([]);
      expect(fr(() => copyQuality(copy, p)), brand.name).toEqual([]);
      expect(copy.seo.title.length).toBeLessThanOrEqual(60);
      expect(copy.seo.description.length).toBeGreaterThanOrEqual(120);
      expect(copy.seo.description.length).toBeLessThanOrEqual(155);
      // Le mot-clé de la catégorie (ce que tape l'acheteur) ouvre le titre SEO, la marque inventée le ferme.
      expect(copy.seo.title.endsWith(`| ${brand.name}`)).toBe(true);
      // Bénéfices > caractéristiques : titres de bénéfice de 2 mots ou plus, preuve dans le texte.
      for (const f of copy.features.items) expect(f.title.split(" ").length).toBeGreaterThanOrEqual(3);
      // Les objections de la plateforme sont traitées dans la FAQ.
      for (const o of platform.objections.slice(0, 3)) expect(copy.faq.items.some((q) => q.q.toLowerCase().includes(o.objection.toLowerCase().slice(0, 18)))).toBe(true);
    }
  });

  it("excellent du premier coup : une rédaction, une relecture, aucune reprise", async () => {
    const p = projectOf(kidProduct, kidBrand, kidPlatform);
    llm.copies = [kidExcellent];
    llm.reviews = [reviewExcellent];
    const r = await fr(() => aiShopCopyChecked(b, p));
    expect(llm.calls.map((c) => c.task)).toEqual(["copywriting", "quality_control"]);
    expect(r.qc.rounds).toBe(1);
    expect(r.qc.remaining).toEqual([]);
    expect(r.qc.score).toBeGreaterThanOrEqual(8);
    expect(r.copy.hero.heading).toBe(kidExcellent.hero.heading);
  });

  it("moyen : UNE reprise ciblée (version précédente + consignes du directeur de création), la meilleure version est gardée", async () => {
    const p = projectOf(kidProduct, kidBrand, kidPlatform);
    llm.copies = [kidMedium, kidExcellent];
    llm.reviews = [reviewMedium, reviewExcellent];
    const r = await fr(() => aiShopCopyChecked(b, p));
    expect(llm.calls.map((c) => c.task)).toEqual(["copywriting", "quality_control", "copywriting", "quality_control"]);
    const second = llm.calls[2].prompt;
    expect(second).toContain("<version_precedente>");
    expect(second).toContain("Découvrez Mirabou Lumi");
    expect(second).toMatch(/Priorité du directeur de création/);
    expect(second).toMatch(/Critères à relever .*benefits/);
    expect(second).toMatch(/compagnon idéal/);
    expect(r.copy.seo.title).toBe(kidExcellent.seo.title);
    expect(r.qc.score).toBeGreaterThanOrEqual(8);
  });

  it("formules creuses (« qualité supérieure », « innovant ») : défauts de forme bloquants, trois rédactions au plus", async () => {
    const p = projectOf(droneProduct, droneBrand, dronePlatform);
    llm.copies = [droneMedium, droneMedium, droneMedium, droneMedium];
    llm.reviews = [reviewMedium, reviewMedium, reviewMedium, reviewMedium];
    const r = await fr(() => aiShopCopyChecked(b, p));
    expect(llm.calls.filter((c) => c.task === "copywriting")).toHaveLength(3);
    expect(r.qc.remaining.join(" ")).toMatch(/formule creuse/);
    expect(llm.calls[2].prompt).toMatch(/qualité supérieure/);
  });

  it("conforme mais sous le seuil : une seule reprise de qualité, puis la meilleure des deux versions", async () => {
    const p = projectOf(droneProduct, droneBrand, dronePlatform);
    const ok = { ...droneExcellent, hero: { ...droneExcellent.hero, heading: "Un drone pour vos sorties" } };
    const better = { ...reviewMedium, issues: [], scores: { specificity: 7, benefits: 7, objections: 8, clarity: 8, voice: 7, seo: 8, conversion: 7 } };
    const lower = { ...reviewMedium, issues: [] };
    llm.copies = [ok, droneExcellent];
    llm.reviews = [better, lower];
    const r = await fr(() => aiShopCopyChecked(b, p));
    expect(llm.calls.filter((c) => c.task === "copywriting")).toHaveLength(2);
    // La reprise a été moins bien notée : la première version est gardée.
    expect(r.copy.hero.heading).toBe("Un drone pour vos sorties");
  });

  it("mauvais (allégations pour enfant, avis, livraison) : reprises puis nettoyage, rien de faux n'est publié", async () => {
    const p = projectOf(kidProduct, kidBrand, kidPlatform);
    llm.copies = [kidBad, kidBad, kidBad];
    llm.reviews = [reviewBad, reviewBad, reviewBad];
    const r = await fr(() => aiShopCopyChecked(b, p));
    expect(r.qc.rounds).toBe(3);
    expect(r.qc.remaining.length).toBeGreaterThan(0);
    expect(lintClaims(r.copy, p)).toEqual([]);
    expect(JSON.stringify(r.copy)).not.toMatch(/sans danger|non toxique|pédiatre|10 000|livraison offerte|s'endormir/i);
  });

  it("grille tolérante : note sur 100 ramenée sur 10, grille absente = échec (on ne montre pas un texte non relu)", () => {
    const r100 = CopyReviewSchema.parse({ scores: { specificity: 90, benefits: 85, objections: 80, clarity: 90, voice: 90, seo: 85, conversion: 80 }, issues: [] });
    expect(r100.scores.specificity).toBe(9);
    expect(copyReviewPassed(r100)).toBe(true);
    const none = CopyReviewSchema.parse({ issues: [{ path: "x", severity: "grave", problem: "p", fix: "f" }] });
    expect(none.scores.seo).toBe(0);
    expect(none.issues[0].severity).toBe("mineur");
    expect(copyReviewPassed(none)).toBe(false);
    // Un défaut bloquant empêche de passer, même avec de bonnes notes.
    expect(copyReviewPassed({ ...r100, issues: [{ path: "a", severity: "bloquant", problem: "allégation", fix: "" }] })).toBe(false);
    // Un critère sous 6 suffit à refuser.
    expect(copyReviewPassed({ ...r100, scores: { ...r100.scores, objections: 5 } })).toBe(false);
  });
});

describe("consignes d'expert (prompts)", () => {
  const P = systemPrompts("fr");
  it("rédaction : méthode d'agence (plateforme, échelle des bénéfices, AIDA, fiche, FAQ, micro-textes, SEO) et exemple", () => {
    for (const k of ["persona", "et alors ?", "AIDA", "PAS", "Bon à savoir", "objection", "Micro-textes", "seo.title", "Médiocre", "Excellent", "preuves « manquantes »"]) expect(P.copy, k).toContain(k);
  });
  it("relecture : grille notée sur 7 critères et conformité", () => {
    for (const k of ["specificity", "benefits", "objections", "clarity", "voice", "seo", "conversion", "bloquant", "brief"]) expect(P.copyReview, k).toContain(k);
  });
  it("stratégie : persona précis, problème, concurrence typique, différence, preuves, objections", () => {
    for (const k of ["Persona", "Problème", "Alternatives", "Différence", "Preuves", "Objections", "missing"]) expect(P.brand, k).toContain(k);
  });
  it("analyse : questions de consultant (fonction, cible, caractéristiques du secteur, preuve, logistique) avec exemple", () => {
    for (const k of ["FONCTION", "cible et le moment d'usage", "high-tech", "enfants", "preuve d'une différence", "Exemple excellent"]) expect(P.analysis, k).toContain(k);
  });
});

describe("plateforme de marque", () => {
  it("transmise aux rédacteurs : preuves disponibles, arguments SANS PREUVE à ne jamais affirmer, objections et réponses", () => {
    const t = fr(() => platformContext(dronePlatform));
    expect(t).toContain("Persona : Randonneur");
    expect(t).toMatch(/Preuves DISPONIBLES.*Léger \(preuve : 249 g confirmés\)/);
    expect(t).toMatch(/SANS PREUVE.*Résiste au vent.*Évite les obstacles/);
    expect(t).toContain("· Combien de temps vole-t-il ? → Jusqu'à 25 minutes");
  });

  it("une objection peut citer une peur (« sans danger ? »), mais une réponse qui l'affirme est retirée", () => {
    const p = projectOf(kidProduct, kidBrand);
    const platform = { ...kidPlatform, objections: [{ objection: "Est-ce sans danger pour mon enfant ?", answer: "Oui, totalement sans danger pour les enfants." }, ...kidPlatform.objections] };
    const strategy = { audience: [], angles: [], pillars: [], keyMessages: [], platform, generatedBy: "ai" as const };
    const issues = fr(() => brandIssues({ ...(p.brand as any), name: "Mirabou" }, p, strategy));
    expect(issues.some((i) => i.code === "claim" && i.field.startsWith("platform.answers[0]"))).toBe(true);
    expect(issues.some((i) => i.field.includes("objection"))).toBe(false);
    const fin = fr(() => finalizeBrand({ ...(p.brand as any), name: "Mirabou" }, strategy, p));
    expect(fin.strategy!.platform!.objections[0].objection).toBe("Est-ce sans danger pour mon enfant ?");
    expect(fin.strategy!.platform!.objections[0].answer).toMatch(/^\[À compléter/);
  });
});

describe("blog : stratégie de mots-clés, intention de recherche, maillage", () => {
  const draft = (over: Partial<ArticleDraft>): ArticleDraft => ({ title: "Choisir un drone pliable pour débuter", slug: "drone", metaTitle: "Drone pliable pour débuter : bien choisir", metaDescription: "Comment choisir un drone pliable pour débuter : poids, autonomie, caméra et règles de vol, expliqués simplement avant votre achat.", excerpt: "", bodyHtml: "<p>Un drone pliable pour débuter doit être léger.</p><h2>Le poids</h2><p>…</p>", tags: [], keyword: "drone pliable débutant", ...over });
  it("la requête visée doit figurer dans le titre, la méta-description et l'introduction ; un lien interne est exigé", () => {
    const links = [{ title: "Ventelle Air", url: "/products/ventelle-air", kind: "product" as const }];
    expect(fr(() => seoIssues(draft({ bodyHtml: '<p>Un drone pliable pour débuter doit être léger.</p><p>Voir <a href="/products/ventelle-air">le drone pliable de la boutique</a>.</p>' }), links))).toEqual([]);
    const bad = fr(() => seoIssues(draft({ title: "Nos conseils", metaTitle: "Conseils", metaDescription: "Tout savoir avant d'acheter.", bodyHtml: "<p>Bienvenue sur notre blog.</p>" }), links));
    expect(bad.join(" ")).toMatch(/titre/);
    expect(bad.join(" ")).toMatch(/méta-description/);
    expect(bad.join(" ")).toMatch(/introduction/);
    expect(bad.join(" ")).toMatch(/Maillage interne/);
  });
  it("correspondance souple de la requête (pluriels, accents, ordre)", () => {
    expect(coversKeyword("Les drones pliables pour débutants", "drone pliable débutant")).toBe(true);
    expect(coversKeyword("Veilleuse tactile pour la chambre d'enfant", "veilleuse enfant")).toBe(true);
    expect(coversKeyword("Nos conseils du mois", "veilleuse enfant")).toBe(false);
  });
  it("sujets sans IA : requête générique de la catégorie (jamais la marque inventée) et intention de recherche", () => {
    const p = projectOf(droneProduct, droneBrand) as any;
    p.name = "Ventelle";
    const topics = fr(() => localTopics(p));
    expect(topics.every((t) => t.keyword && t.intent)).toBe(true);
    expect(topics.some((t) => t.intent === "commerciale")).toBe(true);
    expect(topics.find((t) => t.kind === "guide")!.keyword).toBe("choisir drone pliable avec caméra");
    expect(topics.every((t) => !/ventelle/i.test(t.keyword!))).toBe(true);
  });
  it("consigne du rédacteur et du stratège : intention, réponse d'abord, FAQ, ancres descriptives", async () => {
    const src = await import("node:fs").then((fs) => fs.readFileSync("src/lib/engine/blog.ts", "utf8"));
    for (const k of ["Requête et intention", "Réponse d'abord", "Questions fréquentes", "ancre descriptive", "intention de recherche", "jamais le nom de la marque inventée"]) expect(src, k).toContain(k);
  });
});

describe("moteur local (version du studio, sans IA)", () => {
  it("analyse : questions de consultant propres au secteur (fonction et âge pour un enfant ; caractéristiques et contenu pour le high-tech)", () => {
    const kid = fr(() => localAnalysis({ name: "", description: "Veilleuse lapin pour enfant", price: null, colors: [], photos: 1 }));
    expect(kid.sector).toBe("enfants");
    const ids = kid.questions.map((q) => q.id);
    expect(ids).toEqual(expect.arrayContaining(["price", "s-function", "s-age", "shipping"]));
    expect(kid.questions.find((q) => q.id === "s-function")!.question).toMatch(/Que fait exactement/);
    expect(kid.questions.length).toBeLessThanOrEqual(6);
    expect(kid.facts.find((f) => f.key === "age")).toMatchObject({ status: "unknown", label: "Âge conseillé" });
    const drone = fr(() => localAnalysis({ name: "Ventelle Air", description: "Drone pliable avec caméra", price: 18900, colors: [], photos: 1 }));
    expect(drone.questions.map((q) => q.id)).toEqual(expect.arrayContaining(["s-specs", "s-box"]));
    // Un fait déjà donné ne redemande rien.
    const known = fr(() => localAnalysis({ name: "X", description: "Drone. Dimensions : 14 x 8 cm", price: 1, colors: [], photos: 1 }));
    expect(known.questions.some((q) => q.factKey === "dimensions")).toBe(false);
  });

  it("textes : FAQ tirée des objections du secteur (réponse = fait confirmé, sinon espace réservé), SEO avec la catégorie", () => {
    const copy = fr(() => localCopy(droneProduct, droneBrand));
    expect(copy.seo.title).toBe("Ventelle Air, drone pliable avec caméra | Ventelle");
    expect(copy.seo.description.length).toBeLessThanOrEqual(155);
    expect(copy.seo.description.endsWith(".")).toBe(true);
    const qs = copy.faq.items.map((x) => x.q);
    expect(qs).toEqual(expect.arrayContaining(["Que contient la boîte ?", "Quelles sont ses caractéristiques ?", "Quels sont les délais de livraison ?"]));
    expect(copy.faq.items.find((x) => x.q === "Que contient la boîte ?")!.a).toMatch(/^Drone, 2 batteries/);
    expect(copy.faq.items.find((x) => x.q === "Est-il compatible avec mon matériel ?")!.a).toBe("[À compléter : compatibilités]");
    expect(copy.hero.cta).toBe("Voir Ventelle Air");
    expect(copy.product.tabs.map((t) => t.heading)).toEqual(expect.arrayContaining(["Caractéristiques", "Contenu du colis"]));
    const p = projectOf(droneProduct, droneBrand);
    expect(lintClaims(copy, p)).toEqual([]);
    expect(lintHollow(copy)).toEqual([]);
    const kid = fr(() => localCopy(kidProduct, kidBrand));
    expect(kid.faq.items[0]).toEqual({ q: "À partir de quel âge ?", a: "À partir de 3 ans." });
    expect(lintClaims(kid, projectOf(kidProduct, kidBrand))).toEqual([]);
  });

  it("plateforme locale honnête : cible à définir, preuves = faits confirmés, objections du secteur", () => {
    const pf = fr(() => localPlatform(kidProduct));
    expect(pf.persona).toMatch(/^\[À définir/);
    expect(pf.proofs.filter((x) => x.status === "available").map((x) => x.claim)).toContain("Minuterie");
    expect(pf.objections[0]).toEqual({ objection: "À partir de quel âge ?", answer: "À partir de 3 ans." });
    const b2 = fr(() => localBrand(kidProduct));
    expect(b2.strategy.platform?.objections.length).toBeGreaterThan(0);
    expect(fr(() => objectionAnswers(droneProduct)).length).toBe(4);
  });

  it("site de services : titre SEO local « Métier à Ville | Nom »", () => {
    expect(fr(() => localSeoTitle({ category: "plombier chauffagiste" }, "Plomberie Aplomb", "Aplomb", "Lyon et alentours"))).toBe("Plombier chauffagiste à Lyon | Aplomb");
    expect(fr(() => localSeoTitle({ category: "Plombier à Lyon" }, "Plombier à Lyon", "Aplomb", "Lyon"))).toBe("Plombier à Lyon | Aplomb");
    expect(runWithLang({ ui: "en", content: "en" }, () => localSeoTitle({ category: "plumber" }, "Plumbing", "Plumb", "Leeds"))).toBe("Plumber in Leeds | Plumb");
  });
});
