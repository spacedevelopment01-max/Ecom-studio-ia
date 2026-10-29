/** Actual native media adapter/reservations/storage, all network simulated. */
import sharp from "sharp";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
vi.mock("node:dns/promises", () => ({
  lookup: async () => [{ address: "8.8.8.8", family: 4 }],
}));
import { createUser } from "../src/lib/auth";
import { run, all, one } from "../src/lib/db";
import { getSetting, setSetting } from "../src/lib/settings";
import {
  getSubscription,
  alignPeriod,
  syncAllowance,
  balance,
} from "../src/lib/billing";
import {
  refreshPricing,
  approvePricing,
  ECB_SOURCE,
} from "../src/lib/ai/higgsfield/pricing";
import {
  HIGGS_MODELS,
  defaultConfiguration,
} from "../src/lib/ai/higgsfield/catalog";
import { higgsfieldClip, aiClip, withQuotedImageRoute, withQuotedVideoRoute } from "../src/lib/ai/media-providers";
import { polling } from "../src/lib/ai/higgsfield/lifecycle";
import { withTrace } from "../src/lib/ai/trace";
import { mediaStatus } from "../src/lib/ai/media-routing";
import { mediaModel } from "../src/lib/ai/media-models";
import { fileExists } from "../src/lib/storage";
let posts = 0,
  downloads = 0,
  polls = 0,
  mode = "ok";
const model = HIGGS_MODELS[3].id;
const backupModel=HIGGS_MODELS.find(m=>m.mode==="image"&&m.id!==model)!.id;
let quotedBackupPosts=0;
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6ObAAAAAASUVORK5CYII=",
  "base64",
);
const video = Buffer.from(
  "00000018667479706d7034320000000069736f6d6d703432",
  "hex",
);
const json = (d: unknown, status = 200) =>
  new Response(JSON.stringify(d), { status });
