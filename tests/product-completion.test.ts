/**
 * Produit incomplet sur la photo (partie hors cadre, perdue dans l'ombre, cachée) : JAMAIS utilisé tel quel.
 * Avec l'IA : reconstruit en entier (photo du client en référence), contrôlé « même produit », puis détouré et
 * contrôlé comme toute photo ; l'original du client est gardé. Sans IA : rien d'incomplet n'est utilisé et le client
 * est prévenu. Reconstruction infidèle : au plus deux essais, puis message clair.
 */
import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";

// Modèle de détourage simulé : tout ce qui n'est pas blanc est gardé.
vi.mock("node:child_process", async (orig) => {
  const real = await orig<typeof import("node:child_process")>();
  return {
    ...real,
    spawn: () => {
      const child = Object.assign(new EventEmitter(), { stdout: new EventEmitter(), stderr: new EventEmitter(), kill: () => {} }) as any;
      child.stdin = {
        on: () => {},
        end: (png: Buffer) =>
          setImmediate(async () => {
            const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
            const out = Buffer.alloc(info.width * info.height * 4);
            for (let p = 0; p < info.width * info.height; p++) {
              out.set([data[p * 3], data[p * 3 + 1], data[p * 3 + 2]], p * 4);
              out[p * 4 + 3] = Math.max(255 - data[p * 3], 255 - data[p * 3 + 1], 255 - data[p * 3 + 2]) > 30 ? 255 : 0;
            }
            child.stdout.emit("data", await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer());
            child.emit("close", 0, null);
          }),
      };
      return child;
    },
  };
});

// IA simulée : tri, contrôle des détourages et contrôle « même produit » (aucun appel réseau, aucun coût).
const ai = { checks: [] as any[], qc: [] as boolean[], calls: [] as string[] };
vi.mock("@/lib/ai/llm", () => ({
  llmConfigured: () => true,
  llmJson: async (call: { task: string }) => {
    ai.calls.push(call.task);
    if (call.task === "photo_triage") return { photos: [{ index: 1, kind: "packshot" }], best: 1 };
    if (call.task === "cutout_check") return ai.checks.shift() ?? { verdict: "ok", score: 9, problems: [], note: "" };
    if (call.task === "quality_control") return { sameProduct: ai.qc.shift() ?? true, score: 9, issues: [], personVisible: false };
    throw new Error(`tâche inattendue ${call.task}`);
  },
}));
// Accès à l'IA (forfait, budget) et génération d'image simulés.
const access = { on: true };
vi.mock("@/lib/ai/access", async (orig) => ({ ...(await orig<typeof import("@/lib/ai/access")>()), aiActiveFor: () => access.on }));
const gen = { calls: [] as { missing?: string | null }[] };
vi.mock("@/lib/ai/media-providers", async (orig) => ({
  ...(await orig<typeof import("@/lib/ai/media-providers")>()),
  completeProductImage: async (_ctx: unknown, input: { image: Buffer; missing?: string | null }) => {
    gen.calls.push({ missing: input.missing });
    return watch(true);
  },
}));

import { createUser } from "@/lib/auth";
import { all, id, json, now, run } from "@/lib/db";
import { getAsset, saveAsset, type Asset } from "@/lib/library";
import { loadProject } from "@/lib/projects";
import { runWithLang } from "@/lib/i18n-server";
import { ensureCutouts, incompleteProductPhotos, validCutouts } from "@/lib/engine/cutouts";
import { completeProductPrompt } from "@/lib/ai/media-providers";

const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);

/** Montre schématique sur fond blanc : boîtier rond ; bracelet des deux côtés seulement si `whole`. */
async function watch(whole: boolean): Promise<Buffer> {
  const W = 240, H = 240;
  const rgb = Buffer.alloc(W * H * 3, 255);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const caseIn = (x - 120) ** 2 + (y - 120) ** 2 <= 45 ** 2;
      const strapTop = Math.abs(x - 120) < 22 && y >= 30 && y < 80;
      const strapBottom = whole && Math.abs(x - 120) < 22 && y > 160 && y <= 210;
      if (caseIn) rgb.set([40, 40, 44], (y * W + x) * 3);
      else if (strapTop || strapBottom) rgb.set([120, 70, 35], (y * W + x) * 3);
    }
  return sharp(rgb, { raw: { width: W, height: H, channels: 3 } }).png().toBuffer();
}

