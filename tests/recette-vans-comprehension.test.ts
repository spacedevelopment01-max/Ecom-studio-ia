/**
 * Recette VANS, étape 1 (#204, consigne du 27/10 13 h 35) : compréhension d'une activité de services.
 *  - devis de l'analyse : formule des « contenus » (≈ 2,80 €, 9,4 %) remplacée par le pire cas réel de la demande
 *    (route, entrée, limites de sortie, reprises de llmJson), avec une estimation distincte ;
 *  - prestations facultatives avant l'analyse, proposées puis corrigeables après, sans refaire payer la lecture ;
 *  - bouton principal choisi explicitement, moyens secondaires jamais écrasés ;
 *  - vocabulaire services, choix boutique/services explicite, rendez-vous sans outil externe obligatoire.
 * Aucun appel réseau : la route est calculée localement, les analyses « réalisées » sont simulées.
 */
import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { JSON_ATTEMPTS, jsonCallMaxMicro, jsonCallPaths, jsonRetry } from "@/lib/ai/llm";
import { analyzeLocally, SERVICES_UNKNOWN } from "@/lib/preparation/brief";
import { analysisCostPlan } from "@/lib/preparation/inspect";
import { createQuote } from "@/lib/preparation/quote";
import { editBrief, initialize, stateOf } from "@/lib/preparation/engine";
import { commitState } from "@/lib/preparation/store";
import { loadProject } from "@/lib/projects";
import { runWithLang } from "@/lib/i18n-server";
import { emptyServiceProfile } from "@/lib/project-types";
import { serviceAnalysisRequest } from "@/lib/ai/tasks";
import { fixture } from "./preparation-fixtures";
import type { Input } from "@/lib/preparation/types";

const fr = <T>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);
const read = (f: string) => fs.readFileSync(path.join(process.cwd(), f), "utf8");
const VANS = "J’ai un atelier près de Mâcon. J’aménage les fourgons que les clients m’apportent pour en faire des vans, soit entièrement soit seulement une partie. Je voudrais un site pour présenter ce que je fais, recevoir des demandes de devis et prendre des rendez-vous. Je n’ai pas encore de nom ni de logo.";
const vansInput = (photoIds: string[] = []): Input => ({
  offerName: "",
  brandName: "",
  description: VANS,
  target: "Surtout des couples qui voyagent, pour des week-ends ou des séjours de plusieurs semaines.",
  constraints: "",
  business: "services",
  photoIds,
  referenceUrls: [],
  price: "",
  services: { ...emptyServiceProfile(), area: "Près de Mâcon. Clients de la région et de toute la France.", contactMode: "quote", contactModes: ["quote", "booking"] },
});

