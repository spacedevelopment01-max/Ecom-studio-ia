/**
 * Bibliothèque de modèles de publications : chaque modèle, dans chaque format (paysage, carré, portrait, story),
 * donne une publication lisible (contraste mesuré), dans les marges, sans chevauchement, avec titre, bouton et
 * marque — et SANS AUCUN TEXTE INVENTÉ (seuls le titre, la ligne, le surtitre, la marque et le bouton fournis).
 * Choix automatique sans répétition de famille ; galerie « Changer de modèle » du studio. Aucun appel à l'IA.
 */
import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";

let sessionUser: any = null;
vi.mock("@/lib/auth", async (orig) => {
  const real = await orig<typeof import("@/lib/auth")>();
  return { ...real, currentUser: async () => sessionUser, requireUser: async () => sessionUser ?? (() => { throw new real.HttpError(401, "Connexion requise."); })() };
});
vi.mock("@/lib/ai/llm", async (orig) => ({ ...(await orig<typeof import("@/lib/ai/llm")>()), llmConfigured: () => false }));

describe("Bibliothèque de modèles de publications", async () => {
  const { createUser } = await import("@/lib/auth");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { loadProject } = await import("@/lib/projects");
  const { saveAsset, getAsset, assetData } = await import("@/lib/library");
  const { composeAd, relayoutDoc } = await import("@/lib/ads-v2/compose");
  const { TEMPLATES, templateById } = await import("@/lib/ads-v2/library");
  const { composePoster, savePosterDoc, pickPosterLook } = await import("@/lib/ads-v2/poster");
  const { adArt } = await import("@/lib/ads-v2/art");
  const { latestDoc } = await import("@/lib/ad-doc/store");
  const { brandTypo, palette } = await import("@/lib/engine/images");
  const route = await import("@/app/api/projects/[id]/ads/docs/[docKey]/route");
  const { mockImage } = await import("./image-v2-mock");
  const { seedImageFixture } = await import("./image-v2-fixtures");
  const fr = <T,>(fn: () => Promise<T>) => runWithLang({ ui: "fr", content: "fr" }, fn);
  const u = await createUser(`biblio-${Date.now()}@test.fr`, "motdepasse-test", "B");
  const F = [
    { platform: "meta_feed", aspect: "1.91:1", width: 1200, height: 628, label: "1.91:1", safe: { top: 0.05, bottom: 0.05, side: 0.05 } },
    { platform: "meta_feed", aspect: "1:1", width: 1080, height: 1080, label: "1:1", safe: { top: 0.05, bottom: 0.06, side: 0.05 } },
    { platform: "meta_feed", aspect: "4:5", width: 1080, height: 1350, label: "4:5", safe: { top: 0.05, bottom: 0.06, side: 0.05 } },
    { platform: "meta_story", aspect: "9:16", width: 1080, height: 1920, label: "9:16", safe: { top: 0.14, bottom: 0.2, side: 0.06 } },
  ] as const;
  const T = { brand: "Sérum Éclat", headline: "Le rituel qui change tout.", subline: "Sérum visage • Texture légère", eyebrow: "Soin visage", cta: "Découvrir" };
  const norm = (s: string) => s.replace(/ /g, " ").replace(/\s+→$/, "").trim().toLowerCase();
  // Les modèles « produit » listent les segments de la ligne (atouts fournis) et les numérotent (01, 02…).
  const allowed = new Set([T.brand, T.headline, T.subline, T.eyebrow, T.cta, "Sérum visage", "Texture légère", "01", "02", "03", "04", "05", "06"].map(norm));

  it("des dizaines de modèles, identifiants uniques, familles variées", () => {
    expect(new Set(TEMPLATES.map((t) => t.id)).size).toBe(TEMPLATES.length);
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(12);
    expect(new Set(TEMPLATES.map((t) => t.family)).size).toBeGreaterThanOrEqual(5);
    for (const t of TEMPLATES) expect(t.schemes.length, t.id).toBeGreaterThan(0);
  });

  it("chaque modèle × chaque format : lisible, dans les marges, sans chevauchement, aucun texte inventé", async () => {
    const p = loadProject(seedImageFixture(u.id, "cosmetic"));
    const art = adArt(p, brandTypo(p));
    const photo = await mockImage(6, 1600, 1200);
    const logo = await sharp({ create: { width: 400, height: 120, channels: 4, background: { r: 30, g: 30, b: 30, alpha: 1 } } }).png().toBuffer();
    const fails: string[] = [];
    for (const t of TEMPLATES)
      for (const [k, f] of F.entries()) {
        const scheme = t.schemes[k % t.schemes.length];
        const r = await fr(() => composeAd({ format: f as never, layout: `tpl:${t.id}`, palette: palette(p), typo: brandTypo(p), art, ...T, background: t.photo === "none" ? null : photo, product: null, logo: k % 2 ? logo : null, variant: { scheme } }));
        const m = r.metrics;
        const tag = `${t.id} ${f.aspect} ${scheme}`;
        if (m.textContrast < 4.5 || m.safeOverflow || m.textOverlap || m.minFontPx < 22) fails.push(`${tag} ${JSON.stringify(m)}`);
        expect(r.doc.meta.recipe?.layout, tag).toBe(`tpl:${t.id}`);
        expect(r.doc.layers.filter((l) => l.id === "title").length, tag).toBe(1);
        expect(r.doc.layers.filter((l) => l.role === "cta").length, tag).toBeGreaterThanOrEqual(1);
        for (const l of r.doc.layers) if (l.kind === "text" || l.kind === "button") expect(allowed.has(norm(l.text)), `${tag} texte inventé : « ${l.text} »`).toBe(true);
      }
    expect(fails).toEqual([]);
  }, 600_000);

  it("choix automatique : 12 publications de suite, jamais deux fois la même famille d'affilée ni le même modèle", async () => {
    const p = loadProject(seedImageFixture(u.id, "artisan"));
    const art = adArt(p, brandTypo(p));
    const recent: { layout: string; treatment: string | null; logo: string | null; scheme: string | null }[] = [];
    const fam = (l: string) => (l.startsWith("tpl:") ? templateById(l.slice(4))!.family : `engine:${l}`);
    for (let n = 0; n < 12; n++) {
      const look = pickPosterLook(art, 1000 + n * 37, recent, true);
      if (recent[0]) {
        expect(fam(look.layout)).not.toBe(fam(recent[0].layout));
        expect(recent.slice(0, 8).map((r) => r.layout)).not.toContain(look.layout);
      }
      recent.unshift({ layout: look.layout, treatment: look.variant.treatment ?? null, logo: look.variant.logo ?? null, scheme: look.variant.scheme ?? null });
    }
    expect(recent.filter((r) => r.layout.startsWith("tpl:")).length).toBeGreaterThan(4);
  });

  it("studio : galerie de la publication du client dans chaque modèle, application, autre format refait", async () => {
    const p = loadProject(seedImageFixture(u.id, "artisan"));
    const bg = await saveAsset({ projectId: p.id, userId: u.id, data: await mockImage(9, 1600, 1200), name: "photo.jpg", mime: "image/jpeg", role: "lifestyle", folderKey: "images.scenes", origin: "upload", meta: {} });
    const r = await fr(() => composePoster(p, { aspect: "4:5", headline: "Des murs nets.", subline: "Peinture • Enduits", cta: "Demander un devis", background: bg, seed: "galerie", layout: "editorial" }));
    const img = await saveAsset({ projectId: p.id, userId: u.id, data: r.jpg, name: "pub.jpg", mime: "image/jpeg", role: "social", folderKey: "images.social", origin: "generated", meta: {} });
    savePosterDoc(p.id, r.docKey, r.doc, img.id);
    sessionUser = { ...u, role: "client" };
    const call = (body: object) => fr(() => route.POST(new Request(`http://localhost:3000/api/projects/${p.id}/ads/docs/${r.docKey}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }), { params: Promise.resolve({ id: p.id, docKey: r.docKey }) } as any));
    const fam = TEMPLATES[0].family;
    const g = await (await call({ action: "gallery", family: fam })).json();
    expect(g.items.length).toBeGreaterThan(0);
    expect(g.items.every((x: any) => typeof x.preview === "string" && x.preview.startsWith("data:image/jpeg"))).toBe(true);
    const studio = await (await call({ action: "gallery", family: "studio" })).json();
    expect(studio.items.find((x: any) => x.layout === "editorial")?.current).toBe(true);
    // Application d'un modèle puis d'un autre schéma de couleurs : nouvelles versions, textes du client gardés.
    const tpl = TEMPLATES.find((t) => t.photo !== "none" && t.schemes.length > 1)!;
    expect((await call({ action: "restyle", layout: `tpl:${tpl.id}` })).status).toBe(200);
    expect((await call({ action: "restyle", layout: `tpl:${tpl.id}`, scheme: tpl.schemes[1] })).status).toBe(200);
    const cur = latestDoc(p.id, r.docKey)!;
    expect(cur.doc.meta.recipe?.layout).toBe(`tpl:${tpl.id}`);
    expect(cur.doc.meta.recipe?.variant?.scheme).toBe(tpl.schemes[1]);
    expect(cur.doc.layers.find((l) => l.id === "title")).toMatchObject({ text: "Des murs nets." });
    expect(cur.version.version).toBe(3);
    expect((await call({ action: "restyle", layout: "tpl:inexistant" })).status).toBe(400);
    // Autre format : le modèle est refait pour la story.
    const story = await relayoutDoc(cur.doc, F[3] as never, (id) => assetData(getAsset(id)!));
    expect(story?.meta.recipe?.layout).toBe(`tpl:${tpl.id}`);
    expect(story?.height).toBe(1920);
  }, 300_000);
});
