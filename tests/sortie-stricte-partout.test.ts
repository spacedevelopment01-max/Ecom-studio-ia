/**
 * La sortie stricte partout où un schéma est attendu (23 novembre 2026, recherche sur les coûts, ligne 10). Vrai SDK
 * Anthropic vers un serveur local uniquement : aucun appel réel, aucune dépense.
 */
import http from "node:http";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { account, project } from "./conversation209-fixtures";
import { all, id } from "@/lib/db";
import { llmJson } from "@/lib/ai/llm";
import { oublierRefus, raisonSansStrict, sansNullsFacultatifs, schemaPourOpenAI, seulementContraintes } from "@/lib/ai/sortie-stricte";

vi.mock("@/lib/ai/config", async (original) => ({ ...(await original<object>()), activeProviderKey: (provider: string) => (provider === "anthropic" ? "fausse-cle-locale-sortie-stricte" : null) }));

type Req = { format?: unknown; texts: string[] };
const state = { replies: [] as (string | { status: number; message: string })[], requests: [] as Req[] };
const server = http.createServer(async (req, res) => {
  let raw = "";
  for await (const c of req) raw += c;
  const b = JSON.parse(raw || "{}");
  if (req.url?.endsWith("/count_tokens")) { res.setHeader("content-type", "application/json"); res.end(JSON.stringify({ input_tokens: 500 })); return; }
  const texts = (b.messages ?? []).flatMap((m: any) => (typeof m.content === "string" ? [m.content] : (m.content ?? []).map((x: any) => x.text ?? "")));
  state.requests.push({ format: b.output_config?.format, texts });
  const reply = state.replies.shift() ?? "{}";
  if (typeof reply !== "string") { res.writeHead(reply.status, { "content-type": "application/json" }); res.end(JSON.stringify({ type: "error", error: { type: "invalid_request_error", message: reply.message } })); return; }
  res.writeHead(200, { "content-type": "text/event-stream" });
  const ev = (type: string, rest: object) => res.write(`event: ${type}\ndata: ${JSON.stringify({ type, ...rest })}\n\n`);
  ev("message_start", { message: { id: "m-" + state.requests.length, type: "message", role: "assistant", model: b.model, content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 500, output_tokens: 0 } } });
  ev("content_block_start", { index: 0, content_block: { type: "text", text: "" } });
  ev("content_block_delta", { index: 0, delta: { type: "text_delta", text: reply } });
  ev("content_block_stop", { index: 0 });
  ev("message_delta", { delta: { stop_reason: "end_turn", stop_sequence: null }, usage: { output_tokens: 50 } });
  ev("message_stop", {});
  res.end();
});
beforeAll(async () => {
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const a = server.address();
  if (!a || typeof a === "string") throw Error("adresse locale absente");
  vi.stubEnv("ANTHROPIC_BASE_URL", "http://127.0.0.1:" + a.port);
});
afterAll(async () => { vi.unstubAllEnvs(); await new Promise<void>((r) => server.close(() => r())); });
beforeEach(() => { oublierRefus(); state.requests = []; state.replies = []; });

async function appel() {
  const user = await account(), pid = project(user);
  return { user, call: { userId: user.id, projectId: pid, task: "quality_control" as const, system: "Contrôle de recette, sans IA réelle.", maxTokens: 1000, usageKey: "stricte-" + id(), prompt: "Contrôle de recette." } };
}
const details = (uid: string) => all<{ details: string | null }>("SELECT details FROM ai_calls WHERE user_id=? ORDER BY created_at", uid).map((r) => JSON.parse(r.details ?? "{}"));
const LIBRE = "Réponds uniquement avec un objet JSON valide";

