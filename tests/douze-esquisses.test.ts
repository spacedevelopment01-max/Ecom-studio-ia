/**
 * Les esquisses de logo après l'essai réel d'Écume (25 novembre 2026), sans aucun appel payant :
 *  1. la découpe compare l'encre à la vraie couleur du fond, mesurée : la grande forme beige pâle de la case 6 de la
 *     planche 2.5 n'est plus tranchée (planches réelles d'Écume, copiées sans perte dans tests/fixtures/ecume) ;
 *  2. le critère « arche » est retiré pour les logos (un médaillon ou un badge rond est permis) ; il reste pour les photos ;
 *  3. les 12 esquisses toujours correctes (le propriétaire : « La création de la planche de logo, et jamais au grand jamais
 *     on propose une planche de logo sans les 12 logos fait correctement ») : remplacement par le même modèle, à la charge
 *     du Studio, dans une borne ; borne atteinte : erreur visible au Studio, rien de montré au client.
 */
import fs from "node:fs";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";

process.env.STUDIO_SYNA_AGENT = "1";

const E = await import("@/lib/syna-agent/esquisses");
const F = await import("@/lib/syna-agent/logo-finalisation");
const { MODELES_DE_RECHERCHE } = await import("@/lib/syna-agent/logo-recherche");

describe("1. la découpe : le fond mesuré, aucune forme visible coupée, une marge de sécurité", () => {
  const brut = async (png: Buffer) => sharp(png).flatten({ background: "#FFFFFF" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const planche25 = fs.readFileSync("tests/fixtures/ecume/planche-gpt-image-2.5-sunburst.webp");
  const planche26 = fs.readFileSync("tests/fixtures/ecume/planche-gpt-image-2.6-flare.webp");
  it("le fond est mesuré sur le pourtour de la planche (médiane), pas supposé", async () => {
    const { data, info } = await brut(planche25);
    expect(E.fondMesure(data, info.width, info.height)).toEqual([254, 254, 254]);
    const gris = await sharp({ create: { width: 300, height: 200, channels: 3, background: "#EDEAE4" } }).raw().toBuffer();
    expect(E.fondMesure(gris, 300, 200)).toEqual([237, 234, 228]);
  });
  it("les 12 cases réelles d'Écume sont découpées entières ; la case 6 de la planche 2.5 garde toute sa forme beige", async () => {
    const a = await E.decouperLaPlanche(planche25), b = await E.decouperLaPlanche(planche26);
    if (!a.ok || !b.ok) throw new Error("planche refusée");
    expect([...a.cases, ...b.cases].map((c) => c.refus ?? "ok")).toEqual(Array(12).fill("ok"));
    // La case 6 : le haut de la forme beige (240, 235, 230) est dans l'esquisse, sous une bande de fond : rien n'est tranché.
    const { data, info } = await brut(a.cases[5].png!);
    const beige = (y: number) => { let n = 0; for (let x = 0; x < info.width; x++) { const i = (y * info.width + x) * 3; if (Math.abs(data[i] - 240) < 8 && Math.abs(data[i + 1] - 235) < 8 && Math.abs(data[i + 2] - 230) < 8) n++; } return n; };
    const lignes = Array.from({ length: info.height }, (_v, y) => beige(y));
    const premiere = lignes.findIndex((n) => n > 3);
    expect(premiere).toBeGreaterThan(20); // une marge de fond au-dessus : la forme commence dans l'image, pas au bord
    expect(lignes.slice(0, 15).every((n) => n === 0)).toBe(true);
    // La forme est grande (plus d'un quart de la largeur, à son plus large) : c'est bien elle, entière.
    expect(Math.max(...lignes)).toBeGreaterThan(info.width / 4);
    // Les 11 autres cases restent dans leur boîte, avec leur marge : aucune n'a d'encre sur ses 8 premiers pixels de bord.
    for (const c of [...a.cases, ...b.cases]) {
      const r = await brut(c.png!), fond = E.fondMesure(r.data, r.info.width, r.info.height);
      let bord = 0;
      for (let y = 0; y < r.info.height; y++) for (let x = 0; x < r.info.width; x++) {
        if (x >= 8 && y >= 8 && x < r.info.width - 8 && y < r.info.height - 8) continue;
        const i = (y * r.info.width + x) * 3;
        if (Math.max(Math.abs(r.data[i] - fond[0]), Math.abs(r.data[i + 1] - fond[1]), Math.abs(r.data[i + 2] - fond[2])) > E.ECART_AU_FOND) bord++;
      }
      expect(bord, `case ${c.index + 1}`).toBe(0);
    }
  });
});

describe("2. le critère « arche » retiré pour les logos (un médaillon ou un badge rond est permis)", () => {
  it("la demande des relecteurs de logos ne contient plus le critère", () => {
    expect(E.RELECTEUR_DES_ESQUISSES).not.toMatch(/arche|demi-lune|arrondi en arc/i);
    expect(F.RELECTEUR_DU_LOGO_FINI).not.toMatch(/arche|demi-lune|arrondi en arc/i);
    expect(F.demandeAuRelecteurDuLogo({ nom: "Écume", metier: "une savonnerie", texte: "x" })).not.toMatch(/arche/i);
    const lu = E.RelectureEsquissesSchema.parse({ esquisses: [{ numero: 1, arche: true }] });
    expect(lu.esquisses[0]).not.toHaveProperty("arche");
    expect(F.RelectureDuLogoSchema.parse({ arche: true })).not.toHaveProperty("arche");
  });
  it("un verdict qui dit « arche » ne fait plus écarter une esquisse ni refuser un logo fini", () => {
    const v = E.RelectureEsquissesSchema.parse({ esquisses: [{ numero: 1, entiere: true, morceauDeVoisine: false, nomLu: "Écume", arche: true, ok: true, pourquoi: "un médaillon rond", piste: "un badge rond" }] });
    const a = E.appliquerLaRelecture("Écume", [{ modele: "m", index: 0, png: Buffer.from("x"), requestId: null }], v, 1);
    expect(a.gardees).toHaveLength(1);
    expect(a.refusees).toEqual([]);
    const logo = F.RelectureDuLogoSchema.parse({ nomLu: "Écume", ideeConservee: true, arche: true, phrase: "", phraseDitLeMetier: false, note: 9, pourquoi: "" });
    expect(F.raisonsDuRefus(logo, "Écume")).toEqual([]);
  });
  it("la règle sans arche reste pour les photos du site", () => {
    const src = fs.readFileSync("src/lib/syna-agent/custom-theme/tenue.ts", "utf8");
    expect(src).toMatch(/sansArche/);
  });
});

describe("3. les 12 esquisses toujours correctes", async () => {
  const dessin = (cx: number, cy: number) => [
    { input: { create: { width: 80, height: 80, channels: 3 as const, background: "#E0703A" } }, left: cx - 40, top: cy - 100 },
    ...Array.from({ length: 5 }, (_v, i) => ({ input: { create: { width: 44, height: 80, channels: 3 as const, background: "#1F3D5B" } }, left: cx - 150 + i * 62, top: cy + 10 })),
  ];
  const planche = () => sharp({ create: { width: 1536, height: 1024, channels: 3, background: "#FFFFFF" } }).composite([0, 1].flatMap((r) => [0, 1, 2].flatMap((c) => dessin(256 + c * 512, 256 + r * 512)))).png().toBuffer();
  const metier = { metier: "une savonnerie artisanale qui vend en ligne des savons solides", court: "la savonnerie artisanale", piste: "savoir-faire" as const };
  /** Un faux parcours : `ecarter(tour, modele, case)` dit ce que le relecteur écarte ; on note qui paie chaque appel. */
  const faux = (ecarter: (tour: number, modele: string, index: number) => boolean) => {
    const appels: { quoi: string; modele?: string; tour: number; studio: boolean }[] = [];
    let studio = false;
    const modelesDuTour = new Map<number, string[]>();
    const d: import("@/lib/syna-agent/esquisses").RechercheDeps = {
      planche: async (modele, _p, tour) => { appels.push({ quoi: "planche", modele, tour, studio }); modelesDuTour.set(tour, [...(modelesDuTour.get(tour) ?? []), modele]); return { png: await planche(), requestId: null, usage: null, coutMicro: 1 }; },
      relire: async (images, nom, tour) => {
        appels.push({ quoi: "relecture", tour, studio });
        const ms = [...(modelesDuTour.get(tour) ?? [])].sort((x, y) => (MODELES_DE_RECHERCHE as readonly string[]).indexOf(x) - (MODELES_DE_RECHERCHE as readonly string[]).indexOf(y));
        return { esquisses: images.map((_b, i) => ({ numero: i + 1, entiere: true, morceauDeVoisine: false, nomLu: ecarter(tour, ms[Math.floor(i / 6)], i % 6) ? "Ecum" : nom, ok: true, pourquoi: "", piste: `piste ${tour}-${i + 1}` })) };
      },
      aLaChargeDuStudio: async (fn) => { studio = true; try { return await fn(); } finally { studio = false; } },
    };
    return { d, appels };
  };
  it("une écartée de la planche 2.6 : remplacée par une planche du même modèle seulement, relue, payée par le Studio ; 12 gardées, 6 et 6", async () => {
    const t = faux((tour, modele, i) => tour === 1 && modele === "gpt-image-2.6-flare" && i === 3);
    const r = await E.rechercheDesEsquisses(t.d, { nom: "Écume", metier });
    expect(r.complete).toBe(true);
    expect(r.esquisses).toHaveLength(12);
    expect(r.correctesDesLesPlanches).toBe(11);
    expect(r.remplacees).toEqual([{ modele: "gpt-image-2.6-flare", index: 3, raison: "nom mal écrit : « Ecum »", tour: 1 }]);
    // Le remplacement : le même modèle, une seule planche, et sa relecture, tous deux à la charge du Studio.
    expect(t.appels.filter((a) => a.tour === 2)).toEqual([{ quoi: "planche", modele: "gpt-image-2.6-flare", tour: 2, studio: true }, { quoi: "relecture", tour: 2, studio: true }]);
    expect(t.appels.filter((a) => a.tour === 1).every((a) => !a.studio)).toBe(true);
    expect(r.esquisses.filter((e) => e.modele === "gpt-image-2.5-sunburst")).toHaveLength(6);
    expect(r.esquisses.filter((e) => e.modele === "gpt-image-2.6-flare")).toHaveLength(6);
    // La remplaçante est la première correcte de la nouvelle planche ; les autres ne sont pas montrées.
    expect(r.esquisses.at(-1)).toMatchObject({ modele: "gpt-image-2.6-flare", tour: 2, index: 0 });
    expect(r.refusees.filter((x) => x.enPlus)).toHaveLength(5);
    expect(r.esquisses.map((e) => e.numero)).toEqual(Array.from({ length: 12 }, (_v, i) => i + 1));
  });
  it("la borne : au plus trois tours ; atteinte, la recherche est incomplète et rien n'est montré", async () => {
    const t = faux((_tour, modele) => modele === "gpt-image-2.5-sunburst");
    const r = await E.rechercheDesEsquisses(t.d, { nom: "Écume", metier });
    expect(r.complete).toBe(false);
    expect(r.tours).toBe(E.REMPLACEMENTS_MAX);
    expect(t.appels.filter((a) => a.quoi === "planche")).toHaveLength(2 + E.REMPLACEMENTS_MAX);
    expect(t.appels.filter((a) => a.studio)).toHaveLength(2 * E.REMPLACEMENTS_MAX);
    expect(r.esquisses).toEqual([]);
    expect(r.contact).toBeNull();
  });

  describe("la tâche du parcours : jamais moins de 12 montrées, une erreur visible au Studio", async () => {
    const { account, project } = await import("./conversation209-fixtures");
    const { threadFor } = await import("@/lib/syna-agent/thread");
    const J = await import("@/lib/syna-agent/journey");
    const G = await import("@/lib/syna-agent/logo-graphistes");
    const T = await import("@/lib/syna-agent/logo-graphistes-tache");
    const { one, run } = await import("@/lib/db");
    const { JobContext, PermanentError, UserFacingError } = await import("@/lib/jobs");
    const { runWithLang } = await import("@/lib/i18n-server");
    afterEach(() => { G.graphistesDeps.ai = undefined; });
    it("borne atteinte : la tâche s'arrête en erreur du Studio (pas un message au client), aucune esquisse n'est enregistrée", async () => {
      const user = await account(), projectId = project(user) as string, cid = threadFor(user, projectId);
      J.updateJourney(cid, (j) => { j.start.offer = { value: "Je fais des savons.", status: "answered", source: "client", at: Date.now() } as never; });
      let planches = 0, relectures = 0;
      G.graphistesDeps.ai = () => ({
        metier: async () => metier,
        planche: async (modele, prompt) => { planches++; return { png: await planche(), recu: { endpoint: "POST /v1/images/generations", modele, texteEnvoye: prompt, reglages: {}, requestId: null, usage: null, coutMicro: 1, dureeMs: 1 } }; },
        // La planche 2.6 est toujours écartée : ses six cases au premier tour, puis chaque planche de remplacement.
        relireEsquisses: async (images, nom) => { relectures++; return { esquisses: images.map((_b, i) => ({ numero: i + 1, entiere: true, morceauDeVoisine: false, nomLu: relectures === 1 && i < 6 ? nom : "Ecum", ok: true, pourquoi: "", piste: `p${i}` })) }; },
        rediger: async () => { throw new Error("interdit"); }, finaliser: async () => { throw new Error("interdit"); }, relireLogo: async () => { throw new Error("interdit"); },
      });
      const jid = `job-douze-${Date.now()}`;
      run("INSERT INTO jobs (id, user_id, project_id, type, label, payload, status, run_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)", jid, user.id, projectId, T.LOGO_GRAPHISTES_JOB, "logo", JSON.stringify({ projectId, conversationId: cid, phase: "recherche", nom: "Écume", capMicro: 5_000_000 }), "running", Date.now(), Date.now(), Date.now());
      let erreur: unknown = null;
      try { await runWithLang({ ui: "fr", content: "fr" }, async () => T.runLogoGraphistesJob(new JobContext(one<any>("SELECT * FROM jobs WHERE id = ?", jid)))); } catch (e) { erreur = e; }
      expect(erreur).toBeInstanceOf(PermanentError);
      expect(erreur).not.toBeInstanceOf(UserFacingError);
      expect(String((erreur as Error).message)).toMatch(/Recherche du logo incomplète : 6 esquisse\(s\) correcte\(s\) sur 12 au premier tour, 3 tour\(s\) de remplacement \(borne : 3\) ; rien n'est montré au client/);
      expect(planches).toBe(2 + E.REMPLACEMENTS_MAX);
      expect(J.journeyOf(cid).graphistes?.esquisses ?? []).toEqual([]);
    });
  });
});
