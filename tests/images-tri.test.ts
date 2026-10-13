/**
 * Onglet Images : une publication refaite (changement de modèle, éditeur) devient une nouvelle VERSION de la même
 * image (plus de doublon dans la liste), tri par statut, encart « Supprimées » avec restauration, et nouveaux types de
 * publications (offre, événement, avis client…) dont le texte vient toujours du client.
 */
import sharp from "sharp";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

let sessionUser: any = null;
vi.mock("@/lib/auth", async (orig) => {
  const real = await orig<typeof import("@/lib/auth")>();
  return { ...real, currentUser: async () => sessionUser, requireUser: async () => sessionUser ?? (() => { throw new real.HttpError(401, "Connexion requise."); })() };
});
vi.mock("@/lib/ai/llm", async (orig) => ({ ...(await orig<typeof import("@/lib/ai/llm")>()), llmConfigured: () => false }));

beforeEach(() => vi.stubGlobal("fetch", async () => new Response("{}", { status: 404 })));
afterEach(() => vi.unstubAllGlobals());

const photo = () => sharp({ create: { width: 1600, height: 1200, channels: 3, background: { r: 120, g: 140, b: 160 } } }).jpeg().toBuffer();

describe("Images : versions, tri, supprimées, nouveaux types", async () => {
  const { createUser } = await import("@/lib/auth");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { grantProjectPlan } = await import("@/lib/project-subscriptions");
  const { saveAsset, getAsset, assetMeta } = await import("@/lib/library");
  const { latestDoc, saveAndRender } = await import("@/lib/ad-doc/store");
  const { JobContext, enqueue } = await import("@/lib/jobs");
  const { generateServiceSingleImage } = await import("@/lib/engine/service-media");
  const files = await import("@/app/api/projects/[id]/files/route");
  const images = await import("@/app/api/projects/[id]/images/route");
  const one = await import("@/app/api/files/[fid]/route");
  const { seedThemeScenario } = await import("./theme-v2-fixtures");
  const fr = <T,>(fn: () => Promise<T>) => runWithLang({ ui: "fr", content: "fr" }, fn);

  const setup = async () => {
    const u = await createUser(`tri${Date.now()}${Math.random().toString(36).slice(2, 6)}@test.fr`, "motdepasse-test", "T");
    const pid = await seedThemeScenario(u.id, "artisan");
    grantProjectPlan(pid, "vendre");
    const ph = await saveAsset({ projectId: pid, userId: u.id, data: await photo(), name: "salle.jpg", mime: "image/jpeg", role: "lifestyle", folderKey: "images.scenes", origin: "upload", meta: {} });
    sessionUser = { ...u, role: "client" };
    const job = enqueue({ userId: u.id, projectId: pid, type: "image.single", payload: { projectId: pid, request: {} } });
    return { u, pid, ph, job };
  };
  const list = async (pid: string, q: string) => (await (await fr(() => files.GET(new Request(`http://localhost:3000/api/projects/${pid}/files?role=social${q}`), { params: Promise.resolve({ id: pid }) } as any))).json()).assets as { id: string; status: string }[];

  it("nouveau type « Offre du moment » : affiche modifiable avec le texte du client ; sans texte, rien n'est inventé", async () => {
    const { pid, ph, job } = await setup();
    const r = await fr(() => generateServiceSingleImage(new JobContext(job), pid, { kind: "promo", format: "portrait", headline: "-20 % sur les sessions du jeudi", background: "photo", photoId: ph.id }));
    const m = assetMeta<any>(getAsset(r.assetId)!);
    expect(m.engine).toBe("poster");
    const d = latestDoc(pid, m.poster.docKey)!;
    expect(d.doc.layers.some((l) => l.role === "title" && "text" in l && l.text === "-20 % sur les sessions du jeudi")).toBe(true);
    await expect(fr(() => generateServiceSingleImage(new JobContext(job), pid, { kind: "review", format: "square", background: "photo" }))).rejects.toThrow(/vrai avis/);
  }, 120_000);

  it("double clic : la même demande envoyée deux fois ne crée qu'une seule tâche", async () => {
    const { pid } = await setup();
    const post = async () => (await (await fr(() => images.POST(new Request(`http://localhost:3000/api/projects/${pid}/images`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode: "single", kind: "promo", format: "portrait", headline: "-20 % le jeudi", background: "none" }) }), { params: Promise.resolve({ id: pid }) } as any))).json()).jobId as string;
    const a = await post();
    const b = await post();
    expect(a).toBeTruthy();
    expect(b).toBe(a);
  });

  it("changement de modèle : nouvelle version liée, la liste n'affiche que la dernière ; tri par statut ; supprimées et restauration", async () => {
    const { pid, ph, job, u } = await setup();
    const r = await fr(() => generateServiceSingleImage(new JobContext(job), pid, { kind: "event", format: "square", headline: "Soirée Halloween le 31 octobre", background: "photo", photoId: ph.id }));
    const first = r.assetId;
    const key = assetMeta<any>(getAsset(first)!).poster.docKey;
    const v = await fr(() => saveAndRender(pid, u.id, key, latestDoc(pid, key)!.doc, "modèle"));
    const second = v.renderedAssetId!;
    expect(getAsset(second)!.version_of).toBe(first);
    const latest = (await list(pid, "&latest=1")).map((a) => a.id);
    expect(latest).toContain(second);
    expect(latest).not.toContain(first);
    expect((await list(pid, "")).map((a) => a.id)).toEqual(expect.arrayContaining([first, second]));
    // Tri par statut.
    await fr(() => one.PATCH(new Request(`http://localhost:3000/api/files/${second}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "approved" }) }), { params: Promise.resolve({ fid: second }) }));
    expect((await list(pid, "&latest=1&status=approved")).map((a) => a.id)).toEqual([second]);
    expect((await list(pid, "&latest=1&status=review")).map((a) => a.id)).not.toContain(second);
    // Supprimée : absente de la liste, présente dans « Supprimées », restaurable.
    await fr(() => one.DELETE(new Request(`http://localhost:3000/api/files/${second}`, { method: "DELETE" }), { params: Promise.resolve({ fid: second }) }));
    expect((await list(pid, "&latest=1")).map((a) => a.id)).not.toContain(second);
    expect((await list(pid, "&trash=1")).map((a) => a.id)).toContain(second);
    await fr(() => one.PATCH(new Request(`http://localhost:3000/api/files/${second}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ restore: true }) }), { params: Promise.resolve({ fid: second }) }));
    expect((await list(pid, "&latest=1")).map((a) => a.id)).toContain(second);
  }, 120_000);
});
