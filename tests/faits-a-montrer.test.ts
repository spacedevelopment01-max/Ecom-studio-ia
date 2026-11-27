/**
 * LES FAITS À MONTRER (27 novembre 2026). Les mots du propriétaire : « Et bien c'est le but de poser des questions au client
 * avant de démarrer le projet afin de savoir ce que peux être générer en image ce qui peux être générer en texte sans que
 * sa porte défaut ». Le cahier dit quoi demander par métier ; SINA les demande avant le résumé ; les réponses vont dans la
 * fiche, puis dans la planche de marque, la planche en vrai, les publications et leurs relecteurs. Aucun appel.
 */
import fs from "node:fs";
import { describe, expect, it } from "vitest";

process.env.STUDIO_SYNA_AGENT = "1";

describe("les faits à montrer", async () => {
  const { one } = await import("@/lib/db");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { account } = await import("./conversation209-fixtures");
  const { threadFor } = await import("@/lib/syna-agent/thread");
  const { getTool } = await import("@/lib/syna-agent/registry");
  const { addMessage } = await import("@/lib/syna-agent/store");
  const J = await import("@/lib/syna-agent/journey");
  const F = await import("@/lib/syna-agent/faits-a-montrer");
  const Fi = await import("@/lib/syna-agent/fiche");
  const C = await import("@/lib/syna-agent/controle-message");
  const P = await import("@/lib/syna-agent/planche-de-marque");
  const V = await import("@/lib/syna-agent/planche-en-vrai");
  const { lintClaims } = await import("@/lib/ai/tasks");
  const fr = <T,>(fn: () => Promise<T> | T) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());
  const ctxOf = (user: any, cid: string) => ({ user, conversationId: cid, runId: "test", projectId: null as string | null, attachment: () => null }) as any;
  const call = async (name: string, ctx: any, args: unknown): Promise<any> => {
    ctx.projectId = one<{ project_id: string | null }>("SELECT project_id FROM agent_conversations WHERE id=?", ctx.conversationId)?.project_id ?? null;
    return fr(() => getTool(name)!.run(ctx, getTool(name)!.args.parse(args)));
  };
  const OFFRE_CAFE = "Je suis torréfacteur : je vends en ligne des cafés en grains et moulus, et des coffrets.";
  const depart = (business: string, offre: string) => ({ start: { business: { value: business, status: "answered", source: "client", at: 1 }, offer: { value: offre, status: "answered", source: "client", at: 1 } } }) as never;

  it("le cahier est lu par le code ; ses parties sont choisies d'après l'activité et l'offre, sans liste figée", () => {
    const parties = F.cahierDesFaits();
    expect(parties.map((p) => p.nom)).toEqual(["une boutique", "des prestations", "une boutique alimentaire", "le café", "un artisan", "la marque"]);
    // Une boutique de café : la boutique, le café, la marque (jamais l'artisan pour « artisanal », mot entier).
    expect(F.partiesPour({ business: "products", offre: "petit torréfacteur artisanal qui vend des cafés" }).map((p) => p.nom)).toEqual(["une boutique", "le café", "la marque"]);
    expect(F.sujetsPour({ business: "products", offre: OFFRE_CAFE }).map((s) => s.sujet)).toEqual(["noms", "formats", "origine", "mentions", "fabrication", "torrefaction", "notes_de_gout", "annee", "ville"]);
    // Des prestations : noms exacts, durées, lieu, puis la marque.
    expect(F.sujetsPour({ business: "services", offre: "Coaching sportif à domicile" }).map((s) => s.sujet)).toEqual(["noms", "durees", "lieu", "annee", "ville"]);
    // Un artisan, une épicerie.
    expect(F.sujetsPour({ business: "products", offre: "Des tasses en céramique faites dans mon atelier" }).map((s) => s.sujet)).toContain("matieres");
    expect(F.sujetsPour({ business: "products", offre: "Une épicerie fine : confitures et miels" }).map((s) => s.sujet)).toContain("composition");
    // Rien tant que l'activité et l'offre ne sont pas connues.
    expect(F.sujetsDuParcours(J.emptyJourney())).toEqual([]);
    // Un cahier mal formé arrête tout, avec une erreur claire.
    expect(() => F.lireLeCahier("## Partie : x (quand : toujours)\n- sujet-faux | marque | a | b")).toThrow(/ligne illisible/);
    // Aucune question sur le logo, aucun nom ni exemple de client d'essai dans les questions envoyées à SINA.
    const questions = parties.flatMap((p) => p.sujets.map((s) => s.question)).join(" ");
    expect(questions).not.toMatch(/logo|Mouture|Écume|Racine|Tenon/i);
  });

  it("les faits encore à demander : les noms d'abord, puis chaque sujet pour tous les produits ; « je ne sais pas » les noms, et ces sujets ne se demandent pas", () => {
    const j = depart("products", OFFRE_CAFE);
    expect(F.faitsAAborder(j, []).map((x) => x.sujet)).toEqual(["noms", "annee", "ville"]);
    const noms: any = { sujet: "noms", etat: "donne", noms: ["Café des collines", "Café du matin"], at: 1 };
    const r = F.faitsAAborder(j, [noms]);
    expect(r.map((x) => x.sujet)).toEqual(["formats", "origine", "mentions", "fabrication", "torrefaction", "notes_de_gout", "annee", "ville"]);
    expect(r[0].produits).toEqual(["Café des collines", "Café du matin"]);
    // Une réponse sans produit vaut pour tous ; une réponse par produit n'enlève que le sien.
    expect(F.faitsAAborder(j, [noms, { sujet: "formats", etat: "donne", valeur: "250 g et 1 kg", at: 1 }]).map((x) => x.sujet)).not.toContain("formats");
    expect(F.faitsAAborder(j, [noms, { sujet: "origine", produit: "Café du matin", etat: "donne", valeur: "Pérou", at: 1 }]).find((x) => x.sujet === "origine")?.produits).toEqual(["Café des collines"]);
    expect(F.faitsAAborder(j, [{ sujet: "noms", etat: "ne_sait_pas", at: 1 }]).map((x) => x.sujet)).toEqual(["annee", "ville"]);
  });

  it("start.fait enregistre ses mots dans la fiche, avec le garde-fou : rien qui ne soit dans son dernier message", async () => {
    const user = await account();
    const cid = threadFor(user, null), ctx = ctxOf(user, cid);
    await call("start.answer", ctx, { answers: [{ field: "business", value: "products" }, { field: "offer", value: OFFRE_CAFE }] });
    addMessage(cid, "assistant", { message: "Je note.", actions: [], question: { text: "Le nom exact de chacun de tes produits ?" }, done: false, askField: "fait:noms", step: 0 }, null);
    addMessage(cid, "user", { text: "Café des collines et Café du matin." }, null);
    // Un nom qu'il n'a pas écrit est refusé.
    expect(await call("start.fait", ctx, { faits: [{ sujet: "noms", noms: ["Café des collines", "Grand cru Santos"] }] })).toMatchObject({ ok: false, internal: true });
    expect(await call("start.fait", ctx, { faits: [{ sujet: "noms", noms: ["Café des collines", "Café du matin"] }] })).toMatchObject({ ok: true });
    expect(F.nomsDonnes(F.faitsDuFil(cid))).toEqual(["Café des collines", "Café du matin"]);
    // Un produit qui n'est pas l'un de ses noms : refusé ; un sujet hors de son métier : refusé.
    addMessage(cid, "user", { text: "Le Café du matin vient du Pérou." }, null);
    expect(await call("start.fait", ctx, { faits: [{ sujet: "origine", produit: "Moka", valeur: "Pérou" }] })).toMatchObject({ ok: false });
    expect(await call("start.fait", ctx, { faits: [{ sujet: "durees", valeur: "Pérou" }] })).toMatchObject({ ok: false });
    expect(await call("start.fait", ctx, { faits: [{ sujet: "origine", produit: "Café du matin", valeur: "Pérou" }] })).toMatchObject({ ok: true });
    // « Je ne sais pas » et « je préfère ne pas le montrer » ne s'enregistrent que s'il les a dits.
    addMessage(cid, "user", { text: "Pour les labels, aucun." }, null);
    expect(await call("start.fait", ctx, { faits: [{ sujet: "mentions", etat: "ne_sait_pas" }] })).toMatchObject({ ok: false });
    addMessage(cid, "user", { text: "Je préfère ne pas le montrer." }, null);
    expect(await call("start.fait", ctx, { faits: [{ sujet: "ville", etat: "ne_montre_pas" }] })).toMatchObject({ ok: true });
    addMessage(cid, "user", { text: "Je ne sais pas." }, null);
    expect(await call("start.fait", ctx, { faits: [{ sujet: "annee", etat: "ne_sait_pas" }] })).toMatchObject({ ok: true });
    const s = await call("start.state", ctx, {});
    // L'origine reste à demander pour l'autre produit ; l'année et la ville sont répondues.
    expect(s.data.faitsPasEncoreDemandes.map((x: any) => x.sujet)).toEqual(["formats", "origine", "mentions", "fabrication", "torrefaction", "notes_de_gout"]);
    expect(s.data.faitsPasEncoreDemandes.find((x: any) => x.sujet === "origine").pour).toEqual(["Café des collines"]);
  });

  it("le résumé attend les faits : start.confirm est refusé tant qu'un fait n'a pas été demandé, et le parcours les liste dans l'ordre", async () => {
    const user = await account();
    const cid = threadFor(user, null), ctx = ctxOf(user, cid);
    await call("start.answer", ctx, { answers: [{ field: "business", value: "products" }, { field: "offer", value: OFFRE_CAFE }] });
    await call("start.answer", ctx, { answers: [
      { field: "existing", value: "Rien." }, { field: "audience", value: "Des amateurs de café." }, { field: "image", value: "Chaleureux." },
      { field: "setup", value: "3 produits" }, { field: "market", value: "En ligne." }, { field: "price", value: "9 € le paquet" }, { field: "difference", value: "Torréfié chaque semaine." },
      { field: "taste", status: "none" }, { field: "photos", value: "Pas encore." }, { field: "language", value: "Français seulement" }, { field: "contact", status: "later" }, { field: "platform", value: "shopify" },
    ] });
    const refus = await call("start.confirm", ctx, {});
    expect(refus).toMatchObject({ ok: false });
    expect(refus.summary).toMatch(/Faits à montrer pas encore demandés : Noms exacts, Année de création, Ville/);
    const j = J.journeyOf(cid);
    const texte = J.journeyContext(j, { faits: F.lignesDesFaits(j, F.faitsDuFil(cid)) });
    expect(texte).toMatch(/Avant le résumé, il te reste les faits à montrer\. Faits à montrer pas encore demandés, dans l'ordre .*: noms — /);
    expect(texte).not.toMatch(/fais le RÉSUMÉ/);
    // La consigne fixe : une question à la fois, les deux réponses toujours permises, « fait:<sujet> », jamais le logo.
    expect(J.guideDeLEtape(j)).toMatch(/UNE question à la fois.*« je ne sais pas » ou « je préfère ne pas le montrer ».*« fait:<sujet> ».*Jamais une question sur son logo/);
    F.enregistrerLesFaits(cid, [{ sujet: "noms", etat: "ne_sait_pas" }, { sujet: "annee", etat: "donne", valeur: "2019" }, { sujet: "ville", etat: "ne_montre_pas" }]);
    const j2 = J.journeyOf(cid);
    expect(J.journeyContext(j2, { faits: F.lignesDesFaits(j2, F.faitsDuFil(cid)) })).toMatch(/Faits à montrer déjà demandés \(ne les redemande jamais\) : .*Année de création \(donné : « 2019 »\).*Ville \(il ne veut pas le montrer\)/);
    expect(await call("start.confirm", ctx, {})).toMatchObject({ ok: true });
  });

  it("le Studio empêche de redemander un fait déjà répondu, et pose sous chaque question les deux réponses toujours permises", () => {
    const j = depart("products", OFFRE_CAFE);
    const faits: any[] = [{ sujet: "annee", etat: "donne", valeur: "2019", at: 1 }, { sujet: "noms", etat: "ne_montre_pas", at: 1 }];
    const m = (text: string, askField?: string) => ({ message: "", actions: [], question: { text }, ...(askField ? { askField } : {}) });
    expect(F.faitsRedemandes(m("En quelle année as-tu créé ton entreprise ?", "fait:annee"), j, faits)).toEqual(["annee"]);
    // Sans le sujet dit, la question qui le reconnaît suffit.
    expect(F.faitsRedemandes(m("Depuis quand existe ton entreprise ?"), j, faits)).toEqual(["annee"]);
    expect(F.faitsRedemandes(m("Comment s'appellent tes produits, exactement ?", "fait:noms"), j, faits)).toEqual(["noms"]);
    expect(F.faitsRedemandes(m("Dans quelle ville es-tu installé ?", "fait:ville"), j, faits)).toEqual([]);
    const defauts = C.defautsDuMessage(m("En quelle année as-tu créé ton entreprise ?", "fait:annee") as never, { etape: 0, payant: () => false, lance: false, faitsRedemandes: (x) => F.faitsRedemandes(x, j, faits), defautDesFaits: F.defautDesFaitsRedemandes });
    expect(defauts.join(" ")).toMatch(/déjà répondu pour « Année de création ».*ne lui redemande jamais/);
    const avec = runWithLang({ ui: "fr", content: "fr" }, () => F.avecLesChoixDesFaits({ question: { text: "Dans quelle ville es-tu installé ?", choices: ["Je ne sais pas"] }, askField: "fait:ville" }));
    expect(avec.question!.choices).toEqual(["Je ne sais pas", "Je préfère ne pas le montrer"]);
    expect(F.avecLesChoixDesFaits({ question: { text: "Et ton offre ?" }, askField: "offer" }).question!.choices).toBeUndefined();
  });

  it("la fiche : les faits donnés, mot pour mot ; ce qu'il ne veut pas montrer, par son sujet seul ; visibles et corrigeables par lui", async () => {
    const user = await account();
    const cid = threadFor(user, null), ctx = ctxOf(user, cid);
    await call("start.answer", ctx, { answers: [{ field: "business", value: "products" }, { field: "offer", value: OFFRE_CAFE }] });
    F.enregistrerLesFaits(cid, [{ sujet: "noms", etat: "donne", noms: ["Café des collines"] }, { sujet: "formats", produit: "Café des collines", etat: "donne", valeur: "250 g" }, { sujet: "ville", etat: "ne_montre_pas", valeur: "Nantes" }, { sujet: "annee", etat: "ne_sait_pas" }]);
    const pid = one<{ project_id: string }>("SELECT project_id FROM agent_conversations WHERE id=?", cid)!.project_id;
    const t = Fi.ficheDuProjet(pid);
    expect(t).toMatch(/## Ce qui peut s'écrire sur ses images et son site .*\n- Noms exacts : « Café des collines »\n- Formats ou poids de « Café des collines » : « 250 g »/);
    expect(t).toMatch(/## Ce qu'il ne veut pas montrer \(jamais écrit ni montré\)\n- Ville/);
    expect(t).not.toMatch(/Nantes|Année de création/);
    const vue = Fi.ficheVue(cid, pid);
    expect(vue.faits.map((x) => [x.sujet, x.etat, x.value])).toEqual([["noms", "donne", "Café des collines"], ["formats", "donne", "250 g"], ["ville", "ne_montre_pas", ""], ["annee", "ne_sait_pas", ""]]);
    Fi.corrigerFiche(pid, { type: "fait", sujet: "formats", produit: "Café des collines", value: "250 g et 1 kg" });
    Fi.corrigerFiche(pid, { type: "fait", sujet: "noms", value: null });
    const apres = F.faitsDuProjet(pid);
    expect(apres.find((x) => x.sujet === "formats")).toBeUndefined();
    expect(apres.find((x) => x.sujet === "noms")).toMatchObject({ etat: "ne_montre_pas", corrigeLe: expect.any(Number) });
    expect(F.faitsPermis(apres).interdits).toContain("Nantes");
  });

  const FAITS: import("@/lib/syna-agent/faits-a-montrer").FaitsPermis = F.faitsPermis([
    { sujet: "noms", etat: "donne", noms: ["Café des collines"], at: 1 }, { sujet: "formats", etat: "donne", valeur: "250 g", at: 1 },
    { sujet: "origine", produit: "Café des collines", etat: "donne", valeur: "Éthiopie", at: 1 }, { sujet: "annee", etat: "donne", valeur: "2019", at: 1 },
    { sujet: "ville", etat: "ne_montre_pas", valeur: "Nantes", at: 1 },
  ]);

  it("planche de marque : la ligne des mentions vraies seulement quand il en a donné ; ses chiffres permis ; ce qu'il ne veut pas montrer refusé", () => {
    const valeurs = { metier: "un torréfacteur qui vend des cafés", traits: ["chaleureuse", "simple", "artisanale"], emotion: "le plaisir du premier café", site: "boutique" as const, images: ["un", "deux", "trois", "quatre", "cinq", "six"], produits: ["cafés en grains"] };
    const o = { nom: "Brûlerie", valeurs, annee: 2026, domaine: { domaine: "brulerie.fr", statut: "disponible" as const }, personnes: false };
    const sans = P.texteDeLaPlanche(o);
    // Sans fait donné, le texte envoyé ne change pas (une image déjà reçue est reconnue sans être repayée).
    expect(P.texteDeLaPlanche({ ...o, faits: F.AUCUN_FAIT })).toBe(sans);
    const avec = P.texteDeLaPlanche({ ...o, faits: FAITS });
    expect(avec).toContain(`${P.ligneDesNomsDesProduits(valeurs.produits)}\n${F.ligneDesMentionsVraies(FAITS)}\n`);
    expect(avec).toContain("formats ou poids : « 250 g »");
    expect(avec).toContain("« Café des collines », origine : « Éthiopie »");
    expect(avec).not.toContain("Nantes");
    expect(F.ligneDesMentionsVraies(FAITS)).toMatch(/les autres petits textes restent de simples traits, sans mot lisible/);
    // Le contrôle des valeurs : un poids donné est permis ; un poids inventé non ; ce qu'il ne veut pas montrer, jamais.
    const base = { nom: "Brûlerie", metier: valeurs.metier, fiche: "cafés en grains 250 g Éthiopie", personnes: false, kind: "produits" as const };
    const v = { nom: "Brûlerie", traits: ["chaleureuse", "simple", "artisanale"], emotion: "le plaisir du premier café", images: ["un sachet de 250 g", "deux", "trois", "quatre", "cinq", "six"], produits: ["cafés en grains"], appel: "devis" as const };
    expect(P.controleDesValeurs(v, base).fautes.join(" ")).toMatch(/aucun chiffre/);
    expect(P.controleDesValeurs(v, { ...base, faits: FAITS }).fautes).toEqual([]);
    expect(P.controleDesValeurs({ ...v, images: ["un sachet de 500 g", ...v.images.slice(1)] }, { ...base, faits: FAITS }).fautes.join(" ")).toMatch(/aucun chiffre/);
    expect(P.controleDesValeurs({ ...v, images: ["les quais de Nantes", ...v.images.slice(1)] }, { ...base, fiche: `${base.fiche} Nantes`, faits: FAITS }).fautes.join(" ")).toMatch(/ne veut pas montrer/);
  });

  it("relecteur de la planche : les mentions vraies dites comme permises ; écrites, jamais une promesse ni un produit inventé ; toute autre reste refusée", () => {
    const o = { nom: "Brûlerie", annee: 2026, domaine: { domaine: "brulerie.fr", statut: "disponible" as const }, personnes: false, animaux: false, produits: ["cafés en grains"], faits: FAITS };
    const demande = P.demandeAuRelecteurDeLaPlanche({ ...o, texte: "t" });
    expect(demande).toContain("Les mentions vraies données par le client, permises telles quelles");
    expect(demande).not.toContain("Nantes");
    const v = { nomLu: "Brûlerie", logoFidele: true, copyrightLu: "© 2026 Brûlerie", domaineLu: "brulerie.fr — disponible", fautes: [], microTextes: [], promesses: [] as string[], personnes: false, personnesVues: [], logoFonceSurFondSombre: false, motMaquette: false, copies: [], signesIsoles: [], produitsInventes: [] as { ou: string; texte: string }[], note: 9, pourquoi: "" } as any;
    expect(P.lectureDeLaPlanche({ ...v, promesses: ["250 g", "Depuis 2019"], produitsInventes: [{ ou: "Bloc 06", texte: "Origine Éthiopie" }] }, o).raisons).toEqual([]);
    expect(P.lectureDeLaPlanche({ ...v, promesses: ["250 g"] }, { ...o, faits: undefined }).raisons.join(" ")).toMatch(/promesses ou chiffres inventés/);
    expect(P.lectureDeLaPlanche({ ...v, promesses: ["1 kg"], produitsInventes: [{ ou: "Bloc 06", texte: "Origine Brésil" }] }, o).raisons.join(" ")).toMatch(/promesses ou chiffres inventés : « 1 kg ».*produits inventés.*« Origine Brésil »/);
    expect(P.lectureDeLaPlanche({ ...v, produitsInventes: [{ ou: "Bloc 08", texte: "Torréfié à Nantes" }] }, o).raisons).toContain(F.RAISON_FAIT_NON_MONTRE);
  });

  it("planche en vrai : les étiquettes peuvent porter ses mentions vraies ; tout le reste sans mot lisible ; une image déjà reçue reconnue sans être repayée", () => {
    const produits = ["cafés en grains"];
    const sans = V.texteDeLElement({ element: "produit-1", nom: "Brûlerie", logo: true, photo: false, personnes: false, produits });
    expect(V.texteDeLElement({ element: "produit-1", nom: "Brûlerie", logo: true, photo: false, personnes: false, produits, faits: F.AUCUN_FAIT })).toBe(sans);
    const avec = V.texteDeLElement({ element: "produit-1", nom: "Brûlerie", logo: true, photo: false, personnes: false, produits, faits: FAITS });
    expect(avec).toContain(V.MICRO_TEXTES_EN_VRAI);
    expect(avec).toContain("et ces mentions vraies, données par le client, écrites exactement : ");
    expect(avec).not.toContain("Nantes");
    expect(V.texteSansLesMentionsVraies(avec, produits, FAITS)).toBe(sans);
    // Le relecteur reçoit la liste des mentions permises ; le code les excuse, refuse le reste et ce qu'il ne veut pas montrer.
    expect(V.demandeAuRelecteurEnVrai({ nom: "Brûlerie", personnes: false, groupe: "produits", cases: [{ element: "produit-1", photo: false }], produits, faits: FAITS })).toContain("Les mentions vraies données par le client");
    const v = { case: "produit-1", identique: true, textesLus: ["Brûlerie", "Café en grains", "250 g", "Origine Éthiopie"], logoPresent: true, personne: false, logoFonceSurFondSombre: false, produitFidele: null, texteCoupe: false, note: 9, pourquoi: "" } as any;
    const inv = { case: "produit-1", textes: ["Brûlerie"], logo: true } as any;
    expect(V.raisonsDuRefusEnVrai(v, { inventaire: inv, personnes: false, photo: false, element: "produit-1", logo: { nom: "Brûlerie" }, produits, faits: FAITS })).toEqual([]);
    expect(V.raisonsDuRefusEnVrai(v, { inventaire: inv, personnes: false, photo: false, element: "produit-1", logo: { nom: "Brûlerie" }, produits }).join(" ")).toMatch(/faits ou produits inventés.*« 250 g »/);
    expect(V.raisonsDuRefusEnVrai({ ...v, textesLus: [...v.textesLus, "1 kg"] }, { inventaire: inv, personnes: false, photo: false, element: "produit-1", logo: { nom: "Brûlerie" }, produits, faits: FAITS }).join(" ")).toMatch(/« 1 kg »/);
    expect(V.raisonsDuRefusEnVrai({ ...v, textesLus: [...v.textesLus, "Nantes"] }, { inventaire: inv, personnes: false, photo: false, element: "produit-1", logo: { nom: "Brûlerie" }, produits, faits: FAITS })).toContain(F.RAISON_FAIT_NON_MONTRE);
    // Les blocs de texte : « Depuis 2019 » donné n'est pas une promesse à retirer.
    expect(V.promessesDuBloc(["Depuis 2019"], [], FAITS)).toEqual([]);
    expect(V.promessesDuBloc(["Depuis 1928"], [], FAITS)).toEqual(["Depuis 1928"]);
    // La reprise rappelle ses mentions vraies au dessinateur.
    expect(V.raisonsPourLeDessinateurEnVrai([`${V.DEBUT_FAITS_INVENTES_EN_VRAI}« 1 kg »`], { produits, faits: FAITS })[0]).toMatch(/et ses mentions vraies : .*« 250 g »/);
  });

  it("publications et site : ses mentions vraies sont des faits confirmés ; ce qu'il ne veut pas montrer est toujours signalé", () => {
    const p = { business: "products", product: { facts: [], questions: [] }, settings: {} } as any;
    expect(lintClaims("Torréfié chaque semaine depuis 2019, fabriqué en France.", p).map((c) => c.label).join(" ")).toMatch(/origine/);
    const extra = { facts: F.faitsPourLeControle(F.faitsPermis([{ sujet: "annee", etat: "donne", valeur: "2019", at: 1 }, { sujet: "fabrication", etat: "donne", valeur: "France", at: 1 }])), interdits: FAITS.interdits };
    expect(lintClaims("Torréfié chaque semaine depuis 2019, fabriqué en France.", p, extra)).toEqual([]);
    expect(lintClaims("Notre atelier de Nantes.", p, extra).map((c) => c.term)).toEqual(["Nantes"]);
    expect(F.ligneDesFaitsPourLesTextes(FAITS)).toMatch(/^Mentions vraies données par le client .*« 250 g »/);
    expect(F.ligneDesFaitsPourLesTextes(F.AUCUN_FAIT)).toBe("");
    // Branché : planIssues, la relecture des publications, la réécriture, la consigne et le contrôle du site.
    for (const [f, s] of [["src/lib/syna-agent/posts-plan.ts", "extraDesFaits(p.id)"], ["src/lib/social-v2/quality.ts", "extraDesFaits(p.id)"], ["src/lib/social-v2/engine.ts", "extraDesFaits(p.id)"], ["src/lib/syna-agent/custom-theme/brand.ts", "ligneDesFaitsPourLesTextes(faitsPermisDuProjet(p.id))"]] as const) expect(fs.readFileSync(f, "utf8"), f).toContain(s);
  });

  it("l'essai : le chef d'orchestre, qui joue le client, voit les questions de SINA et enregistre ses réponses dans la fiche de l'essai, sans appel", async () => {
    const O = await import("../scripts/syna-recette/faits-de-l-essai-outil");
    const client = O.lireLeClient("scripts/syna-recette/clients/torrefacteur.json");
    const q = await O.questionsDeLEssai(client);
    expect(q.sujets).toEqual(["noms", "formats", "origine", "mentions", "fabrication", "torrefaction", "notes_de_gout", "annee", "ville"]);
    expect(q.restent.map((x) => x.sujet)).toEqual(["noms", "annee", "ville"]);
    const c2 = await O.ajouterLesReponses(client, [{ sujet: "noms", noms: ["Café en grains", "Café moulu"] }, { sujet: "formats", valeur: "250 g" }, { sujet: "ville", etat: "ne_montre_pas" }]);
    expect((await O.questionsDeLEssai(c2)).restent.map((x) => x.sujet)).toEqual(["origine", "mentions", "fabrication", "torrefaction", "notes_de_gout", "annee"]);
    await expect(O.ajouterLesReponses(c2, [{ sujet: "origine", produit: "Coffret", valeur: "Pérou" }])).rejects.toThrow(/n'est pas l'un des noms donnés/);
    await expect(O.ajouterLesReponses(c2, [{ sujet: "durees", valeur: "1 h" }])).rejects.toThrow(/n'est pas un sujet de ce métier/);
    // Les scripts d'essai lisent ces faits comme la fiche du Studio.
    const { clientDeLEssai, faitsPermisDuClient, ficheDuClient } = await import("../scripts/syna-recette/client-de-l-essai");
    const tmp = `${process.env.DATA_DIR ?? "data"}/client-faits-${Date.now()}.json`;
    fs.mkdirSync(tmp.replace(/\/[^/]+$/, ""), { recursive: true });
    fs.writeFileSync(tmp, JSON.stringify(c2));
    const lu = clientDeLEssai({ CLIENT_JSON: tmp, CLIENT_NOM: "Brûlerie" });
    expect((await faitsPermisDuClient(lu)).mentions.map((m) => m.valeur)).toEqual(["250 g"]);
    expect(await ficheDuClient(lu)).toMatch(/Formats ou poids : « 250 g »/);
    fs.rmSync(tmp);
  });
});