describe("sortie stricte par défaut", () => {
  const Verdict = z.object({ ok: z.boolean(), raison: z.string().optional() });

  it("un juge sans option part strict : le schéma est envoyé, sans consigne de forme, et c'est noté au journal", async () => {
    const { user, call } = await appel();
    state.replies = ['{"ok":true}'];
    expect(await llmJson(call, Verdict)).toEqual({ ok: true });
    expect(state.requests).toHaveLength(1);
    expect(state.requests[0].format).toMatchObject({ type: "json_schema" });
    expect(state.requests[0].texts.join(" ")).not.toContain(LIBRE);
    expect(details(user.id)[0]).toMatchObject({ sortie: "stricte" });
  });

  it("un schéma aux clés libres (les actions de SINA) part en JSON libre, comme avant", async () => {
    const { call } = await appel();
    state.replies = ['{"tool":"x","args":{"a":1}}'];
    const S = z.object({ tool: z.string(), args: z.record(z.string(), z.unknown()) });
    expect(await llmJson(call, S)).toEqual({ tool: "x", args: { a: 1 } });
    expect(state.requests[0].format).toBeUndefined();
    expect(state.requests[0].texts.join(" ")).toContain(LIBRE);
  });

  it("schéma refusé net par le fournisseur (rien facturé) : la demande repart en JSON libre, et le refus est retenu", async () => {
    const { user, call } = await appel();
    state.replies = [{ status: 400, message: "output_config.format.schema: Schema is too complex for compilation" }, '{"ok":false}'];
    expect(await llmJson(call, Verdict)).toEqual({ ok: false });
    expect(state.requests.map((r) => !!r.format)).toEqual([true, false]);
    expect(all<{ status: string }>("SELECT status FROM ai_reservations WHERE user_id=? ORDER BY created_at", user.id).map((r) => r.status)).toEqual(["released", "settled"]);
    // Le même schéma, ensuite : directement en JSON libre (pas de refus redemandé).
    const second = await appel();
    state.replies = ['{"ok":true}'];
    await llmJson(second.call, Verdict);
    expect(state.requests.at(-1)?.format).toBeUndefined();
  });

  it("demandé strict par l'appelant : pas de secours, le refus remonte", async () => {
    const { call } = await appel();
    state.replies = [{ status: 400, message: "output_config.format.schema: Schema is too complex for compilation" }];
    await expect(llmJson(call, Verdict, { strict: true })).rejects.toThrow(/refusée par le fournisseur/);
    expect(state.requests).toHaveLength(1);
  });

  it("une contrainte que le fournisseur ne tient pas (longueur minimale) : une réparation, notée comme reprise de forme", async () => {
    const { user, call } = await appel();
    const S = z.object({ titre: z.string().min(5) });
    state.replies = ['{"titre":"ab"}', '{"titre":"assez long"}'];
    expect(await llmJson(call, S)).toEqual({ titre: "assez long" });
    expect(state.requests).toHaveLength(2);
    expect(details(user.id).map((d) => d.reprise ?? null)).toEqual([null, "forme"]);
  });

  it("une réponse déjà payée en JSON libre (tâche reprise) est relue sans être repayée", async () => {
    const { call } = await appel();
    state.replies = ['{"ok":true}'];
    await llmJson(call, Verdict, { strict: false });
    expect(state.requests).toHaveLength(1);
    expect(await llmJson(call, Verdict)).toEqual({ ok: true });
    expect(state.requests).toHaveLength(1);
  });
});

describe("conversion des schémas", () => {
  it("ce qui ne peut pas partir strict sans rien perdre est reconnu", () => {
    expect(raisonSansStrict(z.object({ a: z.record(z.string(), z.string()) }))).toBe("objet aux clés libres");
    expect(raisonSansStrict(z.object({ a: z.string() }).passthrough())).toBe("objet aux clés libres");
    expect(raisonSansStrict(z.object({ a: z.unknown() }))).toBe("valeur de forme libre");
    expect(raisonSansStrict(z.object({ a: z.string().transform((s) => s.length) }))).toBe("transformation");
    expect(raisonSansStrict(z.object({ a: z.tuple([z.string(), z.number()]) }))).toBe("n-uplet");
    expect(raisonSansStrict(z.object({ a: z.preprocess((v) => v, z.string()), b: z.string().catch(""), c: z.enum(["x", "y"]).optional(), d: z.array(z.object({ e: z.number().max(3) })).max(4) }))).toBeNull();
  });
  it("OpenAI : chaque clé présente, la facultative en « valeur ou null » ; le null est retiré à la lecture", () => {
    const schema = { type: "object", properties: { a: { type: "string" }, b: { type: "string" }, c: { type: ["string", "null"] }, d: { type: "array", items: { type: "object", properties: { e: { type: "number" } }, additionalProperties: false } } }, required: ["a"], additionalProperties: false };
    const o = schemaPourOpenAI(schema);
    expect(o.required).toEqual(["a", "b", "c", "d"]);
    expect(o.properties.b).toEqual({ anyOf: [{ type: "string" }, { type: "null" }] });
    expect(o.properties.d.anyOf[0].items.required).toEqual(["e"]);
    expect(sansNullsFacultatifs({ a: "x", b: null, c: null, d: [{ e: null }] }, schema)).toEqual({ a: "x", c: null, d: [{}] });
  });
  it("seuls les écarts que le fournisseur ne garantit pas gardent la réparation", () => {
    expect(seulementContraintes([{ code: "too_small" }, { code: "custom" }])).toBe(true);
    expect(seulementContraintes([{ code: "invalid_type" }])).toBe(false);
    expect(seulementContraintes([])).toBe(false);
  });
});
