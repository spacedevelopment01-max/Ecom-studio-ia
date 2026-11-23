/**
 * Les outils du suivi dans la conversation de SINA (allumés le 22 novembre 2026, décision du chef d'orchestre au nom des
 * engagements acceptés le 15 novembre), sans aucun appel payant ni réseau :
 *  - google.fiche : le guide geste par geste et le paquet du mois, repris des publications acceptées du calendrier ;
 *  - google.avis : la réponse propre à un avis, relue par le code, avec sa carte de dépense ;
 *  - droit.informer : la formule mot pour mot, seulement des pages officielles ouvertes et datées, le professionnel ;
 *  - chacun se ferme par « 0 » dans son réglage ; aucun ne change les deux listes d'outils de l'étape du site.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

process.env.STUDIO_SYNA_AGENT = "1";

describe("suivi : les outils de SINA (fiche Google, bras droit)", async () => {
  const { one } = await import("@/lib/db");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { setSetting } = await import("@/lib/settings");
  const { createUser } = await import("@/lib/auth");
  const { loadProject } = await import("@/lib/projects");
  const { createManualPost } = await import("@/lib/social-v2/manual");
  const { seedImageFixture, seedCutout } = await import("./image-v2-fixtures");
  const { grantProjectPlan } = await import("./communication-choice-fixture");
  const { threadFor } = await import("@/lib/syna-agent/thread");
  const { getTool } = await import("@/lib/syna-agent/registry");
  const { toolInFocus } = await import("@/lib/syna-agent/conversation");
  const { SYNA_SYSTEM } = await import("@/lib/syna-agent/prompt");
  const G = await import("@/lib/suivi/fiche-google");
  const B = await import("@/lib/suivi/bras-droit");
  const T = await import("@/lib/syna-agent/tools/suivi");
  const fr = <T,>(fn: () => Promise<T> | T) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());

  beforeEach(() => vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Aucun appel réseau permis"); })));
  afterEach(() => { vi.unstubAllGlobals(); setSetting("suivi.ficheGoogle", null); setSetting("suivi.brasDroit", null); delete G.ficheGoogleDeps.ecrire; delete B.brasDroitDeps.fetch; });

  async function setup() {
    const u = await createUser(`suivi-outils-${Date.now()}-${Math.random()}@test.fr`, "motdepasse-test", "S");
    const pid = seedImageFixture(u.id, "cosmetic");
    grantProjectPlan(pid, "dominer");
    const user = one<any>("SELECT * FROM users WHERE id=?", u.id);
    const cid = threadFor(user, pid);
    return { u, pid, ctx: { user: u, projectId: pid, conversationId: cid, runId: "test", attachment: () => null } as any };
  }
  const call = (name: string, ctx: any, a: unknown) => fr(async () => { const t = getTool(name)!; return (await t.run(ctx, t.args.parse(a))) as any; });

  it("les trois outils sont déclarés, avec une notice courte ; la réponse à un avis est payante (carte d'accord), le reste gratuit", () => {
    for (const n of ["google.fiche", "google.avis", "droit.informer"]) {
      const t = getTool(n)!;
      expect(t, n).toBeTruthy();
      expect(t.description.length, n).toBeLessThan(600);
    }
    expect(getTool("google.avis")!.estimate).toBeTypeOf("function");
    expect(getTool("google.fiche")!.estimate).toBeUndefined();
    expect(getTool("droit.informer")!.estimate).toBeUndefined();
    // SINA sait quand s'en servir : une ligne dans ses consignes stables.
    expect(SYNA_SYSTEM).toMatch(/Dans la durée : [^\n]*droit\.informer[^\n]*google\.fiche[^\n]*google\.avis/);
    // Les deux listes d'outils de l'étape du site restent ce qu'elles étaient.
    for (const site of [false, true]) for (const n of ["google.fiche", "google.avis", "droit.informer"]) expect(toolInFocus(n, 6, { site })).toBe(false);
  });

  it("google.fiche : le guide avec la page de Google de chaque geste, le paquet du mois repris de ses publications acceptées", async () => {
    const s = await setup();
    const p = loadProject(s.pid);
    const C = await import("@/lib/syna-agent/calendar");
    createManualPost(p, s.u.id, { network: "instagram", format: "image", title: "Soin", caption: "Le sérum se pose le soir, appelez le 06 12 34 56 78. #serum #soin", hashtags: "", media: [await seedCutout(s.u.id, s.pid)] }, { brief: { serie: 1 } });
    const mois = new Date(Date.now() + 86_400_000).toISOString().slice(0, 7);
    await fr(() => C.planCalendar(p, { days: 7, perDay: 1, networks: ["instagram"] }));
    const r = await call("google.fiche", s.ctx, { mois });
    expect(r.ok).toBe(true);
    expect(r.data.gestes.map((g: any) => g.cle)).toEqual(["avis", "publier", "programmer", "alertes", "lien-avis"]);
    for (const g of r.data.gestes) expect(g.source).toMatch(/^https:\/\/support\.google\.com\/business\//);
    expect(r.data.paquet.length).toBe(1);
    for (const x of r.data.paquet) { expect(x.texte).not.toMatch(/#|06 12/); expect(x.texte).toMatch(/Le sérum se pose le soir/); }
    // Un mois sans publication acceptée : rien d'inventé.
    const vide = await call("google.fiche", s.ctx, { mois: "2020-01" });
    expect(vide.data.paquet).toEqual([]);
    expect(vide.hint).toMatch(/n'en invente aucune/);
    setSetting("suivi.ficheGoogle", "0");
    expect((await call("google.fiche", s.ctx, {})).ok).toBe(false);
  });

  it("google.avis : la réponse relue par le code (prénom, détail, signature) ; une réponse fautive deux fois est refusée", async () => {
    const s = await setup();
    const avis = { auteur: "Julie Martin", texte: "Le sérum à la rose est parfait, livré très vite.", note: 5, signature: "Marc, Atelier Rose" };
    let n = 0;
    G.ficheGoogleDeps.ecrire = async () => (n++, { reponse: "Merci Julie, ravi que le sérum à la rose vous plaise autant. Marc, Atelier Rose" });
    const r = await call("google.avis", s.ctx, avis);
    expect(r.ok).toBe(true);
    expect(r.data.reponse).toMatch(/^Merci Julie/);
    expect(n).toBe(1);
    G.ficheGoogleDeps.ecrire = async () => ({ reponse: "Merci pour votre confiance, profitez de -10 % sur votre prochaine commande !" });
    const non = await call("google.avis", s.ctx, { ...avis, texte: "Très belle crème hydratante, je recommande." });
    expect(non.ok).toBe(false);
    expect(non.summary).toMatch(/^Réponse refusée par la relecture/);
    expect((await fr(() => getTool("google.avis")!.estimate!(s.ctx, avis))).maxMicro).toBeGreaterThan(0);
  });

  it("droit.informer : la formule mot pour mot, seulement des pages officielles ouvertes et datées, le professionnel et ses questions", async () => {
    const s = await setup();
    expect(T.FORMULE_BRAS_DROIT.fr).toBe("Je t'informe à partir des pages officielles (datées). Pour une décision qui t'engage, voici le professionnel à consulter et les questions à lui poser.");
    const page = "<html><head><title>Droit de rétractation</title></head><body><nav>Menu Accueil</nav><p>Vérifié le 12 mars 2026 - Direction de l'information légale et administrative.</p><p>Le consommateur dispose d'un délai de 14 jours pour exercer son droit de rétractation d'un contrat conclu à distance.</p><p>Autre sujet sans rapport avec la question posée ici aujourd'hui.</p></body></html>";
    const ouvertes: string[] = [];
    B.brasDroitDeps.fetch = (async (u: string) => (ouvertes.push(u), new Response(page, { status: 200 }))) as any;
    const url = "https://www.service-public.gouv.fr/particuliers/vosdroits/F10485";
    const r = await call("droit.informer", s.ctx, { question: "Quel délai de rétractation pour un contrat conclu à distance ? Mon client veut un litige", pages: [url] });
    expect(r.ok).toBe(true);
    expect(r.summary).toBe(T.FORMULE_BRAS_DROIT.fr);
    expect(r.data.pages[0]).toMatchObject({ url, date: "Vérifié le 12 mars 2026" });
    expect(r.data.pages[0].passages).toMatch(/délai de 14 jours pour exercer son droit de rétractation/);
    expect(r.data.professionnel.qui).toMatch(/avocat/);
    expect(r.data.professionnel.questions.length).toBe(3);
    expect(r.hint).toContain(`« ${T.FORMULE_BRAS_DROIT.fr} »`);
    // Une page hors de la liste n'est jamais ouverte.
    const hors = await call("droit.informer", s.ctx, { question: "TVA ?", pages: ["https://blog-juridique.example.com/tva"] });
    expect(hors).toMatchObject({ ok: false, internal: true });
    expect(ouvertes).toEqual([url]);
    // Le brouillon est relu : une phrase citée qui n'est pas sur la page est refusée.
    const relu = await call("droit.informer", s.ctx, { question: "rétractation contrat à distance", pages: [url], brouillon: `${T.FORMULE_BRAS_DROIT.fr} La page dit « le délai est de 30 jours pour tout achat ».` });
    expect(relu).toMatchObject({ ok: false, internal: true });
    expect(relu.summary).toMatch(/phrase citée introuvable/);
    // Une page sans date : « non disponible », jamais une date inventée.
    B.brasDroitDeps.fetch = (async () => new Response("<title>TVA</title><p>Le taux normal de la taxe sur la valeur ajoutée est fixé par la loi pour chaque opération.</p>", { status: 200 })) as any;
    const sansDate = await call("droit.informer", s.ctx, { question: "taux de la taxe sur la valeur ajoutée", pages: ["https://www.impots.gouv.fr/tva"] });
    expect(sansDate.data.pages[0].date).toBe("non disponible : la page n'affiche pas de date");
    setSetting("suivi.brasDroit", "0");
    expect((await call("droit.informer", s.ctx, { question: "TVA ?", pages: [url] })).ok).toBe(false);
  });
});
