/**
 * Passe « excellence » des visuels : ligne photographique de la marque (moodboard dérivé de la piste créative),
 * grille du directeur artistique sur les briefs photo (réponses IA simulées excellentes, moyennes, mauvaises),
 * boucle de qualité (une reprise ciblée au plus, meilleure version gardée, repli du studio), rendus locaux
 * cohérents (lumière, étalonnage sans toucher au produit), mise en page d'affiche (pas de veuve).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCanvas, loadImage } from "@napi-rs/canvas";

const llm = vi.hoisted(() => ({ replies: [] as unknown[], calls: [] as { task: string; usageKey?: string; prompt: string }[] }));
vi.mock("@/lib/ai/llm", async (orig) => ({
  ...(await orig<typeof import("@/lib/ai/llm")>()),
  llmJson: async (call: { task: string; usageKey?: string; prompt: string }, schema: { parse: (v: unknown) => unknown }) => {
    llm.calls.push(call);
    const r = llm.replies[Math.min(llm.calls.length - 1, llm.replies.length - 1)];
    if (r instanceof Error) throw r;
    return schema.parse(r);
  },
}));
vi.mock("@/lib/ai/context", async (orig) => ({ ...(await orig<typeof import("@/lib/ai/context")>()), projectContext: () => "<contexte_projet></contexte_projet>", brainContext: () => "<contexte_projet></contexte_projet>", brainView: () => ({ stable: "<contexte_projet></contexte_projet>", kept: [], label: "test", hash: "h", brainVersion: "test" }) }));

const PINK = { primary: "#D98A97", secondary: "#F6D9DC", accent: "#E25C77", light: "#FFF6F4", dark: "#3A2226" };
const NAVY = { primary: "#1F3A5F", secondary: "#C9D6E3", accent: "#F2A33A", light: "#EEF3F7", dark: "#0E1621" };
const GREEN = { primary: "#2F5D3A", secondary: "#F7E7A1", accent: "#F2C230", light: "#FFF8E6", dark: "#1B2B1E" };

const terroirLine = async () => {
  const { photoLine } = await import("@/lib/engine/photo-line");
  return photoLine({ direction: "terroir", sector: "alimentation", audience: "Citadins qui organisent des pique-niques entre amis", palette: GREEN, route: { name: "Plein soleil", colors: { ink: "#1B2B1E", accent: "#F2C230", ground: "#2F5D3A", tint: "#F7E7A1" } } });
};

/** Réponses simulées de l'IA (champs du brief). */
const EXCELLENT = {
  intent: "Donner envie d'une pause fraîche entre amis",
  set: "farmhouse table in a stone kitchen by an open window, late afternoon",
  surface: "oiled oak wood board",
  props: ["folded unbleached linen napkin", "terracotta bowl"],
  light: "low sun through a side window on the left, soft and warm, about 4000K, late afternoon",
  lightFrom: "left",
  camera: "50mm lens at product height, slightly above, f/2.8 shallow depth of field",
  composition: "product on the left third, generous negative space on the right",
  palette: "pale yellow, deep green and off-white tones",
  season: "early summer",
  prompt:
    "Oiled oak farmhouse table in a stone kitchen by an open window, late afternoon. Low warm sun from the left, soft and diffused, long gentle shadows across the wood. 50mm lens at product height, slightly above, f/2.8 so the limewashed wall melts behind. A folded unbleached linen napkin and a terracotta bowl sit out of focus on the right third. Pale yellow, deep green and off-white palette, early summer, gentle film grain.",
};
const AVERAGE = { ...EXCELLENT, surface: "nice table", camera: "beautiful shot", palette: "warm tones", props: ["eucalyptus sprig", "candle"] };
const BAD = { intent: "", set: "nice background", surface: "", props: ["rose petals", "macarons", "gold marble tray", "latte art coffee cup"], light: "beautiful light", lightFrom: "right", camera: "", composition: "", palette: "", season: "", prompt: "Product on a nice table with rose petals, aesthetic, high quality, avec lumière douce." };

beforeEach(() => {
  llm.replies = [];
  llm.calls = [];
});

