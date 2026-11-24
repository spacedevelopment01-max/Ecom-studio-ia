/**
 * La tâche de fond de la méthode des graphistes, de bout en bout avec de faux appels (aucun appel payant) : une recherche
 * range les esquisses montrables et la planche numérotée, le choix du client est contrôlé, les logos finis sont rangés
 * avec le texte envoyé et leurs couleurs ; « d'autres pistes » continue la numérotation.
 */
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";

process.env.STUDIO_SYNA_AGENT = "1";

const dessin = (cx: number, cy: number, c: string) => [
  { input: { create: { width: 80, height: 80, channels: 3 as const, background: "#E0703A" } }, left: cx - 40, top: cy - 100 },
  ...Array.from({ length: 5 }, (_v, i) => ({ input: { create: { width: 44, height: 80, channels: 3 as const, background: c } }, left: cx - 150 + i * 62, top: cy + 10 })),
];
const planche = () => sharp({ create: { width: 1536, height: 1024, channels: 3, background: "#FFFFFF" } }).composite([0, 1].flatMap((r) => [0, 1, 2].flatMap((c) => dessin(256 + c * 512, 256 + r * 512, "#1F3D5B")))).png().toBuffer();
const logoFini = () => sharp({ create: { width: 800, height: 300, channels: 3, background: "#FFFFFF" } }).composite([{ input: { create: { width: 400, height: 120, channels: 3, background: "#0B2545" } }, left: 100, top: 90 }, { input: { create: { width: 120, height: 120, channels: 3, background: "#13A8E0" } }, left: 560, top: 90 }]).png().toBuffer();

