/** Isolated fixtures and simulated official HTTP responses. Zero provider generation calls. */
import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("../src/lib/ai/higgsfield/media", () => ({
  uploadImage: async () =>
    "https://images.higgs.ai/neutral-price-reference.jpg",
}));
import {
  getSetting,
  setSetting,
  setJsonSetting,
  getJsonSetting,
} from "../src/lib/settings";
import {
  HIGGS_MODELS,
  configurationKey,
  configurations,
  defaultConfiguration,
  requestBody,
} from "../src/lib/ai/higgsfield/catalog";
import {
  approvePricing,
  approved,
  approvedQuote,
  checkedQuote,
  discoverModels,
  ECB_SOURCE,
  parseFx,
  proposal,
  refreshPricing,
} from "../src/lib/ai/higgsfield/pricing";
import { api, estimate } from "../src/lib/ai/higgsfield/http";
import {
  poll,
  submit,
  UnchargedTerminal,
} from "../src/lib/ai/higgsfield/lifecycle";
import {
  PACK_AI_SHARE,
  SUBSCRIPTION_AI_SHARE,
  packBudgetMicro,
  monthlyAllowanceMicro,
} from "../src/lib/billing";
const fxXml = `<Cube time='${new Date().toISOString().slice(0, 10)}'><Cube currency='USD' rate='1.10'/></Cube>`;
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status });
let calls: { url: string; init?: RequestInit }[] = [];
const transport = async (url: RequestInfo | URL, init?: RequestInit) => {
  const u = String(url);
  calls.push({ url: u, init });
  if (u === ECB_SOURCE) return new Response(fxXml);
  if (u.endsWith("/explore"))
    return new Response(
      '<a href="/models/bytedance/seedance-2.0/image-to-video/playground">Model</a><p>50% off from $0.001 / second; cashback 100%</p>',
    );
  if (u.includes("/estimate/")) {
    const b = JSON.parse(String(init?.body));
    return json({
      usd: String(
        b.duration *
          (b.resolution === "4k" ? 0.8 : 0.1) *
          (b.generate_audio || b.sound === "on" ? 1.5 : 1),
      ),
    });
  }
  throw Error("Unexpected HTTP, no generation permitted");
};
const model = HIGGS_MODELS[3].id;
beforeEach(() => {
  calls = [];
  for (const key of [
    "higgsfield.proposal",
    "higgsfield.approved",
    "higgsfield.history",
  ])
    setSetting(key, null);
  setSetting("provider.higgsfield.keyId", "fixture-id", true);
  setSetting("provider.higgsfield.keySecret", "fixture-secret", true);
  setSetting("provider.higgsfield.disabled", "1");
});
async function prepare(ids = [model]) {
  const p = await refreshPricing(transport);
  return approvePricing(p.id, ids, "fixture-admin");
}
describe("Automatic exact account prices and bulk approval", () => {
  it("imports every configuration automatically and never submits a generation", async () => {
    const p = await refreshPricing(transport);
    expect(p.rows).toHaveLength(configurations().length);
    expect(p.rows.every((r) => r.status === "account_estimate")).toBe(true);
    expect(
      calls
        .filter((c) => c.init?.method === "POST")
        .every((c) => c.url.includes("/estimate/")),
    ).toBe(true);
    expect(
      p.rows.find((r) => r.configuration.resolution === "4k")!.usd,
    ).not.toBe(p.rows.find((r) => r.configuration.resolution === "1080p")!.usd);
    expect(p.discovered).toContain(model);
    expect(approved()).toBeNull();
  });
  it("approves selected models once and activates only those models", async () => {
    await prepare([model, HIGGS_MODELS[0].id]);
    expect(approved()?.models).toHaveLength(2);
    expect(getSetting("provider.higgsfield.disabled")).toBe("0");
    expect(approvedQuote(defaultConfiguration(model)).usd).toBe(0.5);
    expect(() =>
      approvedQuote(defaultConfiguration(HIGGS_MODELS[1].id)),
    ).toThrow("APPROVAL_REQUIRED");
  });
  it("uses sourced FX and distinct audio/resolution/duration/aspect prices", async () => {
    await prepare();
    const c = defaultConfiguration(model, 5);
    const q = approvedQuote(c);
    expect(q.micro).toBe(Math.ceil((0.5 / 1.1) * 1e6));
    expect(approvedQuote({ ...c, resolution: "4k" }).usd).toBe(4);
    expect(approvedQuote({ ...c, audio: true }).usd).toBe(0.75);
    expect(approvedQuote({ ...c, seconds: 10 }).usd).toBe(1);
    expect(q.fx.source).toBe(ECB_SOURCE);
  });
  it("creates proposals without mutating approved prices", async () => {
    const a = await prepare();
    await refreshPricing(transport);
    expect(approved()?.id).toBe(a.id);
    expect(proposal()?.id).not.toBe(a.proposal);
  });
  it("preserves manual corrections with a reason over refresh", async () => {
    const p = await refreshPricing(transport),
      c = defaultConfiguration(model);
    approvePricing(p.id, [model], "admin", [
      {
        key: configurationKey(c),
        usd: 0.6,
        reason: "Account tariff ceiling reviewed",
      },
    ]);
    await refreshPricing(transport);
    expect(
      proposal()?.rows.find((r) => r.key === configurationKey(c))?.overrideUsd,
    ).toBe(0.6);
  });
  it("blocks upstream increase before any paid dispatch, including old approved tariffs", async () => {
    await prepare();
    const c = defaultConfiguration(model);
    await expect(
      checkedQuote(
        c,
        requestBody(c, "Product", "https://example.com/image.jpg"),
        async () => json({ usd: "0.51" }),
      ),
    ).rejects.toThrow("PRICE_INCREASE");
  });
  it("uses a lower current account estimate without silently rewriting the approval", async () => {
    await prepare();
    const c = defaultConfiguration(model);
    const q = await checkedQuote(
      c,
      requestBody(c, "Product", "https://example.com/image.jpg"),
      async () => json({ usd: "0.40" }),
    );
    expect(q.currentUsd).toBe(0.4);
    expect(approvedQuote(c).usd).toBe(0.5);
  });
  it("rejects no prices, missing account credentials and promotional public minima", async () => {
    setSetting("provider.higgsfield.keySecret", null);
    const p = await refreshPricing(transport);
    expect(p.rows.every((r) => r.usd === null)).toBe(true);
    expect(() => approvePricing(p.id, [model], "admin")).toThrow("INCOMPLETE");
  });
  it("blocks incomplete selected model but keeps usable other models", async () => {
    const p = await refreshPricing(async (u, i) =>
      String(u).includes(`/estimate/${model}`)
        ? json({}, 404)
        : transport(u, i),
    );
    expect(() => approvePricing(p.id, [model], "admin")).toThrow("INCOMPLETE");
    expect(approvePricing(p.id, [HIGGS_MODELS[0].id], "admin").models).toEqual([
      HIGGS_MODELS[0].id,
    ]);
  });
  it("stops estimate calls on rate limits and keeps missing tariffs explicit", async () => {
    const p = await refreshPricing(async (u, i) =>
      String(u).includes("/estimate/") ? json({}, 429) : transport(u, i),
    );
    expect(p.rows.every((r) => r.status === "missing")).toBe(true);
    expect(() => approvePricing(p.id, [model], "admin")).toThrow("INCOMPLETE");
  });
  it("rejects obsolete proposals, obsolete FX and credential changes", async () => {
    const p = await refreshPricing(transport);
    setSetting("provider.higgsfield.keySecret", "rotated-fixture", true);
    expect(() => approvePricing(p.id, [model], "admin")).toThrow("STALE");
    expect(() =>
      parseFx(
        "<Cube time='2020-01-01'><Cube currency='USD' rate='1.1'/></Cube>",
      ),
    ).toThrow("FX");
  });
  it("blocks execution after disable and does not provide a global guessed per-second price", async () => {
    await prepare();
    setSetting("provider.higgsfield.disabled", "1");
    expect(() => approvedQuote(defaultConfiguration(model))).toThrow(
      "APPROVAL_REQUIRED",
    );
  });
  it("rejects unsupported parameters rather than mapping 4K onto a low-resolution minimum", async () => {
    await prepare();
    expect(() =>
      approvedQuote({ ...defaultConfiguration(model), seconds: 16 }),
    ).toThrow("CONFIGURATION");
    expect(() => requestBody(defaultConfiguration(model), "Product")).toThrow(
      "REFERENCE_REQUIRED",
    );
  });
  it("keeps approval history and old approved revision", async () => {
    const first = await prepare();
    await prepare();
    expect(
      getJsonSetting<{ id: string }[]>("higgsfield.history", [])[0].id,
    ).toBe(first.id);
  });
  it("parses exact catalog paths and ignores marketing values", () => {
    expect(
      discoverModels(
        '<a href="/models/kling-video/v3.0/4k/image-to-video/api-reference">$0.001</a>',
      ),
    ).toEqual(["kling-video/v3.0/4k/image-to-video"]);
  });
  it("retains the existing HT budget ratios without overrides", () => {
    expect(SUBSCRIPTION_AI_SHARE).toBe(0.4);
    expect(PACK_AI_SHARE).toBe(0.5);
    expect(packBudgetMicro(12)).toBe(5e6);
    expect(
      monthlyAllowanceMicro({
        status: "active",
        plan: "creer",
        billing: "monthly",
        price_cents: 1200,
      } as never),
    ).toBe(4e6);
  });
});
describe("Official async protocol, simulated", () => {
  it("uses the official key ID:secret header and no redirects", async () => {
    await estimate(model, { duration: 5 }, transport);
    const c = calls.at(-1)!;
    expect(c.init?.headers).toMatchObject({
      Authorization: "Key fixture-id:fixture-secret",
    });
    expect(c.init?.redirect).toBe("error");
  });
  it("never forwards credentials to another API host/path", async () => {
    await expect(api("//evil.example", {}, transport)).rejects.toThrow(
      "PATH_REFUSED",
    );
    expect(calls).toHaveLength(0);
  });
  it.each(["NaN", "-1", "0", "1001"])(
    "rejects invalid estimate %s",
    async (usd) => {
      await expect(
        estimate(model, {}, async () => json({ usd })),
      ).rejects.toThrow("ESTIMATE_INVALID");
    },
  );
  it("submits one request with persisted idempotency key", async () => {
    const spy = vi.fn(async (_u: unknown, init?: RequestInit) => {
      expect(init?.headers).toMatchObject({
        "Idempotency-Key": "reservation-fixture",
      });
      return json({ request_id: "req-1" });
    });
    expect(await submit(model, {}, "reservation-fixture", spy)).toBe("req-1");
    expect(spy).toHaveBeenCalledTimes(1);
  });
  it("never automatically resubmits ambiguous 503 responses", async () => {
    const spy = vi.fn(async () => json({}, 503));
    await expect(submit(model, {}, "reservation-fixture", spy)).rejects.toThrow(
      "HTTP_503",
    );
    expect(spy).toHaveBeenCalledTimes(1);
  });
  it("polls an existing request through queue/processing/result without submission", async () => {
    const statuses = ["queued", "in_progress", "completed"],
      seen: string[] = [];
    const spy = vi.fn(async (u: unknown, init?: RequestInit) => {
      expect(init?.method).toBe("GET");
      expect(String(u)).toContain("/requests/req-1/status");
      return json({
        request_id: "req-1",
        status: statuses.shift(),
        video: { url: "https://images.higgs.ai/result.mp4" },
      });
    });
    expect(
      await poll(
        "req-1",
        (s) => seen.push(s),
        spy,
        async () => {},
      ),
    ).toContain("result.mp4");
    expect(seen).toEqual(["queued", "in_progress", "completed"]);
  });
  it.each(["failed", "nsfw", "canceled"])(
    "returns confirmed uncharged terminal %s",
    async (status) => {
      await expect(
        poll(
          "req-1",
          () => {},
          async () => json({ request_id: "req-1", status }),
          async () => {},
        ),
      ).rejects.toBeInstanceOf(UnchargedTerminal);
    },
  );
  it("retries only status reads on 429 or 5xx", async () => {
    let n = 0;
    const spy = vi.fn(async () =>
      ++n < 3
        ? json({}, n === 1 ? 429 : 503)
        : json({
            request_id: "req-1",
            status: "completed",
            video: { url: "https://images.higgs.ai/done.mp4" },
          }),
    );
    expect(
      await poll(
        "req-1",
        () => {},
        spy,
        async () => {},
      ),
    ).toContain("done.mp4");
    expect(spy).toHaveBeenCalledTimes(3);
  });
  it("does not leak provider error details or credentials", async () => {
    await expect(
      estimate(model, {}, async () =>
        json({ detail: "fixture-secret private data" }, 401),
      ),
    ).rejects.toThrow(/^HIGGSFIELD_HTTP_401$/);
  });
  it("rejects a receipt for another request", async () => {
    await expect(
      poll(
        "req-1",
        () => {},
        async () => json({ request_id: "other", status: "completed" }),
        async () => {},
      ),
    ).rejects.toThrow("MISMATCH");
  });
});
