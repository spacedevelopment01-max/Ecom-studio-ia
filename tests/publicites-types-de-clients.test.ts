/**
 * Publicités (décisions du 22 novembre 2026, au nom des règles du propriétaire) : une publicité par type de client, les
 * angles en réserve servant après l'angle choisi ; un budget d'essai dit en conseil, sans promesse ; le titre Meta à 27
 * caractères contrôlé par le code ; le tutoriel au tutoiement ; le marqueur posé par le Studio dans les liens.
 * Tout est simulé : aucun appel payant, aucune publicité lancée, aucune dépense de diffusion.
 */
import { describe, expect, it } from "vitest";

describe("Publicités : un type de client par publicité, budget conseillé, titre Meta, tutoiement, marqueur", async () => {
  const { createUser } = await import("@/lib/auth");
  const { all, id, json, now, one, run } = await import("@/lib/db");
  const { loadProject } = await import("@/lib/projects");
  const { JobContext } = await import("@/lib/jobs");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { getAsset } = await import("@/lib/library");
  const { adInsight } = await import("@/lib/ads-v2/insight");
  const { anglesParTypeDeClient } = await import("@/lib/ads-v2/angles");
  const { localCopy, copyPrompt } = await import("@/lib/ads-v2/copy");
  const { claimIssues } = await import("@/lib/ads-v2/claims");
  const { strictestText, PLATFORM_SPECS } = await import("@/lib/ads-v2/platforms");
  const { runAdEngineV2 } = await import("@/lib/ads-v2/engine");
  const { lienAvecMarqueur, sourceDuReseau } = await import("@/lib/ads-v2/marqueur");
  const { honestTestBudget, META_HEADLINE_MAX, TEST_BUDGET_PER_DAY } = await import("@/lib/engine/ad-craft");
  const { localAdStrategy } = await import("@/lib/engine/ads");
  const { clientTypesOf } = await import("@/lib/syna-agent/angles");
  const { adsCount } = await import("@/lib/syna-agent/tools/steps-late");
  const tutorial = (await import("@/lib/tutorials/publicites")).default;
  const { IMAGE_FIXTURES, seedImageFixture } = await import("./image-v2-fixtures");
  const { mockAdDeps } = await import("./ads-v2-mock");
  const { grantProjectPlan } = await import("./communication-choice-fixture");
  void IMAGE_FIXTURES;
  const fr = <T,>(fn: () => Promise<T> | T) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());

  const u = await createUser(`pub-types-${Date.now()}@test.fr`, "motdepasse-test", "P");
  const fresh = () => { const pid = seedImageFixture(u.id, "cosmetic"); grantProjectPlan(pid, "dominer"); return loadProject(pid); };
  const job = (projectId: string) => {
    const jid = id();
    run("INSERT INTO jobs (id, user_id, project_id, type, label, payload, status, run_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)", jid, u.id, projectId, "ads.v2", "test", "{}", "running", now(), now(), now());
    return new JobContext(one<any>("SELECT * FROM jobs WHERE id = ?", jid));
  };
  const type = (angleId: string, name: string, chosen = false) => ({ angleId, name, who: `${name}, qui cherche un soin simple`, wants: "un geste rapide", featured: "Sérum Éclat", argument: `Pensé pour ${name.toLowerCase()}`, message: `Le soin de ${name.toLowerCase()}`, emotion: "calme", chosen });
  const angle = (id: string, client: string) => ({ id, title: `Angle ${id}`, audience: client, motivation: "", message: `Accroche ${id}`, emotion: "joie", proofsToConfirm: [], arguments: [], sources: [], goal: "", why: "", story: "", show: "", organicExample: "", cta: "", client: { name: client, who: `${client} en situation`, wants: "aller vite", needs: "du simple" } });

  it("les types de clients des angles : le choisi d'abord, puis les autres montrés, puis la réserve ; jamais deux fois le même", () => {
    const j = { angles: { list: [angle("sur", "Les parents pressés"), angle("emotion", "Les cadeaux de dernière minute"), angle("audacieux", "Les sportives du matin"), angle("r1", "Les parents pressés"), angle("r2", "Les grands-parents")], shown: [{ id: "sur", role: "sur" }, { id: "emotion", role: "emotion" }, { id: "audacieux", role: "audacieux" }], reserve: ["r1", "r2"], recommendedId: "sur", recommendation: "", sourceCount: 0, at: 1 }, angleChoice: { id: "emotion", at: 1 } } as any;
    const t = clientTypesOf(j);
    expect(t.map((x) => x.name)).toEqual(["Les cadeaux de dernière minute", "Les parents pressés", "Les sportives du matin", "Les grands-parents"]);
    expect(t.map((x) => x.chosen)).toEqual([true, false, false, false]);
    expect(clientTypesOf({ angles: undefined } as any)).toEqual([]);
    // Jamais plus de publicités que de types de clients connus.
    expect(adsCount(3, 2)).toBe(2);
    expect(adsCount(undefined, 4)).toBe(3);
    expect(adsCount(5, 0)).toBe(5);
  });

  it("une publicité par type de client, avec un levier différent, et le rédacteur sait à qui parle chacune", async () => {
    const p = fresh();
    const i = await fr(() => adInsight(p));
    const clients = [type("emotion", "Les cadeaux de dernière minute", true), type("sur", "Les parents pressés"), type("sur2", "LES PARENTS PRESSÉS"), type("audacieux", "Les sportives du matin")];
    const r = anglesParTypeDeClient(i, clients, 3);
    expect(r.angles.length).toBeGreaterThan(0);
    const names = r.angles.map((a) => a.client!.name);
    expect(new Set(names.map((n) => n.toLowerCase())).size).toBe(names.length);
    expect(names[0]).toBe("Les cadeaux de dernière minute");
    expect(new Set(r.angles.map((a) => a.type)).size).toBe(r.angles.length);
    expect(new Set(r.angles.map((a) => a.id)).size).toBe(r.angles.length);
    // Deux types de clients connus : deux publicités, jamais une troisième pour le même type.
    expect(anglesParTypeDeClient(i, clients.slice(0, 2), 3).angles.length).toBeLessThanOrEqual(2);
    const prompt = copyPrompt(i, r.angles);
    expect(prompt).toMatch(/POUR : Les cadeaux de dernière minute[\s\S]*\(angle choisi par le client\)/);
    expect(prompt).toMatch(/POUR : Les parents pressés[\s\S]*\(angle en réserve\)/);
    expect(prompt).toMatch(/jamais deux annonces pour le même type de client/);
    // Version sans IA : chaque publicité prend l'accroche de SON angle.
    const limits = strictestText(["meta_feed"]);
    const hooks = r.angles.map((a) => localCopy(i, a, "fr", limits).hook);
    expect(new Set(hooks).size).toBe(hooks.length);
  });

  it("moteur des publicités (simulé) : le type de client et le lien marqué sont gardés avec chaque création", async () => {
    const p = fresh();
    const { deps } = mockAdDeps({ userId: u.id, projectId: p.id });
    const clients = [type("emotion", "Les cadeaux de dernière minute", true), type("sur", "Les parents pressés")];
    const r = await fr(() => runAdEngineV2(job(p.id), p.id, { count: 3, platforms: ["meta_feed"], clientTypes: clients }, deps));
    expect(r.concepts.length).toBeLessThanOrEqual(2);
    expect(r.concepts.map((c) => c.angle.client?.name)).toEqual(["Les cadeaux de dernière minute", "Les parents pressés"].slice(0, r.concepts.length));
    expect(r.notes.join(" ")).toMatch(/une par type de client/);
    expect(r.strategy.audiences[0].name).toBe("Les cadeaux de dernière minute");
    const made = r.outcomes.filter((o) => o.assetId);
    expect(made.length).toBeGreaterThan(0);
    const meta = json<any>(getAsset(made[0].assetId!)!.meta as any, {}).adV2;
    expect(meta.angle.client).toBeTruthy();
    // Aucun site en ligne pour ce projet : aucun lien inventé (le lien marqué n'existe qu'avec un site en ligne).
    const { adressePubliqueDuSite } = await import("@/lib/sites/store");
    expect(adressePubliqueDuSite(p.id)).toBeNull();
    expect(meta.link ?? null).toBeNull();
    void all;
  });

  it("site en ligne : chaque création garde le lien de son site avec le marqueur de sa publicité", async () => {
    const p = fresh();
    const { ensureSiteTables } = await import("@/lib/sites/store");
    ensureSiteTables();
    const pub = id(), host = `essai-${pub.slice(0, 8)}.sites.example`;
    run("INSERT INTO site_publications (id, project_id, user_id, number, theme_version_id, spec_hash, theme_fingerprint, code_commit, status, pages, bytes, manifest_sha, origin, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)", pub, p.id, u.id, 1, "t", "s", "f", "c", "ready", 1, 1, "m", "test", now());
    run("INSERT INTO site_live (project_id, publication_id, updated_at) VALUES (?,?,?)", p.id, pub, now());
    run("INSERT INTO site_addresses (hostname, project_id, kind, status, created_at) VALUES (?,?,?,?,?)", host, p.id, "studio", "active", now());
    const { deps } = mockAdDeps({ userId: u.id, projectId: p.id });
    const r = await fr(() => runAdEngineV2(job(p.id), p.id, { count: 1, platforms: ["meta_feed"], clientTypes: [type("emotion", "Les cadeaux de dernière minute", true)] }, deps));
    const made = r.outcomes.find((o) => o.assetId)!;
    const link = new URL(json<any>(getAsset(made.assetId!)!.meta as any, {}).adV2.link);
    expect(link.hostname).toBe(host);
    expect(link.searchParams.get("utm_source")).toBe("meta");
    expect(link.searchParams.get("utm_content")).toBe("les-cadeaux-de-derniere-minute");
    expect(link.searchParams.get("utm_campaign")).toMatch(/^publicites-\d{4}-\d{2}$/);
  });

  it("titre Meta : 27 caractères au plus, contrôlé par le code", async () => {
    expect(META_HEADLINE_MAX).toBe(27);
    expect(PLATFORM_SPECS.meta_feed.text.headline).toBe(27);
    expect(PLATFORM_SPECS.meta_story.text.headline).toBe(27);
    expect(strictestText(["meta_feed", "pinterest"]).headline).toBe(27);
    const p = fresh();
    const i = await fr(() => adInsight(p));
    const copy = { hook: "Le soin du soir", hookB: null, primary: "Le soin du soir.", headline: "Un titre bien trop long pour Meta", description: "Sérum", cta: "Acheter" };
    const issues = await fr(() => claimIssues([{ id: "a", copy }], p, i, strictestText(["meta_feed"])).get("a")!);
    expect(issues.map((x) => x.fix).join(" ")).toMatch(/titre de 33 caractères : 27 au plus/);
    const ok = await fr(() => claimIssues([{ id: "a", copy: { ...copy, headline: "Le soin du soir" } }], p, i, strictestText(["meta_feed"])).get("a")!);
    expect(ok.filter((x) => x.field === "headline" && x.code === "length")).toEqual([]);
  });

  it("budget d'essai : un conseil, un seul ensemble de 5 à 20 € par jour, au tutoiement, sans promesse ni dépense du Studio", async () => {
    const p = fresh();
    const b = honestTestBudget(p, "fr");
    expect(TEST_BUDGET_PER_DAY).toEqual([5, 20]);
    expect(b.daily).toMatch(/^Conseil : un seul ensemble d'annonces, entre 5\s?€ et 20\s?€ par jour au total/);
    expect(b.total).toMatch(/35\s?€ à 140\s?€/);
    expect(b.note).toMatch(/pas une garantie : aucun résultat .* n'est promis/);
    expect(b.note).toMatch(/Le Studio ne dépense rien et ne lance rien/);
    const all = Object.values(b).join(" ");
    expect(all).not.toMatch(/\bvous\b|\bvotre\b|\bvos\b|Coupez|dupliquez/);
    expect(all).not.toMatch(/garanti(?!e)|vous allez|tu vas vendre|ROAS de \d/i);
    const s = await fr(() => localAdStrategy(p, "fr", { count: 2, clientTypes: [{ name: "Les parents pressés", who: "Parents du matin" }, { name: "Les grands-parents", who: "Ceux qui offrent" }] }));
    expect(s.structure.join(" ")).toMatch(/Un seul ensemble d'annonces en ciblage large, avec les 2 annonces dedans \(une par type de client\)/);
    expect(s.structure.join(" ")).not.toMatch(/ensembles d'annonces \(un par audience\)/);
    expect(s.audiences.map((a) => a.name)).toEqual(["Les parents pressés", "Les grands-parents", "Ciblage large"]);
  });

  it("le tutoriel des publicités tutoie le client (plus aucun « vous »)", () => {
    const fr = [tutorial.summary.fr, ...tutorial.steps.map((x) => x.fr), ...(tutorial.faq ?? []).flatMap((x) => [x.q.fr, x.a.fr])].join(" ");
    expect(fr).not.toMatch(/\b(vous|votre|vos)\b|\b(Donnez|Choisissez|Décrivez|Relisez|Importez|Remplacez|réglez|cochez|enregistrez)\b/);
    expect(fr).toMatch(/\btes\b|\bta\b|\bton\b|\btoi\b/);
  });

  it("le marqueur : utm_source, utm_medium, utm_campaign et utm_content ajoutés par le code, sans rien écraser", () => {
    const l = lienAvecMarqueur("https://atelier-rive.example/produits/serum?couleur=rose", { reseau: "meta_feed", campagne: "Publicités 2026-11", contenu: "Les parents pressés" })!;
    const u = new URL(l);
    expect(u.searchParams.get("couleur")).toBe("rose");
    expect(u.searchParams.get("utm_source")).toBe("meta");
    expect(u.searchParams.get("utm_medium")).toBe("paid_social");
    expect(u.searchParams.get("utm_campaign")).toBe("publicites-2026-11");
    expect(u.searchParams.get("utm_content")).toBe("les-parents-presses");
    expect(new URL(lienAvecMarqueur("https://x.example/?utm_source=moi", { reseau: "tiktok", campagne: "c" })!).searchParams.get("utm_source")).toBe("moi");
    expect(sourceDuReseau("instagram")).toEqual({ source: "instagram", medium: "paid_social" });
    expect(sourceDuReseau("google_display")).toEqual({ source: "google", medium: "display" });
    expect(lienAvecMarqueur(null, { reseau: "meta_feed", campagne: "c" })).toBeNull();
    expect(lienAvecMarqueur("javascript:alert(1)", { reseau: "meta_feed", campagne: "c" })).toBeNull();
  });
});