const fakeFetch = async (url: RequestInfo | URL, init?: RequestInit) => {
  const u = String(url);
  if (u === ECB_SOURCE)
    return new Response(
      `<Cube time='${new Date().toISOString().slice(0, 10)}'><Cube currency='USD' rate='1.1'/></Cube>`,
    );
  if (u.endsWith("/explore"))
    return new Response("catalog unavailable fixture");
  if (u.includes("/estimate/")) return json({ usd: "0.5" });
  if (u.endsWith("/files/generate-upload-url"))
    return json({
      public_url: "https://images.higgs.ai/input.jpg",
      upload_url: "https://images.higgs.ai/upload",
      upload_headers: { "Content-Type": "image/jpeg" },
    });
  if (u.endsWith("/upload")) {
    expect(
      (init?.headers as Record<string, string>).Authorization,
    ).toBeUndefined();
    return new Response(null, { status: 200 });
  }
  if (u === `https://api.higgsfield.ai/${model}`) {
    posts++;
    if (mode === "503") return json({}, 503);
    if (mode === "400") return json({}, 400);
    return json({ request_id: "req-engine" });
  }
  if(u===`https://api.higgsfield.ai/${backupModel}`){quotedBackupPosts++;return json({request_id:"req-engine"});}
  if (u.endsWith("/requests/req-engine/status")) {
    polls++;
    if (mode === "poll-down") return json({}, 401);
    return json({
      request_id: "req-engine",
      status: mode === "failed" ? "failed" : "completed",
      video: { url: "https://images.higgs.ai/output.mp4" },
    });
  }
  if (u.endsWith("/output.mp4")) {
    downloads++;
    if (mode === "download-down") throw Error("Download fixture outage");
    return new Response(new Uint8Array(video), {
      headers: { "content-type": "video/mp4" },
    });
  }
  throw Error("Unexpected fixture URL");
};
async function client() {
  const u = await createUser(
    `higgs-${crypto.randomUUID()}@test.invalid`,
    "motdepasse-fixture",
    "Fixture",
  );
  run("UPDATE users SET role='client' WHERE id=?", u.id);
  getSubscription(u.id);
  run(
    "UPDATE subscriptions SET status='active',plan='dominer' WHERE user_id=?",
    u.id,
  );
  alignPeriod(u.id, Date.now());
  syncAllowance(u.id);
  const projectId = `p-${u.id}`;
  run(
    "INSERT INTO projects(id,user_id,name,created_at,updated_at) VALUES(?,?,?,?,?)",
    projectId,
    u.id,
    "Isolated product fixture",
    Date.now(),
    Date.now(),
  );
  return { userId: u.id, projectId, usageKey: "higgsfield-scene-1" };
}
const input = {
  image: png,
  prompt: "The real product, exact colors and silhouette. No humans.",
  aspect: "9:16" as const,
  seconds: 5,
  model,
};
beforeEach(async () => {
  input.image = await sharp({
    create: { width: 64, height: 64, channels: 3, background: "#385b41" },
  })
    .png()
    .toBuffer();
  mode = "ok";
  posts = downloads = polls = 0;
  polling.initialMs = 1;
  setSetting("higgsfield.approved", null);
  setSetting("provider.higgsfield.keyId", "fixture-id", true);
  setSetting("provider.higgsfield.keySecret", "fixture-secret", true);
  setSetting("billing.markup", "1");
  vi.stubGlobal("fetch", fakeFetch);
  const p = await refreshPricing(fakeFetch);
  approvePricing(p.id, [model], "fixture-admin");
});
afterEach(() => vi.unstubAllGlobals());
it("connects approval to actual native generation, reservation, settlement and permanent storage", async () => {
  const c = await client();
  const before = balance(c.userId, c.projectId);
  expect(mediaStatus(mediaModel("higgsfield", model)!).usable).toBe(true);
  expect(await aiClip("higgsfield", c, input)).toEqual(video);
  const r = one<{ id: string; status: string; result: string; actual: number }>(
    "SELECT * FROM ai_reservations WHERE project_id=?",
    c.projectId,
  )!;
  expect(r.status).toBe("settled");
  expect(fileExists(JSON.parse(r.result).file)).toBe(true);
  expect(before.available - balance(c.userId, c.projectId).available).toBe(
    r.actual,
  );
  expect(
    one<{ estimated: number }>(
      "SELECT estimated FROM usage_events WHERE project_id=?",
      c.projectId,
    )?.estimated,
  ).toBe(1);
  expect(posts).toBe(1);
});
it("reuses the acquired local result after reopening, with no network generation", async () => {
  const c = await client();
  await higgsfieldClip(c, input);
  expect(await higgsfieldClip(c, input)).toEqual(video);
  expect(posts).toBe(1);
  expect(downloads).toBe(1);
  expect(
    all("SELECT * FROM usage_events WHERE project_id=?", c.projectId),
  ).toHaveLength(1);
});
it("resumes a failed download by polling the same paid request, without another debit", async () => {
  const c = await client();
  mode = "download-down";
  await expect(higgsfieldClip(c, input)).rejects.toThrow();
  const spent = balance(c.userId, c.projectId).available;
  mode = "ok";
  expect(await higgsfieldClip(c, input)).toEqual(video);
  expect(posts).toBe(1);
  expect(polls).toBe(2);
  expect(balance(c.userId, c.projectId).available).toBe(spent);
});
it("preserves the receipt after interrupted status and resumes without resubmission", async () => {
  const c = await client();
  mode = "poll-down";
  await expect(higgsfieldClip(c, input)).rejects.toThrow();
  expect(
    one<{ status: string }>(
      "SELECT status FROM ai_reservations WHERE project_id=?",
      c.projectId,
    )?.status,
  ).toBe("uncertain");
  mode = "ok";
  expect(await higgsfieldClip(c, input)).toEqual(video);
  expect(posts).toBe(1);
  expect(
    all("SELECT * FROM usage_events WHERE project_id=?", c.projectId),
  ).toHaveLength(1);
});
it("releases a confirmed failed/refunded request and records no successful usage", async () => {
  const c = await client(),
    before = balance(c.userId, c.projectId).available;
  mode = "failed";
  await expect(higgsfieldClip(c, input)).rejects.toThrow("REFUNDED");
  expect(balance(c.userId, c.projectId).available).toBe(before);
  expect(
    one<{ status: string }>(
      "SELECT status FROM ai_reservations WHERE project_id=?",
      c.projectId,
    )?.status,
  ).toBe("released");
  expect(
    all("SELECT * FROM usage_events WHERE project_id=?", c.projectId),
  ).toHaveLength(0);
});
it("never submits a second generation after an ambiguous 503", async () => {
  const c = await client();
  mode = "503";
  await expect(higgsfieldClip(c, input)).rejects.toThrow();
  await expect(async () => higgsfieldClip(c, input)).rejects.toThrow();
  expect(posts).toBe(1);
});
it("rejects task budget overflow before any paid submission", async () => {
  const c = await client();
  await expect(
    withTrace({ costCapMicro: 1 }, () => higgsfieldClip(c, input)),
  ).rejects.toThrow("plafond");
  expect(posts).toBe(0);
  expect(
    all("SELECT * FROM ai_reservations WHERE project_id=?", c.projectId),
  ).toHaveLength(0);
});
it("refuses cross-project ownership even when a result was already acquired", async () => {
  const c = await client();
  await higgsfieldClip(c, input);
  const other = await client();
  await expect(
    higgsfieldClip({ ...c, userId: other.userId }, input),
  ).rejects.toThrow();
  expect(posts).toBe(1);
});
it("blocks unreferenced people and a disabled provider before dispatch", async () => {
  const c = await client();
  await expect(higgsfieldClip(c, { ...input, people: true })).rejects.toThrow();
  setSetting("provider.higgsfield.disabled", "1");
  await expect(higgsfieldClip(c, input)).rejects.toThrow();
  expect(posts).toBe(0);
});
it("records a deliberately new paid attempt under a new action key", async () => {
  const c = await client();
  await higgsfieldClip(c, input);
  await higgsfieldClip(
    { ...c, usageKey: "higgsfield-scene-new-intent" },
    input,
  );
  expect(posts).toBe(2);
  expect(
    all("SELECT * FROM usage_events WHERE project_id=?", c.projectId),
  ).toHaveLength(2);
});

