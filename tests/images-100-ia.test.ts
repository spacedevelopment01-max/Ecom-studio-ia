/**
 * Images finales 100 % IA (règle du propriétaire) : chaque parcours d'image finale passe par un modèle d'images ;
 * sans IA, rien n'est composé à la place (ni gabarit, ni photo de banque). Outils simulés : aucun appel réel.
 */
import { describe, expect, it, vi } from "vitest";

let sessionUser: any = null;
let aiOn = false;
vi.mock("@/lib/auth", async (orig) => {
  const real = await orig<typeof import("@/lib/auth")>();
  return { ...real, currentUser: async () => sessionUser, requireUser: async () => sessionUser ?? (() => { throw new real.HttpError(401, "Connexion requise."); })() };
});
vi.mock("@/lib/ai/access", async (orig) => ({ ...(await orig<typeof import("@/lib/ai/access")>()), aiActiveFor: () => aiOn }));
vi.mock("@/lib/ai/llm", async (orig) => ({ ...(await orig<typeof import("@/lib/ai/llm")>()), llmConfigured: () => false }));
vi.mock("@/lib/engine/cutouts", async (orig) => ({ ...(await orig<typeof import("@/lib/engine/cutouts")>()), ensureCutouts: async () => [] }));

describe("Images finales 100 % IA", async () => {
  const { createUser } = await import("@/lib/auth");
  const { id, now, one, run } = await import("@/lib/db");
  const { JobContext } = await import("@/lib/jobs");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { loadProject } = await import("@/lib/projects");
  const { grantProjectPlan } = await import("@/lib/project-subscriptions");
  const { seedImageFixture } = await import("./image-v2-fixtures");
  const route = await import("@/app/api/projects/[id]/images/route");
  const artRoute = await import("@/app/api/projects/[id]/images/art-direction/route");
  const { runImageSetV2, imageSetPlan } = await import("@/lib/image-v2/set");
  const { imageV2Kind } = await import("@/lib/image-v2/ai-only");
  const { realSocialDeps } = await import("@/lib/social-v2/deps");
  const fr = <T,>(fn: () => Promise<T> | T) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());

  const u = await createUser(`img100-${Date.now()}@test.fr`, "motdepasse-test", "I");
  const seed = (k: "cosmetic" | "artisan") => {
    const pid = seedImageFixture(u.id, k);
    grantProjectPlan(pid, "vendre");
    return pid;
  };
  const job = (projectId: string) => {
    const jid = id();
    run("INSERT INTO jobs (id, user_id, project_id, type, label, payload, status, run_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)", jid, u.id, projectId, "images.generate", "test", "{}", "running", now(), now(), now());
    return new JobContext(one<any>("SELECT * FROM jobs WHERE id = ?", jid));
  };
  const post = (pid: string, b: unknown) => fr(() => route.POST(new Request(`http://localhost:3000/api/projects/${pid}/images`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) }), { params: Promise.resolve({ id: pid }) } as any));
  const lastJob = (pid: string) => one<{ type: string; payload: string }>("SELECT type, payload FROM jobs WHERE project_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 1", pid)!;

  it("onglet Images : plus d'image « gratuite » du studio ; sans IA, refus expliqué (aucun gabarit)", async () => {
    const pid = seed("cosmetic");
    sessionUser = { ...u, role: "client" };
    aiOn = true;
    const free = await post(pid, { mode: "single", visual: "free", kind: "packshot" });
    expect(free.status).toBe(410);
    aiOn = false;
    const off = await post(pid, { mode: "single", kind: "scene" });
    expect(off.status).toBe(402);
    expect((await off.json()).error).toMatch(/aucune image n'est créée à la place par un gabarit/i);
  });

  it("onglet Images : chaque type part vers l'IA (image produit, scène, bannière : génération seule ; visuels avec texte : publication IA)", async () => {
    const pid = seed("cosmetic");
    sessionUser = { ...u, role: "client" };
    aiOn = true;
    for (const [kind, type, v2] of [["packshot", "image.v2", "packshot"], ["scene", "image.v2", "lifestyle"], ["banner", "image.v2", "banner"], ["ambiance", "image.v2", "ambiance"], ["promo", "image.ai_post", null]] as const) {
      const r = await post(pid, { mode: "single", kind, headline: kind });
      expect(r.status, kind).toBe(200);
      const j = lastJob(pid);
      expect(j.type, kind).toBe(type);
      const req = JSON.parse(j.payload).request;
      if (v2) expect(req).toMatchObject({ kind: v2, noStock: true, allowGenerate: true });
    }
    await post(pid, { mode: "set" });
    expect(lastJob(pid).type).toBe("images.generate");
    expect(imageV2Kind(true, "scene")).toBe("trade_photo");
  });

  it("jeu d'images : chaque image demandée à l'IA (génération seule) ; sans IA, rien n'est créé et la raison est dite", async () => {
    const pid = seed("cosmetic");
    const asks: any[] = [];
    const fake = (async (_c: unknown, _p: string, req: any) => (asks.push(req), { outcomes: [], notes: [], stoppedByCostCap: false })) as any;
    aiOn = false;
    const none = await fr(() => runImageSetV2(job(pid), pid, fake));
    expect(asks).toHaveLength(0);
    expect(none.created).toEqual([]);
    expect(none.notes.join(" ")).toMatch(/aucun gabarit ni photo de banque/);
    aiOn = true;
    await fr(() => runImageSetV2(job(pid), pid, fake));
    expect(asks.map((a) => a.kind)).toEqual(imageSetPlan(false).map((x) => x.kind));
    expect(asks.every((a) => a.noStock === true && a.allowGenerate === true)).toBe(true);
    asks.length = 0;
    const svc = seed("artisan");
    await fr(() => runImageSetV2(job(svc), svc, fake));
    expect(asks.map((a) => a.kind)).toEqual(["trade_photo", "trade_photo", "banner"]);
    expect(asks.every((a) => a.noStock === true)).toBe(true);
  });

  it("publications : sans dépense acceptée, aucun visuel de gabarit (plus de secours silencieux)", async () => {
    const p = loadProject(seed("cosmetic"));
    const d = realSocialDeps(null, p, false);
    const brief = { id: "x", network: "instagram", format: "feed", title: "Titre", caption: "", pillar: null, objective: null, headline: "Titre", scheduled_at: null };
    for (const fn of [d.image, d.ad, d.aiPost!]) {
      const r = await fr(() => fn.call(d, p, brief, { allowPaid: false, maxCostEur: 0 }));
      expect(r.assetId).toBeNull();
      expect(r.note).toMatch(/aucun gabarit/);
    }
  });

  it("direction artistique du projet : lue par l'API, ajustée par le client, versionnée", async () => {
    const pid = seed("cosmetic");
    sessionUser = { ...u, role: "client" };
    const ctx = { params: Promise.resolve({ id: pid }) } as any;
    const g = await (await fr(() => artRoute.GET(new Request(`http://localhost:3000/api/projects/${pid}/images/art-direction`), ctx))).json();
    expect(g.artDirection.universe).toBeTruthy();
    const v = g.artDirection.version;
    const r = await fr(() => artRoute.PATCH(new Request(`http://localhost:3000/api/projects/${pid}/images/art-direction`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ light: "lumière rasante du soir", avoid: ["fond rose"] }) }), ctx));
    const b = await r.json();
    expect(b.artDirection.light).toBe("lumière rasante du soir");
    expect(b.artDirection.avoid).toContain("fond rose");
    expect(b.artDirection.version).toBe(v + 1);
    expect(one<{ n: number }>("SELECT COUNT(*) n FROM memory WHERE project_id = ? AND key = 'image.art_direction' AND status != 'rejected'", pid)!.n).toBe(1);
  });
});
