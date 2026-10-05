import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";

// Modèle de détourage simulé (aucun processus lancé) : la réponse est calculée par `model.run`, ou un plantage
// (code 137, manque de mémoire) quand elle renvoie null.
const model = { run: null as null | ((png: Buffer) => Promise<Buffer | null>), calls: 0 };
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
            model.calls++;
            const out = model.run ? await model.run(png) : null;
            if (out) child.stdout.emit("data", out);
            child.emit("close", out ? 0 : 137, out ? null : "SIGKILL");
          }),
      };
      return child;
    },
  };
});

// IA simulée : tri des photos et contrôle visuel renvoient des réponses fixées par le test (aucun appel réseau).
const ai = { on: true, triage: null as any, checks: [] as any[], calls: [] as string[] };
vi.mock("@/lib/ai/llm", () => ({
  llmConfigured: () => ai.on,
  llmJson: async (call: { task: string; images?: unknown[] }) => {
    ai.calls.push(call.task);
    if (call.task === "photo_triage") return ai.triage;
    if (call.task === "cutout_check") {
      expect(call.images).toHaveLength(3); // photo d'origine + détourage sur blanc + sur fond sombre
      return ai.checks.shift() ?? { verdict: "ok", score: 9, problems: [], note: "" };
    }
    throw new Error(`tâche inattendue ${call.task}`);
  },
}));

import { createUser } from "@/lib/auth";
import { id, json, now, one, run } from "@/lib/db";
import { getAsset, saveAsset, type Asset } from "@/lib/library";
import { loadProject } from "@/lib/projects";
import { runWithLang } from "@/lib/i18n-server";
import { chooseModel, cutoutProduct, CutoutUnavailable, fillInteriorHoles } from "@/lib/media/cutout";
import { checkCutoutLocal, measureBackground } from "@/lib/media/cutout-quality";
import { cutoutSummary, ensureCutouts, setAsideCutout, validCutouts } from "@/lib/engine/cutouts";
import { collectImages } from "@/lib/engine/shop";
import { note, stepNoteText } from "@/lib/step-notes";

const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);
type RGB = [number, number, number];

/** Image W×H : fond `bg` (ou bruit si "noise"), puis formes peintes par `paint(x, y)` (couleur ou null). */
async function image(W: number, H: number, bg: RGB | "noise", paint: (x: number, y: number) => RGB | null = () => null): Promise<Buffer> {
  const rgb = Buffer.alloc(W * H * 3);
  let seed = 7;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const c = paint(x, y) ?? (bg === "noise" ? ([rnd() * 255, rnd() * 255, rnd() * 255].map(Math.round) as RGB) : bg);
      rgb.set(c, (y * W + x) * 3);
    }
  return sharp(rgb, { raw: { width: W, height: H, channels: 3 } }).png().toBuffer();
}

