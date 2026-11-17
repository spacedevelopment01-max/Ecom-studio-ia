/**
 * Tour des sections (17 novembre 2026), modules services, métiers et partitions : ce que le Studio pose pour que les
 * feuilles tiennent, et les règles qui ne doivent plus se perdre. Sans IA, sans navigateur. Le rendu lui-même se mesure
 * avec le banc (scripts/tour-des-sections).
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { TEXTE_LONG, withTextesLongs } from "@/lib/syna-agent/custom-theme/tenue";

const feuille = (f: string) => fs.readFileSync(path.join(process.cwd(), "public", "sections", f), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const SERVICES = feuille("tenue-services.css"), METIERS = feuille("tenue-metiers.css"), PARTITIONS = feuille("tenue-partitions.css");
/** La dernière règle écrite pour ce sélecteur exact (celle qui gagne à poids égal). */
const derniere = (css: string, selecteur: string) => {
  const morceaux = css.split(`${selecteur}{`);
  return morceaux.length > 1 ? morceaux[morceaux.length - 1].split("}")[0] : "";
};

describe("une valeur ou une adresse longue est marquée par le Studio", () => {
  it("une valeur (dd) et une adresse de plus de 32 signes portent data-tn-long ; courtes, elles ne changent pas", () => {
    expect(withTextesLongs("<dd>1 480 € par an</dd>")).toBe("<dd>1 480 € par an</dd>");
    const valeur = "Honoraires à la charge de l'acquéreur : 4,5 % du prix de vente";
    expect(valeur.length).toBeGreaterThan(TEXTE_LONG.libelle);
    expect(withTextesLongs(`<dd>${valeur}</dd>`)).toBe(`<dd data-tn-long="2">${valeur}</dd>`);
    expect(withTextesLongs("<address>12 rue des Lilas, Lyon</address>")).toBe("<address>12 rue des Lilas, Lyon</address>");
    const adresse = "Bâtiment B, 3e étage, 128 bis avenue du Général-de-Gaulle, 69300 Caluire-et-Cuire";
    expect(withTextesLongs(`<address>${adresse}</address>`)).toBe(`<address data-tn-long="2">${adresse}</address>`);
    expect(withTextesLongs(`<address class="x">${"a".repeat(TEXTE_LONG.libelleAssezLong + 1)}</address>`)).toContain('<address class="x" data-tn-long="1">');
  });
  it("les feuilles s'en servent : jamais un pavé gras dans un carreau, une carte de frais ou une adresse", () => {
    expect(METIERS).toMatch(/\.tn-bien-caracteristiques\[data-tn-c="chiffres"\] \.tn-carac dd\[data-tn-long\][^{]*\{font-family:var\(--f-ui\)/);
    expect(PARTITIONS).toMatch(/\.tn-bien-frais\[data-tn-c="cartes"\] dd\[data-tn-long\][^{]*\{font-family:var\(--f-ui\)/);
    expect(PARTITIONS).toMatch(/\.ctw\[data-tn-lourd\] \.tn-adresse address\[data-tn-long\]\{font-family:var\(--f-ui\)/);
  });
});

describe("une pastille de choix ne se déforme plus sous un texte long (capture du propriétaire)", () => {
  const FORMULAIRES_SERVICES = ".ctw .tn:is(.tn-rdv,.tn-devis,.tn-disponibilites,.tn-retrait) form";
  const FORMULAIRES_METIERS = ".ctw .tn:is(.tn-recherche-biens,.tn-bien-visite,.tn-reserver-table,.tn-rdv-complet,.tn-inscription) form";
  it("rayon fixe, jamais « 999px » : sur deux lignes, un rectangle aux coins ronds", () => {
    for (const regle of [derniere(SERVICES, `${FORMULAIRES_SERVICES} .tn-moment label span`), derniere(METIERS, `${FORMULAIRES_METIERS} .tn-moment:not(.tn-options) label>span`), derniere(PARTITIONS, ".ctw .tn-realisations-types .tn-pt-filtres span")]) {
      expect(regle).toMatch(/border-radius:2[0-4]px/);
      expect(regle).not.toContain("999px");
    }
  });
  it("la pastille prend la largeur de son texte et passe à la ligne : un texte long a sa propre rangée", () => {
    expect(derniere(SERVICES, `${FORMULAIRES_SERVICES} .tn-moment label`)).toContain("flex:1 1 auto");
    expect(derniere(SERVICES, `${FORMULAIRES_SERVICES} .tn-moment label`)).toContain("max-width:100%");
    expect(derniere(METIERS, `${FORMULAIRES_METIERS} .tn-moment:not(.tn-options) label:not(#tn)`)).toContain("flex:1 1 auto");
  });
  it("le choix affiché d'une liste déroulante passe à la ligne au lieu d'être rogné", () => {
    expect(derniere(SERVICES, `${FORMULAIRES_SERVICES} select`)).toContain("white-space:normal");
    expect(derniere(METIERS, `${FORMULAIRES_METIERS} select`)).toContain("white-space:normal");
    expect(derniere(METIERS, `${FORMULAIRES_METIERS} select`)).not.toContain("ellipsis");
  });
});

describe("un prix ou une note ne serre plus le nom à côté de lui", () => {
  it("la colonne du prix est bornée (jamais « auto » à côté d'un nom) dans les listes à deux colonnes", () => {
    expect(derniere(METIERS, ".ctw .tn-carte .tn-rubrique li")).toMatch(/grid-template-columns:minmax\(0,1fr\) fit-content\(\d+%\)/);
    expect(derniere(SERVICES, '.ctw .tn-exemples-prix[data-tn-c="ticket"] .tn-cas li')).toMatch(/fit-content\(\d+%\)/);
    expect(derniere(SERVICES, '.ctw .tn-realisations[data-tn-c="bandes"] figcaption')).toMatch(/fit-content\(\d+%\)/);
    expect(SERVICES).toMatch(/\.tn-prestations:not\(\[data-tn-c="cartes"\]\):not\(\[data-tn-c="carte"\]\) \.tn-liste-p li:not\(\.tn-rub\)\{grid-template-columns:minmax\(0,1fr\) fit-content\(\d+%\)\}/);
  });
  it("rendez-vous en trois temps : le prix passe sous le nom quand les deux ne tiennent pas sur la ligne", () => {
    expect(derniere(METIERS, ".ctw .tn.tn-rdv-complet form .tn-options label>span")).toContain("flex-wrap:wrap");
    expect(derniere(METIERS, ".ctw .tn.tn-rdv-complet form .tn-options em")).toContain("white-space:normal");
  });
});

describe("deux pièces qui portent le même nom de classe ne se marchent plus dessus", () => {
  it("la carte du restaurant ne reçoit plus les marges de la pièce « questions par rubriques »", () => {
    expect(METIERS).toContain(".ctw .tn-carte>div:not(#tn){padding:0;overflow:visible}");
  });
  it("les biens vendus ne sont plus rognés par la règle de la pièce « biens » (ombre de la photo penchée)", () => {
    expect(SERVICES).toContain('.ctw[data-tn-cadre="penche"] .tn-vendus>ul:not(#tn){overflow:visible}');
  });
});

describe("goûts du propriétaire", () => {
  it("énergie et climat sans classe : l'échelle s'efface sans rendre ses lettres illisibles (plus d'opacité sur le tout)", () => {
    expect(derniere(METIERS, ".ctw .tn-bien-energie .tn-etiquette:not([data-tn-classe]) ol")).toBe("opacity:1");
  });
  it("cadre penché : la photo qui finit sa section garde la place de son ombre", () => {
    expect(PARTITIONS).toContain('.ctw[data-tn-cadre="penche"] .tn-bien-description{padding-bottom:18px}');
    expect(PARTITIONS).toContain('.ctw[data-tn-cadre="penche"] .tn-privatisation[data-tn-c="cote-a-cote"]{padding-bottom:18px}');
  });
});