it("connects the existing video engine dependencies to Higgsfield product shots", async () => {
  const c = await client();
  const { realVideoDeps } = await import("../src/lib/video-v2/deps");
  const { loadProject } = await import("../src/lib/projects");
  const deps = realVideoDeps(null, loadProject(c.projectId), true);
  expect(
    await deps.generateClip(
      {
        provider: "higgsfield",
        model,
        image: input.image,
        prompt: input.prompt,
        aspect: "9:16",
        seconds: 5,
        people: false,
      },
      "native-video-engine-shot",
    ),
  ).toEqual(video);
  expect(posts).toBe(1);
});
it("resumes through the native outer video receipt without a second generation or charge", async () => {
  const c = await client();
  const { videoReceipt } = await import("../src/lib/video-v2/receipts");
  const produce = () => higgsfieldClip(c, input);
  mode = "download-down";
  await expect(
    videoReceipt(c.projectId, "outer-shot", produce, {
      readOnlyRecovery: true,
    }),
  ).rejects.toThrow();
  const available = balance(c.userId, c.projectId).available;
  mode = "ok";
  expect(
    await videoReceipt(c.projectId, "outer-shot", produce, {
      readOnlyRecovery: true,
    }),
  ).toEqual(video);
  expect(posts).toBe(1);
  expect(balance(c.userId, c.projectId).available).toBe(available);
});
it("outer read-only recovery cannot turn an uncertain result without a receipt into a paid retry", async () => {
  const c = await client();
  const { videoReceipt } = await import("../src/lib/video-v2/receipts");
  const produce = () => higgsfieldClip(c, input);
  mode = "503";
  await expect(
    videoReceipt(c.projectId, "outer-ambiguous", produce, {
      readOnlyRecovery: true,
    }),
  ).rejects.toThrow();
  mode = "ok";
  await expect(
    videoReceipt(c.projectId, "outer-ambiguous", produce, {
      readOnlyRecovery: true,
    }),
  ).rejects.toThrow();
  expect(posts).toBe(1);
});

