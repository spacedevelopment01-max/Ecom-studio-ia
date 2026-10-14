/**
 * Retouche par l'IA d'une photo livrée : le client écrit sa demande dans l'éditeur, la photo de la publicité part au
 * modèle d'images AVEC la demande (rien d'autre ne doit bouger), la nouvelle photo garde le cadre de l'ancienne et
 * reste liée à elle (retour possible). L'IA est simulée ici : aucun appel payant.
 */
import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";

let sessionUser: any = null;
const sent: any[] = [];
vi.mock("@/lib/auth", async (orig) => {
  const real = await orig<typeof import("@/lib/auth")>();
  return { ...real, currentUser: async () => sessionUser, requireUser: async () => sessionUser ?? (() => { throw new real.HttpError(401, "Connexion requise."); })() };
});
vi.mock("@/lib/plan-gates", async (orig) => ({ ...(await orig<any>()), requireCreationPlan: () => "vendre" }));
vi.mock("@/lib/ai/media-providers", async (orig) => ({
  ...(await orig<any>()),
  editPhoto: async (ctx: any, input: any) => (sent.push({ ctx, input }), sharp({ create: { width: 1024, height: 1536, channels: 3, background: "#c84" } }).png().toBuffer()),
}));

describe("retouche de la photo livrée par l'IA", async () => {
  const { createUser } = await import("@/lib/auth");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { saveAsset, getAsset, assetData, assetMeta } = await import("@/lib/library");
  const { editAspect, editProjectPhoto } = await import("@/lib/image-v2/edit-photo");
  const { editPhotoPrompt } = await import("@/lib/ai/media-providers");
  const { JobContext } = await import("@/lib/jobs");
  const { id, now, one, run } = await import("@/lib/db");
  const route = await import("@/app/api/projects/[id]/images/v2/route");
  const { seedImageFixture } = await import("./image-v2-fixtures");
  const fr = <T,>(fn: () => Promise<T>) => runWithLang({ ui: "fr", content: "fr" }, fn);
  const u = await createUser(`retouche-${Date.now()}@test.fr`, "motdepasse-test", "R");
  const pid = seedImageFixture(u.id, "artisan");
  const photo = async (w = 1080, h = 1920) => saveAsset({ projectId: pid, userId: u.id, data: await sharp({ create: { width: w, height: h, channels: 3, background: "#468" } }).jpeg().toBuffer(), name: "bouquet.jpg", mime: "image/jpeg", role: "ad", origin: "generated", meta: {} });
  const post = (b: unknown) => fr(() => route.POST(new Request(`http://localhost:3000/api/projects/${pid}/images/v2`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) }), { params: Promise.resolve({ id: pid }) } as any));

  it("format de retouche le plus proche de la photo d'origine", () => {
    expect(editAspect(1080, 1920)).toBe("9:16");
    expect(editAspect(1024, 1536)).toBe("9:16");
    expect(editAspect(1080, 1350)).toBe("4:5");
    expect(editAspect(1000, 1000)).toBe("1:1");
    expect(editAspect(1920, 1080)).toBe("16:9");
  });

  it("consigne : seule la demande change, produit gardé, aucun texte ajouté", () => {
    const p = editPhotoPrompt("ajoute des pétales sur la table", "9:16");
    expect(p).toContain("ajoute des pétales sur la table");
    expect(p).toMatch(/Apply only this change/);
    expect(p).toMatch(/same product/);
    expect(p).toMatch(/Do not add any text/);
  });

  it("l'éditeur lance une retouche (tâche), refusée sans demande ou pour une photo d'un autre projet", async () => {
    sessionUser = { ...u, role: "client" };
    const a = await photo();
    const ok = await post({ action: "edit", assetId: a.id, instruction: "lumière plus chaude" });
    expect(ok.status).toBe(200);
    const job = one<any>("SELECT * FROM jobs WHERE id = ?", (await ok.json()).jobId);
    expect(job.type).toBe("image.edit");
    expect(JSON.parse(job.payload)).toMatchObject({ projectId: pid, assetId: a.id, instruction: "lumière plus chaude" });
    expect((await post({ action: "edit", assetId: a.id, instruction: "" })).status).toBe(400);
    expect((await post({ action: "edit", assetId: "inconnu", instruction: "plus chaud" })).status).toBe(404);
  });

  it("la nouvelle photo garde le cadre de l'ancienne et lui reste liée", async () => {
    const a = await photo(1080, 1920);
    const jid = id();
    run("INSERT INTO jobs (id, user_id, project_id, type, label, payload, status, run_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)", jid, u.id, pid, "image.edit", "test", "{}", "running", now(), now(), now());
    const r = await fr(() => editProjectPhoto(new JobContext(one<any>("SELECT * FROM jobs WHERE id = ?", jid)), pid, a.id, "ajoute des pétales sur la table"));
    const last = sent.at(-1);
    expect(last.input.instruction).toBe("ajoute des pétales sur la table");
    expect(last.input.aspect).toBe("9:16");
    expect(last.input.image.equals(assetData(getAsset(a.id)!))).toBe(true); // la photo livrée, telle quelle
    const out = getAsset(r.assetId)!;
    expect(out.source_asset_id).toBe(a.id);
    expect(assetMeta<any>(out).photoEdit).toMatchObject({ from: a.id, instruction: "ajoute des pétales sur la table" });
    const m = await sharp(assetData(out)).metadata();
    expect([m.width, m.height]).toEqual([1080, 1920]);
    expect(getAsset(a.id)!.deleted_at).toBeFalsy(); // l'originale est gardée
  });
});
