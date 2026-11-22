/**
 * SINA connaît l'atelier dans sa conversation (limites de l'atelier, point 1), en essais simulés (aucun appel réel,
 * aucune clé) : ses outils passent par le MÊME cœur que l'écran (garde-fous, devis signé en part du budget du mois,
 * même tâche, même « Mes créations »), « SINA s'en occupe » reste sur OpenAI, « On le fait ensemble » prend l'outil
 * choisi par le client parmi ceux ouverts, la vidéo respecte le plafond du forfait, et chaque création est payante :
 * la carte d'accord passe avant (outil avec devis).
 */
vi.mock("@/lib/public-download", () => import("./public-download-double"));
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
const state = vi.hoisted(() => ({ user: null as any, sent: [] as any[] }));
vi.mock("@/lib/auth", async (orig) => ({ ...(await orig<any>()), requireUser: async () => state.user, currentUser: async () => state.user }));
vi.mock("@/lib/ai/config", async (orig) => ({ ...(await orig<any>()), activeProviderKey: () => "TEST NO REAL PROVIDER" }));
vi.mock("@/lib/ai/media-providers", async (orig) => ({
  ...(await orig<any>()),
  editPhoto: vi.fn(async (ctx: any, input: any) => { state.sent.push({ ctx, input }); return sharp({ create: { width: 64, height: 64, channels: 3, background: "#987" } }).png().toBuffer(); }),
}));
import { createUser } from "@/lib/auth";
import { grantProjectPlan } from "@/lib/project-subscriptions";
import { all, run } from "@/lib/db";
import { seedImageFixture } from "./image-v2-fixtures";
import { saveAsset } from "@/lib/library";
import { JobContext, getJob } from "@/lib/jobs";
import { handlers } from "../worker/handlers";
import { setJsonSetting } from "@/lib/settings";
import { MEDIA_MODELS } from "@/lib/ai/media-models";
import { accepterConditions, remplacerModeration } from "@/lib/atelier/service";
import { inscrireCreation, mesCreations } from "@/lib/atelier/journal";
import { lienVideoGuidee, modeleVideo } from "@/lib/atelier/modeles-videos";
import { getTool, toolVisible } from "@/lib/syna-agent/registry";
import { toolInFocus } from "@/lib/syna-agent/conversation";
import { SYNA_SYSTEM } from "@/lib/syna-agent/prompt";

let moderations: any[] = [];
beforeEach(() => {
  state.sent = []; moderations = [];
  vi.stubGlobal("fetch", vi.fn(() => { throw Error("HTTP provider forbidden"); }));
  setJsonSetting("billing.markup", 1); setJsonSetting("ai.media.quality", {}); setJsonSetting("ai.media.usage", {});
  setJsonSetting("ai.media.models", Object.fromEntries(MEDIA_MODELS.filter((m) => m.kind === "image").map((m) => [`${m.provider}:${m.model}`, { enabled: true, confirmedAt: Date.now() }])));
  remplacerModeration(async (body) => { moderations.push(body); return { results: [{ flagged: false, categories: {} }] }; });
});
afterEach(() => { run("UPDATE jobs SET status='cancelled' WHERE status IN ('queued','running')"); vi.unstubAllGlobals(); remplacerModeration(null); });

async function fixture(plan: "creer" | "vendre" | "dominer" = "dominer") {
  const u = await createUser(`atelier-sina-${crypto.randomUUID()}@example.invalid`, "synthetic-test-only", "Test");
  state.user = { ...u, role: "client" };
  const pid = seedImageFixture(u.id, "cosmetic");
  grantProjectPlan(pid, plan);
  const data = await sharp({ create: { width: 100, height: 150, channels: 3, background: "#468" } }).jpeg().toBuffer();
  const a = await saveAsset({ userId: u.id, projectId: pid, data, name: "photo.jpg", mime: "image/jpeg", role: "original", origin: "upload" });
  const ctx = { user: state.user, projectId: pid, conversationId: `conv-${crypto.randomUUID()}`, runId: `run-${crypto.randomUUID()}`, attachment: () => null };
  return { u, pid, a, ctx };
}

