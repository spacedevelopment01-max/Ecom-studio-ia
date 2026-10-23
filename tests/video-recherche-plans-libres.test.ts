vi.mock("@/lib/public-download",()=>import("./public-download-double"));
import {videoByteFixture} from "./video-byte-fixture";
/**
 * Recherche de plans libres (onglet Vidéos › Chercher des plans libres). Bug signalé : projet « contretemps » (escape
 * game, services), 16:9, recherche « escape game » → « rien trouvé », alors que Pixabay a des plans qui collent
 * (224483 : « ai generated … escape room »). Réponses réelles de Pixabay enregistrées (aucun appel réseau).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fixture from "./fixtures/pixabay-videos-escape-game.json";

const { setSetting } = await import("@/lib/settings");
const { searchStockVideos, emptyVideoReport, aiGeneratedTags, stockVideoCredit } = await import("@/lib/stock/photos");
const { rankStock, tradeStock, tagsMatch } = await import("@/lib/stock/trade-queries");
const { citesTyped, typedWords, silhouetteOnly } = await import("@/lib/stock/stock-clip");
const { findBankClips, noClipMessage } = await import("@/lib/media/bank-video");
const { emptyClipDiag } = await import("@/lib/stock/stock-clip");
const { createUser } = await import("@/lib/auth");
const { run, all } = await import("@/lib/db");
const { emptyProduct } = await import("@/lib/project-types");

type Call = { q: string; lang: string; perPage: string };
let calls: Call[] = [];

/** Faux Pixabay : renvoie les réponses enregistrées (« escape game » en anglais / français), vide pour le reste. */
function fakePixabay() {
  calls = [];
  vi.stubGlobal("fetch", async (u: string | URL) => {
    const url = new URL(String(u));
    if (url.hostname === "cdn.pixabay.com") return new Response(new Uint8Array(videoByteFixture()), { headers: { "content-type": "video/mp4" } });
    if (url.hostname !== "pixabay.com") throw new Error(`réseau interdit : ${url.hostname}`);
    const q = url.searchParams.get("q") ?? "";
    const lang = url.searchParams.get("lang") ?? "en";
    calls.push({ q, lang, perPage: url.searchParams.get("per_page") ?? "" });
    const en = (fixture.hits as Record<string, { id: number }[]>).en;
    const hits = q === "escape game" ? (fixture.hits as Record<string, unknown[]>)[lang] ?? [] : q === "silhouette door" && lang === "en" ? en.filter((h) => h.id === 187666) : [];
    return new Response(JSON.stringify({ total: hits.length, totalHits: hits.length, hits }), { headers: { "content-type": "application/json" } });
  });
}

