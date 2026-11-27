/**
 * LE PREMIER PASSAGE PORTE TOUTES LES CORRECTIONS (27 novembre 2026, préparation du client de vérification, une
 * maroquinerie inventée, scripts/syna-recette/clients/maroquinerie.json) : aucun chemin de reprise ni de réassemblage n'est
 * nécessaire. Avec des appels SIMULÉS (aucun appel payant), le script de la planche en vrai (`essaiDeLaPlancheEnVrai`, qui
 * appelle la tâche du Studio `plancheEnVrai`) envoie, dès le premier passage, ce que la reprise du réassemblage
 * (`reprendreDesCasesEnVrai`, telle que `repriseDesCases` l'appelle) envoie : la ligne de chaque élément (petits textes
 * illisibles, noms des produits de la fiche, mentions vraies du client), et au relecteur la phrase du logo, les produits et
 * les faits. Ses faits sont aussi rangés dans la fiche du projet de l'essai, comme dans le Studio : l'assemblage et les
 * logos refaits par le code, qui les relisent dans le projet (`faitsPermisDuProjet`), voient les mêmes.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";

const MAGENTA = "#FF00FF";
const uni = (w: number, h: number, c: string) => sharp({ create: { width: w, height: h, channels: 3, background: c } }).png().toBuffer();
const logo = () => sharp({ create: { width: 512, height: 512, channels: 3, background: "#FFFFFF" } })
  .composite([{ input: { create: { width: 260, height: 160, channels: 3 as const, background: "#5D0126" } }, left: 126, top: 176 }]).png().toBuffer();

describe("le premier passage de la planche en vrai reçoit ce que reçoit la reprise (appels simulés)", async () => {
  const billing = await import("@/lib/billing");
  const { withTrace } = await import("@/lib/ai/trace");
  const T = await import("@/lib/syna-agent/planche-en-vrai-tache");
  const P = await import("@/lib/syna-agent/planche-en-vrai");
  const C = await import("@/lib/syna-agent/planche-en-vrai-code");
  const F = await import("@/lib/syna-agent/faits-a-montrer");
  const { lignesDuTexte } = await import("@/lib/syna-agent/phrase-sous-le-nom");
  const { setJsonSetting } = await import("@/lib/settings");
  const { one } = await import("@/lib/db");
  const { logoDetoure } = await import("@/lib/syna-agent/brand-images");
  const { donneesDeLaPlanche, essaiDeLaPlancheEnVrai } = await import("../scripts/syna-recette/essai-planche-en-vrai-outil");
  const { clientDeLEssai, faitsPermisDuClient } = await import("../scripts/syna-recette/client-de-l-essai");
  const { ajouterLesReponses, lireLeClient } = await import("../scripts/syna-recette/faits-de-l-essai-outil");
  await (await import("./tarif-logo-fixture")).tarifDuModeleDesLogos();

  const DEMO = "assets/planche-de-marque/disposition.png";
  const AVEC_LOGO = new Set(["publication-1x1", "site-ordinateur", "site-telephone", "emballage"]);
  const textesDe = (n: string) => (n.startsWith("publication-") ? [`Un sac qui dure (${n.slice(12)})`] : []);
  const paye = (q: { userId: string; jobId: string }, max: number, task: string) =>
    withTrace({ jobId: q.jobId }, async () => { const rid = billing.reserve(q.userId, max, { task, provider: "openai", model: "simule", jobId: q.jobId }); billing.settle(rid, Math.round(max / 2), null, task); });
  const textes = new Map<string, string>(), demandes = new Map<string, string>();
  const simule = (q: { userId: string; projectId: string; jobId: string }) => ({
    inventaire: async (images: { label: string }[]) => {
      await paye(q, 100_000, "quality_control");
      const cases = images.map((im) => im.label).filter((l) => (P.NOMS_DES_ELEMENTS as string[]).includes(l));
      return P.InventaireSchema.parse({
        cases: cases.map((c) => ({ case: c, logo: AVEC_LOGO.has(c), textes: textesDe(c), produit: c.startsWith("produit-"), personne: false, comprehensible: c.startsWith("publication-") ? true : null, description: `la case ${c}` })),
        polices: { titres: { nom: "Playfair Display", genre: "serif" }, textes: { nom: "Montserrat", genre: "sans" } },
        couleurs: [{ nom: "Cognac", mots: ["chaud"] }], icone: "le N", favicon: "le N", iconeReprendLeLogo: false,
      });
    },
    refaire: async (d: { element: string; texte: string; taille: string }, cle: string) => {
      textes.set(cle, d.texte); await paye(q, 50_000, "image_generation");
      const [w, h] = d.taille.split("x").map(Number);
      return { png: await uni(w, h, MAGENTA), recu: null };
    },
    relire: async (images: { label: string }[], demande: string, cle: string) => {
      demandes.set(cle, demande); await paye(q, 60_000, "quality_control");
      const cases = images.map((im) => im.label).filter((l) => l.endsWith(" refaite")).map((l) => l.replace(/ refaite$/, ""));
      return { images: cases.map((c) => ({ case: c, identique: true, textesLus: textesDe(c), logoPresent: AVEC_LOGO.has(c), personne: false, logoFonceSurFondSombre: false, produitFidele: null, texteCoupe: false, note: 9, pourquoi: "simulé" })) };
    },
  });
  const dossiers: string[] = [];
  afterEach(() => { for (const d of dossiers.splice(0)) fs.rmSync(d, { recursive: true, force: true }); textes.clear(); demandes.clear(); delete process.env.STUDIO_ESSAI_PLAFOND_EUROS; delete process.env.STUDIO_ESSAI_DEBUT; setJsonSetting(P.REGLAGE_PLANCHE_EN_VRAI, false); });

  it("produits, phrase du logo, faits et petits textes : les mêmes au premier passage et à la reprise ; les faits dans la fiche du projet", async () => {
    // Le client de vérification, avec un nom de test et des réponses du client données comme le chef d'orchestre les donnerait.
    const fichier = lireLeClient("scripts/syna-recette/clients/maroquinerie.json");
    expect(fichier.faits).toBeUndefined();
    const avecFaits = await ajouterLesReponses(fichier, [
      { sujet: "noms", noms: ["Sac cabas", "Portefeuille", "Ceinture"] }, { sujet: "tannage", valeur: "tannage végétal" },
      { sujet: "coutures", valeur: "cousu main au point sellier" }, { sujet: "annee", valeur: "2021" }, { sujet: "ville", etat: "ne_montre_pas", valeur: "Lyon" },
    ]);
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "chemin-normal-tout-"));
    dossiers.push(dir);
    const json = path.join(dir, "client.json"), l = path.join(dir, "esquisse-3-logo-garde.png");
    fs.writeFileSync(json, JSON.stringify(avecFaits)); fs.writeFileSync(l, await logo());
    const client = clientDeLEssai({ CLIENT_JSON: json, CLIENT_NOM: "Nomtest" });
    const donnees = donneesDeLaPlanche(client, { DOMAINE: "nomtest-essai.fr", DOMAINE_STATUT: "disponible", ANNEE: "2026", PHRASE: "MAROQUINERIE / FAITE MAIN" });
    const faits = await faitsPermisDuClient(client);
    expect(faits.mentions.map((m) => m.valeur)).toEqual(["tannage végétal", "cousu main au point sellier", "2021"]);
    expect(faits.interdits).toEqual(["Lyon"]);

    // 1. Le premier passage, sans aucune variable de reprise.
    const r = await essaiDeLaPlancheEnVrai({ sortie: path.join(dir, "sortie"), plafondEuros: "5", planche: DEMO, logo: l, client, donnees, ai: simule as never });
    expect(r.arret).toBeUndefined();
    expect(r.planche).toMatchObject({ w: 3072, h: 4608 });
    const phrase = lignesDuTexte(donnees.phrase);
    expect(phrase).toEqual(["MAROQUINERIE", "FAITE MAIN"]);
    for (const n of P.NOMS_DES_ELEMENTS) {
      const t = textes.get(n)!;
      expect(t, n).toContain(P.MICRO_TEXTES_EN_VRAI);
      expect(t, n).toContain(P.ligneDeLElement(n, false, client.produits, faits));
      expect(t, n).toContain(P.ligneDesTextesEnVrai(client.produits, faits));
      expect(t, n).toContain("« tannage végétal »");
      expect(t, n).not.toContain("Lyon");
    }
    const attendusAuRelecteur = (d: string) => {
      expect(d).toContain("« MAROQUINERIE » puis « FAITE MAIN »");
      expect(d).toContain("tannage végétal");
      for (const p of client.produits) expect(d).toContain(`« ${p} »`);
    };
    for (const g of P.GROUPES) attendusAuRelecteur(demandes.get(`relecture-${g}`)!);
    // Ses faits rangés dans la fiche du projet de l'essai, comme dans le Studio (l'assemblage les relit là).
    expect(F.faitsPermisDuProjet(r.projectId!)).toEqual(faits);
    expect(fs.readFileSync(path.join(dir, "sortie", "fiche-du-client.txt"), "utf8")).toContain("tannage végétal");

    // 2. La reprise du réassemblage, avec les options que `repriseDesCases` lui donne : la même ligne, les mêmes attendus.
    const premier = { textes: new Map(textes), demandes: new Map(demandes) };
    textes.clear(); demandes.clear();
    const demo = fs.readFileSync(DEMO), decoupe = await P.decouperLesApercus(demo, donnees.disposition);
    const det = await logoDetoure(fs.readFileSync(l)), logoDet = det.ok ? det.png : fs.readFileSync(l);
    const elements = ["produit-1", "emballage"] as const;
    const userId = one<{ user_id: string }>("SELECT user_id FROM projects WHERE id=?", r.projectId!)!.user_id, separation = await C.separerSymbole(logoDet);
    await withTrace({ jobId: "reprise-test", projectId: r.projectId!, costCapMicro: 0, studioCapMicro: 10_000_000 }, () => T.reprendreDesCasesEnVrai({
      ai: simule({ userId, projectId: r.projectId!, jobId: "reprise-test" }) as never, nom: client.nom, personnes: false, logo: logoDet, separation,
      inventaire: r.inventaire!, decoupe, elements: [...elements], raisons: new Map(elements.map((n) => [n, ["simulé"]])), produits: client.produits, phrase, faits }));
    for (const n of elements) {
      const reprise = [...textes.entries()].find(([k]) => k.startsWith(n))?.[1];
      expect(reprise, n).toBeDefined();
      expect(reprise!, n).toContain(P.ligneDeLElement(n, false, client.produits, faits));
      expect(premier.textes.get(n)!, n).toContain(P.ligneDeLElement(n, false, client.produits, faits));
    }
    for (const d of demandes.values()) attendusAuRelecteur(d);
  }, 240_000);
});
