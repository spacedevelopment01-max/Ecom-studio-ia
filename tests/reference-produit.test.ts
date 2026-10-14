/**
 * Référence des photos publicitaires quand le produit n'est montré que sur une photo du client (porté par une
 * personne) : l'IA de vision (simulée ici) désigne les cases du quadrillage où se trouve le produit ; le studio
 * recadre le produit seul, garde ce recadrage, et note la personne vue sur la photo (règle de présence humaine).
 */
import fs from "node:fs";
import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";

const calls: any[] = [];
vi.mock("@/lib/ai/llm", async (orig) => ({
  ...(await orig<any>()),
  llmConfigured: () => true,
  llmJson: async (call: any) => (calls.push(call), { found: true, cells: ["D3", "E3"], person: true }),
}));

describe("référence du produit recadrée dans la photo du client", async () => {
  const { createUser } = await import("@/lib/auth");
  const { loadProject } = await import("@/lib/projects");
  const { saveAsset, getAsset, assetData } = await import("@/lib/library");
  const { realAdDeps } = await import("@/lib/ads-v2/deps");
  const { peopleAllowedFor } = await import("@/lib/people-policy");
  const { seedImageFixture } = await import("./image-v2-fixtures");

  it("recadre le produit (cases désignées + marge), le garde, et note la personne", async () => {
    const u = await createUser(`ref-${Date.now()}@test.fr`, "motdepasse-test", "R");
    const pid = seedImageFixture(u.id, "hightech");
    const photo = await saveAsset({ projectId: pid, userId: u.id, data: fs.readFileSync("scripts/demo-products/inputs/pixabay/casque-1.jpg"), name: "casque-1.jpg", mime: "image/jpeg", role: "original", origin: "upload", meta: {}, status: "ready" });
    const p = loadProject(pid);
    expect(peopleAllowedFor(p)).toBe(false);
    const deps = realAdDeps(null, p, true);
    const id = (await deps.productReference!(photo.id))!;
    expect(id).toBeTruthy();
    const ref = getAsset(id)!;
    expect(ref.role).toBe("product-ref");
    expect(ref.source_asset_id).toBe(photo.id);
    // Cases D3–E3 d'une grille 6 × 6, plus une demi-case de marge : environ 3/6 de la largeur et 2/6 de la hauteur.
    const src = await sharp(assetData(photo)).metadata();
    const m = await sharp(assetData(ref)).metadata();
    expect(m.width! / src.width!).toBeGreaterThan(0.45);
    expect(m.width! / src.width!).toBeLessThan(0.55);
    expect(m.height! / src.height!).toBeGreaterThan(0.28);
    expect(m.height! / src.height!).toBeLessThan(0.39);
    // L'image envoyée à l'IA est quadrillée, la consigne nomme le produit.
    expect(calls[0].prompt).toContain("6 × 6 grid");
    // Personne vue sur la photo du client : la règle de présence humaine l'autorise désormais pour ce projet.
    expect(JSON.parse(getAsset(photo.id)!.meta as any).hasPerson).toBe(true);
    expect(peopleAllowedFor(loadProject(pid))).toBe(true);
    // Deuxième demande : le recadrage gardé est repris, sans nouvel appel.
    expect(await deps.productReference!(photo.id)).toBe(id);
    expect(calls.length).toBe(1);
  }, 120_000);
});
