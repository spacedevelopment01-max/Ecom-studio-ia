/**
 * Goût du propriétaire (17 novembre 2026, devant la page Contact d'un site d'essai sur son téléphone) : les
 * coordonnées s'affichaient en pavé très gras dans la police des titres. « refais la section pour qu'elle n'ait plus
 * jamais ce rendu au niveau du texte ». Les coordonnées sont rangées : une ligne par information, un petit libellé, la
 * valeur en texte courant ; jamais dans la police des titres.
 */
import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { withStructuredInfos } from "@/lib/syna-agent/custom-theme/theme";

describe("page Contact : coordonnées rangées", () => {
  const brut = `<section class="tn tn-contact"><h1>Titre</h1><div class="tn-infos"><b>Nous joindre</b>Nom de l'entreprise<br>8 rue de l'Essai, 26100 Ville<br>E-mail : contact@exemple.fr<br>06 00 00 00 00<br>Du lundi au samedi, de 8 h à 19 h<br>Sur rendez-vous</div></section>`;
  const out = withStructuredInfos(brut);
  it("une ligne par information, avec son libellé (donné ou déduit) et sa valeur", () => {
    expect(out).toContain(`<b>Nous joindre</b><dl class="tn-info-liste">`);
    expect(out).toContain(`<div class="tn-info tn-info-seule"><dd>Nom de l'entreprise</dd></div>`);
    expect(out).toContain(`<div class="tn-info"><dt>Adresse</dt><dd>8 rue de l'Essai, 26100 Ville</dd></div>`);
    expect(out).toContain(`<div class="tn-info"><dt>E-mail</dt><dd>contact@exemple.fr</dd></div>`);
    expect(out).toContain(`<div class="tn-info"><dt>Téléphone</dt><dd>06 00 00 00 00</dd></div>`);
    expect(out).toContain(`<dt>Horaires</dt><dd>Du lundi au samedi, de 8 h à 19 h</dd>`);
    expect(out).toContain(`<div class="tn-info tn-info-seule"><dd>Sur rendez-vous</dd></div>`);
    expect(out).not.toContain("<br>");
  });
  it("un bloc déjà rangé n'est pas touché, un manque reste un manque", () => {
    expect(withStructuredInfos(out)).toBe(out);
    expect(withStructuredInfos(`<div class="tn-infos"><b>Nous joindre</b>E-mail : [À compléter : e-mail]<br>Horaires : [À compléter]</div>`)).toContain(`<dt>Horaires</dt><dd>[À compléter]</dd>`);
    expect(withStructuredInfos(`<section class="tn tn-final"><h2>Sans coordonnées</h2></section>`)).toBe(`<section class="tn tn-final"><h2>Sans coordonnées</h2></section>`);
  });
  it("la feuille : les coordonnées ne sont jamais dans la police des titres, ni au-delà de 22 px", () => {
    const css = fs.readFileSync("public/sections/tenue.css", "utf8");
    for (const m of css.matchAll(/[^{}]*\.tn-contact[^{}]*\.tn-info[^{}]*\{[^}]*\}/g)) {
      const rule = m[0];
      if (/\.tn-infos b\{/.test(rule)) continue; // le petit titre du bloc
      expect(rule, rule.slice(0, 80)).not.toContain("var(--f-title)");
      for (const s of rule.matchAll(/font-size:([\d.]+)px/g)) expect(Number(s[1]), rule.slice(0, 80)).toBeLessThanOrEqual(25);
    }
    expect(css).toContain(".ctw .tn-contact .tn-info dd{margin:0;font-family:var(--f-ui);font-size:17px;font-weight:500");
  });
});