describe("SINA et l'atelier dans sa conversation", () => {
  it("ses outils existent, l'atelier est sous la main aux publications et aux publicités, et sa consigne dit quand le proposer", () => {
    for (const n of ["atelier.etat", "atelier.creer", "atelier.video"]) expect(getTool(n), n).toBeTruthy();
    expect(getTool("atelier.creer")!.estimate, "toute création passe par la carte d'accord").toBeTypeOf("function");
    expect(getTool("atelier.creer")!.kind).toBe("generate");
    for (const step of [9, 10]) for (const n of ["atelier.etat", "atelier.creer", "atelier.video"]) expect(toolInFocus(n, step), `${n} à l'étape ${step}`).toBe(true);
    // Les deux listes du site ne changent pas.
    for (const n of ["atelier.etat", "atelier.creer"]) { expect(toolInFocus(n, 6, {})).toBe(false); expect(toolInFocus(n, 6, { site: true })).toBe(false); }
    expect(toolInFocus("site.create", 6, {})).toBe(true);
    expect(toolInFocus("custom.edit", 6, { site: true })).toBe(true);
    expect(toolVisible("atelier.creer", { inJourney: true, legacyMockups: false, routed: true })).toBe(true);
    expect(SYNA_SYSTEM).toMatch(/L'atelier : /);
    for (const mot of ["Je m'en occupe", "On le fait ensemble", "Tu le fais toi-même", "atelier.etat", "atelier.creer", "atelier.video", "carte d'accord", "créations qui n'ont pas encore servi", "fête"]) expect(SYNA_SYSTEM, mot).toContain(mot);
  });

  it("atelier.etat : prix en part du budget du mois, conditions, plafond des vidéos, créations qui dorment ; jamais d'euros", async () => {
    const f = await fixture("vendre");
    inscrireCreation({ projectId: f.pid, userId: f.u.id, assetId: f.a.id, geste: "fond", mode: "moi", kind: "image", provider: "openai", model: "gpt-image-2.6-flare", costMicro: 1000 });
    const r: any = await getTool("atelier.etat")!.run(f.ctx as any, {});
    expect(r.ok).toBe(true);
    expect(r.data.conditionsAcceptees).toBe(false);
    expect(r.data.lien).toBe(`/studio/${f.pid}/atelier`);
    expect(r.data.videos).toMatchObject({ inclus: 3, restantes: 3 });
    expect(r.data.creationsQuiDorment).toHaveLength(1);
    const fond = r.data.gestes.find((g: any) => g.geste === "fond");
    expect(fond.prixParCreation).toMatch(/de ton budget du mois$/);
    expect(JSON.stringify(r)).not.toMatch(/€/);
  });

  it("atelier.creer (« SINA s'en occupe ») : mêmes garde-fous que l'écran, devis signé, même tâche, toujours OpenAI, inscrit dans « Mes créations »", async () => {
    const f = await fixture();
    const t = getTool("atelier.creer")!;
    const args = { geste: "fond", mode: "sina", assetId: f.a.id, mots: "un mur de pierre clair", outil: "bfl:flux-kontext-pro" };
    // Conditions pas acceptées : refus avant tout devis (le client les accepte lui-même à l'écran).
    moderations = [];
    await expect(t.estimate!(f.ctx as any, args)).rejects.toThrow(/conditions de l'atelier/);
    expect(moderations).toHaveLength(0);
    accepterConditions(f.u.id);
    const est = await t.estimate!(f.ctx as any, args);
    expect(est.maxMicro).toBeGreaterThan(0);
    expect(moderations).toHaveLength(1);
    expect(moderations[0].input.map((i: any) => i.type)).toEqual(["text", "image_url"]);
    expect(all("SELECT id FROM jobs WHERE project_id=?", f.pid)).toHaveLength(0);
    const res = await t.run(f.ctx as any, args);
    expect(res.ok, res.summary).toBe(true);
    expect(res.jobs).toHaveLength(1);
    const job = getJob(res.jobs![0])!;
    expect(job.type).toBe("image.edit");
    const payload = JSON.parse(job.payload);
    expect(payload).toMatchObject({ assetId: f.a.id, geste: "fond", mode: "sina", instruction: "un mur de pierre clair" });
    expect(payload.outil).toBeUndefined();
    expect(JSON.parse(Buffer.from(payload.nativeEditQuote.token.split(".")[0], "base64url").toString()).route.provider).toBe("openai");
    await handlers["image.edit"](new JobContext(job));
    expect(state.sent).toHaveLength(1);
    expect(state.sent[0].input.instruction).toMatch(/^Remplacer seulement le fond de la photo par : un mur de pierre clair\./);
    expect(mesCreations(f.pid)[0]).toMatchObject({ geste: "fond", mode: "sina" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("« On le fait ensemble » : l'outil choisi par le client, seulement s'il est accordé et ouvert ; une demande refusée par la vérification ne coûte rien", async () => {
    const f = await fixture();
    accepterConditions(f.u.id);
    const t = getTool("atelier.creer")!;
    await expect(t.estimate!(f.ctx as any, { geste: "fond", mode: "ensemble", assetId: f.a.id, mots: "un fond blanc doux", outil: "fal:fal-ai/nano-banana-2/edit" })).rejects.toThrow(/pas ouvert pour ce geste/);
    const est = await t.estimate!(f.ctx as any, { geste: "fond", mode: "ensemble", assetId: f.a.id, mots: "un fond blanc doux", outil: "bfl:flux-kontext-pro" });
    expect(est.maxMicro).toBeGreaterThan(0);
    const res = await t.run(f.ctx as any, { geste: "fond", mode: "ensemble", assetId: f.a.id, mots: "un fond blanc doux", outil: "bfl:flux-kontext-pro" });
    const tok = JSON.parse(Buffer.from(JSON.parse(getJob(res.jobs![0])!.payload).nativeEditQuote.token.split(".")[0], "base64url").toString());
    expect(tok.route).toEqual({ provider: "bfl", model: "flux-kontext-pro" });
    remplacerModeration(async () => ({ results: [{ flagged: true, categories: { violence: true } }] }));
    await expect(t.estimate!(f.ctx as any, { geste: "retirer", mode: "sina", assetId: f.a.id, mots: "le câble" })).rejects.toThrow(/vérification a trouvé violence/);
    await expect(t.estimate!(f.ctx as any, { geste: "scene", mode: "sina", mots: "ma cliente qui tient le flacon" })).rejects.toThrow(/sans sa photo et son accord écrit/);
    expect(all("SELECT id FROM jobs WHERE project_id=?", f.pid)).toHaveLength(1);
  });

  it("atelier.video : le même plafond de vidéos que l'écran, et la même vidéo guidée déjà remplie", async () => {
    const f = await fixture("vendre");
    const t = getTool("atelier.video")!;
    const ok: any = await t.run(f.ctx as any, { modele: "cadeau" });
    expect(ok.ok).toBe(true);
    expect(ok.data.lien).toBe(lienVideoGuidee(f.pid, modeleVideo("cadeau")!, "fr"));
    const aa: any = await t.run(f.ctx as any, { modele: "avant-apres" });
    expect(aa.data.lien).toBe(`/studio/${f.pid}/atelier`);
    for (let k = 0; k < 3; k++) inscrireCreation({ projectId: f.pid, userId: f.u.id, assetId: null, geste: "video:cadeau", mode: "ensemble", kind: "video", provider: "studio-video", model: "ai", costMicro: 1 });
    const non = await t.run(f.ctx as any, { modele: "cadeau" });
    expect(non.ok).toBe(false);
    expect(non.summary).toMatch(/tes 3 vidéos du mois/);
    const c = await fixture("creer");
    expect((await t.run(c.ctx as any, { modele: "pub-15" })).summary).toMatch(/ne comprend pas de vidéo/);
  });
});
