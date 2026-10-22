import {grantProjectPlan} from './communication-choice-fixture';
/**
 * Vidéos montées avec des plans libres de droits (Pixabay d'abord) : chaque moment qui ne montre pas le produit
 * (accroche, développement, démonstration) reçoit SON plan vidéo, différent des autres ; le produit reste montré par
 * ses vraies photos, l'appel à l'action reste composé (logo, bouton). Gratuit : aucun plan généré sans accord.
 * Outils simulés (aucune IA, aucun réseau) ; rendu réel en petite taille.
 */
import { describe, expect, it } from "vitest";

describe("Montage vidéo sur plans Pixabay", async () => {
  const { createUser } = await import("@/lib/auth");
  const { loadProject } = await import("@/lib/projects");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { saveAsset, getAsset, assetMeta } = await import("@/lib/library");
  const { runVideoEngineV2 } = await import("@/lib/video-v2/engine");
  const { latestVideo } = await import("@/lib/video-v2/store");
  const { clipOrder } = await import("@/lib/stock/stock-clip");
  const { seedImageFixture, seedCutout } = await import("./image-v2-fixtures");
  const { mockVideoDeps, mockMp4 } = await import("./video-v2-mock");
  const fr = <T,>(fn: () => Promise<T>) => runWithLang({ ui: "fr", content: "fr" }, fn);
  const u = await createUser(`vpix-${Date.now()}@test.fr`, "motdepasse-test", "V");

  /** Plans « Pixabay » simulés : un nouveau plan à chaque demande, jamais deux fois le même. */
  function stockDeps(projectId: string) {
    const asked: { topic: string; part: string; excluded: number }[] = [];
    let n = 0;
    const stockClip = async (req: { topic: string; part: string; durationS: number }, exclude: Set<string>) => {
      asked.push({ topic: req.topic, part: req.part, excluded: exclude.size });
      const id = `px${++n}`;
      exclude.add(`pixabay:${id}`);
      const a = await saveAsset({ projectId, userId: u.id, data: mockMp4(Math.max(4, Math.ceil(req.durationS) + 1), n % 2 ? "testsrc2" : "smptebars"), name: `plan-libre-${id}.mp4`, mime: "video/mp4", role: "clip", folderKey: "videos.ads", origin: "import", meta: { stock: { source: "pixabay", id, page: `https://pixabay.com/videos/id-${id}/`, author: "test", license: "Pixabay" } } });
      return { assetId: a.id, durationS: Math.max(4, Math.ceil(req.durationS) + 1) };
    };
    return { stockClip, asked };
  }

  it("boutique : plans Pixabay différents pour l'accroche et le développement, vraies photos du produit, fin composée — 0 €", async () => {
    const p = loadProject(seedImageFixture(u.id, "cosmetic"));
    await seedCutout(u.id, p.id);
    const { deps, log } = mockVideoDeps({ userId: u.id, projectId: p.id });
    const s = stockDeps(p.id);
    const r = await fr(() => runVideoEngineV2(null, p.id, { ask: { text: "Publicité Instagram de 15 secondes", allowGeneration: false }, renderScale: 0.2, fps: 8 }, { ...deps, stockClip: s.stockClip }));
    expect(r.videoAssetId).toBeTruthy();
    expect(log.clips.length).toBe(0); // rien de généré
    expect(r.costMicro).toBe(0);
    const doc = latestVideo(p.id, r.docKey!)!.doc;
    const stock = doc.clips.filter((c) => c.source.kind === "video" && assetMeta<any>(getAsset(c.source.assetId)!).stock);
    expect(stock.length).toBeGreaterThanOrEqual(1);
    // Jamais deux fois le même passage dans une vidéo (un plan repris l'est à un autre moment du plan).
    const segs = stock.map((c) => `${(c.source as { assetId: string }).assetId}@${(c.source as { inS: number }).inS}`);
    expect(new Set(segs).size).toBe(segs.length);
    // Boutique : l'univers en plans libres ; le VRAI produit sur ses plans (photos, packshot), jamais remplacé.
    expect(doc.clips.some((c) => c.source.kind === "image" || (c.source.kind === "doc" && c.source.doc.layers.some((l) => l.kind === "image")))).toBe(true);
    // Habillage publicitaire : la fin est une carte avec un vrai bouton, posée sur une image réelle.
    const cta = doc.clips.find((c) => c.part === "cta")!;
    expect(cta.source.kind).toBe("video");
    expect(cta.overlays.some((l) => l.kind === "button")).toBe(true);
    // Chaque demande excluait les plans déjà pris dans la vidéo.
    expect(s.asked.map((a) => a.excluded)).toEqual(s.asked.map((_, i) => i));
  }, 240_000);

  it("musique : une piste libre de droits trouvée remplace la musique composée, avec sa licence et sa mention", async () => {
    const { composeMusic } = await import("@/lib/media/music");
    const p = loadProject(seedImageFixture(u.id, "artisan"));grantProjectPlan(p.id,"dominer");
    const { deps } = mockVideoDeps({ userId: u.id, projectId: p.id });
    const s = stockDeps(p.id);
    const track = await saveAsset({ projectId: p.id, userId: u.id, data: composeMusic(30, "calm", 22050), name: "musique-libre.wav", mime: "audio/wav", role: "music", folderKey: "videos.ads", origin: "import", meta: {} });
    const asked: { mood: string; durationS: number }[] = [];
    const music = async (mood: "calm" | "pulse" | "warm", durationS: number) => (asked.push({ mood, durationS }), { assetId: track.id, licence: "CC BY 4.0", credit: "Musique : « Piste » par Auteur (CC BY 4.0) — https://exemple.test/piste" });
    const r = await fr(() => runVideoEngineV2(null, p.id, { ask: { text: "Publicité Instagram de 15 secondes", allowGeneration: false }, renderScale: 0.2, fps: 8 }, { ...deps, stockClip: s.stockClip, music }));
    expect(r.videoAssetId).toBeTruthy();
    expect(asked.length).toBe(1);
    const doc = latestVideo(p.id, r.docKey!)!.doc;
    expect(doc.audio.music).toMatchObject({ source: "library", assetId: track.id, licence: "CC BY 4.0" });
    expect(r.notes.join(" ")).toMatch(/musique libre de droits — Musique : « Piste »/);
  }, 240_000);

  it("services : la vidéo s'ouvre sur un vrai plan du métier", async () => {
    const p = loadProject(seedImageFixture(u.id, "restaurant"));grantProjectPlan(p.id,"dominer");
    const { deps } = mockVideoDeps({ userId: u.id, projectId: p.id });
    const s = stockDeps(p.id);
    const r = await fr(() => runVideoEngineV2(null, p.id, { ask: { text: "Reel de 15 secondes", allowGeneration: false }, renderScale: 0.2, fps: 8 }, { ...deps, stockClip: s.stockClip }));
    const doc = latestVideo(p.id, r.docKey!)!.doc;
    expect(doc.clips.some((c) => c.source.kind === "video")).toBe(true);
    expect(s.asked.length).toBeGreaterThan(0);
  }, 240_000);

  it("ordre d'essai : pertinence d'abord, puis un plan assez long et bien défini", () => {
    const v = (duration: number, width = 1920, height = 1080) => ({ duration, width, height });
    const out = clipOrder([v(3), v(12), v(9, 640, 360)], 6);
    expect(out[0].duration).toBe(12);
    expect(out[out.length - 1].duration).toBe(3);
  });
});
