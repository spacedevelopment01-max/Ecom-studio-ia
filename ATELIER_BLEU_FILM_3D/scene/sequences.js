// Les sept séquences du film. Chaque objet est placé dans le temps à partir des phrases de la voix off (TL.phrases).
import * as THREE from "three";
import { fenetre } from "./lib.js";
import { batiment } from "./batiment.js";
import { atelier } from "./atelier.js";
import { salon } from "./salon.js";
import { finale } from "./finale.js";

export async function construireSequences(ctx) {
  const { TL, cles, legende, etiquette, MODE } = ctx;
  const P = (id) => TL.phrases[id];
  const mot = (id, m) => TL.phrases[id].mots[m];

  // Repères communs (s)
  const T = {
    enseigne: P("p01").fin + 0.85,
    dispersion: mot("p02", "temps") - 0.2,
    rassemble: mot("p03", "rassemble"),
    ouverture: mot("p03", "seul") - 0.25,
    entree: P("p03").fin - 0.35,
    formulaire: P("p04").debut - 0.75,
    sortieFormulaire: P("p05").debut - 1.75,
    traverseeB: P("p05").debut - 0.25,
    logo: P("p05").debut + 0.25,
    couleurs: mot("p05", "couleurs"),
    typo: mot("p05", "identité") - 0.15,
    compo: P("p05").fin + 0.1,
    resultat: P("p06").debut - 2.3,
    depli: P("p06").debut - 1.0,
    plongee: P("p07").debut - 1.25,
    supports: mot("p07", "visuels") - 0.35,
    ensemble: P("p07").fin + 0.35,
    editeur: P("p08").debut - 1.0,
    frappe: mot("p08", "ajustez") - 0.2,
    valider: P("p08").fin - 0.45,
    maj: P("p08").fin + 0.05,
    sortie: P("p09").debut - 1.45,
    alignement: P("p12").debut - 1.0,
    fin: TL.duree,
  };
  ctx.T = T; ctx.P = P; ctx.mot = mot;

  const mondes = [];
  const B = await batiment(ctx); mondes.push(B);
  const A = await atelier(ctx); mondes.push(A);
  const S = await salon(ctx); mondes.push(S);
  const F = await finale(ctx, { B }); mondes.push(F);

  if (MODE.startsWith("photo")) return { photo: S.photo };

  return {
    maj(t) { for (const m of mondes) m.maj(t); },
    apresCamera(t) { for (const m of mondes) m.apresCamera && m.apresCamera(t); },
    poussiere(t) { return 1 - 0.7 * fenetre(t, T.formulaire, T.sortieFormulaire, 0.6, 0.4); },
  };
}
