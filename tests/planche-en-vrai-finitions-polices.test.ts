/**
 * La planche en vrai, identique en visuel (26 novembre 2026, essai réel d'Écume) : aucun appel.
 *  1. Une petite finition notée (au verdict de la planche choisie ou à l'inventaire) n'arrive jamais dans le Studio du
 *     client : le bloc 10 (et le ton) sont redessinés par le code, leurs lignes nettoyées des signes isolés ; tout texte
 *     que le code écrit est nettoyé. Verdict réel de A-2 copié tel quel dans tests/fixtures/ecume-planches-2.
 *  2. La police suit l'aperçu que le client a vu : « Nunito » montrée en écriture manuscrite sur la planche B.
 */
import fs from "node:fs";
import { describe, expect, it } from "vitest";

const F = "tests/fixtures/ecume-planches-2";
const FAUTE = "Titre SEO (bloc 10) : « Écume – Savonnerie artisanale |´ » — accent parasite après la barre de séparation";

describe("la planche en vrai : une finition notée n'arrive jamais dans le Studio du client", async () => {
  const PM = await import("@/lib/syna-agent/planche-de-marque");
  const P = await import("@/lib/syna-agent/planche-en-vrai");
  const T = await import("@/lib/syna-agent/planche-en-vrai-tache");
  const { BoardSchema } = await import("@/lib/syna-agent/brand-board");
  const texte = fs.readFileSync(`${F}/planche-A-2-texte-envoye.txt`, "utf8");
  const verdict = PM.VerdictRangeDeLaPlancheSchema.parse(JSON.parse(fs.readFileSync(`${F}/planche-A-2-relecture-verdict.json`, "utf8")).verdict);
  const finitions = PM.lectureDeLaPlanche(verdict, { nom: "Écume", annee: 2026, domaine: { domaine: "ecumefrance.fr", statut: "disponible" }, personnes: false, animaux: false, phrase: ["SAVONNERIE ARTISANALE", "BULLES DE SOIN AU NATUREL"], texte }).finitions;
  const route = (planche: Record<string, unknown> = {}) => ({ key: "A", name: "Écume", slogan: "SAVONNERIE ARTISANALE / BULLES DE SOIN AU NATUREL", palette: { dark: "#1C2A24" }, board: { planche: { image: { id: "pl", w: 1536, h: 2304 }, logo: "lg", domaine: "ecumefrance.fr", statut: "disponible", annee: 2026, essais: 2, at: 1, ...planche } } }) as any;
  const inventaire = (cases: Record<string, string[]>) => P.InventaireSchema.parse({ cases: Object.entries(cases).map(([c, textes]) => ({ case: c, textes })), polices: { titres: { nom: "Playfair Display", genre: "serif" }, textes: { nom: "Montserrat", genre: "sans" } } });
  const JUSTE = ["Écume – Savonnerie artisanale", "Savons solides, shampoings solides et baumes faits à la main.", "ecumefrance.fr — disponible", "© 2026 Écume"];

  it("le verdict réel de A-2 : sa finition, notée sur la planche choisie, fait redessiner le bloc 10 par le code ; l'accent n'y est plus", () => {
    expect(finitions).toEqual([FAUTE]);
    // La finition voyage avec la planche gardée (schéma de la planche).
    const pl = BoardSchema.shape.planche.parse({ logo: "lg01", domaine: "ecumefrance.fr", statut: "disponible", annee: 2026, essais: 2, at: 1, finitions });
    expect(pl!.finitions).toEqual([FAUTE]);
    // L'inventaire a lu le bloc 10 juste (copyright et domaine exacts) : sans finition, le décor serait gardé tel quel.
    expect(T.textesDeLaPlanche(inventaire({ seo: JUSTE }), route()).blocs.get("seo")).toBeNull();
    // Avec la finition notée : redessiné par le code, jamais l'accent.
    const t = T.textesDeLaPlanche(inventaire({ seo: JUSTE }), route({ finitions }));
    const bloc = t.blocs.get("seo")!;
    expect(bloc).toBeTruthy();
    expect(bloc.lignes).toEqual(JUSTE);
    expect(bloc.lignes.join(" ")).not.toMatch(/´|\|/);
    expect(t.notes.join(" | ")).toContain(`bloc 10 redessiné : petite finition nettoyée par le code (${FAUTE})`);
    // L'inventaire a recopié l'accent : la ligne est nettoyée (le tiret entre deux mots reste).
    const lu = T.textesDeLaPlanche(inventaire({ seo: ["Écume – Savonnerie artisanale |´", ...JUSTE.slice(1)] }), route({ finitions }));
    expect(lu.blocs.get("seo")!.lignes).toEqual(JUSTE);
    // L'inventaire n'a pas lu la ligne du titre : le texte de la finition, nettoyé, tient sa place.
    expect(T.textesDeLaPlanche(inventaire({ seo: JUSTE.slice(1) }), route({ finitions })).blocs.get("seo")!.lignes).toEqual(JUSTE);
    // L'inventaire n'a rien lu du bloc 10 : redessiné quand même, jamais vide, avec le titre nettoyé et les données vérifiées.
    expect(T.textesDeLaPlanche(inventaire({}), route({ finitions })).blocs.get("seo")!.lignes).toEqual(["Écume – Savonnerie artisanale", "© 2026 Écume", "ecumefrance.fr — disponible"]);
  });

  it("une finition lue à l'inventaire seulement, ou dans un autre texte écrit par le code : nettoyée aussi", () => {
    const t = T.textesDeLaPlanche(inventaire({ seo: ["Écume – Savonnerie artisanale |´", ...JUSTE.slice(1)], ton: ["Douce ´", "Naturelle"], haut: ["Planche d'identité ¨"], "titre-01": ["Système de logos ´"] }), route());
    expect(t.blocs.get("seo")!.lignes).toEqual(JUSTE);
    expect(t.blocs.get("ton")).toEqual({ lignes: ["Douce", "Naturelle"] });
    expect(t.haut).toEqual(["Planche d'identité"]);
    expect(t.titres.get("titre-01")).toBe("Système de logos");
    // Rien de parasite : rien ne change (le décor gardé, la ponctuation française gardée).
    const r = T.textesDeLaPlanche(inventaire({ seo: JUSTE, ton: ["Dites-le-nous !", "Douce : naturelle"] }), route());
    expect(r.blocs.get("seo")).toBeNull();
    expect(r.blocs.get("ton")).toBeNull();
  });

  it("le nettoyage : seuls les signes sûrement parasites, jamais la ponctuation ni un séparateur entre deux mots", () => {
    expect(PM.nettoyerLesSignesIsoles("Écume – Savonnerie artisanale |´")).toBe("Écume – Savonnerie artisanale");
    expect(PM.nettoyerLesSignesIsoles("Écume – Savonnerie artisanale | ´")).toBe("Écume – Savonnerie artisanale");
    expect(PM.nettoyerLesSignesIsoles("Écume | Savonnerie artisanale")).toBe("Écume | Savonnerie artisanale");
    expect(PM.nettoyerLesSignesIsoles("Dites-le-nous !")).toBe("Dites-le-nous !");
    expect(PM.nettoyerLesSignesIsoles("« Bulles de soin » : au naturel ?")).toBe("« Bulles de soin » : au naturel ?");
    expect(PM.nettoyerLesSignesIsoles("Savons . solides")).toBe("Savons solides");
    // Un signe dans un mot n'est pas retiré par le nettoyage (c'est une faute : la planche est refusée par le relecteur).
    expect(PM.nettoyerLesSignesIsoles("Savonne´rie")).toBe("Savonne´rie");
  });
});