describe("la tâche syna.logo.graphistes (faux appels)", async () => {
  const { account, project } = await import("./conversation209-fixtures");
  const { threadFor } = await import("@/lib/syna-agent/thread");
  const J = await import("@/lib/syna-agent/journey");
  const G = await import("@/lib/syna-agent/logo-graphistes");
  const T = await import("@/lib/syna-agent/logo-graphistes-tache");
  const { logoTools } = await import("@/lib/syna-agent/tools/logo");
  const { getAsset } = await import("@/lib/library");
  const { one, run } = await import("@/lib/db");
  const { JobContext } = await import("@/lib/jobs");
  const { runWithLang } = await import("@/lib/i18n-server");
  const fr = <T,>(fn: () => Promise<T> | T) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());
  afterEach(() => { G.graphistesDeps.ai = undefined; });

  const appels: string[] = [];
  const faux = (): import("@/lib/syna-agent/logo-graphistes").GraphistesAi => ({
    metier: async () => { appels.push("metier"); return { metier: "une entreprise de nettoyage de voitures, intérieur et extérieur", court: "le nettoyage automobile", piste: "savoir-faire" }; },
    planche: async (modele, prompt) => { appels.push(`planche ${modele} ${prompt.includes("Évite ces pistes") ? "évite" : "nue"}`); return { png: await planche(), recu: { endpoint: "POST /v1/images/generations", modele, texteEnvoye: prompt, reglages: {}, requestId: `req_${modele}`, usage: null, coutMicro: 1, dureeMs: 1 } }; },
    relireEsquisses: async (images) => { appels.push(`relecture ${images.length}`); return { esquisses: images.map((_b, i) => ({ numero: i + 1, entiere: true, morceauDeVoisine: false, nomLu: "Reflet", arche: false, ok: i % 3 !== 2, pourquoi: "", piste: `piste ${appels.length}-${i + 1}` })) }; },
    rediger: async () => { appels.push("rediger"); return { idee_centrale: "un éclat", texte: "Transforme cette esquisse en véritable logo contemporain pour Reflet, une entreprise de nettoyage de voitures, intérieur et extérieur. Fais évoluer l'idée vers une identité plus aboutie. style vectoriel, fond blanc uni, pas de maquette, pas d'ombre, pas d'effet 3D, pas de texture réaliste, pas de dégradé excessif" }; },
    finaliser: async (_e, t) => { appels.push("finaliser"); return { png: await logoFini(), recu: { endpoint: "POST /v1/images/edits (multipart, image[])", modele: "gpt-image-2.6-sunburst", texteEnvoye: t, reglages: {}, requestId: "req_edit", usage: null, coutMicro: 1, dureeMs: 1 } }; },
    relireLogo: async () => { appels.push("relireLogo"); return { nomLu: "Reflet", ideeConservee: true, evolution: true, arche: false, phrase: "", phraseDitLeMetier: false, note: 9, pourquoi: "" }; },
  });
  const tache = async (user: { id: string }, projectId: string, payload: Record<string, unknown>) => {
    const jid = `job-graphistes-${Date.now()}-${Math.random()}`;
    run("INSERT INTO jobs (id, user_id, project_id, type, label, payload, status, run_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)", jid, user.id, projectId, T.LOGO_GRAPHISTES_JOB, "logo", JSON.stringify({ projectId, ...payload }), "running", Date.now(), Date.now(), Date.now());
    const out = await fr(() => T.runLogoGraphistesJob(new JobContext(one<any>("SELECT * FROM jobs WHERE id = ?", jid))));
    run("UPDATE jobs SET status='done' WHERE id=?", jid);
    return out;
  };

  it("recherche, choix limité, logos finis, d'autres pistes", async () => {
    const user = await account(), projectId = project(user) as string, cid = threadFor(user, projectId);
    J.updateJourney(cid, (j) => { j.start.offer = { value: "Je nettoie les voitures à domicile, dedans et dehors.", status: "answered", source: "client", at: Date.now() } as never; });
    G.graphistesDeps.ai = () => faux();
    const r1 = await tache(user, projectId, { conversationId: cid, phase: "recherche", nom: "Reflet", capMicro: 5_000_000 }) as any;
    // 12 esquisses découpées, une sur trois refusée par le relecteur : 8 gardées, aucune reprise.
    expect(r1.esquisses).toBe(8);
    expect(appels.filter((a) => a.startsWith("planche"))).toHaveLength(2);
    const e1 = J.journeyOf(cid).graphistes!;
    expect(e1.esquisses.map((e) => e.numero)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(e1.max).toBe(4); // forfait « dominer » de la fixture
    expect(getAsset(e1.contactAssetId!)).toBeTruthy();
    // Chaque planche garde son reçu (texte envoyé, modèle, identifiant).
    const pl = getAsset(e1.planches[0].assetId!)!;
    expect(JSON.parse(String((pl as any).meta)).graphistes).toMatchObject({ requestId: expect.stringMatching(/^req_/), texteEnvoye: expect.stringContaining("Crée une planche de recherche graphique pour Reflet") });

    // Le choix : plus de N refusé, un numéro inconnu refusé ; puis 2 esquisses, déjà couvertes par l'accord.
    const ctx = { user, projectId, conversationId: cid, runId: `run-${Date.now()}`, attachment: () => null } as any;
    const choisir = logoTools.find((t) => t.name === "logo.choisir")!;
    expect((await fr(() => choisir.run(ctx, { esquisses: [1, 2, 3, 4, 5] })) as any).ok).toBe(false);
    expect((await fr(() => choisir.run(ctx, { esquisses: [9] })) as any).ok).toBe(false);
    J.updateJourney(cid, (j) => { j.graphistes!.finalisationsAccordees = G.devisDesFinalisations(2).maxMicro; });
    const c = await fr(() => choisir.run(ctx, { esquisses: [7, 2] })) as any;
    expect(c.ok).toBe(true);
    expect(c.data.message).toBe("Je choisis les esquisses 2 et 7");
    expect(c.jobs).toHaveLength(1);
    expect(J.journeyOf(cid).graphistes!.choix).toEqual([2, 7]);

    J.updateJourney(cid, (j) => { j.accordGraphistes = { count: 2, nomsMicro: 1, rechercheMicro: 1, finalisationsMicro: 1, planchesMicro: 7_000_000, at: Date.now() }; j.nomsDeLaMarque = { list: [], verifies: true, atelier: "job-des-noms", count: 2, at: Date.now() }; });
    const r2 = await tache(user, projectId, { conversationId: cid, phase: "finalisation", numeros: [7, 2], capMicro: 5_000_000 }) as any;
    expect(r2.logos).toBe(2);
    // Chaque esquisse choisie a son logo relu : les planches partent, couvertes par l'accord, le nom partagé, un logo chacune.
    const planches = JSON.parse(one<{ payload: string }>("SELECT payload FROM jobs WHERE id=?", r2.planchesJob)!.payload);
    expect(planches).toMatchObject({ count: 2, names: ["Reflet", "Reflet"], capMicro: 7_000_000, atelier: "job-des-noms" });
    expect(planches.logosGraphistes.map((l: any) => l.assetId)).toEqual(J.journeyOf(cid).graphistes!.logos!.map((l) => l.assetId));
    run("UPDATE jobs SET status='done' WHERE id=?", r2.planchesJob);
    const logos = J.journeyOf(cid).graphistes!.logos!;
    expect(logos.map((l) => l.numero)).toEqual([2, 7]);
    const meta = JSON.parse(String((getAsset(logos[0].assetId!) as any).meta)).graphistes;
    expect(meta.texteEnvoye).toMatch(/^Transforme cette esquisse/);
    expect(meta.recu.endpoint).toMatch(/image\[\]/);
    expect(logos[0].palette?.dark).toBeTruthy();

    // « D'autres pistes » : la numérotation continue, les pistes vues sont évitées, le métier n'est pas réécrit.
    const avant = appels.filter((a) => a === "metier").length;
    await tache(user, projectId, { conversationId: cid, phase: "pistes", capMicro: 5_000_000 });
    expect(appels.filter((a) => a === "metier").length).toBe(avant);
    expect(appels.filter((a) => a.endsWith("évite"))).toHaveLength(2);
    expect(J.journeyOf(cid).graphistes!.esquisses.map((e) => e.numero)).toEqual(Array.from({ length: 16 }, (_v, i) => i + 1));
    expect(J.journeyOf(cid).graphistes!.recherches).toBe(2);
  });

  it("point 0 : identity.nom n'accepte qu'un nom vérifié montré, et lance la recherche avec la part des finalisations réservée", async () => {
    const { nomTool, logoTools: outils } = await import("@/lib/syna-agent/tools/logo");
    const { TOOL_LIST } = await import("@/lib/syna-agent/tools");
    // Point 0 tranché (« Oui ») : les outils du nom et du logo sont dans le registre commun.
    for (const n of ["identity.nom", ...outils.map((o) => o.name)]) expect(TOOL_LIST.some((t) => t.name === n), n).toBe(true);
    const user = await account(), projectId = project(user) as string, cid = threadFor(user, projectId);
    const ctx = { user, projectId, conversationId: cid, runId: `run-nom-${Date.now()}`, attachment: () => null } as any;
    expect((await fr(() => nomTool.run(ctx, { nom: "Reflet" })) as any).ok).toBe(false);
    J.updateJourney(cid, (j) => { j.nomsVerifies = ["Reflet", "Lustre"]; });
    const r = await fr(() => nomTool.run(ctx, { nom: "reflet" })) as any;
    expect(r.ok).toBe(true);
    const job = one<{ payload: string }>("SELECT payload FROM jobs WHERE id=?", r.jobs[0])!;
    const p = JSON.parse(job.payload);
    expect(p).toMatchObject({ phase: "recherche", nom: "Reflet", finalisationsAccordees: G.devisDesFinalisations(4).maxMicro });
  });

  it("ancien projet (une planche par nom) : un autre logo pour Halo passe par la méthode des graphistes et se pose sur sa planche ; un logo qui manque se finit à la charge du Studio", async () => {
    const { route } = await import("./sina-routes-fixtures");
    const { getTool } = await import("@/lib/syna-agent/registry");
    const { saveAsset } = await import("@/lib/library");
    const user = await account(), projectId = project(user) as string, cid = threadFor(user, projectId);
    const ancien = (await saveAsset({ projectId, userId: user.id, data: await logoFini(), name: "planche-B-logo.png", mime: "image/png", role: "brand-board", origin: "generated", status: "ready" })).id;
    J.updateJourney(cid, (j) => {
      j.steps[0] = { status: "done" };
      j.start.offer = { value: "Des bougies parfumées coulées à la main.", status: "answered", source: "client", at: Date.now() } as never;
      j.identities = { list: [
        { ...route("A"), name: "Sillage", board: { ...route("A").board, images: { hero: { id: "hero-A", w: 1, h: 1 }, site: { id: "site-A", w: 1, h: 1 } } } },
        { ...route("B"), name: "Halo", board: { ...route("B").board, images: { logo: { id: ancien, w: 800, h: 300 }, hero: { id: "hero-B", w: 1, h: 1 }, site: { id: "site-B", w: 1, h: 1 } } } },
      ] as never, issues: [], comparison: "", at: 1, round: 1 };
    });
    const ctx = { user, projectId, conversationId: cid, runId: `run-ancien-${Date.now()}`, attachment: () => null } as any;
    const pistes = getTool("logo.pistes")!, autre = getTool("logo.autre")!;
    // Les planches sont faites : sans planche dite, SINA est renvoyée à la dire (rien n'est lancé).
    expect(await fr(() => pistes.run(ctx, {} as never))).toMatchObject({ ok: false, internal: true });
    // Halo a son logo : un autre logo est un goût du client, sur son budget ; Sillage n'a pas le sien : à la charge du Studio.
    expect((await fr(() => pistes.estimate!(ctx, { planche: "B" } as never))).studio).toBeFalsy();
    expect(await fr(() => pistes.estimate!(ctx, { planche: "A" } as never))).toMatchObject({ studio: true });
    const lance = await fr(() => pistes.run(ctx, { planche: "B" } as never)) as any;
    expect(lance.ok).toBe(true);
    const payload = JSON.parse(one<any>("SELECT payload FROM jobs WHERE id=?", lance.jobs[0]).payload);
    expect(payload).toMatchObject({ phase: "recherche", nom: "Halo", planche: "B" });
    expect(payload.studio).toBeUndefined();
    run("UPDATE jobs SET status='done' WHERE id=?", lance.jobs[0]);
    // La recherche, pour le nom de la planche : ses esquisses, une seule à choisir.
    G.graphistesDeps.ai = () => ({ ...faux(), relireEsquisses: async (images: Buffer[], nom: string) => ({ esquisses: images.map((_b: Buffer, i: number) => ({ numero: i + 1, entiere: true, morceauDeVoisine: false, nomLu: nom, arche: false, ok: true, pourquoi: "", piste: `piste ${i + 1}` })) }), rediger: async () => ({ idee_centrale: "un éclat", texte: "Transforme cette esquisse en véritable logo contemporain pour Halo, une entreprise de nettoyage de voitures, intérieur et extérieur. Fais évoluer l'idée vers une identité plus aboutie. style vectoriel, fond blanc uni, pas de maquette, pas d'ombre, pas d'effet 3D, pas de texture réaliste, pas de dégradé excessif" }), relireLogo: async () => ({ nomLu: "Halo", ideeConservee: true, evolution: true, arche: false, phrase: "", phraseDitLeMetier: false, note: 9, pourquoi: "" }) }) as never;
    await tache(user, projectId, { conversationId: cid, ...payload });
    const etat = J.journeyOf(cid).graphistes!;
    expect(etat).toMatchObject({ nom: "Halo", planche: "B", max: 1 });
    expect(etat.esquisses.length).toBeGreaterThan(0);
    // Le client choisit son esquisse : SINA la finit avec logo.autre (logo.choisir est pour les identités d'une nouvelle marque).
    expect(await fr(() => getTool("logo.choisir")!.run(ctx, { esquisses: [1] } as never))).toMatchObject({ ok: false, internal: true });
    const fin = await fr(() => autre.run(ctx, { esquisse: 1 } as never)) as any;
    expect(fin.ok).toBe(true);
    const p2 = JSON.parse(one<any>("SELECT payload FROM jobs WHERE id=?", fin.jobs[0]).payload);
    expect(p2).toMatchObject({ phase: "finalisation", numeros: [1], planche: "B" });
    run("UPDATE jobs SET status='done' WHERE id=?", fin.jobs[0]);
    await tache(user, projectId, { conversationId: cid, ...p2 });
    // Le logo fini est posé sur Halo, tel quel, avec sa version sans fond et sa version claire ; aucune nouvelle identité.
    const apres = J.journeyOf(cid);
    const b = apres.identities!.list[1].board!.images!;
    expect(b.logo!.id).not.toBe(ancien);
    expect(b.logo!.id).toBe(apres.graphistes!.logos!.find((l) => l.numero === 1)!.assetId);
    expect(b.mark!.id).toBe(apres.graphistes!.logos!.find((l) => l.numero === 1)!.detoureAssetId);
    expect(b.markDark).toBeTruthy();
    expect(b.hero!.id).toBe("hero-B");
    expect(apres.identities!.list).toHaveLength(2);
    // Le haut du site montre encore l'ancien logo : il sera refait avec le nouveau.
    expect(apres.identities!.siteAncienLogo).toEqual(["B"]);
  });

});