/** Masque RGBA à partir d'une photo et d'une fonction d'opacité. */
async function masked(photo: Buffer, alpha: (x: number, y: number, c: RGB) => number): Promise<Buffer> {
  const { data, info } = await sharp(photo).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(info.width * info.height * 4);
  for (let p = 0; p < info.width * info.height; p++) {
    const c: RGB = [data[p * 3], data[p * 3 + 1], data[p * 3 + 2]];
    out.set(c, p * 4);
    out[p * 4 + 3] = alpha(p % info.width, (p / info.width) | 0, c);
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

/** « Modèle » simulé : tout ce qui n'est pas blanc est gardé. */
const keepNonWhite = (png: Buffer) => masked(png, (_x, _y, c) => (Math.max(255 - c[0], 255 - c[1], 255 - c[2]) > 30 ? 255 : 0));

const disc = (cx: number, cy: number, r: number) => (x: number, y: number) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
const PINK: RGB = [236, 170, 180];
const WHITE: RGB = [255, 255, 255];
/** Boîtier « SOVA » : corps rose rond à deux oreilles, disque central gris très clair (232,232,230) sur fond blanc. */
const sova = (x: number, y: number): RGB | null => {
  if (disc(100, 110, 26)(x, y)) return [232, 232, 230];
  if (disc(100, 110, 60)(x, y) || (Math.abs(x - 62) < 12 && y > 30 && y < 80) || (Math.abs(x - 138) < 12 && y > 30 && y < 80)) return PINK;
  return null;
};

const full = (png: Buffer, W: number, H: number) => ({ png, bbox: { x: 0, y: 0, w: W, h: H }, sourceW: W, sourceH: H });

describe("trous intérieurs (fillInteriorHoles)", () => {
  it("cas SOVA : le disque central gris clair retiré par le modèle est rebouché avec ses vrais pixels", async () => {
    const photo = await image(200, 200, WHITE, sova);
    // Le modèle a retiré le disque central (proche du blanc) : trou au milieu du produit.
    const cut = await masked(photo, (x, y) => (sova(x, y) && !disc(100, 110, 26)(x, y) ? 255 : 0));
    const out = await sharp(await fillInteriorHoles(cut, photo)).raw().toBuffer();
    const at = (x: number, y: number) => [...out.subarray((y * 200 + x) * 4, (y * 200 + x) * 4 + 4)];
    expect(at(100, 110)).toEqual([232, 232, 230, 255]);
    expect(at(110, 120)[3]).toBe(255);
    expect(at(5, 5)[3]).toBe(0); // le fond reste transparent
  });

  it("une anse de tasse / un anneau sur fond blanc garde son vrai jour transparent", async () => {
    // Anneau épais : le centre montre le fond blanc à l'identique (grand trou, ≥ 15 % de la silhouette).
    const ring = (x: number, y: number): RGB | null => (disc(100, 100, 70)(x, y) && !disc(100, 100, 40)(x, y) ? [40, 60, 120] : null);
    const photo = await image(200, 200, WHITE, ring);
    const cut = await masked(photo, (x, y) => (ring(x, y) ? 255 : 0));
    const out = await sharp(await fillInteriorHoles(cut, photo)).raw().toBuffer();
    expect(out[(100 * 200 + 100) * 4 + 3]).toBe(0);
    // Tasse : anse fermée à côté du corps, jour blanc.
    const mug = (x: number, y: number): RGB | null => ((x >= 40 && x < 120 && y >= 40 && y < 160) || (x >= 120 && x < 170 && y >= 70 && y < 130 && !(x >= 130 && x < 160 && y >= 80 && y < 120)) ? [200, 80, 40] : null);
    const mphoto = await image(200, 200, WHITE, mug);
    const mcut = await masked(mphoto, (x, y) => (mug(x, y) ? 255 : 0));
    const mout = await sharp(await fillInteriorHoles(mcut, mphoto)).raw().toBuffer();
    expect(mout[(100 * 200 + 145) * 4 + 3]).toBe(0);
  });

  it("un très grand trou qui ne montre pas exactement le fond est rebouché", async () => {
    // Écran gris très clair (244) au centre d'un cadre : moins de 12 d'écart mais trou immense → doit correspondre partout.
    const frame = (x: number, y: number): RGB | null => (x >= 30 && x < 170 && y >= 30 && y < 170 ? (x >= 45 && x < 155 && y >= 45 && y < 155 ? (x < 100 ? [244, 244, 244] : [230, 230, 228]) : [30, 30, 30]) : null);
    const photo = await image(200, 200, WHITE, frame);
    const cut = await masked(photo, (x, y) => (frame(x, y) && !(x >= 45 && x < 155 && y >= 45 && y < 155) ? 255 : 0));
    const out = await sharp(await fillInteriorHoles(cut, photo)).raw().toBuffer();
    expect(out[(100 * 200 + 60) * 4 + 3]).toBe(255);
    expect(out[(100 * 200 + 140) * 4 + 3]).toBe(255);
  });
});

describe("contrôle local d'un détourage", () => {
  const W = 200, H = 200;
  const check = async (alpha: (x: number, y: number) => boolean, photo?: Buffer) => checkCutoutLocal(full(await masked(await image(W, H, WHITE), (x, y) => (alpha(x, y) ? 255 : 0)), W, H), photo);

  it("un produit net au centre est accepté", async () => {
    const r = await check(disc(100, 100, 50));
    expect(r.ok).toBe(true);
    expect(r.score).toBeGreaterThan(7);
  });
  it("produit presque absent, fond gardé entier", async () => {
    expect((await check(disc(100, 100, 5))).reasons).toContain("too_small");
    expect((await check(() => true)).reasons).toContain("too_large");
  });
  it("morceaux épars (lettres d'un visuel, personnes au loin) refusés ; un lot de deux produits accepté", async () => {
    const letters = (x: number, y: number) => disc(100, 110, 45)(x, y) || (y >= 10 && y < 24 && x >= 20 && x < 180 && x % 16 < 8);
    expect((await check(letters)).reasons).toContain("fragments");
    const two = (x: number, y: number) => disc(60, 100, 35)(x, y) || disc(140, 100, 35)(x, y);
    expect((await check(two)).ok).toBe(true);
  });
  it("produit coupé par le cadre ou bras qui entre par le bord", async () => {
    const arm = (x: number, y: number) => disc(110, 90, 45)(x, y) || (y >= 120 && y < 150 && x < 110) || (x >= 90 && x < 120 && y > 120);
    expect((await check(arm)).reasons).toContain("cut_by_frame");
  });
  it("cas SOVA non corrigé : le trou au milieu du produit est signalé", async () => {
    const photo = await image(W, H, WHITE, sova);
    const r = await check((x, y) => !!sova(x, y) && !disc(100, 110, 26)(x, y), photo);
    expect(r.reasons).toContain("hole");
  });
});

describe("fond des photos et choix du modèle", () => {
  it("packshot sur fond uni : uni ; photo en situation : chargée", async () => {
    const pack = await measureBackground(await image(240, 200, WHITE, sova));
    expect(pack.plain && pack.flat).toBe(true);
    const busy = await measureBackground(await image(240, 200, "noise", sova));
    expect(busy.plain || busy.flat).toBe(false);
  });
  it("vraies photos du dépôt : packshot uni, photos en situation chargées", async () => {
    const dir = "scripts/demo-products/inputs";
    expect((await measureBackground(await sharp(`${dir}/maison/oreiller-bleu.jpg`).toBuffer())).flat).toBe(true);
    for (const f of ["drone-montagne", "gant-canape", "oreiller-sommeil", "protege-canape-chat"]) expect((await measureBackground(await sharp(`${dir}/situations/${f}.jpg`).toBuffer())).plain).toBe(false);
  });
  it("modèle « large » seulement s'il est livré et que la mémoire le permet", () => {
    expect(chooseModel(8000, ["large", "medium", "small"])).toBe("large");
    expect(chooseModel(1500, ["large", "medium", "small"])).toBe("medium");
    expect(chooseModel(8000, ["medium", "small"])).toBe("medium");
  });
  it("modèle planté : détourage par fond uni seulement si le fond est réellement uni, sinon échec propre", async () => {
    model.run = async () => null;
    const flat = await cutoutProduct(await image(200, 200, WHITE, sova));
    expect(flat.method).toBe("flood");
    await expect(cutoutProduct(await image(200, 200, "noise", sova))).rejects.toBeInstanceOf(CutoutUnavailable);
  });
});

// ---------------------------------------------------------------- tri, détourage, contrôle d'un projet

async function newProject() {
  const u = await createUser(`detour-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@test.fr`, "motdepasse-test", "D");
  const pid = id();
  run(
    "INSERT INTO projects (id, user_id, name, status, platform, product_json, brand_json, settings_json, sources_json, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
    pid, u.id, "SOVA", "creating", "shopify", JSON.stringify({ name: "SOVA" }), "{}", JSON.stringify({ language: "fr" }), "[]", now(), now(),
  );
  return { userId: u.id, projectId: pid };
}
let order = 0;
async function photo(p: { userId: string; projectId: string }, name: string, data: Buffer, origin: "link" | "upload" = "link") {
  const a = await saveAsset({ projectId: p.projectId, userId: p.userId, data, name: `${name}.png`, mime: "image/png", role: "original", folderKey: "product.originals", origin });
  run("UPDATE assets SET created_at = ? WHERE id = ?", 1_000_000 + order++, a.id);
  return a.id;
}
const role = (aid: string) => getAsset(aid)!;
const cutOf = (aid: string) => one<Asset>("SELECT * FROM assets WHERE role = 'cutout' AND source_asset_id = ? AND deleted_at IS NULL", aid);

describe("tri des photos et détourages d'un projet (lien Alibaba, IA simulée)", () => {
  beforeEach(() => {
    model.run = keepNonWhite;
    model.calls = 0;
    ai.on = true;
    ai.calls = [];
    ai.checks = [];
  });

  it("packshots détourés et contrôlés, photo en situation gardée, visuel avec texte écarté ; les refus ne servent jamais", async () => {
    await fr(async () => {
      const p = await newProject();
      const pack = await photo(p, "packshot", await image(220, 220, WHITE, sova));
      const life = await photo(p, "enfant-porte-sova", await image(220, 220, "noise", sova));
      const text = await photo(p, "visuel-texte", await image(220, 220, WHITE, (x, y) => sova(x, y) ?? (y > 196 && x % 10 < 5 ? [200, 20, 60] : null)));
      // Packshot entouré de petites taches : le « modèle » les garde → morceaux épars, refusé par les règles locales.
      const specks = await photo(p, "packshot-taches", await image(220, 220, WHITE, (x, y) => sova(x, y) ?? (x % 37 >= 10 && x % 37 < 15 && y % 41 >= 10 && y % 41 < 15 ? [20, 20, 20] : null)));
      // Packshot que le contrôle visuel refuse (main restée sur le produit, par exemple).
      const hand = await photo(p, "packshot-main", await image(220, 220, WHITE, sova));
      ai.triage = { photos: [{ index: 1, kind: "packshot" }, { index: 2, kind: "situation" }, { index: 3, kind: "text" }, { index: 4, kind: "packshot" }, { index: 5, kind: "packshot" }], best: 1 };
      ai.checks = [{ verdict: "ok", score: 9, problems: [], note: "" }, { verdict: "rejected", score: 3, problems: ["person_left"], note: "main visible" }];

      const valid = await ensureCutouts(null, loadProject(p.projectId));
      expect(valid.map((c) => c.source_asset_id)).toEqual([pack]);
      // Une seule requête de tri pour toutes les photos ; deux contrôles visuels (le refus local n'en demande pas).
      expect(ai.calls.filter((t) => t === "photo_triage")).toHaveLength(1);
      expect(ai.calls.filter((t) => t === "cutout_check")).toHaveLength(2);
      // Photo en situation : rejoint les photos « en situation » du client.
      expect(role(life).role).toBe("lifestyle");
      expect(role(life).origin).toBe("site");
      expect(cutOf(life)).toBeUndefined();
      // Visuel avec texte : gardé dans les fichiers, jamais détouré.
      expect(role(text).role).toBe("original");
      expect(json<any>(role(text).meta, {}).triage.kind).toBe("text");
      expect(cutOf(text)).toBeUndefined();
      // Refus gardés (statut « rejected », raisons) pour être montrés et ne pas être refaits.
      expect(cutOf(specks)!.status).toBe("rejected");
      expect(json<any>(cutOf(specks)!.meta, {}).quality.reasons).toContain("fragments");
      expect(cutOf(hand)!.status).toBe("rejected");
      expect(json<any>(cutOf(hand)!.meta, {}).quality).toMatchObject({ verdict: "rejected", by: "ai", reasons: ["person_left"] });
      const ok = json<any>(cutOf(pack)!.meta, {}).quality;
      expect(ok).toMatchObject({ verdict: "ok", by: "ai" });

      // Deuxième passage : rien n'est retrié ni refait.
      const calls = model.calls;
      await ensureCutouts(null, loadProject(p.projectId));
      expect(model.calls).toBe(calls);
      expect(ai.calls.filter((t) => t === "photo_triage")).toHaveLength(1);

      // Note d'étape honnête et bilingue.
      const sum = cutoutSummary(p.projectId);
      expect(sum).toMatchObject({ cut: 1, life: 1, text: 1, rejected: 2 });
      expect(stepNoteText(note("cutout.sorted", sum), "fr")).toBe("1 photo détourée, 1 photo en situation gardée, 1 visuel avec texte écarté, 2 détourages refusés au contrôle");
      expect(stepNoteText(note("cutout.sorted", sum), "en")).toBe("1 photo cut out, 1 lifestyle photo kept, 1 visual with text set aside, 2 cutouts rejected by the check");

      // La boutique n'utilise que le détourage validé, et la photo en situation du client en ouverture.
      const shop = collectImages(p.projectId);
      expect(shop.files[shop.slots.cutout!]).toBe(cutOf(pack)!.id);
      expect(shop.files[shop.slots.lifestyle!]).toBe(life);
      // « Ne pas utiliser » : plus aucun détourage utilisable, ni dans la boutique.
      setAsideCutout(cutOf(pack)!);
      expect(validCutouts(p.projectId)).toHaveLength(0);
      expect(collectImages(p.projectId).slots.cutout).toBeUndefined();
      expect(json<any>(cutOf(pack)!.meta, {}).quality.verdict).toBe("user");
    });
  });

  it("aucun packshot : la meilleure candidate n'est gardée que si le contrôle visuel la valide ; sinon message clair", async () => {
    await fr(async () => {
      const p = await newProject();
      const a = await photo(p, "situation-1", await image(200, 200, "noise", sova));
      const b = await photo(p, "situation-2", await image(200, 200, "noise", sova));
      ai.triage = { photos: [{ index: 1, kind: "situation" }, { index: 2, kind: "situation" }], best: 2 };
      // Le « modèle » isole bien un objet, mais le contrôle visuel le refuse.
      model.run = (png) => masked(png, (x, y) => (disc(100, 110, 60)(x, y) ? 255 : 0));
      ai.checks = [{ verdict: "rejected", score: 2, problems: ["background_left", "person_left"], note: "" }];
      expect(await ensureCutouts(null, loadProject(p.projectId))).toHaveLength(0);
      expect(cutOf(b)!.status).toBe("rejected"); // la meilleure (indice 2) a été essayée
      expect(cutOf(a)).toBeUndefined();
      const sum = cutoutSummary(p.projectId);
      expect(sum).toMatchObject({ cut: 0, life: 2, rejected: 1 });
      const msg = stepNoteText(note("cutout.none", sum), "fr")!;
      expect(msg).toContain("ajoutez une photo nette du produit seul, sur fond uni, dans l'onglet Produit");
      expect(msg).toContain("2 photos en situation gardées");
      expect(stepNoteText(note("cutout.none", sum), "en")).toContain("add a sharp photo of the product alone, on a plain background, in the Product tab");
    });
  });

  it("sans IA : packshot sur fond uni détouré et contrôlé localement ; photo sur fond chargé jamais détourée", async () => {
    await fr(async () => {
      ai.on = false;
      const p = await newProject();
      const pack = await photo(p, "packshot", await image(200, 200, WHITE, sova), "upload");
      const busy = await photo(p, "photo-chargee", await image(200, 200, "noise", sova), "upload");
      const valid = await ensureCutouts(null, loadProject(p.projectId));
      expect(valid.map((c) => c.source_asset_id)).toEqual([pack]);
      expect(json<any>(valid[0].meta, {}).quality).toMatchObject({ verdict: "ok", by: "local" });
      expect(cutOf(busy)).toBeUndefined();
      expect(role(busy).role).toBe("original"); // sans IA, impossible de distinguer situation et visuel avec texte
      expect(cutoutSummary(p.projectId)).toMatchObject({ cut: 1, busy: 1 });
      expect(ai.calls).toHaveLength(0);
    });
  });

  it("détourage ancien jamais contrôlé : contrôlé à son tour, et refusé s'il est raté", async () => {
    await fr(async () => {
      ai.on = false;
      const p = await newProject();
      const src = await photo(p, "packshot", await image(200, 200, WHITE, sova));
      run("UPDATE assets SET meta = ? WHERE id = ?", JSON.stringify({ triage: { kind: "packshot", by: "local", at: 1 } }), src);
      // Ancien détourage « fond uni » raté : il garde presque tout le cadre.
      const bad = await masked(await image(200, 200, [120, 120, 120]), () => 255);
      const legacy = await saveAsset({ projectId: p.projectId, userId: p.userId, data: bad, name: "ancien.png", mime: "image/png", role: "cutout", folderKey: "product.cutouts", origin: "generated", sourceAssetId: src, meta: { bbox: { x: 0, y: 0, w: 200, h: 200 }, source: { w: 200, h: 200 } } });
      expect(await ensureCutouts(null, loadProject(p.projectId))).toHaveLength(0);
      expect(getAsset(legacy.id)!.status).toBe("rejected");
      expect(json<any>(getAsset(legacy.id)!.meta, {}).quality.reasons).toContain("too_large");
    });
  });

  it("machine trop juste et fond chargé : pas de détourage, photo notée, pas de nouvel essai immédiat", async () => {
    await fr(async () => {
      model.run = async () => null;
      const p = await newProject();
      const busy = await photo(p, "packshot-fond-beton", await image(200, 200, "noise", sova));
      ai.triage = { photos: [{ index: 1, kind: "packshot" }], best: 1 };
      expect(await ensureCutouts(null, loadProject(p.projectId))).toHaveLength(0);
      expect(cutOf(busy)).toBeUndefined();
      expect(json<any>(role(busy).meta, {}).cutoutError.unavailable).toBe(true);
      const calls = model.calls;
      await ensureCutouts(null, loadProject(p.projectId));
      expect(model.calls).toBe(calls);
      expect(cutoutSummary(p.projectId).failed).toBe(1);
    });
  });
});
