/** Vrai moteur/stockage/charte, fournisseurs et verdicts INJECTÉS. Aucune qualité créative réelle démontrée. */
import { describe, it, expect, vi } from "vitest";
const control = vi.hoisted(() => ({ accepted: ["t1"] as string[], draws: [] as string[], copiedPalettes: false, failAt: null as null | string, uncertain: false, relayCalls: 0, enableRelay: false }));
vi.mock("@/lib/ai/llm", async original => ({ ...await original<object>(), llmConfigured: () => true }));
vi.mock("@/lib/ai/media-providers", async original => ({ ...await original<object>(), mediaRouteFor: (usage: string) => usage === "logo" ? { provider: "openai", model: "gpt-image-2.5-sunburst", reason: "Route injectée de test" } : null }));
vi.mock("@/lib/logo-v2/quote", () => ({ ARTWORK_SERIES: 3, BUILT_SERIES: 4, logoSeriesQuote: () => ({ mode: "artwork", creations: 3, images: 3, imageMaxMicro: 10000, maxMicro: 100000 }), logoRedrawQuote: () => null }));
vi.mock("@/lib/logo-v2/identity", async original => ({ ...await original<object>(), isPlaceholderShape: async () => false }));
vi.mock("@/lib/logo-v2/artwork", async original => ({ ...await original<object>(), faithfulSvg: async () => ({ ok: false, reason: "Vectorisation non testée dans ce scénario injecté." }) }));
vi.mock("@/lib/logo-v2/ai", async original => ({ ...await original<object>(), realLogoV2Ai: () => ({
  territories: async (brief: BrandBrief) => localTerritories(brief).slice(0, 3).map((t, i) => { const identity = directionIdentity(i); return { ...t, identity: control.copiedPalettes ? { ...identity, palette: { ...identity.palette, secondary: "#bfd0b4", accent: "#9b4f2c" } } : identity, source: "ai" }; }),
  artworkRoute: () => ({ provider: "openai", model: "gpt-image-2.5-sunburst" }),
  relayRoute: () => control.enableRelay ? { provider: "simulation", model: "injected-relay" } : { unavailable: "Relais désactivé dans ce scénario." },
  drawArtworkRelay: async () => { control.relayCalls++; throw new Error("Relais simulé qui ne devait pas être appelé après un résultat incertain."); },
  drawArtwork: async (t: Territory) => {
    control.draws.push(t.id);
    if (t.id === control.failAt) {
      if (control.uncertain) throw Object.assign(new Error("Résultat incertain simulé : consommation à vérifier."), { uncertain: true });
      throw new JobCancelled("Interruption simulée après la première direction enregistrée.");
    }
    const n = Number(t.id.slice(1));
    const cells = Array.from({ length: 30 }, (_, i) => `<rect x="${80 + (i * (113 + n * 71)) % 800}" y="${80 + (i * (79 + n * 37)) % 650}" width="${20 + (i * 23) % 120}" height="${20 + (i * 31) % 100}" fill="${i % n === 0 ? "#244c45" : "#a26531"}"/>`).join("");
    return sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="1024" height="1024" fill="white"/>${cells}<text x="120" y="920" font-size="38">SIMULATION UNIQUEMENT ${n}</text></svg>`)).png().toBuffer();
  },
  reviewArtwork: async (_b: Buffer, t: Territory, _brief: BrandBrief, expected: { name: string; descriptor: string | null }) => ({
    criteria: Object.fromEntries(ART_CRITERIA.map(k => [k, control.accepted.includes(t.id) ? 9 : 2])), textRead: `${expected.name} ${expected.descriptor ?? ""}`, nameExact: true, extraText: false, nameBox: null, clumsyCliche: false, resemblesKnownBrand: false, amateur: !control.accepted.includes(t.id), artifacts: false, person: false, issues: [], needsSimplifiedMark: false, genericConcept: false, fix: { target: "none", instruction: "" },
  }),
}) }));
import sharp from "sharp";
import { localTerritories } from "@/lib/logo-v2/territories";
import { ART_CRITERIA, type Territory, type BrandBrief } from "@/lib/logo-v2/types";
import { runLogoEngineV2 } from "@/lib/logo-v2/engine";
import { chooseLogoV2, applyBestLogoV2 } from "@/lib/logo-v2/choose";
import { fixture } from "./preparation-fixtures";
import { validatedBrand, directionIdentity } from "./preparation-mission-fixtures";
import { currentSeries, directionSeries } from "@/lib/logo-v2/direction-series";
import { runForUser } from "@/lib/ai/access";
import { all, one, run } from "@/lib/db";
import { JobContext, JobCancelled, enqueue, getJob } from "@/lib/jobs";
import { loadProject } from "@/lib/projects";
import { runRequestPlan } from "@/lib/orchestrator/execute";
import { prepareWorkflow, startWorkflow, runWorkflow, loadWorkflow } from "@/lib/workflow";
import { requestScope } from "@/lib/orchestrator/request";
import { projectChoices } from "@/lib/orchestrator/references";
import { selectedDirectionCommand } from "@/lib/logo-v2/commands";

const job = (uid: string, pid: string, type = "brand.logo.v2", payload: object = {}) => {
  const j = enqueue({ userId: uid, projectId: pid, type, payload: { projectId: pid, ...payload }, maxAttempts: 1 });
  run("UPDATE jobs SET status='running',attempts=1 WHERE id=?", j.id);
  return new JobContext(getJob(j.id)!);
};
describe("trois directions, reprise, sélection et charte : chaîne réelle avec fournisseur injecté", () => {
  it("une interruption conserve la première direction avant les appels suivants et la reprise ne la redessine pas", async () => {
    const f = await fixture(); validatedBrand(f.pid, f.input); control.draws = []; control.accepted = ["t1", "t2", "t3"]; control.failAt = "t2";
    try {
      await expect(runForUser(f.uid, () => runLogoEngineV2(job(f.uid, f.pid), f.pid), "normal", f.pid)).rejects.toThrow(/Interruption simulée/);
      const kept = currentSeries(f.pid)!.directions[0];
      expect(currentSeries(f.pid)?.directions).toHaveLength(1);
      control.failAt = null;
      await runForUser(f.uid, () => runLogoEngineV2(job(f.uid, f.pid, "brand.logo.v2", { correction: "Reprendre uniquement après l’interruption du traitement." }), f.pid), "normal", f.pid);
      expect(control.draws).toEqual(["t1", "t2", "t2", "t3"]);
      expect(currentSeries(f.pid)?.directions[0].logoId).toBe(kept.logoId);
      expect(currentSeries(f.pid)?.status).toBe("complete");
    } finally { control.failAt = null; control.uncertain = false; }
  });
  it("un résultat incertain arrête la série sans relais ni reprise du même appel ; les directions acceptées restent enregistrées", async () => {
    const f = await fixture(); validatedBrand(f.pid, f.input); control.draws = []; control.accepted = ["t1", "t2", "t3"]; control.failAt = "t2"; control.uncertain = true; control.enableRelay = true; control.relayCalls = 0;
    const ctx = job(f.uid, f.pid);
    try {
      await expect(runForUser(f.uid, () => runLogoEngineV2(ctx, f.pid), "normal", f.pid)).rejects.toThrow(/incertain/);
      expect(currentSeries(f.pid)?.directions).toHaveLength(1);
      expect(ctx.checkpoint["logo:uncertain"]).toBeTruthy();
      control.failAt = null;
      await expect(runForUser(f.uid, () => runLogoEngineV2(ctx, f.pid), "normal", f.pid)).rejects.toThrow(/incertain/);
      expect(control.draws).toEqual(["t1", "t2"]);
      expect(control.relayCalls).toBe(0);
      expect(all("SELECT id FROM ai_calls WHERE project_id=?", f.pid)).toEqual([]);
    } finally { control.failAt = null; control.uncertain = false; control.enableRelay = false; }
  });
  it("bloque le duo secondaire/accent partagé avant le premier dessin, sans substitution locale", async () => {
    const f = await fixture(); validatedBrand(f.pid, f.input); control.draws = []; control.copiedPalettes = true;
    try {
      await expect(runForUser(f.uid, () => runLogoEngineV2(job(f.uid, f.pid), f.pid), "normal", f.pid)).rejects.toThrow(/Palettes à revoir/);
      expect(control.draws).toEqual([]);
      expect(currentSeries(f.pid)?.status).toBe("partial");
      expect(currentSeries(f.pid)?.directions).toEqual([]);
      expect(all("SELECT id FROM ai_calls WHERE project_id=?", f.pid)).toEqual([]);
    } finally { control.copiedPalettes = false; }
  });
  it("répare seulement les directions manquantes, conserve le nom, choisit l'ensemble sans génération ni thème", async () => {
    const f = await fixture(); validatedBrand(f.pid, f.input); control.draws = []; control.accepted = ["t1"];
    const name = loadProject(f.pid).brand!.name;
    const first = await runForUser(f.uid, () => runLogoEngineV2(job(f.uid, f.pid), f.pid), "normal", f.pid);
    expect(currentSeries(f.pid)?.status).toBe("partial");
    expect(currentSeries(f.pid)?.directions).toHaveLength(1);
    const kept = currentSeries(f.pid)!.directions[0].logoId;
    expect(await applyBestLogoV2(null, f.pid, first.shown)).toBeNull();
    expect(loadProject(f.pid).brand?.logo.assetId).toBeUndefined();
    control.accepted = ["t1", "t2", "t3"];
    const resumed = job(f.uid, f.pid, "brand.logo.v2", { correction: "Corriger uniquement les deux directions refusées." });
    await runForUser(f.uid, () => runLogoEngineV2(resumed, f.pid), "normal", f.pid);
    expect(control.draws).toEqual(["t1", "t2", "t3", "t2", "t3"]);
    expect(currentSeries(f.pid)?.status).toBe("complete");
    expect(currentSeries(f.pid)?.directions[0].logoId).toBe(kept);
    expect(directionSeries(f.pid)).toHaveLength(1);
    const selected = currentSeries(f.pid)!.directions[1];
    const applied = await chooseLogoV2(null, f.pid, selected.logoId);
    const brand = loadProject(f.pid).brand!;
    expect(brand.name).toBe(name);
    expect(brand.tagline).toBe(selected.identity.signature);
    expect(brand.palette).toEqual(selected.identity.palette);
    expect(brand.fonts).toEqual(selected.identity.fonts);
    expect(brand.tone).toEqual(selected.identity.tone);
    expect(brand.artIdentity?.graphicLanguage).toBe(selected.identity.graphicLanguage);
    // Rechargement du stockage, pas la référence en mémoire passée au service de choix.
    const restored = JSON.parse(JSON.stringify(loadProject(f.pid).brand!));
    expect(restored.palette).toEqual(selected.identity.palette);
    expect(restored.artIdentity.colorRoles).toEqual(selected.identity.colorRoles);
    expect(currentSeries(f.pid)?.selectedId).toBe(selected.id);
    expect(currentSeries(f.pid)?.directions.find(d => d.id === selected.id)?.identity.palette).toEqual(restored.palette);
    for (const role of ["logo", "logo-light", "logo-white", "logo-mono", "brand-guide", "brand-book"]) expect(one("SELECT id FROM assets WHERE project_id=? AND role=? AND deleted_at IS NULL", f.pid, role)).toBeTruthy();
    const before = all("SELECT id FROM assets WHERE project_id=?", f.pid).length;
    expect(await chooseLogoV2(null, f.pid, selected.logoId)).toMatchObject({ main: applied.main, reused: true });
    expect(all("SELECT id FROM assets WHERE project_id=?", f.pid)).toHaveLength(before);
    expect(all("SELECT id FROM theme_versions WHERE project_id=?", f.pid)).toEqual([]);
    expect(all("SELECT id FROM ai_calls WHERE project_id=?", f.pid)).toEqual([]);

    // La conversation principale prépare le même service de sélection, à coût zéro, puis le worker l'applique.
    const workflow = await prepareWorkflow(f.pid, f.uid, "Choisis la direction 3", { aiActive: false });
    expect(workflow.status).toBe("draft"); expect(workflow.estimate.totalMicro).toBe(0); expect(workflow.estimate.needsCreation).toBe(false);
    expect(workflow.params.directionChoice?.directionId).toBe("t3");
    const launched = startWorkflow(workflow.id), ctx = new JobContext(getJob(launched.jobId!)!);
    run("UPDATE jobs SET status='running' WHERE id=?", ctx.job.id);
    await runForUser(f.uid, () => runWorkflow(ctx), "normal", f.pid);
    expect(loadWorkflow(workflow.id)?.status).toBe("done");
    expect(loadProject(f.pid).brand?.artIdentity?.directionId).toBe("t3");
    expect(control.draws).toHaveLength(5);

    // La tâche de plan conserve le même point d'entrée sans relancer le dessin.
    await runForUser(f.uid, () => runRequestPlan(job(f.uid, f.pid, "plan.run", { text: "Choisis la direction 2" })), "normal", f.pid);
    expect(loadProject(f.pid).brand?.artIdentity?.directionId).toBe("t2"); expect(control.draws).toHaveLength(5);
    for (const text of ["Ne choisis pas la direction 3", "Explique la direction 3", "Choisis la direction 3, conserve la palette"]) expect(selectedDirectionCommand(f.pid, requestScope(text, projectChoices(f.pid)))).toBeNull();
  }, 60000);
});
