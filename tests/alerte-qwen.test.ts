/**
 * Alerte du propriétaire quand Qwen-Image 3.0 Pro (modèle d'images du studio) est inutilisable et qu'une image passe
 * par un autre modèle (décision du propriétaire, 16/10/2026) : e-mail aux administrateurs + notification dans
 * l'administration dès la première bascule, au plus un rappel par heure, puis « rétabli ». Un modèle choisi exprès
 * par l'administration n'est pas un incident. Fournisseurs et e-mails SIMULÉS : aucun appel ni envoi réel.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  const fs = process.getBuiltinModule("node:fs");
  const os = process.getBuiltinModule("node:os");
  const p = process.getBuiltinModule("node:path");
  process.env.DATA_DIR = fs.mkdtempSync(p.join(os.tmpdir(), "ecs-alerte-qwen-"));
});

let keys: Record<string, string | null> = {};
const mails: { to: string; subject: string; text: string }[] = [];
vi.mock("@/lib/ai/config", async (orig) => ({ ...(await orig<object>()), activeProviderKey: (p: string) => keys[p] ?? null }));
vi.mock("@/lib/mail", async (orig) => ({ ...(await orig<object>()), mailConfigured: () => true, sendMailInBackground: (m: any) => mails.push(m) }));

const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const calls: string[] = [];
async function fakeFetch(url: string): Promise<Response> {
  calls.push(url);
  const json = (j: unknown, status = 200) => new Response(JSON.stringify(j), { status });
  if (url.includes("/services/aigc/multimodal-generation/generation")) return json({ output: { choices: [{ message: { content: [{ image: "https://result.test/qwen.png" }] } }] } });
  if (url === "https://result.test/qwen.png") return new Response(Buffer.from(PNG, "base64"));
  if (url.includes(":generateContent")) return json({ candidates: [{ content: { parts: [{ inlineData: { data: PNG } }] } }] });
  return json({}, 404);
}

describe("alerte Qwen-Image 3.0 Pro inutilisable", async () => {
  const { createUser } = await import("@/lib/auth");
  const { all, run } = await import("@/lib/db");
  const billing = await import("@/lib/billing");
  const { setSetting, setJsonSetting } = await import("@/lib/settings");
  const { runWithLang } = await import("@/lib/i18n-server");
  const mp = await import("@/lib/ai/media-providers");
  const alerts = await import("@/lib/ai/media-alerts");
  const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);

  const admin = await createUser(`admin-qwen-${Date.now()}@test.fr`, "motdepasse-test", "Admin");
  run("UPDATE users SET role = 'admin' WHERE id = ?", admin.id);
  async function client() {
    const u = await createUser(`qwen${Date.now()}${Math.random().toString(36).slice(2, 7)}@test.fr`, "motdepasse-test", "C");
    run("UPDATE users SET role = 'client' WHERE id = ?", u.id);
    billing.getSubscription(u.id);
    run("UPDATE subscriptions SET status = 'active', plan = 'dominer' WHERE user_id = ?", u.id);
    billing.alignPeriod(u.id, Date.now());
    billing.syncAllowance(u.id);
    const pid = `p-${u.id}`;
    run("INSERT INTO projects (id, user_id, name, created_at, updated_at) VALUES (?,?,?,?,?)", pid, u.id, "Boutique ARVEN", Date.now(), Date.now());
    return { userId: u.id, projectId: pid, usageKey: `k-${Math.random()}` };
  }
  const notes = () => all<{ title: string; body: string }>("SELECT title, body FROM notifications WHERE user_id = ? ORDER BY created_at, rowid", admin.id);

  beforeEach(() => {
    mails.length = 0;
    calls.length = 0;
    run("DELETE FROM notifications WHERE user_id = ?", admin.id);
    vi.stubGlobal("fetch", fakeFetch);
    setSetting("ai.prices.checkedAt", String(Date.now()));
    for (const k of ["ai.routes", "ai.media.backup", "ai.media.mode", "ai.media.models", "ai.prices", "ai.media.usage"]) setJsonSetting(k, {});
    setJsonSetting("ai.media.qwenIncident", null);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("vraie génération : clé Alibaba absente → image par un autre modèle, alerte e-mail + notification complète ; Qwen revenu → « rétabli »", async () => {
    keys = { google: "cle-google-test-123456" };
    const c = await client();
    await fr(() => mp.ambianceImage(c, { prompt: "atelier lumineux", aspect: "1:1" }));
    expect(calls.some((u) => u.includes(":generateContent"))).toBe(true);
    const n = notes();
    expect(n).toHaveLength(1);
    expect(n[0].title).toMatch(/Qwen-Image 3.0 Pro inutilisable/);
    for (const part of [/Quoi : .*google:gemini/, /Pourquoi : .*clé/, /Depuis : /, /projet « Boutique ARVEN »/, /usage « Décors et ambiances »/, /Surcoût estimé : /, /Fournisseurs IA/]) expect(n[0].body).toMatch(part);
    expect(mails).toHaveLength(1);
    expect(mails[0].to).toBe(admin.email);
    expect(mails[0].subject).toMatch(/Qwen-Image 3.0 Pro inutilisable/);

    // Pas d'avalanche : une seconde image pendant le même incident n'envoie rien.
    await fr(() => mp.ambianceImage({ ...c, usageKey: `k-${Math.random()}` }, { prompt: "atelier lumineux, autre angle", aspect: "1:1" }));
    expect(notes()).toHaveLength(1);
    expect(mails).toHaveLength(1);

    // Clé Alibaba rétablie : Qwen-Image 3.0 Pro utilisé, alerte « rétabli », incident clos.
    keys = { google: "cle-google-test-123456", alibaba: "sk-alibaba-test-1234567890" };
    await fr(() => mp.ambianceImage({ ...c, usageKey: `k-${Math.random()}` }, { prompt: "atelier lumineux", aspect: "1:1" }));
    expect(calls.some((u) => u.includes("multimodal-generation"))).toBe(true);
    expect(notes().map((x) => x.title)).toEqual([expect.stringMatching(/inutilisable/), "Qwen-Image 3.0 Pro rétabli"]);
    expect(mails.at(-1)!.subject).toMatch(/rétabli/);
    expect(alerts.qwenIncident()).toBeNull();
  });

  it("rappel au plus une fois par heure tant que l'incident dure", () => {
    keys = { openai: "sk-openai-test-123456" };
    const t0 = Date.now();
    const o = { provider: "openai", model: "gpt-image-1", projectId: null, usage: "ad_visual" as const };
    alerts.noteImageModel({ ...o, now: t0 });
    alerts.noteImageModel({ ...o, now: t0 + 10 * 60_000 });
    alerts.noteImageModel({ ...o, now: t0 + 59 * 60_000 });
    expect(notes()).toHaveLength(1);
    alerts.noteImageModel({ ...o, now: t0 + alerts.QWEN_ALERT_EVERY_MS + 1 });
    expect(notes().map((x) => x.title)).toEqual([expect.stringMatching(/inutilisable/), expect.stringMatching(/^Rappel/)]);
    // Le rappel garde le début de l'incident.
    expect(alerts.qwenIncident()).toMatchObject({ since: t0, alerts: 2, replacedBy: "openai:gpt-image-1" });
    expect(notes()[0].body).toMatch(/Surcoût estimé : environ .* de plus par image/);
  });

  it("modèle choisi exprès par l'administration (autre que Qwen) : aucune alerte", () => {
    keys = { openai: "sk-openai-test-123456" };
    setJsonSetting("ai.routes", { image_generation: { provider: "openai", model: "gpt-image-1" } });
    alerts.noteImageModel({ provider: "openai", model: "gpt-image-1", projectId: null, usage: "scene" });
    setJsonSetting("ai.routes", {});
    setJsonSetting("ai.media.usage", { logo: { primary: "openai:gpt-image-1" } });
    alerts.noteImageModel({ provider: "openai", model: "gpt-image-1", projectId: null, usage: "logo" });
    expect(notes()).toHaveLength(0);
    expect(mails).toHaveLength(0);
    expect(alerts.qwenIncident()).toBeNull();
  });

  it("Qwen utilisable mais en panne (échec sans coût) et secours utilisé : alerte avec la cause", () => {
    keys = { openai: "sk-openai-test-123456", alibaba: "sk-alibaba-test-1234567890" };
    alerts.noteImageModel({ provider: "openai", model: "gpt-image-1", projectId: null, usage: "scene", excluded: ["alibaba:qwen-image-3.0-pro"] });
    expect(notes()[0].body).toMatch(/Pourquoi : Qwen-Image 3.0 Pro a refusé la demande ou est en panne/);
  });
});
