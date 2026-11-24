/**
 * La méthode des graphistes : la règle des modèles (une liste ; le verrou « réservé aux logos » seulement sur 2.5
 * Sunburst, pour ne pas casser les publications ni l'atelier en 2.6 Flare), le vrai chemin des appels d'images jusqu'à
 * OpenAI simulé (réservation, reçu gardé avec l'image, aucun secours, une panne jamais relancée), le devis et les deux
 * plafonds. Aucun appel payant, aucune clé réelle.
 */
import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.STUDIO_SYNA_AGENT = "1";
let keys: Record<string, string | null> = {};
vi.mock("@/lib/ai/config", async (orig) => ({ ...(await orig<object>()), activeProviderKey: (p: string) => keys[p] ?? null }));

const oa = { calls: [] as any[], panne: false };
vi.mock("openai", () => {
  class OpenAI {
    constructor(public opts: any) {}
    private run = (kind: string, p: any) => {
      oa.calls.push({ kind, ...p });
      const usage = { input_tokens: 95, output_tokens: 343, input_tokens_details: { text_tokens: 95, image_tokens: kind === "edit" ? 1024 : 0 } };
      const done = (async () => {
        if (oa.panne) { const e: any = new Error("502 upstream request failed"); e.status = 502; throw e; }
        const b64 = (await sharp({ create: { width: 64, height: 64, channels: 3, background: "#FFFFFF" } }).png().toBuffer()).toString("base64");
        return p.stream ? (async function* () { yield { type: `image_${kind === "edit" ? "edit" : "generation"}.completed`, b64_json: b64, usage }; })() : { data: [{ b64_json: b64 }], usage };
      })();
      return Object.assign(done, { withResponse: async () => ({ data: await done, request_id: `req_${kind}_${oa.calls.length}` }) });
    };
    images = { generate: (p: any) => this.run("generate", p), edit: (p: any) => this.run("edit", p) };
  }
  return { default: OpenAI, OpenAI, toFile: async (b: Buffer, name: string) => ({ name, size: b.length, data: b }) };
});

describe("la règle des modèles des logos (logo-policy.ts) : une liste, sans casser les publications", async () => {
  const P = await import("@/lib/ai/logo-policy");
  const R = await import("@/lib/ai/media-routing");
  const { mediaModel } = await import("@/lib/ai/media-models");
  it("recherche en 2.5 Sunburst et 2.6 Flare, finalisation en 2.6 Sunburst, symbole en 2.5 Sunburst", () => {
    expect(P.LOGO_MODELS.recherche).toEqual(["gpt-image-2.5-sunburst", "gpt-image-2.6-flare"]);
    expect(P.LOGO_MODELS.finalisation).toBe("gpt-image-2.6-sunburst");
    expect(P.LOGO_MODELS.symbole).toBe("gpt-image-2.5-sunburst");
    expect(P.modelePermisPour("recherche", "openai", "gpt-image-2.6-flare")).toBe(true);
    expect(P.modelePermisPour("finalisation", "openai", "gpt-image-2.6-flare")).toBe(false);
    expect(P.modelePermisPour("recherche", "google", "gpt-image-2.5-sunburst")).toBe(false);
  });
  it("le verrou « réservé aux logos » reste seulement sur 2.5 Sunburst : 2.6 Flare sert toujours aux publications et à l'atelier", () => {
    const sun = mediaModel("openai", "gpt-image-2.5-sunburst")!, flare = mediaModel("openai", "gpt-image-2.6-flare")!, sun26 = mediaModel("openai", "gpt-image-2.6-sunburst")!;
    expect(R.incompatibility(sun, { kind: "image", usage: "social_image" } as never)).toMatch(/réservé au dessin des logos/);
    expect(R.incompatibility(flare, { kind: "image", usage: "social_image" } as never)).toBeNull();
    expect(R.incompatibility(sun26, { kind: "image", usage: "social_image" } as never)).toBeNull();
    expect(P.estReserveAuxLogos("openai", "gpt-image-2.6-flare")).toBe(false);
    // L'usage « logo » du routage reste le symbole, en 2.5 Sunburst, sans secours.
    expect(R.usagePrimary("logo")).toMatchObject({ provider: "openai", model: "gpt-image-2.5-sunburst" });
  });
});

