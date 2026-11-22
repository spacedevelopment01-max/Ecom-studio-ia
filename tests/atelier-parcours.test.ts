/**
 * L'atelier de création, de bout en bout, en essais simulés (aucun appel réel, aucune clé) : conditions acceptées une
 * fois, demande vérifiée par la modération avant le devis, gestes simples par la retouche native (fond, carré), outil
 * choisi par le client seulement parmi ceux ouverts, mode « SINA s'en occupe » toujours sur OpenAI, « Mes créations »,
 * plafond des vidéos du mois, avant-après sur deux vraies photos seulement.
 */
vi.mock("@/lib/public-download", () => import("./public-download-double"));
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
const state = vi.hoisted(() => ({ user: null as any, sent: [] as any[], scenes: [] as any[] }));
vi.mock("@/lib/auth", async (orig) => ({ ...(await orig<any>()), requireUser: async () => state.user, currentUser: async () => state.user }));
vi.mock("@/lib/ai/config", async (orig) => ({ ...(await orig<any>()), activeProviderKey: () => "TEST NO REAL PROVIDER" }));
vi.mock("@/lib/ai/media-providers", async (orig) => ({
  ...(await orig<any>()),
  editPhoto: vi.fn(async (ctx: any, input: any) => { state.sent.push({ ctx, input }); return sharp({ create: { width: 64, height: 64, channels: 3, background: "#987" } }).png().toBuffer(); }),
  openaiScene: vi.fn(async (ctx: any, input: any) => { state.scenes.push({ ctx, input }); const m = await sharp(input.composite).metadata(); return sharp({ create: { width: m.width!, height: m.height!, channels: 3, background: "#cba" } }).png().toBuffer(); }),
}));
import { createUser } from "@/lib/auth";
import { grantProjectPlan } from "@/lib/project-subscriptions";
import { all, run } from "@/lib/db";
import { POST as imagesPost } from "@/app/api/projects/[id]/images/v2/route";
import { GET as atelierGet, POST as atelierPost } from "@/app/api/projects/[id]/atelier/route";
import { seedImageFixture } from "./image-v2-fixtures";
import { getAsset, saveAsset, assetMeta } from "@/lib/library";
import { JobContext, getJob } from "@/lib/jobs";
import { handlers } from "../worker/handlers";
import { setJsonSetting } from "@/lib/settings";
import { MEDIA_MODELS } from "@/lib/ai/media-models";
import { remplacerModeration, assertVideoAtelier, plafondDuProjet } from "@/lib/atelier/service";
import { inscrireCreation, mesCreations } from "@/lib/atelier/journal";
import { PHRASE_ACCORD } from "@/lib/atelier/garde-fous";

let moderations: any[] = [];
beforeEach(() => {
  state.sent = []; state.scenes = []; moderations = [];
  vi.stubGlobal("fetch", vi.fn(() => { throw Error("HTTP provider forbidden"); }));
  setJsonSetting("billing.markup", 1); setJsonSetting("ai.media.quality", {}); setJsonSetting("ai.media.usage", {});
  setJsonSetting("ai.media.models", Object.fromEntries(MEDIA_MODELS.filter((m) => m.kind === "image").map((m) => [`${m.provider}:${m.model}`, { enabled: true, confirmedAt: Date.now() }])));
  remplacerModeration(async (body) => { moderations.push(body); return { results: [{ flagged: false, categories: {} }] }; });
});
afterEach(() => { run("UPDATE jobs SET status='cancelled' WHERE status IN ('queued','running')"); vi.unstubAllGlobals(); remplacerModeration(null); });

async function fixture(plan: "creer" | "vendre" | "dominer" = "dominer") {
  const u = await createUser(`atelier-${crypto.randomUUID()}@example.invalid`, "synthetic-test-only", "Test");
  state.user = { ...u, role: "client" };
  const pid = seedImageFixture(u.id, "cosmetic");
  grantProjectPlan(pid, plan);
  const data = await sharp({ create: { width: 100, height: 150, channels: 3, background: "#468" } }).jpeg().toBuffer();
  const a = await saveAsset({ userId: u.id, projectId: pid, data, name: "photo.jpg", mime: "image/jpeg", role: "original", origin: "upload" });
  const ctx = { params: Promise.resolve({ id: pid }) };
  const req = (url: string, b?: unknown) => new Request(url, b ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) } : undefined);
  const images = (b: unknown) => imagesPost(req(`http://localhost/api/projects/${pid}/images/v2`, b), ctx);
  const atelier = (b?: unknown) => (b ? atelierPost(req(`http://localhost/api/projects/${pid}/atelier`, b), ctx) : atelierGet(req(`http://localhost/api/projects/${pid}/atelier`), ctx));
  return { u, pid, a, images, atelier };
}

