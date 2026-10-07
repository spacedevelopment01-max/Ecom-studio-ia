/**
 * Project Brain 2B — mémoire, refus, métier, faits, cohérence de marque :
 *  - décision remplacée → ancienne « superseded » (historique conservé) ; mémoires équivalentes dédupliquées ;
 *  - refus du client = contrainte ferme du scope concerné ; refus du contrôle qualité = indication ; panne ≠ préférence ;
 *  - fait du client > déduction ; inconnu reste inconnu ; relance d'analyse sans perte ; produit remplacé ;
 *  - palette, typographies et logo validés jamais écrasés automatiquement ; remplacement explicite possible ;
 *  - pointeur du logo cohérent (usage « marque ») ; plâtrier peintre compris par le registre branché ; métier inconnu.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

const jar = { token: "" };
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => (jar.token ? { value: jar.token } : undefined), set: () => {}, delete: () => {} }) }));
afterEach(() => {
  jar.token = "";
});

describe("Project Brain 2B — mémoire et cohérence", async () => {
  const { createUser } = await import("@/lib/auth");
  const { all, db, id, now, one, run } = await import("@/lib/db");
  const { remember, memory, loadProject, saveThemeVersion, currentTheme } = await import("@/lib/projects");
  const { brainSnapshot, contextFor, SCOPES } = await import("@/lib/brain");
  const { localBrand } = await import("@/lib/engine/local");
  const { serviceProduct, serviceProfile, sampleSpec, product: baseProduct } = await import("./fixtures");
  const { sha256 } = await import("@/lib/secrets");
  const { runWithLang } = await import("@/lib/i18n-server");
  const fr = <T,>(fn: () => Promise<T>) => runWithLang({ ui: "fr", content: "fr" }, fn);

  const u = await createUser(`b2b${Date.now()}@test.fr`, "motdepasse-test", "B");
  const project = (business: "services" | "products" = "services") => {
    const product = business === "services" ? { ...serviceProduct, name: "Sébastien Blanc", category: "Plâtrier peintre", sector: "batiment" } : { ...baseProduct };
    const services = business === "services" ? { ...serviceProfile, services: [{ name: "Enduits et lissage" }] } : null;
    const { brand, strategy } = localBrand(product as any, product.name, { business, services } as any);
    const pid = id();
    run(
      "INSERT INTO projects (id, user_id, name, status, platform, product_json, brand_json, strategy_json, settings_json, sources_json, business_type, business_json, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      pid, u.id, product.name, "ready", "shopify", JSON.stringify(product), JSON.stringify(brand), JSON.stringify(strategy), JSON.stringify({ language: "fr" }), "[]", business, JSON.stringify(services ?? {}), now(), now(),
    );
    return pid;
  };
  const hashes = (pid: string) => Object.fromEntries(SCOPES.map((sc) => [sc, contextFor(brainSnapshot(pid), sc).hash]));
  const brandOf = (pid: string) => JSON.parse(String(db().prepare("SELECT brand_json FROM projects WHERE id = ?").pluck().get(pid)));
  const setBrand = (pid: string, b: unknown) => run("UPDATE projects SET brand_json = ? WHERE id = ?", JSON.stringify(b), pid);
  const session = async () => {
    const t = `tok-b2b-${Date.now()}-${Math.random()}`;
    run("INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?,?,?,?)", sha256(t), u.id, Date.now() + 3600_000, Date.now());
    jar.token = t;
  };

  describe("mémoire", () => {
    it("décision remplacée → l'ancienne devient « superseded » (remplaçante notée), seule la nouvelle est active", () => {
      const pid = project();
      const a = remember(pid, { kind: "decision", key: "marque.palette", value: '{"primary":"#B03A2E"}', source: "user", scope: "brand" });
      const b = remember(pid, { kind: "decision", key: "marque.palette", value: '{"primary":"#1F4E79"}', source: "user", scope: "brand" });
      expect(b).not.toBe(a);
      const rows = all<any>("SELECT id, value, state, superseded_by, origin FROM memory WHERE project_id = ? AND key = 'marque.palette' ORDER BY created_at", pid);
      expect(rows).toHaveLength(2);
      expect(rows[0]).toMatchObject({ id: a, state: "superseded", superseded_by: b, origin: "user" });
      expect(rows[1]).toMatchObject({ id: b, state: "active" });
      expect(memory(pid).filter((m) => m.key === "marque.palette").map((m) => m.value)).toEqual(['{"primary":"#1F4E79"}']);
      // Même valeur répétée : pas de nouvelle ligne.
      expect(remember(pid, { kind: "decision", key: "marque.palette", value: '{"primary":"#1F4E79"}', source: "user", scope: "brand" })).toBe(b);
    });

    it("mémoires équivalentes dédupliquées (sans IA) ; texte ambigu jamais transformé en refus", () => {
      const pid = project();
      for (const v of ["pas de badge", "éviter badge", "badge refusé", "n'aime pas les badges"]) remember(pid, { kind: "preference", key: `k-${v}`, value: v, source: "user", scope: "brand" });
      remember(pid, { kind: "preference", key: "solvant", value: "peinture sans solvant", source: "user", scope: "brand" });
      const active = memory(pid);
      const badges = active.filter((m) => m.norm_key === "brand:neg:badge");
      expect(badges).toHaveLength(1);
      expect(JSON.parse(badges[0].evidence_json!).count).toBe(4);
      expect(active.find((m) => m.value === "peinture sans solvant")?.norm_key).toBe("preference:brand:exact:peinture sans solvant");
      // Préférence contraire : remplace l'ancienne.
      remember(pid, { kind: "preference", key: "k-pos", value: "je préfère les badges", source: "user", scope: "brand" });
      expect(memory(pid).filter((m) => m.norm_key?.includes(":badge")).map((m) => m.norm_key)).toEqual(["brand:pos:badge"]);
    });

    it("provenance honnête : préférence déduite par l'IA = indication, pas une décision du client", () => {
      const pid = project();
      remember(pid, { kind: "preference", key: "theme.aere", value: "sections aérées", source: "ai", status: "inferred", origin: "inference", scope: "shop" });
      expect(one<any>("SELECT origin, status FROM memory WHERE project_id = ? AND key = 'theme.aere'", pid)).toEqual({ origin: "inference", status: "inferred" });
      expect(contextFor(brainSnapshot(pid), "theme").stable).toMatch(/INDICATIONS[\s\S]*Préférence \(déduite\) — theme\.aere/);
    });
  });

  describe("refus", () => {
    it("refus d'une piste de logo par le client → contrainte ferme du scope logo (pas du blog) ; répété = renforcé", async () => {
      const { recordLogoRouteRejection } = await import("@/lib/brain/rejections");
      const pid = project();
      const before = hashes(pid);
      recordLogoRouteRejection(pid, { name: "Le sceau", composition: "emblem", markKind: "monogram" });
      recordLogoRouteRejection(pid, { name: "Le cachet", composition: "emblem", markKind: "letter" });
      const logo = contextFor(brainSnapshot(pid), "logo").stable;
      expect(logo).toMatch(/CONTRAINTES FERMES[\s\S]*REFUS du client — Pistes de logo de type badge \/ emblème \(ex\. « Le sceau » \) \(écarté 2 fois\)|REFUS du client — Pistes de logo de type badge \/ emblème \(ex\. « Le sceau »\) \(écarté 2 fois\)/);
      expect(contextFor(brainSnapshot(pid), "blog").stable).not.toContain("badge");
      const after = hashes(pid);
      expect(after.logo).not.toBe(before.logo);
      expect(after.blog).toBe(before.blog);
    });

    it("média écarté par le client (route fichiers) → refus du scope images (visuels et photos), pas un fait", async () => {
      const pid = project();
      const aid = id();
      run("INSERT INTO assets (id, project_id, user_id, name, kind, role, mime, size, storage_key, origin, meta, status, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)", aid, pid, u.id, "mur-vide.jpg", "image", "lifestyle", "image/jpeg", 1, "k", "import", JSON.stringify({ subject: "mur vide", stock: { source: "pexels" } }), "ready", now());
      await session();
      const { PATCH } = await import("@/app/api/files/[fid]/route");
      const res = await PATCH(new Request(`http://x/api/files/${aid}`, { method: "PATCH", body: JSON.stringify({ status: "rejected" }) }), { params: Promise.resolve({ fid: aid }) });
      expect(res.status).toBe(200);
      const row = one<any>("SELECT kind, scope, origin, norm_key FROM memory WHERE project_id = ? AND kind = 'rejection'", pid);
      expect(row).toEqual({ kind: "rejection", scope: "images", origin: "user", norm_key: "images:neg:mur vide" });
      for (const sc of ["image", "stock"] as const) expect(contextFor(brainSnapshot(pid), sc).stable).toMatch(/REFUS du client — Visuels « mur vide »/);
      expect(contextFor(brainSnapshot(pid), "logo").stable).not.toContain("mur vide");
      // Un média non créatif (photo produit d'origine) écarté : aucun refus mémorisé.
      const orig = id();
      run("INSERT INTO assets (id, project_id, user_id, name, kind, role, mime, size, storage_key, origin, meta, status, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)", orig, pid, u.id, "photo.jpg", "image", "original", "image/jpeg", 1, "k", "upload", "{}", "ready", now());
      await PATCH(new Request(`http://x/api/files/${orig}`, { method: "PATCH", body: JSON.stringify({ status: "rejected" }) }), { params: Promise.resolve({ fid: orig }) });
      expect(all("SELECT id FROM memory WHERE project_id = ? AND kind = 'rejection'", pid)).toHaveLength(1);
    });

    it("rejets du contrôle qualité = indication seulement ; panne technique = aucune préférence ; rien écrit en mémoire", () => {
      const pid = project();
      const before = hashes(pid);
      const check = (verdict: string, checked: number, checker: string, codes: string[]) =>
        run("INSERT INTO quality_checks (id, created_at, user_id, project_id, deliverable, attempt, checker, checked, score, criteria_json, blocking_json, fatal_json, feedback, verdict, fatal, action, reason, policy_version) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", id(), now(), u.id, pid, "logo_route", 0, checker, checked, 4, "{}", JSON.stringify(codes), "[]", "", verdict, 0, "regenerate", "", "p");
      check("REJECTED", 1, "ai", ["cliche"]);
      check("REJECTED", 1, "ai", ["cliche"]);
      check("PROVISIONAL", 0, "none", ["cliche"]);
      expect(all("SELECT id FROM memory WHERE project_id = ?", pid)).toHaveLength(0);
      const logo = contextFor(brainSnapshot(pid), "logo").stable;
      expect(logo).toMatch(/INDICATIONS[\s\S]*Défaut récurrent détecté par le contrôle qualité \(2×\) : symboles clichés/);
      expect(logo).not.toMatch(/REFUS du client/);
      expect(hashes(pid)).toEqual(before);
    });
  });

  describe("faits", () => {
    it("fait du client > déduction ; inconnu reste inconnu ; relance d'analyse sans perte ; produit remplacé = nouveau profil", async () => {
      const { mergeProductProfile } = await import("@/lib/brain/facts");
      const { emptyProduct } = await import("@/lib/project-types");
      const prev = {
        ...emptyProduct(),
        name: "Sérum Éclat",
        nameStatus: "provided" as const,
        facts: [
          { key: "capacity", label: "Contenance", value: "30 ml", status: "confirmed" as const, source: "user" as const },
          { key: "origin", label: "Origine", value: "France", status: "confirmed" as const, source: "description" as const },
          { key: "shipping", label: "Livraison", value: "", status: "unknown" as const, source: "ai" as const },
        ],
        price: { amount: 3490, currency: "EUR", status: "confirmed" as const },
        questions: [{ id: "q1", question: "Ingrédients ?", why: "", required: false, factKey: "ingredients", answer: "Vitamine C" }],
      };
      const next = {
        ...emptyProduct(),
        name: "Sérum lumière",
        nameStatus: "proposed" as const,
        facts: [
          { key: "capacity", label: "Contenance", value: "50 ml", status: "inferred" as const, source: "ai" as const },
          { key: "origin", label: "Origine", value: "", status: "unknown" as const, source: "ai" as const },
          { key: "shipping", label: "Livraison", value: "48 h", status: "inferred" as const, source: "ai" as const },
        ],
        price: { amount: null, currency: "EUR", status: "unknown" as const },
        questions: [{ id: "q9", question: "Ingrédients principaux ?", why: "", required: true, factKey: "ingredients" }],
      };
      const m = mergeProductProfile(prev, next);
      const f = (k: string) => m.facts.find((x) => x.key === k)!;
      expect(f("capacity")).toMatchObject({ value: "30 ml", source: "user", status: "confirmed" });
      expect(f("origin")).toMatchObject({ value: "France", status: "confirmed" });
      // Inconnu jamais promu en fait confirmé par une déduction.
      expect(f("shipping").status).not.toBe("confirmed");
      expect(m.price).toEqual(prev.price);
      expect(m.name).toBe("Sérum Éclat");
      expect(m.questions.find((q) => q.factKey === "ingredients")?.answer).toBe("Vitamine C");
      expect(mergeProductProfile(prev, next, { relation: "replaced" })).toEqual(next);
      expect(mergeProductProfile(emptyProduct(), next)).toEqual(next);
      // Une préférence n'est jamais un fait.
      const pid = project("products");
      remember(pid, { kind: "preference", key: "couleur", value: "je préfère du bleu", source: "user", scope: "brand" });
      expect(loadProject(pid).product.facts.some((x) => /bleu/.test(x.value))).toBe(false);
    });
  });

  describe("cohérence de marque", () => {
    const route = async (pid: string) => {
      const { localRoutes } = await import("@/lib/engine/creative-direction");
      const { routeLogoSpec } = await import("@/lib/media/brand-mockups");
      const b = loadProject(pid).brand!;
      const r = (await localRoutes({ name: b.name, palette: b.palette, direction: b.direction } as any, { cutout: null, library: "brush" })).typo[0];
      const { color, accent, ...spec } = routeLogoSpec(r, b);
      return { key: r.key, label: r.name, concept: r.why, spec: { ...spec, accent }, colors: { color, accent: accent ?? color }, route: { ...r, heading: "Archivo", headingWeight: 800, body: "Inter", palette: { primary: "#000001", secondary: "#000002", accent: "#000003", light: "#FFFFFE", dark: "#000004" } } } as any;
    };

    it("palette et typographies validées : jamais écrasées par l'application d'une piste ; sinon la piste s'applique", async () => {
      await fr(async () => {
        const { applyLogo } = await import("@/lib/engine/identity");
        const locked = project();
        const free = project();
        for (const pid of [locked, free]) saveThemeVersion(pid, sampleSpec(), "Boutique", "system");
        setBrand(locked, { ...brandOf(locked), validated: ["palette", "fonts"] });
        const palette = brandOf(locked).palette;
        const fontsBefore = currentTheme(locked)!.spec.settings.type_heading_font;
        await applyLogo(null, locked, await route(locked), { provisional: true });
        await applyLogo(null, free, await route(free), { provisional: true });
        expect(brandOf(locked).palette).toEqual(palette);
        expect(currentTheme(locked)!.spec.settings.type_heading_font).toBe(fontsBefore);
        expect(brandOf(free).palette.primary).toBe("#000001");
        expect(currentTheme(free)!.spec.settings.type_heading_font).not.toBe(currentTheme(locked)!.spec.settings.type_heading_font);
        expect(currentTheme(free)!.spec.settings.type_heading_font).toMatch(/^archivo_n/);
        // Vue logo : les typographies validées priment sur celles de la piste.
        expect(contextFor(brainSnapshot(locked), "logo").stable).toMatch(/Typographies VALIDÉES : titres (?!Archivo)/);
        // Pointeur du logo et usage « marque » cohérents.
        const b = brandOf(free);
        expect(brainSnapshot(free).currentLogo).toMatchObject({ assetId: b.logo.assetId, source: "brand" });
        expect(all<any>("SELECT asset_id FROM asset_usages WHERE target_type = 'brand' AND target_id = ? AND label = 'logo'", free).map((r) => r.asset_id)).toEqual([b.logo.assetId]);
      });
    }, 120_000);

    it("logo validé : une autre piste refusée sans demande explicite ; remplacement explicite possible, ancien choix en historique", async () => {
      const pid = project();
      const prop = (key: string) => {
        const aid = id();
        run("INSERT INTO assets (id, project_id, user_id, name, kind, role, mime, size, storage_key, origin, meta, status, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)", aid, pid, u.id, `${key}.png`, "image", "logo-proposal", "image/png", 1, "k", "generated", JSON.stringify({ key, label: key, pool: 1, route: { name: key, composition: "horizontal", markKind: "library" } }), "ready", now() + Math.random());
        return aid;
      };
      const a = prop("typo");
      const b = prop("produit");
      setBrand(pid, { ...brandOf(pid), validated: ["logo"], logo: { ...brandOf(pid).logo, assetId: "logo-x", status: "validated", proposal: "typo", proposalId: a } });
      await session();
      const { POST } = await import("@/app/api/projects/[id]/brand/logo/route");
      const call = (body: object) => POST(new Request("http://x/api/projects/x/brand/logo", { method: "POST", body: JSON.stringify(body) }), { params: Promise.resolve({ id: pid }) });
      expect((await call({ proposalId: b })).status).toBe(409);
      expect(brandOf(pid).validated).toContain("logo");
      const ok = await call({ proposalId: b, replace: true });
      expect(ok.status).toBe(200);
      expect(brandOf(pid).validated).not.toContain("logo");
      expect(one<any>("SELECT kind, origin FROM memory WHERE project_id = ? AND key = 'marque.logo.remplacement'", pid)).toEqual({ kind: "decision", origin: "user" });
      // Nouvelles pistes ajoutées (« regenerate ») : jamais bloquées, jamais appliquées sur un logo validé (testé côté moteur).
      setBrand(pid, { ...brandOf(pid), validated: ["logo"] });
      run("DELETE FROM jobs WHERE project_id = ?", pid);
      expect((await call({ regenerate: true })).status).not.toBe(409);
    });

    it("logo client téléversé : ne remplace pas un logo VALIDÉ lors d'une reconstruction de la marque", async () => {
      await fr(async () => {
        const { buildBrand } = await import("@/lib/engine/brand");
        const { JobContext } = await import("@/lib/jobs");
        const pid = project();
        const upload = id();
        run("INSERT INTO assets (id, project_id, user_id, name, kind, role, mime, size, storage_key, origin, meta, status, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)", upload, pid, u.id, "logo-client.png", "image", "logo", "image/png", 1, "k", "upload", "{}", "ready", now());
        setBrand(pid, { ...brandOf(pid), validated: ["logo"], logo: { ...brandOf(pid).logo, assetId: "logo-valide", status: "validated" } });
        const job = { id: `job-b2b-${Date.now()}`, project_id: pid, user_id: u.id, checkpoint: "{}", payload: "{}" } as any;
        await buildBrand(new JobContext(job), pid, {}).catch(() => null);
        expect(brandOf(pid).logo.assetId).toBe("logo-valide");
        expect(brandOf(pid).logo.status).toBe("validated");
      });
    }, 120_000);
  });

  describe("métier branché", () => {
    it("plâtrier peintre compris partout (photos, icônes, symbole, métier local) ; métier inconnu toujours géré", async () => {
      const { tradeStock } = await import("@/lib/stock/trade-queries");
      const { tradeKeywords } = await import("@/lib/media/icon-library");
      const { localServiceAnalysis } = await import("@/lib/engine/local");
      const { emptyServiceProfile } = await import("@/lib/project-types");
      const { symbolFor } = await import("@/lib/engine/identity");
      const pp = tradeStock("Plâtrier peintre")!;
      expect(pp.queries[0]).toBe("plasterer applying skim coat to interior wall");
      for (const q of pp.queries) expect(q.split(" ").length).toBeGreaterThanOrEqual(4);
      expect(tradeKeywords("Plâtrier peintre")[0]).toBe("trowel");
      expect(tradeKeywords("Plâtrier peintre")).not.toContain("wall");
      expect(symbolFor(loadProject(project()))).toBe("brush");
      const local = await fr(async () => localServiceAnalysis({ name: "Sébastien Blanc", description: "Plâtrier peintre à Mâcon : plâtrerie, enduits, peinture intérieure.", services: emptyServiceProfile() }));
      expect(local.product.category).toBe("Plâtrier peintre");
      expect(local.product.sector).toBe("batiment");
      // « Mâcon » (la ville) n'est jamais lu comme le métier de maçon ; « maçon » l'est.
      expect(tradeStock("Plâtrier peintre à Mâcon")!.queries.some((q) => /mason/.test(q))).toBe(false);
      expect((await import("@/lib/brain/trade")).resolveTrade("Maçon à Mâcon").id).toBe("mason");
      // Métier inconnu : pas de recherche inventée, analyse locale inchangée (pas de catégorie devinée).
      expect(tradeStock("Souffleur de verre")).toBeNull();
      const unknown = await fr(async () => localServiceAnalysis({ name: "Atelier Verre", description: "Souffleur de verre, pièces uniques.", services: emptyServiceProfile() }));
      expect(unknown.product.category).toBe("");
    });
  });
});
