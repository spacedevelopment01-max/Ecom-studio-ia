/**
 * Règles communes des pièces à tenue, posées après le tour des sections du 17 novembre 2026 (« ouvre toutes les sections
 * une par une mobile et ordi et tu corriges tous les défauts, j'en veux plus un seul »). Sans IA, sans navigateur : ce
 * que le Studio marque dans la page, et ce que la feuille du socle en fait. Le rendu lui-même se mesure avec le banc
 * (scripts/tour-des-sections).
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { TEXTE_LONG, sansPonctuationSeule, tenueAttrs, titresTresGras, withTextesLongs } from "@/lib/syna-agent/custom-theme/tenue";

const feuille = (f: string) => fs.readFileSync(path.join(process.cwd(), "public", "sections", f), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const SOCLE = feuille("tenue.css");

describe("textes longs : marqués par le Studio, jamais en pavé gras", () => {
  it("un grand titre long est marqué (deux crans), un titre court ne l'est pas ; le texte ne change pas", () => {
    const court = "<h1>Pose ton écran.<br>Respire.</h1>";
    expect(withTextesLongs(court)).toBe(court);
    const moyen = `<h2 class="x">${"a".repeat(TEXTE_LONG.titre + 1)}</h2>`;
    expect(withTextesLongs(moyen)).toBe(moyen.replace('<h2 class="x">', '<h2 class="x" data-tn-long="1">'));
    const long = "<h1>Un titre vraiment long de dix mots avec extraordinairementsolide dedans</h1>";
    expect(withTextesLongs(long)).toBe(long.replace("<h1>", '<h1 data-tn-long="2">'));
    // Déjà marqué : rien n'est ajouté une seconde fois.
    expect(withTextesLongs(withTextesLongs(long))).toBe(withTextesLongs(long));
  });
  it("un nom, une question, une citation : assez long (cran 1), long (cran 2) ; un bloc qui porte d'autres blocs n'est pas touché", () => {
    expect(withTextesLongs("<b>Le duo</b>")).toBe("<b>Le duo</b>");
    expect(withTextesLongs("<b>Tableau électrique remis aux normes</b>")).toBe('<b data-tn-long="1">Tableau électrique remis aux normes</b>');
    const nom = "Le grand sac de voyage extraordinairementsolide en toile épaisse cirée";
    expect(withTextesLongs(`<b>${nom}</b>`)).toBe(`<b data-tn-long="2">${nom}</b>`);
    expect(withTextesLongs(`<summary>${nom} ?</summary>`)).toContain('<summary data-tn-long="2">');
    expect(withTextesLongs(`<blockquote>${nom}</blockquote>`)).toContain('<blockquote data-tn-long="2">');
    // Une marque « À compléter » compte dans la longueur, et reste en place.
    expect(withTextesLongs('<b><mark class="tn-manque">À compléter : une information un peu longue à demander au client</mark></b>')).toMatch(/^<b data-tn-long="2"><mark class="tn-manque">/);
    // Un paragraphe, une légende qui porte un titre et un texte : pas marqués (ils sont déjà en texte courant).
    expect(withTextesLongs(`<p>${nom}</p>`)).toBe(`<p>${nom}</p>`);
    expect(withTextesLongs(`<figcaption><b>Séjour</b><span>${nom}</span></figcaption>`)).not.toContain("data-tn-long");
    // « <br> » ou « <button> » ne sont pas pris pour un « <b> ».
    expect(withTextesLongs(`<button>${nom}</button>`)).not.toContain("data-tn-long");
  });
  it("la feuille : un texte long passe en texte courant dans une tenue aux titres gras, en capitales, ou à la police très grasse", () => {
    expect(SOCLE).toMatch(/\.ctw:is\(\[data-tn-titres="gras"\],\[data-tn-titres="capitales"\],\[data-tn-lourd\]\) \.tn :is\(b,strong,h3,h4,dt,summary,blockquote\)\[data-tn-long="2"\]\{font-family:var\(--f-ui\)!important/);
    // Les grands titres se réduisent quand ils sont longs, et sur un très petit téléphone.
    expect(SOCLE).toMatch(/\.ctw \.tn :is\(h1,h2\)\[data-tn-long="2"\]\{--tn-k:calc\(var\(--tn-k0\)\*\.\d+\)\}/);
    expect(SOCLE).toMatch(/@media \(max-width:359px\)\{\.ctw\{--tn-k0:\.\d+\}/);
  });
});

describe("police des titres très grasse : les petits textes n'y sont pas écrits", () => {
  it("le thème porte data-tn-lourd pour une police très grasse à sa graisse normale, et seulement pour elle", () => {
    expect(titresTresGras("archivo_black")).toBe(true);
    expect(titresTresGras("Archivo Black")).toBe(true);
    expect(titresTresGras("instrument_serif")).toBe(false);
    expect(titresTresGras(null)).toBe(false);
    expect(tenueAttrs(null, "anton")).toContain(' data-tn-lourd="1"');
    expect(tenueAttrs(null, "dm_sans")).not.toContain("data-tn-lourd");
    expect(tenueAttrs(null)).not.toContain("data-tn-lourd");
  });
  it("la feuille passe alors le petit texte de la tenue dans la police du texte courant", () => {
    expect(SOCLE).toContain('.ctw[data-tn-lourd] .tn small{font-family:var(--f-ui);font-style:normal;font-weight:500}');
  });
});

describe("mots et ponctuation", () => {
  it("un mot très long se coupe à la française, avec son trait d'union ; un mot ne sort pas de sa ligne", () => {
    expect(SOCLE).toMatch(/\.ctw \.tn\{overflow-wrap:break-word;-webkit-hyphens:auto;hyphens:auto;hyphenate-limit-chars:12 4 4/);
    expect(SOCLE).toMatch(/\.ctw \.tn :is\(h1,h2\)\{hyphenate-limit-chars:14 5 5/);
  });
  it("« ? » et « ! » ne passent jamais seuls à la ligne : l'espace d'avant devient insécable, dans le texte affiché seulement", () => {
    expect(sansPonctuationSeule("<summary>Et s'il ne me plaît pas ?</summary>")).toBe("<summary>Et s'il ne me plaît pas ?</summary>");
    expect(sansPonctuationSeule("<p>Bravo !</p>")).toBe("<p>Bravo !</p>");
    const script = '<script type="application/json">{"q":"Prêt ?"}</script>';
    expect(sansPonctuationSeule(script)).toBe(script);
    const attr = '<a href="/x?y=1" title="Prêt ?">Voir</a>';
    expect(sansPonctuationSeule(attr)).toBe(attr);
  });
  it("« À compléter » : une note de 16 px au plus, qui passe à la ligne", () => {
    expect(SOCLE).toMatch(/\.ctw \.tn mark\.tn-manque\{[^}]*font-size:min\(1em,16px\)[^}]*white-space:normal/);
  });
});

describe("photo qui manque, bloc d'achat : plus jamais une lettre par ligne", () => {
  it("sans la photo, tout ce qui était rangé à côté reprend la colonne unique", () => {
    expect(SOCLE).toContain(".ctw .tn:has(>.tn-ph-manque):not(#tn)>*,.ctw .tn :has(>.tn-ph-manque):not(#tn)>*{grid-column:1/-1;grid-row:auto}");
  });
  it("les pastilles du vrai choix ont leur rangée sous une ligne d'option gardée, dans la colonne du bloc sur téléphone", () => {
    const achat = feuille("tenue-achat.css");
    expect(achat).toContain('.ctw .tn-achat[data-tn-c="vente-directe"]>.tn-option~.tn-versions{grid-row:11}');
    expect(achat).toMatch(/@media \(max-width:759px\)\{\s*\.ctw \.tn-achat:is\(\[data-tn-c="vente-directe"\],\[data-tn-c="grandes-photos"\],\[data-tn-c="technique"\],\[data-tn-c="fond-doux"\]\)>\.tn-versions\{grid-column:1\}/);
  });
});
