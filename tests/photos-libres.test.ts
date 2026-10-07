/** Photos libres de droits : lecture des réponses Pexels, Pixabay et Openverse (sans réseau), crédit affiché. */
import { afterEach, describe, expect, it, vi } from "vitest";
import { searchSource, searchStock, stockCredit } from "@/lib/stock/photos";

vi.mock("@/lib/ai/config", async (orig) => ({ ...(await orig<object>()), activeProviderKey: (p: string) => (p === "pexels" ? "cle-pexels" : null) }));

const reply = (body: unknown) => vi.fn(async () => new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } }));
afterEach(() => vi.unstubAllGlobals());

describe("photos libres de droits", () => {
  it("Pexels : photo, auteur, page et lien de téléchargement ; clé envoyée", async () => {
    const f = reply({ photos: [{ id: 1, width: 4000, height: 3000, url: "https://www.pexels.com/photo/1", photographer: "Ana", alt: "peintre au travail", src: { large2x: "https://images.pexels.com/1.jpeg" } }] });
    vi.stubGlobal("fetch", f);
    const r = await searchSource("pexels", "plâtrier", "landscape", "fr");
    expect(r[0]).toMatchObject({ source: "pexels", id: "1", url: "https://images.pexels.com/1.jpeg", author: "Ana" });
    expect((f.mock.calls[0] as any[])[0]).toMatch(/locale=fr-FR/);
    expect((f.mock.calls[0] as any[])[1].headers.Authorization).toBe("cle-pexels");
  });
  it("Openverse : uniquement domaine public / CC0, petites images écartées", async () => {
    const f = reply({ results: [{ id: "a", url: "https://x/a.jpg", width: 2000, height: 1500, license: "cc0", creator: "Bob", foreign_landing_url: "https://x/a" }, { id: "b", url: "https://x/b.jpg", width: 400, height: 300, license: "cc0" }] });
    vi.stubGlobal("fetch", f);
    const r = await searchSource("openverse", "plaster wall", "landscape", "en");
    expect(r.map((x) => x.id)).toEqual(["a"]);
    expect((f.mock.calls[0] as any[])[0]).toMatch(/license=cc0,pdm/);
  });
  it("une banque en panne ne bloque pas les autres ; photos déjà prises écartées", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => (url.includes("pexels") ? new Response("", { status: 500 }) : new Response(JSON.stringify({ results: [{ id: "a", url: "https://x/a.jpg", width: 2000, height: 1500, license: "pdm" }, { id: "c", url: "https://x/c.jpg", width: 2000, height: 1500, license: "cc0" }] }), { status: 200 }))));
    const r = await searchStock(["peinture"], "landscape", "fr", new Set(["openverse:a"]));
    expect(r.map((x) => `${x.source}:${x.id}`)).toEqual(["openverse:c"]);
  });
  it("crédit : source et auteur, et précision que ce n'est pas une photo du client", () => {
    expect(stockCredit({ source: "pexels", author: "Ana", license: "Pexels" })).toMatch(/Pexels.*Ana.*pas une photo de vos réalisations/);
  });
});