describe("ligne photographique de la marque", () => {
  it("dérivée de la piste créative : trois marques, trois campagnes différentes et complètes", async () => {
    const { photoLine, photoLineText } = await import("@/lib/engine/photo-line");
    const sova = photoLine({ direction: "pop", sector: "beaute", audience: "Jeunes femmes de 18 à 30 ans, étudiantes", palette: PINK, productColors: [{ hex: "#F2C6CB", share: 0.7 }] });
    const drone = photoLine({ direction: "nocturne", sector: "hightech", audience: "Randonneurs et voyageurs", palette: NAVY });
    const zeste = photoLine({ direction: "gourmand", sector: "alimentation", audience: "Citadins, apéritif et pique-niques", palette: GREEN });
    // Mises en scène, lumière, mode de mise en page : propres à chaque piste.
    expect(new Set([sova, drone, zeste].map((l) => l.local.scenes.join()))).toHaveProperty("size", 3);
    expect(sova.creative.mode).toBe("tonal");
    expect(drone.creative.mode).toBe("deep");
    expect(drone.light.quality).toBe("lowkey");
    expect(zeste.season.en).toMatch(/summer/);
    // Accessoires cohérents avec la cible (repérée dans sa description), 3 au plus.
    expect(sova.props[0].en).toMatch(/tote/);
    expect(drone.props[0].en).toMatch(/backpack/);
    for (const l of [sova, drone, zeste]) {
      expect(l.props.length).toBeLessThanOrEqual(3);
      expect(l.avoid.map((a) => a.en)).toContain("scattered rose petals");
      expect(l.framing.focal).toMatch(/mm/);
      // Texte des visuels lisible sur le fond de la ligne (WCAG AA).
      const { contrast } = await import("@/lib/color");
      expect(contrast(l.creative.ink, l.creative.ground)).toBeGreaterThanOrEqual(4.5);
      const text = photoLineText(l, "fr").join("\n");
      expect(text).toMatch(/Lumière/);
      expect(text).toMatch(/À éviter/);
    }
    // Clichés du secteur ajoutés (high-tech : lueur néon bleue).
    expect(drone.avoid.map((a) => a.en)).toContain("blue neon glow");
    // Ton sur ton : le fond reprend la couleur dominante du produit (rose), pas le brun par défaut.
    const { hsl } = await import("@/lib/color");
    expect(Math.abs(hsl(sova.creative.ground)[0] - hsl("#F2C6CB")[0])).toBeLessThan(15);
    // Déterministe : même entrée, même ligne.
    expect(photoLine({ direction: "pop", sector: "beaute", palette: PINK })).toEqual(photoLine({ direction: "pop", sector: "beaute", palette: PINK }));
  });

  it("projet complet : la ligne vient de la marque (direction, piste retenue, cible) et sert aussi aux ambiances de services", async () => {
    const { photoLine, photoLineInput } = await import("@/lib/engine/photo-line");
    const input = photoLineInput({ product: { sector: "hightech", visual: { colors: [] } }, brand: { direction: "nocturne", audience: "Randonneurs", palette: NAVY, logo: { concept: "Horizon", route: { name: "Ligne d'horizon", colors: { ink: "#0E1621", accent: "#F2A33A", ground: "#1F3A5F", tint: "#C9D6E3" } } } } });
    const l = photoLine(input);
    expect(l.concept).toBe("Ligne d'horizon · Horizon");
    const { ambiancePrompts } = await import("@/lib/engine/service-media");
    const amb = ambiancePrompts({ business: "services", product: { name: "Atelier", category: "Menuiserie", summary: "Menuiserie sur mesure", sector: "batiment", facts: [] }, brand: { direction: "terroir", palette: GREEN, audience: "" }, services: { services: [], area: "", address: "" } } as any);
    expect(amb).toHaveLength(2);
    for (const a of amb) {
      expect(a).toMatch(/Campaign photographic line/);
      expect(a).toMatch(/Avoid stock-photo clichés/);
    }
  });
});

