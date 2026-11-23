/**
 * SINA donne le même prix que l'atelier (accord du propriétaire du 23 novembre 2026 : « je t'autorise à mettre le même
 * prix dans le code de SINA (atelier.ts) que dans l'atelier »). Le client ne voit jamais deux prix pour la même chose :
 *  - une vidéo : SINA (atelier.etat, atelier.video) lit le devis de la vidéo guidée, le même que l'écran ;
 *  - une image : la carte d'accord de SINA montre le prix probable du bouton de l'atelier, et « au plus » la borne signée.
 * Essais simulés : aucune clé, aucun appel.
 */
vi.mock("@/lib/public-download", () => import("./public-download-double"));
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
const state = vi.hoisted(() => ({ user: null as any }));
vi.mock("@/lib/auth", async (orig) => ({ ...(await orig<any>()), requireUser: async () => state.user, currentUser: async () => state.user }));
vi.mock("@/lib/ai/config", async (orig) => ({ ...(await orig<any>()), activeProviderKey: () => "TEST NO REAL PROVIDER" }));
import { createUser } from "@/lib/auth";
import { grantProjectPlan } from "@/lib/project-subscriptions";
import { run } from "@/lib/db";
import { seedImageFixture } from "./image-v2-fixtures";
import { saveAsset } from "@/lib/library";
import { setJsonSetting, setSetting } from "@/lib/settings";
import { MEDIA_MODELS } from "@/lib/ai/media-models";
import { loadProject } from "@/lib/projects";
import { accepterConditions, etatAtelier, prixDuGeste, remplacerModeration } from "@/lib/atelier/service";
import { OUTIL_DE_SINA } from "@/lib/atelier/outils";
import { getTool } from "@/lib/syna-agent/registry";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(() => { throw Error("HTTP provider forbidden"); }));
  setJsonSetting("billing.markup", 1); setJsonSetting("ai.media.quality", {}); setJsonSetting("ai.media.usage", {});
  setJsonSetting("ai.media.models", Object.fromEntries(MEDIA_MODELS.map((m) => [`${m.provider}:${m.model}`, { enabled: true, confirmedAt: Date.now() }])));
  setSetting("ai.prices.checkedAt", String(Date.now()));
  remplacerModeration(async () => ({ results: [{ flagged: false, categories: {} }] }));
});
afterEach(() => { run("UPDATE jobs SET status='cancelled' WHERE status IN ('queued','running')"); vi.unstubAllGlobals(); remplacerModeration(null); });

async function fixture() {
  const u = await createUser(`meme-prix-${crypto.randomUUID()}@example.invalid`, "synthetic-test-only", "Test");
  state.user = { ...u, role: "client" };
  const pid = seedImageFixture(u.id, "cosmetic");
  grantProjectPlan(pid, "dominer");
  const data = await sharp({ create: { width: 100, height: 150, channels: 3, background: "#468" } }).jpeg().toBuffer();
  const a = await saveAsset({ userId: u.id, projectId: pid, data, name: "photo.jpg", mime: "image/jpeg", role: "original", origin: "upload" });
  const ctx = { user: state.user, projectId: pid, conversationId: `conv-${crypto.randomUUID()}`, runId: `run-${crypto.randomUUID()}`, attachment: () => null };
  return { u, pid, a, ctx };
}

describe("SINA donne le même prix que l'atelier", () => {
  it("une vidéo : atelier.etat et atelier.video donnent le prix et « au plus » de l'écran, pour chaque modèle", async () => {
    const f = await fixture();
    const ecran = etatAtelier(f.u.id, loadProject(f.pid));
    const etat: any = await getTool("atelier.etat")!.run(f.ctx as any, {} as any);
    let compares = 0;
    for (const m of ecran.modelesVideos) {
      const s = etat.data.videos.modeles.find((x: any) => x.modele === m.id);
      expect(s.prix, m.id).toBe(m.prix);
      expect(s.auPlus, m.id).toBe(m.auPlus);
      expect(s.planSur, m.id).toBe(m.planSur);
      if (m.sansIa) continue;
      const v: any = await getTool("atelier.video")!.run(f.ctx as any, { modele: m.id } as any);
      if (m.raison) { expect(v.ok, m.id).toBe(false); expect(v.summary, m.id).toBe(m.raison); continue; }
      expect(v.data.prix, m.id).toBe(m.prix);
      expect(v.data.auPlus, m.id).toBe(m.auPlus);
      compares++;
    }
    expect(compares).toBeGreaterThan(0);
    // Le geste vidéo n'a plus de prix « par outil » qui serait un troisième chiffre.
    expect(etat.data.gestes.find((g: any) => g.geste === "video").prixParCreation).toMatch(/selon le modèle/);
  });

  it("une image : la carte d'accord montre le prix probable du bouton de l'atelier, et « au plus » la borne signée", async () => {
    const f = await fixture();
    accepterConditions(f.u.id);
    const t = getTool("atelier.creer")!;
    const scene = await t.estimate!(f.ctx as any, { geste: "scene", mode: "sina", mots: "sur une table en bois, lumière du matin" });
    const bouton = prixDuGeste(f.u.id, f.pid, "scene", OUTIL_DE_SINA)!;
    expect(scene.probableMicro).toBe(Math.min(bouton.totalMicro, scene.maxMicro));
    expect(scene.probableMicro!).toBeLessThanOrEqual(scene.maxMicro);
    const fond = await t.estimate!(f.ctx as any, { geste: "fond", mode: "sina", assetId: f.a.id, mots: "un fond blanc doux" });
    expect(fond.probableMicro).toBe(Math.min(prixDuGeste(f.u.id, f.pid, "fond", OUTIL_DE_SINA)!.totalMicro, fond.maxMicro));
  });
});