describe("l'atelier, essais simulés", () => {
  it("rien sans les conditions acceptées une fois ; une demande signalée par la modération est refusée avant tout devis", async () => {
    const f = await fixture();
    const op = crypto.randomUUID(), b = { action: "quote_edit", operationId: op, assetId: f.a.id, instruction: "un mur de pierre clair", geste: "fond", mode: "moi" };
    const r1 = await f.images(b);
    expect(r1.status).toBe(409);
    expect(await r1.json()).toMatchObject({ code: "atelier_conditions" });
    expect((await f.atelier({ action: "accepter_conditions" })).status).toBe(200);
    remplacerModeration(async () => ({ results: [{ flagged: true, categories: { violence: true } }] }));
    const r2 = await f.images(b);
    expect(r2.status).toBe(400);
    expect((await r2.json()).error ?? "").toMatch(/vérification a trouvé violence/);
    remplacerModeration(async () => null);
    expect((await f.images(b)).status).toBe(400);
    expect(all("SELECT id FROM jobs WHERE project_id=?", f.pid)).toHaveLength(0);
    expect(state.sent).toHaveLength(0);
  });

  it("« Change le fond » : vérifié (texte et photo), devis, accord, retouche par l'outil, contrôle du produit, inscrit dans « Mes créations »", async () => {
    const f = await fixture();
    await f.atelier({ action: "accepter_conditions" });
    const op = crypto.randomUUID(), b = { assetId: f.a.id, instruction: "un mur de pierre clair", geste: "fond", mode: "moi" };
    const qr = await f.images({ action: "quote_edit", operationId: op, ...b });
    expect(qr.status, await qr.clone().text()).toBe(200);
    const q = await qr.json();
    expect(moderations).toHaveLength(1);
    expect(moderations[0].input.map((i: any) => i.type)).toEqual(["text", "image_url"]);
    const r = await f.images({ action: "edit", operationId: op, approvalToken: q.approvalToken, confirmation: true, ...b });
    expect(r.status, await r.clone().text()).toBe(200);
    const out: any = await handlers["image.edit"](new JobContext(getJob((await r.json()).jobId)!));
    expect(state.sent).toHaveLength(1);
    expect(state.sent[0].input.instruction).toMatch(/^Remplacer seulement le fond de la photo par : un mur de pierre clair\./);
    const made = getAsset(out.assetId)!;
    expect(assetMeta<any>(made).atelier).toMatchObject({ geste: "fond", outil: expect.stringMatching(/^openai:/) });
    expect(made.status).toBe("review");
    const c = mesCreations(f.pid);
    expect(c).toHaveLength(1);
    expect(c[0]).toMatchObject({ geste: "fond", kind: "image", assetId: out.assetId, servie: false });
  });

  it("« Version carrée » : le cadre agrandi autour de la photo intacte (OpenAI par masque), sans mots du client", async () => {
    const f = await fixture();
    await f.atelier({ action: "accepter_conditions" });
    const op = crypto.randomUUID(), b = { assetId: f.a.id, instruction: "", geste: "carre", mode: "ensemble" };
    const q = await (await f.images({ action: "quote_edit", operationId: op, ...b })).json();
    expect(q.approvalToken).toBeTruthy();
    const r = await f.images({ action: "edit", operationId: op, approvalToken: q.approvalToken, confirmation: true, ...b });
    const out: any = await handlers["image.edit"](new JobContext(getJob((await r.json()).jobId)!));
    expect(state.scenes).toHaveLength(1);
    const m = await sharp(state.scenes[0].input.composite).metadata();
    expect([m.width, m.height]).toEqual([1024, 1024]);
    expect(state.scenes[0].input.prompt).toMatch(/La photo d'origine reste intacte au centre/);
    expect(assetMeta<any>(getAsset(out.assetId)!).atelier.geste).toBe("carre");
    expect(mesCreations(f.pid)[0].geste).toBe("carre");
  });

  it("l'outil choisi par le client : seulement un outil accordé et ouvert ; « SINA s'en occupe » reste sur OpenAI", async () => {
    const f = await fixture();
    await f.atelier({ action: "accepter_conditions" });
    const base = { assetId: f.a.id, instruction: "un fond blanc doux", geste: "fond" };
    const fal = await f.images({ action: "quote_edit", operationId: crypto.randomUUID(), ...base, outil: "fal:fal-ai/nano-banana-2/edit", mode: "moi" });
    expect(fal.status).toBe(409);
    expect(await fal.json()).toMatchObject({ code: "atelier_tool_unavailable" });
    const kontext = await f.images({ action: "quote_edit", operationId: crypto.randomUUID(), ...base, outil: "bfl:flux-kontext-pro", mode: "moi" });
    expect(kontext.status, await kontext.clone().text()).toBe(200);
    const token = JSON.parse(Buffer.from((await kontext.json()).approvalToken.split(".")[0], "base64url").toString());
    expect(token.route).toEqual({ provider: "bfl", model: "flux-kontext-pro" });
    const sina = await f.images({ action: "quote_edit", operationId: crypto.randomUUID(), ...base, outil: "bfl:flux-kontext-pro", mode: "sina" });
    const t2 = JSON.parse(Buffer.from((await sina.json()).approvalToken.split(".")[0], "base64url").toString());
    expect(t2.route.provider).toBe("openai");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("une personne dans la demande : refusée sans sa photo et son accord écrit, gardé avec la photo", async () => {
    const f = await fixture();
    await f.atelier({ action: "accepter_conditions" });
    const v = await (await f.atelier({ action: "verifier", texte: "ma cliente qui tient le flacon" })).json();
    expect(v).toMatchObject({ ok: false, code: "atelier_personne" });
    const bad = await f.atelier({ action: "accord_personne", assetId: f.a.id, nom: "Jeanne Martin", phrase: "oui oui" });
    expect(bad.status).toBe(400);
    const ok = await (await f.atelier({ action: "accord_personne", assetId: f.a.id, nom: "Jeanne Martin", phrase: PHRASE_ACCORD[0] })).json();
    expect(ok.accord).toMatchObject({ nom: "Jeanne Martin", par: f.u.id });
    expect(assetMeta<any>(getAsset(f.a.id)!)).toMatchObject({ hasPerson: true, peopleConsent: true });
  });

  it("l'écran : prix en pourcentage du budget du mois sur chaque outil ouvert, huit vidéos, trois modèles épinglés, jamais d'euros", async () => {
    const f = await fixture();
    const e = await (await f.atelier()).json();
    const fond = e.gestes.find((g: any) => g.id === "fond");
    expect(fond.outils.length).toBeLessThanOrEqual(5);
    const ouverts = fond.outils.filter((o: any) => o.disponible);
    expect(ouverts.length).toBeGreaterThan(0);
    for (const o of ouverts) expect(o.prix).toMatch(/de ton budget du mois$/);
    expect(e.modelesVideos).toHaveLength(8);
    expect(e.modelesImages.filter((m: any) => m.epingle)).toHaveLength(3);
    expect(e.conditions.acceptees).toBe(false);
    expect(JSON.stringify(e)).not.toMatch(/€|illimit/i);
  });

  it("le plafond des vidéos du mois : 3 au forfait Développer ; le montage gratuit de deux vraies photos ne compte pas", async () => {
    const f = await fixture("vendre");
    expect(plafondDuProjet(f.u.id, f.pid)).toMatchObject({ inclus: 3, restantes: 3 });
    for (let k = 0; k < 2; k++) inscrireCreation({ projectId: f.pid, userId: f.u.id, assetId: null, geste: "video:cadeau", mode: "ensemble", kind: "video", provider: "studio-video", model: "ai", costMicro: 1 });
    inscrireCreation({ projectId: f.pid, userId: f.u.id, assetId: null, geste: "avant-apres", mode: "moi", kind: "video", provider: "studio", model: "montage", costMicro: 0 });
    inscrireCreation({ projectId: f.pid, userId: f.u.id, assetId: null, geste: "video:cadeau", mode: "ensemble", kind: "video", provider: "studio-video", model: "ai", costMicro: 1, status: "rate" });
    expect(plafondDuProjet(f.u.id, f.pid).restantes).toBe(1);
    expect(() => assertVideoAtelier(f.u.id, f.pid)).not.toThrow();
    inscrireCreation({ projectId: f.pid, userId: f.u.id, assetId: null, geste: "video:cadeau", mode: "ensemble", kind: "video", provider: "studio-video", model: "ai", costMicro: 1 });
    expect(() => assertVideoAtelier(f.u.id, f.pid)).toThrow(/tes 3 vidéos du mois/);
    const c = await fixture("creer");
    expect(() => assertVideoAtelier(c.u.id, c.pid)).toThrow(/ne comprend pas de vidéo/);
  });

  it("l'avant-après : seulement deux vraies photos du client, différentes ; jamais une image créée", async () => {
    const f = await fixture();
    await f.atelier({ action: "accepter_conditions" });
    const data = await sharp({ create: { width: 100, height: 150, channels: 3, background: "#864" } }).jpeg().toBuffer();
    const apres = await saveAsset({ userId: f.u.id, projectId: f.pid, data, name: "apres.jpg", mime: "image/jpeg", role: "original", origin: "upload" });
    const creee = await saveAsset({ userId: f.u.id, projectId: f.pid, data, name: "ia.jpg", mime: "image/jpeg", role: "lifestyle", origin: "generated" });
    expect((await f.atelier({ action: "avant_apres", avant: f.a.id, apres: creee.id })).status).toBe(400);
    expect((await f.atelier({ action: "avant_apres", avant: f.a.id, apres: f.a.id })).status).toBe(400);
    const ok = await f.atelier({ action: "avant_apres", avant: f.a.id, apres: apres.id });
    expect(ok.status, await ok.clone().text()).toBe(200);
    const job = getJob((await ok.json()).jobId)!;
    expect(job.type).toBe("atelier.avant-apres");
    expect(JSON.parse(job.payload).costCapMicro).toBe(0);
  });
});