describe("la planche en vrai : la police suit l'aperçu que le client a vu", async () => {
  const C = await import("@/lib/syna-agent/planche-en-vrai-code");
  const P = await import("@/lib/syna-agent/planche-en-vrai");
  const { runWithLang } = await import("@/lib/i18n-server");
  const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());

  it("B d'Écume : « Nunito » montrée en écriture manuscrite ; la police prise est la manuscrite la plus proche, comptée remplacée et dite", async () => {
    // Le verdict réel de B-2, copié tel quel : le relecteur l'a vu.
    const b = JSON.parse(fs.readFileSync("tests/fixtures/ecume-planches-2/planche-B-2-relecture-verdict.json", "utf8")).verdict;
    expect(b.pourquoi).toContain("la police « Nunito » est présentée en écriture manuscrite");
    expect(b.microTextes.filter((m: string) => /alphabet manuscrit Nunito/.test(m))).toHaveLength(2);
    // Nunito est au catalogue, sans empattements.
    expect(C.genreDu("nunito")).toBe("sans");
    const p = C.policeDuCatalogue({ nom: "Nunito", genre: "manuscrite" }, 400);
    expect(p).toMatchObject({ cle: "dancing_script", famille: "Dancing Script", remplacee: true, pourquoi: "genre", genreLu: "manuscrite", lue: "Nunito" });
    expect(C.genreDu(p.cle)).toBe("manuscrite");
    expect(await fr(() => P.phraseDeLaPoliceRemplacee(p.lue, p.famille, p.genreLu))).toBe("Sur ta planche, la police nommée « Nunito » était montrée en écriture manuscrite : j'ai pris celle du catalogue du Studio qui ressemble le plus à ce que tu as vu, « Dancing Script ».");
    // La tâche le dit au client avec la phrase des polices remplacées.
    // La phrase des polices remplacées, dite par la tâche et par le réassemblage (`phrasesDesPolicesRemplacees`).
    const tache = fs.readFileSync("src/lib/syna-agent/planche-en-vrai-tache.ts", "utf8");
    expect(tache).toContain('.map((p) => (p.pourquoi === "genre" ? phraseDeLaPoliceRemplacee(p.lue, p.famille, p.genreLu) : p.pourquoi === "apercu" ? phraseDeLaPoliceRemplacee(p.lue, p.famille, undefined, true) : phraseDeLaPoliceRemplacee(p.lue, p.famille)));');
    expect(tache).toContain("issues.push(...phrasesDesPolicesRemplacees({ titres, textes }));");
  });

  it("le genre concorde : rien ne change ; une police d'affiche lue en empattements ou sans : pas de contradiction", async () => {
    expect(C.policeDuCatalogue({ nom: "Nunito", genre: "sans" }, 400)).toEqual({ cle: "nunito", famille: "Nunito", fichier: "Nunito-400.ttf", poids: 400, handle: "nunito_n4", lue: "Nunito", remplacee: false });
    expect(C.policeDuCatalogue({ nom: "Playfair Display", genre: "serif" }, 700)).toMatchObject({ cle: "playfair_display", remplacee: false });
    expect(C.policeDuCatalogue({ nom: "Abril Fatface", genre: "serif" }, 400)).toMatchObject({ cle: "abril_fatface", remplacee: false });
    expect(C.policeDuCatalogue({ nom: "Caveat", genre: "manuscrite" }, 400)).toMatchObject({ cle: "caveat", remplacee: false });
    // Absente du catalogue : la phrase d'avant, inchangée.
    const h = C.policeDuCatalogue({ nom: "Helvetica Neue", genre: "sans" }, 400);
    expect(h).toMatchObject({ cle: "inter", remplacee: true, pourquoi: "absente" });
    expect(await fr(() => P.phraseDeLaPoliceRemplacee("Helvetica Neue", "Inter"))).toBe("La police « Helvetica Neue » de ta planche n'est pas dans le catalogue du Studio : j'ai pris la plus proche, « Inter ».");
    // Une voisine connue dont le genre contredit le spécimen n'est pas prise.
    expect(C.policeDuCatalogue({ nom: "Helvetica", genre: "manuscrite" }, 400)).toMatchObject({ remplacee: true, cle: "dancing_script" });
    // Un spécimen à empattements sous un nom sans empattements : la police à empattements la plus proche.
    expect(C.genreDu(C.policeDuCatalogue({ nom: "Inter", genre: "serif" }, 400).cle)).toBe("serif");
  });

  it("l'inventaire choisit dans la liste du catalogue la police qui ressemble le plus au spécimen : retenue si elle est au catalogue et dans le genre lu", async () => {
    // La liste donnée à l'inventaire, dans le même appel : les noms des polices du catalogue, par genre.
    const liste = C.catalogueDesPolicesParGenre();
    expect(liste).toMatch(/^Les polices du catalogue du Studio, par genre \(pour procheDuCatalogue\) :\nserif : /);
    expect(liste).toMatch(/\nmanuscrite : .*Caveat.*Dancing Script.*Allura/);
    expect(P.demandeDeLInventaire("Aplomb", liste)).toBe(`Marque : « Aplomb ». Relève chaque case, mot pour mot.\n${liste}`);
    expect(P.INVENTAIRE_SYSTEM).toContain("procheDuCatalogue : le nom exact, recopié de la liste des polices du catalogue donnée dans la demande");
    expect(fs.readFileSync("src/lib/syna-agent/planche-en-vrai-tache.ts", "utf8")).toContain("demandeDeLInventaire(nom, catalogueDesPolicesParGenre())");
    // B d'Écume : l'inventaire simulé choisit une manuscrite du catalogue, elle est retenue, comptée remplacée et dite.
    const inv = P.InventaireSchema.parse({ polices: { titres: { nom: "Playfair Display", genre: "serif", procheDuCatalogue: "Playfair Display" }, textes: { nom: "Nunito", genre: "manuscrite", procheDuCatalogue: "Caveat" } } });
    const t = C.policeDuCatalogue(inv.polices.textes, 400);
    expect(t).toMatchObject({ cle: "caveat", famille: "Caveat", remplacee: true, pourquoi: "genre", genreLu: "manuscrite", lue: "Nunito" });
    expect(await fr(() => P.phraseDeLaPoliceRemplacee(t.lue, t.famille, t.genreLu))).toContain("« Caveat »");
    // Le genre concorde et l'inventaire choisit la police nommée : rien ne change.
    expect(C.policeDuCatalogue(inv.polices.titres, 700)).toEqual(C.policeDuCatalogue({ nom: "Playfair Display", genre: "serif" }, 700));
    expect(C.policeDuCatalogue(inv.polices.titres, 700).remplacee).toBe(false);
    // Depuis le 27 novembre 2026 (essai réel de Mouture : « Montserrat » remplacée par « Nunito ») : le genre concorde et la
    // police nommée est au catalogue, elle l'emporte sur le choix de l'inventaire (en attente de l'accord écrit, voir
    // l'épreuve remplacée le 27 novembre 2026).
    const autre = C.policeDuCatalogue({ nom: "Montserrat", genre: "sans", procheDuCatalogue: "Poppins" }, 400);
    expect(autre).toMatchObject({ famille: "Montserrat", remplacee: false });
    expect(await fr(() => P.phraseDeLaPoliceRemplacee("Montserrat", "Poppins", undefined, true))).toBe("Sur ta planche, la police nommée « Montserrat » n'avait pas tout à fait le dessin montré : j'ai pris celle du catalogue du Studio qui ressemble le plus à ce que tu as vu, « Poppins ».");
    // Absente du catalogue, l'inventaire choisit dans la liste : retenue, la phrase d'avant.
    expect(C.policeDuCatalogue({ nom: "Gotham Rounded", genre: "sans", procheDuCatalogue: "Nunito" }, 400)).toMatchObject({ cle: "nunito", remplacee: true, pourquoi: "absente" });
  });

  it("un choix hors catalogue ou hors genre est ignoré : la règle d'avant s'applique", () => {
    const avant = C.policeDuCatalogue({ nom: "Nunito", genre: "manuscrite" }, 400);
    expect(avant.famille).toBe("Dancing Script");
    // Hors catalogue.
    expect(C.policeDuCatalogue({ nom: "Nunito", genre: "manuscrite", procheDuCatalogue: "Brush Script MT" }, 400)).toEqual(avant);
    // Hors du genre lu (une police sans empattements pour un spécimen manuscrit).
    expect(C.policeDuCatalogue({ nom: "Nunito", genre: "manuscrite", procheDuCatalogue: "Nunito" }, 400)).toEqual(avant);
    expect(C.policeDuCatalogue({ nom: "Nunito", genre: "manuscrite", procheDuCatalogue: "Inter" }, 400)).toEqual(avant);
    // Vide : la règle d'avant.
    expect(C.policeDuCatalogue({ nom: "Nunito", genre: "manuscrite", procheDuCatalogue: "" }, 400)).toEqual(avant);
    expect(C.policeDuCatalogue({ nom: "Nunito", genre: "sans", procheDuCatalogue: "Courier Imaginaire" }, 400)).toMatchObject({ cle: "nunito", remplacee: false });
  });
});
