/**
 * Project Brain 2.0 (lecture seule) : instantané, vues par scope, niveaux ferme / souple / indication, budgets souple +
 * plafond, empreinte stable, contexte volatil, sécurité, route d'administration et nombre de requêtes SQL.
 * Projet de référence : Sébastien Blanc, plâtrier peintre (entreprise de services).
 */
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const jar = { token: "" };
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => (jar.token ? { value: jar.token } : undefined), set: () => {}, delete: () => {} }) }));

describe("Project Brain 2.0 — lecture seule", async () => {
  const { createUser } = await import("@/lib/auth");
  const { db, id, now, run } = await import("@/lib/db");
  const { localBrand } = await import("@/lib/engine/local");
  const { serviceProduct, serviceProfile } = await import("./fixtures");
  const { brainSnapshot, brainItems, contextFor, SCOPES } = await import("@/lib/brain");
  const { encrypt, sha256 } = await import("@/lib/secrets");

  const u = await createUser(`brain${Date.now()}@test.fr`, "motdepasse-test", "B");
  const PHONE = "06 12 34 56 78";
  const EMAIL = "contact@sebastien-blanc.test";
  const ADDRESS = "12 rue des Artisans, Mâcon";
  function project() {
    const product = {
      ...serviceProduct,
      name: "Sébastien Blanc",
      category: "Plâtrier peintre",
      sector: "batiment" as const,
      summary: "Entreprise artisanale : plâtrerie, plaques de plâtre, enduits, lissage, peinture intérieure, rénovation intérieure et finitions, pour les particuliers.",
      facts: [
        { key: "zone", label: "Zone", value: "Mâcon et alentours", status: "confirmed" as const, source: "user" as const },
        { key: "style", label: "Style de chantier", value: "chantiers propres", status: "inferred" as const, source: "ai" as const },
        { key: "experience", label: "Années d'expérience", value: "", status: "unknown" as const, source: "ai" as const },
      ],
    };
    const services = {
      ...serviceProfile,
      services: [
        { name: "Plâtrerie et plaques de plâtre", description: "pose de cloisons et faux plafonds" },
        { name: "Enduits et lissage", description: "préparation des murs et plafonds" },
        { name: "Peinture intérieure", description: "murs et plafonds" },
      ],
      area: "Mâcon et 30 km autour",
      address: ADDRESS,
      phone: PHONE,
      email: EMAIL,
      contactMode: "quote" as const,
      bookingUrl: "",
    };
    const { brand, strategy } = localBrand(product as any, "Sébastien Blanc", { business: "services", services } as any);
    const pid = id();
    run(
      "INSERT INTO projects (id, user_id, name, status, platform, product_json, brand_json, strategy_json, settings_json, sources_json, business_type, business_json, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      pid, u.id, "Sébastien Blanc", "ready", "shopify", JSON.stringify(product), JSON.stringify(brand), JSON.stringify(strategy), JSON.stringify({ language: "fr" }), "[]", "services", JSON.stringify(services), now(), now(),
    );
    return pid;
  }
  const asset = (pid: string, o: { role: string; name: string; meta?: object; status?: string; origin?: string }) => {
    const aid = id();
    run(
      "INSERT INTO assets (id, project_id, user_id, name, kind, role, mime, size, storage_key, origin, meta, status, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
      aid, pid, u.id, o.name, "image", o.role, "image/png", 10, `k/${aid}`, o.origin ?? "generated", JSON.stringify(o.meta ?? {}), o.status ?? "ready", now(),
    );
    return aid;
  };
  const check = (pid: string, o: { deliverable: string; verdict: string; blocking?: string[]; fatal?: string[]; checked?: number; checker?: string }) =>
    run(
      "INSERT INTO quality_checks (id, created_at, user_id, project_id, deliverable, attempt, checker, checked, score, criteria_json, blocking_json, fatal_json, feedback, verdict, fatal, action, reason, policy_version) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      id(), now(), u.id, pid, o.deliverable, 0, o.checker ?? "ai", o.checked ?? 1, 4, "{}", JSON.stringify(o.blocking ?? []), JSON.stringify(o.fatal ?? []), "", o.verdict, o.fatal?.length ? 1 : 0, "regenerate", "", "2026-10-p1b",
    );
  const memo = (pid: string, o: { kind: string; key: string; value: string; scope?: string; source?: string; status?: string }) =>
    run("INSERT INTO memory (id, project_id, kind, key, value, status, source, scope, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)", id(), pid, o.kind, o.key, o.value, o.status ?? "confirmed", o.source ?? "user", o.scope ?? "all", now(), now());
  const hashes = (pid: string) => Object.fromEntries(SCOPES.map((sc) => [sc, contextFor(brainSnapshot(pid), sc).hash]));

  let PID = "";
  beforeAll(() => {
    PID = project();
  });
  afterEach(() => {
    jar.token = "";
  });

  it("instantané : métier compris, offre, marque, compteurs ; les artefacts de la mémoire ne sont pas du contexte", () => {
    memo(PID, { kind: "artifact", key: "shop_copy", value: '{"hero":"texte"}', source: "ai" });
    const s = brainSnapshot(PID);
    expect(s.trade).toMatchObject({ id: "plasterer_painter", source: "combo", sector: "batiment" });
    expect(s.project.business).toBe("services");
    expect(s.memory.some((m) => m.kind === "artifact")).toBe(false);
    expect(s.currentLogo).toBeNull();
    expect(s.counts).toMatchObject({ memory: 0, qualityChecks: 0 });
  });

  it("aucune donnée secrète ; coordonnées seulement dans les vues site et textes de la boutique", () => {
    run("INSERT INTO connections (id, user_id, provider, external_id, name, access_token, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)", id(), u.id, "shopify", "x.myshopify.com", "X", encrypt(["shp", "at_", "secretjeton123456"].join("")), "active", now(), now());
    run("INSERT OR REPLACE INTO settings (key, value, secret, updated_at) VALUES (?,?,1,?)", "provider.braintest.apiKey", encrypt("sk-ant-cle-fictive-123456789"), now());
    const s = brainSnapshot(PID);
    const everything = JSON.stringify(s) + SCOPES.map((sc) => contextFor(s, sc).stable).join("\n");
    for (const secret of ["secretjeton123456", "sk-ant-cle-fictive", "access_token", "apiKey"]) expect(everything).not.toContain(secret);
    for (const sc of ["logo", "image", "stock", "seo", "blog", "social", "advertising", "video"] as const) {
      const v = contextFor(s, sc).stable;
      for (const c of [PHONE, EMAIL, ADDRESS]) expect(v).not.toContain(c);
    }
    expect(contextFor(s, "theme").stable).toContain(PHONE);
    expect(contextFor(s, "shop_copy").stable).toContain(EMAIL);
  });

  it("scopes : chaque vue ne contient que ce qui sert à sa tâche", () => {
    const s = brainSnapshot(PID);
    const logo = contextFor(s, "logo");
    expect(logo.stable).toContain("Sébastien Blanc");
    expect(logo.stable).toMatch(/plâtrier peintre/i);
    expect(logo.stable).toContain("Palette");
    expect(logo.stable).toMatch(/symbole : .*trowel/);
    for (const sec of ["strategy", "rules"]) expect(logo.sections).not.toContain(sec);
    expect(logo.stable).not.toContain("Messages clés");
    const stock = contextFor(s, "stock");
    expect(stock.stable).toContain("plasterer applying skim coat");
    expect(stock.stable).not.toContain("Palette");
    expect(stock.stable).not.toContain("Ton :");
    const theme = contextFor(s, "theme");
    expect(theme.stable).toContain("Prestations");
    expect(theme.stable).toContain("Règles des services");
    expect(theme.stable).not.toContain("Recherches de photos");
  });

  it("ferme / souple / indication : fait confirmé, inconnu, correction et refus du client = ferme ; préférence = souple ; déduction = indication", () => {
    const pid = project();
    memo(pid, { kind: "correction", key: "exterieur", value: "Nous ne faisons pas de rénovation extérieure" });
    memo(pid, { kind: "preference", key: "couleur", value: "je préfère du bleu" });
    memo(pid, { kind: "preference", key: "theme.style", value: "sections aérées", source: "ai", status: "inferred" });
    const items = brainItems(brainSnapshot(pid));
    const lvl = (idPrefix: string) => items.find((x) => x.id.startsWith(idPrefix))?.level;
    expect(lvl("fact.zone")).toBe("hard");
    expect(lvl("unknown.experience")).toBe("hard");
    expect(lvl("inferred.style")).toBe("advisory");
    expect(lvl("memory.correction.exterieur")).toBe("hard");
    expect(lvl("memory.preference.couleur")).toBe("soft");
    expect(lvl("memory.preference.theme.style")).toBe("advisory");
    expect(lvl("trade.profile")).toBe("advisory");
    // Une préférence n'est jamais un fait métier.
    expect(items.some((x) => x.id.startsWith("fact.") && /bleu/.test(String(x.text)))).toBe(false);
    // L'inconnu reste inconnu (jamais présenté comme un fait).
    const theme = contextFor(brainSnapshot(pid), "theme").stable;
    expect(theme).toMatch(/INCONNU — Années d'expérience : ne jamais l'inventer/);
    expect(theme).not.toMatch(/Fait CONFIRMÉ — Années d'expérience/);
    // Rendu : trois blocs distincts.
    expect(theme).toContain("### CONTRAINTES FERMES");
    expect(theme).toContain("### CONTRAINTES SOUPLES");
    expect(theme).toContain("### INDICATIONS");
  });

  it("budget souple : jamais de contrainte critique retirée ; dépassement signalé ; le secondaire part", () => {
    const s = brainSnapshot(PID);
    const v = contextFor(s, "brand", { budget: { soft: 100, hard: 1_000_000 } });
    const critical = brainItems(s).filter((x) => x.critical && (x.scopes === "*" || x.scopes.includes("brand")));
    expect(critical.length).toBeGreaterThan(3);
    for (const c of critical) expect(v.stable).toContain(c.text);
    expect(v.budgetExceeded).toBe(true);
    expect(v.dropped.length).toBeGreaterThan(0);
    expect(v.criticalDropped).toEqual([]);
    expect(v.hardCeilingReached).toBe(false);
  });

  it("plafond de sécurité : le secondaire d'abord ; un élément critique retiré est signalé explicitement", () => {
    const s = brainSnapshot(PID);
    const items = brainItems(s).filter((x) => x.scopes === "*" || x.scopes.includes("brand"));
    const critLen = items.filter((x) => x.critical).reduce((n, x) => n + x.text.length + 1, 0);
    const v = contextFor(s, "brand", { budget: { soft: 1_000_000, hard: critLen + 120 } });
    expect(v.hardCeilingReached).toBe(true);
    expect(v.criticalDropped).toEqual([]);
    expect(v.dropped.length).toBeGreaterThan(0);
    const tight = contextFor(s, "brand", { budget: { soft: 50, hard: 200 } });
    expect(tight.hardCeilingReached).toBe(true);
    expect(tight.criticalDropped.length).toBeGreaterThan(0);
    // Même « all » a un plafond.
    expect(contextFor(s, "all").hardCeiling).toBeGreaterThan(0);
  });

  it("empreinte stable : indépendante des créations récentes (contexte volatil séparé)", () => {
    const pid = project();
    const before = hashes(pid);
    const img = contextFor(brainSnapshot(pid), "image");
    asset(pid, { role: "lifestyle", name: "photo-chantier-nouvelle.jpg", status: "review" });
    asset(pid, { role: "banner", name: "banniere-2.png" });
    expect(hashes(pid)).toEqual(before);
    const after = contextFor(brainSnapshot(pid), "image");
    expect(after.stable).toBe(img.stable);
    expect(after.stable).not.toContain("photo-chantier-nouvelle");
    expect(after.volatile).toContain("photo-chantier-nouvelle.jpg");
    expect(contextFor(brainSnapshot(pid), "logo").volatile).toBe("");
  });

  it("constats automatiques du contrôle qualité : indication faible, jamais une préférence, sans changer l'empreinte", () => {
    const pid = project();
    const before = hashes(pid);
    check(pid, { deliverable: "stock_photo", verdict: "REJECTED", blocking: ["empty_wall"] });
    check(pid, { deliverable: "stock_photo", verdict: "REJECTED", blocking: ["empty_wall"] });
    // Contrôle en panne (réseau) : ignoré.
    check(pid, { deliverable: "stock_photo", verdict: "PROVISIONAL", blocking: ["off_topic"], checked: 0, checker: "none" });
    check(pid, { deliverable: "stock_photo", verdict: "PROVISIONAL", blocking: ["off_topic"], checked: 0, checker: "none" });
    const s = brainSnapshot(pid);
    expect(s.technicalFailures).toBe(2);
    const img = contextFor(s, "image");
    expect(img.stable).toMatch(/INDICATIONS[\s\S]*Défaut récurrent détecté par le contrôle qualité \(2×\) : scènes de mur vide hors sujet — indication sur le générateur, pas une préférence du client/);
    expect(img.stable).not.toMatch(/REFUS du client|préférence client|Préférence/);
    expect(img.stable).not.toContain("hors sujet par rapport au métier");
    expect(hashes(pid)).toEqual(before);
    // Un seul rejet automatique (non fatal) : pas même une indication.
    const pid2 = project();
    check(pid2, { deliverable: "logo_route", verdict: "REJECTED", blocking: ["cliche"] });
    expect(contextFor(brainSnapshot(pid2), "logo").stable).not.toContain("symboles clichés");
  });

  it("refus du client « mur vide » : contrainte ferme et empreinte modifiée dans le scope concerné seulement", () => {
    const pid = project();
    const before = hashes(pid);
    memo(pid, { kind: "rejection", key: "image:empty_wall", value: "photos de mur vide", scope: "image" });
    const after = hashes(pid);
    expect(after.image).not.toBe(before.image);
    expect(after.all).not.toBe(before.all);
    expect(after.blog).toBe(before.blog);
    expect(after.logo).toBe(before.logo);
    const img = contextFor(brainSnapshot(pid), "image").stable;
    expect(img).toMatch(/CONTRAINTES FERMES[\s\S]*REFUS du client — photos de mur vide/);
    expect(contextFor(brainSnapshot(pid), "blog").stable).not.toContain("mur vide");
  });

  it("logo validé : l'empreinte change pour logo, marque, site ; pas pour la recherche de photos", () => {
    const pid = project();
    const logoId = asset(pid, { role: "logo", name: "logo.png" });
    const p = JSON.parse(String(db().prepare("SELECT brand_json FROM projects WHERE id = ?").pluck().get(pid)));
    p.logo = { ...p.logo, assetId: logoId, status: "proposed", concept: "Truelle et rouleau" };
    run("UPDATE projects SET brand_json = ? WHERE id = ?", JSON.stringify(p), pid);
    const proposed = hashes(pid);
    expect(contextFor(brainSnapshot(pid), "logo").stable).toMatch(/Logo actuel : proposé, non validé/);
    p.logo.status = "validated";
    p.validated = [...p.validated, "logo"];
    run("UPDATE projects SET brand_json = ? WHERE id = ?", JSON.stringify(p), pid);
    const validated = hashes(pid);
    for (const sc of ["logo", "brand", "theme", "social", "advertising", "all"]) expect(validated[sc]).not.toBe(proposed[sc]);
    expect(validated.stock).toBe(proposed.stock);
    expect(validated.seo).toBe(proposed.seo);
    expect(brainSnapshot(pid).currentLogo).toMatchObject({ assetId: logoId, state: "validated", source: "brand" });
    expect(contextFor(brainSnapshot(pid), "logo").stable).toMatch(/CONTRAINTES FERMES[\s\S]*Logo actuel : VALIDÉ par le client/);
  });

  it("logo actuel : le pointeur de la marque fait foi ; le dernier logo généré n'est qu'un repli ancien", () => {
    const pid = project();
    expect(brainSnapshot(pid).currentLogo).toBeNull();
    const old = asset(pid, { role: "logo", name: "ancien.png" });
    expect(brainSnapshot(pid).currentLogo).toMatchObject({ assetId: old, source: "legacy_latest" });
    const chosen = asset(pid, { role: "logo", name: "choisi.png" });
    asset(pid, { role: "logo", name: "plus-recent-non-choisi.png" });
    const p = JSON.parse(String(db().prepare("SELECT brand_json FROM projects WHERE id = ?").pluck().get(pid)));
    p.logo = { ...p.logo, assetId: chosen, status: "proposed", provisional: true };
    run("UPDATE projects SET brand_json = ? WHERE id = ?", JSON.stringify(p), pid);
    expect(brainSnapshot(pid).currentLogo).toMatchObject({ assetId: chosen, source: "brand", state: "PROVISIONAL" });
  });

  it("au plus 4 requêtes SQL pour un instantané complet", () => {
    const pid = project();
    memo(pid, { kind: "decision", key: "theme.sections", value: "accueil court" });
    check(pid, { deliverable: "logo_route", verdict: "REJECTED", blocking: ["cliche"] });
    asset(pid, { role: "lifestyle", name: "x.jpg" });
    const spy = vi.spyOn(db(), "prepare");
    try {
      brainSnapshot(pid);
      expect(spy.mock.calls.length).toBeLessThanOrEqual(4);
    } finally {
      spy.mockRestore();
    }
  });

  it("vue logo nettement plus petite que « all », avec l'essentiel (objectif de fixture : ≤ 40 %)", () => {
    const s = brainSnapshot(PID);
    const all = contextFor(s, "all");
    const logo = contextFor(s, "logo");
    expect(logo.chars).toBeLessThan(all.chars * 0.6);
    for (const need of ["Sébastien Blanc", "plâtrier peintre", "Palette", "Direction artistique", "Typographies"]) expect(logo.stable).toContain(need);
    for (const not of ["Prestations", "Messages clés", "Règles des services", "Contact —"]) expect(logo.stable).not.toContain(not);
  });

  it("route d'administration : réservée à l'administration ; contenu uniquement avec content=1, secrets masqués", async () => {
    const { GET } = await import("@/app/api/admin/brain/route");
    const pid = project();
    // Une clé collée par erreur dans la mémoire du projet ne doit jamais ressortir telle quelle.
    memo(pid, { kind: "preference", key: "note", value: `ma clé ${["sk-", "ant-", "api03-", "NEPASMONTRER1234"].join("")}` });
    const t = Date.now();
    const admin = await createUser(`brain-admin${t}@test.fr`, "motdepasse-test", "A");
    run("UPDATE users SET role = 'admin' WHERE id = ?", admin.id);
    run("UPDATE users SET role = 'client' WHERE id = ?", u.id);
    const session = (uid: string, token: string) => run("INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?,?,?,?)", sha256(token), uid, Date.now() + 3600_000, Date.now());
    session(u.id, `tok-brain-client-${t}`);
    session(admin.id, `tok-brain-admin-${t}`);
    const get = (q: string) => GET(new Request(`http://studio.test/api/admin/brain?project=${pid}${q}`));
    expect((await get("")).status).toBe(401);
    jar.token = `tok-brain-client-${t}`;
    expect((await get("")).status).toBe(403);
    expect((await get("&content=1")).status).toBe(403);
    jar.token = `tok-brain-admin-${t}`;
    const plain = await (await get("")).json();
    expect(plain.views).toHaveLength(SCOPES.length);
    expect(plain.views[0]).toMatchObject({ brainVersion: expect.any(String), hash: expect.any(String), chars: expect.any(Number), budgetExceeded: expect.any(Boolean), hardCeilingReached: expect.any(Boolean) });
    expect(JSON.stringify(plain)).not.toContain("Sébastien Blanc");
    const full = await get("&content=1&scope=theme");
    const body = await full.text();
    expect(body).toContain("Sébastien Blanc");
    expect(body).not.toContain("NEPASMONTRER1234");
    expect(JSON.parse(body).views.map((v: { scope: string }) => v.scope)).toEqual(["theme"]);
    expect((await GET(new Request("http://studio.test/api/admin/brain?project=inexistant"))).status).toBe(404);
  });
});
