/**
 * Le site créé par SINA : les défauts du DEUXIÈME essai réel (17 novembre 2026), corrigés à la source, en règles
 * générales. Sans IA, sans réseau : chaque appel est simulé.
 *
 *  1. Les preuves : le site ne se lance pas tant que le dossier n'a aucune preuve ET que le client n'a répondu à aucune
 *     question sur ses preuves ; « je n'en ai pas » se note, puis le site se crée sans preuve.
 *  2. Les faits connus : un « [À compléter] » qui nomme sans ambiguïté un fait que le Studio connaît reçoit le vrai
 *     fait ; un manque qui nomme un tiers ou un autre identifiant n'est jamais rapproché d'un fait du client.
 *  3. Les personnes : une personne se dit aussi par son rôle ou son activité ; un objet n'est pas une personne ; une
 *     photo dont la relecture a refusé la description pour une personne ne part jamais telle quelle.
 *  4. Le second regard a toujours sa place : sa part se calcule sur le vrai tarif, quoi que la tâche ait déjà dépensé.
 *  5. Les répétitions : la répartition des faits dans le plan, et le contrôle sans IA après l'écriture.
 */
import { describe, expect, it } from "vitest";

describe("SINA — le site, deuxième essai réel", async () => {
  process.env.STUDIO_SYNA_AGENT = "1";
  const { one } = await import("@/lib/db");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { account } = await import("./conversation209-fixtures");
  const { threadFor } = await import("@/lib/syna-agent/thread");
  const { getTool } = await import("@/lib/syna-agent/registry");
  const { loadProject, saveServices } = await import("@/lib/projects");
  const J = await import("@/lib/syna-agent/journey");
  const B = await import("@/lib/syna-agent/custom-theme/brand");
  const G = await import("@/lib/syna-agent/custom-theme/gallery");
  const S = await import("@/lib/syna-agent/custom-theme/theme");
  const T = await import("@/lib/syna-agent/custom-theme/tools");
  const X = await import("@/lib/syna-agent/custom-theme/site-job");
  const PR = await import("@/lib/syna-agent/custom-theme/preuves");
  const SF = await import("@/lib/syna-agent/custom-theme/site-facts");
  const SR = await import("@/lib/syna-agent/custom-theme/second-regard");
  const Og = await import("@/lib/syna-agent/custom-theme/originality");
  const K = await import("@/lib/syna-agent/custom-theme/knowledge");
  const { tenueSection } = await import("@/lib/syna-agent/custom-theme/tenue");
  const { withTenueSite } = await import("@/lib/syna-agent/custom-theme/tenue-data");
  const sharp = (await import("sharp")).default;
  const fr = <R,>(fn: () => Promise<R> | R) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());
  const call = async (name: string, ctx: any, args: unknown): Promise<any> => {
    ctx.projectId = one<{ project_id: string | null }>("SELECT project_id FROM agent_conversations WHERE id=?", ctx.conversationId)?.project_id ?? null;
    return fr(() => getTool(name)!.run(ctx, getTool(name)!.args.parse(args)));
  };
  const png = () => sharp({ create: { width: 20, height: 20, channels: 3, background: "#888" } }).png().toBuffer();
  const OK = { productMatches: true, productWhole: true, texts: [], extraText: [], people: false, notes: [] };
  const CALM = "Photographie d'ambiance en plan serré, format vertical. Un outil posé sur un établi en bois clair, à côté de la pièce en cours. La scène contient exactement 2 objets. Lumière douce du matin.";

  /** Un projet prêt pour son site (marque, angle et activité validés), avec le site donné. */
  async function client(sections: { uid: string; id: string }[] = [{ uid: "s0000000a", id: "tn-ouverture" }, { uid: "s0000000b", id: "tn-bande" }]) {
    const user = await account();
    const cid = threadFor(user, null), ctx: any = { user, conversationId: cid, runId: `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, projectId: null, attachment: () => null };
    await call("start.answer", ctx, { answers: [{ field: "business", value: "products" }, { field: "offer", value: "Des objets faits à la main." }] });
    await call("start.answer", ctx, { answers: [
      { field: "existing", value: "Rien." }, { field: "audience", value: "Adultes." }, { field: "image", value: "Doux." }, { field: "setup", value: "1 objet" }, { field: "market", value: "France." },
      { field: "price", value: "25 €" }, { field: "difference", value: "Fait main." }, { field: "taste", status: "none" }, { field: "photos", value: "Non." }, { field: "language", value: "Français seulement" }, { field: "contact", status: "later" }, { field: "platform", value: "shopify" },
    ] });
    await call("start.confirm", ctx, {});
    const pid = one<any>("SELECT project_id FROM agent_conversations WHERE id=?", cid).project_id as string;
    ctx.projectId = pid;
    S.saveCustomTheme(pid, { version: 1, family: "classique", style: "x", header: null, footer: null, search: null, pages: [{ key: "home", label: "Accueil", sections }] } as any);
    return { user, pid, cid, ctx };
  }
  const job = (id: string, payload: object) =>
    fr(() => B.runCustomBrandJob({ job: { id }, payload, checkpoint: {}, progress: () => undefined, step: async (_k: string, fn: () => Promise<unknown>) => fn() } as any)) as Promise<any>;
  const clean = () => { for (const k of ["plan", "write", "review", "photo", "photoReview", "photoBrief", "look", "photoUnit", "seo"] as const) delete B.customBrandDeps[k]; delete G.galleryDeps.check; delete T.customPhotoDeps.unit; };
  const PLAN = { promesse: "Fait pour durer.", voix: "Simple.", menu: [], sections: [] };
  const htmlOf = (pid: string, uid: string) => S.sectionHtml(S.allSections(S.loadCustomTheme(pid)!).find((x) => x.s.uid === uid)!.s);

  // ------------------------------------------------------------------ 1. les preuves, avant de créer

  describe("1. la question des preuves, avant de créer le site (garde-fou sans IA)", () => {
    it("une réponse du client se reconnaît à ses notes : une preuve, « aucun », ou une note générale ; un fait n'est pas une preuve", () => {
      expect(PR.preuvesDemandees([])).toBe(false);
      expect(PR.preuvesDemandees([{ title: "horaires", value: "du lundi au vendredi" }, { title: "délais", value: "rappel sous 24 h" }])).toBe(false);
      expect(PR.preuvesDemandees([{ title: "avis", value: "12 avis sur sa fiche, note moyenne 4,8" }])).toBe(true);
      expect(PR.preuvesDemandees([{ title: "avis", value: "aucun pour l'instant" }])).toBe(true);
      expect(PR.preuvesDemandees([{ title: "preuves", value: "aucune pour l'instant" }])).toBe(true);
      expect(PR.preuvesDemandees([{ title: "ce qu'il a dit", value: "Aucune preuve à montrer pour le moment" }])).toBe(true);
      expect(PR.refusSansPreuves({ preuves: 0, repondu: false })).toMatch(/Demande-lui d'abord ses vraies preuves[^]*les avis déjà reçus[^]*depuis quand il exerce[^]*memory\.note[^]*« preuves »[^]*relance site\.create/);
      expect(PR.refusSansPreuves({ preuves: 1, repondu: false })).toBeNull();
      expect(PR.refusSansPreuves({ preuves: 0, repondu: true })).toBeNull();
      // La consigne de l'étape dit la même règle, sans exemple de métier.
      expect(J.STEP_GUIDES[6]).toContain(PR.QUESTION_DES_PREUVES);
      expect(PR.QUESTION_DES_PREUVES).toMatch(/site\.create refuse de se lancer/);
    });

    it("sans preuve et sans réponse : refus AVANT la carte de dépense (au devis) et au lancement, y compris pour tout refaire ; rien n'est lancé", async () => {
      const { ctx, cid, pid } = await client();
      J.updateJourney(cid, (x) => { for (const n of [1, 2, 3, 4, 5]) J.setStep(x, n, "done"); });
      T.customPhotoDeps.unit = () => 150_000;
      try {
        const tool = getTool("site.create")!;
        // Le devis (appelé avant la carte d'accord) refuse : aucune carte n'est montrée.
        let thrown: any = null;
        try { await fr(() => tool.estimate!(ctx, {})); } catch (e) { thrown = e; }
        expect(thrown).toBeInstanceOf(X.RefusInterne);
        expect(thrown.internal).toBe(true);
        expect(thrown.message).toMatch(/AUCUNE preuve[^]*Demande-lui d'abord ses vraies preuves/);
        for (const args of [{}, { refaire: true, consigne: "Refais tout le site." }]) {
          const r = await call("site.create", ctx, args);
          expect(r.ok).toBe(false);
          expect(r.internal).toBe(true);
          expect(r.summary).toMatch(/Demande-lui d'abord ses vraies preuves/);
        }
        expect(one<{ n: number }>("SELECT COUNT(*) n FROM jobs WHERE project_id=? AND type='syna.site'", pid)!.n).toBe(0);
        // Un fait qui n'est pas une preuve ne lève pas le refus.
        await call("memory.note", ctx, { kind: "fact", key: "délais", value: "rappel sous 24 h" });
        expect(X.refusPreuves(ctx)).not.toBeNull();
      } finally { clean(); }
    });

    it("« je n'en ai pas » est noté dans la mémoire du projet : le site se crée sans preuve ; une vraie preuve suffit aussi", async () => {
      const a = await client();
      J.updateJourney(a.cid, (x) => { for (const n of [1, 2, 3, 4, 5]) J.setStep(x, n, "done"); });
      T.customPhotoDeps.unit = () => 150_000;
      try {
        await call("memory.note", a.ctx, { kind: "fact", key: "preuves", value: "aucune pour l'instant" });
        expect(X.refusPreuves(a.ctx)).toBeNull();
        expect(T.dossierPreuves(a.ctx).a).toHaveLength(0); // le dossier reste sans preuve : aucune partie « preuves » ne sera posée
        const est = await fr(() => getTool("site.create")!.estimate!(a.ctx, {}));
        expect(est.maxMicro).toBeGreaterThan(0);
        const r = await call("site.create", a.ctx, {});
        expect(r.ok, r.summary).toBe(true);
        expect(r.jobs).toHaveLength(1);
        const b = await client();
        J.updateJourney(b.cid, (x) => { for (const n of [1, 2, 3, 4, 5]) J.setStep(x, n, "done"); });
        await call("memory.note", b.ctx, { kind: "fact", key: "assurance", value: "responsabilité civile professionnelle, attestation à jour" });
        expect(X.refusPreuves(b.ctx)).toBeNull();
        expect(T.dossierPreuves(b.ctx).a.map((x) => x.id)).toContain("qualifications");
      } finally { clean(); }
    });
  });

  // ------------------------------------------------------------------ 2. les faits connus

  describe("2. un fait connu ne reste pas « À compléter »", () => {
    const facts = (over: Record<string, unknown> = {}): any => ({
      site: { phone: "04 00 00 00 01", hours: "Lun-Ven 9h-18h ; samedi 9h-12h", area: "Ville-Haute, Ville-Basse et Bourg-Neuf", address: "3 rue des Essais, 00000 Ville-Haute" },
      prestations: [{ name: "Révision complète", duration: "1 h", price: "45 €" }, { name: "Petit réglage", duration: null, price: "15 €" }],
      products: [], notes: [], address: "3 rue des Essais, 00000 Ville-Haute", discreet: false, email: "bonjour@exemple.test", ...over,
    });

    it("le libellé d'un manque nomme un fait sans ambiguïté, ou rien n'est rapproché", () => {
      const yes: [string, string][] = [["téléphone", "tel"], ["numéro de téléphone", "tel"], ["ton téléphone", "tel"], ["e-mail", "email"], ["adresse e-mail de contact", "email"], ["horaires", "horaires"], ["jours et horaires d'ouverture", "horaires"],
        ["zone d'intervention", "zone"], ["villes desservies", "zone"], ["ville", "ville"], ["adresse", "adresse"], ["adresse postale complète", "adresse"], ["prestations", "prestations"], ["liste des prestations", "prestations"], ["prestations et prix", "prestations-prix"]];
      for (const [label, fact] of yes) expect(SF.gapFact(label), label).toBe(fact);
      // Un tiers, un autre identifiant, deux faits mêlés, un mot de plus : jamais rapproché.
      for (const label of ["numéro SIRET", "numéro de TVA", "nom, adresse et téléphone de l'hébergeur", "téléphone de l'assureur", "adresse du médiateur", "numéro", "téléphone et horaires", "prix de la prestation", "délai de rappel", "prix", "tarifs", "prénom", "avis d'un client", "directeur de la publication"])
        expect(SF.gapFact(label), label).toBeNull();
    });

    it("le vrai fait est posé à la place du manque, sans IA ; ce qui est ambigu reste écrit", () => {
      const html = `<section><h2>Appelle au [À compléter : téléphone]</h2><p>Ouvert : <mark class="tn-manque">À compléter : horaires</mark>. Nous venons à [À compléter : ville] et dans [À compléter : zone d'intervention].</p>
        <p>Écris-nous : [À compléter : e-mail]. Nos formules : [À compléter : prestations et prix]. Hébergeur : [À compléter : nom, adresse et téléphone de l'hébergeur]. SIRET : [À compléter : numéro SIRET]. Rappel : [À compléter : délai de rappel].</p>
        <form><select name="besoin"><option>[À compléter : prestation 1]</option><option>[À compléter : prestation 2]</option></select></form></section>`;
      const r = SF.fillKnownGaps(html, facts());
      expect(r.html).toContain("<h2>Appelle au 04 00 00 00 01</h2>");
      expect(r.html.replace(/\u00a0/g, " ")).toContain("Ouvert : Lun-Ven 9 h-18 h, samedi 9 h-12 h.");
      expect(r.html).toContain("Nous venons à Ville-Haute et dans Ville-Haute, Ville-Basse et Bourg-Neuf.");
      expect(r.html).toContain("Écris-nous : bonjour@exemple.test.");
      expect(r.html).toContain("Nos formules : Révision complète (1 h, 45 €) ; Petit réglage (15 €).");
      expect(r.html).toContain("<select name=\"besoin\"><option>Révision complète</option><option>Petit réglage</option></select>");
      // Le tiers, l'autre identifiant et le fait non structuré restent « À compléter » : rien n'est deviné.
      expect(r.html).toContain("[À compléter : nom, adresse et téléphone de l'hébergeur]");
      expect(r.html).toContain("[À compléter : numéro SIRET]");
      expect(r.html).toContain("[À compléter : délai de rappel]");
      expect(r.filled.length).toBe(7);
      // Sans effet la seconde fois ; rien d'inventé quand le fait manque.
      expect(SF.fillKnownGaps(r.html, facts()).filled).toEqual([]);
      const empty = SF.fillKnownGaps(html, facts({ site: {}, prestations: [], email: null, address: null }));
      expect(empty.html).toBe(html);
    });

    it("l'adresse discrète n'est jamais posée hors des informations légales", () => {
      const f = facts({ discreet: true, site: { phone: "04 00 00 00 01", address: null } });
      expect(SF.fillKnownGaps("<p>[À compléter : adresse]</p>", f, "contact").html).toBe("<p>[À compléter : adresse]</p>");
      expect(SF.fillKnownGaps("<p>[À compléter : adresse]</p>", f, "legal").html).toBe("<p>3 rue des Essais, 00000 Ville-Haute</p>");
    });

    it("faux rapprochements corrigés : le SIRET et le téléphone de l'hébergeur ne sont pas le téléphone du client", () => {
      const f = facts();
      const flags = SF.factFlags("<section><p>SIRET : [À compléter : numéro SIRET]</p><p>[À compléter : nom, adresse et téléphone de l'hébergeur]</p><p>[À compléter : numéro de TVA]</p></section>", f, "legal");
      expect(flags).toEqual([]);
      // Un vrai manque pour un fait connu reste signalé (quand il n'a pas pu être posé, par exemple deux faits mêlés).
      expect(SF.factFlags("<section><p>[À compléter : téléphone et horaires]</p></section>", f).join(" ")).toMatch(/alors que le client a donné/);
      // Une note du client qui nomme la même chose qu'un tiers ou un identifiant répond au manque.
      const noted = SF.factFlags("<section><p>[À compléter : numéro SIRET]</p></section>", facts({ notes: [{ title: "SIRET", value: "000 000 000 00000" }] }));
      expect(noted.join(" ")).toMatch(/« SIRET : 000 000 000 00000 »/);
      expect(SF.factFlags("<section><p>[À compléter : téléphone de l'hébergeur]</p></section>", facts({ notes: [{ title: "téléphone du week-end", value: "04 00 00 00 02" }] }))).toEqual([]);
    });

    it("le formulaire de devis propose les vraies prestations, comme celui du rendez-vous", () => {
      for (const id of ["tn-devis", "tn-rdv"]) expect(tenueSection(id)!.html, id).toMatch(/<select\b[^>]*\sdata-tn-prestations-choix\b/);
      const html = tenueSection("tn-devis")!.html;
      const out = withTenueSite(html, { prestations: [{ name: "Révision complète", duration: "1 h", price: "45 €" }, { name: "Petit réglage", duration: null, price: null }] });
      expect(out).toContain("data-tn-prestations-choix><option>Révision complète</option><option>Petit réglage</option></select>");
      expect(SF.shownFacts(html, facts())).toMatch(/Le formulaire proposera les 2 prestations du client : Révision complète ; Petit réglage/);
    });

    it("montage : après l'écriture et les reprises, le téléphone et les horaires connus remplacent le manque ; c'est compté, plus rien n'est signalé", async () => {
      const { pid } = await client();
      saveServices(pid, { ...(loadProject(pid).services ?? {}), phone: "04 00 00 00 01", hours: "Lun-Ven 9h-18h", area: "Ville-Haute, Ville-Basse", services: [] } as any);
      B.customBrandDeps.plan = async () => PLAN;
      B.customBrandDeps.write = async (prompt: string) => {
        const m = /<h1>([^]*?)<\/h1>/.exec(prompt.slice(prompt.indexOf("HTML actuel")));
        return { edits: m ? [{ find: m[1], replace: "Appelle le [À compléter : téléphone], [À compléter : horaires]. SIRET : [À compléter : numéro SIRET]" }] : [], links: [], photos: [] };
      };
      try {
        const r = await job(`j-${Date.now()}-faits`, { projectId: pid, capMicro: 10_000_000, photos: false });
        const html = htmlOf(pid, "s0000000a").replace(/\u00a0/g, " ");
        expect(html).toContain("Appelle le 04 00 00 00 01, Lun-Ven 9 h-18 h. SIRET : [À compléter : numéro SIRET]");
        expect(r.faitsPoses).toBe(2);
        expect(r.problems.join("\n")).not.toMatch(/alors que le client a donné/);
      } finally { clean(); }
    });
  });

  // ------------------------------------------------------------------ 3. les personnes

  describe("3. jamais de personne dans une photo sans accord", () => {
    it("une personne se dit aussi par son rôle, son activité ou une partie de son corps", () => {
      for (const d of ["Un cycliste vu de dos roule sur une piste.", "Un passant traverse la rue.", "Une piétonne attend au feu.", "Le conducteur ouvre sa portière.", "Un livreur dépose un colis.", "Une coureuse au petit matin.", "Deux promeneurs au bord de l'eau.",
        "Un enfant joue dans le jardin.", "Une famille à table.", "Un couple marche sur la plage.", "Quelqu'un tient la porte.", "La scène est prise de dos, un sac sur l'épaule.", "Des bras portent un carton.", "Des jambes dépassent du cadre.", "Deux pieds nus sur le parquet.",
        "Le dos d'une femme assise.", "Les mains de l'artisan sur la pièce.", "La main d'un client prend l'objet.", "Une technicienne règle la machine."]) expect(B.briefShowsPeople(d), d).toBe(true);
    });
    it("un objet n'est pas une personne, et écarter la personne n'est pas la demander", () => {
      for (const d of ["Le dos d'un fauteuil en velours, près de la fenêtre.", "Un pied de table en chêne, en gros plan.", "Le bras du canapé, un plaid posé dessus.", "Une main courante en laiton le long de l'escalier.", "Un sac à dos posé sur un banc.",
        "Un objet fait main sur une étagère.", "Un vase au pied du mur.", "Les pieds de la chaise sur le carrelage.", "Le dos de la chaise porte une veste.", "Une rue vide : aucun passant, aucun cycliste, ni piéton ni voiture.", "Un trottoir sans passant.", CALM])
        expect(B.briefShowsPeople(d), d).toBe(false);
    });
    it("le contrôle de chaque image créée demande aussi la personne de dos, de loin ou en partie", async () => {
      const fs = await import("node:fs");
      expect(fs.readFileSync("src/lib/syna-agent/custom-theme/gallery.ts", "utf8")).toMatch(/people : true si une personne, un visage, une main ou une autre partie du corps est visible, même de dos, de loin, floue ou en partie/);
    });

    it("la relecture voit une personne et la description n'est pas refaite : la photo part avec la consigne durcie ; refusée au contrôle, elle n'est pas posée et c'est dit", async () => {
      const { pid } = await client();
      const photos: { prompt: string; key: string }[] = [];
      B.customBrandDeps.plan = async () => PLAN;
      B.customBrandDeps.write = async (prompt: string) => {
        const html = prompt.slice(prompt.indexOf("HTML actuel")), m = /<h1>([^]*?)<\/h1>/.exec(html);
        return { edits: m ? [{ find: m[1], replace: "Fait pour durer." }] : [], links: [],
          photos: [...new Set([...html.matchAll(/photos\/[\w-]+\.(?:webp|png|jpg)/g)].map((x) => x[0]))].map((find) => ({ find, description: CALM, ratio: "4:5" as const, product: null })) };
      };
      // La directrice artistique refuse la photo de la bande pour une personne ; la redescription ne rend rien.
      let reviewed = "";
      B.customBrandDeps.photoReview = async (prompt: string) => {
        reviewed = prompt;
        const find = /## s0000000b[^]*?\n- (photos\/[\w-]+\.(?:webp|png|jpg))/.exec(prompt)![1];
        return { photos: [{ uid: "s0000000b", find, fixes: ["Le cycliste vu de dos est une personne, interdite sans accord : montre le lieu sans lui."] }], site: "Une séance qui se tient." };
      };
      B.customBrandDeps.photoBrief = async () => ({ photos: [] });
      B.customBrandDeps.photo = async (prompt, _ref, _aspect, key) => { photos.push({ prompt, key }); return png(); };
      B.customBrandDeps.photoUnit = () => 50_000;
      // Le contrôle de l'image voit une personne sur la photo de la bande, les deux fois.
      G.galleryDeps.check = async (_i, _p, _t, key) => (/:s0000000b:/.test(key) ? { ...OK, people: true } : OK);
      try {
        const r = await job(`j-${Date.now()}-personne`, { projectId: pid, capMicro: 10_000_000, photos: true, newPhotos: true });
        expect(reviewed).toMatch(/PHOTOS DU SITE À RELIRE/);
        const bande = photos.filter((x) => /:s0000000b:/.test(x.key)), ouverture = photos.filter((x) => /:s0000000a:/.test(x.key));
        // Dès la première création : la consigne durcie, alors que la description seule ne nommait aucune personne.
        expect(B.briefShowsPeople(CALM)).toBe(false);
        expect(bande[0].prompt).toContain(`${B.NO_PEOPLE_PREFIX} Photographie d'ambiance`);
        expect(ouverture[0].prompt).not.toContain(B.NO_PEOPLE_PREFIX);
        expect(r.problems.join("\n")).toMatch(/ma relecture voyait une personne dans la photo prévue \(Le cycliste vu de dos est une personne[^]*créée avec la consigne « aucune personne », puis contrôlée/);
        expect(r.problems.join("\n")).not.toMatch(/photo à revoir/);
        // Refusée au contrôle (reprise comprise) : jamais posée, un cadre vide tient sa place, et c'est dit.
        expect(bande).toHaveLength(2);
        expect(r.photosFailed).toBe(1);
        expect(r.problems.join("\n")).toMatch(/ratée au contrôle deux fois, reprise comprise \(une personne ou une main apparaît sans accord[^]*non posée/);
        expect(htmlOf(pid, "s0000000b")).not.toMatch(/\/api\/files\//);
        expect(htmlOf(pid, "s0000000a")).toMatch(/\/api\/files\//);
      } finally { clean(); }
    });

    it("une personne interdite passe avant les corrections de goût : sa description est refaite même au-delà de cinq sections refusées", async () => {
      const uids = ["s0000001a", "s0000001b", "s0000001c", "s0000001d", "s0000001e", "s0000001f", "s0000001g"];
      const { pid } = await client(uids.map((uid) => ({ uid, id: "tn-bande" })));
      const fixes: string[] = [], photos: { prompt: string; key: string }[] = [];
      B.customBrandDeps.plan = async () => PLAN;
      B.customBrandDeps.write = async (prompt: string) => {
        const html = prompt.slice(prompt.indexOf("HTML actuel"));
        return { edits: [], links: [], photos: [...new Set([...html.matchAll(/photos\/[\w-]+\.(?:webp|png|jpg)/g)].map((x) => x[0]))].map((find) => ({ find, description: CALM, ratio: "16:9" as const, product: null })) };
      };
      B.customBrandDeps.photoReview = async (prompt: string) => ({ site: "À resserrer.", photos: uids.map((uid) => {
        const find = new RegExp(`## ${uid}[^]*?\\n- (photos\\/[\\w-]+\\.(?:webp|png|jpg))`).exec(prompt)![1];
        return { uid, find, fixes: [uid === "s0000001g" ? "Un passant traverse le cadre : c'est une personne, interdite sans accord." : "Même scène que la précédente : change de lieu et de moment."] };
      }) });
      B.customBrandDeps.photoBrief = async (prompt: string, key: string) => {
        fixes.push(key);
        const find = /- (photos\/[\w-]+\.(?:webp|png|jpg)) \(format/.exec(prompt)![1];
        return { photos: [{ find, description: `Photographie d'ambiance, format horizontal. Une étagère vide dans la lumière du soir, numéro ${fixes.length}. La scène contient exactement 1 objet.`, ratio: "16:9" as const, product: null }] };
      };
      B.customBrandDeps.photo = async (prompt, _ref, _aspect, key) => { photos.push({ prompt, key }); return png(); };
      G.galleryDeps.check = async () => OK;
      try {
        const r = await job(`j-${Date.now()}-ordre`, { projectId: pid, capMicro: 50_000_000, photos: true, newPhotos: true });
        expect(fixes).toHaveLength(B.MAX_PHOTO_FIXES);
        expect(fixes[0]).toMatch(/:photo-fix:s0000001g$/); // la section à la personne, d'abord
        expect(r.problems.join("\n")).not.toMatch(/ma relecture voyait une personne/); // redécrite : rien à durcir
        expect(r.problems.filter((x: string) => /photo à revoir/.test(x))).toHaveLength(2); // deux corrections de goût au-delà des reprises : dites
        expect(photos.find((x) => /:s0000001g:/.test(x.key))!.prompt).toMatch(/Une étagère vide dans la lumière du soir, numéro 1\./);
      } finally { clean(); }
    });
  });

  // ------------------------------------------------------------------ 4. le second regard a toujours sa place

  describe("4. la part du second regard, dans le plafond de la conception", () => {
    it("sa part couvre le prix le plus haut de son appel sur un site entier, quoi que la tâche ait déjà dépensé ; l'ancien montant fixe ne le couvrait pas", async () => {
      const { routeLlm, maxCostMicro } = await import("@/lib/ai/llm");
      const { withTrace, assertUnderCostCap, recordCall, CostCapReached } = await import("@/lib/ai/trace");
      const { jobSpentMicro } = await import("@/lib/syna-agent/budget");
      const user = await account();
      const route = routeLlm({ task: "quality_control", routing: { difficulty: "complex" } } as any);
      // La demande la plus longue comptée : toutes les sections des pages importantes d'un site entier.
      const system = K.educated(SR.SECOND_REGARD_SYSTEM, "secondRegard"), prompt = "x".repeat(T.SECOND_REGARD_PROMPT_TOKENS * 3);
      const params = { system: [{ type: "text" as const, text: system }], messages: [{ role: "user" as const, content: prompt }], max_tokens: T.AVIS_OUTPUT_RESERVE_TOKENS };
      const count = async (p: { system?: unknown; messages: unknown }) => Math.ceil((JSON.stringify(p.system).length + JSON.stringify(p.messages).length) / 3);
      const max = await maxCostMicro(route.model, params as any, undefined, count as any);
      const part = T.secondRegardCapMicro() + K.knowledgeCapMicro("secondRegard", "quality_control", 1);
      expect(part).toBeGreaterThanOrEqual(max);
      // La cause du défaut : la sortie que le fournisseur réserve (8 000 jetons) et la lecture d'un site entier dépassaient 0,15 €.
      expect(max).toBeGreaterThan(SR.SECOND_REGARD_CAP_MICRO + K.knowledgeCapMicro("secondRegard", "quality_control", 1));
      // Le concepteur, le juge de l'ordre et la reprise ont déjà beaucoup dépensé : la part du second regard reste entière.
      const jobId = `j-${Date.now()}-conception`;
      recordCall({ userId: user.id, jobId, task: "strategy", provider: "anthropic", requestedModel: route.model, unit: "tokens", costMicro: 3_200_000, status: "ok" } as any);
      expect(jobSpentMicro(jobId)).toBe(3_200_000);
      await withTrace({ jobId, costCapMicro: jobSpentMicro(jobId) + part }, async () => { expect(() => assertUnderCostCap(max)).not.toThrow(); });
      await withTrace({ jobId, costCapMicro: jobSpentMicro(jobId) + SR.SECOND_REGARD_CAP_MICRO + K.knowledgeCapMicro("secondRegard", "quality_control", 1) }, async () => { expect(() => assertUnderCostCap(max)).toThrow(CostCapReached); });
    });

    it("le devis du site compte la même part (deux avis au plus) : il reste cohérent avec ce que la conception peut dépenser", () => {
      T.customPhotoDeps.unit = () => 150_000;
      try {
        const c = T.designCost(true);
        expect(c.max).toBe(3 * 2_200_000 + T.secondRegardCapMicro() * SR.SECOND_REGARD_CALLS_MAX + T.originalityCapMicro() * Og.ORIGINALITY_CALLS_MAX + T.designKnowledge(true).max);
        const q = X.siteQuote({ business: "services", products: 1 });
        expect(q.maxMicro).toBeGreaterThan(c.max);
        expect(q.probableMicro!).toBeLessThan(q.maxMicro);
        // De combien le devis bouge (dit dans le compte rendu du chantier) : la différence avec les anciens montants fixes.
        const plus = (T.secondRegardCapMicro() - SR.SECOND_REGARD_CAP_MICRO) * SR.SECOND_REGARD_CALLS_MAX + (T.originalityCapMicro() - Og.ORIGINALITY_CAP_MICRO) * Og.ORIGINALITY_CALLS_MAX;
        expect(plus).toBeGreaterThan(0);
        console.log(`[devis] second regard : ${T.secondRegardCapMicro()} µ€ par avis (avant ${SR.SECOND_REGARD_CAP_MICRO}) ; juge de l'originalité : ${T.originalityCapMicro()} µ€ (avant ${Og.ORIGINALITY_CAP_MICRO}) ; plafond du devis : +${plus} µ€ ; conception au plus ${c.max} µ€, d'ordinaire ${c.usual} µ€ ; site de services : au plus ${q.maxMicro} µ€, d'ordinaire ${q.probableMicro} µ€`);
      } finally { clean(); }
    });

    it("un juge de l'originalité qui n'a pas pu rendre son avis n'est plus passé sous silence", async () => {
      const fs = await import("node:fs");
      expect(fs.readFileSync("src/lib/syna-agent/custom-theme/tools.ts", "utf8")).toMatch(/status === "non_juge" \? \[`originalité du site non jugée/);
    });
  });

  // ------------------------------------------------------------------ 5. les répétitions

  describe("5. un fait fort ne se répète pas d'un bout à l'autre du site", () => {
    it("le plan répartit les faits : deux endroits au plus, chaque formule une fois, aucune prestation oubliée ; sans exemple de métier", () => {
      expect(B.SITE_PLAN_SYSTEM).toMatch(/n'est dit EN TOUTES LETTRES qu'à DEUX endroits du site au plus, là où il décide le visiteur ; ailleurs il est sous-entendu ou absent/);
      expect(B.SITE_PLAN_SYSTEM).toMatch(/Chaque FORMULE de style[^\n]*n'apparaît qu'UNE fois sur tout le site/);
      expect(B.SITE_PLAN_SYSTEM).toMatch(/chaque produit et chaque prestation de la liste est présenté quelque part, aucun n'est oublié/);
      const rule = B.SITE_PLAN_SYSTEM.split("\n").filter((l) => /RÉPARTITION \(repartition\)|Chaque FORMULE de style/.test(l)).join("\n");
      expect(rule).not.toMatch(/vélo|cycl|infus|thé\b|toilett|confiture|rooibos|« tu files »|esprit léger/i);
      const plan = B.SitePlanSchema.parse({ ...PLAN, sections: [{ uid: "a", message: "Dire le prix.", titre: "Le prix", bouton: null, faits: ["prix dit avant"] }],
        repartition: [{ fait: "le prix est dit avant de commencer", sections: ["a", "b", "c"] }, { fait: "il se déplace", sections: ["c"] }] });
      // Au-delà de deux sections, seules les deux premières le disent.
      expect(B.factPlaces(plan, "a")).toEqual({ mine: ["le prix est dit avant de commencer"], elsewhere: ["il se déplace"] });
      expect(B.factPlaces(plan, "c")).toEqual({ mine: ["il se déplace"], elsewhere: ["le prix est dit avant de commencer"] });
      const p = B.sectionWritePrompt("DOSSIER", "Accueil", "Ouverture", "Ouvre la page.", "<section><h1>Titre</h1></section>", { site: plan, uid: "c" });
      expect(p).toMatch(/Faits forts que CETTE section dit en toutes lettres[^\n]*: il se déplace\./);
      expect(p).toMatch(/Faits forts DITS AILLEURS sur le site \(ici, ne les redis PAS en toutes lettres : sous-entends-les ou tais-les\) : le prix est dit avant de commencer\./);
      expect(p).toMatch(/Une formule de style[^\n]*ne sert qu'UNE fois sur tout le site/);
      // Un plan sans répartition (ancien plan, champ mal formé) reste lisible.
      expect(B.SitePlanSchema.parse({ ...PLAN, repartition: "n'importe quoi" }).repartition).toBeUndefined();
      expect(B.factPlaces(B.SitePlanSchema.parse(PLAN), "a")).toEqual({ mine: [], elsewhere: [] });
    });

    const sec = (uid: string, body: string) => ({ uid, label: `Section ${uid}, Accueil`, html: `<section>${body}</section>` });
    it("contrôle sans IA : une suite de trois mots ou plus dans plus de trois sections est relevée, avec ses sections", () => {
      const list = ["a", "b", "c", "d", "e"].map((u, i) => sec(u, `<h2>Un titre propre à la partie ${u.repeat(3)}</h2><p>Chez nous, le prix annoncé avant de commencer, toujours.</p>${i < 4 ? "<p>Tu repars l'esprit léger, sans surprise.</p>" : ""}${i < 3 ? "<p>Une attention rare pour chaque détail.</p>" : ""}`));
      const found = B.repeatedPhrases(list);
      const prix = found.find((x) => /prix annoncé avant/.test(x.phrase))!;
      expect(prix.sections).toHaveLength(5);
      expect(prix.sections[0]).toBe("a (Section a, Accueil)");
      expect(found.find((x) => /l'esprit léger/.test(x.phrase))!.sections).toHaveLength(4);
      // Une tournure banale faite de petits mots n'est pas une répétition.
      expect(B.repeatedPhrases(["a", "b", "c", "d", "e"].map((u) => sec(u, `<p>Ici, rien d'autre que ${u.repeat(5)}, et tout cela se fait encore plus simplement.</p>`)))).toEqual([]);
      // Dans trois sections seulement : permis.
      expect(found.some((x) => /attention rare/.test(x.phrase))).toBe(false);
    });
    it("aucun faux positif : boutons, nom de marque, noms de prestations, téléphone, horaires, prix", () => {
      const list = ["a", "b", "c", "d", "e"].map((u) => sec(u, `<h2>Maison des Grandes Rivières, partie ${u.repeat(4)}</h2><p>Révision complète du matériel : 45 €, en 1 h 30. Appelle le 04 00 00 00 01, du lundi au vendredi, 9 h à 18 h.</p><a class="tn-bt" href="#">Réserver mon créneau maintenant</a><button>Réserver mon créneau maintenant</button>`));
      const found = B.repeatedPhrases(list, { ignore: ["Maison des Grandes Rivières", "Révision complète du matériel", "04 00 00 00 01", "du lundi au vendredi, 9 h à 18 h"] });
      expect(found).toEqual([]);
      // Sans ces noms à ignorer, le nom de marque répété serait relevé : la liste sert bien à l'écarter.
      expect(B.repeatedPhrases(list).some((x) => /Grandes Rivières/.test(x.phrase))).toBe(true);
    });
    it("le relecteur reçoit les répétitions, avec la liste des sections", () => {
      const p = B.copyReviewPrompt("DOSSIER", [{ uid: "a", place: "Accueil", title: "Ouverture", html: "<section><h1>Un titre assez long</h1></section>" }], {}, {}, [{ phrase: "prix annoncé avant", sections: ["a (Ouverture, Accueil)", "b (Prix, Accueil)", "c (Contact, Contact)", "d (Pied, site)"] }]);
      expect(p).toMatch(/RÉPÉTITIONS RELEVÉES PAR LE STUDIO \(la même suite de mots revient dans plus de 3 sections[^]*- « prix annoncé avant » : a \(Ouverture, Accueil\), b \(Prix, Accueil\), c \(Contact, Contact\), d \(Pied, site\)/);
      expect(B.copyReviewPrompt("DOSSIER", [], {}, {})).not.toMatch(/RÉPÉTITIONS/);
    });

    it("montage : la répétition est donnée au relecteur ; ce qui reste après les reprises est dit dans le compte rendu", async () => {
      const uids = ["s0000002a", "s0000002b", "s0000002c", "s0000002d", "s0000002e"];
      const { pid } = await client(uids.map((uid) => ({ uid, id: "tn-ouverture" })));
      let n = 0, reviewed = "", fixed = false;
      B.customBrandDeps.plan = async () => PLAN;
      B.customBrandDeps.write = async (prompt: string) => {
        const html = prompt.slice(prompt.indexOf("HTML actuel")), m = /<h1>([^]*?)<\/h1>/.exec(html);
        if (/CORRECTIONS EXIGÉES PAR LE DIRECTEUR DE CRÉATION/.test(prompt)) { fixed = true; return { edits: m ? [{ find: m[1], replace: "Une autre idée, dite autrement, ici." }] : [], links: [], photos: [] }; }
        return { edits: m ? [{ find: m[1], replace: `Partie ${++n} : le prix annoncé avant de commencer.` }] : [], links: [], photos: [] };
      };
      // Le relecteur ne reprend qu'une section : la suite de mots reste dans quatre sections.
      B.customBrandDeps.review = async (prompt: string) => { reviewed = prompt; return { sections: [{ uid: "s0000002e", fixes: ["« le prix annoncé avant de commencer » est déjà dit quatre fois : dis autre chose ici."] }], site: "Clair, mais il se répète." }; };
      try {
        const r = await job(`j-${Date.now()}-repet`, { projectId: pid, capMicro: 10_000_000, photos: false });
        expect(reviewed).toMatch(/RÉPÉTITIONS RELEVÉES PAR LE STUDIO[^]*« le prix annoncé avant » : s0000002a \([^\n]*s0000002e \(/);
        expect(fixed).toBe(true);
        // (Les autres textes de la pièce d'exemple, que ce rédacteur simulé ne réécrit pas, se répètent aussi : ils sont relevés de même.)
        // (17 novembre 2026 : le Studio reprend lui-même les sections au-delà de la troisième ; la formule ne reste que dans trois sections, ce qui est permis.)
        expect(r.repetitions.some((x: string) => /« le prix annoncé avant »/.test(x))).toBe(false);
        expect(r.problems.join("\n")).toMatch(/répétitions : \d+ suite\(s\) de mots reviennent encore dans plus de 3 sections, par exemple « /);
      } finally { clean(); }
    });
  });
});
