/**
 * Video & UGC Engine V2 (phase 7A) — modules sans rendu : intention, stratégie, script, storyboard, planification
 * des plans, Router V2 / capacités des fournisseurs, document éditable, opérations, retouches par conversation,
 * sous-titres, barrière vidéo. Aucun appel d'IA, aucune dépense.
 */
import { describe, expect, it } from "vitest";

describe("Video Engine V2 — modules", async () => {
  const { createUser } = await import("@/lib/auth");
  const { loadProject } = await import("@/lib/projects");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { adInsight } = await import("@/lib/ads-v2/insight");
  const { videoIntent } = await import("@/lib/video-v2/intent");
  const { videoStrategy, visualLanguage } = await import("@/lib/video-v2/strategy");
  const { localScript, scriptIssues, fromDraft, WORDS_PER_SECOND } = await import("@/lib/video-v2/script");
  const { buildStoryboard, storyboardIssues } = await import("@/lib/video-v2/storyboard");
  const { planShots, paidShots } = await import("@/lib/video-v2/shots");
  const { chooseProvider, compatible, VIDEO_CAPABILITIES, verified } = await import("@/lib/video-v2/providers");
  const { applyVideoOp, applyVideoOps, VideoHistory, VideoOpError } = await import("@/lib/video-v2/ops");
  const { localVideoEdit, targetClip } = await import("@/lib/video-v2/local-edit");
  const { toSrt, toVtt, absoluteCues, cuesForVoice, splitCaption, timeline, kineticDoc, endCardDoc, SIZES, safeZone } = await import("@/lib/video-v2/doc");
  const { gateShot, gateVideo, localVideoChecks } = await import("@/lib/video-v2/quality");
  const { ugcScriptIssues, personaSheet } = await import("@/lib/video-v2/ugc");
  const { seedImageFixture } = await import("./image-v2-fixtures");
  const { goodShot, videoReview } = await import("./video-v2-mock");
  const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());
  const u = await createUser(`v2-${Date.now()}@test.fr`, "motdepasse-test", "V");
  const cosmetic = loadProject(seedImageFixture(u.id, "cosmetic"));
  const artisan = loadProject(seedImageFixture(u.id, "artisan"));
  const saas = loadProject(seedImageFixture(u.id, "saas"));
  const inv0 = { cutout: { id: "cut" }, logo: null, photos: [{ id: "ph1", role: "lifestyle", origin: "upload" }], videos: [], screens: [] };
  const allProviders = { available: () => true, preferred: null, estimate: (_p: string, _m: string, s: number) => s * 100_000 };

  // ------------------------------------------------------------------ intention

  it("intention : publicité, tutoriel, UGC, métier ; format, durée bornée, demande simple sans production", async () => {
    await fr(() => {
      const a = videoIntent(cosmetic, { text: "Fais une publicité TikTok de 20 secondes" });
      expect(a).toMatchObject({ kind: "video_ad", platform: "tiktok", aspect: "9:16", durationS: 20 });
      expect(videoIntent(cosmetic, { text: "Un tutoriel pour la page produit" })).toMatchObject({ kind: "product_tutorial", platform: "shop_page" });
      expect(videoIntent(cosmetic, { text: "Une vidéo UGC face caméra" }).kind).toBe("ugc");
      expect(videoIntent(artisan, { text: "Présente mon savoir-faire sur le chantier" }).kind).toBe("trade_video");
      // Demande modeste : montage local, jamais une production complexe.
      expect(videoIntent(cosmetic, { text: "Juste une petite vidéo rapide de mon produit" }).complexity).toBe("simple");
      // Durée au-delà de la limite de la plateforme : ramenée, et dit.
      const long = videoIntent(cosmetic, { text: "Un reel instagram de 5 minutes" });
      expect(long.durationS).toBe(90);
      expect(long.reasons.join(" ")).toMatch(/limite/);
      expect(videoIntent(cosmetic, { text: "vidéo de présentation 16:9 pour le site" }).aspect).toBe("16:9");
      // UGC sans génération autorisée : impossible (aucune personne à filmer) → contenu social local.
      expect(videoIntent(cosmetic, { text: "UGC", allowGeneration: false })).toMatchObject({ kind: "social_content", complexity: "simple" });
      // Vidéo longue : production multiséquence.
      expect(videoIntent(artisan, { text: "Présentation de l'entreprise pour YouTube, 2 minutes" })).toMatchObject({ durationS: 120, complexity: "production" });
    });
  });

  // ------------------------------------------------------------------ stratégie

  it("stratégie : propre au projet (plâtrier ≠ cosmétique premium), preuves confirmées seulement, CTA adapté", async () => {
    await fr(() => {
      const ia = adInsight(artisan);
      const ic = adInsight(cosmetic);
      expect(visualLanguage(ia)).toBe("craft_documentary");
      expect(visualLanguage(ic)).toBe("premium_soft");
      expect(visualLanguage(adInsight(saas))).toBe("digital_explainer");
      const sa = videoStrategy(artisan, videoIntent(artisan, { text: "publicité" }));
      const sc = videoStrategy(cosmetic, videoIntent(cosmetic, { text: "publicité" }));
      expect(sa.style.camera).not.toBe(sc.style.camera);
      expect(sa.style.music).not.toBe(sc.style.music);
      expect(sa.hook).not.toBe(sc.hook);
      // Les preuves viennent uniquement des faits confirmés / preuves disponibles.
      for (const pr of sc.proofs) expect([...ic.facts.map((f) => `${f.label} : ${f.value}`), ...ic.proofs]).toContain(pr);
      expect(sa.cta).toBeTruthy();
      expect(sa.rhythm.cutsPerMin).toBeGreaterThan(10);
    });
  });

  // ------------------------------------------------------------------ script

  it("script : accroche → développement → démonstration → preuve → conclusion → CTA ; voix tenue dans la durée ; aucune affirmation inventée", async () => {
    await fr(() => {
      const intent = videoIntent(cosmetic, { text: "publicité de 20 secondes" });
      const st = videoStrategy(cosmetic, intent);
      const i = adInsight(cosmetic);
      const s = localScript(i, st, intent);
      expect(s.sections.map((x) => x.part)).toEqual(st.proofs.length ? ["hook", "development", "demonstration", "proof", "conclusion", "cta"] : ["hook", "development", "demonstration", "conclusion", "cta"]);
      expect(Math.round(s.sections.reduce((t, x) => t + x.durationS, 0))).toBe(20);
      for (const x of s.sections) expect(x.voice.split(/\s+/).filter(Boolean).length).toBeLessThanOrEqual(Math.ceil(x.durationS * WORDS_PER_SECOND) + 1);
      expect(s.issues).toEqual([]);
      // Aucun mot-clé de recherche d'images (anglais) dans le texte d'une vidéo française.
      expect(JSON.stringify(s.sections)).not.toMatch(/hands applying|skincare routine/);
      // Version IA fautive : formule creuse, chiffre et avis non confirmés → refusée.
      const bad = fromDraft({ sections: [{ part: "hook", voice: "Le meilleur sérum révolutionnaire", onScreen: "" }, { part: "development", voice: "97 % de clientes satisfaites, 5 étoiles", onScreen: "" }, { part: "cta", voice: "Découvrir", onScreen: "Découvrir" }] }, s, true);
      const issues = scriptIssues(bad, { proofs: st.proofs, facts: i.facts });
      expect(issues.join(" ")).toMatch(/creuse/);
      expect(issues.join(" ")).toMatch(/pourcentage non confirmé/);
      expect(issues.join(" ")).toMatch(/avis ou témoignage non confirmé/);
      // Sans preuve disponible : aucune section « preuve ».
      const st2 = { ...st, proofs: [] };
      expect(localScript({ ...i, facts: [], proofs: [] }, st2, intent).sections.some((x) => x.part === "proof")).toBe(false);
    });
  });

  // ------------------------------------------------------------------ storyboard et plans

  it("storyboard : plans complets, dans l'ordre du récit, durée respectée ; voix répartie aux pauses", async () => {
    await fr(() => {
      const intent = videoIntent(artisan, { text: "vidéo de métier de 35 secondes pour le site" });
      const st = videoStrategy(artisan, intent);
      const i = adInsight(artisan);
      const sb = buildStoryboard(i, st, intent, localScript(i, st, intent), { ...inv0, cutout: null });
      expect(storyboardIssues(sb, st.durationS)).toEqual([]);
      for (const s of sb) for (const k of ["id", "durationS", "subject", "action", "environment", "framing", "camera", "lighting", "reference", "transition", "purpose"] as const) expect(s[k]).toBeTruthy();
      expect(sb.length).toBeGreaterThanOrEqual(6);
      expect(sb.some((s) => s.showsProduct)).toBe(false); // services : aucun produit
      expect(sb[0].environment).toMatch(/chantier/);
    });
  });

  it("plans : le procédé le plus sobre ; aucune génération pour une demande simple, sans accord, sans contrôle ou hors budget", async () => {
    await fr(() => {
      const mk = (text: string, p = cosmetic) => {
        const intent = videoIntent(p, { text });
        const st = videoStrategy(p, intent);
        const i = adInsight(p);
        return { intent, st, sb: buildStoryboard(i, st, intent, localScript(i, st, intent), inv0) };
      };
      const prov = (n: Parameters<typeof chooseProvider>[0]) => chooseProvider(n, allProviders);
      const std = mk("publicité instagram");
      const full = planShots(std.sb, { intent: std.intent, strategy: std.st, inv: inv0, allowGeneration: true, provider: prov, budgetMicro: 10_000_000 });
      expect(full.shots.find((s) => s.part === "cta")!.method).toBe("local_composition");
      expect(full.shots.find((s) => s.part === "conclusion")?.method ?? "packshot").toBe("packshot");
      expect(paidShots(full.shots).length).toBeGreaterThan(0);
      expect(paidShots(full.shots).every((s) => s.part === "demonstration" || s.part === "hook")).toBe(true);
      expect(full.estimateMicro).toBe(paidShots(full.shots).reduce((t, s) => t + (s.source.estimateMicro ?? 0), 0));
      // Demande simple : rien à payer.
      const simple = mk("juste une petite vidéo simple");
      expect(paidShots(planShots(simple.sb, { intent: simple.intent, strategy: simple.st, inv: inv0, allowGeneration: true, provider: prov, budgetMicro: 10_000_000 }).shots)).toEqual([]);
      // Génération non permise (pas d'accord / pas de contrôle) : rien à payer.
      expect(paidShots(planShots(std.sb, { intent: std.intent, strategy: std.st, inv: inv0, allowGeneration: false, provider: prov, budgetMicro: 10_000_000 }).shots)).toEqual([]);
      // Budget trop faible : génération écartée AVANT tout envoi, montage local à la place.
      const poor = planShots(std.sb, { intent: std.intent, strategy: std.st, inv: inv0, allowGeneration: true, provider: prov, budgetMicro: 1000 });
      expect(paidShots(poor.shots)).toEqual([]);
      expect(poor.skippedForBudget).toBeGreaterThan(0);
      // Vidéo réelle disponible : réutilisée plutôt que générée.
      const withVideo = { ...inv0, videos: [{ id: "vid1", durationS: 6, role: "clip" }] };
      const reuse = planShots(std.sb, { intent: std.intent, strategy: std.st, inv: withVideo, allowGeneration: true, provider: prov, budgetMicro: 10_000_000 });
      expect(reuse.shots.some((s) => s.method === "existing_video" && s.source.assetId === "vid1")).toBe(true);
      // Logiciel : animation d'interface (capture manquante signalée), pas de génération.
      const sw = mk("vidéo explicative du logiciel", saas);
      const ui = planShots(sw.sb, { intent: sw.intent, strategy: sw.st, inv: { ...inv0, cutout: null }, allowGeneration: true, provider: prov, budgetMicro: 10_000_000 });
      expect(ui.shots.some((s) => s.method === "ui_animation" && /À compléter/.test(s.why))).toBe(true);
    });
  });

  // ------------------------------------------------------------------ Router V2 et fournisseurs

  it("Router V2 : seules les capacités VÉRIFIÉES comptent ; repli sur un fournisseur compatible ; tarif inconnu refusé", () => {
    // Texte vers vidéo : annoncé par Veo mais jamais appelé par le studio → non utilisé.
    for (const c of VIDEO_CAPABILITIES) expect(verified(c, "textToVideo")).toBe(false);
    expect(chooseProvider({ imageToVideo: false, people: false, nativeAudio: false, aspect: "9:16", durationS: 5 }, allProviders)).toBeNull();
    // Son natif : seulement Veo (vérifié par le code UGC) ; Kling n'en a pas.
    const kling = VIDEO_CAPABILITIES.find((c) => c.provider === "fal")!;
    expect(compatible(kling, { imageToVideo: true, people: true, nativeAudio: true, aspect: "9:16", durationS: 8 })).toMatch(/son natif/);
    expect(chooseProvider({ imageToVideo: true, people: true, nativeAudio: true, aspect: "9:16", durationS: 8 }, allProviders)!.provider).toBe("google");
    // Google indisponible : repli sur fal.ai (compatible pour un plan sans son natif).
    const fb = chooseProvider({ imageToVideo: true, people: false, nativeAudio: false, aspect: "9:16", durationS: 4 }, { ...allProviders, available: (x) => x === "fal" })!;
    expect(fb.provider).toBe("fal");
    expect(fb.shootS).toBe(5);
    expect(fb.rejected.some((r) => /clé inactive/.test(r.why))).toBe(true);
    // Le moins cher compatible, sauf route de l'administration.
    expect(chooseProvider({ imageToVideo: true, people: false, nativeAudio: false, aspect: "16:9", durationS: 4 }, { ...allProviders, estimate: (p, _m, s) => (p === "fal" ? s * 90 : s * 150) })!.provider).toBe("fal");
    expect(chooseProvider({ imageToVideo: true, people: false, nativeAudio: false, aspect: "16:9", durationS: 4 }, { ...allProviders, preferred: { provider: "google", model: "veo-3.0-fast-generate-001" } })!.model).toBe("veo-3.0-fast-generate-001");
    // Tarif inconnu : modèle écarté (jamais compté 0 €).
    expect(chooseProvider({ imageToVideo: true, people: false, nativeAudio: false, aspect: "9:16", durationS: 4 }, { ...allProviders, estimate: () => null })).toBeNull();
  });

  // ------------------------------------------------------------------ document, opérations, conversation

  function sampleDoc() {
    const W = SIZES["9:16"].w;
    const H = SIZES["9:16"].h;
    const safe = safeZone("9:16", "reels");
    const pal = { primary: "#334455", secondary: "#ccbbaa", accent: "#dd8844", dark: "#111111", light: "#f5f2ee" };
    const typo = { heading: "Inter", body: "Inter" };
    const mk = (id: string, part: "hook" | "demonstration" | "cta", src: any, d: number) => ({ id, shotId: id.replace("c-", ""), label: `${part} · ${id}`, part, durationS: d, source: src, overlays: [], transitionIn: { kind: "cut" as const, durationS: 0 } });
    const doc = {
      version: 1,
      width: W,
      height: H,
      fps: 30,
      aspect: "9:16" as const,
      platform: "reels" as const,
      safe,
      clips: [mk("c-s1", "hook", { kind: "doc", doc: kineticDoc({ w: W, h: H, safe, pal, typo, brand: "B", text: "Accroche" }), animate: "fade" }, 3), mk("c-s2", "demonstration", { kind: "image", assetId: "img1", motion: "push_in", crop: null }, 4), mk("c-s3", "demonstration", { kind: "video", assetId: "vid1", inS: 0, outS: 5, muted: true }, 5), mk("c-s4", "cta", { kind: "doc", doc: endCardDoc({ w: W, h: H, safe, pal, typo, brand: "B", cta: "Découvrir" }), animate: "rise" }, 3)],
      subtitles: { style: { enabled: true, family: "Inter", weight: 700, size: 56, color: "#FFFFFF", background: "rgba(0,0,0,0.6)", position: "bottom" as const, offsetY: 0, maxChars: 28, uppercase: false }, cues: [...cuesForVoice("c-s2", "Regardez comme il se pose facilement sur la peau.", 4, 28, "q2"), ...cuesForVoice("c-s3", "Une texture légère.", 5, 28, "q3")] },
      audio: { voice: [{ id: "v2", clipId: "c-s2", assetId: null, text: "Regardez", offsetS: 0.1, durationS: 2, gainDb: 0 }], voiceId: null, music: { source: "synth" as const, mood: "calm" as const, gainDb: -14 }, sfx: [], duckingDb: -10, loudnessLufs: -14 },
      brand: { palette: pal, fonts: { heading: "Inter", body: "Inter" }, name: "B" },
      disclosure: null,
      meta: { intent: "video_ad" as const, source: "engine" as const, createdFrom: null, runId: null },
    };
    return doc;
  }

  it("édition manuelle gratuite : texte, média, coupe, durée, ordre, ajout / suppression, transitions, sous-titres, musique, voix ; annuler / rétablir", () => {
    const d0 = sampleDoc() as any;
    let d = applyVideoOp(d0, { op: "text", clipId: "c-s1", layerId: "title", text: "Nouvelle accroche" });
    expect(((d.clips[0].source as any).doc.layers.find((l: any) => l.id === "title") as any).text).toBe("Nouvelle accroche");
    expect(d.meta.source).toBe("user");
    expect(d.clips[0].userEdited).toBe(true);
    d = applyVideoOp(d, { op: "replace_media", clipId: "c-s2", media: { kind: "image", assetId: "img2" } });
    expect(d.clips[1].source).toMatchObject({ kind: "image", assetId: "img2", motion: "push_in" });
    d = applyVideoOp(d, { op: "trim", clipId: "c-s3", inS: 1, outS: 3 });
    expect(d.clips[2]).toMatchObject({ durationS: 2, source: { inS: 1, outS: 3 } });
    // Les sous-titres du plan coupé restent dans le plan.
    for (const q of d.subtitles.cues.filter((x: any) => x.clipId === "c-s3")) expect(q.toS).toBeLessThanOrEqual(2);
    d = applyVideoOp(d, { op: "duration", clipId: "c-s2", durationS: 2.5 });
    expect(d.clips[1].durationS).toBe(2.5);
    d = applyVideoOp(d, { op: "reorder", clipId: "c-s3", index: 0 });
    expect(d.clips.map((c: any) => c.id)).toEqual(["c-s3", "c-s1", "c-s2", "c-s4"]);
    d = applyVideoOp(d, { op: "duplicate", clipId: "c-s1", newId: "c-s1b" });
    d = applyVideoOp(d, { op: "remove", clipId: "c-s1b" });
    expect(d.clips).toHaveLength(4);
    d = applyVideoOp(d, { op: "transition", clipId: "c-s2", kind: "fade", durationS: 0.5 });
    expect(d.clips[2].transitionIn).toEqual({ kind: "fade", durationS: 0.5 });
    d = applyVideoOp(d, { op: "subtitle_style", patch: { size: 70, position: "top" } });
    expect(d.subtitles.style).toMatchObject({ size: 70, position: "top" });
    const cue = d.subtitles.cues[0];
    d = applyVideoOp(d, { op: "subtitle_text", cueId: cue.id, text: "Texte corrigé" });
    expect(d.subtitles.cues[0].text).toBe("Texte corrigé");
    d = applyVideoOp(d, { op: "music", music: { source: "synth", mood: "pulse", gainDb: -12 } });
    expect(d.audio.music).toMatchObject({ mood: "pulse" });
    expect(() => applyVideoOp(d, { op: "music", music: { source: "library", assetId: "m1", licence: " ", gainDb: -12 } })).toThrow(VideoOpError);
    d = applyVideoOp(d, { op: "voice", voiceId: "voix-2" });
    expect(d.audio.voice.every((v: any) => v.assetId === null)).toBe(true);
    // Calques posés sur un plan : mêmes opérations que l'éditeur publicitaire.
    d = applyVideoOp(d, { op: "overlay", clipId: "c-s2", docOp: { op: "add", layer: { id: "badge", name: "Pastille", role: "decor", kind: "shape", shape: "ellipse", x: 10, y: 10, w: 100, h: 100, rotation: 0, opacity: 1, visible: true, locked: false, anchor: { h: "left", v: "top" }, fill: "#ff0000", stroke: null, radius: 0, shadow: null } } });
    expect(d.clips[2].overlays.map((l: any) => l.id)).toContain("badge");
    expect(() => applyVideoOp(d, { op: "remove", clipId: "inconnu" })).toThrow(VideoOpError);
    // Mention IA : impossible à retirer quand un plan est généré.
    const g = { ...d, clips: d.clips.map((c: any, k: number) => (k === 0 ? { ...c, generated: true } : c)), disclosure: "Vidéo générée par IA" };
    expect(() => applyVideoOp(g, { op: "disclosure", text: null })).toThrow(/obligatoire/);
    // Historique.
    const h = new VideoHistory(sampleDoc() as any);
    for (const s of [60, 64, 70]) h.apply({ op: "subtitle_style", patch: { size: s } }, "size");
    h.apply({ op: "remove", clipId: "c-s2" });
    h.undo();
    expect(h.current.clips).toHaveLength(4);
    h.undo();
    expect(h.current.subtitles.style.size).toBe(56);
    h.redo();
    expect(h.current.subtitles.style.size).toBe(70);
  });

  it("édition par conversation : simple → local et gratuit ; remplacement → bibliothèque d'abord ; nouvelle version → annoncée, jamais lancée", () => {
    const d = sampleDoc() as any;
    const intro = localVideoEdit(d, "Raccourcis l'introduction.");
    expect(intro.local).toBe(true);
    const after = applyVideoOps(d, (intro as any).ops);
    expect(after.clips[0].durationS).toBeLessThan(d.clips[0].durationS);
    expect(after.clips.slice(1).map((c: any) => c.durationS)).toEqual(d.clips.slice(1).map((c: any) => c.durationS));
    const music = localVideoEdit(d, "Change la musique.");
    expect(music.local && applyVideoOps(d, music.ops).audio.music).toMatchObject({ source: "synth", mood: "warm" });
    const subs = localVideoEdit(d, "Agrandis les sous-titres.");
    expect(subs.local && applyVideoOps(d, subs.ops).subtitles.style.size).toBe(Math.round(56 * 1.2));
    const repl = localVideoEdit(d, "Remplace le deuxième plan.");
    expect(repl).toMatchObject({ local: false, choice: { clipId: "c-s2", free: "library", paid: "shot" } });
    const dyn = localVideoEdit(d, "Fais une version plus dynamique.");
    expect(dyn.local).toBe(true);
    const dd = applyVideoOps(d, (dyn as any).ops);
    expect(timeline(dd).total).toBeLessThan(timeline(d).total);
    expect(dd.clips.slice(1).every((c: any) => c.transitionIn.kind === "cut")).toBe(true);
    expect(localVideoEdit(d, "Fais une nouvelle version avec l'IA")).toMatchObject({ local: false, paid: { kind: "regenerate" } });
    expect(localVideoEdit(d, "Supprime le troisième plan")).toMatchObject({ local: true });
    expect(targetClip(d, "le dernier plan")).toBe("c-s4");
    expect(localVideoEdit(d, "Coupe la musique")).toMatchObject({ local: true, summary: "musique retirée" });
  });

  // ------------------------------------------------------------------ sous-titres

  it("sous-titres : cartons lisibles (coupure aux mots, temps de lecture), SRT et VTT exacts, attachés au plan", () => {
    expect(splitCaption("Une texture légère qui pénètre vite sans coller", 20)).toEqual(["Une texture légère", "qui pénètre vite", "sans coller"]);
    expect(splitCaption("Regardez-le en situation :", 28)).toEqual(["Regardez-le en situation"]);
    const cues = cuesForVoice("c1", "Découvrir.", 2, 28, "q");
    expect(cues[0].toS - cues[0].fromS).toBeGreaterThanOrEqual(0.79);
    const d = sampleDoc() as any;
    const abs = absoluteCues(d);
    expect(abs[0].start).toBeGreaterThanOrEqual(3); // plan 2 commence à 3 s
    expect(toSrt(d)).toMatch(/^1\n00:00:03,\d{3} --> 00:00:0\d,\d{3}\n/);
    expect(toVtt(d)).toMatch(/^WEBVTT\n\n00:00:03\.\d{3} --> /);
    // Réordonner un plan déplace ses sous-titres avec lui.
    const moved = applyVideoOp(d, { op: "reorder", clipId: "c-s2", index: 0 });
    expect(absoluteCues(moved)[0].start).toBeLessThan(1);
  });

  // ------------------------------------------------------------------ barrière

  it("barrière vidéo : sans relecture au mieux PROVISOIRE ; panne jamais validée ; médiocre jamais FINAL ; défauts locaux bloquants", () => {
    const d = sampleDoc() as any;
    const clean = localVideoChecks(d, { targetS: timeline(d).total, scriptIssues: [], audio: { lufs: -14.2, truePeakDb: -2, durationS: 15, silent: false } });
    expect(clean.codes).toEqual([]);
    expect(gateVideo({ local: clean, review: null, attempt: 0 }).verdict).toBe("PROVISIONAL");
    expect(gateVideo({ local: clean, review: null, reviewError: "délai", attempt: 0 }).verdict).not.toBe("FINAL");
    expect(gateVideo({ local: clean, review: videoReview(8.3), attempt: 0 }).verdict).toBe("FINAL");
    expect(gateVideo({ local: clean, review: videoReview(6.4), attempt: 0 }).verdict).not.toBe("FINAL");
    // Défauts locaux.
    const tiny = applyVideoOp(d, { op: "subtitle_style", patch: { size: 20 } });
    expect(localVideoChecks(tiny, { targetS: timeline(d).total, scriptIssues: [], audio: null }).codes).toContain("illegible_text");
    expect(localVideoChecks(d, { targetS: 60, scriptIssues: [], audio: null }).codes).toContain("duration_mismatch");
    expect(localVideoChecks(d, { targetS: timeline(d).total, scriptIssues: [], audio: { lufs: null, truePeakDb: null, durationS: 15, silent: true } }).codes).toContain("audio_unusable");
    expect(localVideoChecks({ ...d, clips: d.clips.map((c: any) => ({ ...c, generated: true })) }, { targetS: timeline(d).total, scriptIssues: [], audio: null }).codes).toContain("missing_disclosure");
    const inv = localVideoChecks(d, { targetS: timeline(d).total, scriptIssues: ["proof : pourcentage non confirmé (« 97 % »)"], audio: null });
    expect(gateVideo({ local: inv, review: videoReview(9), attempt: 0 })).toMatchObject({ verdict: "REJECTED", fatal: true });
    const rep = { ...d, clips: [...d.clips, ...d.clips.map((c: any) => ({ ...c, id: `${c.id}x` }))].map((c: any, k: number) => ({ ...c, transitionIn: k ? { kind: "zoom", durationS: 0.4 } : c.transitionIn })) };
    expect(localVideoChecks(rep, { targetS: timeline(rep).total, scriptIssues: [], audio: null }).codes).toContain("repetitive_editing");
    // Plan généré : produit transformé = fatal ; personnage incohérent = reprise ; sans contrôle = jamais FINAL.
    expect(gateShot({ review: goodShot({ productAltered: true }), expectsProduct: true, expectsCharacter: false, attempt: 0 })).toMatchObject({ verdict: "REJECTED", fatal: true });
    expect(gateShot({ review: goodShot({ characterConsistent: false }), expectsProduct: false, expectsCharacter: true, attempt: 0 }).verdict).toBe("RETRY");
    expect(gateShot({ review: null, error: "panne", expectsProduct: true, expectsCharacter: false, attempt: 0 }).verdict).not.toBe("FINAL");
    expect(gateShot({ review: goodShot(), expectsProduct: true, expectsCharacter: false, attempt: 0 }).verdict).toBe("FINAL");
  });

  it("UGC : personnage stable par projet, jamais présenté comme un client ; faux témoignages repérés", async () => {
    await fr(() => {
      const i = adInsight(cosmetic);
      expect(personaSheet(cosmetic.id, i)).toEqual(personaSheet(cosmetic.id, i));
      expect(ugcScriptIssues([{ part: "hook", voice: "Je l'utilise depuis 6 mois et franchement…", onScreen: "", durationS: 3 }]).join(" ")).toMatch(/faux témoignage/);
      expect(ugcScriptIssues([{ part: "hook", voice: "Je vous montre le sérum.", onScreen: "", durationS: 3 }])).toEqual([]);
    });
  });

  it("formats : 9:16, 16:9, 1:1, 4:5 aux bonnes dimensions ; zones de sécurité par plateforme", () => {
    expect(SIZES).toEqual({ "9:16": { w: 1080, h: 1920 }, "16:9": { w: 1920, h: 1080 }, "1:1": { w: 1080, h: 1080 }, "4:5": { w: 1080, h: 1350 } });
    expect(safeZone("9:16", "tiktok").bottom).toBeGreaterThan(safeZone("16:9", "website").bottom);
  });
});
