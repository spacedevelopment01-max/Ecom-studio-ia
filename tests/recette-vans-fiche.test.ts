/**
 * Recette VANS, étape 1 (#204, consigne du 27/10 15 h 50) : fiche d'activité guidée.
 *  - questions rangées par rubrique, coordonnées jamais bloquantes à cette étape ;
 *  - chaque réponse enrichit la rubrique concernée (prestations comprises), sans nouvel appel IA ;
 *  - « À préciser plus tard » garde le point explicitement inconnu ;
 *  - statuts lisibles, ancien message « Indiquez au moins une prestation » recalculé à la lecture ;
 *  - analyse, réponses et corrections conservées après correction du contact, réouverture et nouvelle analyse.
 * L'analyse vans est celle relevée sur le studio réel (texte affiché dans #204), injectée en SIMULATION : aucun appel.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/preparation/evidence", async (original) => ({ ...(await original<object>()), assertAnalysisRoute: () => {}, apiEvidence: () => ({ provider: "simulation", model: "injected", usageKey: "test", vision: false, at: 1 }) }));
vi.mock("@/lib/ai/tasks", async (original) => ({
  ...(await original<object>()),
  aiAnalyzeService: async () => ({ ...REAL, sector: null, area: "", address: "", phone: "", email: "", hours: "", bookingUrl: "", contactMode: "quote" }),
}));
import { answerBriefQuestion, approve, editBrief, editBriefFiche, initialize, stateOf } from "@/lib/preparation/engine";
import { commitState } from "@/lib/preparation/store";
import { briefMissing, factState, questionTopic, SERVICES_UNKNOWN } from "@/lib/preparation/fiche";
import { inspectBrief } from "@/lib/preparation/inspect";
import { serviceAnalysisRequest } from "@/lib/ai/tasks";
import { loadProject } from "@/lib/projects";
import { one } from "@/lib/db";
import { enqueue, JobContext } from "@/lib/jobs";
import { runForUser } from "@/lib/ai/access";
import { runWithLang } from "@/lib/i18n-server";
import { emptyServiceProfile, type Question } from "@/lib/project-types";
import { fixture } from "./preparation-fixtures";
import type { Brief, Input } from "@/lib/preparation/types";

const fr = <T>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);
const read = (f: string) => fs.readFileSync(path.join(process.cwd(), f), "utf8");
const VANS = "J’ai un atelier près de Mâcon. J’aménage les fourgons que les clients m’apportent pour en faire des vans, soit entièrement soit seulement une partie. Je voudrais un site pour présenter ce que je fais, recevoir des demandes de devis et prendre des rendez-vous. Je n’ai pas encore de nom ni de logo.";
const vansInput = (): Input => ({
  offerName: "",
  brandName: "",
  description: VANS,
  target: "Surtout des couples qui voyagent, pour des week-ends ou des séjours de plusieurs semaines. D'autres besoins peuvent être étudiés.",
  constraints: "",
  business: "services",
  photoIds: [],
  referenceUrls: [],
  price: "",
  services: { ...emptyServiceProfile(), area: "Près de Mâcon. Clients de la région et de toute la France.", contactMode: "quote", contactModes: ["quote", "booking"] },
});
/** Questions et prestations réellement obtenues sur le projet vans (#204), avant ce correctif : sans rubrique. */
const REAL_QUESTIONS: Question[] = [
  { id: "travaux", question: "Quels travaux réalisez-vous concrètement dans un aménagement (isolation, électricité, mobilier, eau, chauffage, gaz…) ?", why: "Décrire précisément vos prestations.", required: true, factKey: "works" },
  { id: "contact", question: "Quels numéro de téléphone, adresse e-mail et horaires d'atelier souhaitez-vous afficher pour les devis et rendez-vous ?", why: "Permettre aux clients de vous joindre.", required: true, factKey: "contact_details" },
];
const REAL = {
  name: "Aménagement de fourgons près de Mâcon",
  nameStatus: "proposed" as const,
  category: "Aménagement de vans",
  summary: "Atelier situé près de Mâcon qui aménage en vans les fourgons apportés par les clients, en totalité ou en partie. Il s'adresse surtout aux couples qui voyagent, le temps d'un week-end ou de séjours de plusieurs semaines, et étudie aussi d'autres besoins.",
  facts: [
    { key: "free_quote", label: "Devis gratuit", value: "", status: "unknown" as const, source: "ai" as const },
    { key: "lead_time", label: "Délais de réalisation", value: "", status: "unknown" as const, source: "ai" as const },
  ],
  services: [
    { name: "Aménagement complet de fourgon", description: "Transformation complète du fourgon apporté par le client en van." },
    { name: "Aménagement partiel de fourgon", description: "Aménagement d'une partie seulement du fourgon." },
  ],
  questions: REAL_QUESTIONS,
  claimsToAvoid: [],
};

