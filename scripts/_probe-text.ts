import { one, all } from "@/lib/db";
import { llmText } from "@/lib/ai/llm";
import { runForUser } from "@/lib/ai/access";
import { runWithLang } from "@/lib/i18n-server";
const u = one<{ id: string }>("SELECT id FROM users WHERE email = 'test-logo-reel@demo.fr'")!;
const t0 = Date.now();
await runWithLang({ ui: "fr", content: "fr" }, () => runForUser(u.id, async () => {
  try {
    const r = await llmText({ task: "quality_control", userId: u.id, projectId: null, jobId: null, system: "Réponds brièvement.", prompt: "Donne trois adjectifs pour une entreprise artisanale de plâtrerie haut de gamme, séparés par des virgules.", maxTokens: 300 } as any);
    console.log("RÉPONSE", JSON.stringify(r), Math.round((Date.now() - t0) / 1000), "s");
  } catch (e: any) { console.log("ERREUR", e?.name, e?.message); }
}));
console.log(all("SELECT task, provider, requested_model, served_model, status, input_tokens, output_tokens, cost, latency_ms, http_attempts FROM ai_calls WHERE created_at > ?", t0));
console.log(all("SELECT status, amount, actual FROM ai_reservations WHERE created_at > ?", t0));
