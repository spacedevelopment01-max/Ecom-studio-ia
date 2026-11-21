/**
 * Les faits du client dans son site (essai réel du 16 novembre 2026, premier site créé en une fois). Règles générales,
 * contrôlées sans IA : ce que le client a dit arrive au concepteur et au rédacteur ; une adresse discrète ne sort que
 * dans les informations légales ; un titre ne contredit jamais la liste affichée ; aucun « À compléter » pour un fait
 * donné ; la table des liens d'une section s'impose à ses boutons ; SINA rend toujours compte d'un travail payé.
 * IA simulée, aucun appel réel. Le client de ces tests est inventé pour eux (un service à domicile quelconque).
 */
import { describe, expect, it } from "vitest";

process.env.STUDIO_SYNA_AGENT = "1";

describe("SINA — les faits du client dans son site", async () => {
  const { one, all, run } = await import("@/lib/db");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { account, project } = await import("./conversation209-fixtures");
  const { threadFor } = await import("@/lib/syna-agent/thread");
  const { getTool } = await import("@/lib/syna-agent/registry");
  const { loadProject, remember, saveServices, saveBrand } = await import("@/lib/projects");
  const A = await import("@/lib/syna-agent/activity");
  const J = await import("@/lib/syna-agent/journey");
  const S = await import("@/lib/syna-agent/custom-theme/theme");
  const B = await import("@/lib/syna-agent/custom-theme/brand");
  const D = await import("@/lib/syna-agent/custom-theme/tenue-data");
  const R = await import("@/lib/syna-agent/custom-theme/render");
  const F = await import("@/lib/syna-agent/custom-theme/site-facts");
  const { libSection } = await import("@/lib/syna-agent/custom-theme/library");
  const { customThemeExport } = await import("@/lib/syna-agent/custom-theme/install");
  const fr = <X,>(fn: () => Promise<X> | X) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());

  const PRESTATIONS = [
    { name: "Visite de contrôle", duration: "30 min", price: "25 €" }, { name: "Entretien complet", duration: "1 h 30", price: "60 €" },
    { name: "Remise en état", duration: "2 h", price: "90 €" }, { name: "Dépannage sur place", duration: "", price: "40 €" },
  ];
  const ADDRESS = "12 rue des Tilleuls, 44000 Nantes";
  /** Un métier qui se déplace : quatre prestations, des horaires, une zone, une adresse qu'il ne veut pas montrer. */
  async function client(o: { discreet?: boolean } = {}) {
    const user = await account();
    const pid = project(user, "services");
    const cid = threadFor(user, pid);
    const p0 = loadProject(pid);
    saveServices(pid, { ...p0.services, services: PRESTATIONS.map((x) => ({ ...x, source: "client" })) as any, hours: "Du lundi au samedi de 8 h à 19 h", area: "Nantes, Rezé et Saint-Herblain", phone: "06 00 00 00 00", address: "" }, p0.servicesVersion);
    saveBrand(pid, { name: "Atelier Passage", tagline: "", positioning: "Un service qui vient à toi.", audience: "Les habitants du quartier.", personality: ["franc"], tone: { voice: "simple" }, logo: { assetId: null, status: "none" } } as any);
    A.saveCompany(pid, { legalName: "Atelier Passage EI", email: "bonjour@example.invalid", address: ADDRESS, ...(o.discreet === undefined ? {} : { addressDiscreet: o.discreet }) });
    const ctx: any = { user, conversationId: cid, runId: `run-${Math.random().toString(36).slice(2, 9)}`, projectId: pid, attachment: () => null };
    return { user, pid, cid, ctx };
  }
  const section = (id: string, uid: string, more: Record<string, unknown> = {}) => ({ id, uid, ...more });
  /** Un site de services monté à la main avec les pièces qui lisent le profil. */
  function theme(pid: string, more: { prestations?: Record<string, unknown>; pied?: Record<string, unknown> } = {}) {
    const t: any = { version: 1, family: "classique", style: "classique", header: null, footer: section("tn-pied-services", "sfaits0003", more.pied), search: null, rev: 0, at: 0,
      pages: [{ key: "home", label: "Accueil", sections: [section("tn-prestations", "sfaits0001", more.prestations)] }, { key: "prestations", label: "Prestations", sections: [section("tn-acces", "sfaits0002")] },
        { key: "reservation", label: "Réserver", sections: [] }, { key: "legal", label: "Informations légales", sections: [] }] };
    return S.saveCustomTheme(pid, t);
  }
  const call = (name: string, ctx: any, args: unknown): Promise<any> => fr(() => getTool(name)!.run(ctx, getTool(name)!.args.parse(args)));

  // ------------------------------------------------------------ 1. Ce que le client a dit arrive dans le dossier

  it("les notes prises par SINA (mémoire du projet) entrent dans le dossier ; les clés du Studio n'y entrent pas", async () => {
    const c = await client();
    ({ ok: (await import("@/lib/syna-agent/fiche")).addNotes(c.ctx.conversationId, [{ sujet: "Paiement", value: "Espèces ou virement, à la fin de la prestation." }]).notes.length > 0 });
    ({ ok: (await import("@/lib/syna-agent/fiche")).addNotes(c.ctx.conversationId, [{ sujet: "Prévenir le client", value: "Par SMS la veille." }]).notes.length > 0 });
    // Clés écrites par le Studio lui-même : jamais prises pour une parole du client.
    remember(c.pid, { kind: "decision", key: "syna.identite", value: JSON.stringify({ base: "a" }), source: "user" } as any);
    remember(c.pid, { kind: "decision", key: "syna.depart", value: "Étape 0 validée par le client.", source: "user" } as any);
    remember(c.pid, { kind: "artifact", key: "syna.custom_theme", value: "{}", source: "local", origin: "system" as any });
    remember(c.pid, { kind: "fact", key: "syna.Devis", value: "déduit par une analyse", source: "ai" });
    const notes = F.clientNotes(c.pid);
    expect(notes.map((n) => n.title).sort()).toEqual(["Paiement", "Prévenir le client"]);
    const brief = B.brandBrief(loadProject(c.pid), null);
    expect(brief).toContain("CE QUE LE CLIENT A DIT (ses mots, à reprendre tels quels, jamais à redemander");
    expect(brief).toContain("- Paiement : Espèces ou virement, à la fin de la prestation.");
    expect(brief).toContain("- Prévenir le client : Par SMS la veille.");
    expect(brief).not.toMatch(/Étape 0 validée|déduit par une analyse/);
    // Entreprise de services : ses prestations, ses horaires et sa zone sont au dossier (ils n'y étaient pas).
    expect(brief).toMatch(/Prestations \(noms, durées et prix exacts ; il y en a 4, toutes affichées/);
    expect(brief).toContain("Visite de contrôle (30 min, 25 €)");
    expect(brief).toContain("Horaires (donnés par le client) : Du lundi au samedi de 8 h à 19 h.");
    expect(brief).toContain("Zone desservie (donnée par le client) : Nantes, Rezé et Saint-Herblain.");
  });

  it("taille raisonnable : les notes les plus récentes, chacune coupée, jamais tout l'historique", async () => {
    const c = await client();
    for (let i = 0; i < 40; i++) remember(c.pid, { kind: "fact", key: `syna.Note ${i}`, value: "x".repeat(900), status: "confirmed", source: "user", origin: "user" as any });
    const notes = F.clientNotes(c.pid);
    expect(notes.length).toBeLessThanOrEqual(F.NOTES_MAX);
    expect(notes.every((n) => n.value.length <= F.NOTE_MAX_CHARS)).toBe(true);
    expect(notes.reduce((s, n) => s + n.value.length, 0)).toBeLessThanOrEqual(F.NOTES_MAX_CHARS);
    expect(F.clientNotesBrief((await client()).pid)).toBe(""); // sans note : aucune partie vide dans le dossier
  });

  // ------------------------------------------------------------ 2. L'adresse discrète

  it("fiche de l'entreprise : le réglage « adresse discrète » s'enregistre, se garde, et SINA peut le poser", async () => {
    const c = await client();
    expect(A.addressDiscreet(c.pid)).toBe(false);
    const r = await call("activity.company", c.ctx, { addressDiscreet: true });
    expect(r.ok).toBe(true);
    expect(r.summary).toMatch(/Adresse discrète : elle ne s'écrit que dans les informations légales/);
    expect(A.companyOf(c.pid).addressDiscreet).toBe(true);
    // Une autre coordonnée enregistrée ensuite ne l'efface pas ; l'adresse reste dans la fiche (pour les mentions légales).
    await call("activity.company", c.ctx, { fields: { siret: "12345678900011" } });
    expect(A.companyOf(c.pid)).toMatchObject({ addressDiscreet: true, address: ADDRESS, siret: "12345678900011" });
    await call("activity.company", c.ctx, { addressDiscreet: false });
    expect(A.addressDiscreet(c.pid)).toBe(false);
    // La consigne de l'étape 5 et la notice de l'outil disent quand le demander.
    const guide = J.activityStepContext({ start: {} } as any).join("\n");
    expect(guide).toMatch(/un métier sans local qui reçoit du public \(il travaille chez lui et se déplace chez ses clients\) : demande-lui, en une question, si son adresse doit s'afficher/);
    expect(guide).toMatch(/activity\.company addressDiscreet/);
    expect(guide).toMatch(/par défaut discrète pour quelqu'un qui travaille chez lui et se déplace/);
    expect(getTool("activity.company")!.description).toMatch(/addressDiscreet = « adresse discrète »/);
  });

  it("aucun remplissage automatique ne montre une adresse discrète : ni pied, ni accès, ni itinéraire ; la zone à la place, sans trou", async () => {
    const pied = libSection("tn-pied-services")!.html, acces = libSection("tn-acces")!.html, hero = libSection("tn-ouverture-metier")!.html;
    const site = { phone: "06 00 00 00 00", address: null, addressDiscreet: true, hours: "Du lundi au samedi de 8 h à 19 h", area: "Nantes, Rezé et Saint-Herblain" };
    // Pied de page : il montre déjà les villes ; le bloc « Nous trouver » se retire en entier.
    const p = D.withTenueContact(pied, site);
    expect(p).not.toMatch(/data-tn-adresse|data-tn-itineraire|Voir l'itinéraire|Nous trouver|À compléter : adresse/);
    expect(p).toContain("<li>Nantes</li><li>Rezé</li><li>Saint-Herblain</li>");
    expect(p).toMatch(/<th>Du lundi au samedi<\/th>/);
    expect((p.match(/class="tn-p-bloc"/g) ?? []).length).toBe(2);
    // Section d'accès (sans emplacement de zone) : la zone prend la place de l'adresse, le bouton d'itinéraire s'en va.
    const a = D.withTenueContact(acces, site);
    expect(a).toContain("<address data-tn-adresse>Nantes, Rezé et Saint-Herblain</address>");
    expect(a).not.toMatch(/data-tn-itineraire|Voir l'itinéraire|À compléter : adresse/);
    // Sans zone connue : l'emplacement se retire, rien n'est laissé « À compléter ».
    expect(D.withTenueContact(acces, { ...site, area: null })).not.toMatch(/data-tn-adresse|itin/);
    // Ouverture d'un métier : le repère « Adresse » se retire, la zone reste dans le sien.
    const h = D.withTenueContact(hero, site);
    expect(h).not.toMatch(/class="tn-adr"|À compléter : adresse|data-tn-adresse/);
    expect(h).toContain('<span data-tn-zone="ligne">Nantes, Rezé et Saint-Herblain</span>');
    // Adresse affichée (réglage absent) : rien ne change pour les sites existants.
    const shown = D.withTenueContact(pied, { ...site, address: ADDRESS, addressDiscreet: false });
    expect(shown).toContain(`<span data-tn-adresse>${ADDRESS}</span>`);
    expect(shown).toMatch(/openstreetmap\.org\/directions\?to=/);
  });

  it("aperçu ET mise en boutique : une adresse discrète n'y est jamais posée", async () => {
    const c = await client({ discreet: true });
    const t = theme(c.pid);
    const p = loadProject(c.pid);
    expect(R.tenueSite(p, t, [], [])).toMatchObject({ address: null, addressDiscreet: true, area: "Nantes, Rezé et Saint-Herblain" });
    const html = await fr(() => R.renderCustomTheme(p, t));
    expect(html).not.toContain("12 rue des Tilleuls");
    expect(html).not.toMatch(/openstreetmap\.org\/directions/);
    const out = await fr(() => customThemeExport(c.pid, { dropMissing: true }));
    const liquid = Object.values(out.spec.customSections).map((s: any) => s.liquid).join("\n");
    expect(liquid).not.toContain("12 rue des Tilleuls");
    expect(liquid).not.toMatch(/openstreetmap\.org\/directions|Voir l'itinéraire/);
    // Le même site, adresse affichée : elle y est, avec son itinéraire.
    A.saveCompany(c.pid, { addressDiscreet: false });
    expect(await fr(() => R.renderCustomTheme(loadProject(c.pid), t))).toContain("12 rue des Tilleuls");
    // Le dossier du rédacteur le dit en clair.
    A.saveCompany(c.pid, { addressDiscreet: true });
    J.updateJourney(c.cid, (x) => { x.activity = undefined as any; });
    expect(B.brandBrief(loadProject(c.pid), J.journeyOf(c.cid))).toMatch(/ADRESSE DISCRÈTE \(demande du client\) : son adresse ne s'écrit QUE dans les informations légales/);
  });

  // ------------------------------------------------------------ 3 et 4. Le rédacteur connaît ce qui s'affichera ; contrôle après écriture

  const FACTS = (more: Partial<ReturnType<typeof F.siteFacts>> = {}): ReturnType<typeof F.siteFacts> => ({
    site: { phone: "06 00 00 00 00", address: null, hours: "Du lundi au samedi de 8 h à 19 h", area: "Nantes, Rezé et Saint-Herblain", prestations: PRESTATIONS as any },
    prestations: PRESTATIONS.map((x) => ({ ...x, duration: x.duration || null })) as any, products: [], notes: [{ title: "Paiement", value: "Espèces ou virement." }], address: ADDRESS, discreet: false, ...more });

  it("la consigne d'une pièce à liste automatique donne les faits exacts qui s'afficheront", () => {
    const text = F.shownFacts(libSection("tn-prestations")!.html, FACTS());
    expect(text).toMatch(/^CE QUE LE STUDIO AFFICHERA LUI-MÊME DANS CETTE SECTION/);
    expect(text).toContain("exactement 4 prestations, dans cet ordre : Visite de contrôle (30 min, 25 €) ; Entretien complet (1 h 30, 60 €) ; Remise en état (2 h, 90 €) ; Dépannage sur place (40 €)");
    expect(text).toMatch(/Le titre et le texte ne donnent JAMAIS un nombre qui contredit ce qui s'affiche/);
    const pied = F.shownFacts(libSection("tn-pied-services")!.html, FACTS());
    expect(pied).toMatch(/Horaires affichés \(ceux du client\) : Du lundi au samedi de 8 h à 19 h\./);
    expect(pied).toContain("Zone affichée (celle du client) : Nantes, Rezé et Saint-Herblain.");
    expect(F.shownFacts(libSection("tn-pied-services")!.html, FACTS({ discreet: true }))).toMatch(/ADRESSE DISCRÈTE : le client ne veut pas que son adresse soit mise en avant/);
    // Une section sans emplacement automatique : rien n'est ajouté à sa consigne.
    expect(F.shownFacts('<section class="tn tn-recit"><h2>Titre</h2><p>Texte</p></section>', FACTS())).toBe("");
    expect(B.SECTION_WRITE_SYSTEM).toMatch(/jamais « trois formules » devant une liste de cinq/);
    expect(B.sectionWritePrompt("DOSSIER", "Accueil", "Les prestations", "…", "<section></section>", undefined, { shown: text })).toContain("exactement 4 prestations");
  });

  it("un nombre dans le titre d'une liste automatique, différent du nombre affiché, est signalé", () => {
    const html = (title: string) => libSection("tn-prestations")!.html.replace(/<h2>[\s\S]*?<\/h2>/, `<h2>${title}</h2>`);
    expect(F.factFlags(html("Deux étiquettes, deux prix."), FACTS())[0]).toMatch(/le titre « Deux étiquettes, deux prix\. » annonce « Deux » alors que la liste de cette section affichera 4 prestations \(Visite de contrôle, Entretien complet, Remise en état, Dépannage sur place\)/);
    expect(F.factFlags(html("2 tarifs, pas un de plus"), FACTS()).join(" ")).toMatch(/annonce « 2 »/);
    expect(F.factFlags(html("Quatre gestes, quatre prix."), FACTS())).toEqual([]);
    expect(F.factFlags(html("Nos tarifs, sans surprise."), FACTS())).toEqual([]);
    // Une heure, une durée ou un prix n'est pas un compte.
    expect(F.factFlags(html("Chez toi en 2 heures, dès 25 €"), FACTS())).toEqual([]);
    expect(F.countsInTitle("Ouvert de 8 h à 19 h")).toEqual([]);
    // Une section sans liste automatique n'est jamais lue ainsi.
    expect(F.factFlags('<section class="tn tn-recit"><h2>Deux mains, un métier.</h2></section>', FACTS())).toEqual([]);
  });

  it("un « À compléter » encore visible pour un fait présent au dossier est signalé ; un emplacement rempli par le Studio ne l'est pas", () => {
    // Le pied de page : ses emplacements d'horaires, de zone et de téléphone sont remplis par le profil → rien à signaler.
    expect(F.factFlags(libSection("tn-pied-services")!.html, FACTS({ site: { ...FACTS().site, address: ADDRESS } }))).toEqual([]);
    const written = '<section class="tn tn-recit"><h2>Comment ça se passe</h2><p>Ouvert [À compléter : jours et horaires].</p><p>Tu règles par [À compléter : moyen de paiement].</p><p>[À compléter : façon de te prévenir]</p><p>[À compléter : année de création]</p></section>';
    const flags = F.factFlags(written, FACTS({ notes: [{ title: "Paiement", value: "Espèces ou virement." }, { title: "Prévenir le client", value: "Par SMS la veille." }] }));
    expect(flags).toHaveLength(3);
    expect(flags[0]).toMatch(/« \[À compléter : jours et horaires\] » est écrit alors que le client a donné ses horaires : Du lundi au samedi/);
    expect(flags[1]).toMatch(/moyen de paiement\] » est écrit alors que le client a donné « Paiement : Espèces ou virement\. »/);
    expect(flags[2]).toMatch(/façon de te prévenir\] » est écrit alors que le client a donné « Prévenir le client : Par SMS la veille\. »/);
    // Adresse discrète écrite hors des informations légales : signalée ; dans les informations légales : jamais.
    const withAddress = `<section class="tn tn-recit"><p>Passe nous voir au ${ADDRESS}.</p></section>`;
    expect(F.factFlags(withAddress, FACTS({ discreet: true }), "contact")[0]).toMatch(/l'adresse du client .* est écrite ici alors qu'il la veut seulement dans les informations légales/);
    expect(F.factFlags(withAddress, FACTS({ discreet: true }), "legal")).toEqual([]);
    expect(F.factFlags(withAddress, FACTS(), "contact")).toEqual([]);
  });

  it("montage simulé : le rédacteur reçoit notes et faits affichés ; ce qui contredit le dossier va au relecteur puis au compte rendu", async () => {
    const c = await client({ discreet: true });
    ({ ok: (await import("@/lib/syna-agent/fiche")).addNotes(c.ctx.conversationId, [{ sujet: "Paiement", value: "Espèces ou virement, à la fin de la prestation." }]).notes.length > 0 });
    theme(c.pid);
    const prompts: string[] = [], reviews: string[] = [];
    B.customBrandDeps.plan = async (prompt) => ({ promesse: "Un service qui vient à toi.", voix: "Phrases courtes.", menu: [], sections: [...prompt.matchAll(/^- (s[0-9a-z]{8,10}) · /gm)].map((m, i) => ({ uid: m[1], message: `Message ${i}`, titre: null, bouton: null, faits: [] })), seo: [] });
    B.customBrandDeps.seo = async () => ({ seo: [] });
    B.customBrandDeps.write = async (prompt) => {
      prompts.push(prompt);
      if (/Section à adapter : « Les prestations et leurs prix »/.test(prompt)) { const h2 = /<h2>[\s\S]*?<\/h2>/.exec(prompt.slice(prompt.indexOf("HTML actuel")))![0]; return { edits: [{ find: h2, replace: "<h2>Deux tarifs, tout compris.</h2>" }], links: [], photos: [] }; }
      return { edits: [], links: [], photos: [] };
    };
    B.customBrandDeps.review = async (prompt) => { reviews.push(prompt); return { sections: [], site: "Relu." }; };
    try {
      const report: any = await fr(() => B.runCustomBrandJob({ job: { id: `job-faits-${Date.now()}` }, payload: { projectId: c.pid, capMicro: 10_000_000, conversationId: null, photos: false, newPhotos: false, pages: null, images: "sina", clientAssets: [], rewrite: false, consigne: null }, checkpoint: {}, progress: () => undefined, step: async (_k: string, fn: () => Promise<unknown>) => fn() } as any));
      const prest = prompts.find((x) => /Section à adapter : « Les prestations et leurs prix »/.test(x))!;
      expect(prest).toContain("- Paiement : Espèces ou virement, à la fin de la prestation.");
      expect(prest).toContain("exactement 4 prestations, dans cet ordre : Visite de contrôle (30 min, 25 €)");
      const pied = prompts.find((x) => /Section à adapter : « Pied de page de services »/.test(x))!;
      expect(pied).toMatch(/Horaires affichés \(ceux du client\)/);
      expect(pied).toMatch(/ADRESSE DISCRÈTE : le client ne veut pas que son adresse soit mise en avant/);
      // Le relecteur reçoit le signalement, attaché à la section ; le compte rendu le garde s'il n'est pas corrigé.
      expect(reviews[0]).toMatch(/CONTREDIT LE DOSSIER DU CLIENT \(contrôle du Studio\), à faire corriger : le titre « Deux tarifs, tout compris\. » annonce « Deux » alors que la liste de cette section affichera 4 prestations/);
      expect(report.problems.join("\n")).toMatch(/Les prestations et leurs prix \(Accueil\) : le titre « Deux tarifs, tout compris\. » annonce « Deux »/);
    } finally { delete B.customBrandDeps.plan; delete B.customBrandDeps.seo; delete B.customBrandDeps.write; delete B.customBrandDeps.review; }
  });

  // ------------------------------------------------------------ 6. Une seule façon de faire le site

  it("après la validation de l'activité, plus de « thème du Studio ou thème sur mesure »", async () => {
    const src = (await import("node:fs")).readFileSync("src/lib/syna-agent/tools/activity.ts", "utf8");
    expect(src).toContain("Prochaine étape : ton site.");
    expect(src).not.toMatch(/thème du Studio ou|thème sur mesure/);
    expect(getTool("activity.validate")!.description).not.toMatch(/thème/);
  });

  // ------------------------------------------------------------ 7. Les liens

  it("la table des liens d'une section s'impose à l'attribut de ses boutons, dans l'aperçu comme en boutique", async () => {
    const html = '<section class="tn tn-recit"><a class="tn-bt" href="#" onclick="return false" data-go="reservation">Voir le détail des prestations</a><a class="tn-bt" href="#" onclick="return false" data-go="shop">Réserver mon matin&nbsp;→</a><a href="#" onclick="return false" data-go="contact">Nous écrire</a></section>';
    const out = S.withSectionLinks(html, { "Voir le détail des prestations": "prestations", "Réserver mon matin": "reservation" });
    expect(out).toContain('data-go="prestations">Voir le détail des prestations</a>');
    expect(out).toContain('data-go="reservation">Réserver mon matin&nbsp;→</a>');
    expect(out).toContain('data-go="contact">Nous écrire</a>'); // sans entrée dans la table : inchangé
    expect(S.withSectionLinks(html, undefined)).toBe(html);
    // Lue par tout le monde : l'aperçu, la mise en boutique et le contrôle voient le lien de la table.
    expect(S.sectionHtml({ id: "tn-recit", uid: "sx", html, links: { "Réserver mon matin": "reservation" } } as any)).toContain('data-go="reservation">Réserver mon matin');
    const c = await client();
    const t = theme(c.pid, { prestations: { html: libSection("tn-prestations")!.html.replace("</section>", '<a class="tn-bt" href="#" onclick="return false" data-go="shop">Réserver mon matin</a></section>'), links: { "Réserver mon matin": "reservation" }, clientTexts: true } });
    const preview = await fr(() => R.renderCustomTheme(loadProject(c.pid), t));
    expect(preview).toContain('data-go="reservation">Réserver mon matin</a>');
    expect(preview).not.toContain('data-go="shop">Réserver mon matin');
    const liquid = Object.values((await fr(() => customThemeExport(c.pid, { dropMissing: true }))).spec.customSections).map((s: any) => s.liquid).join("\n");
    expect(liquid).toMatch(/href="\{\{ routes\.root_url \}\}pages\/reservation"[^>]*>Réserver mon matin<\/a>/);
  });

  it("un bouton écrit pour le client qui mène à une page absente du site est signalé au contrôle", async () => {
    const c = await client();
    const dead = libSection("tn-prestations")!.html.replace("</section>", '<a class="tn-bt" href="#" onclick="return false" data-go="shop">Voir la boutique</a></section>');
    const t = theme(c.pid, { prestations: { html: dead, clientTexts: true } });
    expect(S.deadLinks(t).map((d) => `${d.text} → ${d.to}`)).toContain("Voir la boutique → shop");
    expect(S.checkCustomTheme(t).filter((x) => x.level === "à revoir").map((x) => x.text).join("\n")).toMatch(/« Les prestations et leurs prix » \(Accueil\) : le bouton « Voir la boutique » mène à une page qui n'existe pas dans ce site \(shop\)/);
    // La table des liens le répare : plus rien à signaler pour ce bouton.
    const fixed = theme(c.pid, { prestations: { html: dead, clientTexts: true, links: { "Voir la boutique": "prestations" } } });
    expect(S.deadLinks(fixed).some((d) => d.text === "Voir la boutique")).toBe(false);
  });

  // ------------------------------------------------------------ 5. Le budget des réponses après un travail payé

  it("le reste d'un accord donné sur la carte sert à en rendre compte, sans jamais dépasser le plafond accepté", async () => {
    const { addMessage, createRun, setAuthorizedBudget } = await import("@/lib/syna-agent/store");
    const G = await import("@/lib/syna-agent/budget");
    const c = await client();
    const r = createRun({ conversationId: c.cid, userId: c.user.id, projectId: c.pid, requestId: `faits-${Date.now()}` });
    const spend = (jobId: string, micro: number) => run("INSERT INTO ai_calls(id,created_at,user_id,project_id,job_id,task,provider,requested_model,unit,cost,status) VALUES(?,?,?,?,?,?,?,?,?,?,?)", `c-${jobId}-${Math.random()}`, Date.now(), c.user.id, c.pid, jobId, "strategy", "anthropic", "test", "request", micro, "ok");
    setAuthorizedBudget(c.cid, 1_000_000);
    // Les réponses de SINA ont consommé tout leur budget.
    G.trackJob(c.cid, r.id, "job-reponses", "agent"); spend("job-reponses", 1_000_000);
    expect(G.budgetState(c.user.id, c.pid, c.cid).remainingMicro).toBe(0);
    // Sans carte acceptée : rien de plus (aucune dépense non accordée).
    expect(G.approvedRemainderMicro(c.cid, r.id)).toBe(0);
    // Une carte montrée mais pas encore acceptée ne donne rien non plus.
    addMessage(c.cid, "event", { kind: "confirmation", pending: { id: "carte-1", tool: "site.create", reason: "cost", costMaxMicro: 8_000_000 } }, r.id);
    expect(G.approvedRemainderMicro(c.cid, r.id)).toBe(0);
    // Acceptée : plafond 8, la création en a dépensé 5,47 → il reste 2,53 pour en rendre compte.
    addMessage(c.cid, "event", { kind: "approved", pendingId: "carte-1", tool: "site.create" }, r.id);
    G.trackJob(c.cid, r.id, "job-site", "native"); spend("job-site", 5_470_000);
    expect(G.approvedRemainderMicro(c.cid, r.id)).toBe(2_530_000);
    expect(G.replyAllowanceMicro(c.user.id, c.pid, c.cid, r.id)).toBe(2_530_000);
    // Le compte rendu coûte 0,5 : il est pris sur ce reste, compté une seule fois ; création + compte rendu ≤ plafond.
    spend("job-reponses", 500_000);
    expect(G.replyAllowanceMicro(c.user.id, c.pid, c.cid, r.id)).toBe(2_030_000);
    // Une création qui a pris tout son plafond ne laisse rien ; une autre demande ne profite jamais de cet accord.
    spend("job-site", 2_530_000);
    expect(G.replyAllowanceMicro(c.user.id, c.pid, c.cid, r.id)).toBe(0);
    const other = createRun({ conversationId: c.cid, userId: c.user.id, projectId: c.pid, requestId: `faits-autre-${Date.now()}` });
    expect(G.approvedRemainderMicro(c.cid, other.id)).toBe(0);
  });

  it("budget atteint juste après une création payée : SINA dit sans IA ce qui est fait, puis la carte du budget s'affiche", async () => {
    const { addMessage, createRun, getRun } = await import("@/lib/syna-agent/store");
    const { runAgent } = await import("@/lib/syna-agent/loop");
    const { CostCapReached } = await import("@/lib/ai/trace");
    const c = await client();
    const r = createRun({ conversationId: c.cid, userId: c.user.id, projectId: c.pid, requestId: `faits-muet-${Date.now()}` });
    addMessage(c.cid, "user", { text: "Crée mon site." }, r.id);
    addMessage(c.cid, "tool", { key: "jobs:1", tool: "jobs.wait", ok: true, summary: "Tâche terminée : je relis le résultat.", data: [{ job: "job-x", type: "syna.posts.plan", status: "done" }] }, r.id);
    const calls = one<{ n: number }>("SELECT COUNT(*) n FROM ai_calls")!.n;
    const out: any = await fr(() => runAgent(r.id, "job-agent-muet", { reason: async () => { throw new CostCapReached(1, 1, 1); } }));
    expect(out.waiting).toBe("budget");
    expect(getRun(r.id)!.status).toBe("waiting_confirmation");
    const said = all<{ content_json: string }>("SELECT content_json FROM syna_messages WHERE conversation_id=? AND run_id=? AND role='assistant'", c.cid, r.id).map((m) => JSON.parse(m.content_json));
    expect(said).toHaveLength(1);
    expect(said[0].sansIa).toBe(true);
    expect(said[0].message).toMatch(/^Ce que tu m'as demandé de créer est terminé et enregistré dans ton projet\. Le budget de mes réponses est atteint : je ne peux pas encore te présenter ce travail/);
    expect(one<{ n: number }>("SELECT COUNT(*) n FROM ai_calls")!.n).toBe(calls); // rien de dépensé
    // Une nouvelle reprise sans budget ne répète pas le message.
    run("UPDATE syna_runs SET status='queued', pending_json=NULL WHERE id=?", r.id);
    await fr(() => runAgent(r.id, "job-agent-muet", { reason: async () => { throw new CostCapReached(1, 1, 1); } }));
    expect(all("SELECT 1 FROM syna_messages WHERE conversation_id=? AND run_id=? AND role='assistant'", c.cid, r.id)).toHaveLength(1);
  });
});