/** Projet vans dans l'état relevé après la première compréhension réelle (analyse injectée, aucun appel). */
async function analysedVans() {
  const f = await fixture("services");
  fr(() => initialize(f.pid, vansInput()));
  commitState(f.pid, stateOf(f.pid)!.revision, (s) => {
    const b = s.stages.brief!.data;
    b.provenance = "simulation";
    Object.assign(b.profile, { name: REAL.name, category: REAL.category, summary: REAL.summary, facts: structuredClone(REAL.facts), questions: structuredClone(REAL_QUESTIONS), analyzedBy: "ai" });
    b.services = { ...b.services, services: structuredClone(REAL.services) };
    b.observations = [REAL.summary, "Devis gratuit : à confirmer (unknown)"];
    // Points bloquants enregistrés par l'ancienne règle : les deux questions, coordonnées comprises.
    b.missing = REAL_QUESTIONS.map((q) => q.question);
  });
  return f;
}
const calls = (pid: string) => one<{ n: number }>("SELECT COUNT(*) n FROM ai_calls WHERE project_id=?", pid)!.n;
const brief = (pid: string) => stateOf(pid)!.stages.brief!.data;

describe("Rubriques et points bloquants", () => {
  it("les coordonnées ne bloquent plus la compréhension, même déjà enregistrées comme obligatoires", async () => {
    const f = await analysedVans();
    expect(questionTopic(REAL_QUESTIONS[1])).toBe("practical");
    expect(questionTopic(REAL_QUESTIONS[0])).toBe("services");
    // Relu avec les règles actuelles : seule la question sur les travaux reste à faire.
    expect(brief(f.pid).missing).toEqual([REAL_QUESTIONS[0].question]);
  });

  it("l'ancien « Indiquez au moins une prestation » d'un brouillon antérieur disparaît dès la première ouverture", async () => {
    const f = await fixture("services");
    fr(() => initialize(f.pid, vansInput()));
    commitState(f.pid, stateOf(f.pid)!.revision, (s) => { s.stages.brief!.data.missing = ["Indiquez au moins une prestation."]; });
    const stored = one<{ value: string }>("SELECT value FROM memory WHERE project_id=? AND key='preparation.current'", f.pid)!.value;
    expect(stored).toMatch(/Indiquez au moins une prestation/);
    expect(brief(f.pid).missing).toEqual([]);
  });

  it("une compréhension sans prestation ni cible les demande ; un nom commercial n'est jamais exigé pour un service", () => {
    const b = { input: { ...vansInput(), target: "" }, profile: { name: "", nameStatus: "unknown", questions: [] }, services: emptyServiceProfile(), missing: [], provenance: "simulation" } as unknown as Brief;
    expect(briefMissing(b)).toEqual(["À qui cette offre s’adresse-t-elle ?", SERVICES_UNKNOWN]);
  });
});

