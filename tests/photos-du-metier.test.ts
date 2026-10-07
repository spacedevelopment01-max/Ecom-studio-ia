/**
 * Photos libres du bon métier : un plâtrier peintre n'a jamais un mur de briques nu. Les recherches nomment le geste
 * du métier, et sans contrôle visuel seules les photos dont la description cite le métier sont gardées.
 */
import { describe, expect, it, vi } from "vitest";
import { rankStock, tagsMatch, tradeStock } from "@/lib/stock/trade-queries";

const brick = { id: "mur", alt: "wall, brick, white, texture, background" };
const plaster = { id: "platre", alt: "plasterer, trowel, renovation, wall" };
const roller = { id: "rouleau", alt: "paint roller, painter, interior" };

describe("photos libres : le métier, pas un décor", () => {
  it("« Plâtrier peintre » : les deux métiers reconnus, recherches concrètes en anglais", () => {
    const t = tradeStock("Plâtrier peintre")!;
    expect(t.queries[0]).toMatch(/plaster/);
    expect(t.queries[1]).toMatch(/paint/);
    expect(t.queries.join(" ")).not.toMatch(/\bwall texture\b|\bbrick\b/);
  });
  it("un mur de briques nu ne cite pas le métier ; une photo de plâtrier ou de peintre oui", () => {
    const { must } = tradeStock("Plâtrier peintre")!;
    expect(tagsMatch(brick.alt, must)).toBe(false);
    expect(tagsMatch(plaster.alt, must)).toBe(true);
    expect(tagsMatch(roller.alt, must)).toBe(true);
  });
  it("sans IA : le mur est écarté ; avec IA : il passe en dernier (le contrôle visuel le refusera)", () => {
    const { must } = tradeStock("Plâtrier peintre")!;
    expect(rankStock([brick, plaster, roller], must, false).map((x) => x.id)).toEqual(["platre", "rouleau"]);
    expect(rankStock([brick, plaster], must, true).map((x) => x.id)).toEqual(["platre", "mur"]);
    expect(rankStock([brick], must, false)).toEqual([]);
  });
  it("métier inconnu : rien n'est filtré", () => {
    expect(tradeStock("Conciergerie de luxe")).toBeNull();
    expect(rankStock([brick], [], false)).toEqual([brick]);
  });
  it("chaque prestation garde son propre métier (carrelage ≠ peinture)", () => {
    expect(tradeStock("Pose de faïence")!.queries[0]).toMatch(/til/);
    expect(tagsMatch(roller.alt, tradeStock("Pose de faïence")!.must)).toBe(false);
  });
});

describe("remplissage des emplacements", () => {
  it("avec l'IA : une photo hors sujet est refusée, la suivante du métier est prise", async () => {
    vi.resetModules();
    const sharp = (await import("sharp")).default;
    const jpg = await sharp({ create: { width: 32, height: 32, channels: 3, background: "#eee" } }).jpeg().toBuffer();
    const queries: string[][] = [];
    vi.doMock("@/lib/ai/llm", async (orig) => ({ ...(await orig<object>()), llmConfigured: () => true, llmJson: vi.fn(async () => { throw new Error("pas de requêtes IA"); }) }));
    vi.doMock("@/lib/ai/tasks", async (orig) => ({ ...(await orig<object>()), aiQcScene: vi.fn(async (_b: any, img: Buffer, _s: string, stock: boolean) => (stock && img.length === jpg.length + 1 ? { ok: false, score: 3, issues: ["mur nu"] } : { ok: true, score: 9, issues: [] })) }));
    vi.doMock("@/lib/stock/photos", () => ({
      searchStock: async (q: string[]) => (queries.push(q), [{ source: "pixabay", id: "mur", url: "u1", page: "", author: "", license: "Pixabay", width: 1, height: 1, alt: "wall, plaster texture" }, { source: "pixabay", id: "bon", url: "u2", page: "", author: "", license: "Pixabay", width: 1, height: 1, alt: "plasterer, trowel" }]),
      downloadStock: async (ph: any) => (ph.id === "mur" ? Buffer.concat([jpg, Buffer.from([0])]) : jpg),
      stockCredit: () => "crédit",
    }));
    const saved: any[] = [];
    vi.doMock("@/lib/library", async (orig) => ({ ...(await orig<object>()), saveAsset: vi.fn(async (a: any) => (saved.push(a), { id: `a${saved.length}`, ...a })) }));
    const { stockFill } = await import("@/lib/engine/service-media");
    const { emptyProduct, emptyServiceProfile } = await import("@/lib/project-types");
    const p: any = { id: `p-${Date.now()}`, userId: "u", name: "Blanc", business: "services", product: { ...emptyProduct(), category: "Plâtrier peintre" }, brand: { name: "Blanc" }, services: { ...emptyServiceProfile(), services: [] } };
    const got = await stockFill({ userId: "u", projectId: p.id, jobId: "j" }, p, [{ slot: "hero", aspect: "16:9" }], "blanc");
    expect(got).toHaveLength(1);
    expect(saved[0].meta.stock.id).toBe("bon");
    expect(queries[0][0]).toMatch(/plaster/);
  });
});
