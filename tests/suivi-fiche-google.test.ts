/**
 * La fiche Google tenue à la main (recherche 08, point 7), sans aucun appel réel : le guide geste par geste avec sa page
 * officielle, le paquet du mois repris des publications acceptées (sans téléphone ni mot-dièse), et la réponse à chaque
 * avis relue par le code (prénom, détail, signature, aucune offre, jamais trop proche d'une réponse déjà donnée).
 */
import { afterEach, describe, expect, it } from "vitest";

describe("suivi : la fiche Google tenue à la main", async () => {
  const { runWithLang } = await import("@/lib/i18n-server");
  const G = await import("@/lib/suivi/fiche-google");
  const fr = <T,>(fn: () => Promise<T> | T) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());
  afterEach(() => { delete G.ficheGoogleDeps.ecrire; });

  it("le guide : chaque geste a son chemin et sa page officielle de Google", async () => {
    const g = await fr(() => G.guideFicheGoogle());
    expect(g.map((x) => x.cle)).toEqual(["avis", "publier", "programmer", "alertes", "lien-avis"]);
    for (const x of g) { expect(x.chemin.length).toBeGreaterThan(1); expect(x.source).toMatch(/^https:\/\/support\.google\.com\/business\/answer\/\d+/); }
  });

  it("le paquet du mois : une publication par semaine, reprise du calendrier, sans téléphone ni mot-dièse ; rien sans publication", async () => {
    const pubs = [
      { ymd: "2026-12-01", copyText: "Nos tables en chêne sont arrivées. Appelez le 06 12 34 56 78 #bois #artisan" },
      { ymd: "2026-12-09", copyText: "L'atelier ouvre ses portes samedi." },
      { ymd: "2026-12-16", copyText: "Une huile qui nourrit le bois." },
    ];
    const pk = G.paquetDuMois(pubs, "2026-12");
    expect(pk.map((p) => p.date)).toEqual(["2026-12-07", "2026-12-14", "2026-12-21"]);
    for (const p of pk) expect(G.defautsPublicationFiche(p.texte)).toEqual([]);
    expect(G.paquetDuMois([], "2026-12")).toEqual([]);
    expect(await fr(() => G.defautsPublicationFiche("Appelez le 06 12 34 56 78 #bois"))).toHaveLength(2);
  });

  it("la réponse à un avis : relue par le code, reprise une fois avec ses défauts, enregistrée ; trop proche d'une autre refusée", async () => {
    const p = { id: `fiche-${Math.random()}`, userId: "u", name: "Atelier Bois" };
    const avis = { auteur: "Julie Martin", texte: "La table est magnifique, livrée pile à l'heure.", note: 5 };
    const vues: string[] = [];
    let n = 0;
    G.ficheGoogleDeps.ecrire = async (_s, prompt) => { vues.push(prompt); n++; return { reponse: n === 1 ? "Merci beaucoup, profitez de -10 % sur votre prochaine commande !" : "Julie, merci : savoir que la table est arrivée pile à l'heure chez vous nous fait plaisir. Marc" }; };
    const r = await fr(() => G.reponseAvis(p, avis, "Marc"));
    expect(r).toEqual({ reponse: "Julie, merci : savoir que la table est arrivée pile à l'heure chez vous nous fait plaisir. Marc", negatif: false });
    expect(vues[1]).toMatch(/À CORRIGER : .*prénom.*offre/);
    expect(G.reponsesDonnees(p.id)).toHaveLength(1);
    G.ficheGoogleDeps.ecrire = async () => ({ reponse: "Julie, merci : savoir que la table est arrivée pile à l'heure chez vous nous fait plaisir. Marc" });
    await expect(fr(() => G.reponseAvis(p, avis, "Marc"))).rejects.toThrow(/trop proche/);
  });

  it("les défauts relevés : formule toute faite, coordonnée privée, aucun détail de l'avis, signature absente", async () => {
    const avis = { auteur: "Paul", texte: "Chantier propre, équipe ponctuelle." };
    const d = await fr(() => G.defautsReponse("Merci Paul, n'hésitez pas à nous appeler au 06 11 22 33 44.", avis, "Marc", []));
    expect(d).toEqual(expect.arrayContaining(["la signature manque à la fin", "une formule toute faite", "une coordonnée privée dans la réponse publique", "aucun détail repris de l'avis"]));
  });
});
