import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { unePhotoParEtape } from "@/lib/syna-agent/custom-theme/library";

// 17 novembre 2026, sur les deux sites d'essai ouverts sur le téléphone du propriétaire : « Ça fait pas beau comme ça
// donc change ». Une rangée d'étapes où une seule avait sa photo, et des étapes « en flèches » en trois colonnes de 80 px.
describe("étapes de fabrication : jamais une photo seule au milieu de vides", () => {
  const sec = (c: string, ...photos: boolean[]) => `<section data-ct="s1" data-tn-c="${c}" class="tn tn-fabrication"><h2>Gestes</h2><ol class="tn-etapes">${photos.map((p, i) => `<li>${p ? `<div class="tn-ph tn-cadre" style="background-image:url(/api/files/a${i})"></div>` : '<div class="tn-ph tn-cadre tn-ph-manque"></div>'}<h3>Étape</h3><p>Texte</p></li>`).join("")}</ol></section>`;
  it("des photos manquent : la section passe en lignes, et garde toutes ses photos", () => {
    const out = unePhotoParEtape(sec("file", false, true, false, false));
    expect(out).toContain('data-tn-c="lignes"');
    expect(out).toContain("/api/files/a1");
    expect(unePhotoParEtape(sec("file", true, true, true, false))).toContain('data-tn-c="lignes"');
  });
  it("toutes les photos, ou aucune : rien ne change", () => {
    for (const html of [sec("file", true, true, true), sec("file", false, false, false)]) expect(unePhotoParEtape(html)).toBe(html);
  });
});

describe("étapes « en flèches » sur téléphone", () => {
  const css = fs.readFileSync("public/sections/tenue-recit.css", "utf8");
  it("dès qu'un temps porte une phrase, les temps se rangent l'un sous l'autre", () => {
    const tel = /@media \(max-width:759px\)\{[^@]*\.tn-comment\[data-tn-c="fleches"\] \.tn-pas:has\(>li>p\):not\(#tn\)\{grid-auto-flow:row;grid-template-columns:minmax\(0,1fr\)/;
    expect(css).toMatch(tel);
  });
  it("un titre long n'est jamais plus gros que ses voisins", () => {
    expect(css).toContain('.ctw .tn-comment[data-tn-c="fleches"] li h3[data-tn-long]:not(#tn):not(#tn){font-family:var(--f-ui);font-weight:700;font-size:15px');
  });
});
