import { grantProjectPlan } from "./communication-choice-fixture";
/**
 * Retouches demandées en phrase libre dans l'éditeur :
 *  - demande composée comprise par le moteur local, gratuit (« augmente la taille du texte et du titre et centre-le
 *    sur l'image avec le bouton ») ;
 *  - ce que le moteur local ne comprend pas part à l'IA, qui rend des modifications bornées (IA simulée ici) ;
 *  - un autre format s'affiche d'abord en APERÇU : rien n'est créé tant que le client ne valide pas.
 */
import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";

let sessionUser: any = null;
const llm: any[] = [];
vi.mock("@/lib/auth", async (orig) => {
  const real = await orig<typeof import("@/lib/auth")>();
  return { ...real, currentUser: async () => sessionUser, requireUser: async () => sessionUser ?? (() => { throw new real.HttpError(401, "Connexion requise."); })() };
});
vi.mock("@/lib/ai/access", async (orig) => ({ ...(await orig<any>()), assertAiAllowed: () => undefined }));
vi.mock("@/lib/ai/llm", async (orig) => ({
  ...(await orig<any>()),
  llmJson: async (call: any) => (llm.push(call), { changes: [{ id: "title", y: 120, fontSize: 90 }, { id: "inconnu", x: 4 }, { id: "bg-photo", x: 400 }], summary: "Titre remonté et agrandi." }),
}));

