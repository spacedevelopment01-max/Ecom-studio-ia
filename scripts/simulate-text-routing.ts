/**
 * Simulation du routage des modèles de texte (aucun appel aux fournisseurs, aucune dépense) :
 *  - coût théorique d'un appel typique de chaque tâche pour chaque modèle du catalogue ;
 *  - modèle choisi en manuel (routage actuel) et en automatique (Anthropic seul, puis avec Gemini/OpenAI
 *    supposés confirmés aux tarifs indicatifs ci-dessous) ;
 *  - paramètre de réflexion réellement envoyé à chaque fournisseur pour quelques tâches représentatives.
 *
 *   DATA_DIR=/tmp/sim npx tsx scripts/simulate-text-routing.ts > reports/ai-routing-simulation.md
 *
 * Tarifs indicatifs NON VÉRIFIÉS pour OpenAI et Gemini (pages officielles inaccessibles depuis l'environnement de
 * développement) : Gemini = tarifs Vertex AI publiés par Google (l'API Gemini peut différer) ; OpenAI = aucun tarif
 * officiel lu, valeur de travail prise dans la fourchette haute des sources tierces. Ils ne servent qu'à la
 * simulation et ne sont jamais enregistrés comme tarifs du studio.
 */
import { setJsonSetting } from "../src/lib/settings";
import { TASKS, routeFor, type TaskId } from "../src/lib/ai/config";
import { TEXT_MODELS, mapEffort, type TextModel } from "../src/lib/ai/text-models";
import { geminiBody, openaiBody } from "../src/lib/ai/text-providers";
import { routingPolicy } from "../src/lib/orchestrator/policy";
import { pickTextModel, theoreticalCostMicro } from "../src/lib/orchestrator/text-routing";
import { EUR } from "../src/lib/billing";

const INDICATIVE = {
  "google:gemini-3.8-flash": { unit: "tokens", inputPerM: 0.75, outputPerM: 3.75 },
  "google:gemini-3.5-flash-lite": { unit: "tokens", inputPerM: 0.3, outputPerM: 2.5 },
  "openai:gpt-5.6-terra": { unit: "tokens", inputPerM: 2, outputPerM: 12 },
  "openai:gpt-5.6-luna": { unit: "tokens", inputPerM: 1, outputPerM: 6 },
} as const;

const fmt = (micro: number | null) => (micro == null ? "—" : `${(micro / EUR).toFixed(4).replace(".", ",")} €`);
const tasks = (Object.keys(TASKS) as TaskId[]).filter((t) => TASKS[t].kind === "llm");
const policy = routingPolicy();
const anthropicOnly = (m: TextModel) => ({ autoEligible: m.provider === "anthropic" && m.model !== "claude-haiku-4-5", reasons: [] });
const everyone = (m: TextModel) => ({ autoEligible: m.model !== "claude-haiku-4-5", reasons: [] });

setJsonSetting("ai.prices", INDICATIVE);
const out: string[] = [];
out.push("# Simulation du routage des modèles de texte\n");
out.push("Aucun appel aux fournisseurs. Coût théorique d'un appel typique (volumes de `TASK_PROFILE`), taux USD → EUR de l'administration, coefficient non compris. **Tarifs OpenAI et Gemini indicatifs et non vérifiés.**\n");
out.push("## Modèle choisi par tâche\n");
out.push("| Tâche | Niveau | Manuel (actuel) | Coût | Auto, Anthropic seul | Coût | Auto, avec Gemini/OpenAI* | Coût |");
out.push("|---|---|---|---|---|---|---|---|");
let sumManual = 0;
let sumAuto = 0;
let sumMulti = 0;
for (const t of tasks) {
  const p = policy[t];
  const tier = p.tier === "local" ? "light" : p.tier;
  const manual = routeFor(t);
  const a = pickTextModel({ task: t, tier, vision: p.needs.includes("vision"), status: anthropicOnly, stats: {} });
  const b = pickTextModel({ task: t, tier, vision: p.needs.includes("vision"), status: everyone, stats: {} });
  const cm = theoreticalCostMicro(t, manual);
  const ca = a ? theoreticalCostMicro(t, a.model) : null;
  const cb = b ? theoreticalCostMicro(t, b.model) : null;
  sumManual += cm ?? 0;
  sumAuto += ca ?? 0;
  sumMulti += cb ?? 0;
  out.push(`| ${TASKS[t].label} | ${tier} | ${manual.model}${manual.effort ? ` (${manual.effort})` : ""} | ${fmt(cm)} | ${a?.model.model ?? "—"} | ${fmt(ca)} | ${b ? `${b.model.provider}:${b.model.model}` : "—"} | ${fmt(cb)} |`);
}
out.push(`| **Une fois chaque tâche** | | | **${fmt(sumManual)}** | | **${fmt(sumAuto)}** | | **${fmt(sumMulti)}** |`);
out.push("\n\\* Hypothèse : Gemini et OpenAI confirmés et activés aux tarifs indicatifs. Le choix réel dépend de leur confirmation par l'administration, puis de l'historique de qualité observé.\n");

out.push("## Coût théorique par modèle (appel typique)\n");
out.push(`| Tâche | ${TEXT_MODELS.map((m) => m.label).join(" | ")} |`);
out.push(`|---|${TEXT_MODELS.map(() => "---").join("|")}|`);
for (const t of tasks) out.push(`| ${TASKS[t].label} | ${TEXT_MODELS.map((m) => fmt(theoreticalCostMicro(t, m))).join(" | ")} |`);

out.push("\n## Paramètre de réflexion envoyé (effort de la politique traduit pour chaque modèle)\n");
out.push("| Tâche (effort politique) | Anthropic Sonnet 5.5 | OpenAI GPT-5.6 Terra | Gemini 3.8 Flash |");
out.push("|---|---|---|---|");
for (const t of ["strategy", "copywriting", "quality_control", "classification"] as TaskId[]) {
  const e = policy[t].effort ?? null;
  const req = { system: "s", turns: [], maxOutput: 8000, jsonSchema: null };
  const o = openaiBody({ ...req, model: "gpt-5.6-terra", effort: mapEffort("openai", "gpt-5.6-terra", e) }) as any;
  const g = geminiBody({ ...req, model: "gemini-3.8-flash", effort: mapEffort("google", "gemini-3.8-flash", e) }) as any;
  out.push(`| ${t} (${e ?? "défaut du modèle"}) | \`output_config.effort: ${mapEffort("anthropic", "claude-sonnet-5-5", e)}\` | \`reasoning.effort: ${o.reasoning?.effort ?? "—"}\` | \`thinkingLevel: ${g.generationConfig.thinkingConfig?.thinkingLevel ?? "—"}\` |`);
}
setJsonSetting("ai.prices", {});
console.log(out.join("\n"));