it("a started outer receipt after worker restart remains read-only and can recover an expired lease", async () => {
  const c = await client();
  const { videoReceipt } = await import("../src/lib/video-v2/receipts");
  const { DATA_DIR } = await import("../src/lib/db");
  const fs = await import("node:fs");
  const path = await import("node:path");
  const crypto = await import("node:crypto");
  const key = "outer-worker-crash",
    produce = () => higgsfieldClip(c, input);
  mode = "poll-down";
  await expect(
    videoReceipt(c.projectId, key, produce, { readOnlyRecovery: true }),
  ).rejects.toThrow();
  const file = path.join(
    DATA_DIR,
    "video-receipts",
    crypto.createHash("sha256").update(c.projectId).digest("hex"),
    crypto.createHash("sha256").update(`${c.projectId}:${key}`).digest("hex") +
      ".json",
  );
  fs.writeFileSync(
    file,
    JSON.stringify({ key, state: "started", at: Date.now() - 3600000 }),
  );
  run(
    "UPDATE ai_reservations SET recovery_until=? WHERE project_id=?",
    Date.now() - 1,
    c.projectId,
  );
  mode = "ok";
  expect(
    await videoReceipt(c.projectId, key, produce, { readOnlyRecovery: true }),
  ).toEqual(video);
  expect(posts).toBe(1);
  expect(
    all("SELECT * FROM usage_events WHERE project_id=?", c.projectId),
  ).toHaveLength(1);
});

it("feeds the general studio quote from the same approved configuration and sourced FX", async () => {
  const { setJsonSetting } = await import("../src/lib/settings");
  const { estimateTaskMicro } = await import("../src/lib/ai/estimate");
  const { approvedQuote } = await import("../src/lib/ai/higgsfield/pricing");
  setJsonSetting("ai.routes", {
    video_generation: { provider: "higgsfield", model },
  });
  const q = approvedQuote(defaultConfiguration(model, 5));
  expect(estimateTaskMicro("video_generation", { seconds: 5 })).toBeGreaterThan(
    0,
  );
  expect(
    Math.abs(estimateTaskMicro("video_generation", { seconds: 5 }) - q.micro),
  ).toBeLessThanOrEqual(1);
});

it("refunds an earlier uncertain debit when the provider subsequently confirms failure", async () => {
  const c = await client(),
    initial = balance(c.userId, c.projectId).available;
  mode = "poll-down";
  await expect(higgsfieldClip(c, input)).rejects.toThrow();
  expect(balance(c.userId, c.projectId).available).toBeLessThan(initial);
  mode = "failed";
  await expect(higgsfieldClip(c, input)).rejects.toThrow("REFUNDED");
  expect(balance(c.userId, c.projectId).available).toBe(initial);
  expect(posts).toBe(1);
  expect(
    one<{ status: string; actual: number }>(
      "SELECT status,actual FROM ai_reservations WHERE project_id=?",
      c.projectId,
    ),
  ).toMatchObject({ status: "reconciled", actual: 0 });
});

it("a stale/disabled tariff produces an actionable quote refusal instead of a zero estimate or generic server error", async () => {
  const { setJsonSetting } = await import("../src/lib/settings");
  const { estimateTaskMicro } = await import("../src/lib/ai/estimate");
  const { UserFacingError } = await import("../src/lib/jobs");
  setJsonSetting("ai.routes", {
    video_generation: { provider: "higgsfield", model },
  });
  setSetting("provider.higgsfield.disabled", "1");
  expect(() => estimateTaskMicro("video_generation", { seconds: 5 })).toThrow(
    UserFacingError,
  );
  expect(posts).toBe(0);
});

