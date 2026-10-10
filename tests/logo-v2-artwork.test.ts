/**
 * Logo V2 — logos complets dessinés par l'IA d'images (fournisseurs SIMULÉS, aucun appel payant) :
 *  - styles illustré, minimaliste, typographique (et style choisi par le client) : un logo complet par territoire,
 *    demande au style, plus aucune règle « formes noires / symbole sans lettre » ;
 *  - original conservé tel quel (livrable principal), essais écartés gardés avec leur image ;
 *  - contrôle adapté au style (texture, couleurs, tailles prévues), note jamais relevée, nom exact ;
 *  - nom mal écrit → réécrit par le studio sans toucher au dessin (aucune image regénérée) ;
 *  - SVG facultatif, seulement fidèle ; déclinaisons fidèles, version simplifiée et planche d'identité ;
 *  - slogan seulement validé, ligne d'activités seulement réelles ; nouvelle version seulement à la demande.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ai/config", async (orig) => ({ ...(await orig<object>()), activeProviderKey: () => null }));

describe("Logo V2 — logos complets de l'IA d'images", async () => {
  const { createUser } = await import("@/lib/auth");
  const { all, one, run } = await import("@/lib/db");
  const { loadProject, saveBrand } = await import("@/lib/projects");
  const { getSubscription, syncAllowance } = await import("@/lib/billing");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { JobContext } = await import("@/lib/jobs");
  const { assetData, getAsset } = await import("@/lib/library");
  const { runLogoEngineV2, redrawArtwork } = await import("@/lib/logo-v2/engine");
  const { chooseLogoV2, reapplyLogoV2 } = await import("@/lib/logo-v2/choose");
  const { brandDiscovery } = await import("@/lib/logo-v2/discovery");
  const { selectTerritories, cleanDescriptor } = await import("@/lib/logo-v2/territories");
  const { artworkPrompt, artworkScore, cleanArtwork, faithfulSvg, gateArtwork, STYLE_GUIDE } = await import("@/lib/logo-v2/artwork");
  const { ART_CRITERIA } = await import("@/lib/logo-v2/types");
  const { seedLogoFixture, artFixture } = await import("./logo-v2-fixtures");
  const { mockAi } = await import("./logo-v2-mock");
  const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);

  const u = await createUser(`logoart${Date.now()}@test.fr`, "motdepasse-test", "A");
  getSubscription(u.id);
  run("UPDATE subscriptions SET status = 'active', plan = 'creer' WHERE user_id = ?", u.id);
  syncAllowance(u.id);
  let n = 0;
  const job = (projectId: string, type = "brand.logo.v2") => {
    const jid = `job-art-${Date.now()}-${n++}`;
    run("INSERT INTO jobs (id, user_id, project_id, type, label, payload, status, run_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)", jid, u.id, projectId, type, type, JSON.stringify({ projectId }), "running", Date.now(), Date.now(), Date.now());
    return new JobContext(one<any>("SELECT * FROM jobs WHERE id = ?", jid));
  };
  const sb = () => fr(() => seedLogoFixture(u.id, "artisan"));

  // ---- images simulées (aucun appel) : aplats (minimaliste), matière bruitée (texturé, illustré)
  const svgPng = (body: string) => sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="1024" height="1024" fill="#FFFFFF"/>${body}</svg>`)).png().toBuffer();
  // Logo plat travaillé (anneau, pas une forme pleine de remplissage), nom en barre sombre dessous.
  const flatLogo = () => artFixture(0);
  /** Un dessin distinct par direction (une série n'est jamais faite de copies). */
  const DIR_ART: Record<string, number> = { "Atelier illustré": 1, "Signe épuré": 2, Lettrage: 3 };
  /** Matière bruitée ; `variant` : forme différente (série sans copies). */
  async function texturedLogo(variant = 0) {
    const W = 1024;
    const data = Buffer.alloc(W * W * 3, 255);
    let seed = 7;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
    const [x0, x1, y0, y1] = [[250, 780, 150, 650], [120, 470, 100, 650], [560, 920, 120, 420], [250, 780, 420, 650]][variant % 4];
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const i = (y * W + x) * 3;
      const v = Math.round(60 + rnd() * 150);
      data[i] = Math.min(255, v + 60);
      data[i + 1] = Math.round(v * 0.7);
      data[i + 2] = Math.round(v * 0.4 + (x - 250) * 0.2);
    }
    for (let y = 700; y < 790; y++) for (let x = 262; x < 762; x++) data.fill(34, (y * W + x) * 3, (y * W + x) * 3 + 3);
    return sharp(data, { raw: { width: W, height: W, channels: 3 } }).png().toBuffer();
  }
  /** Boîte (fractions) des pixels quasi noirs (#222) de l'image nettoyée : la zone du nom. */
  async function nameBoxOf(raw: Buffer) {
    const c = await cleanArtwork(raw);
    const { data, info } = await sharp(c).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let x0 = info.width, y0 = info.height, x1 = 0, y1 = 0;
    for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * 4;
      if (data[i + 3] > 200 && data[i] < 50 && data[i + 1] < 50 && data[i + 2] < 50) (x0 = Math.min(x0, x)), (y0 = Math.min(y0, y)), (x1 = Math.max(x1, x)), (y1 = Math.max(y1, y));
    }
    return { box: { x: x0 / info.width, y: y0 / info.height, w: (x1 - x0 + 1) / info.width, h: (y1 - y0 + 1) / info.height }, clean: c };
  }

  const artReview = (score: number, exp: { name: string }, o: Record<string, any> = {}) => ({
    criteria: Object.fromEntries(ART_CRITERIA.map((k) => [k, o.low?.[k] ?? score])) as any,
    textRead: o.textRead ?? exp.name,
    nameExact: o.nameExact ?? true,
    extraText: o.extraText ?? false,
    nameBox: o.nameBox ?? null,
    clumsyCliche: false,
    resemblesKnownBrand: false,
    amateur: false,
    artifacts: false,
    issues: o.issues ?? [],
    needsSimplifiedMark: true,
  });

  const STYLED = (b: any) => [
    { name: "Atelier illustré", markType: "symbol_wordmark", composition: "stacked", construction: "illustrative", sobriety: 4, style: "illustrated", symbolIdea: "une maison dont le toit devient un coup de pinceau", descriptor: "PLÂTRERIE • PEINTURE • ENDUITS" },
    { name: "Signe épuré", markType: "abstract_mark", composition: "horizontal", construction: "geometric", sobriety: 1, style: "minimal", symbolIdea: "un angle droit de mur, en négatif" },
    { name: "Lettrage", markType: "wordmark", composition: "wordmark_only", construction: "typographic", sobriety: 2, style: "typographic", symbolIdea: null, descriptor: "COACHING • NUTRITION" },
  ].map((o) => ({ concept: `Concept « ${o.name} » pour ${b.name}.`, whyItFits: "Parce que cela traduit le métier pour sa clientèle.", typography: { style: o.markType === "wordmark" ? "classic_serif" : "grotesque", weight: "bold", case: "upper", tracking: "normal", rationale: "" }, colorRole: { ink: "dark", accent: "primary", rationale: "" }, distinctive: "", avoid: [], ...o }));

  function artAi(log: { calls: string[]; prompts: string[] }, o: { image?: (t: any) => Promise<Buffer>; reviews?: Record<string, ((e: any) => any)[]>; drafts?: (b: any) => any[]; route?: any } = {}) {
    const queues: Record<string, ((e: any) => any)[]> = Object.fromEntries(Object.entries(o.reviews ?? {}).map(([k, v]) => [k, [...v]]));
    return {
      ...mockAi(log, { drafts: o.drafts ?? (STYLED as any) }),
      artworkRoute: () => o.route ?? { provider: "openai", model: "gpt-image-1" },
      async drawArtwork(t: any, b: any, feedback?: string) {
        log.calls.push(`art:${t.name}${feedback ? ":v" : ""}`);
        log.prompts.push(artworkPrompt(t, b, feedback));
        return (o.image ?? ((x: any) => artFixture(DIR_ART[x.name] ?? 0)))(t);
      },
      async reviewArtwork(_board: Buffer, t: any, _b: any, exp: any) {
        log.calls.push(`art-review:${t.name}`);
        const q = queues[t.name]?.shift();
        return q ? q(exp) : artReview(8.6, exp);
      },
    };
  }
  const newLog = () => ({ calls: [] as string[], prompts: [] as string[] });
  const runEngine = (pid: string, ai: any, opts: any = {}, ctx = job(pid)) => fr(() => runLogoEngineV2(ctx, pid, { ai, ...opts }));

  it("styles illustré, minimaliste, typographique : un logo complet par territoire, demande au style, sans règle « formes noires / sans lettre »", async () => {
    const pid = sb();
    const log = newLog();
    const r = await runEngine(pid, artAi(log));
    expect(log.calls.filter((c) => c.startsWith("art:"))).toEqual(["art:Atelier illustré", "art:Signe épuré", "art:Lettrage"]);
    expect(log.calls.some((c) => c.startsWith("symbol:") || c.startsWith("explore:"))).toBe(false);
    expect(log.prompts[0]).toContain(STYLE_GUIDE.illustrated);
    expect(log.prompts[1]).toContain(STYLE_GUIDE.minimal);
    expect(log.prompts[2]).toContain(STYLE_GUIDE.typographic);
    for (const p of log.prompts) {
      expect(p).toContain('the name "Sébastien Blanc"');
      expect(p).not.toMatch(/one solid black shape|no letters|Absolutely no text/i);
      expect(p).toMatch(/Nothing is imposed: no shape, object, initials, texture or composition is required/);
    }
    // Maison + pinceau : permis (plus de refus par liste de mots).
    expect(log.prompts[0]).toContain("une maison dont le toit devient un coup de pinceau");
    expect(r.shown.map((s) => s.territory.style)).toEqual(["illustrated", "minimal", "typographic"]);
    expect(r.shown.every((s) => s.candidate.symbolSource === "artwork" && s.verdict === "FINAL")).toBe(true);
    // Ligne d'activités : réelle → gardée ; inventée (coaching) → retirée.
    expect(r.shown[0].territory.descriptor).toBe("PLÂTRERIE • PEINTURE • ENDUITS");
    expect(r.shown[2].territory.descriptor).toBeNull();
  });

  it("aucune consigne d'une marque devenue règle : demandes neutres pour une autre marque, seul le style de la direction est transmis", async () => {
    const { TERRITORIES_SYSTEM } = await import("@/lib/logo-v2/ai");
    const TRADE = /roof|toit|house|maison|brush|pinceau|trowel|truelle|stucco|plaster|pl[âa]tr|enduit/i;
    expect(fr(() => TERRITORIES_SYSTEM())).not.toMatch(TRADE);
    for (const style of Object.keys(STYLE_GUIDE)) expect(STYLE_GUIDE[style as keyof typeof STYLE_GUIDE], style).not.toMatch(TRADE);
    // Sources des générateurs de logos : aucun exemple propre à un métier ou à un client.
    const files = [...fs.readdirSync(path.resolve(import.meta.dirname, "../src/lib/logo-v2")).map((f) => `../src/lib/logo-v2/${f}`), "../src/lib/engine/full-logo.ts"];
    for (const f of files) expect(fs.readFileSync(path.resolve(import.meta.dirname, f), "utf8"), f).not.toMatch(TRADE);
    for (const kind of ["saas", "cosmetic", "restaurant"] as const) {
      const pid = fr(() => seedLogoFixture(u.id, kind));
      const b = fr(() => brandDiscovery(loadProject(pid)));
      const draft = { name: "Logotype", markType: "wordmark", composition: "wordmark_only", construction: "typographic", sobriety: 2, style: "typographic", symbolIdea: null, concept: "Le nom seul, dessiné avec soin.", whyItFits: "Une marque sobre pour sa clientèle.", typography: { style: "grotesque", weight: "bold", case: "title", tracking: "normal", rationale: "" }, colorRole: { ink: "dark", accent: "primary", rationale: "" }, distinctive: "", avoid: [] };
      const t = selectTerritories([draft] as any, b, 1).kept[0];
      const prompt = artworkPrompt(t, b);
      expect(prompt, kind).not.toMatch(TRADE);
      // Hors la phrase qui dit justement que rien n'est imposé : ni initiales, ni texture, ni monogramme demandés.
      expect(prompt.split("\n").filter((l) => !l.startsWith("Nothing is imposed")).join("\n"), kind).not.toMatch(/initials|texture|monogram/i);
      expect(prompt).toContain(STYLE_GUIDE.typographic);
      for (const other of ["illustrated", "monogram", "textured", "emblem", "gradient", "premium", "minimal"] as const) expect(prompt).not.toContain(STYLE_GUIDE[other]);
      expect(prompt).toContain(`the name "${b.name}"`);
    }
  });

  it("style choisi par le client : toutes les directions dans ce style (différentes sur les autres axes)", async () => {
    const pid = sb();
    const log = newLog();
    const r = await runEngine(pid, artAi(log), { style: "monogram" });
    expect(r.territories.every((t) => t.style === "monogram")).toBe(true);
    expect(log.prompts.every((p) => p.includes(STYLE_GUIDE.monogram))).toBe(true);
  });

  it("original conservé tel quel : l'image livrée est celle de l'IA (fond retiré, recadrée), sans vectorisation ni redessin", async () => {
    const pid = sb();
    const raw = await texturedLogo();
    const r = await runEngine(pid, artAi(newLog(), { image: async () => raw }));
    const expected = await cleanArtwork(raw);
    const a = getAsset(r.shown[0].assetId!)!;
    const got = await sharp(assetData(a)).raw().toBuffer();
    expect(got.equals(await sharp(expected).raw().toBuffer())).toBe(true);
    expect((await sharp(assetData(a)).metadata()).width).toBeGreaterThan(500); // haute définition gardée
    expect(JSON.parse(a.meta as any).artwork).toMatchObject({ aiGenerated: true, provider: "openai:gpt-image-1" });
  });

  it("contrôle adapté au style : texture et petite taille non pénalisées pour un logo illustré ; 7/10 refusé sans nouvelle image ; note jamais relevée", async () => {
    // Note = moyenne pondérée des critères du style, rien de plus : 7 partout → 7.
    expect(artworkScore({ criteria: Object.fromEntries(ART_CRITERIA.map((k) => [k, 7])) as any }, "illustrated")).toBe(7);
    const t: any = { style: "illustrated" };
    const illustrated = artReview(9, { name: "X" }, { low: { intendedUse: 6.5, originality: 8.5, typography: 8 } });
    expect(gateArtwork(illustrated as any, t, { name: "X" }, 0).verdict).toBe("FINAL");
    const pid = sb();
    const log = newLog();
    const r = await runEngine(pid, artAi(log, { image: (t: any) => texturedLogo(DIR_ART[t.name]), reviews: { "Signe épuré": [(e) => artReview(7, e, { issues: ["symbole générique"] })] } }));
    expect(r.shown.map((s) => s.territory.name)).toEqual(["Atelier illustré", "Lettrage"]);
    const bad = r.discarded.find((d) => d.territory.name === "Signe épuré")!;
    expect(bad.verdict).toBe("REJECTED");
    expect(bad.reason).toMatch(/aucune nouvelle image sans votre accord/);
    // Une seule image par territoire, aucune regénération automatique.
    expect(log.calls.filter((c) => c.startsWith("art:"))).toHaveLength(3);
    // L'essai écarté garde son image ORIGINALE (présentée au client avec ses défauts).
    const trial = getAsset(bad.assetId!)!;
    expect(trial.role).toBe("logo-v2-trial");
    expect((await sharp(assetData(trial)).metadata()).width).toBeGreaterThan(500);
  });

  it("nom mal écrit → réécrit par le studio au même endroit, dessin intact, original gardé, aucune image regénérée", async () => {
    const pid = sb();
    const raw = await flatLogo();
    const { box, clean } = await nameBoxOf(raw);
    const log = newLog();
    const reviews = { "Atelier illustré": [(e: any) => artReview(8.7, e, { textRead: "SEBASTEIN BLANC", nameExact: false, nameBox: box }), (e: any) => artReview(8.7, e)] };
    const r = await runEngine(pid, artAi(log, { image: async () => raw, reviews }));
    const s = r.shown.find((x) => x.territory.name === "Atelier illustré")!;
    expect(s.verdict).toBe("FINAL");
    expect(s.candidate.artwork!.textCorrected).toBe(true);
    expect(s.candidate.change).toMatch(/nom réécrit par le studio/);
    expect(log.calls.filter((c) => c === "art:Atelier illustré")).toHaveLength(1);
    // Dessin (cercle) intact, zone du nom modifiée.
    const fixed = await sharp(assetData(getAsset(s.assetId!)!)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const orig = await sharp(clean).ensureAlpha().raw().toBuffer();
    const W = fixed.info.width;
    const H = fixed.info.height;
    let outsideDiff = 0;
    let insideDiff = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const inBox = x >= (box.x - 0.02) * W && x <= (box.x + box.w + 0.02) * W && y >= (box.y - 0.02) * H && y <= (box.y + box.h + 0.02) * H;
      const i = (y * W + x) * 4;
      // Pixels entièrement transparents des deux côtés : invisibles (leur couleur stockée n'a pas de sens).
      if (fixed.data[i + 3] === 0 && orig[i + 3] === 0) continue;
      const d = Math.abs(fixed.data[i + 3] - orig[i + 3]) + Math.abs(fixed.data[i] - orig[i]);
      if (d > 10) inBox ? insideDiff++ : outsideDiff++;
    }
    expect(outsideDiff).toBe(0);
    expect(insideDiff).toBeGreaterThan(100);
    // Le fichier reçu du fournisseur (avant nettoyage et correction) reste disponible, à l'identique.
    const original = one<{ id: string }>("SELECT id FROM assets WHERE project_id = ? AND role = 'logo-v2-original' AND source_asset_id = ?", pid, s.assetId!);
    expect(original).toBeTruthy();
    expect(assetData(getAsset(original!.id)!).equals(raw)).toBe(true);
    expect(clean.length).toBeGreaterThan(0);
  });

  it("fond blanc retiré même quand l'image a un canal alpha entièrement opaque ; un fond déjà transparent est gardé", async () => {
    const opaque = await cleanArtwork(await flatLogo());
    const a = await sharp(opaque).ensureAlpha().stats();
    expect(a.channels[3].min).toBe(0);
    const transparent = await sharp({ create: { width: 400, height: 400, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: await sharp({ create: { width: 200, height: 200, channels: 4, background: "#FFFFFF" } }).png().toBuffer(), left: 100, top: 100 }]).png().toBuffer();
    // Un aplat blanc voulu dans un logo transparent n'est pas effacé.
    const kept = await sharp(await cleanArtwork(transparent)).ensureAlpha().stats();
    expect(kept.channels[3].max).toBe(255);
  });

  it("reprise de tâche : aucune image ni relecture rappelée (points de reprise)", async () => {
    const pid = sb();
    const log = newLog();
    const ctx = job(pid);
    await runEngine(pid, artAi(log), {}, ctx);
    const before = log.calls.length;
    await runEngine(pid, artAi(log), {}, new JobContext(one<any>("SELECT * FROM jobs WHERE id = ?", ctx.job.id)));
    expect(log.calls.length).toBe(before);
  });

  it("SVG facultatif : proposé pour des aplats (fidèle), refusé pour une texture ou des dégradés (le PNG reste le livrable)", async () => {
    const flat = await faithfulSvg(await cleanArtwork(await flatLogo()));
    expect(flat.ok).toBe(true);
    if (flat.ok) expect(flat.fidelity).toBeGreaterThanOrEqual(0.96);
    const tex = await faithfulSvg(await cleanArtwork(await texturedLogo()));
    expect(tex.ok).toBe(false);
    if (!tex.ok) expect(tex.reason).toMatch(/dégradés, textures/);
  });

  it("choix : logo original principal, déclinaisons fidèles, version simplifiée, planche d'identité, charte ; SVG seulement fidèle", async () => {
    const pid = sb();
    const raw = await texturedLogo();
    const r = await runEngine(pid, artAi(newLog(), { image: async () => raw }));
    const pick = r.shown[0];
    await fr(() => chooseLogoV2(job(pid, "brand.logo.v2.choose"), pid, pick.assetId!));
    const brand = loadProject(pid).brand!;
    expect(brand.logo.status).toBe("validated");
    expect(brand.logo.engine).toBe("v2");
    const roleData = (role: string) => all<{ id: string }>("SELECT id FROM assets WHERE project_id = ? AND role = ? AND deleted_at IS NULL ORDER BY created_at DESC", pid, role);
    for (const role of ["logo", "logo-webp", "logo-light", "logo-light-webp", "logo-mono", "logo-white", "logo-mark", "logo-mark-webp", "favicon", "brand-board", "brand-guide"]) expect(roleData(role).length, role).toBeGreaterThan(0);
    // Symbole seul découpé dans le logo (matière texturée) : pas de SVG, il ne serait pas fidèle.
    expect(JSON.parse(getAsset(roleData("logo-mark")[0].id)!.meta as any).symbolFromArtwork).toBe(true);
    expect(roleData("logo-mark-svg")).toHaveLength(0);
    // Logo principal = l'original (pas une reconstruction).
    expect(assetData(getAsset(roleData("logo")[0].id)!).equals(assetData(getAsset(pick.assetId!)!))).toBe(true);
    // Texture : aucune version vectorielle imposée du logo complet.
    expect(roleData("logo-svg")).toHaveLength(0);
    const board = assetData(getAsset(roleData("brand-board")[0].id)!);
    expect(await sharp(board).metadata()).toMatchObject({ width: 2400, height: 1720 });
    fs.writeFileSync(path.join(fs.mkdtempSync(path.join(os.tmpdir(), "planche-")), "planche.png"), board);
  });

  it("logo complet écarté sans défaut rédhibitoire : choisissable par le client (son choix vaut contrôle) ; nom faux : jamais", async () => {
    const pid = sb();
    const r = await runEngine(pid, artAi(newLog(), { reviews: { "Signe épuré": [(e) => artReview(7.4, e, { issues: ["un peu sage"] })], Lettrage: [(e) => artReview(8.8, e, { textRead: "SEBASTIEN BLAN", nameExact: false })] } }));
    const meh = r.discarded.find((d) => d.territory.name === "Signe épuré")!;
    const wrong = r.discarded.find((d) => d.territory.name === "Lettrage")!;
    await expect(fr(() => chooseLogoV2(null, pid, wrong.assetId!))).rejects.toThrow(/n'a pas passé/);
    await fr(() => chooseLogoV2(null, pid, meh.assetId!));
    expect(one<any>("SELECT value FROM memory WHERE project_id = ? AND kind = 'decision' AND key = 'marque.logo' AND state = 'active'", pid)?.value).toMatch(/non validé par le contrôle, choisi par le client/);
  });

  it("slogan : écrit seulement s'il est validé par le client ; sinon jamais dans le logo", async () => {
    const pid = sb();
    const p = loadProject(pid);
    saveBrand(pid, { ...p.brand!, tagline: "Des murs nets, sans surprise", validated: (p.brand!.validated ?? []).filter((v) => v !== "tagline") });
    const b1 = fr(() => brandDiscovery(loadProject(pid)));
    const t1 = selectTerritories(STYLED(b1) as any, b1, 3).kept[0];
    expect(artworkPrompt(t1, b1)).not.toContain("Des murs nets");
    expect(artworkPrompt(t1, b1)).toMatch(/No other words, no slogan,/);
    saveBrand(pid, { ...loadProject(pid).brand!, validated: [...(loadProject(pid).brand!.validated ?? []), "tagline"] });
    const b2 = fr(() => brandDiscovery(loadProject(pid)));
    expect(artworkPrompt(t1, b2)).toContain('the slogan "Des murs nets, sans surprise"');
    // Ligne d'activités : seulement des activités réelles.
    expect(cleanDescriptor("Plâtrerie • Peinture", b2)).toBe("PLÂTRERIE • PEINTURE");
    expect(cleanDescriptor("Plâtrerie • Électricité", b2)).toBeNull();
  });

  it("nouvelle version : seulement à la demande (une image, remarques transmises), la précédente reste", async () => {
    const pid = sb();
    const log = newLog();
    const r = await runEngine(pid, artAi(log));
    const first = r.shown[0];
    const out = await fr(() => redrawArtwork(job(pid, "brand.logo.v2.redraw"), pid, first.assetId!, { feedback: "toit plus marqué, deux tons", ai: artAi(log) as any }));
    expect(log.calls.filter((c) => c === "art:Atelier illustré:v")).toHaveLength(1);
    expect(log.prompts.at(-1)).toContain("Requested changes for this new version: toit plus marqué, deux tons");
    expect(out.assetId).toBeTruthy();
    expect(getAsset(first.assetId!)!.deleted_at).toBeFalsy();
    expect(JSON.parse(getAsset(out.assetId!)!.meta as any)).toMatchObject({ run: JSON.parse(getAsset(first.assetId!)!.meta as any).run, previous: first.assetId });
  });

  it("nom de marque modifié après le choix : le nom est réécrit dans le logo, sans nouvelle image", async () => {
    const pid = sb();
    const raw = await flatLogo();
    const { box } = await nameBoxOf(raw);
    const log = newLog();
    const r = await runEngine(pid, artAi(log, { image: async () => raw, reviews: { "Atelier illustré": [(e) => artReview(8.7, e, { nameBox: box })] } }));
    await fr(() => chooseLogoV2(null, pid, r.shown[0].assetId!));
    saveBrand(pid, { ...loadProject(pid).brand!, name: "Atelier Blanc" });
    expect(await fr(() => reapplyLogoV2(null, pid))).toBe(true);
    const applied = getAsset(loadProject(pid).brand!.logo.proposalId!)!;
    expect(JSON.parse(applied.meta as any).artwork.expected.name).toBe("Atelier Blanc");
    expect(log.calls.filter((c) => c.startsWith("art:"))).toHaveLength(3);
  });

  it("sans modèle d'images capable d'écrire le nom : logos construits avec de vraies polices, et c'est écrit dans les notes", async () => {
    const pid = sb();
    const log = newLog();
    const r = await runEngine(pid, artAi(log, { route: { unavailable: "aucun modèle choisi pour « Logos »" } }));
    expect(log.calls.some((c) => c.startsWith("art:"))).toBe(false);
    expect(r.notes.join(" ")).toMatch(/logo complet par l'IA d'images indisponible \(aucun modèle choisi pour « Logos »\)/);
    expect(r.shown.length + r.discarded.length).toBeGreaterThan(0);
  });
});
