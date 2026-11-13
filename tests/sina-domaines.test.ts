/**
 * SINA — le nom de domaine d'une marque (demandes du propriétaire du 13 novembre 2026 : « le nom de domaine doit aussi
 * être disponible avec le nom de la marque », « une alternative disponible comme pulpefrance.fr ou .com, tout en gardant
 * le nom »). Aucun appel réseau : le registre est simulé.
 */
import { afterEach, describe, expect, it } from "vitest";

describe("SINA — nom de domaine : l'exact, sinon une adresse libre qui garde le nom", async () => {
  const D = await import("@/lib/syna-agent/brand-domains");
  const { NAME_RATINGS, NAME_REFUSALS, NAME_KEEP_SCORE } = await import("@/lib/syna-agent/brand-references");
  const P = await import("@/lib/syna-agent/brand-prompts");
  const { mixIdentity } = await import("@/lib/syna-agent/tools/identity");
  const J = await import("@/lib/syna-agent/journey");
  afterEach(() => { delete D.domainDeps.lookup; });
  /** Registre simulé : ces domaines sont pris, les autres libres. */
  const registry = (taken: string[], unknown: string[] = []) => { const asked: string[] = []; D.domainDeps.lookup = async (d) => { asked.push(d); return unknown.includes(d) ? "inconnu" : taken.includes(d) ? "pris" : "libre"; }; return asked; };

  it("le nom reste entier dans l'adresse : sans accent ni espace, avec le mot du métier quand la planche le donne", () => {
    expect(D.domainSlug("Pulpe")).toBe("pulpe");
    expect(D.domainSlug("Éclat de thé")).toBe("eclatdethe");
    expect(D.domainSlug("L'Eau Est Bonne")).toBe("leauestbonne");
    expect(D.domainSlug("É")).toBe("");
    expect(D.tradeWord("Infusions de fruits en vrac, à boire bien froides")).toBe("infusions");
    expect(D.tradeWord("Sur mesure, fait main")).toBe("");
    expect(D.tradeWord(undefined)).toBe("");
    const c = D.domainCandidates("Pulpe", "Infusions de fruits en vrac, à boire bien froides");
    expect(c.exact).toEqual(["pulpe.fr", "pulpe.com"]);
    expect(c.alternatives).toEqual(["pulpefrance.fr", "pulpefrance.com", "pulpe-infusions.fr", "pulpe-infusions.com", "maisonpulpe.fr", "pulpe-officiel.fr", "pulpeboutique.fr"]);
    // Chaque adresse contient le nom entier : jamais un autre nom.
    for (const d of [...c.exact, ...c.alternatives]) expect(d).toContain("pulpe");
    expect(D.domainCandidates("É", "x")).toEqual({ exact: [], alternatives: [] });
  });

  it("l'exact est pris : SINA trouve les deux premières adresses libres qui gardent le nom, et s'arrête là (cas réel de « Pulpe »)", async () => {
    const asked = registry(["pulpe.fr", "pulpe.com"]);
    const d = await D.findDomains("Pulpe", "Infusions de fruits en vrac");
    expect(d.taken).toEqual(["pulpe.fr", "pulpe.com"]);
    expect(d.free).toEqual(["pulpefrance.fr", "pulpefrance.com"]);
    expect(asked).toEqual(["pulpe.fr", "pulpe.com", "pulpefrance.fr", "pulpefrance.com"]); // pas un contrôle de plus
    expect(D.domainLine(d)).toBe("Nom de domaine : pulpe.fr et pulpe.com sont déjà pris ; libres aujourd'hui : pulpefrance.fr et pulpefrance.com (à réserver vite : seule la réservation le garantit).");
  });

  it("l'exact est libre : rien d'autre n'est cherché ; rien de libre : c'est dit ; registre muet : rien n'est affirmé", async () => {
    let asked = registry([]);
    const free = await D.findDomains("Zestouille");
    expect(free).toMatchObject({ taken: [], free: ["zestouille.fr", "zestouille.com"], unknown: [] });
    expect(asked).toEqual(["zestouille.fr", "zestouille.com"]);
    const all = D.domainCandidates("Pulpe", "Infusions");
    asked = registry([...all.exact, ...all.alternatives]);
    const none = await D.findDomains("Pulpe", "Infusions");
    expect(none.free).toEqual([]);
    expect(asked).toHaveLength(all.exact.length + all.alternatives.length);
    expect(D.domainLine(none)).toMatch(/je n'ai pas trouvé de domaine libre simple avec ce nom\.$/);
    registry([], [...all.exact, ...all.alternatives]);
    const mute = await D.findDomains("Pulpe", "Infusions");
    expect(mute).toMatchObject({ taken: [], free: [] });
    expect(D.domainLine(mute)).toMatch(/^Nom de domaine : pas pu vérifier : pulpe\.fr/);
    expect(D.domainLine(null)).toBe("");
    // Sans registre simulé, une adresse mal formée n'est jamais interrogée.
    delete D.domainDeps.lookup;
    expect(await D.domainStatus("pas un domaine")).toBe("inconnu");
    expect(await D.domainStatus("exemple.io")).toBe("inconnu");
  });

  it("le nom retouché ou pris à une autre planche n'a plus le même domaine : le contrôle de la planche est retiré", () => {
    const board = (name: string) => ({ nameCheck: "rien_trouve", domains: { taken: [`${name}.fr`], free: [`${name}france.fr`], unknown: [], at: 1 } });
    const id = (key: string, name: string) => ({ key, name, slogan: "s", palette: {}, fonts: {}, tone: "t", logoStyle: "wordmark", logoIdea: "", why: "w", nameWhy: "", nameAnchor: "", nameExpression: "", board: board(name.toLowerCase()) }) as any;
    const list = [id("A", "Pulpe"), id("B", "Zeste")];
    expect(mixIdentity(list, "A").board!.domains!.free).toEqual(["pulpefrance.fr"]);
    expect(mixIdentity(list, "A", { palette: "B" } as any).board!.domains).toBeTruthy(); // les couleurs ne changent pas l'adresse
    expect(mixIdentity(list, "A", { name: "B" } as any).board!.domains).toBeUndefined();
    expect(mixIdentity(list, "A", {}, { name: "Pulpe Vive" }).board!.domains).toBeUndefined();
  });

  it("SINA lit les noms de domaine dans son contexte, sans jamais promettre une adresse", () => {
    const j = J.emptyJourney();
    J.setStep(j, 0, "done");
    j.identities = { round: 1, issues: [], comparison: "", at: 1, list: [{ key: "A", name: "Pulpe", slogan: "Bois-le.", territory: "t", ground: "degrade", board: { idea: { belief: "La couleur vive." }, domains: { taken: ["pulpe.fr", "pulpe.com"], free: ["pulpefrance.fr"], unknown: [], at: 1 } } }] } as any;
    const ctx = J.journeyContext(j);
    expect(ctx).toMatch(/Noms de domaine \(contrôlés à l'instant dans le registre[^)]*ne promets jamais une adresse[^)]*\) : A « Pulpe » : pulpe\.fr et pulpe\.com sont déjà pris ; libre aujourd'hui : pulpefrance\.fr/);
  });

  it("le haut du site sur téléphone (rendu par le Studio) ne montre que des mots vrais de la planche", async () => {
    const S = await import("@/lib/syna-agent/brand-site-preview");
    expect(S.sitePoints(["Sans sucres ajoutés, sans arôme artificiel.", "[À compléter : dose] pour [À compléter : volume d'eau] d'eau froide.", "Au frais [À compléter : durée d'infusion], puis sers bien froid."])).toEqual(["Sans sucres ajoutés", "Sans arôme artificiel"]);
    expect(S.sitePoints(["De vrais morceaux. De vrais morceaux ; fabriqué en France, un texte beaucoup trop long pour tenir dans une pastille"])).toEqual(["De vrais morceaux", "Fabriqué en France"]);
    expect(S.sitePoints([])).toEqual([]);
    expect(S.firstProduct(["Pulpe", "Pêche-verveine", "Infusion de fruits à boire froide"], "PULPE")).toBe("Pêche-verveine");
    expect(S.firstProduct(["Pulpe", "[À compléter : nom de la recette]"], "Pulpe")).toBeNull(); // jamais un faux produit
    // L'image du site n'est plus créée par le modèle d'images : une image payée de moins par planche.
    const I = await import("@/lib/syna-agent/brand-images");
    expect(I.CREATED_SLOTS).toEqual(["logo", "hero", "object", "post0", "post1", "post2"]);
    expect(I.IMAGE_SLOTS).toContain("site"); // les planches faites avant restent lisibles
    expect(P.imagerySystem("produits")).toMatch(/Le haut du site sur téléphone n'est plus une image : le Studio le rend lui-même/);
    expect(P.imagerySystem("produits")).not.toMatch(/"site": ""/);
  });

  it("les notes du propriétaire du 13 novembre : « Zeste » 8/10 ; « Gorgée » et « Fruit Nu » refusés, et l'épreuve du sous-entendu", () => {
    expect(NAME_RATINGS.find((r) => r.name === "Zeste")?.score).toBe(8);
    expect(NAME_RATINGS.find((r) => r.name === "Zeste")!.score).toBeGreaterThanOrEqual(NAME_KEEP_SCORE);
    for (const n of ["Gorgée", "Fruit Nu"]) expect(NAME_REFUSALS.find((r) => r.name === n)?.words).toBe("ça fait très porno");
    expect(P.NAME_TRIALS).toMatch(/8\. Le sous-entendu : [\s\S]*« Gorgée » et « Fruit Nu »[\s\S]*« ça fait très porno »[\s\S]*un mot sensuel n'est pas un mot équivoque/);
    expect(P.nameYardstick("produits")).toMatch(/« Zeste » 8\/10/);
    expect(P.nameYardstick("produits")).toMatch(/Il a refusé « Gorgée » et « Fruit Nu » \(« ça fait très porno »\)/);
    expect(P.nameJudgeSystem("produits")).toMatch(/Le sous-entendu/);
  });
});
