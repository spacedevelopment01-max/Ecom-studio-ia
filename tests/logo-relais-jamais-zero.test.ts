/**
 * Règle du propriétaire : « il ne doit jamais y avoir aucune direction ». Qwen-Image dessine ; si le contrôle juge le
 * rendu insuffisant (ou si l'image n'a pas pu être dessinée), OpenAI prend le relais ; à la fin, toujours au moins un
 * logo présenté (le meilleur, signalé s'il n'est pas validé). Une tâche interrompue ne bloque jamais l'onglet :
 * « Arrêter » la libère, et une tâche sans traitement actif est signalée. Aucun appel payant (IA simulée).
 */
import { describe, expect, it, vi } from "vitest";

let sessionUser: any = null;
vi.mock("@/lib/auth", async (orig) => {
  const real = await orig<typeof import("@/lib/auth")>();
  return { ...real, currentUser: async () => sessionUser, requireUser: async () => sessionUser ?? (() => { throw new real.HttpError(401, "Connexion requise."); })() };
});

describe("Logos : relais OpenAI et jamais zéro logo", async () => {
  const { createUser } = await import("@/lib/auth");
  const { json, now, one, run } = await import("@/lib/db");
  const { getSubscription, syncAllowance } = await import("@/lib/billing");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { JobContext } = await import("@/lib/jobs");
  const { runLogoEngineV2, redrawArtwork } = await import("@/lib/logo-v2/engine");
  const { logoJobStalled } = await import("@/lib/logo-v2/live");
  const { artworkPrompt } = await import("@/lib/logo-v2/artwork");
  const { ART_CRITERIA } = await import("@/lib/logo-v2/types");
  const { seedLogoFixture, artFixture } = await import("./logo-v2-fixtures");
  const { mockAi } = await import("./logo-v2-mock");
  const route = await import("@/app/api/projects/[id]/brand/logo-v2/route");
  const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);

  const u = await createUser(`relais${Date.now()}@test.fr`, "motdepasse-test", "R");
  getSubscription(u.id);
  run("UPDATE subscriptions SET status = 'active', plan = 'creer' WHERE user_id = ?", u.id);
  syncAllowance(u.id);
  let n = 0;
  const job = (pid: string, type = "brand.logo.v2") => {
    const jid = `job-relais-${Date.now()}-${n++}`;
    run("INSERT INTO jobs (id, user_id, project_id, type, label, payload, status, run_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)", jid, u.id, pid, type, type, JSON.stringify({ projectId: pid }), "running", Date.now(), Date.now(), Date.now());
    return new JobContext(one<any>("SELECT * FROM jobs WHERE id = ?", jid));
  };
  const sb = () => fr(() => seedLogoFixture(u.id, "artisan"));
  const review = (score: number, exp: any, o: Record<string, any> = {}) => ({
    criteria: Object.fromEntries(ART_CRITERIA.map((k) => [k, score])) as any,
    textRead: [exp.name, exp.descriptor, exp.tagline].filter(Boolean).join(" "),
    nameExact: true, extraText: false, nameBox: null, clumsyCliche: false, resemblesKnownBrand: false,
    amateur: o.amateur ?? false, artifacts: false, person: false, issues: o.issues ?? [], needsSimplifiedMark: true, genericConcept: false,
    fix: o.fix ?? { target: "none", instruction: "" },
  });
  const STYLED = (b: any) => [
    { name: "Atelier illustré", markType: "symbol_wordmark", composition: "stacked", construction: "illustrative", sobriety: 4, style: "illustrated", symbolIdea: "un fer à cheval", descriptor: null },
    { name: "Signe épuré", markType: "abstract_mark", composition: "horizontal", construction: "geometric", sobriety: 1, style: "minimal", symbolIdea: "un angle en négatif" },
    { name: "Lettrage", markType: "wordmark", composition: "wordmark_only", construction: "typographic", sobriety: 2, style: "typographic", symbolIdea: null },
  ].map((o) => ({ concept: `Concept « ${o.name} » pour ${b.name}.`, whyItFits: "Parce que cela traduit le métier pour sa clientèle.", typography: { style: o.markType === "wordmark" ? "classic_serif" : "grotesque", weight: "bold", case: "upper", tracking: "normal", rationale: "" }, colorRole: { ink: "dark", accent: "primary", rationale: "" }, distinctive: "", avoid: [], ...o }));
  const ART: Record<string, number> = { "Atelier illustré": 1, "Signe épuré": 2, Lettrage: 3 };

  /** IA simulée : Qwen (principal) et OpenAI (relais) ; notes de relecture choisies par modèle. */
  function ai(log: string[], o: { qwen?: number | "fail"; openai?: number | "fail"; relay?: boolean } = {}) {
    let relaying = false;
    return {
      ...mockAi({ calls: [], prompts: [] } as any, { drafts: STYLED as any }),
      artworkRoute: () => ({ provider: "alibaba", model: "qwen-image-3.0-pro" }),
      relayRoute: () => (o.relay === false ? { unavailable: "relais OpenAI indisponible (clé OpenAI absente)" } : { provider: "openai", model: "gpt-image-1" }),
      async drawArtwork(t: any, b: any, f?: string) {
        relaying = false;
        log.push(`qwen:${t.name}`);
        artworkPrompt(t, b, f);
        if (o.qwen === "fail") throw new Error("Qwen indisponible");
        return artFixture(ART[t.name] ?? 0);
      },
      async drawArtworkRelay(t: any, b: any, f?: string) {
        relaying = true;
        log.push(`openai:${t.name}${f ? ":critique" : ""}`);
        artworkPrompt(t, b, f);
        if (o.openai === "fail") throw new Error("OpenAI indisponible");
        return artFixture((ART[t.name] ?? 0) + 4);
      },
      async reviewArtwork(_b: Buffer, _t: any, _br: any, exp: any) {
        const s = relaying ? (o.openai === "fail" ? 0 : (o.openai ?? 8.7)) : (o.qwen === "fail" ? 0 : (o.qwen ?? 4.2));
        return review(s as number, exp, s < 7 ? { amateur: true, issues: ["rendu amateur"], fix: { target: "symbol", instruction: "dessin plus net" } } : {});
      },
    };
  }
  const runOf = (pid: string) => json<any>(one<{ value: string }>("SELECT value FROM memory WHERE project_id = ? AND kind = 'artifact' AND key = 'logo_v2_run'", pid)!.value, {});

  it("tous les logos Qwen écartés : OpenAI redessine chacun (avec la critique), ses logos validés sont proposés", async () => {
    const pid = sb();
    const log: string[] = [];
    const r = await fr(() => runLogoEngineV2(job(pid), pid, { ai: ai(log) as any }));
    expect(log.filter((x) => x.startsWith("qwen:"))).toHaveLength(3);
    expect(log.filter((x) => x.startsWith("openai:"))).toEqual(["openai:Atelier illustré:critique", "openai:Signe épuré:critique", "openai:Lettrage:critique"]);
    expect(r.shown).toHaveLength(3);
    expect(r.shown.every((s) => s.candidate.artwork?.provider === "openai:gpt-image-1")).toBe(true);
    // Les logos Qwen écartés restent visibles parmi les essais (images payées, jamais perdues).
    expect(r.discarded.filter((d) => d.candidate.artwork?.provider?.startsWith("alibaba")).length).toBe(3);
    expect(r.notes.join(" ")).toMatch(/relais openai:gpt-image-1/);
  });

  it("Qwen validé : aucun relais (rien de plus n'est dépensé)", async () => {
    const pid = sb();
    const log: string[] = [];
    const r = await fr(() => runLogoEngineV2(job(pid), pid, { ai: ai(log, { qwen: 8.8 }) as any }));
    expect(log.some((x) => x.startsWith("openai:"))).toBe(false);
    expect(r.shown).toHaveLength(3);
  });

  it("Qwen et OpenAI tous deux écartés : le meilleur logo obtenu est présenté, signalé comme non validé — jamais zéro", async () => {
    const pid = sb();
    const r = await fr(() => runLogoEngineV2(job(pid), pid, { ai: ai([], { qwen: 4.1, openai: 5.2 }) as any }));
    expect(r.shown).toHaveLength(0);
    expect(r.best).toBeTruthy();
    const best = r.discarded.find((d) => d.assetId === r.best)!;
    expect(best.score).toBe(Math.max(...r.discarded.map((d) => d.score ?? -1)));
    expect(runOf(pid).best).toBe(r.best);
    expect(r.notes.join(" ")).toMatch(/meilleur logo obtenu présenté/);
    // Le point d'accès le renvoie, et le logo peut être choisi par le client (contrôle humain).
    sessionUser = { ...u, role: "client" };
    const v = await (await route.GET(new Request("http://x"), { params: Promise.resolve({ id: pid }) } as any)).json();
    expect(v.run.best).toBe(r.best);
    expect(v.discarded.find((d: any) => d.id === r.best)?.artwork?.choosable).toBe(true);
  });

  it("aucune image possible (Qwen et OpenAI en panne) : versions du studio construites — jamais zéro", async () => {
    const pid = sb();
    const r = await fr(() => runLogoEngineV2(job(pid), pid, { ai: ai([], { qwen: "fail", openai: "fail" }) as any }));
    expect(r.shown.length + r.studio.length).toBeGreaterThan(0);
    expect(r.studio.length).toBeGreaterThan(0);
    expect(r.notes.join(" ")).toMatch(/versions du studio construites/);
  });

  it("relais indisponible (pas de clé OpenAI) : c'est écrit, et le meilleur logo Qwen est quand même présenté", async () => {
    const pid = sb();
    const log: string[] = [];
    const r = await fr(() => runLogoEngineV2(job(pid), pid, { ai: ai(log, { relay: false }) as any }));
    expect(log.some((x) => x.startsWith("openai:"))).toBe(false);
    expect(r.notes.join(" ")).toMatch(/relais OpenAI indisponible/);
    expect(r.best).toBeTruthy();
  });

  it("nouvelle version écartée par le contrôle : OpenAI la redessine aussi", async () => {
    const pid = sb();
    const first = await fr(() => runLogoEngineV2(job(pid), pid, { ai: ai([], { qwen: 8.8 }) as any }));
    const log: string[] = [];
    const out = await fr(() => redrawArtwork(job(pid, "brand.logo.v2.redraw"), pid, first.shown[0].assetId!, { feedback: "plus sobre", ai: ai(log) as any }));
    expect(log).toEqual(["qwen:Atelier illustré", "openai:Atelier illustré:critique"]);
    expect(out.verdict).toBe("FINAL");
  });

  it("tâche interrompue : signalée quand le traitement ne répond plus, « Arrêter » libère l'onglet et permet de relancer", async () => {
    const t = Date.now();
    run("DELETE FROM worker_heartbeat");
    // Aucun signe de vie du worker depuis 10 min : la tâche en file n'avance plus.
    run("INSERT INTO worker_heartbeat (id, beat_at, info) VALUES (?,?,?)", "w-test", t - 600_000, "{}");
    expect(logoJobStalled({ status: "queued", updated_at: t - 300_000 }, t)).toBe(true);
    expect(logoJobStalled({ status: "running", locked_until: t - 300_000, updated_at: t - 300_000 }, t)).toBe(true);
    // Worker vivant et bail en cours : rien à signaler ; tâche terminée : jamais « bloquée ».
    run("UPDATE worker_heartbeat SET beat_at = ?", t);
    expect(logoJobStalled({ status: "running", locked_until: t + 60_000, updated_at: t - 300_000 }, t)).toBe(false);
    expect(logoJobStalled({ status: "done", updated_at: t - 900_000 }, t)).toBe(false);

    const pid = sb();
    sessionUser = { ...u, role: "client" };
    const req = (body: object) => new Request(`http://localhost:3000/api/projects/${pid}/brand/logo-v2`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const ctx = { params: Promise.resolve({ id: pid }) } as any;
    // Série reprise après une coupure du studio (« Reprise… », 0 %) et worker arrêté.
    run("INSERT INTO jobs (id, user_id, project_id, type, label, payload, status, run_at, message, progress, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)", `stuck-${pid}`, u.id, pid, "brand.logo.v2", "Logo", "{}", "queued", t, "Reprise…", 0, t - 400_000, t - 400_000);
    run("UPDATE worker_heartbeat SET beat_at = ?", t - 600_000);
    const v = await (await route.GET(new Request("http://x"), ctx)).json();
    expect(v.job).toMatchObject({ id: `stuck-${pid}`, stalled: true });
    // Relancer est refusé tant qu'elle est en cours, avec le moyen de s'en sortir…
    const busy = await route.POST(req({ action: "generate" }), ctx);
    expect(busy.status).toBe(409);
    expect(JSON.stringify(await busy.json())).toMatch(/Arrêter/);
    // … « Arrêter » l'annule et libère l'onglet.
    expect((await route.POST(req({ action: "stop" }), ctx)).status).toBe(200);
    expect(one<{ status: string }>("SELECT status FROM jobs WHERE id = ?", `stuck-${pid}`)!.status).toBe("cancelled");
    // Nouvelle politique : le bouton est libéré, mais aucun dessin sans le modèle obligatoire et un plafond connu.
    const pending = await route.POST(req({ action: "generate" }), ctx);
    expect(pending.status).toBe(409);
    expect(JSON.stringify(await pending.json())).toMatch(/en attente/);
    run("UPDATE worker_heartbeat SET beat_at = ?", now());
  });
});