async function newProject() {
  const u = await createUser(`entier-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@test.fr`, "motdepasse-test", "E");
  const pid = id();
  run(
    "INSERT INTO projects (id, user_id, name, status, platform, product_json, brand_json, settings_json, sources_json, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
    pid, u.id, "ARVEN", "creating", "shopify", JSON.stringify({ name: "Montre" }), "{}", JSON.stringify({ language: "fr" }), "[]", now(), now(),
  );
  const a = await saveAsset({ projectId: pid, userId: u.id, data: await watch(false), name: "montre.png", mime: "image/png", role: "original", folderKey: "product.originals", origin: "upload" });
  return { userId: u.id, projectId: pid, photoId: a.id };
}
const incomplete = { verdict: "rejected", score: 3, problems: ["incomplete_product"], note: "le bracelet manque d'un côté" };
const originals = (pid: string) => all<Asset>("SELECT * FROM assets WHERE project_id = ? AND role = 'original' ORDER BY created_at", pid);
const warnings = (pid: string) => all<{ title: string; body: string }>("SELECT title, body FROM notifications WHERE project_id = ? AND level = 'warning'", pid);

describe("produit entier obligatoire", () => {
  beforeEach(() => {
    ai.checks = [];
    ai.qc = [];
    ai.calls = [];
    gen.calls = [];
    access.on = true;
  });

  it("consigne : même produit, seule la partie manquante est ajoutée, rien d'inventé", () => {
    const p = completeProductPrompt("le bracelet manque d'un côté");
    expect(p).toContain("missing part: le bracelet manque d'un côté");
    expect(p).toContain("Only add the missing part");
    expect(p).toContain("do not invent a logo");
    // Leçon de l'essai réel ARVEN : le cadrage « catalogue » faisait perdre l'angle et la couleur de l'acier.
    expect(p).toContain("same camera angle and the same pose");
    expect(p).toContain("never becomes black or gunmetal");
    expect(p).toContain("with its buckle or clasp visible");
  });

  it("avec l'IA : produit incomplet reconstruit en entier, contrôlé, détouré ; l'original du client est gardé", async () => {
    await fr(async () => {
      const p = await newProject();
      ai.checks = [incomplete, { verdict: "ok", score: 9, problems: [], note: "" }];
      const valid = await ensureCutouts(null, loadProject(p.projectId));
      // Une seule reconstruction, avec la partie manquante nommée par le contrôle.
      expect(gen.calls).toEqual([{ missing: "le bracelet manque d'un côté" }]);
      expect(ai.calls).toContain("quality_control");
      // Le détourage utilisé vient de la reconstruction, jamais de la photo incomplète.
      expect(valid).toHaveLength(1);
      const rebuilt = getAsset(valid[0].source_asset_id!)!;
      expect(json<any>(rebuilt.meta, {}).reconstructed).toMatchObject({ from: p.photoId, faithful: true });
      expect(rebuilt.status).toBe("ready");
      // Photo du client conservée telle quelle.
      expect(getAsset(p.photoId)!.origin).toBe("upload");
      expect(originals(p.projectId)).toHaveLength(2);
      // Deuxième passage : rien n'est refait ni repayé.
      await ensureCutouts(null, loadProject(p.projectId));
      expect(gen.calls).toHaveLength(1);
    });
  });

  it("sans IA : rien d'incomplet n'est utilisé, le client est prévenu une fois", async () => {
    await fr(async () => {
      access.on = false;
      const p = await newProject();
      ai.checks = [incomplete];
      const valid = await ensureCutouts(null, loadProject(p.projectId));
      expect(valid).toHaveLength(0);
      expect(gen.calls).toHaveLength(0);
      expect(incompleteProductPhotos(p.projectId).map((x) => x.photo.id)).toEqual([p.photoId]);
      expect(warnings(p.projectId).map((w) => w.title)).toEqual(["Produit incomplet sur la photo"]);
      expect(warnings(p.projectId)[0].body).toContain("il ne sera jamais montré incomplet");
      await ensureCutouts(null, loadProject(p.projectId));
      expect(warnings(p.projectId)).toHaveLength(1);
    });
  });

  it("reconstruction infidèle (pas le même produit) : écartée, deux essais au plus, puis message clair", async () => {
    await fr(async () => {
      const p = await newProject();
      ai.checks = [incomplete];
      ai.qc = [false, false];
      const valid = await ensureCutouts(null, loadProject(p.projectId));
      expect(valid).toHaveLength(0);
      expect(gen.calls).toHaveLength(2);
      // Les essais écartés ne servent jamais de photo source.
      expect(originals(p.projectId).filter((o) => o.status === "rejected")).toHaveLength(2);
      expect(validCutouts(p.projectId)).toHaveLength(0);
      expect(warnings(p.projectId).map((w) => w.body).join(" ")).toContain("n'a pas donné un résultat fidèle");
    });
  });
});
