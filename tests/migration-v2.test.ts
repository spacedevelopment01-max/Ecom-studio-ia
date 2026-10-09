/**
 * Migration V1 → V2 : les parcours clients appellent réellement les moteurs V2 (aucun appel d'IA, fournisseurs absents).
 *  - création complète : logo par Brand & Logo Engine V2 (version du studio provisoire sans IA, jamais présentée comme
 *    finale), aucune nouvelle piste de l'ancien moteur ;
 *  - images : jeu d'images orchestré par Image Engine V2 (composants locaux seulement + moteur V2) ;
 *  - calendrier de la création : Social V2, une seule fois par projet (reprise sans doublon) ;
 *  - anciennes routes : plus de nouvelle génération V1 ; l'ancien point d'accès des publications ne contourne pas V2 ;
 *  - textes : les documents SEO V2 sont la référence de la boutique ; un article modifié par le client n'est jamais écrasé.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const calls: { set: unknown[]; v2: { kind: string; allowGenerate?: boolean }[] } = { set: [], v2: [] };
vi.mock("@/lib/engine/images", async (orig) => {
  const real = await orig<typeof import("@/lib/engine/images")>();
  return { ...real, generateImageSet: async (_ctx: unknown, _pid: string, opts: unknown) => (calls.set.push(opts), { created: ["local-1"] }) };
});
vi.mock("@/lib/image-v2/engine", async (orig) => {
  const real = await orig<typeof import("@/lib/image-v2/engine")>();
  return { ...real, runImageEngineV2: async (_ctx: unknown, _pid: string, req: { kind: string; allowGenerate?: boolean }) => (calls.v2.push(req), { runId: "r", outcomes: [], search: [], stats: {}, stoppedByCostCap: false, costMicro: 0, notes: [] }) };
});

let sessionUser: any = null;
vi.mock("@/lib/auth", async (orig) => {
  const real = await orig<typeof import("@/lib/auth")>();
  return { ...real, currentUser: async () => sessionUser, requireUser: async () => sessionUser ?? (() => { throw new real.HttpError(401, "Connexion requise."); })() };
});

beforeEach(() => {
  calls.set.length = 0;
  calls.v2.length = 0;
});

describe("migration V1 → V2 : moteurs réellement appelés", async () => {
  const { createUser } = await import("@/lib/auth");
  const { all, id, now, one, run } = await import("@/lib/db");
  const { JobContext } = await import("@/lib/jobs");
  const { loadProject, saveBrand, remember } = await import("@/lib/projects");
  const { getSubscription, alignPeriod, syncAllowance } = await import("@/lib/billing");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { seedThemeScenario } = await import("./theme-v2-fixtures");
  const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);

  const u = await createUser(`migr${Date.now()}@test.fr`, "motdepasse-test", "M");
  run("UPDATE users SET role = 'client' WHERE id = ?", u.id);
  getSubscription(u.id);
  run("UPDATE subscriptions SET status = 'active', plan = 'dominer' WHERE user_id = ?", u.id);
  alignPeriod(u.id, Date.now());
  syncAllowance(u.id);
  const ctxFor = (pid: string, type = "pipeline.run") => {
    const jid = id();
    run("INSERT INTO jobs (id, user_id, project_id, type, label, status, payload, checkpoint, run_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)", jid, u.id, pid, type, "test", "running", JSON.stringify({ projectId: pid }), "{}", now(), now(), now());
    return new JobContext(one<any>("SELECT * FROM jobs WHERE id = ?", jid));
  };
  const req = (url: string, body?: object, method = "POST") => new Request(`http://localhost:3000${url}`, { method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ctx = (params: Record<string, string>) => ({ params: Promise.resolve(params) }) as any;

  it("création complète — marque : logo par Brand & Logo Engine V2, aucune piste de l'ancien moteur", async () => {
    const pid = await fr(() => seedThemeScenario(u.id, "cosmetic"));
    const before = all("SELECT id FROM assets WHERE project_id = ? AND role = 'logo-proposal'", pid).length;
    const { buildBrand } = await import("@/lib/engine/brand");
    await fr(() => buildBrand(ctxFor(pid), pid, {}));
    const b = loadProject(pid).brand!;
    expect(b.logo.engine).toBe("v2");
    // Sans IA : version du studio appliquée comme logo PROVISOIRE, jamais présentée comme finale.
    expect(b.logo.provisional).toBe(true);
    expect(b.logo.status).toBe("proposed");
    expect(all("SELECT id FROM assets WHERE project_id = ? AND role = 'logo-v2-studio'", pid).length).toBeGreaterThan(0);
    expect(all("SELECT id FROM assets WHERE project_id = ? AND role = 'logo-v2'", pid)).toHaveLength(0);
    expect(all("SELECT id FROM assets WHERE project_id = ? AND role = 'logo-proposal'", pid).length).toBe(before);
    // Le logo appliqué alimente le site (déclinaisons).
    expect(one("SELECT 1 FROM assets WHERE project_id = ? AND role = 'logo' AND id = ?", pid, b.logo.assetId)).toBeTruthy();
    // Changement de nom : le même logo V2 est reconstruit (sans IA), toujours provisoire.
    const { reapplyLogoV2 } = await import("@/lib/logo-v2/choose");
    saveBrand(pid, { ...b, name: "Nouveau Nom" });
    expect(await fr(() => reapplyLogoV2(null, pid))).toBe(true);
    expect(loadProject(pid).brand!.logo.provisional).toBe(true);
    // Un logo validé par le client n'est jamais remplacé par la création complète.
    const { applyBestLogoV2 } = await import("@/lib/logo-v2/choose");
    saveBrand(pid, { ...loadProject(pid).brand!, validated: ["logo"], logo: { ...loadProject(pid).brand!.logo, status: "validated" } });
    expect(await fr(() => applyBestLogoV2(null, pid, [{ assetId: "x", verdict: "FINAL", score: 9 }]))).toBeNull();
  }, 120_000);

  it("images : jeu orchestré par Image Engine V2 (composants locaux seulement, univers et photos en situation par V2)", async () => {
    const pid = await fr(() => seedThemeScenario(u.id, "cosmetic"));
    const { runImageSetV2 } = await import("@/lib/image-v2/set");
    await fr(() => runImageSetV2(ctxFor(pid, "images.generate"), pid));
    expect(calls.set).toEqual([{ localOnly: true }]);
    expect(calls.v2.map((r) => r.kind)).toEqual(["ambiance", "lifestyle", "lifestyle"]);
    expect(calls.v2[0].allowGenerate).toBe(false); // univers : recherche de photos libres seulement
  });

  it("calendrier de la création : Social V2, une seule fois par projet — une reprise ne crée aucun doublon", async () => {
    const pid = await fr(() => seedThemeScenario(u.id, "cosmetic"));
    run("DELETE FROM content_plans WHERE project_id = ?", pid);
    run("DELETE FROM posts WHERE project_id = ?", pid);
    const { startWeekCalendar, creationPlanId } = await import("@/lib/engine/pipeline");
    await fr(() => startWeekCalendar(ctxFor(pid), pid));
    const n = all<{ engine: string }>("SELECT engine FROM posts WHERE project_id = ?", pid);
    expect(n.length).toBeGreaterThanOrEqual(7);
    expect(n.every((x) => x.engine === "v2")).toBe(true);
    expect(one("SELECT 1 FROM content_plans WHERE id = ? AND engine = 'v2'", creationPlanId(pid))).toBeTruthy();
    // « Suite de la création » : nouvelle tâche, même projet → aucun second calendrier.
    await fr(() => startWeekCalendar(ctxFor(pid), pid));
    expect(all("SELECT id FROM posts WHERE project_id = ?", pid)).toHaveLength(n.length);
    expect(all("SELECT id FROM content_plans WHERE project_id = ?", pid)).toHaveLength(1);
    // Ancien projet qui a déjà un calendrier (ancien moteur) : rien de plus.
    const pid2 = await fr(() => seedThemeScenario(u.id, "artisan"));
    run("INSERT INTO content_plans (id, project_id, params, status, created_at) VALUES (?,?,?,?,?)", id(), pid2, "{}", "done", now());
    const before = all("SELECT id FROM posts WHERE project_id = ?", pid2).length;
    await fr(() => startWeekCalendar(ctxFor(pid2), pid2));
    expect(all("SELECT id FROM posts WHERE project_id = ?", pid2)).toHaveLength(before);
  }, 120_000);

  it("anciennes routes : plus de nouvelle génération V1 ; l'ancien point d'accès des publications ne contourne pas V2", async () => {
    const pid = await fr(() => seedThemeScenario(u.id, "cosmetic"));
    sessionUser = { ...u, role: "client" };
    const plans = await import("@/app/api/projects/[id]/plans/route");
    expect((await plans.POST(req(`/api/projects/${pid}/plans`, {}), ctx({ id: pid }))).status).toBe(410);
    const ugc = await import("@/app/api/projects/[id]/ugc/route");
    expect((await ugc.POST(req(`/api/projects/${pid}/ugc`, {}), ctx({ id: pid }))).status).toBe(410);
    const full = await import("@/app/api/projects/[id]/brand/full-logo/route");
    expect((await full.POST(req(`/api/projects/${pid}/brand/full-logo`, { action: "create" }), ctx({ id: pid }))).status).toBe(410);
    const images = await import("@/app/api/projects/[id]/images/route");
    expect((await images.POST(req(`/api/projects/${pid}/images`, { mode: "single", kind: "ad" }), ctx({ id: pid }))).status).toBe(410);
    const amb = await images.POST(req(`/api/projects/${pid}/images`, { mode: "single", kind: "scene", useAi: true, format: "landscape" }), ctx({ id: pid }));
    expect((await amb.json()).engine).toBe("image-v2");
    expect(one<{ type: string }>("SELECT type FROM jobs WHERE project_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 1", pid)!.type).toBe("image.v2");
    // Publications : création manuelle = Social V2 ; ancienne route : approbation d'une V2 refusée, copie V2.
    const posts = await import("@/app/api/projects/[id]/posts/route");
    const created = await (await posts.POST(req(`/api/projects/${pid}/posts`, { network: "instagram", format: "image", caption: "Bonjour" }), ctx({ id: pid }))).json();
    const row = one<{ engine: string; status: string; content_hash: string | null }>("SELECT engine, status, content_hash FROM posts WHERE id = ?", created.id)!;
    expect(row).toMatchObject({ engine: "v2", status: "review" });
    expect(row.content_hash).toBeTruthy();
    const legacy = await import("@/app/api/posts/[pid]/route");
    expect((await legacy.POST(req(`/api/posts/${created.id}`, { action: "approve" }), ctx({ pid: created.id }))).status).toBe(409);
    expect((await legacy.PATCH(req(`/api/posts/${created.id}`, { caption: "x" }, "PATCH"), ctx({ pid: created.id }))).status).toBe(409);
    const old = id();
    run("INSERT INTO posts (id, project_id, network, format, status, scheduled_at, timezone, caption, media, publish_key, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)", old, pid, "instagram", "image", "draft", now() + 86_400_000, "Europe/Paris", "Ancienne", "[]", `k-${old}`, now(), now());
    expect((await legacy.POST(req(`/api/posts/${old}`, { action: "regenerate" }), ctx({ pid: old }))).status).toBe(410);
    const dup = await (await legacy.POST(req(`/api/posts/${old}`, { action: "duplicate" }), ctx({ pid: old }))).json();
    expect(one<{ engine: string }>("SELECT engine FROM posts WHERE id = ?", dup.id)!.engine).toBe("v2");
    // L'ancienne publication reste (historique conservé).
    expect(one("SELECT 1 FROM posts WHERE id = ?", old)).toBeTruthy();
    sessionUser = null;
  }, 120_000);

  it("textes : le document SEO V2 est la référence de la boutique ; le kit ne complète que le reste", async () => {
    const pid = await fr(() => seedThemeScenario(u.id, "cosmetic"));
    const { localCopy } = await import("@/lib/engine/local-copy");
    const p = loadProject(pid);
    remember(pid, { kind: "artifact", key: "shop_copy", value: JSON.stringify(fr(() => localCopy(p.product, p.brand!, p))), source: "local", status: "confirmed" });
    const { runContentEngineV2 } = await import("@/lib/seo-v2/engine");
    const r = await fr(() => runContentEngineV2(null, pid, { type: "product_page", lang: "fr" }));
    expect(r.doc).toBeTruthy();
    const { savedCopy } = await import("@/lib/engine/shop");
    const copy = savedCopy(pid)!;
    const h1 = r.doc!.blocks.find((b) => b.kind === "h1") as { text: string } | undefined;
    if (h1) expect(copy.product.title).toBe(h1.text);
    expect(copy.seo.title).toBe(r.doc!.meta.seoTitle);
    // Modification du client dans l'éditeur V2 : c'est elle que la boutique affiche.
    const { saveUserEdit } = await import("@/lib/seo-v2/engine");
    const edited = { ...r.doc!, blocks: r.doc!.blocks.map((b) => (b.kind === "h1" ? { ...b, text: "Titre écrit par le client" } : b)) };
    await fr(() => saveUserEdit(pid, r.docKey!, edited as any, "modification du client"));
    expect(savedCopy(pid)!.product.title).toBe("Titre écrit par le client");
  }, 120_000);

  it("blog : un article modifié par le client dans l'onglet Blog n'est jamais écrasé par une nouvelle rédaction V2", async () => {
    const pid = await fr(() => seedThemeScenario(u.id, "cosmetic"));
    const { saveBlogDraftV2 } = await import("@/lib/seo-v2/blog");
    const { runContentEngineV2 } = await import("@/lib/seo-v2/engine");
    const r = await fr(() => runContentEngineV2(null, pid, { type: "blog_article", lang: "fr", request: "conseils d'utilisation" }));
    const aid = one<{ id: string }>("SELECT id FROM blog_articles WHERE project_id = ? AND id LIKE 'b2%'", pid)!.id;
    run("UPDATE blog_articles SET body_html = ? WHERE id = ?", "<p>Texte du client</p>", aid);
    saveBlogDraftV2(loadProject(pid), r.docKey!, r.doc!, { notes: [], ai: false, jobKey: "t" });
    expect(one<{ body_html: string }>("SELECT body_html FROM blog_articles WHERE id = ?", aid)!.body_html).toBe("<p>Texte du client</p>");
  }, 120_000);
});
