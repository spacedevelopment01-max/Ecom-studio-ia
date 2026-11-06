/**
 * SYNA agent (#492) — boucle, registre commun, droits, accords, budget, reprise et pièces jointes.
 * Le modèle est SIMULÉ (aucun appel IA) : il lit la base comme le ferait le modèle après ses outils de lecture.
 * Chaque test part du fil (submitMessage → exécution) et vérifie l'effet DANS LE PROJET, pas un message « c'est fait ».
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

process.env.STUDIO_SYNA_AGENT = "1";

describe("SYNA agent — un fil, des outils natifs, des changements vérifiés", async () => {
  const { createUser } = await import("@/lib/auth");
  const { json, one, all } = await import("@/lib/db");
  const { loadProject, currentTheme } = await import("@/lib/projects");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { getAsset, assetData, saveAsset } = await import("@/lib/library");
  const { runAdEngineV2 } = await import("@/lib/ads-v2/engine");
  const { latestDoc } = await import("@/lib/ad-doc/store");
  const { buildShop } = await import("@/lib/engine/shop");
  const { createProduct, getProduct, listProducts } = await import("@/lib/products/catalog");
  const { seedImageFixture, seedCutout } = await import("./image-v2-fixtures");
  const { mockAdDeps } = await import("./ads-v2-mock");
  const { grantProjectPlan } = await import("./communication-choice-fixture");
  const { chooseGeneralistForTest } = await import("./strategy-choice-fixture");
  const { threadFor } = await import("@/lib/syna-agent/thread");
  const { submitMessage, runAgent, decidePending, threadView } = await import("@/lib/syna-agent/loop");
  const { saveAttachment } = await import("@/lib/syna-agent/attachments");
  const { getRun } = await import("@/lib/syna-agent/store");
  const { latestVideo } = await import("@/lib/video-v2/store");
  const fr = <T,>(fn: () => Promise<T> | T) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());

  /** Projet réel du Studio : visuel publicitaire en calques, site construit, produit à deux variantes. */
  async function shop(label: string) {
    const u = await createUser(`syna-${label}-${Date.now()}@test.fr`, "motdepasse-test", "SYNA");
    const p = loadProject(seedImageFixture(u.id, "cosmetic"));
    grantProjectPlan(p.id, "dominer");
    const cutId = await seedCutout(u.id, p.id), cut = assetData(getAsset(cutId)!);
    const logoPng = await sharp({ create: { width: 400, height: 120, channels: 4, background: { r: 20, g: 20, b: 20, alpha: 1 } } }).png().toBuffer();
    const logo = await saveAsset({ projectId: p.id, userId: u.id, data: logoPng, name: "logo.png", mime: "image/png", role: "logo", origin: "generated" });
    const { deps } = mockAdDeps({ userId: u.id, projectId: p.id, cutout: { id: cutId, data: cut }, logo: { id: logo.id, data: logoPng } });
    const r = await fr(() => runAdEngineV2(null, p.id, { count: 1, platforms: ["meta_feed"] }, deps));
    const o = r.outcomes.find((x) => x.aspect === "1:1")!;
    const docKey = json<any>(getAsset(o.assetId!)!.meta, {}).adV2.docKey as string;
    chooseGeneralistForTest(p.id);
    await fr(() => buildShop(null, p.id, { useAi: false }));
    const product = createProduct(p.id, { title: "Sérum Éclat", price: 3500, options: [{ name: "Couleur", values: ["Noir", "Sable"] }], variants: [{ options: ["Noir"], price: 3500 }, { options: ["Sable"], price: 3500 }] } as any);
    const user = one<any>("SELECT * FROM users WHERE id=?", u.id);
    const cid = threadFor(user, p.id);
    return { user, p, docKey, product, cid, logoAsset: loadProject(p.id).brand?.logo.assetId ?? null };
  }

  /** Exécute le fil jusqu'à une pause (question, accord, tâches de fond) avec le modèle simulé. */
  async function send(user: any, cid: string, text: string, reason: (step: number) => any, attachmentIds?: string[]) {
    const r = submitMessage(user, cid, { requestId: `req-${Math.random()}`, text, attachmentIds });
    await fr(() => runAgent(r.id, r.job_id!, { reason: async (call) => { expect(call.task).toBe("agent_conversation"); return reason(getRun(r.id)!.step - 1); } }));
    return getRun(r.id)!;
  }

  function homeHeading(pid: string) {
    const spec: any = currentTheme(pid)!.spec, t = spec.templates.index;
    for (const id of t.order) { const s = t.sections[id]; for (const k of ["heading", "title"]) if (typeof s.settings?.[k] === "string") return { section: id, key: k, value: s.settings[k] as string }; }
    throw new Error("titre d'accueil introuvable");
  }
  const textLayer = (doc: any) => doc.layers.find((l: any) => l.kind === "text" && (l.role === "subtitle" || l.role === "title"));

  it("une phrase, plusieurs modules : logo gardé, titre d'accueil, prix de la version noire, publicité adaptée — tout relu", async () => {
    const s = await shop("multi");
    const aiCallsBefore = one<{ n: number }>("SELECT COUNT(*) n FROM ai_calls")!.n;
    const before = { heading: homeHeading(s.p.id), version: currentTheme(s.p.id)!.version.number, ad: latestDoc(s.p.id, s.docKey)!.version.version, sable: getProduct(s.p.id, s.product.id).variants.find((v) => v.options[0] === "Sable")!.price };
    const run = await send(s.user, s.cid, "Garde mon logo, change le titre de l'accueil en « L'éclat au naturel », mets le prix de la version noire à 39 € et adapte la publicité à ce prix.", (step) => {
      if (step === 0) return { message: "Je repère les éléments.", actions: [{ tool: "catalogue.list", args: { query: "noire" } }, { tool: "site.outline", args: {} }, { tool: "ads.list", args: {} }, { tool: "brand.read", args: {} }], done: false };
      if (step === 1) {
        const h = homeHeading(s.p.id), layer = textLayer(latestDoc(s.p.id, s.docKey)!.doc);
        return { message: "J'applique les trois modifications.", actions: [
          { tool: "memory.note", args: { kind: "decision", key: "logo", value: "Garder le logo actuel" } },
          { tool: "site.edit", args: { ops: [{ op: "set_setting", template: "index", section: h.section, key: h.key, value: "L'éclat au naturel" }], summary: "Titre de l'accueil" } },
          { tool: "catalogue.update", args: { productId: s.product.id, variants: [{ options: ["Noir"], price: 39 }] } },
          { tool: "ads.edit", args: { docKey: s.docKey, ops: [{ op: "text", id: layer.id, text: "39 € seulement" }] } },
        ], done: false };
      }
      return { message: "Fait : accueil, prix de la version noire et publicité mis à jour ; logo inchangé.", actions: [], done: true };
    });
    expect(run.status).toBe("done");
    // Effets réels, relus dans les modules natifs.
    const p = loadProject(s.p.id);
    expect(homeHeading(p.id).value).toBe("L'éclat au naturel");
    expect(currentTheme(p.id)!.version.number).toBe(before.version + 1);
    const prod = getProduct(p.id, s.product.id);
    expect(prod.variants.find((v) => v.options[0] === "Noir")!.price).toBe(3900);
    expect(prod.variants.find((v) => v.options[0] === "Sable")!.price).toBe(before.sable);
    const ad = latestDoc(p.id, s.docKey)!;
    expect(ad.version.version).toBe(before.ad + 1);
    expect(JSON.stringify(ad.doc.layers)).toContain("39 € seulement");
    expect(p.brand?.logo.assetId ?? null).toBe(s.logoAsset);
    // Changements vérifiés par module, visibles dans le fil ; réponses de SYNA conservées.
    const view = threadView(s.user, s.cid);
    const modules = all<{ module: string; verified: number }>("SELECT module,verified FROM syna_changes WHERE conversation_id=?", s.cid);
    expect(new Set(modules.map((m) => m.module))).toEqual(new Set(["mémoire", "site", "catalogue", "publicités"]));
    expect(modules.every((m) => m.verified === 1)).toBe(true);
    expect(view.messages.filter((m) => m.role === "assistant").map((m) => m.content.message)).toContain("Je repère les éléments.");
    expect(one<{ n: number }>("SELECT COUNT(*) n FROM ai_calls")!.n).toBe(aiCallsBefore);
  });

  it("plusieurs produits correspondent : SYNA pose UNE question et ne modifie rien", async () => {
    const s = await shop("ambigu");
    createProduct(s.p.id, { title: "Crème Noire", price: 2000 } as any);
    const run = await send(s.user, s.cid, "Mets le noir à 39 €.", (step) => {
      if (step === 0) return { actions: [{ tool: "catalogue.list", args: { query: "noir" } }], message: "", done: false };
      const found = listProducts(s.p.id).filter((x) => JSON.stringify(x).toLowerCase().includes("noir"));
      expect(found.length).toBe(2);
      return { message: "Deux produits correspondent.", actions: [], question: { text: "Lequel voulez-vous modifier ?", choices: found.map((x) => x.data.title) }, done: false };
    });
    expect(run.status).toBe("waiting_user");
    expect(getProduct(s.p.id, s.product.id).variants.every((v) => v.price === 3500)).toBe(true);
  });

  it("action sensible : accord explicite, puis exécution exacte ; refus = rien ne change", async () => {
    const s = await shop("accord");
    const run = await send(s.user, s.cid, "Archive le sérum.", (step) => step === 0 ? { actions: [{ tool: "catalogue.archive", args: { productId: s.product.id } }], message: "", done: false } : { message: "Archivé.", actions: [], done: true });
    expect(run.status).toBe("waiting_confirmation");
    expect(getProduct(s.p.id, s.product.id).status).toBe("active");
    const pending = JSON.parse(run.pending_json!);
    decidePending(s.user, s.cid, { pendingId: pending.id, approve: true });
    await fr(() => runAgent(run.id, getRun(run.id)!.job_id!, { reason: async () => ({ message: "Archivé, vérifié.", actions: [], done: true }) }));
    expect(getProduct(s.p.id, s.product.id).status).toBe("archived");
    expect(getRun(run.id)!.status).toBe("done");
  });

  it("dépense hors budget autorisé : SYNA s'arrête et demande l'accord, sans rien lancer", async () => {
    const s = await shop("budget");
    one("UPDATE syna_budgets SET authorized_micro=0 WHERE conversation_id=? RETURNING 1", s.cid);
    const jobsBefore = one<{ n: number }>("SELECT COUNT(*) n FROM jobs WHERE type='brand.build'")!.n;
    const run = await send(s.user, s.cid, "Refais toute ma marque.", () => ({ actions: [{ tool: "brand.create", args: {} }], message: "", done: false }));
    expect(run.status).toBe("waiting_confirmation");
    expect(JSON.parse(run.pending_json!).reason).toBe("budget");
    expect(one<{ n: number }>("SELECT COUNT(*) n FROM jobs WHERE type='brand.build'")!.n).toBe(jobsBefore);
  });

  it("reprise après coupure : une écriture acquise n'est jamais rejouée", async () => {
    const s = await shop("reprise");
    let calls = 0;
    const r = submitMessage(s.user, s.cid, { requestId: "rep-1", text: "Prix du sable à 41 €." });
    const reason = async () => { calls++; if (calls === 1) return { message: "", actions: [{ tool: "catalogue.update", args: { productId: s.product.id, variants: [{ options: ["Sable"], price: 41 }] } }], done: false }; throw new Error("coupure simulée"); };
    await expect(fr(() => runAgent(r.id, r.job_id!, { reason }))).rejects.toThrow("coupure simulée");
    const v1 = getProduct(s.p.id, s.product.id).version;
    // Même exécution reprise : l'étape acquise (clé 0:0) n'est pas réécrite.
    one("UPDATE syna_runs SET status='queued', step=0 WHERE id=? RETURNING 1", r.id);
    await fr(() => runAgent(r.id, r.job_id!, { reason: async () => (getRun(r.id)!.step === 1 ? { message: "", actions: [{ tool: "catalogue.update", args: { productId: s.product.id, variants: [{ options: ["Sable"], price: 41 }] } }], done: false } : { message: "OK", actions: [], done: true }) }));
    expect(getProduct(s.p.id, s.product.id).version).toBe(v1);
    expect(getProduct(s.p.id, s.product.id).variants.find((v) => v.options[0] === "Sable")!.price).toBe(4100);
  });

  it("vidéo de référence jointe : plans mesurés, rythme repris par le montage publicitaire", async () => {
    const s = await shop("rythme");
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "syna-ref-"));
    const ref = path.join(dir, "reference.mp4");
    // Trois plans nets : 1 s rouge, 2 s bleu, 1,5 s blanc.
    execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-f", "lavfi", "-i", "color=c=red:s=320x240:d=1:r=25", "-f", "lavfi", "-i", "color=c=blue:s=320x240:d=2:r=25", "-f", "lavfi", "-i", "color=c=white:s=320x240:d=1.5:r=25", "-filter_complex", "[0:v][1:v][2:v]concat=n=3:v=1:a=0", "-pix_fmt", "yuv420p", ref]);
    const at = await saveAttachment(s.user, s.cid, { name: "reference.mp4", type: "video/mp4", data: fs.readFileSync(ref) });
    expect(at.analysis.shotCount).toBe(3);
    expect(at.analysis.shots.map((x: number) => Math.round(x * 2) / 2)).toEqual([1, 2, 1.5]);
    const images = all<{ id: string }>("SELECT id FROM assets WHERE project_id=? AND kind='image' AND deleted_at IS NULL LIMIT 3", s.p.id).map((x) => x.id);
    expect(images.length).toBe(3);
    await send(s.user, s.cid, "Fais une publicité vidéo avec le rythme de cette vidéo.", (step) => step === 0
      ? { actions: [{ tool: "video.montage", args: { purpose: "ad", aspect: "1:1", scenes: images.map((assetId) => ({ assetId })), line: "", cta: "", music: "pulse", rhythmFromAttachmentId: at.id } }], message: "", done: false }
      : { message: "Montage au rythme de la référence.", actions: [], done: true }, [at.id]);
    const toolMsg = all<{ content_json: string }>("SELECT content_json FROM syna_messages WHERE conversation_id=? AND role='tool'", s.cid).map((m) => JSON.parse(m.content_json));
    expect(toolMsg.find((m) => m.tool === "video.montage")?.summary).toMatch(/rythme de la référence/);
    const change = one<{ after_json: string }>("SELECT after_json FROM syna_changes WHERE conversation_id=? AND module='vidéos'", s.cid)!;
    const { docKey, durations } = JSON.parse(change.after_json);
    expect(durations.map((x: number) => Math.round(x * 2) / 2)).toEqual([1, 2, 1.5]);
    const doc: any = latestVideo(s.p.id, docKey)!.doc;
    expect(doc.clips.map((c: any) => Math.round(c.durationS * 2) / 2)).toEqual([1, 2, 1.5]);
  });

  it("une création attendue qui échoue réveille SYNA, qui voit l'échec et conclut (jamais bloquée)", async () => {
    const s = await shop("echec");
    const images = all<{ id: string }>("SELECT id FROM assets WHERE project_id=? AND kind='image' AND deleted_at IS NULL LIMIT 2", s.p.id).map((x) => x.id);
    const r = submitMessage(s.user, s.cid, { requestId: "echec-1", text: "Fais une petite vidéo." });
    let seen: any = null;
    const reason = async (call: any) => {
      const step = getRun(r.id)!.step - 1;
      if (step === 0) return { message: "", actions: [{ tool: "video.montage", args: { purpose: "organic", aspect: "1:1", scenes: images.map((assetId) => ({ assetId })), line: "", cta: "", music: "none" } }], done: false };
      seen = call.prompt;
      return { message: "Le rendu a échoué ; je vous propose de relancer.", actions: [], done: true };
    };
    await fr(() => runAgent(r.id, r.job_id!, { reason }));
    const waiting = getRun(r.id)!;
    expect(waiting.status).toBe("waiting_jobs");
    const [render] = JSON.parse(waiting.waiting_jobs);
    one("UPDATE jobs SET status='failed', error='rendu impossible (simulé)' WHERE id=? RETURNING 1", render);
    await fr(() => runAgent(r.id, getRun(r.id)!.job_id!, { reason }));
    expect(getRun(r.id)!.status).toBe("done");
    expect(seen).toContain("jobs.wait");
    expect(seen).toContain("ÉCHEC");
  });

  it("le droit au projet est relu : un autre compte ne peut pas lire ni écrire dans le fil", async () => {
    const s = await shop("droits");
    const other = await createUser(`intrus-${Date.now()}@test.fr`, "motdepasse-test", "X");
    expect(() => threadView(other as any, s.cid)).toThrow();
    expect(() => submitMessage(other as any, s.cid, { requestId: "x", text: "Supprime tout" })).toThrow();
  });
});
