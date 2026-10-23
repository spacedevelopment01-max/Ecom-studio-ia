import {vi} from "vitest";
vi.mock("@/lib/public-download",()=>import("./public-download-double"));
/**
 * Choix de la meilleure photo libre (Pixabay d'abord) pour une publicité : parmi les photos pertinentes, celle qui a
 * une zone calme pour le texte, le bon cadrage et une bonne définition — sans jamais passer devant la pertinence
 * d'une photo nettement plus en rapport avec le produit ou le service.
 */
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { adFitOrder, adFitScore } from "@/lib/stock/ad-fit";
import { stockSources, type StockPhoto } from "@/lib/stock/photos";

const busy = () => sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">${Array.from({ length: 400 }, (_, k) => `<rect x="${(k % 20) * 20}" y="${Math.floor(k / 20) * 20}" width="10" height="20" fill="${k % 2 ? "#111" : "#eee"}"/>`).join("")}</svg>`)).jpeg().toBuffer();
const calmLeft = () => sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="#dfe6ea"/>${Array.from({ length: 200 }, (_, k) => `<rect x="${220 + (k % 9) * 20}" y="${Math.floor(k / 9) * 20}" width="10" height="20" fill="${k % 2 ? "#111" : "#eee"}"/>`).join("")}</svg>`)).jpeg().toBuffer();

const photo = (id: string, extra: Partial<StockPhoto> = {}): StockPhoto => ({ source: "pixabay", id, url: `https://x.test/${id}.jpg`, thumb: `https://x.test/${id}-small.jpg`, page: "", author: "", license: "Pixabay", width: 4000, height: 4000, alt: "coffee beans cup", ...extra });

describe("meilleure photo pour une pub", () => {
  it("Pixabay obligatoire : aucune autre banque (réglage « stock.pixabayOnly », activé par défaut)", async () => {
    const { setSetting } = await import("@/lib/settings");
    expect(stockSources().every((s) => s === "pixabay")).toBe(true);
    // Réglage désactivé : Pixabay d'abord, puis Pexels, puis Openverse.
    setSetting("stock.pixabayOnly", "0");
    try {
      expect(stockSources().at(-1)).toBe("openverse");
    } finally {
      setSetting("stock.pixabayOnly", "1");
    }
  });

  it("à pertinence voisine, la photo avec une zone calme pour le texte passe devant", async () => {
    const imgs: Record<string, Buffer> = { "a-small": await busy(), "b-small": await calmLeft() };
    const fetcher = (async (u: string) => {
      const k = String(u).split("/").pop()!.replace(".jpg", "");
      return new Response(new Uint8Array(imgs[k]), { status: 200, headers: { "content-type": "image/jpeg" } });
    }) as unknown as typeof fetch;
    const out = await adFitOrder([photo("a"), photo("b")], "1:1", { fetcher });
    expect(out.map((x) => x.id)).toEqual(["b", "a"]);
  });

  it("hors ligne (vignettes illisibles) : l'ordre de pertinence est gardé", async () => {
    const fetcher = (async () => new Response("", { status: 404 })) as unknown as typeof fetch;
    const out = await adFitOrder([photo("a"), photo("b"), photo("c")], "4:5", { fetcher });
    expect(out.map((x) => x.id)).toEqual(["a", "b", "c"]);
  });

  it("la pertinence pèse plus que le confort : une photo très calme mais classée loin ne passe pas devant la première", () => {
    const base = { total: 10, photoRatio: 1, ratio: 1, width: 3000, height: 3000, targetPx: 1080, popularity: 0, maxPopularity: 0 };
    const first = adFitScore({ ...base, index: 0, calm: 0.06 });
    const last = adFitScore({ ...base, index: 9, calm: 0 });
    expect(first).toBeGreaterThan(last);
    // Cadrage : une photo très panoramique pour un format story perd des points.
    expect(adFitScore({ ...base, index: 0, calm: 0.05, ratio: 9 / 16, photoRatio: 3 })).toBeLessThan(adFitScore({ ...base, index: 0, calm: 0.05, ratio: 9 / 16, photoRatio: 0.66 }));
  });
});