let savedKey: string | undefined;
beforeEach(() => {
  savedKey = process.env.ANTHROPIC_API_KEY;
  process.env.ANTHROPIC_API_KEY = "sk-ant-cle-factice-de-test";
});
afterEach(() => {
  if (savedKey === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = savedKey;
});

describe("Reprises de llmJson : une seule règle pour l'exécution et le devis", () => {
  it("réponse coupée : place doublée jusqu'à la limite, sans renvoyer le texte coupé ; puis une seule réparation", () => {
    expect(jsonRetry({ attempt: 0, budget: 12000, fixes: 0 }, true, 24000)).toEqual({ attempt: 1, budget: 24000, fixes: 0, resend: false });
    expect(jsonRetry({ attempt: 1, budget: 24000, fixes: 0 }, true, 24000)).toEqual({ attempt: 2, budget: 24000, fixes: 1, resend: true });
    expect(jsonRetry({ attempt: 2, budget: 24000, fixes: 1 }, false, 24000)).toBeNull();
    expect(jsonRetry({ attempt: JSON_ATTEMPTS - 1, budget: 12000, fixes: 0 }, true, 64000)).toBeNull();
  });

  it("compréhension d'un service : au plus 3 appels, 60 000 jetons de sortie au total dans le pire cas", () => {
    const paths = jsonCallPaths(12000, 24000);
    const worst = Math.max(...paths.map((p) => p.reduce((n, c) => n + c.budget, 0)));
    expect(Math.max(...paths.map((p) => p.length))).toBe(3);
    expect(worst).toBe(60000);
    // La réparation renvoie la réponse précédente : son entrée grandit d'autant.
    expect(paths.some((p) => p.some((c) => c.extraInput >= 24000))).toBe(true);
  });

  it("le pire cas d'un llmJson est la somme maximale des réservations de ses appels", () => {
    const one = jsonCallMaxMicro("anthropic", "claude-opus-5-5", 5000, 12000, 12000, "medium")!;
    const many = jsonCallMaxMicro("anthropic", "claude-opus-5-5", 5000, 12000, 24000, "medium")!;
    expect(one.maxMicro).toBeGreaterThan(0);
    expect(many.maxMicro).toBeGreaterThan(one.maxMicro);
    expect(jsonCallMaxMicro("anthropic", "modele-inconnu", 5000, 12000, 24000, "medium")).toBeNull();
  });
});

describe("Devis de « Comprendre mon activité »", () => {
  it("estimation et maximum distincts, calculés sur la demande et la route réelles, plus la formule des contenus", async () => {
    const f = await fixture("services");
    fr(() => initialize(f.pid, vansInput()));
    const plan = fr(() => analysisCostPlan(loadProject(f.pid), stateOf(f.pid)!.stages.brief!.data))!;
    expect(plan.provider).toBe("anthropic");
    expect(plan.maxCalls).toBe(3);
    expect(plan.estimateMicro).toBeLessThan(plan.maxMicro);
    // Ancienne formule : max(2, prestations + 3) × 0,60 € + 1 € = 2,80 € pour ce projet.
    expect(plan.maxMicro).not.toBe(2_800_000);
    const q = fr(() => createQuote(f.pid, "brief", "analyze"));
    expect(q.paid).toBe(true);
    expect(q.estimateBudgetPct).not.toBeNull();
    expect(q.estimateBudgetPct!).toBeLessThan(q.maxBudgetPct!);
    expect(q.note).toMatch(/budget IA inclus dans votre abonnement \(aucun nouvel achat\)/);
  });

  it("une photo ou un lien augmentent le maximum (comptés à leur taille maximale), jamais l'inverse", async () => {
    const f = await fixture("services");
    fr(() => initialize(f.pid, { ...vansInput(f.input.photoIds), offerUrl: "https://atelier.example/vans" }));
    const plain = await fixture("services");
    fr(() => initialize(plain.pid, vansInput()));
    const withExtras = fr(() => analysisCostPlan(loadProject(f.pid), stateOf(f.pid)!.stages.brief!.data))!;
    const without = fr(() => analysisCostPlan(loadProject(plain.pid), stateOf(plain.pid)!.stages.brief!.data))!;
    expect(withExtras.inputTokensMax).toBeGreaterThan(without.inputTokensMax);
    expect(withExtras.maxMicro).toBeGreaterThan(without.maxMicro);
  });

  it("la demande servant au devis est celle de l'appel (limites de sortie 12 000 puis 24 000 jetons)", () => {
    const r = fr(() => serviceAnalysisRequest({ description: VANS, known: emptyServiceProfile(), photoCount: 0 }));
    expect(r.maxTokens).toBe(12000);
    expect(r.maxOutputTokens).toBe(24000);
    expect(r.prompt).toContain(VANS);
    expect(read("src/lib/ai/tasks.ts")).toMatch(/\.\.\.serviceAnalysisRequest\(\{ \.\.\.input, photoCount: input\.photos\.length \}\)/);
  });
});

describe("Prestations : facultatives avant l'analyse, proposées puis corrigeables après", () => {
  it("le brief naturel n'exige ni prestation ni nom commercial avant la compréhension", () => {
    const b = fr(() => analyzeLocally(vansInput()));
    expect(b.missing.join(" ")).not.toMatch(/prestation/i);
    expect(b.missing.join(" ")).not.toMatch(/nom du produit ou de l’activité/);
  });

  it("après l'analyse, corriger les prestations ou le bouton principal garde l'analyse (aucune lecture à repayer)", async () => {
    const f = await fixture("services");
    fr(() => initialize(f.pid, vansInput()));
    const analysed = commitState(f.pid, stateOf(f.pid)!.revision, (s) => {
      const b = s.stages.brief!.data;
      b.provenance = "simulation";
      b.services = { ...b.services, services: [{ name: "Aménagement complet de fourgon", description: "Aménagement intérieur complet du fourgon apporté par le client." }, { name: "Aménagement partiel", description: "Une partie de l’aménagement seulement." }] };
      b.missing = [];
    });
    const corrected = { ...vansInput(), services: { ...vansInput().services, contactMode: "booking" as const, contactModes: ["booking" as const, "quote" as const], services: [{ name: "Aménagement complet de fourgon", description: "Aménagement intérieur complet." }] } };
    fr(() => editBrief(f.pid, analysed.revision, corrected));
    const b = stateOf(f.pid)!.stages.brief!.data;
    expect(b.provenance).toBe("simulation");
    expect(b.services.services.map((x) => x.name)).toEqual(["Aménagement complet de fourgon"]);
    expect(b.services.contactMode).toBe("booking");
    expect(b.services.contactModes).toEqual(["booking", "quote"]);
  });

  it("prestations introuvables : question précise, rien d'inventé", () => {
    expect(SERVICES_UNKNOWN).toMatch(/^Quelles prestations proposez-vous \?/);
    expect(read("src/lib/preparation/fiche.ts")).toMatch(/out\.push\(SERVICES_UNKNOWN\)/);
  });
});

describe("Écrans : bouton principal, vocabulaire, rendez-vous, choix de départ", () => {
  const picker = read("src/components/studio/services-editor.tsx");
  const pilote = read("src/components/studio/tab-preparation.tsx");
  const home = read("src/components/studio/home.tsx");

  it("toute case se décoche ; le principal est un choix explicite ; cocher ajoute en complément", () => {
    expect(picker).toMatch(/const toggle = \(id: ContactMode\) => onChange\(value\.includes\(id\) \? value\.filter\(\(m\) => m !== id\) : \[\.\.\.value, id\]\);/);
    expect(picker).toMatch(/const makeMain = \(id: ContactMode\) => onChange\(\[id, \.\.\.value\.filter\(\(m\) => m !== id\)\]\);/);
    expect(picker).toMatch(/Bouton principal du site/);
    expect(picker).not.toMatch(/La première cochée devient le bouton principal/);
  });

  it("le Pilote n'écrase plus les moyens secondaires (ancien `contactModes: [e.target.value]`)", () => {
    expect(pilote).not.toMatch(/contactModes: \[e\.target\.value\]/);
    expect(pilote).toMatch(/<ContactModePicker/);
  });

  it("services : « Comprendre mon activité », aide demandée, photos facultatives, prestations annoncées", () => {
    expect(pilote).toMatch(/t\("Comprendre mon activité", "Understand my business"\)/);
    expect(pilote).toMatch(/L’IA analyse votre description et vos éventuelles photos pour identifier vos prestations et les informations à compléter\./);
    expect(pilote).toMatch(/Ajouter des photos de votre activité \(facultatif\)/);
    expect(pilote).toMatch(/data-services-pending/);
    expect(pilote).toMatch(/data-services-found/);
    expect(read("src/lib/ai/config.ts")).toMatch(/vision_analysis: task\("Compréhension de l’offre \(texte et photos\)", "Offer understanding \(text and photos\)"/);
  });

  it("devis : estimation, maximum autorisé et consommation constatée affichés séparément", () => {
    expect(pilote).toMatch(/Estimation de consommation : /);
    expect(pilote).toMatch(/Maximum autorisé pour cet essai : /);
    expect(pilote).toMatch(/Consommation constatée : /);
  });

  it("rendez-vous : lien d'un outil externe facultatif, options réelles expliquées, aucun agenda annoncé", () => {
    expect(picker).toMatch(/Sinon, laissez vide : votre besoin est noté/);
    expect(picker).toMatch(/Aucun agenda n'est ouvert à cette étape\./);
    expect(home).toMatch(/Lien de votre outil de rendez-vous \(facultatif\)/);
  });

  it("nouveau projet : aucun type imposé ; projet existant : son type est repris", () => {
    expect(home).toMatch(/useState<BusinessType \| null>\(initialBusiness \?\? null\)/);
    expect(home).not.toMatch(/initialBusiness = "products"/);
    expect(home).toMatch(/data-choose-business/);
  });
});
