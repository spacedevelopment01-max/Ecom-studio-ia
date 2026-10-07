/**
 * Calendrier d'une activité de services : avec l'IA, chaque publication reçoit sa propre image, faite d'après
 * son sujet ; sans fournisseur d'images (Découverte, IA coupée), rien n'est généré et le calendrier reprend
 * les images déjà créées.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const calls: { prompt: string; aspect: string }[] = [];
let available = true;
vi.mock("@/lib/ai/media-providers", () => ({
  imageProviderAvailable: () => available,
  ambianceImage: vi.fn(async (_ctx: unknown, req: { prompt: string; aspect: string }) => {
    calls.push(req);
    throw new Error("pas de vrai appel dans les tests");
  }),
  refundMediaQuota: vi.fn(),
}));

const { postAmbiance } = await import("@/lib/engine/service-media");
const { emptyProduct, emptyServiceProfile } = await import("@/lib/project-types");

const project: any = {
  id: "p", userId: "u", name: "Blanc", business: "services",
  product: { ...emptyProduct(), name: "Sébastien Blanc", category: "Plâtrerie peinture", summary: "Plâtrerie et peinture." },
  brand: { name: "Sébastien Blanc", tagline: "", story: "", palette: { primary: "#446274", secondary: "#D0D8DD", accent: "#446274", light: "#F2F5F7", dark: "#14181F" } },
  services: { ...emptyServiceProfile(), services: [{ name: "Peinture", description: "Intérieur." }], area: "Ain" },
};
const ictx = { userId: "u", projectId: "p", jobId: "j" };

describe("une image IA par publication", () => {
  beforeEach(() => { calls.length = 0; available = true; });

  it("sans fournisseur d'images : aucune génération (repli sur les images existantes)", async () => {
    available = false;
    expect(await postAmbiance(ictx, project, { key: "a", topic: "Rénover une cuisine", aspect: "1:1", name: "x.jpg" })).toBeNull();
    expect(calls).toHaveLength(0);
  });

  it("avec l'IA : une consigne propre au sujet de chaque publication, au format de la publication", async () => {
    await postAmbiance(ictx, project, { key: "a", topic: "Rénover une cuisine", aspect: "1:1", name: "a.jpg" });
    await postAmbiance(ictx, project, { key: "b", topic: "Repeindre une façade", aspect: "9:16", name: "b.jpg" });
    expect(calls).toHaveLength(2);
    expect(calls[0].prompt).toMatch(/Rénover une cuisine/);
    expect(calls[1].prompt).toMatch(/Repeindre une façade/);
    expect(calls[0].prompt).not.toBe(calls[1].prompt);
    expect(calls.map((c) => c.aspect)).toEqual(["1:1", "9:16"]);
  });
});
