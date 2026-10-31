/** Recalcul local d'un devis fictif, jamais un prix certifié pour le compte réel. */
import fs from "node:fs";
import path from "node:path";
const dir = process.env.DATA_DIR;
if (!dir || !path.basename(dir).startsWith("ecs-preparation-test-204-")) throw new Error("Dossier fictif obligatoire");
const { stateOf } = await import("../../src/lib/preparation/store");
const { loadProject } = await import("../../src/lib/projects");
const { analysisCostPlan } = await import("../../src/lib/preparation/inspect");
const { budgetPctOf } = await import("../../src/lib/ai/budget-pct");
const { runWithLang } = await import("../../src/lib/i18n-server");
const { all } = await import("../../src/lib/db");
const cases = JSON.parse(fs.readFileSync(path.join(dir, "private-session.json"), "utf8")) as { slug: string; pid: string; width: number }[];
const rows = runWithLang({ ui: "fr", content: "fr" }, () => cases.filter(c => c.width === 1440).map(c => {
  const p = loadProject(c.pid), b = stateOf(c.pid)!.stages.brief!.data;
  const correction = "Conserver toutes les réponses et ne demander que les précisions réellement absentes.";
  const extract = (x: typeof b, instruction?: string) => {
    const plan = analysisCostPlan(p, x, instruction);
    if (!plan) throw new Error("Devis impossible à encadrer");
    return { estimateMicro: plan.estimateMicro, maxMicro: plan.maxMicro, estimateBudgetPct: budgetPctOf(p.userId, plan.estimateMicro, p.id), maxBudgetPct: budgetPctOf(p.userId, plan.maxMicro, p.id), maxCalls: plan.maxCalls, inputTokensMax: plan.inputTokensMax, fingerprint: plan.fingerprint };
  };
  const initial = structuredClone(b); initial.profile.facts = []; initial.profile.questions = []; initial.profile.summaryStatus = "proposed";
  return { fixture: c.slug, basicContext: extract(initial), completeContext: extract(b), completeContextAndCorrection: extract(b, correction) };
}));
const proof = { simulation: true, realProviderCalls: all("SELECT id FROM ai_calls").length, recordedUsageEntries: all("SELECT id FROM usage_events").length, newDebitMicro: 0, rows, limits: "Local route/tariff configuration and fictitious input only. The two previously acquired real analyses are not read, reset or recosted." };
if (proof.realProviderCalls || proof.recordedUsageEntries) throw new Error("La recette ne doit contenir aucune dépense");
fs.writeFileSync(path.resolve(process.argv[2] || path.join(dir, "cost-proof.json")), JSON.stringify(proof, null, 2));
console.log("Devis fictifs recalculés localement ; aucun appel ni débit.");
