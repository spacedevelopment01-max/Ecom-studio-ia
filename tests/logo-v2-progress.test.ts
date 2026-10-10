/**
 * Logo V2 — avancement et échecs visibles (fournisseurs SIMULÉS, aucun appel payant) :
 *  - images non dessinées (refus du fournisseur) : chaque direction est montrée en échec avec sa raison ; la série
 *    est enregistrée (plus de « aucune direction n'a atteint le niveau attendu » sans explication) ;
 *  - interruption de la série : étape « échec » et erreur écrites avant que la tâche échoue ;
 *  - série réussie : directions contrôlées (verdict, note, proposition) ; le point d'accès renvoie la tâche et
 *    l'avancement, y compris une tâche ÉCHOUÉE avec son erreur.
 */
import { describe, expect, it, vi } from "vitest";
import sharp from "sharp";

let sessionUser: any = null;
vi.mock("@/lib/auth", async (orig) => {
  const real = await orig<typeof import("@/lib/auth")>();
  return { ...real, currentUser: async () => sessionUser, requireUser: async () => sessionUser ?? (() => { throw new real.HttpError(401, "Connexion requise."); })() };
});
vi.mock("@/lib/ai/config", async (orig) => ({ ...(await orig<object>()), activeProviderKey: () => null }));

describe("Logo V2 — avancement et échecs visibles", async () => {
  const { createUser } = await import("@/lib/auth");
  const { one, run } = await import("@/lib/db");
  const { getSubscription, syncAllowance } = await import("@/lib/billing");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { JobContext, failJob, getJob } = await import("@/lib/jobs");
  const { runLogoEngineV2 } = await import("@/lib/logo-v2/engine");
  const { readLive } = await import("@/lib/logo-v2/live");
  const { ART_CRITERIA } = await import("@/lib/logo-v2/types");
  const { seedLogoFixture } = await import("./logo-v2-fixtures");
  const { mockAi } = await import("./logo-v2-mock");
  const route = await import("@/app/api/projects/[id]/brand/logo-v2/route");
  const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);

  const u = await createUser(`logoprog${Date.now()}@test.fr`, "motdepasse-test", "P");
  getSubscription(u.id);
  run("UPDATE subscriptions SET status = 'active', plan = 'creer' WHERE user_id = ?", u.id);
  syncAllowance(u.id);
  sessionUser = { ...u, role: "client" };
  let n = 0;
  const job = (pid: string) => {
    const jid = `job-prog-${Date.now()}-${n++}`;
    run("INSERT INTO jobs (id, user_id, project_id, type, label, payload, status, run_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)", jid, u.id, pid, "brand.logo.v2", "Logo : directions créatives", JSON.stringify({ projectId: pid }), "running", Date.now() + n, Date.now() + n, Date.now() + n);
    return new JobContext(one<any>("SELECT * FROM jobs WHERE id = ?", jid));
  };
  const view = async (pid: string) => (await route.GET(new Request(`http://x/api/projects/${pid}/brand/logo-v2`), { params: Promise.resolve({ id: pid }) } as any)).json();
  const DRAFTS = (b: any) => ["Direction A", "Direction B", "Direction C"].map((name, i) => ({ name, concept: `Concept ${name} pour ${b.name}.`, whyItFits: "Traduit la marque pour sa clientèle.", markType: ["wordmark", "symbol_wordmark", "monogram"][i], composition: ["wordmark_only", "stacked", "horizontal"][i], construction: ["typographic", "geometric", "organic"][i], sobriety: [1, 3, 5][i], style: ["typographic", "minimal", "premium"][i], symbolIdea: i ? "un signe" : null, typography: { style: "grotesque", weight: "bold", case: "upper", tracking: "normal", rationale: "" }, colorRole: { ink: "dark", accent: "primary", rationale: "" }, distinctive: "", avoid: [] }));
  const png = () => sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect width="600" height="600" fill="#fff"/><circle cx="300" cy="250" r="140" fill="#446274"/><rect x="150" y="430" width="300" height="60" fill="#222"/></svg>`)).png().toBuffer();
  const review = (exp: any, score = 8.6) => ({ criteria: Object.fromEntries(ART_CRITERIA.map((k) => [k, score])), textRead: exp.name, nameExact: true, extraText: false, nameBox: null, clumsyCliche: false, resemblesKnownBrand: false, amateur: false, artifacts: false, issues: [], needsSimplifiedMark: true });
  const ai = (o: { draw?: (t: any) => Promise<Buffer>; route?: () => any; score?: (t: any) => number } = {}) => ({
    ...mockAi({ calls: [] }, { drafts: DRAFTS as any }),
    artworkRoute: o.route ?? (() => ({ provider: "openai", model: "gpt-image-2" })),
    drawArtwork: o.draw ?? (async () => png()),
    reviewArtwork: async (_b: Buffer, t: any, _br: any, exp: any) => review(exp, o.score?.(t) ?? 8.6),
  });

  it("images refusées par le fournisseur : chaque direction en échec avec la vraie raison, série enregistrée et affichée", async () => {
    const pid = fr(() => seedLogoFixture(u.id, "artisan"));
    const ctx = job(pid);
    const refused = async () => {
      throw new Error("Requête refusée par OpenAI : Transparent background is not supported for this model.");
    };
    const r = await fr(() => runLogoEngineV2(ctx, pid, { ai: ai({ draw: refused }) as any }));
    expect(r.shown.length + r.discarded.length).toBe(0);
    const live = readLive(pid)!;
    expect(live.stage).toBe("done");
    expect(live.directions.map((d) => d.status)).toEqual(["failed", "failed", "failed"]);
    expect(live.directions[0].reason).toMatch(/image non dessinée : Requête refusée par OpenAI : Transparent background/);
    const v = await view(pid);
    expect(v.run.id).toBe(ctx.job.id);
    expect(v.run.failures).toHaveLength(3);
    expect(v.run.failures[0]).toMatchObject({ name: "Direction A", style: "typographic" });
    expect(v.live.jobId).toBe(ctx.job.id);
  });

  it("interruption de la série : étape « échec » et erreur écrites, puis la tâche échoue (erreur visible dans le point d'accès)", async () => {
    const pid = fr(() => seedLogoFixture(u.id, "artisan"));
    const ctx = job(pid);
    const boom = () => {
      throw new Error("tarif du modèle introuvable");
    };
    await expect(fr(() => runLogoEngineV2(ctx, pid, { ai: ai({ route: boom }) as any }))).rejects.toThrow(/tarif du modèle introuvable/);
    expect(readLive(pid)).toMatchObject({ jobId: ctx.job.id, stage: "failed", error: "tarif du modèle introuvable" });
    // Ce que fait le worker quand une tâche lève une erreur.
    fr(() => failJob(getJob(ctx.job.id)!, new Error("tarif du modèle introuvable"), { permanent: true }));
    const v = await view(pid);
    expect(v.job).toMatchObject({ id: ctx.job.id, status: "failed" });
    expect(v.job.error).toMatch(/tarif du modèle introuvable/);
    expect(v.live).toMatchObject({ stage: "failed" });
  });

  it("série réussie : chaque direction contrôlée (validée ou écartée, avec note et proposition), visible après « rechargement »", async () => {
    const pid = fr(() => seedLogoFixture(u.id, "artisan"));
    const ctx = job(pid);
    await fr(() => runLogoEngineV2(ctx, pid, { ai: ai({ score: (t) => (t.name === "Direction B" ? 6.8 : 8.6) }) as any }));
    run("UPDATE jobs SET status = 'done', progress = 1 WHERE id = ?", ctx.job.id);
    const live = readLive(pid)!;
    expect(live.directions.map((d) => [d.status, d.verdict])).toEqual([["done", "FINAL"], ["done", "REJECTED"], ["done", "FINAL"]]);
    expect(live.directions.every((d) => !!d.assetId)).toBe(true);
    // Lecture fraîche (comme après un rechargement de la page) : propositions, essai écarté avec son image, tâche terminée.
    const v = await view(pid);
    expect(v.proposals).toHaveLength(2);
    expect(v.discarded).toHaveLength(1);
    expect(v.discarded[0].url).toMatch(/^\/api\/files\//);
    expect(v.job).toMatchObject({ status: "done" });
  });
});
