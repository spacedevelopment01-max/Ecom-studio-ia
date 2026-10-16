/**
 * Onglet Images › « Chercher des photos libres » : recherche élargie et silhouettes, comme l'onglet Vidéos (PR #121).
 *  - le texte tapé est cherché tel quel (anglais et français) ; recherche élargie : chaque mot aussi seul ;
 *  - projet sans personnes : une silhouette (de dos, dans l'ombre, visage non visible) n'est gardée que si le client
 *    a coché la case, et elle est signalée ; une photo « ai generated » de Pixabay est proposée et signalée ;
 *  - rien de retenu : message clair (combien trouvées, pourquoi écartées, quoi cocher) ; aucune image créée à la place.
 * Banques simulées : aucun appel réseau, aucune dépense.
 */
import fs from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";

let sessionUser: any = null;
vi.mock("@/lib/auth", async (orig) => {
  const real = await orig<typeof import("@/lib/auth")>();
  return { ...real, currentUser: async () => sessionUser, requireUser: async () => sessionUser ?? (() => { throw new real.HttpError(401, "Connexion requise."); })() };
});
afterEach(() => vi.unstubAllGlobals());

describe("Images : recherche élargie et silhouettes (photos libres)", async () => {
  const { createUser } = await import("@/lib/auth");
  const { id, json, now, one, run } = await import("@/lib/db");
  const { loadProject } = await import("@/lib/projects");
  const { JobContext, getJob, UserFacingError } = await import("@/lib/jobs");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { getAsset } = await import("@/lib/library");
  const { grantProjectPlan } = await import("@/lib/project-subscriptions");
  const { runImageEngineV2 } = await import("@/lib/image-v2/engine");
  const { STOCK_PROVIDERS } = await import("@/lib/image-v2/sources");
  const { setSetting } = await import("@/lib/settings");
  const { noPhotoMessage, emptyBankPhotoDiag } = await import("@/lib/media/bank-photo");
  const { typedQueries } = await import("@/lib/stock/typed-search");
  const { seedImageFixture } = await import("./image-v2-fixtures");
  const { candidate, mockDeps, mockProvider, review } = await import("./image-v2-mock");
  const route = await import("@/app/api/projects/[id]/images/v2/route");
  const fr = <T,>(fn: () => Promise<T> | T) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());
  const en = <T,>(fn: () => Promise<T> | T) => runWithLang({ ui: "en", content: "en" }, async () => fn());

  const u = await createUser(`img-sil-${Date.now()}@test.fr`, "motdepasse-test", "I");
  // Artisan (Sébastien Blanc) : projet SANS personnes autorisées (aucun réglage, aucune photo du client avec personne).
  const noPeople = () => loadProject(seedImageFixture(u.id, "artisan"));
  const job = (projectId: string) => {
    const jid = id();
    run("INSERT INTO jobs (id, user_id, project_id, type, label, payload, status, run_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)", jid, u.id, projectId, "image.v2", "test", "{}", "running", now(), now(), now());
    return new JobContext(one<any>("SELECT * FROM jobs WHERE id = ?", jid));
  };
  const search = (pid: string, deps: any, bankSearch: { typed?: string; broad?: boolean; silhouettes?: boolean }, count = 1) =>
    fr(() => runImageEngineV2(job(pid), pid, { kind: "stock_photo", aspect: "16:9", count, allowGenerate: false, bankSearch }, deps));
  const failure = async (p: Promise<unknown>) => {
    try {
      await p;
    } catch (e) {
      return e as Error;
    }
    throw new Error("la recherche aurait dû échouer");
  };

  it("paramètres envoyés : la fenêtre envoie broad et silhouettes ; la route les transmet à la tâche avec le texte tapé", async () => {
    const src = fs.readFileSync("src/components/studio/tab-images.tsx", "utf8");
    expect(src).toContain("allowGenerate: false, broad: f.broad || undefined, silhouettes: (!peopleAllowed && f.silhouettes) || undefined");
    expect(src).toContain("data-bank-search-broad");
    expect(src).toContain("data-bank-search-silhouettes");
    for (const s of ["Recherche élargie : chaque mot est aussi cherché seul (plus de photos, parfois moins précises)", "Broader search: each word is also searched on its own (more photos, sometimes less precise)", "Accepter les silhouettes (personne de dos ou dans l'ombre, visage non visible)", "Allow silhouettes (seen from behind or in shadow, face not visible)"]) expect(src).toContain(s);

    const p = noPeople();
    sessionUser = { ...u, role: "client" };
    grantProjectPlan(p.id, "vendre");
    const post = (request: unknown) => fr(() => route.POST(new Request(`http://localhost:3000/api/projects/${p.id}/images/v2`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "generate", request }) }), { params: Promise.resolve({ id: p.id }) } as any)) as Promise<Response>;
    const r = await post({ kind: "stock_photo", aspect: "4:5", topic: "  escape game ", count: 2, allowGenerate: false, broad: true, silhouettes: true });
    expect(r.status).toBe(200);
    const payload = json<any>(getJob((await r.json()).jobId)!.payload, {});
    expect(payload.request).toMatchObject({ allowGenerate: false, count: 2, bankSearch: { typed: "escape game", broad: true, silhouettes: true } });
    expect(payload.request.noStock).toBeUndefined();
    // Création par l'IA : jamais de recherche du client ni de photo libre.
    const g = await post({ kind: "ambiance", aspect: "4:5", topic: "escape game", allowGenerate: true, broad: true });
    const gp = json<any>(getJob((await g.json()).jobId)!.payload, {});
    expect(gp.request.bankSearch).toBeUndefined();
    expect(gp.request.noStock).toBe(true);
  });

  it("le texte tapé est cherché tel quel (anglais et français) ; recherche élargie : chaque mot aussi seul", async () => {
    expect(typedQueries("escape game")).toEqual([{ q: "escape game", lang: "en" }, { q: "escape game", lang: "fr" }]);
    expect(typedQueries("escape game", true)).toEqual([{ q: "escape game", lang: "en" }, { q: "escape game", lang: "fr" }, { q: "escape", lang: "en" }, { q: "game", lang: "en" }]);

    // « escape » seul dans les mots-clés : retenu seulement en recherche élargie (un seul mot cité suffit).
    const results = (q: string) => (q === "escape" ? [candidate("cle", "old key, escape, padlock, mystery")] : []);
    const p1 = noPeople();
    const calls1: string[] = [];
    const strict = mockDeps({ providers: [mockProvider("pixabay", results, calls1)], canReview: false, canGenerate: false });
    const e = await failure(search(p1.id, strict.deps, { typed: "escape game" }));
    expect(calls1.slice(0, 2)).toEqual(["escape game", "escape game"]);
    expect(calls1).not.toContain("escape");
    expect(e).toBeInstanceOf(UserFacingError);

    const p2 = noPeople();
    const calls2: string[] = [];
    const broad = mockDeps({ providers: [mockProvider("pixabay", results, calls2)], canReview: false, canGenerate: false });
    const r = await search(p2.id, broad.deps, { typed: "escape game", broad: true });
    expect(calls2.slice(0, 4)).toEqual(["escape game", "escape game", "escape", "game"]);
    expect(r.outcomes[0]).toMatchObject({ origin: "stock" });
    expect(json<any>(getAsset(r.outcomes[0].assetId!)!.meta, {}).stock).toMatchObject({ id: "cle" });
    expect(broad.log.generations).toHaveLength(0);
  });

  it("silhouettes : sans la case, aucune photo de personne ; avec la case, la silhouette est gardée et signalée, un visage jamais", async () => {
    const results = () => [candidate("ombre", "man, silhouette, escape room, door, backlit"), candidate("visage", "man, face, portrait, silhouette, escape room")];
    const p1 = noPeople();
    const off = mockDeps({ providers: [mockProvider("pixabay", results)], canReview: true, canGenerate: true });
    const e = await failure(search(p1.id, off.deps, { typed: "escape room" }));
    expect(off.log.downloads).toEqual([]);
    expect(off.log.generations).toEqual([]);
    expect(e.message).toMatch(/2 photos trouvées sur Pixabay, écartées \(2 avec des personnes/);
    expect(e.message).toContain("cochez « Accepter les silhouettes »");

    const p2 = noPeople();
    const seen: (boolean | undefined)[] = [];
    // Le contrôle visuel voit bien une silhouette : elle n'est pas refusée pour « personne visible » (case cochée).
    const on = mockDeps({ providers: [mockProvider("pixabay", results)], canReview: true, canGenerate: true, reviewFor: (_k, brief) => (seen.push(brief.people), review(8.5, { personVisible: true })) });
    const r = await search(p2.id, on.deps, { typed: "escape room", silhouettes: true });
    expect(on.log.downloads).toEqual(["ombre"]);
    expect(seen).toEqual([true]);
    expect(r.outcomes[0]).toMatchObject({ verdict: "FINAL", origin: "stock" });
    const m = json<any>(getAsset(r.outcomes[0].assetId!)!.meta, {});
    expect(m.stock).toMatchObject({ id: "ombre", silhouette: true });
    expect(m.recipe).toMatch(/silhouette \(personne de dos ou dans l'ombre, visage non visible\)/);
    expect(on.log.generations).toEqual([]);
  });

  it("photo « ai generated » de Pixabay : proposée et marquée « créée par l'IA » ; badge de la banque", async () => {
    setSetting("provider.pixabay.apiKey", "cle-de-test", true);
    setSetting("provider.pixabay.disabled", null);
    process.env.STOCK_OFFLINE = "0";
    try {
      vi.stubGlobal("fetch", async (u: string | URL) => {
        const url = new URL(String(u));
        if (url.hostname !== "pixabay.com") throw new Error(`réseau interdit : ${url.hostname}`);
        const hits = [{ id: 7, tags: "ai generated, escape room, door", largeImageURL: "https://cdn.pixabay.com/7.jpg", webformatURL: "https://cdn.pixabay.com/7s.jpg", pageURL: "https://pixabay.com/7", user: "x", imageWidth: 2400, imageHeight: 1600 }];
        return new Response(JSON.stringify({ hits }), { headers: { "content-type": "application/json" } });
      });
      const pixabay = STOCK_PROVIDERS.find((s) => s.id === "pixabay")!;
      const got = await pixabay.search("escape room", "landscape", "en");
      expect(got[0]).toMatchObject({ id: "7", aiGenerated: true });
    } finally {
      process.env.STOCK_OFFLINE = "1";
    }

    const p = noPeople();
    const ai = mockDeps({ providers: [mockProvider("pixabay", () => [{ ...candidate("ia", "ai generated, escape room, door"), aiGenerated: true }])], canReview: true, canGenerate: true });
    const r = await search(p.id, ai.deps, { typed: "escape room" });
    const m = json<any>(getAsset(r.outcomes[0].assetId!)!.meta, {});
    expect(m.stock).toMatchObject({ id: "ia", aiGenerated: true });
    expect(m.recipe).toMatch(/photo créée par l'IA \(publiée sur la banque\), pas une prise de vue réelle/);

    const src = fs.readFileSync("src/components/studio/tab-images.tsx", "utf8");
    expect(src).toContain('a.meta?.stock?.aiGenerated && t("créée par l\'IA", "AI-made")');
    expect(src).toContain('a.meta?.stock?.silhouette && t("silhouette", "silhouette")');
  });

  it("rien de retenu : combien trouvées, pourquoi écartées, cases à cocher proposées (FR et EN) ; aucune image créée", async () => {
    const d = { ...emptyBankPhotoDiag(), found: 12, people: 5, offTopic: 4, rejected: 3 };
    const m = await fr(() => noPhotoMessage(d, "escape game", false));
    expect(m).toBe("Aucune photo retenue pour « escape game » : 12 photos trouvées sur Pixabay, écartées (5 avec des personnes (votre projet n'autorise pas les personnes ; cochez « Accepter les silhouettes » pour les photos de dos ou dans l'ombre), 4 hors sujet (mots-clés sans rapport avec « escape game » ni votre activité), 3 refusées au contrôle de l'image). Cochez « Recherche élargie » ou essayez d'autres mots.");
    const m2 = await en(() => noPhotoMessage(d, "escape game", true, true));
    expect(m2).toContain("No photo kept for \"escape game\": 12 photos found on Pixabay");
    expect(m2).not.toContain("Allow silhouettes");
    expect(m2).toContain("Try other words or upload your own photos.");
    expect(await fr(() => noPhotoMessage({ ...emptyBankPhotoDiag(), noKey: true }, "x", false))).toMatch(/aucune clé Pixabay/);
    expect(await fr(() => noPhotoMessage(emptyBankPhotoDiag(), "porte secrète", false))).toMatch(/Pixabay n'a aucune photo pour « porte secrète »/);

    // Moteur : photos hors sujet seulement → message avec le compte ; aucune génération (pas d'image IA à la place).
    const p = noPeople();
    const deps = mockDeps({ providers: [mockProvider("pixabay", (q) => (q === "escape game" ? [candidate("mur", "white wall texture"), candidate("brique", "brick wall")] : []))], canReview: false, canGenerate: true });
    const e = await failure(search(p.id, deps.deps, { typed: "escape game" }, 2));
    expect(e).toBeInstanceOf(UserFacingError);
    expect(e.message).toMatch(/Aucune photo retenue pour « escape game » : 2 photos trouvées sur Pixabay, écartées \(2 hors sujet/);
    expect(e.message).toContain("Cochez « Recherche élargie »");
    expect(deps.log.generations).toEqual([]);
  });

  it("fenêtres ouvertes avant le chargement du projet : remontées quand l'activité est connue (« Type » juste)", () => {
    const src = fs.readFileSync("src/components/studio/tab-images.tsx", "utf8");
    // Le « Type » proposé est fixé au premier affichage (services → photo du métier, produits → univers) : sans clé
    // liée à l'activité, une fenêtre ouverte avant le chargement gardait le type d'une boutique pour un service.
    expect(src).toMatch(/<SearchPhotos key=\{services \? "services" : "products"\}/);
    expect(src).toMatch(/<CreateImage key=\{services \? "services" : "products"\}/);
    expect(src).toMatch(/useState\(\{ kind: services \? "trade_photo" : "ambiance"/);
  });
});
