/**
 * Appel long chez OpenAI déposé puis relevé (essai réel du 20 novembre 2026 : le code d'un accueil, 3 minutes de
 * réponse, coupé en route par le réseau au bout de 2 minutes 40 ; résultat incertain et accueil arrêté). Sans IA.
 */
import { describe, expect, it } from "vitest";

describe("OpenAI : appel long déposé puis relevé", async () => {
  const T = await import("@/lib/ai/text-providers");
  T.releve.attendre = async () => {};
  const req = { model: "gpt-6.2-sol", system: "s", turns: [{ role: "user" as const, parts: [{ type: "text" as const, text: "code" }] }], maxOutput: 48000, effort: "medium", arrierePlan: true };
  const fini = { id: "resp_1", status: "completed", model: "gpt-6.2-sol", output: [{ type: "message", content: [{ type: "output_text", text: "{\"ok\":1}" }] }], usage: { input_tokens: 10, output_tokens: 7 } };
  const faux = (lectures: (() => Promise<Response>)[]) => {
    const vu: { methode: string; url: string; corps?: any }[] = [];
    let i = 0;
    const f = (async (url: string, init: any) => {
      vu.push({ methode: init.method, url, corps: init.body ? JSON.parse(init.body) : undefined });
      if (init.method === "POST") return new Response(JSON.stringify({ id: "resp_1", status: "queued" }), { status: 200 });
      if (init.method === "DELETE") return new Response("{}", { status: 200 });
      return lectures[Math.min(i++, lectures.length - 1)]();
    }) as unknown as typeof fetch;
    return { f, vu };
  };
  const json = (j: unknown) => async () => new Response(JSON.stringify(j), { status: 200 });

  it("la demande part UNE fois ; une lecture coupée par le réseau se refait ; la réponse lue est effacée chez OpenAI", async () => {
    const { f, vu } = faux([async () => { throw new TypeError("terminated"); }, json({ id: "resp_1", status: "in_progress" }), json(fini)]);
    expect(await T.openaiSend(req, "k", f)).toMatchObject({ text: "{\"ok\":1}", stop: "end_turn", usage: { input: 10, output: 7 } });
    expect(vu.filter((x) => x.methode === "POST")).toHaveLength(1);
    expect(vu[0].corps).toMatchObject({ background: true, store: true, model: "gpt-6.2-sol" });
    expect(vu.filter((x) => x.methode === "GET")).toHaveLength(3);
    expect(vu.at(-1)).toMatchObject({ methode: "DELETE", url: "https://api.openai.com/v1/responses/resp_1" });
  });

  it("le réseau coupé sans fin : résultat incertain, jamais une nouvelle demande", async () => {
    const { f, vu } = faux([async () => { throw new TypeError("terminated"); }]);
    await expect(T.openaiSend(req, "k", f)).rejects.toThrow(/résultat incertain/);
    expect(vu.filter((x) => x.methode === "POST")).toHaveLength(1);
  });

  it("sans « arrière-plan », l'appel reste en flux comme avant, et rien n'est gardé chez OpenAI", () => {
    const { arrierePlan: _x, ...court } = req;
    expect(T.openaiBody(court)).toMatchObject({ store: false });
    expect(T.openaiBody(court)).not.toHaveProperty("background");
  });

  it("le code de l'accueil dessiné est déposé puis relevé", async () => {
    const fs = await import("node:fs");
    expect(fs.readFileSync("src/lib/syna-agent/dessin/job.ts", "utf8")).toMatch(/arrierePlan: true, maxTokens: CODE_OUTPUT_TOKENS/);
    expect(fs.readFileSync("src/lib/ai/llm.ts", "utf8")).toContain('...(call.arrierePlan && provider === "openai" ? { arrierePlan: true } : {})');
  });
});
