/**
 * Le devis contrôlé (recherche 08, point 8), sans aucun appel : prix tirés des seuls tarifs du client (une prestation sans
 * tarif devient une question), totaux en centimes, mentions obligatoires selon le métier, signature simple avec preuve
 * (document inchangé, « bon pour accord », nom), une seule relance sept jours après l'envoi.
 */
import { describe, expect, it } from "vitest";

describe("suivi : le devis contrôlé", async () => {
  const { runWithLang } = await import("@/lib/i18n-server");
  const D = await import("@/lib/suivi/devis");
  const fr = <T,>(fn: () => Promise<T> | T) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());
  const tarifs = [{ cle: "pose", libelle: "Pose de carrelage", unite: "m²", prixHT: 4500, tva: 10 }, { cle: "colle", libelle: "Colle", unite: "sac", prixHT: 1890, tva: 20 }];
  const complet = (lignes: any[]): any => ({
    date: "2026-11-22", entreprise: { nom: "Carrelage Martin", adresse: "3 rue des Lilas, Lyon" }, client: { nom: "Julie Petit" }, lieu: "12 rue Neuve, Lyon", nature: "Pose de carrelage dans la cuisine",
    lignes, tauxHoraireTTC: 5400, decompteTemps: "au quart d'heure", deplacement: 0, validiteJours: 30, gratuit: true, piecesRemplacees: true,
    dechets: { quantite: "0,2 m³", tri: "gravats et cartons séparés", collecte: "Déchetterie de Lyon 8, 2 rue X, déchetterie publique", cout: 0 },
    assurance: { assureur: "Assureur Y", coordonnees: "1 place Z, Paris", couverture: "France métropolitaine" },
  });

  it("les prix viennent seulement des tarifs ; une prestation sans tarif devient une question, jamais un prix deviné", async () => {
    const r = await fr(() => D.chiffrer([{ cle: "pose", quantite: 12.5 }, { cle: "colle", quantite: 3 }, { cle: "plinthes", quantite: 10, libelle: "Plinthes" }], tarifs));
    expect(r.lignes.map((l) => l.totalHT)).toEqual([56250, 5670]);
    expect(r.questions).toEqual(["Quel est ton prix hors taxes pour « Plinthes » (et à l'unité, à l'heure ou au m²) ?"]);
    expect(D.totaux(r.lignes)).toEqual({ ht: 61920, tva: [{ taux: 10, montant: 5625 }, { taux: 20, montant: 1134 }], ttc: 68679 });
  });

  it("les mentions selon le métier : déchets et assurance pour le bâtiment ; un devis complet n'a rien qui manque", async () => {
    const { lignes } = D.chiffrer([{ cle: "pose", quantite: 10 }], tarifs);
    expect(D.mentionsManquantes(complet(lignes), "batiment")).toEqual([]);
    const sans = { ...complet(lignes), dechets: undefined, assurance: undefined, tauxHoraireTTC: null };
    const m = await fr(() => D.mentionsManquantes(sans, "batiment"));
    expect(m).toEqual(expect.arrayContaining(["ton taux horaire toutes taxes comprises", "le point de collecte des déchets (nom, adresse, type d'installation)", "ton assurance professionnelle : assureur, coordonnées et zone couverte"]));
    expect(await fr(() => D.mentionsManquantes(sans, "services-personne"))).toEqual([]);
    expect(await fr(() => D.mentionsManquantes({ ...sans, lignes: [] }, "autre"))).toEqual(["le détail des prestations, en quantité et en prix"]);
  });

  it("la signature simple : refusée si le devis a changé ou sans « bon pour accord » ; la preuve est gardée ; une seule relance à sept jours", async () => {
    const { lignes } = D.chiffrer([{ cle: "pose", quantite: 10 }], tarifs);
    const d = complet(lignes);
    const pid = `devis-${Math.random()}`;
    await expect(fr(() => D.creerLienSignature(pid, { ...d, lieu: "" }, "batiment", "email"))).rejects.toThrow(/Devis incomplet : le lieu des travaux/);
    const t0 = Date.UTC(2026, 10, 1);
    const token = D.creerLienSignature(pid, d, "batiment", "sms", t0);
    expect(D.empreinteDevis({ ...d })).toBe(D.empreinteDevis(JSON.parse(JSON.stringify(d))));
    await expect(fr(() => D.signer(token, { nom: "Julie Petit", mention: "ok", empreinteVue: D.empreinteDevis(d) }))).rejects.toThrow(/bon pour accord/);
    await expect(fr(() => D.signer(token, { nom: "Julie Petit", mention: "Bon pour accord", empreinteVue: D.empreinteDevis({ ...d, nature: "autre" }) }))).rejects.toThrow(/a changé/);
    expect(D.devisARelancer(pid, t0 + 6 * 86_400_000)).toEqual([]);
    expect(D.devisARelancer(pid, t0 + 8 * 86_400_000)).toEqual([token]);
    D.marquerRelance(token, t0 + 8 * 86_400_000);
    expect(D.devisARelancer(pid, t0 + 20 * 86_400_000)).toEqual([]);
    D.signer(token, { nom: "Julie Petit", mention: " Bon  pour accord ", empreinteVue: D.empreinteDevis(d) }, t0 + 9 * 86_400_000);
    expect(D.preuve(token)).toMatchObject({ empreinte: D.empreinteDevis(d), canal: "sms", envoye_at: t0, signe_at: t0 + 9 * 86_400_000, signe_nom: "Julie Petit", signe_mention: "bon pour accord" });
    await expect(fr(() => D.signer(token, { nom: "Julie Petit", mention: "bon pour accord", empreinteVue: D.empreinteDevis(d) }))).rejects.toThrow(/déjà signé/);
  });
});
