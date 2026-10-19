/** Capture du vrai adaptateur de classement ; réponse LLM injectée, aucun réseau. */
import { it, expect, vi } from "vitest";
const call = vi.hoisted(() => vi.fn(async (..._args: any[]) => ({ intents: ["WRITE_PRODUCT_COPY"], confidence: 0.9 })));
vi.mock("@/lib/ai/llm", async original => ({ ...(await original<object>()), llmJson: call }));
import { aiIntentClassifier, understand } from "@/lib/orchestrator/intent";
import { fixture } from "./preparation-fixtures";
import { remember } from "@/lib/projects";
it("classement : original entier, restriction finale, contexte du projet et provenance distincte", async () => {
  const f = await fixture(), other = await fixture();
  remember(f.pid, { kind: "decision", key: "positionnement", value: "CHOIX_PROJET_COURANT", source: "user" });
  remember(other.pid, { kind: "decision", key: "positionnement", value: "SECRET_AUTRE_PROJET_TEST", source: "user" });
  const text = "Prépare mon lancement : " + "contexte supplémentaire ".repeat(500) + " Ne change pas le logo.";
  await understand({ text }, { aiActive: true, classify: aiIntentClassifier({ userId: f.uid, projectId: f.pid }) });
  const args = call.mock.calls.at(-1)![0] as any;
  expect(JSON.parse(args.prompt).consigneClientIntegrale).toBe(text);
  expect(JSON.parse(args.prompt).restrictions).toContain("ne change pas le logo");
  expect(JSON.parse(args.prompt).provenance).toBe("client");
  expect(args.context).toContain("CHOIX_PROJET_COURANT");
  expect(JSON.stringify(args)).not.toContain("SECRET_AUTRE_PROJET_TEST");
});
it("un identifiant de projet d'un autre compte est refusé avant le LLM", async () => {
  const a = await fixture(), b = await fixture(); call.mockClear();
  await expect(aiIntentClassifier({ userId: a.uid, projectId: b.pid })("Fais quelque chose pour mon lancement")).rejects.toThrow(/autre compte/);
  expect(call).not.toHaveBeenCalled();
});
