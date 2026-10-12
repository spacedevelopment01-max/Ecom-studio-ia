/**
 * Publications animées : une publication du studio devient une courte vidéo (titre qui arrive, bouton qui surgit
 * puis bat, photo qui avance), gratuite et sans IA, rangée dans la bibliothèque et liée à l'image d'origine. La fin
 * de la vidéo reprend exactement la publication (boucle propre sur les réseaux).
 */
import { describe, expect, it, vi } from "vitest";

let sessionUser: any = null;
vi.mock("@/lib/auth", async (orig) => {
  const real = await orig<typeof import("@/lib/auth")>();
  return { ...real, currentUser: async () => sessionUser, requireUser: async () => sessionUser ?? (() => { throw new real.HttpError(401, "Connexion requise."); })() };
});
vi.mock("@/lib/ai/llm", async (orig) => ({ ...(await orig<typeof import("@/lib/ai/llm")>()), llmConfigured: () => false }));

describe("Publications animées", async () => {
  const { createUser } = await import("@/lib/auth");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { loadProject } = await import("@/lib/projects");
  const { saveAsset, getAsset, assetMeta } = await import("@/lib/library");
  const { composePoster, savePosterDoc } = await import("@/lib/ads-v2/poster");
  const { animatedLayers, backdropZoom, ANIM_DURATION_S } = await import("@/lib/ad-doc/animate");
  const route = await import("@/app/api/projects/[id]/ads/docs/[docKey]/route");
  const { mockImage } = await import("./image-v2-mock");
  const { seedImageFixture } = await import("./image-v2-fixtures");
  const fr = <T,>(fn: () => Promise<T>) => runWithLang({ ui: "fr", content: "fr" }, fn);
  const u = await createUser(`anim-${Date.now()}@test.fr`, "motdepasse-test", "A");

  const poster = async () => {
    const p = loadProject(seedImageFixture(u.id, "artisan"));
    const bg = await saveAsset({ projectId: p.id, userId: u.id, data: await mockImage(4, 1600, 1200), name: "photo.jpg", mime: "image/jpeg", role: "lifestyle", folderKey: "images.scenes", origin: "upload", meta: {} });
    const r = await fr(() => composePoster(p, { aspect: "4:5", headline: "Des murs nets.", subline: "Peinture • Enduits", cta: "Demander un devis", background: bg, seed: "anim" }));
    const img = await saveAsset({ projectId: p.id, userId: u.id, data: r.jpg, name: "pub.jpg", mime: "image/jpeg", role: "social", folderKey: "images.social", origin: "generated", meta: {} });
    savePosterDoc(p.id, r.docKey, r.doc, img.id);
    return { p, r, img };
  };

  it("chronologie : rien au départ, le titre arrive, le bouton surgit puis bat ; la fin reprend la publication", async () => {
    const { r } = await poster();
    const at = (t: number) => Object.fromEntries(animatedLayers(r.doc, "pop", t).map((l) => [l.id, l]));
    const title = r.doc.layers.find((l) => l.id === "title")!;
    const cta = r.doc.layers.find((l) => l.id === "cta")!;
    expect(at(0).title.opacity).toBe(0);
    expect(at(0).cta.opacity).toBe(0);
    const end = at(ANIM_DURATION_S - 0.05);
    expect(end.title).toMatchObject({ x: title.x, y: title.y, opacity: title.opacity });
    // Le bouton bat (sa taille varie) après son arrivée, et revient à sa taille.
    const widths = Array.from({ length: 40 }, (_, k) => at(2.5 + k * 0.05).cta.w);
    expect(Math.max(...widths)).toBeGreaterThan(cta.w * 1.04);
    expect(Math.min(...widths)).toBeCloseTo(cta.w, 0);
    // La photo avance lentement, sans à-coup.
    expect(backdropZoom("pop", 0)).toBe(1);
    expect(backdropZoom("pop", 6)).toBeGreaterThan(1.05);
    expect(backdropZoom("zoom", 0)).toBeGreaterThan(backdropZoom("zoom", 3));
  }, 60_000);

  it("dans le studio : « Créer la version animée » enregistre une vidéo MP4 de 7 s liée à l'image — 0 €", async () => {
    const { p, r, img } = await poster();
    sessionUser = { ...u, role: "client" };
    const res = await fr(() => route.POST(new Request(`http://localhost:3000/api/projects/${p.id}/ads/docs/${r.docKey}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "animate", style: "pop" }) }), { params: Promise.resolve({ id: p.id, docKey: r.docKey }) } as any));
    expect(res.status).toBe(200);
    const body = await res.json();
    const a = getAsset(body.animated.assetId)!;
    expect(a.mime).toBe("video/mp4");
    expect(a.kind).toBe("video");
    expect(a.source_asset_id).toBe(img.id);
    expect(Math.round(a.duration ?? 0)).toBe(ANIM_DURATION_S);
    expect(assetMeta<any>(a).animatedPost).toMatchObject({ docKey: r.docKey, style: "pop" });
    // Style inconnu refusé.
    const bad = await fr(() => route.POST(new Request(`http://localhost:3000/api/projects/${p.id}/ads/docs/${r.docKey}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "animate", style: "explosion" }) }), { params: Promise.resolve({ id: p.id, docKey: r.docKey }) } as any));
    expect(bad.status).toBe(400);
  }, 120_000);
});
