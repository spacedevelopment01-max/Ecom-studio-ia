/**
 * Un seul prix pour une même vidéo (23 novembre 2026) : « Le moment cadeau » était à environ 3,2 % dans l'atelier et à
 * environ 11 % (plafond 27 %) sur la page de réglage. Le devis de la vidéo guidée (chaîne réelle) fait foi partout :
 * pour chaque modèle de vidéo, l'atelier et la page de réglage, ouverte par le lien du modèle, donnent le même coût
 * probable et la même borne haute. Essais simulés : aucune clé, aucun appel.
 */
vi.mock("@/lib/public-download", () => import("./public-download-double"));
import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ user: null as any }));
vi.mock("@/lib/auth", async (orig) => ({ ...(await orig<any>()), requireUser: async () => state.user, currentUser: async () => state.user }));
vi.mock("@/lib/ai/config", async (orig) => ({ ...(await orig<any>()), activeProviderKey: () => "TEST NO REAL PROVIDER" }));
import { createUser } from "@/lib/auth";
import { grantProjectPlan } from "@/lib/project-subscriptions";
import { setJsonSetting, setSetting } from "@/lib/settings";
import { MEDIA_MODELS } from "@/lib/ai/media-models";
import { GET as atelierGet } from "@/app/api/projects/[id]/atelier/route";
import { POST as videoPost } from "@/app/api/projects/[id]/creative/video/route";
import { MODELES_VIDEOS, lienVideoGuidee, reglagesDuModele } from "@/lib/atelier/modeles-videos";
import { seedImageFixture } from "./image-v2-fixtures";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(() => { throw Error("HTTP provider forbidden"); }));
  setJsonSetting("billing.markup", 1);
  setJsonSetting("ai.media.models", Object.fromEntries(MEDIA_MODELS.map((m) => [`${m.provider}:${m.model}`, { enabled: true, confirmedAt: Date.now() }])));
  setSetting("ai.prices.checkedAt", String(Date.now()));
});

describe("un seul prix pour chaque modèle de vidéo", () => {
  it("l'atelier et la page de réglage donnent le même coût probable et la même borne haute", async () => {
    const u = await createUser(`prix-video-${crypto.randomUUID()}@example.invalid`, "synthetic-test-only", "Test");
    state.user = { ...u, role: "client" };
    const pid = seedImageFixture(u.id, "cosmetic");
    grantProjectPlan(pid, "dominer");
    const ctx = { params: Promise.resolve({ id: pid }) };
    const etat = await (await atelierGet(new Request(`http://localhost/api/projects/${pid}/atelier`), ctx)).json();
    let compares = 0;
    for (const m of MODELES_VIDEOS.filter((x) => !x.sansIa)) {
      const vue = etat.modelesVideos.find((x: any) => x.id === m.id);
      // Ce que la page de réglage envoie quand elle est ouverte par le lien du modèle (mêmes réglages).
      const q = new URL(`http://localhost${lienVideoGuidee(pid, m, "fr")}`).searchParams;
      const r = reglagesDuModele(m);
      expect(Number(q.get("atelierPlans"))).toBe(r.scenes);
      expect(Number(q.get("atelierDuree"))).toBe(r.totalS);
      const body = { action: "quote", generation: "staged", as: m.as, aspect: "9:16", totalS: r.totalS, scenes: r.scenes, music: true, modele: m.id, request: q.get("atelierDemande") };
      const res = await videoPost(new Request(`http://localhost/api/projects/${pid}/creative/video`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }), ctx);
      const page = await res.json();
      expect(res.status, m.id).toBe(200);
      expect(vue.estimateMicro, m.id).toBe(page.allowed ? page.estimateMicro : 0);
      expect(vue.capMicro, m.id).toBe(page.allowed ? page.capMicro : 0);
      if (page.allowed) { expect(vue.estimateMicro, m.id).toBeGreaterThan(0); expect(vue.prix, m.id).toMatch(/de ton budget du mois$/); compares++; }
      else expect(vue.raison, m.id).toBe(page.reason);
    }
    expect(compares).toBeGreaterThan(0);
  });
});