describe("le vrai chemin des images du logo, jusqu'à OpenAI simulé", async () => {
  const { account, project } = await import("./conversation209-fixtures");
  const mp = await import("@/lib/ai/media-providers");
  const { all } = await import("@/lib/db");
  beforeEach(() => { keys = { openai: "sk-openai-test-123456" }; oa.calls = []; oa.panne = false; });
  const T = "Crée une planche de recherche graphique pour Reflet, une entreprise de nettoyage de voitures, intérieur et extérieur.";
  it("une planche : generations, la demande exacte, le reçu (texte envoyé, modèle, identifiant, consommation) gardé avec l'image", async () => {
    const u = await account(), pid = project(u) as string;
    const png = await mp.aiLogoPlanche({ userId: u.id, projectId: pid, jobId: null, usageKey: `essai:${Date.now()}:planche` }, { model: "gpt-image-2.6-flare", prompt: T });
    expect(oa.calls).toHaveLength(1);
    const { kind, stream, partial_images, ...corps } = oa.calls[0];
    expect(kind).toBe("generate");
    expect(corps).toEqual({ model: "gpt-image-2.6-flare", prompt: T, size: "1536x1024", quality: "medium", background: "opaque", output_format: "png", n: 1, complexity: "medium" });
    void stream; void partial_images;
    const recu = mp.recuDuLogo(png)!;
    expect(recu).toMatchObject({ endpoint: "POST /v1/images/generations", modele: "gpt-image-2.6-flare", texteEnvoye: T });
    expect(recu.requestId).toMatch(/^req_generate_/);
    expect(recu.usage).toMatchObject({ output_tokens: 343 });
    // Le texte envoyé et l'identifiant sont aussi dans les détails de l'appel enregistré.
    const det = all<{ details: string }>("SELECT details FROM ai_calls WHERE project_id=? ORDER BY rowid DESC LIMIT 1", pid)[0];
    expect(JSON.parse(det.details)).toMatchObject({ temps: "recherche", texteEnvoye: T });
  });
  it("la finalisation : edits, l'esquisse jointe dans un tableau (image[]), 2.6 Sunburst, haute qualité, taille libre", async () => {
    const u = await account(), pid = project(u) as string;
    const esq = await sharp({ create: { width: 512, height: 512, channels: 3, background: "#FFFFFF" } }).png().toBuffer();
    await mp.aiLogoFinalise({ userId: u.id, projectId: pid, jobId: null, usageKey: `essai:${Date.now()}:fin` }, { esquisse: esq, prompt: "Transforme cette esquisse…" });
    const c = oa.calls[0];
    expect(c.kind).toBe("edit");
    expect(Array.isArray(c.image) && c.image).toHaveLength(1);
    expect(c).toMatchObject({ model: "gpt-image-2.6-sunburst", quality: "high", size: "auto", background: "opaque", output_format: "png", n: 1, prompt: "Transforme cette esquisse…" });
  });
  it("un modèle hors de la liste est refusé avant tout envoi ; une panne n'est jamais relancée (un seul appel)", async () => {
    const u = await account(), pid = project(u) as string;
    await expect(mp.aiLogoPlanche({ userId: u.id, projectId: pid, jobId: null, usageKey: `essai:${Date.now()}:x` }, { model: "gpt-image-2.5-flare", prompt: T })).rejects.toThrow(/non permis/);
    expect(oa.calls).toHaveLength(0);
    oa.panne = true;
    await expect(mp.aiLogoPlanche({ userId: u.id, projectId: pid, jobId: null, usageKey: `essai:${Date.now()}:p` }, { model: "gpt-image-2.5-sunburst", prompt: T })).rejects.toThrow(/502/);
    expect(oa.calls).toHaveLength(1);
  });
});

describe("le devis et les deux plafonds", async () => {
  const { borneDuStudio } = await import("@/lib/ai/borne-du-studio");
  const { REPRISES_MAX } = await import("@/lib/syna-agent/reprises");
  const G = await import("@/lib/syna-agent/logo-graphistes");
  const { EUR } = await import("@/lib/billing");
  it("borneDuStudio reçoit « reprises » : 1 pour les logos ; par défaut la règle de toutes les chaînes", () => {
    expect(borneDuStudio(1000, false, 400)).toBe(REPRISES_MAX * 400);
    expect(borneDuStudio(1000, false, 400, 1)).toBe(400);
    expect(borneDuStudio(1000, true, 400, 1)).toBe(1400);
    expect(borneDuStudio(0, false, 400, 1)).toBe(0);
  });
  it("recherche, finalisations, accord unique : « au plus » au-dessus du probable ; la borne du Studio vaut UNE reprise", () => {
    const r = G.devisDeLaRecherche(), f = G.devisDesFinalisations(3), tout = G.devisDuLogo(3);
    for (const d of [r, f, tout]) { expect(d.maxMicro).toBeGreaterThanOrEqual(d.probableMicro); expect(d.studioMaxMicro).toBe(Math.ceil(Math.min(d.repriseMicro, d.maxMicro))); }
    expect(tout.maxMicro).toBe(r.maxMicro + f.maxMicro);
    // Les prix mesurés : recherche 0,009 € + 0,030 € ; texte 0,015 € ; logo fini de 0,026 € à 0,061 €.
    expect(G.PRIX_MESURES).toEqual({ planche: { "gpt-image-2.5-sunburst": 0.009, "gpt-image-2.6-flare": 0.03 }, redaction: 0.015, logoFini: { min: 0.026, max: 0.061 } });
    expect(f.probableMicro).toBeGreaterThanOrEqual(Math.round(3 * (0.015 + 0.0435) * EUR));
    // « D'autres pistes » : sans le métier (déjà écrit) ; « un autre logo » : une seule finalisation.
    expect(G.devisDesPistes().maxMicro).toBeLessThan(r.maxMicro);
    expect(G.devisDUneAutreEsquisse().maxMicro).toBe(G.devisDesFinalisations(1).maxMicro);
  });
});