describe("retouches composées, IA de secours et aperçu des formats", async () => {
  const { createUser } = await import("@/lib/auth");
  const { json, one } = await import("@/lib/db");
  const { loadProject } = await import("@/lib/projects");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { getAsset, assetData, saveAsset } = await import("@/lib/library");
  const { runAdEngineV2 } = await import("@/lib/ads-v2/engine");
  const { byRole } = await import("@/lib/ad-doc/ops");
  const { localAdEdit } = await import("@/lib/ad-doc/local-edit");
  const { aiChangesToOps } = await import("@/lib/ad-doc/ai-edit");
  const { latestDoc } = await import("@/lib/ad-doc/store");
  const route = await import("@/app/api/projects/[id]/ads/docs/[docKey]/route");
  const { seedImageFixture, seedCutout } = await import("./image-v2-fixtures");
  const { mockAdDeps } = await import("./ads-v2-mock");
  const fr = <T,>(fn: () => Promise<T> | T) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());
  const u = await createUser(`compose-${Date.now()}@test.fr`, "motdepasse-test", "C");

  async function generated() {
    const p = loadProject(seedImageFixture(u.id, "cosmetic"));grantProjectPlan(p.id,"dominer");
    const cutId = await seedCutout(u.id, p.id);
    const cut = assetData(getAsset(cutId)!);
    const logoPng = await sharp({ create: { width: 400, height: 120, channels: 4, background: { r: 20, g: 20, b: 20, alpha: 1 } } }).png().toBuffer();
    const logo = await saveAsset({ projectId: p.id, userId: u.id, data: logoPng, name: "logo.png", mime: "image/png", role: "logo", origin: "generated" });
    const { deps } = mockAdDeps({ userId: u.id, projectId: p.id, cutout: { id: cutId, data: cut }, logo: { id: logo.id, data: logoPng } });
    const r = await fr(() => runAdEngineV2(null, p.id, { count: 1, platforms: ["meta_feed"] }, deps));
    const o = r.outcomes.find((x) => x.aspect === "1:1")!;
    return { p, docKey: json<any>(getAsset(o.assetId!)!.meta, {}).adV2.docKey as string };
  }
  const post = (pid: string, docKey: string, b: unknown) => fr(() => route.POST(new Request(`http://localhost:3000/api/projects/${pid}/ads/docs/${encodeURIComponent(docKey)}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) }), { params: Promise.resolve({ id: pid, docKey }) } as any));

  it("« augmente la taille du texte et du titre et centre-le sur l'image avec le bouton » : fait en local, gratuit", async () => {
    const { p, docKey } = await generated();
    const doc = latestDoc(p.id, docKey)!.doc;
    const r = localAdEdit(doc, "augmente la taille du texte et du titre et centre le sur l'image avec le bouton");
    expect(r.local).toBe(true);
    if (!r.local) return;
    const t0 = byRole(doc, "title") as any, t1 = byRole(r.doc, "title") as any;
    const s0 = byRole(doc, "subtitle") as any, s1 = byRole(r.doc, "subtitle") as any;
    const b1 = byRole(r.doc, "cta")!;
    expect(t1.font.size).toBeGreaterThan(t0.font.size);
    expect(s1.font.size).toBeGreaterThan(s0.font.size);
    expect([t1.align, s1.align]).toEqual(["center", "center"]);
    // Centrés ensemble (sur l'affiche, ou sur le côté libre quand la photo occupe un panneau), jamais sur la photo.
    const cx = t1.x + t1.w / 2;
    for (const l of [s1, b1]) expect(Math.abs(l.x + l.w / 2 - cx)).toBeLessThan(2);
    const panel = r.doc.layers.find((l) => l.kind === "image" && l.role !== "logo" && l.role !== "background" && l.h >= r.doc.height * 0.9 && l.w < r.doc.width * 0.8);
    if (panel) for (const l of [t1, s1, b1]) expect(l.x >= panel.x + panel.w - 1 || l.x + l.w <= panel.x + 1).toBe(true);
    else expect(Math.abs(cx - r.doc.width / 2)).toBeLessThan(2);
    // Rien ne se chevauche dans le bloc : titre, puis texte, puis bouton.
    const stack = [t1, s1, b1].sort((a, b) => a.y - b.y);
    for (let i = 1; i < stack.length; i++) expect(stack[i].y).toBeGreaterThanOrEqual(stack[i - 1].y + stack[i - 1].h - 0.5);
    expect(r.summary).toMatch(/titre agrandi/);
    expect(r.summary).toMatch(/centré/);
  }, 120_000);

  it("demande non comprise en local → IA : modifications bornées, calques inconnus ou fond ignorés", async () => {
    const { p, docKey } = await generated();
    const doc = latestDoc(p.id, docKey)!.doc;
    expect(localAdEdit(doc, "rends l'ensemble plus aéré façon magazine").local).toBe(false);
    sessionUser = { ...u, role: "client" };
    const res = await post(p.id, docKey, { action: "ai_edit", instruction: "rends l'ensemble plus aéré façon magazine", doc });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ops).toEqual([{ op: "update", id: "title", patch: expect.objectContaining({ y: 120, font: expect.objectContaining({ size: 90 }) }) }]);
    expect(llm.at(-1).prompt).toContain("plus aéré");
    // Rien n'est enregistré par l'IA : la version reste la même (l'éditeur applique, le client enregistre).
    expect(latestDoc(p.id, docKey)!.version.version).toBe(1);
    // Bornes : hors de l'affiche ramené dedans, police jamais minuscule.
    const ops = aiChangesToOps(doc, { changes: [{ id: "title", x: -500, y: 99999, fontSize: 2 }], summary: "" });
    const patch = (ops[0] as any).patch;
    expect(patch.x).toBe(0);
    expect(patch.y).toBeLessThanOrEqual(doc.height);
    expect(patch.font.size).toBe(12);
  }, 120_000);

  it("autre format : aperçu sans rien créer, puis création seulement à la validation", async () => {
    const { p, docKey } = await generated();
    sessionUser = { ...u, role: "client" };
    const count = () => one<{ n: number }>("SELECT COUNT(DISTINCT doc_key) n FROM ad_documents WHERE project_id = ?", p.id)!.n;
    const n0 = count();
    const pv = await post(p.id, docKey, { action: "preview_reflow", platform: "linkedin", aspect: "16:9" });
    expect(pv.status).toBe(200);
    const { preview } = await pv.json();
    expect(preview.image).toMatch(/^data:image\/jpeg;base64,/);
    const meta = await sharp(Buffer.from(preview.image.split(",")[1], "base64")).metadata();
    expect(Math.abs(meta.width! / meta.height! - 16 / 9)).toBeLessThan(0.02);
    expect(count()).toBe(n0); // rien de créé
    const ok = await post(p.id, docKey, { action: "reflow", platform: "linkedin", aspect: "16:9" });
    expect(ok.status).toBe(200);
    expect(count()).toBe(n0 + 1);
    const created = await ok.json();
    // La nouvelle création se modifie ensuite comme les autres (nouvelle version à chaque enregistrement).
    const v0 = latestDoc(p.id, created.docKey)!.version.version;
    const doc = latestDoc(p.id, created.docKey)!.doc;
    const save = await post(p.id, created.docKey, { action: "save", doc: { ...doc, layers: doc.layers.map((l) => (l.role === "title" && l.kind === "text" ? { ...l, text: "Nouveau titre" } : l)) } });
    expect(save.status).toBe(200);
    expect(latestDoc(p.id, created.docKey)!.version.version).toBe(v0 + 1);
  }, 120_000);
});
