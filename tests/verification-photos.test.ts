/**
 * Toute photo déposée dans le Studio passe par la vérification gratuite d'OpenAI (limites de l'atelier, point 2), en
 * essais simulés (fausse vérification, aucun appel réel) : vérifiée, elle sert ; impossible à vérifier, elle est
 * GARDÉE (jamais perdue), mise de côté avec une phrase claire, et ne sert à rien de payant tant qu'elle n'est pas
 * vérifiée (le Studio réessaie de lui-même) ; refusée, elle est gardée mais ne sert jamais.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
const state = vi.hoisted(() => ({ user: null as any }));
vi.mock("@/lib/auth", async (orig) => ({ ...(await orig<any>()), requireUser: async () => state.user, currentUser: async () => state.user }));
vi.mock("@/lib/ai/config", async (orig) => ({ ...(await orig<any>()), activeProviderKey: () => "TEST NO REAL PROVIDER" }));
import { createUser } from "@/lib/auth";
import { grantProjectPlan } from "@/lib/project-subscriptions";
import { id, json, now, one, run } from "@/lib/db";
import { seedImageFixture } from "./image-v2-fixtures";
import { assetMeta, getAsset, saveAsset } from "@/lib/library";
import { POST as filesPost } from "@/app/api/projects/[id]/files/route";
import { POST as catalogPost } from "@/app/api/projects/[id]/catalog/route";
import { accepterConditions, gardeFousAtelier, remplacerModeration } from "@/lib/atelier/service";
import { assurerPhotoVerifiee, gardePhotosDeCote, PHRASE_A_VERIFIER, verificationDe } from "@/lib/atelier/verification-photos";
import { editPhoto } from "@/lib/ai/media-providers";
import { buildContent } from "@/lib/ai/llm";
import { attachmentImages, attachmentsOf, describeAttachment, saveAttachment } from "@/lib/syna-agent/attachments";

let appels = 0;
const passe = async () => { appels++; return { results: [{ flagged: false, categories: {} }] }; };
const panne = async () => { appels++; return null; };
const refuse = async () => { appels++; return { results: [{ flagged: true, categories: { violence: true } }] }; };

beforeEach(() => { appels = 0; vi.stubGlobal("fetch", vi.fn(() => { throw Error("HTTP provider forbidden"); })); remplacerModeration(passe); });
afterEach(() => { vi.unstubAllGlobals(); remplacerModeration(null); });

const autrePhoto = () => sharp({ create: { width: 160, height: 120, channels: 3, background: "#eee" } }).composite([{ input: Buffer.from(`<svg width="160" height="120"><rect x="100" y="5" width="55" height="40" fill="#000"/><rect x="5" y="70" width="140" height="10" fill="#333"/></svg>`), top: 0, left: 0 }]).jpeg().toBuffer();
const photo = (couleur = "#468") => sharp({ create: { width: 120, height: 160, channels: 3, background: couleur } }).composite([{ input: Buffer.from(`<svg width="120" height="160"><rect x="10" y="20" width="50" height="90" fill="#fff"/><circle cx="90" cy="120" r="20" fill="#123"/></svg>`), top: 0, left: 0 }]).jpeg().toBuffer();

async function fixture() {
  const u = await createUser(`verif-${crypto.randomUUID()}@example.invalid`, "synthetic-test-only", "Test");
  state.user = { ...u, role: "client" };
  const pid = seedImageFixture(u.id, "cosmetic");
  grantProjectPlan(pid, "dominer");
  const ctx = { params: Promise.resolve({ id: pid }) };
  const envoyer = async (data: Buffer, name = "photo.jpg") => {
    const fd = new FormData();
    fd.append("files", new File([new Uint8Array(data)], name, { type: "image/jpeg" }));
    return filesPost(new Request(`http://localhost/api/projects/${pid}/files`, { method: "POST", body: fd }), ctx);
  };
  return { u, pid, ctx, envoyer };
}

describe("toute photo déposée est vérifiée, même hors de l'atelier", () => {
  it("vérifiée : elle sert ; aucune phrase pour le client", async () => {
    const f = await fixture();
    const r = await f.envoyer(await photo());
    expect(r.status, await r.clone().text()).toBe(200);
    const j = await r.json();
    expect(appels).toBe(1);
    expect(j.avertissements).toEqual([]);
    expect(verificationDe(assetMeta(getAsset(j.assets[0].id)!))).toMatchObject({ etat: "verifiee" });
    await expect(assurerPhotoVerifiee(j.assets[0].id)).resolves.toBeUndefined();
  });

  it("vérification impossible : la photo est gardée, mise de côté avec une phrase claire, et ne sert à rien de payant", async () => {
    const f = await fixture();
    remplacerModeration(panne);
    const data = await photo();
    const j = await (await f.envoyer(data)).json();
    const a = getAsset(j.assets[0].id)!;
    expect(a.deleted_at).toBeFalsy();
    expect(verificationDe(assetMeta(a))).toMatchObject({ etat: "a_verifier" });
    expect(j.avertissements).toEqual([PHRASE_A_VERIFIER[0]]);
    expect(j.avertissements[0]).toMatch(/garde de côté/);
    // Un appel payant avec cette photo (même réduite) s'arrête avant de partir : rien n'est envoyé.
    const reduite = await sharp(data).resize(60).jpeg({ quality: 70 }).toBuffer();
    await expect(editPhoto({ userId: f.u.id, projectId: f.pid, usageKey: `essai:${id()}` } as any, { image: reduite, instruction: "fond blanc", aspect: "1:1", usage: "product_edit", peoplePolicy: "none" } as any)).rejects.toThrow(/garde de côté/);
    await expect(assurerPhotoVerifiee(a.id)).rejects.toMatchObject({ status: 409, code: "photo_a_verifier" });
    // La lecture d'images par l'IA la retire de la demande, le reste part.
    const autre = await autrePhoto();
    const content = await buildContent({ task: "quality_control", userId: f.u.id, projectId: f.pid, prompt: "x", images: [{ data, label: "photo" }, { data: autre, label: "autre" }] } as any);
    expect(content.filter((c: any) => c.type === "image")).toHaveLength(1);
    expect(fetch).not.toHaveBeenCalled();
    // La vérification revient : le Studio réessaie de lui-même, la photo sert.
    remplacerModeration(passe);
    await expect(assurerPhotoVerifiee(a.id)).resolves.toBeUndefined();
    expect(verificationDe(assetMeta(getAsset(a.id)!))).toMatchObject({ etat: "verifiee" });
    await expect(gardePhotosDeCote(f.pid, [reduite])).resolves.toBeUndefined();
  });

  it("refusée : gardée, jamais servie, ni dans l'atelier ni ailleurs ; une image créée à partir d'elle non plus", async () => {
    const f = await fixture();
    remplacerModeration(refuse);
    const j = await (await f.envoyer(await photo())).json();
    expect(j.avertissements[0]).toMatch(/vérification a trouvé violence/);
    const a = getAsset(j.assets[0].id)!;
    expect(verificationDe(assetMeta(a))).toMatchObject({ etat: "refusee", familles: ["violence"] });
    const derivee = await saveAsset({ userId: f.u.id, projectId: f.pid, data: await photo("#2a2"), name: "detour.png", mime: "image/png", role: "cutout", origin: "generated", sourceAssetId: a.id });
    await expect(assurerPhotoVerifiee(derivee.id)).rejects.toMatchObject({ code: "photo_refusee" });
    remplacerModeration(passe);
    accepterConditions(f.u.id);
    await expect(gardeFousAtelier(f.u.id, f.pid, { texte: "un fond clair", assetId: a.id })).rejects.toMatchObject({ code: "photo_refusee" });
  });

  it("les photos de produit passent par la même vérification (le passage obligé de la bibliothèque)", async () => {
    const f = await fixture();
    remplacerModeration(panne);
    const fd = new FormData();
    fd.append("name", "Sérum");
    fd.append("photo", new File([new Uint8Array(await photo())], "serum.jpg", { type: "image/jpeg" }));
    const r = await catalogPost(new Request(`http://localhost/api/projects/${f.pid}/catalog`, { method: "POST", body: fd }), f.ctx);
    expect(r.status, await r.clone().text()).toBe(200);
    expect((await r.json()).avertissements).toEqual([PHRASE_A_VERIFIER[0]]);
    const a = one<{ meta: string }>("SELECT meta FROM assets WHERE project_id=? AND role='catalog-original'", f.pid)!;
    expect(verificationDe(json(a.meta, {}))?.etat).toBe("a_verifier");
    // Les images créées par le Studio ne sont pas des photos du client : elles ne repassent pas par la vérification.
    appels = 0;
    const creee = await saveAsset({ userId: f.u.id, projectId: f.pid, data: await photo("#777"), name: "ia.jpg", mime: "image/jpeg", role: "lifestyle", origin: "generated" });
    expect(appels).toBe(0);
    expect(verificationDe(assetMeta(creee))).toBeNull();
  });

  it("une photo jointe au fil de SINA avant que le projet existe : vérifiée, et SINA ne la lit pas tant qu'elle ne l'est pas", async () => {
    const f = await fixture();
    const cid = id();
    run("INSERT INTO agent_conversations (id, user_id, project_id, revision, state_json, created_at, updated_at) VALUES (?,?,?,?,?,?,?)", cid, f.u.id, null, 0, "{}", now(), now());
    remplacerModeration(panne);
    const at = await saveAttachment(state.user, cid, { name: "photo.jpg", type: "image/jpeg", data: await photo() });
    expect(at.analysis.verification).toMatchObject({ etat: "a_verifier" });
    const history = [{ role: "user", content: { text: "voici ma photo", attachments: [at.id] } }] as any;
    expect(attachmentImages(cid, history)).toHaveLength(0);
    expect(describeAttachment(attachmentsOf(cid)[0])).toMatch(/GARDÉE DE CÔTÉ/);
    remplacerModeration(passe);
    const ok = await saveAttachment(state.user, cid, { name: "photo2.jpg", type: "image/jpeg", data: await autrePhoto() });
    const h2 = [{ role: "user", content: { text: "et celle-ci", attachments: [ok.id] } }] as any;
    expect(attachmentImages(cid, h2)).toHaveLength(1);
  });
});
