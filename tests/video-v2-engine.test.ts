/**
 * Video & UGC Engine V2 (phase 7A) — moteur complet avec rendu réel (ffmpeg), outils simulés : AUCUN appel d'IA,
 * aucune dépense. Vérifie : vidéo produite et rangée, accord avant génération, plafond avant envoi, fidélité produit,
 * continuité du personnage, reprise ciblée d'un seul plan, réutilisation des plans payés, idempotence, lignée du
 * client protégée, audio mixé et mesuré, sous-titres exportés, édition gratuite puis nouveau rendu, vidéo longue.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Video Engine V2 — moteur et rendu", async () => {
  const { createUser } = await import("@/lib/auth");
  const { all, json } = await import("@/lib/db");
  const { loadProject } = await import("@/lib/projects");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { getAsset, assetData } = await import("@/lib/library");
  const { runVideoEngineV2, regenerateClip, renderLatest } = await import("@/lib/video-v2/engine");
  const { latestVideo, listVideoVersions, saveVideoVersion } = await import("@/lib/video-v2/store");
  const { applyVideoOps } = await import("@/lib/video-v2/ops");
  const { localVideoEdit } = await import("@/lib/video-v2/local-edit");
  const { timeline } = await import("@/lib/video-v2/doc");
  const { measureAudio } = await import("@/lib/video-v2/audio");
  const { seedImageFixture, seedCutout } = await import("./image-v2-fixtures");
  const { mockVideoDeps, goodShot, videoReview } = await import("./video-v2-mock");
  const fr = <T,>(fn: () => Promise<T>) => runWithLang({ ui: "fr", content: "fr" }, fn);
  const u = await createUser(`v2e-${Date.now()}@test.fr`, "motdepasse-test", "V");
  const R = { renderScale: 0.2, fps: 8 } as const;

  async function cosmetic() {
    const p = loadProject(seedImageFixture(u.id, "cosmetic"));
    await seedCutout(u.id, p.id);
    return p;
  }
  const probe = (assetId: string) => {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), "v2p-"));
    const f = path.join(d, "v.mp4");
    fs.writeFileSync(f, assetData(getAsset(assetId)!));
    const out = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-print_format", "json", "-show_streams", "-show_format", f]).toString());
    fs.rmSync(d, { recursive: true, force: true });
    return out;
  };

  it("vidéo publicitaire complète : plans, document éditable, MP4 H.264 + AAC à la bonne durée, sous-titres SRT/VTT, affiche ; FINAL après relecture", async () => {
    const p = await cosmetic();
    const { deps, log } = mockVideoDeps({ userId: u.id, projectId: p.id, voice: true });
    const r = await fr(() => runVideoEngineV2(null, p.id, { ask: { text: "Publicité Instagram de 15 secondes" }, approveGeneration: true, ...R }, deps));
    expect(r.verdict).toBe("FINAL");
    expect(r.videoAssetId).toBeTruthy();
    const pr = probe(r.videoAssetId!);
    expect(pr.streams.map((s: any) => s.codec_name).sort()).toEqual(["aac", "h264"]);
    const doc = latestVideo(p.id, r.docKey!)!.doc;
    expect(Math.abs(Number(pr.format.duration) - timeline(doc).total)).toBeLessThan(0.5);
    expect(Math.abs(timeline(doc).total - 15)).toBeLessThanOrEqual(1.5);
    // Plans : au moins un généré (contrôlé), les autres montés localement ; mention IA présente.
    expect(log.clips.length).toBeGreaterThan(0);
    expect(log.shotReviews).toBe(log.clips.length);
    expect(doc.clips.some((c) => c.generated)).toBe(true);
    expect(doc.disclosure).toMatch(/générée par IA/);
    // Calques de l'éditeur publicitaire réutilisés (packshot, carte de fin).
    expect(doc.clips.some((c) => c.source.kind === "doc" && c.source.doc.layers.some((l) => l.kind === "button"))).toBe(true);
    // Sous-titres rangés à part (modifiables), voix enregistrées, audio mesuré proche de la cible.
    const files = all<{ name: string; mime: string }>("SELECT name, mime FROM assets WHERE project_id = ? AND role = 'subtitles'", p.id);
    expect(files.map((f) => f.mime).sort()).toEqual(["application/x-subrip", "text/vtt"]);
    const meta = json<any>(getAsset(r.videoAssetId!)!.meta as any, {});
    expect(meta.videoV2.audio.lufs).toBeGreaterThan(-18);
    expect(meta.videoV2.audio.lufs).toBeLessThan(-10);
    expect(doc.audio.voice.every((v) => v.assetId)).toBe(true);
    expect(log.videoReviews).toBe(1);
  }, 120_000);

  it("sans accord du client : AUCUN plan généré (estimation montrée d'abord) ; plan seul : rien produit, coût estimé", async () => {
    const p = await cosmetic();
    const { deps, log } = mockVideoDeps({ userId: u.id, projectId: p.id });
    const plan = await fr(() => runVideoEngineV2(null, p.id, { ask: { text: "Publicité Instagram" }, planOnly: true }, deps));
    expect(plan.estimateMicro).toBeGreaterThan(0);
    expect(plan.shots.some((s) => s.source.kind === "generate")).toBe(true);
    expect(plan.docKey).toBeNull();
    expect(log.clips.length + log.scripts).toBe(0);
    const r = await fr(() => runVideoEngineV2(null, p.id, { ask: { text: "Publicité Instagram" }, ...R }, deps));
    expect(log.clips).toHaveLength(0);
    expect(r.notes.join(" ")).toMatch(/génération non approuvée/);
    expect(r.videoAssetId).toBeTruthy();
    // Demande simple : aucune génération même avec accord.
    const s = await fr(() => runVideoEngineV2(null, p.id, { ask: { text: "Juste une petite vidéo simple du produit" }, approveGeneration: true, ...R }, deps));
    expect(log.clips).toHaveLength(0);
    expect(s.shots.every((x) => x.source.kind !== "generate")).toBe(true);
  }, 120_000);

  it("plafond : un plan qui dépasserait le budget n'est jamais envoyé (plan local à la place) ; sans contrôle de vision, rien n'est généré", async () => {
    const p = await cosmetic();
    const { deps, log } = mockVideoDeps({ userId: u.id, projectId: p.id, perSecondMicro: 2_000_000 });
    const r = await fr(() => runVideoEngineV2(null, p.id, { ask: { text: "Publicité Instagram" }, approveGeneration: true, maxCostEur: 1, ...R }, deps));
    expect(log.clips).toHaveLength(0);
    expect(r.stats.skippedForBudget).toBeGreaterThan(0);
    expect(r.videoAssetId).toBeTruthy();
    const { deps: blind, log: l2 } = mockVideoDeps({ userId: u.id, projectId: p.id, canReview: false });
    const b = await fr(() => runVideoEngineV2(null, p.id, { ask: { text: "Publicité Instagram" }, approveGeneration: true, ...R }, blind));
    expect(l2.clips).toHaveLength(0);
    expect(b.notes.join(" ")).toMatch(/contrôle de vision indisponible/);
    // Sans relecture IA, la vidéo n'est jamais FINAL.
    expect(b.verdict).not.toBe("FINAL");
  }, 120_000);

  it("fidélité produit : un plan au produit transformé est refusé (fatal), jamais monté ni réutilisé ; plan local à la place", async () => {
    const p = await cosmetic();
    const { deps, log } = mockVideoDeps({ userId: u.id, projectId: p.id, shot: () => goodShot({ productAltered: true, score: 8 }) });
    const r = await fr(() => runVideoEngineV2(null, p.id, { ask: { text: "Publicité Instagram" }, approveGeneration: true, ...R }, deps));
    expect(log.clips.length).toBe(r.shots.filter((s) => s.source.kind === "generate").length); // fatal : aucune reprise
    const doc = latestVideo(p.id, r.docKey!)!.doc;
    expect(doc.clips.some((c) => c.generated)).toBe(false);
    const rejected = all<{ status: string }>("SELECT status FROM assets WHERE project_id = ? AND role = 'clip'", p.id);
    expect(rejected.every((a) => a.status === "rejected")).toBe(true);
    expect(r.outcomes.some((o) => o.codes.includes("product_altered"))).toBe(true);
    expect(r.notes.join(" ")).toMatch(/refusé/);
  }, 120_000);

  it("UGC : personnage synthétique signalé, même image de départ pour tous ses plans ; incohérence → reprise ciblée du plan ; faux témoignage écarté", async () => {
    const p = await cosmetic();
    let n = 0;
    const { deps, log } = mockVideoDeps({ userId: u.id, projectId: p.id, shot: () => (++n === 2 ? goodShot({ characterConsistent: false, score: 7.5, issues: ["visage différent du premier plan"] }) : goodShot()), canWrite: true, script: () => ({ sections: [{ part: "hook", voice: "Je l'utilise depuis 6 mois, vraiment.", onScreen: "" }, { part: "development", voice: "Une formule courte, sans parfum.", onScreen: "" }, { part: "demonstration", voice: "Regardez la texture.", onScreen: "" }, { part: "conclusion", voice: "Sérum Éclat.", onScreen: "" }, { part: "cta", voice: "Découvrez-le.", onScreen: "Découvrir" }] }) });
    const r = await fr(() => runVideoEngineV2(null, p.id, { ask: { text: "Une vidéo UGC face caméra" }, approveGeneration: true, ...R }, deps));
    expect(r.intent.kind).toBe("ugc");
    const people = log.clips.filter((c) => c.people);
    expect(people.length).toBeGreaterThan(0);
    // Même personnage décrit à chaque plan (continuité).
    for (const c of people) expect(c.prompt).toMatch(/Same synthetic presenter/);
    expect(r.stats.retries).toBeGreaterThan(0);
    const doc = latestVideo(p.id, r.docKey!)!.doc;
    expect(doc.disclosure).toMatch(/générée par IA/);
    // Script IA avec faux témoignage : refusé (script local gardé), jamais « je l'utilise depuis ».
    expect(JSON.stringify(r.script)).not.toMatch(/depuis 6 mois/);
  }, 180_000);

  it("reprise ciblée : la relecture désigne un plan → ce plan SEUL est refait ; les plans acceptés et payés sont gardés", async () => {
    const p = await cosmetic();
    let rounds = 0;
    const { deps, log } = mockVideoDeps({ userId: u.id, projectId: p.id, video: () => (++rounds === 1 ? videoReview(7, { criteria: { ...videoReview(7).criteria, relevance: 5.5 }, fix: { target: "shot", shotId: null, instruction: "geste plus lisible" } }) : videoReview(8.3)) });
    const r = await fr(() => runVideoEngineV2(null, p.id, { ask: { text: "Publicité Instagram de 20 secondes" }, approveGeneration: true, ...R }, deps));
    const paid = r.shots.filter((s) => s.source.kind === "generate").length;
    // Une seule séquence refaite (un plan de plus que le nombre de plans payants), jamais toute la vidéo.
    expect(log.clips.length).toBe(paid + 1);
    expect(r.notes.join(" ")).toMatch(/reprise ciblée : plan s\d+ seul/);
    expect(r.verdict).toBe("FINAL");
    expect(listVideoVersions(p.id, r.docKey!).length).toBe(2);
  }, 180_000);

  it("réutilisation et idempotence : relancer ne repaie aucun plan accepté ; même demande = même lignée ; une vidéo modifiée par le client n'est jamais écrasée", async () => {
    const p = await cosmetic();
    const { deps, log } = mockVideoDeps({ userId: u.id, projectId: p.id });
    const a = await fr(() => runVideoEngineV2(null, p.id, { ask: { text: "Publicité Instagram" }, approveGeneration: true, ...R }, deps));
    const first = log.clips.length;
    expect(first).toBeGreaterThan(0);
    const b = await fr(() => runVideoEngineV2(null, p.id, { ask: { text: "Publicité Instagram" }, approveGeneration: true, ...R }, deps));
    expect(log.clips.length).toBe(first); // plans FINAL réutilisés
    expect(b.stats.reused).toBeGreaterThan(0);
    expect(b.docKey).toBe(a.docKey);
    // Le client modifie la vidéo : une régénération crée une autre lignée.
    const cur = latestVideo(p.id, a.docKey!)!;
    saveVideoVersion(p.id, a.docKey!, { ...cur.doc, meta: { ...cur.doc.meta, source: "user" } }, { note: "client" });
    const c = await fr(() => runVideoEngineV2(null, p.id, { ask: { text: "Publicité Instagram" }, approveGeneration: true, ...R }, deps));
    expect(c.docKey).not.toBe(a.docKey);
    expect(latestVideo(p.id, a.docKey!)!.version.source).toBe("user");
  }, 180_000);

  it("édition gratuite puis nouveau rendu : retouches par conversation, document enregistré, rendu local sans aucun appel", async () => {
    const p = await cosmetic();
    const { deps, log } = mockVideoDeps({ userId: u.id, projectId: p.id });
    const r = await fr(() => runVideoEngineV2(null, p.id, { ask: { text: "Publicité Instagram" }, ...R }, deps));
    const before = { ...log, clips: log.clips.length };
    let doc = latestVideo(p.id, r.docKey!)!.doc;
    for (const ask of ["Raccourcis l'introduction.", "Change la musique.", "Agrandis les sous-titres.", "Fais une version plus dynamique."]) {
      const e = localVideoEdit(doc, ask);
      expect(e.local).toBe(true);
      if (e.local) doc = applyVideoOps(doc, e.ops);
    }
    saveVideoVersion(p.id, r.docKey!, doc, { note: "retouches" });
    const out = await renderLatest(null, p.id, r.docKey!, { scale: 0.2, fps: 8 });
    expect(out.videoAssetId).toBeTruthy();
    expect(out.verdict).not.toBe("FINAL"); // rendu d'une version client : le client valide lui-même
    expect(Math.abs(Number(probe(out.videoAssetId).format.duration) - timeline(doc).total)).toBeLessThan(0.5);
    expect(log.clips.length).toBe(before.clips);
    expect(log.videoReviews).toBe(before.videoReviews);
    expect(log.shotReviews).toBe(before.shotReviews);
  }, 120_000);

  it("« Remplace le deuxième plan » avec génération acceptée : UN seul plan change, les autres restent identiques", async () => {
    const p = await cosmetic();
    const { deps, log } = mockVideoDeps({ userId: u.id, projectId: p.id });
    const r = await fr(() => runVideoEngineV2(null, p.id, { ask: { text: "Publicité Instagram" }, ...R }, deps));
    const before = latestVideo(p.id, r.docKey!)!.doc;
    const out = await fr(() => regenerateClip(null, p.id, r.docKey!, before.clips[1].id, { approve: true, maxCostEur: 2, instruction: "le produit sur une étagère" }, deps));
    expect(log.clips).toHaveLength(1);
    const after = latestVideo(p.id, r.docKey!)!.doc;
    expect(after.clips[1].generated).toBe(true);
    expect(after.disclosure).toMatch(/IA/);
    expect(JSON.stringify(after.clips.filter((_, k) => k !== 1))).toBe(JSON.stringify(before.clips.filter((_, k) => k !== 1)));
    expect(out.outcome.verdict).toBe("FINAL");
    // Sans accord : aucun appel, plan local.
    await fr(() => regenerateClip(null, p.id, r.docKey!, before.clips[2].id, { approve: false }, deps));
    expect(log.clips).toHaveLength(1);
  }, 120_000);

  it("vidéo longue (> 30 s) en plusieurs séquences, format 16:9 ; Image Engine V2 sollicité pour les plans sans visuel", async () => {
    const p = loadProject(seedImageFixture(u.id, "artisan"));
    const { deps, log } = mockVideoDeps({ userId: u.id, projectId: p.id });
    const r = await fr(() => runVideoEngineV2(null, p.id, { ask: { text: "Présentation de l'entreprise pour YouTube, 45 secondes" }, approveGeneration: true, ...R }, deps));
    const doc = latestVideo(p.id, r.docKey!)!.doc;
    expect(doc.aspect).toBe("16:9");
    expect(timeline(doc).total).toBeGreaterThan(40);
    expect(doc.clips.length).toBeGreaterThanOrEqual(8);
    expect(log.images).toBeGreaterThan(0);
    // Chaque plan généré dure ce que le fournisseur sait faire ; la vidéo longue est un assemblage.
    for (const c of log.clips) expect([5, 8, 10]).toContain(c.seconds);
    expect(probe(r.videoAssetId!).format.duration * 1).toBeGreaterThan(40);
  }, 240_000);

  it("audio : silences de la voix retirés, musique atténuée sous la voix, intensité normalisée, aucune saturation", async () => {
    const p = await cosmetic();
    const { deps } = mockVideoDeps({ userId: u.id, projectId: p.id, voice: true });
    const r = await fr(() => runVideoEngineV2(null, p.id, { ask: { text: "Publicité Instagram" }, ...R }, deps));
    const d = fs.mkdtempSync(path.join(os.tmpdir(), "v2a-"));
    const f = path.join(d, "v.mp4");
    fs.writeFileSync(f, assetData(getAsset(r.videoAssetId!)!));
    const m = await measureAudio(f);
    fs.rmSync(d, { recursive: true, force: true });
    expect(m.silent).toBe(false);
    expect(Math.abs((m.lufs ?? 0) + 14)).toBeLessThan(2.5);
    expect(m.truePeakDb!).toBeLessThan(-0.5);
  }, 120_000);

  it("aucun secret ni consigne stockés : documents et mémoire des plans sans clé, sans prompt", async () => {
    const rows = all<{ doc_json: string }>("SELECT doc_json FROM video_documents");
    for (const r of rows) expect(r.doc_json).not.toMatch(/sk-[A-Za-z0-9]{8}|AIza[0-9A-Za-z_-]{10}|api[_-]?key/i);
    const cols = all<{ name: string }>("PRAGMA table_info(video_shots)").map((c) => c.name);
    expect(cols).not.toContain("prompt");
    for (const r of rows) expect(r.doc_json).not.toMatch(/Same synthetic presenter|The product must remain exactly identical/);
  });
});
