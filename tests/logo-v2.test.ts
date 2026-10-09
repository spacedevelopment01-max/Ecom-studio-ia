/**
 * Phase 4A — Brand & Logo Engine V2 (fournisseurs simulés : aucun appel payant).
 */
import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sent: any[] = [];
let respond: (params: any) => string = () => "{}";
vi.mock("@anthropic-ai/sdk", () => {
  class APIError extends Error {}
  class Anthropic {
    static AuthenticationError = class extends APIError {};
    static BadRequestError = class extends APIError {};
    static NotFoundError = class extends APIError {};
    constructor(public opts: any) {}
    private stream(params: any) {
      sent.push(params);
      const p = Promise.resolve({ model: params.model, stop_reason: "end_turn", content: [{ type: "text", text: respond(params) }], usage: { input_tokens: 4000, output_tokens: 1500 } });
      return { finalMessage: () => p };
    }
    messages = { stream: (p: any) => this.stream(p), countTokens: async (p: any) => ({ input_tokens: Math.ceil(JSON.stringify(p).length / 3) }) };
    beta = { messages: { stream: (p: any) => this.stream(p) } };
  }
  return { default: Anthropic, Anthropic };
});
vi.mock("@/lib/ai/config", async (orig) => ({ ...(await orig<object>()), activeProviderKey: (p: string) => (p === "anthropic" ? "sk-ant-test-1234567890abcdef" : null) }));

beforeEach(() => {
  sent.length = 0;
  vi.stubGlobal("fetch", async () => new Response("{}"));
});
afterEach(() => vi.unstubAllGlobals());