async function escapeProject(category = "Escape game") {
  const u = await createUser(`eg-${Date.now()}-${Math.random()}@test.fr`, "motdepasse-test", "P");
  const pid = `eg${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
  const product = { ...emptyProduct(), name: "Contretemps", nameStatus: "provided", category, summary: "Salles d'énigmes en équipe." };
  run(
    "INSERT INTO projects (id, user_id, name, status, platform, product_json, brand_json, strategy_json, settings_json, sources_json, business_type, business_json, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
    pid, u.id, "Contretemps", "ready", "shopify", JSON.stringify(product), "{}", "{}", JSON.stringify({ language: "fr" }), "[]", "services", JSON.stringify({ services: [{ name: "Salle Le Manoir" }] }), new Date().toISOString(), new Date().toISOString(),
  );
  return pid;
}

const ctx = (id: string): any => ({ job: { id }, progress: () => {}, step: async (_k: string, f: () => unknown) => f() });

describe("recherche de plans libres : « escape game » (bug du projet contretemps)", () => {
  beforeEach(() => {
    process.env.STOCK_OFFLINE = "0";
    setSetting("provider.pixabay.apiKey", "cle-de-test", true);
    setSetting("provider.pixabay.disabled", null);
    fakePixabay();
  });
  afterEach(() => {
    process.env.STOCK_OFFLINE = "1";
    vi.unstubAllGlobals();
  });

  it("le texte tapé est envoyé tel quel, en anglais et en français, avec assez de résultats par page", async () => {
    const pid = await escapeProject();
    await findBankClips(ctx("j1"), pid, { topic: "escape game", aspect: "16:9", count: 1 });
    expect(calls[0]).toEqual({ q: "escape game", lang: "en", perPage: "40" });
    expect(calls[1]).toMatchObject({ q: "escape game", lang: "fr" });
  });

  it("les plans « ai generated » qui collent sont retenus et signalés comme créés par l'IA", async () => {
    const pid = await escapeProject();
    const out = await findBankClips(ctx("j2"), pid, { topic: "escape game", aspect: "16:9", count: 2 });
    expect(out.assetIds).toHaveLength(2);
    const rows = all<{ s: string; recipe: string }>("SELECT json_extract(meta,'$.stock') s, json_extract(meta,'$.recipe') recipe FROM assets WHERE project_id = ? ORDER BY created_at", pid);
    const stock = rows.map((r) => JSON.parse(r.s));
    expect(stock.map((s) => s.id).sort()).toEqual(["224483", "224484"]);
    expect(stock.every((s) => s.aiGenerated === true)).toBe(true);
    expect(rows[0].recipe).toMatch(/créé par l'IA/);
    expect(rows[0].recipe).toMatch(/pas une vidéo de vos réalisations/);
  });

  it("un métier non reconnu (« Loisirs ») : le texte tapé suffit à trouver les plans", async () => {
    const pid = await escapeProject("Loisirs");
    const out = await findBankClips(ctx("j3"), pid, { topic: "escape game", aspect: "16:9", count: 1 });
    expect(out.assetIds).toHaveLength(1);
  });

  it("rien trouvé : le client voit POURQUOI (aucun résultat / clé absente)", async () => {
    const pid = await escapeProject("Loisirs");
    await expect(findBankClips(ctx("j4"), pid, { topic: "zzz introuvable", aspect: "16:9", count: 1 })).rejects.toThrow(/Pixabay n'a aucune vidéo pour « zzz introuvable »/);
    setSetting("provider.pixabay.disabled", "1");
    await expect(findBankClips(ctx("j5"), pid, { topic: "escape game", aspect: "16:9", count: 1 })).rejects.toThrow(/aucune clé Pixabay active/);
  });

  it("silhouettes : écartées par défaut (projet sans personnes), proposées et signalées si le client coche la case", async () => {
    const pid = await escapeProject("Loisirs");
    // 187666 : « man, silhouette, … door » (silhouette d'homme devant une porte éclairée).
    await expect(findBankClips(ctx("s1"), pid, { topic: "silhouette door", aspect: "16:9", count: 1 })).rejects.toThrow(/1 avec des personnes.*Accepter les silhouettes/);
    const out = await findBankClips(ctx("s2"), pid, { topic: "silhouette door", aspect: "16:9", count: 1, silhouettes: true });
    expect(out.assetIds).toHaveLength(1);
    const row = all<{ s: string; recipe: string }>("SELECT json_extract(meta,'$.stock') s, json_extract(meta,'$.recipe') recipe FROM assets WHERE project_id = ?", pid)[0];
    expect(JSON.parse(row.s)).toMatchObject({ id: "187666", silhouette: true });
    expect(row.recipe).toMatch(/visage non visible/);
  });

  it("Pixabay injoignable : erreur dite au client, pas avalée", async () => {
    setSetting("provider.pixabay.apiKey", "synthetic-unavailable-cold-cache", true);
    vi.stubGlobal("fetch", async () => new Response("err", { status: 503 }));
    // Nouvelle requête non mise en cache : le scénario vérifie une panne réseau, pas la réutilisation 24 h.
    const pid = await escapeProject("Loisirs");
    await expect(findBankClips(ctx("j6"), pid, { topic: "escape game source unavailable isolated", aspect: "16:9", count: 1 })).rejects.toThrow(/Pixabay ne répond pas/);
  });

  it("recherche directe : mêmes plans vus dans les deux langues = mots-clés réunis, fonds verts écartés", async () => {
    const report = emptyVideoReport();
    const got = await searchStockVideos([{ q: "escape game", lang: "en" }, { q: "escape game", lang: "fr" }], "landscape", "en", new Set(), Number.POSITIVE_INFINITY, report);
    const v = got.find((x) => x.id === "224483")!;
    expect(v.alt).toMatch(/escape room/);
    expect(v.alt).toMatch(/salle d'évasion/);
    expect(got.filter((x) => x.id === "224483")).toHaveLength(1);
    expect(got.some((x) => /chroma key|green screen/.test(x.alt))).toBe(false);
    expect(report.raw).toBeGreaterThan(20);
  });
});

describe("filtres de la recherche de plans (sans réseau)", () => {
  it("plan créé par l'IA reconnu en anglais et en français", () => {
    expect(aiGeneratedTags("ai generated, illusion, game")).toBe(true);
    expect(aiGeneratedTags("ai généré, illusion, jeu")).toBe(true);
    expect(aiGeneratedTags("chair, airport, aisle")).toBe(false);
    expect(stockVideoCredit({ license: "Pixabay", author: "x", aiGenerated: true })).toMatch(/créé par l'IA/);
  });

  it("vidéos : un plan « ai generated » n'est plus jeté ; images : toujours écarté", () => {
    const found = [{ alt: "ai generated, illusion, game, escape room, clock" }];
    expect(rankStock(found, ["escape room"], false, [], { allowAiMade: true })).toHaveLength(1);
    expect(rankStock(found, ["escape room"], false)).toHaveLength(0);
  });

  it("mots du métier composés : comparés mot à mot (apostrophes et tirets ignorés)", () => {
    expect(tagsMatch("ai generated, castle, clock, escape room, fantasy", tradeStock("Escape game")!.must)).toBe(true);
    expect(tagsMatch("salle d'évasion, horloge", ["salle d'evasion"])).toBe(true);
  });

  it("texte tapé du client passé avant le métier : un plan qui le cite vient en premier", () => {
    // Oiseaux « escape » (mot du métier) contre plan « escape room … game » : seul le second cite « escape game ».
    expect(citesTyped("waterfowl, birds, cormorants, like, escape, panic", typedWords("escape game"))).toBe(false);
    expect(citesTyped("ai generated, illusion, game, role, escape room", typedWords("escape game"))).toBe(true);
  });

  it("texte tapé : tous les mots cités (pluriels, féminin), un seul en recherche élargie", () => {
    expect(typedWords("Escape game")).toEqual(["escape", "game"]);
    expect(typedWords("porte d'entrée")).toEqual(["porte", "entree"]);
    expect(citesTyped("ai generated, game, role, escape room", ["escape", "game"])).toBe(true);
    expect(citesTyped("birds, escape, panic", ["escape", "game"])).toBe(false);
    expect(citesTyped("birds, escape, panic", ["escape", "game"], true)).toBe(true);
    expect(citesTyped("porte, château, secret", typedWords("porte secrète"))).toBe(true);
  });

  it("silhouette : de dos ou dans l'ombre oui, visage cité non", () => {
    expect(silhouetteOnly("man, silhouette, dream, escape, door")).toBe(true);
    expect(silhouetteOnly("woman, silhouette, face, portrait")).toBe(false);
    expect(silhouetteOnly("man, running, road")).toBe(false);
  });

  it("message « pourquoi rien » : personnes écartées, hors sujet, proposition d'élargir", () => {
    const d = emptyClipDiag();
    d.report.raw = 40;
    d.people = 3;
    d.offTopic = 30;
    const m = noClipMessage(d, "escape game", false);
    expect(m).toMatch(/40 vidéos trouvées/);
    expect(m).toMatch(/3 avec des personnes/);
    expect(m).toMatch(/30 hors sujet/);
    expect(m).toMatch(/Recherche élargie/);
  });
});
