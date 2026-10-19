/**
 * Vidéo « publicité » : vraie image derrière chaque plan, titres propres (jamais coupés sur « à » ni sur « ? »),
 * coordonnées réelles seulement, musique composée agréable (sans souffle de bruit aux coupes), plans Pixabay
 * horizontaux pris en haute définition pour un format vertical. Aucun réseau, aucune IA.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ai/config", async (orig) => {
  const real = await orig<typeof import("@/lib/ai/config")>();
  return { ...real, activeProviderKey: (p: string) => (p === "pixabay" ? "cle-de-test" : null) };
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("habillage publicitaire des vidéos", async () => {
  const { splitLines, headline, contactLines, dressPromo, usable } = await import("@/lib/video-v2/promo");
  const { composeMusic } = await import("@/lib/media/music");
  const { searchStockVideos } = await import("@/lib/stock/photos");

  it("titres : jamais un « ? » ou un « : » seul en début de ligne, jamais un mot seul comme « et »", () => {
    expect(splitLines("Un projet ?", 3)).toEqual(["Un projet ?"]);
    expect(splitLines("Contenance : 30 ml", 3).some((l) => /^[:?]/.test(l.trim()))).toBe(false);
    expect(splitLines("Enduits et lissage", 3).every((l) => l.toLowerCase() !== "et")).toBe(true);
    expect(headline("Plâtrerie et plaques de plâtre à Mâcon et 30 km autour", 6)).not.toMatch(/ (à|et|de)$/);
    expect(headline("Sérum à la vitamine C pour un teint lumineux.")).toBe("Sérum à la vitamine C pour un teint lumineux");
    expect(usable("[À définir avec vous : pour quels clients]")).toBe(false);
  });

  it("coordonnées : seulement celles saisies, rien d'inventé", () => {
    const p = { services: { phone: "06 11 22 33 44", address: "", area: "Mâcon et 30 km autour", email: "", bookingUrl: "" } } as any;
    expect(contactLines(p)).toEqual(["06 11 22 33 44", "Mâcon et 30 km autour"]);
  });

  it("chaque plan garde une vraie image derrière son texte, la fin porte la carte de contact", () => {
    const pal = { primary: "#446274", secondary: "#D0D8DD", accent: "#747FB4", light: "#F2F5F7", dark: "#141B1F" };
    const p = { business: "services", product: { name: "Sébastien Blanc", category: "Plâtrier peintre", summary: "", facts: [], price: { amount: null, currency: "EUR", status: "unknown" } }, brand: { tagline: "Plâtrier peintre, Mâcon et 30 km autour.", positioning: "[À définir avec vous]", personality: [] }, services: { services: [{ name: "Plâtrerie" }, { name: "Enduits et lissage" }, { name: "Peinture intérieure" }], area: "Mâcon et 30 km autour", address: "", phone: "06 11 22 33 44", email: "", bookingUrl: "" } } as any;
    const doc = (id: string) => ({ kind: "doc" as const, doc: { layers: [] } as any, animate: "fade" as const });
    const clip = (k: number, part: string, source: any) => ({ id: `c${k}`, shotId: `s${k}`, label: "", part, durationS: 2, source, overlays: [], transitionIn: { kind: "cut", durationS: 0 } }) as any;
    const clips = [clip(0, "hook", { kind: "video", assetId: "v1", inS: 0, outS: 2, muted: true }), clip(1, "development", doc("a")), clip(2, "proof", doc("b")), clip(3, "cta", doc("c"))];
    const shots = clips.map((c) => ({ id: c.shotId, part: c.part, onScreen: "", voice: "", method: "kinetic_type" })) as any;
    const out = dressPromo(clips, shots, { p, pal, typo: { heading: "Archivo", body: "Jost" }, w: 1080, h: 1920, safe: { top: 120, bottom: 300, side: 60 }, brand: "Sébastien Blanc", logoId: null, thumbs: [], cta: "Demander un devis", message: "" });
    expect(out.every((c) => c.source.kind === "video")).toBe(true);
    expect(out.every(c=>c.source.kind!=="video"||(c.source.inS>=0&&c.source.outS<=2))).toBe(true);
    const texts = (c: any) => c.overlays.filter((l: any) => l.kind === "text").map((l: any) => l.text).join(" | ");
    expect(texts(out[0])).toContain("Plâtrier peintre");
    expect(texts(out[1])).toContain("Nos prestations");
    expect(texts(out[3])).toContain("06 11 22 33 44");
    expect(out.map(texts).join(" ")).not.toContain("[");
  });

  it("musique composée : durée exacte, reproductible, sans saturation", () => {
    const a = composeMusic(4, "pulse", 22050);
    const b = composeMusic(4, "pulse", 22050);
    expect(a.equals(b)).toBe(true);
    expect(a.readUInt32LE(40)).toBe(4 * 22050 * 4);
    let peak = 0;
    for (let i = 44; i < a.length; i += 2) peak = Math.max(peak, Math.abs(a.readInt16LE(i)));
    expect(peak / 32767).toBeLessThanOrEqual(0.86);
    expect(peak / 32767).toBeGreaterThan(0.5);
    expect(composeMusic(3, "calm", 22050).length).toBe(44 + 3 * 22050 * 4);
  });

  it("vidéo horizontale pour un format vertical : la version haute définition est prise (recadrage net)", async () => {
    vi.stubEnv("STOCK_OFFLINE", "0");
    const hit = { id: 85347, duration: 9, pageURL: "https://pixabay.com/videos/id-85347/", user: "A", tags: "painter, paint, roller, wall", videos: { large: { url: "https://cdn/large.mp4", width: 1920, height: 1080 }, medium: { url: "https://cdn/medium.mp4", width: 1280, height: 720 }, small: { url: "https://cdn/small.mp4", width: 960, height: 540 } } };
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ hits: [hit, hit] }), { status: 200, headers: { "content-type": "application/json" } })));
    const r = await searchStockVideos(["paint roller"], "portrait", "en", new Set());
    expect(r).toHaveLength(1);
    expect(r[0].url).toBe("https://cdn/large.mp4");
  });

  it("plans faits par l'IA sur Pixabay : toujours proposés et signalés ; dessins animés toujours écartés", async () => {
    vi.stubEnv("PIXABAY_API_KEY", "test-key");
    vi.stubEnv("STOCK_OFFLINE", "0");
    const files = { large: { url: "https://cdn/l.mp4", width: 1080, height: 1920 } };
    const ai = { id: 360167, duration: 8, pageURL: "https://pixabay.com/videos/id-360167/", user: "M", tags: "wedding chair, floral arrangement, cinematic, render, ai generated", videos: files };
    const toon = { id: 2, duration: 8, pageURL: "https://pixabay.com/videos/id-2/", user: "T", tags: "flowers, cartoon, ai generated", videos: files };
    const cgi = { id: 3, duration: 8, pageURL: "https://pixabay.com/videos/id-3/", user: "C", tags: "flowers, 3d, render", videos: files };
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ hits: [ai, toon, cgi] }), { status: 200, headers: { "content-type": "application/json" } })));
    const r = await searchStockVideos(["wedding flowers"], "portrait", "en", new Set());
    expect(r.map((v) => v.id)).toEqual(["360167"]);
    expect(r[0].aiGenerated).toBe(true);
  });
});

describe("habillage : jamais la même image en boucle", async () => {
  const { dressPromo } = await import("@/lib/video-v2/promo");
  it("une photo du produit apparaît au plus deux fois, jamais deux plans de suite", () => {
    const pal = { primary: "#1B2A4A", secondary: "#E8E2D6", accent: "#2E6FA0", light: "#F6F3EE", dark: "#14213D" };
    const p = { business: "products", product: { name: "Onde Pro", category: "Casque audio", summary: "", facts: [], price: { amount: null, currency: "EUR", status: "unknown" } }, brand: { tagline: "", positioning: "", personality: [] }, services: { services: [] } } as any;
    const img = { kind: "image", assetId: "photo", motion: "push_in", crop: null };
    const vid = (id: string) => ({ kind: "video", assetId: id, inS: 0, outS: 2, muted: true });
    const clip = (k: number, part: string, source: any) => ({ id: `c${k}`, shotId: `s${k}`, label: "", part, durationS: 2, source, overlays: [], transitionIn: { kind: "cut", durationS: 0 } }) as any;
    const clips = [clip(0, "hook", vid("a")), clip(1, "demonstration", img), clip(2, "demonstration", vid("b")), clip(3, "demonstration", img), clip(4, "demonstration", img), clip(5, "proof", img), clip(6, "cta", vid("c"))];
    const shots = clips.map((c) => ({ id: c.shotId, part: c.part, onScreen: "", voice: "", method: "animated_image" })) as any;
    const out = dressPromo(clips, shots, { p, pal, typo: { heading: "Archivo", body: "Jost" }, w: 1080, h: 1920, safe: { top: 120, bottom: 300, side: 60 }, brand: "Onde Pro", logoId: null, thumbs: [], productPhotos: ["photo"], cta: "Découvrir", message: "" });
    const ids = out.map((c) => (c.source as { assetId?: string }).assetId);
    expect(ids.filter((x) => x === "photo").length).toBeLessThanOrEqual(2);
    for (let k = 1; k < ids.length; k++) if (out[k].source.kind === "image") expect(ids[k - 1]).not.toBe(ids[k]);
  });
});

describe("textes de la vidéo : un texte réel sur chaque plan", async () => {
  const { projectTexts } = await import("@/lib/video-v2/promo");
  it("artisan : prestations, zone, horaires, devis, téléphone, adresse — tirés du projet, sans doublon ni bouton", () => {
    const p = { business: "services", product: { name: "Sébastien Blanc", category: "Plâtrier peintre", summary: "Plâtrerie, plaques de plâtre, enduits, lissage, peinture intérieure.", facts: [], price: { amount: null, currency: "EUR", status: "unknown" }, variants: [] }, brand: { tagline: "Plâtrier peintre, Mâcon et 30 km autour.", positioning: "[À définir avec vous]" }, services: { services: [{ name: "Peinture intérieure", price: "sur devis" }], area: "Mâcon et 30 km autour", address: "12 rue des Artisans, Mâcon", phone: "06 11 22 33 44", email: "", hours: "lundi–vendredi 8 h–18 h", bookingUrl: "", contactMode: "quote" } } as any;
    const t = projectTexts(p, { services: true, items: ["Peinture intérieure"], longForm: true, tagline: "Plâtrier peintre, Mâcon et 30 km autour", area: "Mâcon et 30 km autour", city: "Mâcon", price: null, cta: "Prendre rendez-vous", brand: "Sébastien Blanc", shots: [{ onScreen: "Prendre rendez-vous" }, { onScreen: "Sébastien Blanc" }] as any });
    expect(t).toContain("Votre plâtrier peintre à Mâcon");
    expect(t).toContain("Devis sur demande");
    expect(t).toContain("Appelez le 06 11 22 33 44");
    expect(t).toContain("Ouvert lundi–vendredi 8 h–18 h");
    expect(t.length).toBeGreaterThanOrEqual(8);
    expect(t).not.toContain("Prendre rendez-vous");
    expect(t).not.toContain("Sébastien Blanc");
    expect(t.join(" ")).not.toContain("[");
    expect(new Set(t.map((x) => x.toLowerCase())).size).toBe(t.length);
  });
});