it("respects the existing per-model disable switch before direct native dispatch", async () => {
  const c = await client();
  const { setJsonSetting } = await import("../src/lib/settings");
  setJsonSetting("ai.media.models", {
    [`higgsfield:${model}`]: { enabled: false },
  });
  await expect(higgsfieldClip(c, input)).rejects.toThrow();
  expect(posts).toBe(0);
});

it("uses the approved Higgsfield route in the explicit staged guided workflow", async () => {
  const c = await client();
  const { setJsonSetting } = await import("../src/lib/settings");
  setJsonSetting("ai.routes", {
    video_generation: { provider: "higgsfield", model },
  });
  const { realThreeScenesDeps } = await import(
    "../src/lib/video-v2/three-scenes"
  );
  const deps = realThreeScenesDeps(null, c, { aiText: false });
  expect(
    await deps.clip(
      input.image,
      input.prompt,
      "9:16",
      5,
      "native-guided-staged",
      "staged",
    ),
  ).toEqual(video);
  expect(posts).toBe(1);
});


it('route consentie : un refus400 ne doit pas lancer le secours hors devis',async()=>{
 const c=await client(),old=getSetting('ai.media.usage');quotedBackupPosts=0;
 const prices=await refreshPricing(fakeFetch);approvePricing(prices.id,[model,backupModel],'fixture-admin');
 setSetting('ai.media.usage',JSON.stringify({product_video:{mode:'manual',primary:`higgsfield:${model}`,backup:`higgsfield:${backupModel}`}}));mode='400';
 try{
  await expect(withQuotedImageRoute({provider:'higgsfield',model},()=>aiClip('higgsfield',c,input))).rejects.toThrow();
  expect(posts).toBe(1);expect(quotedBackupPosts).toBe(0);
  expect(all('SELECT status FROM ai_reservations WHERE project_id=?',c.projectId)).toEqual([{status:'released'}]);
 }finally{setSetting('ai.media.usage',old);}
});
it('sans route consentie, conserve le secours historique après refus non facturé',async()=>{
 const c=await client(),old=getSetting('ai.media.usage');quotedBackupPosts=0;
 const prices=await refreshPricing(fakeFetch);approvePricing(prices.id,[model,backupModel],'fixture-admin');
 setSetting('ai.media.usage',JSON.stringify({product_video:{mode:'manual',primary:`higgsfield:${model}`,backup:`higgsfield:${backupModel}`}}));mode='400';
 try{
  expect(await aiClip('higgsfield',c,input)).toEqual(video);expect(posts).toBe(1);expect(quotedBackupPosts).toBe(1);
  expect(all<{status:string}>('SELECT status FROM ai_reservations WHERE project_id=? ORDER BY created_at,rowid',c.projectId).map(r=>r.status)).toEqual(['released','settled']);
 }finally{setSetting('ai.media.usage',old);}
});

it('verrou vidéo dédié :503 reste incertain et sans secours ni seconde réservation',async()=>{
 const c=await client(),old=getSetting('ai.media.usage');quotedBackupPosts=0;
 const prices=await refreshPricing(fakeFetch);approvePricing(prices.id,[model,backupModel],'fixture-admin');
 setSetting('ai.media.usage',JSON.stringify({product_video:{mode:'manual',primary:`higgsfield:${model}`,backup:`higgsfield:${backupModel}`}}));mode='503';
 try{
  await expect(withQuotedVideoRoute({provider:'higgsfield',model},()=>aiClip('higgsfield',c,input))).rejects.toThrow();
  expect(posts).toBe(1);expect(quotedBackupPosts).toBe(0);expect(all('SELECT status FROM ai_reservations WHERE project_id=?',c.projectId)).toEqual([{status:'uncertain'}]);
 }finally{setSetting('ai.media.usage',old);}
});
