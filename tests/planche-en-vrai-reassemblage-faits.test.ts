/**
 * LE RÉASSEMBLAGE ÉCRIT LES MÊMES TEXTES QUE LE PREMIER PASSAGE, AVEC LES FAITS À MONTRER DU CLIENT (27 novembre 2026) :
 * `plancheEnVraiParLeCode` reçoit les faits (comme `plancheEnVrai`, qui les passe à `textesDeLaPlanche`) ; une mention vraie
 * lue dans le ton (« Depuis 2019 ») n'y est donc pas prise pour une promesse. Sans faits, rien ne change. Sans aucun appel,
 * sur les vrais fichiers de l'essai d'Écume.
 */
import fs from "node:fs";
import { describe, expect, it } from "vitest";
import * as P from "@/lib/syna-agent/planche-en-vrai";
import * as T from "@/lib/syna-agent/planche-en-vrai-tache";
import { AUCUN_FAIT, type FaitsPermis } from "@/lib/syna-agent/faits-a-montrer";
import type { Route } from "@/lib/syna-agent/brand-routes";

const F = "tests/fixtures/ecume-planche-en-vrai";
const brut = JSON.parse(fs.readFileSync(`${F}/inventaire-reponse.json`, "utf8")) as { cases: { case: string; textes: string[] }[] };
for (const c of brut.cases) if (c.case === "ton") c.textes = [...c.textes, "Depuis 2019"];
const inventaire = P.InventaireSchema.parse(brut);
const route = { key: "A", name: "Écume", slogan: "SAVONNERIE / ARTISANALE", palette: { dark: "#C14706" }, board: { planche: { domaine: "ecumefrance.fr", statut: "disponible", annee: 2026 } } } as unknown as Route;
const faits: FaitsPermis = { mentions: [{ sujet: "origine", libelle: "Depuis", valeur: "2019" }], interdits: [] };
const textes = (t: ReturnType<typeof T.textesDeLaPlanche>) => ({ titres: t.titres, blocs: t.blocs, haut: t.haut, hautDansLeLogo: t.hautDansLeLogo });

describe("le réassemblage reçoit les faits à montrer du client", () => {
  it("textesDeLaPlanche : sans faits ou avec des faits vides, le même résultat ; avec la mention, elle n'est plus une promesse", () => {
    const sans = T.textesDeLaPlanche(inventaire, route);
    expect(textes(T.textesDeLaPlanche(inventaire, route, AUCUN_FAIT))).toEqual(textes(sans));
    expect(textes(T.textesDeLaPlanche(inventaire, route, undefined))).toEqual(textes(sans));
    // Sans faits, « Depuis 2019 » est une promesse : le ton est redessiné sans elle.
    expect(sans.blocs.get("ton")?.lignes).not.toContain("Depuis 2019");
    expect(sans.notes.join("\n")).toMatch(/bloc du ton redessiné sans : Depuis 2019/);
    // Avec la mention vraie, le décor du ton est gardé.
    const avec = T.textesDeLaPlanche(inventaire, route, faits);
    expect(avec.blocs.get("ton")).toBeNull();
  });

  it("plancheEnVraiParLeCode écrit les textes du premier passage : avec les faits, ceux des faits ; sans faits, ceux d'avant", async () => {
    const det = await (await import("@/lib/syna-agent/brand-images")).logoDetoure(fs.readFileSync(`${F}/esquisse-10-logo-garde-512.png`), "#C14706");
    const demo = fs.readFileSync(`${F}/planche-B-gardee.jpg`);
    const logo = det.ok ? det.png : Buffer.alloc(0);
    const avec = await T.plancheEnVraiParLeCode({ demo, laquelle: "standard", inventaire, route, logo, images: new Map(), faits });
    expect(avec.textes).toEqual(textes(T.textesDeLaPlanche(inventaire, route, faits)));
    const sans = await T.plancheEnVraiParLeCode({ demo, laquelle: "standard", inventaire, route, logo, images: new Map() });
    expect(sans.textes).toEqual(textes(T.textesDeLaPlanche(inventaire, route)));
    expect(sans.textes).not.toEqual(avec.textes);
  }, 180_000);

  it("le script du réassemblage passe les faits du client à plancheEnVraiParLeCode", () => {
    const src = fs.readFileSync("scripts/syna-recette/essai-planche-en-vrai-outil.ts", "utf8");
    const appel = src.slice(src.indexOf("const code = await T.plancheEnVraiParLeCode("));
    expect(appel.slice(0, appel.indexOf("\n"))).toContain("...avecFaits");
  });
});