describe("grille du directeur artistique (briefs photo)", () => {
  it("excellent ≥ 8/10, moyen sous le seuil avec des consignes précises, mauvais très bas", async () => {
    const { critiqueImageBrief, BRIEF_MIN_SCORE } = await import("@/lib/engine/photo-line");
    const l = await terroirLine();
    const ex = critiqueImageBrief(EXCELLENT as any, l);
    expect(ex.score).toBeGreaterThanOrEqual(BRIEF_MIN_SCORE);
    const av = critiqueImageBrief(AVERAGE as any, l);
    expect(av.score).toBeLessThan(BRIEF_MIN_SCORE);
    expect(av.score).toBeGreaterThanOrEqual(5);
    expect(av.failed).toEqual(expect.arrayContaining(["surface", "camera", "noCliche"]));
    expect(av.feedback.join(" ")).toMatch(/focale/);
    const bad = critiqueImageBrief(BAD as any, l);
    expect(bad.score).toBeLessThanOrEqual(3);
    expect(bad.failed).toEqual(expect.arrayContaining(["props", "light", "camera", "prompt", "noCliche"]));
  });

  it("côté de la lumière incohérent avec « lightFrom » : refusé (l'ombre du produit partirait du mauvais côté)", async () => {
    const { critiqueImageBrief } = await import("@/lib/engine/photo-line");
    const r = critiqueImageBrief({ ...EXCELLENT, lightFrom: "right" } as any, await terroirLine());
    expect(r.failed).toContain("lightSide");
  });

  it("en situation : un studio n'est pas un vrai lieu de vie", async () => {
    const { critiqueImageBrief } = await import("@/lib/engine/photo-line");
    const r = critiqueImageBrief({ ...EXCELLENT, set: "seamless paper studio backdrop with a podium" } as any, await terroirLine(), { lifestyle: true });
    expect(r.failed).toContain("set");
  });

  it("le brief du studio (sans IA) est déjà au niveau (≥ 8/10), sur les 11 directions", async () => {
    const { critiqueImageBrief, lineBriefDraft, photoLine } = await import("@/lib/engine/photo-line");
    for (const direction of ["atelier", "clinique", "brut", "terroir", "nocturne", "pop", "galerie", "elan", "flux", "joaillerie", "gourmand"]) {
      for (const sector of ["beaute", "hightech", "alimentation", "maison", "sport"]) {
        const l = photoLine({ direction, sector, palette: PINK });
        const r = critiqueImageBrief(lineBriefDraft(l), l);
        expect(r.score, `${direction}/${sector} : ${r.feedback.join(" | ")}`).toBeGreaterThanOrEqual(8);
        const life = critiqueImageBrief(lineBriefDraft(l, { lifestyle: l.situations[0].en }), l, { lifestyle: true });
        expect(life.score, `${direction}/${sector} situation : ${life.feedback.join(" | ")}`).toBeGreaterThanOrEqual(8);
        // Photo en situation : jamais de papier de fond ni d'optique de studio imposés par la ligne.
        const { finalImagePrompt, scenePromptFromLine } = await import("@/lib/engine/photo-line");
        expect(finalImagePrompt(scenePromptFromLine(l, { lifestyle: l.situations[0].en }), l, { lifestyle: true })).not.toMatch(/seamless|backdrop|plinth/i);
      }
    }
  });
});

describe("boucle de qualité du brief (IA simulée)", () => {
  const project = { id: "p", userId: "u", product: { name: "Thé glacé", sector: "alimentation" }, brand: null } as any;
  const run = async () => {
    const { aiImageBrief } = await import("@/lib/ai/tasks");
    return aiImageBrief({ userId: "u", projectId: "p", usageKey: "k:brief" }, project, "mise en scène produit", { line: await terroirLine(), format: "4:5" });
  };

  it("excellent du premier coup : une seule passe, consigne finale avec la ligne et les garde-fous", async () => {
    llm.replies = [EXCELLENT];
    const r = await run();
    expect(llm.calls).toHaveLength(1);
    expect(llm.calls[0].task).toBe("art_direction");
    expect(llm.calls[0].prompt).toMatch(/LIGNE PHOTOGRAPHIQUE/);
    expect(r.source).toBe("ai");
    expect(r.review.score).toBeGreaterThanOrEqual(8);
    expect(r.prompt).toMatch(/Oiled oak farmhouse table/);
    expect(r.prompt).toMatch(/Campaign photographic line/);
    expect(r.prompt).toMatch(/No text, no lettering, no logo/);
    expect(r.lightFrom).toBe("left");
  });

  it("moyen puis excellent : une reprise ciblée (consignes de la grille), la meilleure version gardée", async () => {
    llm.replies = [AVERAGE, EXCELLENT];
    const r = await run();
    expect(llm.calls).toHaveLength(2);
    expect(llm.calls[1].usageKey).toBe("k:brief:retake");
    expect(llm.calls[1].prompt).toMatch(/REPRISE/);
    expect(llm.calls[1].prompt).toMatch(/focale/);
    expect(r.attempts).toBe(2);
    expect(r.review.score).toBeGreaterThanOrEqual(8);
  });

  it("moyen puis pire : jamais plus de deux appels, la meilleure des deux est gardée", async () => {
    llm.replies = [AVERAGE, BAD];
    const r = await run();
    expect(llm.calls).toHaveLength(2);
    expect(r.source).toBe("ai");
    expect(r.draft?.surface).toBe("nice table");
  });

  it("mauvais deux fois (ou IA en panne) : consigne du studio tirée de la ligne, jamais le mauvais brief", async () => {
    llm.replies = [BAD, BAD];
    const r = await run();
    expect(r.source).toBe("studio");
    expect(r.prompt).not.toMatch(/rose petals, aesthetic/);
    expect(r.prompt).toMatch(/oiled oak/i);
    llm.calls = [];
    llm.replies = [new Error("panne")];
    const down = await run();
    expect(down.source).toBe("studio");
    expect(down.attempts).toBe(0);
  });
});