describe("Phase 4A — Brand & Logo Engine V2", async () => {
  const { createUser } = await import("@/lib/auth");
  const { all, one, run } = await import("@/lib/db");
  const { loadProject } = await import("@/lib/projects");
  const { getSubscription, syncAllowance } = await import("@/lib/billing");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { JobContext } = await import("@/lib/jobs");
  const { withTrace } = await import("@/lib/ai/trace");
  const { recordLogoRouteRejection } = await import("@/lib/brain/rejections");
  const { brandDiscovery } = await import("@/lib/logo-v2/discovery");
  const { selectTerritories, territoryDistance, localTerritories, MIN_DISTANCE, literalCliche } = await import("@/lib/logo-v2/territories");
  const { buildCandidate, fontsFor, expectedText, missingGlyphs } = await import("@/lib/logo-v2/construct");
  const { gateCandidate, deterministicChecks } = await import("@/lib/logo-v2/quality");
  const { runLogoEngineV2 } = await import("@/lib/logo-v2/engine");
  const { chooseLogoV2 } = await import("@/lib/logo-v2/choose");
  const { realLogoV2Ai } = await import("@/lib/logo-v2/ai");
  const { LOGO_FIXTURES, seedLogoFixture } = await import("./logo-v2-fixtures");
  const { draftsFor, mockAi, review, SVG_OK } = await import("./logo-v2-mock");
  const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);

  const u = await createUser(`logov2${Date.now()}@test.fr`, "motdepasse-test", "L");
  getSubscription(u.id);
  run("UPDATE subscriptions SET status = 'active', plan = 'creer' WHERE user_id = ?", u.id);
  syncAllowance(u.id);
  let n = 0;
  const job = (projectId: string, type = "brand.logo.v2") => {
    const jid = `job-lv2-${Date.now()}-${n++}`;
    run("INSERT INTO jobs (id, user_id, project_id, type, label, payload, status, run_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)", jid, u.id, projectId, type, type, JSON.stringify({ projectId }), "running", Date.now(), Date.now(), Date.now());
    return new JobContext(one<any>("SELECT * FROM jobs WHERE id = ?", jid));
  };
  const sb = () => fr(() => seedLogoFixture(u.id, "artisan"));
  const runEngine = (pid: string, ai: any, ctx = job(pid)) => fr(() => runLogoEngineV2(ctx, pid, { ai }));

  it("découverte : nom EXACT, métier compris, clichés du métier, refus du client — sans appel à l'IA", () => {
    const pid = sb();
    recordLogoRouteRejection(pid, { name: "Badge rond", composition: "emblem" });
    const b = fr(() => brandDiscovery(loadProject(pid)));
    expect(b.name).toBe("Sébastien Blanc");
    expect(b.descriptor).toBeNull(); // aucune ligne ajoutée d'office
    expect(b.trade.label).toMatch(/plâtrier peintre/i);
    expect(b.cliches.join(" ")).toMatch(/trowel/);
    expect(b.rejectedMarkTypes).toContain("emblem");
    expect(b.brainContext.startsWith('<contexte_projet scope="logo">')).toBe(true);
    expect(sent).toHaveLength(0);
  });

  it("territoires réellement distincts : quasi-doublon et cliché littéral écartés ; refus du client respectés", () => {
    const pid = sb();
    const b = fr(() => brandDiscovery(loadProject(pid)));
    const sel = selectTerritories(draftsFor(b), b, 4);
    // Le client a déjà écarté un badge (fixture) : l'emblème n'est plus proposé.
    expect(sel.kept.map((t) => t.name)).toEqual(["Signature typographique", "Monogramme construit", "Geste abstrait"]);
    expect(sel.rejected.map((r) => r.reason)).toContain("type « emblem » refusé par le client");
    for (const a of sel.kept) for (const c of sel.kept) if (a !== c) expect(territoryDistance(a, c)).toBeGreaterThanOrEqual(MIN_DISTANCE);
    expect(sel.rejected.map((r) => r.reason).join(" | ")).toMatch(/trop proche de « Signature typographique ».*\| cliché littéral du métier \(trowel\)/);
    // Un objet du métier traité de façon abstraite reste permis.
    expect(literalCliche({ markType: "symbol_wordmark", symbolIdea: "trowel stylisé en négatif dans une ligne d'enduit" }, b.cliches)).toBeNull();
    // Sans ce refus (autre marque) : l'emblème est proposé ; avec un refus du monogramme : plus de monogramme.
    const other = fr(() => seedLogoFixture(u.id, "restaurant"));
    const b2 = fr(() => brandDiscovery(loadProject(other)));
    expect(selectTerritories(draftsFor(b2), b2, 6).kept.map((t) => t.markType)).toContain("emblem");
    recordLogoRouteRejection(other, { name: "Initiales", markKind: "monogram" });
    const b3 = fr(() => brandDiscovery(loadProject(other)));
    expect(selectTerritories(draftsFor(b3), b3, 6).kept.map((t) => t.markType)).not.toContain("monogram");
  });

  it("concept avant image : les territoires sont décidés avant tout dessin ou contrôle ; pas de symbole pour un logotype", async () => {
    const pid = sb();
    const log = { calls: [] as string[] };
    const r = await runEngine(pid, mockAi(log));
    expect(log.calls[0]).toBe("territories");
    expect(log.calls.filter((c) => c === "territories")).toHaveLength(1);
    expect(log.calls).not.toContain("symbol:Signature typographique");
    expect(log.calls).not.toContain("symbol:Monogramme construit");
    expect(log.calls).toContain("symbol:Geste abstrait");
    expect(r.shown).toHaveLength(3);
    expect(r.shown.every((s) => s.verdict === "FINAL")).toBe(true);
  });

  it("texte exact : le logo écrit exactement « Sébastien Blanc » ; une lecture sans accent → jamais FINAL ; nom modifié → refusé", async () => {
    const pid = sb();
    const b = fr(() => brandDiscovery(loadProject(pid)));
    const [t] = selectTerritories(draftsFor(b), b, 4).kept;
    const c = buildCandidate(t, b, { family: fontsFor(t, b)[0], attempt: 0, symbol: null });
    expect(c.spec.name).toBe("Sébastien Blanc");
    expect(c.spec.tagline).toBeUndefined();
    expect(expectedText({ name: "Sébastien Blanc", case: "upper" })).toBe("SÉBASTIEN BLANC");
    expect(gateCandidate(c, t, b, review(9, "Sebastien Blanc"), 0).verdict).not.toBe("FINAL");
    expect(gateCandidate(c, t, b, review(9, "Sebastien Blanc"), 0).blockingCodes).toContain("text_unreadable");
    const wrong = { ...c, spec: { ...c.spec, name: "Sebastien Blanc" } };
    expect(deterministicChecks(wrong, t, b).codes).toContain("name_mismatch");
    expect(gateCandidate(wrong, t, b, review(9.5, "Sebastien Blanc"), 2).verdict).toBe("REJECTED");
    // Une police qui n'a pas « é » ne peut pas écrire le nom : jamais retenue.
    expect(missingGlyphs("Sébastien", "Inter", 400)).toEqual([]);
    expect(fontsFor(t, b).length).toBeGreaterThan(0);
  });

  it("FINAL seulement au bon niveau : 8,6 → FINAL ; 7,9 → non ; 8,6 avec typographie à 6,5 → non ; cliché et rendu amateur bloquent", () => {
    const pid = sb();
    const b = fr(() => brandDiscovery(loadProject(pid)));
    const [t] = selectTerritories(draftsFor(b), b, 4).kept;
    const c = buildCandidate(t, b, { family: fontsFor(t, b)[0], attempt: 0, symbol: null });
    const e = expectedText(c.spec);
    expect(gateCandidate(c, t, b, review(8.6, e), 0).verdict).toBe("FINAL");
    expect(gateCandidate(c, t, b, review(7.9, e, { issues: ["contraste faible"] }), 0).verdict).toBe("RETRY");
    expect(gateCandidate(c, t, b, review(8.6, e, { low: { typography: 6.5 } }), 0).verdict).not.toBe("FINAL");
    expect(gateCandidate(c, t, b, review(9, e, { cliche: true }), 0).blockingCodes).toContain("cliche");
    expect(gateCandidate(c, t, b, review(9, e, { amateur: true }), 0).verdict).not.toBe("FINAL");
    expect(gateCandidate(c, t, b, review(9, e, { resemblesKnownBrand: true }), 0)).toMatchObject({ verdict: "REJECTED", fatal: true });
    // Sans IA : version du studio, jamais FINALE.
    expect(gateCandidate(c, t, b, null, 0).verdict).toBe("PROVISIONAL");
  });

  it("direction faible abandonnée : 3/10 → aucune reprise ni nouveau dessin pour la sauver", async () => {
    const pid = sb();
    const log = { calls: [] as string[] };
    const r = await runEngine(pid, mockAi(log, { reviews: { "Geste abstrait": [(e) => review(3, e, { issues: ["hors sujet"], fix: { target: "symbol", instruction: "refaire" } })] } }));
    expect(log.calls.filter((c) => c.startsWith("review:Geste abstrait"))).toHaveLength(1);
    expect(log.calls.filter((c) => c === "symbol:Geste abstrait:retry")).toHaveLength(0);
    expect(r.discarded.find((d) => d.territory.name === "Geste abstrait")).toMatchObject({ verdict: "REJECTED", attempts: 1 });
    expect(r.shown.map((s) => s.territory.name)).not.toContain("Geste abstrait");
  });

  it("reprise CIBLÉE : typographie faible → seule la police change (symbole gardé) ; symbole faible → seul le symbole est redessiné", async () => {
    const pid = sb();
    const log = { calls: [] as string[] };
    const r = await runEngine(
      pid,
      mockAi(log, {
        reviews: {
          "Geste abstrait": [(e) => review(7.4, e, { issues: ["typographie faible"], fix: { target: "typography", instruction: "linéale plus resserrée" } }), (e) => review(8.5, e)],
          "Monogramme construit": [(e) => review(7.2, e, { issues: ["espacement serré"], fix: { target: "spacing", instruction: "ouvrir l'interlettrage" } }), (e) => review(8.4, e)],
          "Sceau": [(e) => review(7.0, e, { issues: ["symbole confus"], fix: { target: "symbol", instruction: "simplifier" } }), (e) => review(8.3, e)],
        },
      }),
    );
    const geste = r.shown.find((s) => s.territory.name === "Geste abstrait")!;
    expect(geste.attempts).toBe(2);
    expect(geste.candidate.change).toMatch(/^typographie : .* → /);
    expect(log.calls.filter((c) => c.startsWith("symbol:Geste abstrait"))).toEqual(["symbol:Geste abstrait"]); // symbole gardé
    expect(r.shown.find((s) => s.territory.name === "Monogramme construit")!.candidate.change).toMatch(/^interlettrage/);
    const sceau = r.shown.find((s) => s.territory.name === "Sceau");
    expect(sceau?.candidate.change ?? "").not.toMatch(/typographie/);
  });

  it("aucun contrôle répété sans changement : rien de pertinent à modifier → arrêt (meilleure version gardée, pas de nouvel appel)", async () => {
    const pid = sb();
    const log = { calls: [] as string[] };
    const r = await runEngine(pid, mockAi(log, { reviews: { "Signature typographique": [(e) => review(7.5, e, { issues: ["manque de caractère"], fix: { target: "composition", instruction: "?" } })] } }));
    // Logotype seul : aucune composition alternative possible → pas de nouvelle relecture.
    expect(log.calls.filter((c) => c === "review:Signature typographique")).toHaveLength(1);
    expect(r.discarded.find((d) => d.territory.name === "Signature typographique")!.verdict).toBe("RETRY");
  });

  it("propositions : seules les FINALES dans la galerie ; essais écartés au diagnostic ; aucune déclinaison ni mockup avant le choix", async () => {
    const pid = sb();
    const ctx = job(pid);
    const r = await runEngine(pid, mockAi({ calls: [] }, { reviews: { "Geste abstrait": [(e) => review(4, e, { issues: ["daté"] })] } }), ctx);
    expect(all("SELECT id FROM assets WHERE project_id = ? AND role = 'logo-v2' AND status = 'review'", pid)).toHaveLength(r.shown.length);
    expect(all("SELECT id FROM assets WHERE project_id = ? AND role = 'logo-v2-trial' AND status = 'rejected'", pid)).toHaveLength(1);
    for (const role of ["logo", "logo-mono", "logo-stacked", "logo-small", "brand-book", "brand-book-page", "logo-route-board"]) expect(all("SELECT id FROM assets WHERE project_id = ? AND role = ?", pid, role), role).toHaveLength(0);
  });

  it("choix du client : décision du Project Brain, logo validé, PUIS déclinaisons, typographie et charte", async () => {
    const pid = sb();
    const r = await runEngine(pid, mockAi({ calls: [] }));
    const mono = r.shown.find((s) => s.territory.name === "Monogramme construit")!;
    await fr(() => chooseLogoV2(job(pid, "brand.logo.v2.choose"), pid, mono.assetId!));
    expect(one<any>("SELECT value FROM memory WHERE project_id = ? AND kind = 'decision' AND key = 'marque.logo' AND state = 'active'", pid)?.value).toMatch(/^Monogramme construit/);
    const brand = loadProject(pid).brand!;
    expect(brand.validated).toContain("logo");
    expect(brand.logo.status).toBe("validated");
    for (const role of ["logo", "logo-svg", "logo-light", "logo-mark", "favicon", "logo-mono", "logo-mono-svg", "logo-stacked", "logo-small", "brand-guide"]) expect(all("SELECT id FROM assets WHERE project_id = ? AND role = ? AND deleted_at IS NULL", pid, role).length, role).toBeGreaterThan(0);
    // Une proposition écartée ne peut pas devenir le logo.
    const r2 = await runEngine(pid, mockAi({ calls: [] }, { reviews: { "Geste abstrait": [(e) => review(4, e, { issues: ["daté"] })] } }));
    const bad = r2.discarded[0];
    await expect(fr(() => chooseLogoV2(null, pid, bad.assetId!))).rejects.toThrow(/proposition introuvable|n'a pas passé/i);
  });

  it("reprise de tâche : rien n'est rappelé ni repayé (points de reprise)", async () => {
    const pid = sb();
    const log = { calls: [] as string[] };
    const ctx = job(pid);
    await runEngine(pid, mockAi(log), ctx);
    const before = log.calls.length;
    await runEngine(pid, mockAi(log), new JobContext(one<any>("SELECT * FROM jobs WHERE id = ?", ctx.job.id)));
    expect(log.calls.length).toBe(before);
  });

  it("Router V2 et coût : vraie chaîne d'appels (fournisseur simulé) — modèle fort, relecture forte d'emblée, coûts tracés, plafond réel", async () => {
    const pid = sb();
    const b = fr(() => brandDiscovery(loadProject(pid)));
    respond = (params: any) => {
      const sys = JSON.stringify(params.system);
      if (sys.includes("TERRITOIRES CRÉATIFS")) return JSON.stringify({ territories: draftsFor(b).slice(0, 3) });
      if (sys.includes("SYMBOLE d'un territoire")) return JSON.stringify({ idea: "forme", svg: SVG_OK });
      const exp = /Texte attendu \(exact\) : « ([^»]+) »/.exec(JSON.stringify(params.messages))?.[1] ?? "";
      return JSON.stringify(review(8.7, exp));
    };
    const ctx = job(pid);
    const r = await fr(() => runLogoEngineV2(ctx, pid, { ai: realLogoV2Ai(ctx, { userId: u.id, projectId: pid }) }));
    expect(r.shown.length).toBe(3);
    const calls = all<any>("SELECT task, requested_model, routing_reason, prompt_key, cost, brain_scope FROM ai_calls WHERE job_id = ? ORDER BY created_at, rowid", ctx.job.id);
    expect(calls[0]).toMatchObject({ task: "logo_symbol", requested_model: "claude-opus-5-5", prompt_key: "logo-v2-territories", brain_scope: "logo" });
    const reviews = calls.filter((c) => c.prompt_key === "logo-v2-review");
    expect(reviews.length).toBe(3);
    for (const c of reviews) expect(c).toMatchObject({ task: "quality_control", requested_model: "claude-opus-5-5", routing_reason: "complex request: strongest permitted model directly" });
    expect(calls.every((c) => c.cost > 0)).toBe(true);
    // Plafond réel : au-delà, plus aucun appel ne part ; ce qui est fait reste.
    const capped = job(pid);
    const before = sent.length;
    const r2 = await fr(() => withTrace({ jobId: capped.job.id, costCapMicro: calls[0].cost + 1 }, () => runLogoEngineV2(capped, pid, { ai: realLogoV2Ai(capped, { userId: u.id, projectId: pid }) })));
    expect(r2.stoppedByCostCap).toBe(true);
    const spent = one<{ c: number }>("SELECT COALESCE(SUM(cost),0) c FROM ai_calls WHERE job_id = ?", capped.job.id)!.c;
    expect(spent).toBeLessThanOrEqual(calls[0].cost + 1);
    expect(sent.length - before).toBeLessThanOrEqual(1);
  });

  it("cinq catégories : le moteur n'a pas une esthétique unique (styles typographiques et compositions différents)", async () => {
    const styles = new Map<string, string>();
    for (const kind of LOGO_FIXTURES) {
      const pid = fr(() => seedLogoFixture(u.id, kind));
      const b = fr(() => brandDiscovery(loadProject(pid)));
      const local = localTerritories(b);
      styles.set(kind, local[0].typography.style);
      const r = await runEngine(pid, mockAi({ calls: [] }));
      expect(r.shown.length, kind).toBeGreaterThanOrEqual(3);
      expect(new Set(r.shown.map((s) => s.candidate.spec.family)).size, kind).toBeGreaterThanOrEqual(2);
    }
    expect(new Set(styles.values()).size).toBeGreaterThanOrEqual(3);
    // Sans IA : versions du studio, provisoires, jamais montrées comme finales.
    const pid = fr(() => seedLogoFixture(u.id, "saas"));
    const r = await runEngine(pid, null);
    expect(r.shown).toHaveLength(0);
    expect(r.studio.length).toBeGreaterThan(0);
    expect(r.studio.every((d) => d.verdict === "PROVISIONAL")).toBe(true);
    expect(r.discarded.some((d) => d.verdict === "PROVISIONAL")).toBe(false);
    // Rangées à part (version du studio), jamais comme proposition finale.
    expect(all("SELECT id FROM assets WHERE project_id = ? AND role = 'logo-v2'", pid)).toHaveLength(0);
    expect(all("SELECT id FROM assets WHERE project_id = ? AND role = 'logo-v2-studio' AND status = 'review'", pid)).toHaveLength(r.studio.length);
  });

  it("aucun cas particulier codé pour le benchmark (Sébastien Blanc, plâtrier) dans le moteur", () => {
    const dir = path.resolve(import.meta.dirname, "../src/lib/logo-v2");
    const src = fs.readdirSync(dir).map((f) => fs.readFileSync(path.join(dir, f), "utf8")).join("\n");
    expect(src).not.toMatch(/S[ée]bastien|pl[âa]tr|plaster|M[âa]con/i);
    expect(src).not.toMatch(/\bBlanc\b/); // nom propre (le mot « blanc », couleur, est permis)
  });
});