describe("Les réponses enrichissent réellement la fiche, sans appel IA", () => {
  it("une réponse par prestation devient sa description, fournie par vous ; le blocage est levé", async () => {
    const f = await analysedVans();
    const before = calls(f.pid);
    answerBriefQuestion(f.pid, stateOf(f.pid)!.revision, "travaux", {
      items: [
        { name: "Aménagement complet de fourgon", detail: "Conception de l'agencement, mobilier, couchage, cuisine et rangements ; eau et électricité selon l'étude du projet." },
        { name: "Aménagement partiel de fourgon", detail: "Une partie choisie : par exemple le couchage ou la cuisine." },
      ],
    });
    const b = brief(f.pid);
    expect(b.services.services.map((x) => [x.name, x.source])).toEqual([["Aménagement complet de fourgon", "client"], ["Aménagement partiel de fourgon", "client"]]);
    expect(b.services.services[0].description).toMatch(/^Conception de l'agencement/);
    const fact = b.profile.facts.find((x) => x.key === "works")!;
    expect(fact).toMatchObject({ status: "confirmed", source: "user", topic: "services" });
    expect(factState(fact)).toBe("provided");
    expect(b.missing).toEqual([]);
    expect(b.provenance).toBe("simulation");
    expect(calls(f.pid)).toBe(before);
  });

  it("rubrique guidée (déroulement jusqu'au devis) et présentation corrigée : enregistrées comme fournies par vous", async () => {
    const f = await analysedVans();
    editBriefFiche(f.pid, stateOf(f.pid)!.revision, { kind: "fact", key: "request_process", label: "Déroulement d’une demande", topic: "process", value: "Premier échange à distance, puis rendez-vous à l'atelier selon le besoin." });
    editBriefFiche(f.pid, stateOf(f.pid)!.revision, { kind: "summary", value: `${REAL.summary} Chaque aménagement est conçu sur mesure.` });
    const b = brief(f.pid);
    expect(b.profile.facts.find((x) => x.key === "request_process")).toMatchObject({ status: "confirmed", source: "user", topic: "process" });
    expect(b.profile.summaryStatus).toBe("provided");
    expect(b.input.description).toBe(VANS);
  });

  it("« À préciser plus tard » : point inconnu et signalé, jamais affirmé ; refusé pour une question indispensable", async () => {
    const f = await analysedVans();
    editBriefFiche(f.pid, stateOf(f.pid)!.revision, { kind: "later", key: "quote_needs", label: "Informations utiles pour le devis", topic: "quote" });
    const fact = brief(f.pid).profile.facts.find((x) => x.key === "quote_needs")!;
    expect(fact).toMatchObject({ status: "unknown", value: "", later: true });
    expect(factState(fact)).toBe("later");
    expect(() => answerBriefQuestion(f.pid, stateOf(f.pid)!.revision, "travaux", { later: true })).toThrow(/nécessaire pour comprendre/);
  });
});

describe("Conservation : contact corrigé, réouverture, validation, nouvelle analyse", () => {
  it("corriger le bouton principal après les réponses garde l'analyse, les réponses et la fiche", async () => {
    const f = await analysedVans();
    answerBriefQuestion(f.pid, stateOf(f.pid)!.revision, "travaux", { items: [{ name: "Aménagement complet de fourgon", detail: "Mobilier, couchage, cuisine, rangements." }] });
    const before = calls(f.pid);
    fr(() => editBrief(f.pid, stateOf(f.pid)!.revision, { ...vansInput(), services: { ...vansInput().services, contactMode: "booking", contactModes: ["booking", "quote"] } }));
    const b = brief(f.pid);
    expect(b.provenance).toBe("simulation");
    expect(b.profile.summary).toBe(REAL.summary);
    expect(b.services.contactModes).toEqual(["booking", "quote"]);
    expect(b.profile.questions.find((q) => q.id === "travaux")?.answer).toMatch(/Mobilier/);
    expect(b.services.services[0]).toMatchObject({ description: "Mobilier, couchage, cuisine, rangements.", source: "client" });
    expect(calls(f.pid)).toBe(before);
  });

  it("la compréhension se valide sans coordonnées, sans nom ni logo ; la fiche validée est celle du projet", async () => {
    const f = await analysedVans();
    answerBriefQuestion(f.pid, stateOf(f.pid)!.revision, "travaux", { answer: "Agencement, mobilier, couchage, cuisine et rangements ; eau et électricité selon l'étude." });
    fr(() => approve(f.pid, stateOf(f.pid)!.revision, "brief"));
    expect(stateOf(f.pid)!.stages.brief!.status).toBe("approved");
    const p = loadProject(f.pid);
    expect(p.services.phone).toBe("");
    expect(p.product.facts.find((x) => x.key === "works")).toMatchObject({ status: "confirmed", topic: "services" });
    // Le contrôle des coordonnées reste en place pour la livraison du site.
    expect(read("src/lib/preparation/engine.ts")).toMatch(/Indiquez un moyen de contact avant la livraison du site/);
  });

  it("une nouvelle compréhension garde réponses, points reportés, présentation et prestations décrites par le client", async () => {
    const f = await analysedVans();
    answerBriefQuestion(f.pid, stateOf(f.pid)!.revision, "travaux", { items: [{ name: "Aménagement complet de fourgon", detail: "Mobilier, couchage, cuisine, rangements." }] });
    editBriefFiche(f.pid, stateOf(f.pid)!.revision, { kind: "later", key: "quote_needs", label: "Informations utiles pour le devis", topic: "quote" });
    editBriefFiche(f.pid, stateOf(f.pid)!.revision, { kind: "summary", value: "Présentation écrite par le client." });
    const ctx = new JobContext(enqueue({ userId: f.uid, projectId: f.pid, type: "project.prepare", payload: {}, maxAttempts: 1 }));
    const result = await runForUser(f.uid, () => fr(() => inspectBrief(loadProject(f.pid), brief(f.pid), ctx, true)), "normal", f.pid);
    expect(result.profile.summary).toBe("Présentation écrite par le client.");
    expect(result.profile.questions.find((q) => q.id === "travaux")?.answer).toMatch(/Mobilier/);
    expect(result.profile.facts.find((x) => x.key === "quote_needs")).toMatchObject({ later: true, status: "unknown" });
    expect(result.services.services.find((x) => x.name === "Aménagement complet de fourgon")).toMatchObject({ source: "client", description: "Mobilier, couchage, cuisine, rangements." });
    expect(result.services.services.find((x) => x.name === "Aménagement partiel de fourgon")?.source).toBe("analysis");
    expect(result.missing).toEqual([]);
    expect(result.observations!.join(" ")).not.toMatch(/\((confirmed|inferred|unknown)\)/);
  });
});

describe("Consignes de l'analyse et écran", () => {
  it("questions courtes par rubrique, rien de déjà connu redemandé, aucune coordonnée exigée", () => {
    const r = fr(() => serviceAnalysisRequest({ description: VANS, known: vansInput().services, photoCount: 0 }));
    expect(r.system).toMatch(/Ne redemande jamais ce que le client a déjà donné/);
    expect(r.system).toMatch(/Ne pose aucune question sur le téléphone, l'e-mail, l'adresse, les horaires ou le lien de réservation/);
    expect(r.system).toMatch(/jamais de question fourre-tout/);
    expect(r.prompt).toMatch(/"topic": "services\|customization\|process\|quote"/);
    // Aucun cas « vans » codé en dur dans le correctif.
    for (const f of ["src/lib/preparation/fiche.ts", "src/components/studio/brief-fiche.tsx", "src/lib/ai/tasks.ts"]) expect(read(f)).not.toMatch(/fourgon|\bvans?\b/i);
  });

  it("la fiche affiche des états lisibles en français et en anglais, jamais confirmed/unknown", () => {
    const fiche = read("src/components/studio/brief-fiche.tsx");
    const pilote = read("src/components/studio/tab-preparation.tsx");
    expect(read("src/lib/preparation/fiche.ts")).toMatch(/provided: \["Fourni par vous", "Provided by you"\]/);
    expect(read("src/lib/preparation/fiche.ts")).toMatch(/later: \["À préciser plus tard", "To specify later"\]/);
    expect(fiche).toMatch(/data-brief-fiche/);
    expect(pilote).not.toMatch(/observations\.map/);
    expect(pilote).toMatch(/<BriefFiche/);
  });
});
