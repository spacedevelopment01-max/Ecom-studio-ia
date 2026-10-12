/**
 * Publications et visuels de prestation au niveau d'une agence : la photo pleine page + la mise en page à calques
 * du moteur publicitaire (titre, marque, ligne de faits, bouton), texte sur la zone calme de la photo, document
 * enregistré pour être modifié dans l'éditeur. Rendu local, aucun appel à l'IA.
 * POSTER_OUT=<dossier> écrit les rendus pour les regarder ; POSTER_BG=<photo.jpg> remplace la photo de test.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let sessionUser: any = null;
vi.mock("@/lib/auth", async (orig) => {
  const real = await orig<typeof import("@/lib/auth")>();
  return { ...real, currentUser: async () => sessionUser, requireUser: async () => sessionUser ?? (() => { throw new real.HttpError(401, "Connexion requise."); })() };
});
vi.mock("@/lib/ai/llm", async (orig) => ({ ...(await orig<typeof import("@/lib/ai/llm")>()), llmConfigured: () => false }));
beforeEach(() => vi.stubGlobal("fetch", async () => new Response("{}", { status: 404 })));
afterEach(() => vi.unstubAllGlobals());

/** Photo de test : ciel clair en haut à gauche (zone calme), sujet chargé en bas à droite. */
async function testPhoto(): Promise<Buffer> {
  if (process.env.POSTER_BG) return fs.readFileSync(process.env.POSTER_BG);
  const W = 1600;
  const H = 1200;
  const stripes = Array.from({ length: 40 }, (_, k) => `<rect x="${900 + (k % 8) * 80}" y="${560 + Math.floor(k / 8) * 120}" width="40" height="90" fill="${k % 2 ? "#2b3a2f" : "#c9b48a"}"/>`).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9eef2"/><stop offset="1" stop-color="#b9c4c9"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#g)"/>${stripes}</svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toBuffer();
}

describe("Affiches de publication", async () => {
  const { createUser } = await import("@/lib/auth");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { loadProject } = await import("@/lib/projects");
  const { grantProjectPlan } = await import("@/lib/project-subscriptions");
  const { saveAsset, getAsset, assetMeta } = await import("@/lib/library");
  const { latestDoc } = await import("@/lib/ad-doc/store");
  const { localRender } = await import("@/lib/social-v2/deps");
  const { composePoster } = await import("@/lib/ads-v2/poster");
  const { photoZones } = await import("@/lib/ads-v2/compose");
  const { JobContext, enqueue } = await import("@/lib/jobs");
  const { generateServiceSingleImage } = await import("@/lib/engine/service-media");
  const docs = await import("@/app/api/projects/[id]/ads/docs/route");
  const { seedThemeScenario } = await import("./theme-v2-fixtures");
  const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);
  const out = (name: string, jpg: Buffer) => {
    if (!process.env.POSTER_OUT) return;
    fs.mkdirSync(process.env.POSTER_OUT, { recursive: true });
    fs.writeFileSync(path.join(process.env.POSTER_OUT, name), jpg);
  };

  const setup = async () => {
    const u = await createUser(`aff${Date.now()}${Math.random().toString(36).slice(2, 6)}@test.fr`, "motdepasse-test", "P");
    const pid = await seedThemeScenario(u.id, "artisan");
    grantProjectPlan(pid, "vendre");
    const photo = await saveAsset({ projectId: pid, userId: u.id, data: await testPhoto(), name: "atelier.jpg", mime: "image/jpeg", role: "lifestyle", folderKey: "images.scenes", origin: "upload", meta: {} });
    return { u, pid, photo };
  };

  it("la zone calme de la photo est repérée (le texte n'y masque pas le sujet)", async () => {
    const z = await photoZones(await testPhoto(), 1080, 1080);
    if (!process.env.POSTER_BG) {
      expect(z.left.busy).toBeLessThan(z.right.busy);
      expect(z.left.lum).toBeGreaterThan(0.6);
    }
  });

  it("publication : affiche sur la photo du projet, document modifiable, à part des publicités", async () => {
    const { u, pid, photo } = await setup();
    const p = loadProject(pid);
    const post = { id: `post${Date.now()}`, network: "instagram", format: "feed", title: "Votre atelier, sans attendre", caption: "", pillar: null, objective: null, headline: "Votre atelier, sans attendre", scheduled_at: null };
    const r = await fr(() => localRender(p, post));
    expect(r.by).toBe("local");
    expect(r.costMicro).toBe(0);
    const a = getAsset(r.assetId!)!;
    const meta = assetMeta<any>(a);
    expect(meta.poster.docKey).toMatch(/^post:/);
    expect(meta.poster.backgroundAssetId).toBe(photo.id);
    const d = latestDoc(pid, meta.poster.docKey)!;
    const roles = d.doc.layers.map((l) => l.role);
    expect(roles).toEqual(expect.arrayContaining(["background", "title", "cta"]));
    expect(d.doc.layers.find((l) => l.role === "title" && "text" in l && l.text === "Votre atelier, sans attendre")).toBeTruthy();
    out("publication.jpg", (await import("@/lib/library")).assetData(a));
    // L'onglet Publicités ne liste pas les affiches de publications ; elles se retrouvent avec ?kind=post.
    sessionUser = { ...u, role: "client" };
    const list = async (q: string) => (await (await fr(() => docs.GET(new Request(`http://localhost:3000/api/projects/${pid}/ads/docs${q}`), { params: Promise.resolve({ id: pid }) } as any))).json()).docs as { docKey: string }[];
    expect((await list("")).some((x) => x.docKey === meta.poster.docKey)).toBe(false);
    expect((await list("?kind=post")).some((x) => x.docKey === meta.poster.docKey)).toBe(true);
  });

  it("visuel de prestation avec photo : affiche (photo pleine page, faits de l'offre, bouton)", async () => {
    const { u, pid, photo } = await setup();
    const job = enqueue({ userId: u.id, projectId: pid, type: "image.single", payload: { projectId: pid, request: {} } });
    const res = await fr(() => generateServiceSingleImage(new JobContext(job), pid, { kind: "service", format: "portrait", serviceIndex: 0, background: "photo", photoId: photo.id }));
    const a = getAsset(res.assetId)!;
    const meta = assetMeta<any>(a);
    expect(meta.engine).toBe("poster");
    expect(meta.poster.docKey).toMatch(/^post:/);
    const d = latestDoc(pid, meta.poster.docKey)!;
    expect(d.doc.width).toBe(1080);
    expect(d.doc.height).toBe(1350);
    out("prestation-4x5.jpg", (await import("@/lib/library")).assetData(a));
  }, 120_000);

  it("chaque format : texte lisible, dans les marges, sans chevauchement", async () => {
    const { pid, photo } = await setup();
    const p = loadProject(pid);
    for (const aspect of ["1:1", "4:5", "9:16", "16:9"] as const) {
      const r = await fr(() => composePoster(p, { aspect, headline: "Un nouveau souffle pour vos murs.", subline: "Peinture intérieure • Finitions", cta: "Demander mon devis", background: photo, seed: `t:${aspect}` }));
      expect(r.metrics.textContrast, aspect).toBeGreaterThanOrEqual(4.5);
      expect(r.metrics.safeOverflow, aspect).toBe(false);
      expect(r.metrics.textOverlap, aspect).toBe(false);
      expect(r.metrics.minFontPx, aspect).toBeGreaterThanOrEqual(18);
      out(`format-${aspect.replace(":", "x")}-${r.layout}.jpg`, r.jpg);
    }
  }, 120_000);
});