describe("rendus locaux et mises en page", () => {
  async function block(w: number, h: number, color: string) {
    const c = createCanvas(w, h);
    const ctx = c.getContext("2d");
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);
    return loadImage(await c.encode("png"));
  }
  const mean = async (png: Buffer, x: number, y: number, s: number) => {
    const im = await loadImage(png);
    const c = createCanvas(im.width, im.height);
    const ctx = c.getContext("2d");
    ctx.drawImage(im, 0, 0);
    const d = ctx.getImageData(x, y, s, s).data;
    let t = 0;
    for (let i = 0; i < d.length; i += 4) t += d[i] + d[i + 1] + d[i + 2];
    return t / (d.length / 4) / 3;
  };

  it("lumière de la ligne à droite : le décor est éclairé à droite ; l'étalonnage ne touche jamais au produit", async () => {
    const { renderScene, FORMATS } = await import("@/lib/media/compose");
    const product = await block(400, 600, "#3366CC");
    const f = FORMATS.square;
    const right = await renderScene({ product, palette: PINK, style: "studio", format: f, seed: 3, look: { lightFrom: "right", tint: "#FFB36B", tintAlpha: 0.06 } });
    expect(await mean(right.png, f.w - 160, 40, 80)).toBeGreaterThan(await mean(right.png, 80, 40, 80));
    const left = await renderScene({ product, palette: PINK, style: "studio", format: f, seed: 3, look: { lightFrom: "left" } });
    expect(await mean(left.png, 80, 40, 80)).toBeGreaterThan(await mean(left.png, f.w - 160, 40, 80));
    // Centre du produit : couleur d'origine (à l'arrondi et au grain près).
    const b = right.productBox;
    const im = await loadImage(right.png);
    const c = createCanvas(im.width, im.height);
    const ctx = c.getContext("2d");
    ctx.drawImage(im, 0, 0);
    const px = ctx.getImageData(Math.round(b.x + b.w / 2), Math.round(b.y + b.h / 2), 1, 1).data;
    expect(Math.abs(px[0] - 0x33)).toBeLessThanOrEqual(12);
    expect(Math.abs(px[1] - 0x66)).toBeLessThanOrEqual(12);
    expect(Math.abs(px[2] - 0xcc)).toBeLessThanOrEqual(12);
  });

  it("projecteur sombre avec reflet : le fond n'est jamais effacé sous le produit (pas de rectangle noir)", async () => {
    const { renderScene, FORMATS } = await import("@/lib/media/compose");
    const product = await block(900, 400, "#888888");
    const f = FORMATS.product;
    const s = await renderScene({ product, palette: NAVY, style: "spotlight", format: f, seed: 3 });
    const b = s.productBox;
    const under = await mean(s.png, Math.round(b.x + b.w * 0.1), Math.round(b.y + b.h + 30), 20);
    const beside = await mean(s.png, Math.max(0, Math.round(b.x - 60)), Math.round(b.y + b.h + 30), 20);
    expect(under).toBeGreaterThanOrEqual(beside - 6);
  });

  it("titres d'affiche sans mot seul en dernière ligne", async () => {
    const { noWidow } = await import("@/lib/media/creative-html");
    expect(noWidow("Un sourire dans le sac")).toBe("Un sourire dans le sac");
    expect(noWidow("Bonjour")).toBe("Bonjour");
    expect(noWidow("Deux mots")).toBe("Deux mots");
  });

  it("garde-fous de fidélité intacts : produit réel conservé, contrôle obligatoire", async () => {
    const fs = await import("node:fs");
    const providers = fs.readFileSync("src/lib/ai/media-providers.ts", "utf8");
    expect(providers).toMatch(/Keep the existing product exactly as it is/);
    const images = fs.readFileSync("src/lib/engine/images.ts", "utf8");
    expect(images).toMatch(/verifyAiImage/);
    expect(images).toMatch(/On replace exactement les pixels du produit/);
    const prompts = fs.readFileSync("src/lib/ai/prompts.ts", "utf8");
    expect(prompts).toMatch(/tu ne décris JAMAIS le produit lui-même/);
  });
});
