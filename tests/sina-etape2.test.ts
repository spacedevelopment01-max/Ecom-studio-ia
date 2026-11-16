/**
 * SINA — le logo et la charte de la marque (repère 2 et 3 du parcours) : ce que SINA doit faire après le choix de
 * l'identité, la charte et ses favicons, et les règles de relecture des logos du moteur (rendus interdits, notes de
 * référence du propriétaire). Les trois logos libres, le logo redessiné et l'outil `brand.kit` ont été retirés le
 * 16 novembre 2026 : la fin de marque a ses tests dans `sina-marque-finie.test.ts`. Aucun appel d'IA.
 */
import { DEFAULT_MODELS } from "@/lib/syna-agent/models";
import { describe, expect, it } from "vitest";

process.env.STUDIO_SYNA_AGENT = "1";

describe("SINA — logo et charte de la marque", async () => {
  const { getTool } = await import("@/lib/syna-agent/registry");
  const { modelFor } = await import("@/lib/syna-agent/loop");
  const J = await import("@/lib/syna-agent/journey");

  it("anciennes façons retirées : ni les trois logos libres, ni le logo redessiné, ni la charte appelée à la main", () => {
    for (const n of ["logo.propose", "logo.choose", "brand.kit", "brand.create"]) expect(getTool(n), n).toBeUndefined();
    for (const n of ["identity.propose", "identity.images", "identity.choose", "brand.finish", "brand.kit_validate"]) expect(getTool(n), n).toBeTruthy();
  });

  it("modèle et parcours : l'étape 2 est ouverte, le fil reste léger (Haiku), le contexte explique quoi faire", () => {
    expect(J.READY_STEPS).toContain(2);
    expect(modelFor(2)).toMatchObject({ model: DEFAULT_MODELS.strong.model });
    const j = J.emptyJourney();
    for (const s of [0, 1]) J.setStep(j, s, "done");
    // Lot 2 : après le choix de l'identité, une seule consigne pour les repères 2 et 3 : finir la marque (brand.finish).
    expect(J.journeyContext(j)).toMatch(/La marque — l'identité est choisie, il reste à la finir : appelle brand\.finish \(sans argument\)/);
    expect(J.journeyContext(j)).not.toMatch(/logo\.propose|3 logos/);
  });

  it("charte PDF : couverture sans « Non déterminé » quand le secteur est inconnu (essai réel du 7 novembre)", async () => {
    const { coverLine } = await import("@/lib/media/brand-book");
    const d = new Date(2026, 10, 7);
    expect(coverLine("Non déterminé", d, "fr-FR")).toBe("novembre 2026");
    expect(coverLine("Épicerie fine", d, "fr-FR")).toBe("Épicerie fine · novembre 2026");
  });

  it("favicon d'un logo trop détaillé : l'initiale de la marque, dans sa couleur et lisible", async () => {
    const sharp = (await import("sharp")).default;
    const K = await import("@/lib/syna-agent/brand-kit");
    const png = K.initialFavicon("Heure Dorée", { primary: "#24508C", light: "#FFFFFF", dark: "#1F2A3A" }, "Cormorant", 32);
    const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    expect([info.width, info.height]).toEqual([32, 32]);
    const at = (x: number, y: number) => Array.from(data.subarray((y * 32 + x) * 4, (y * 32 + x) * 4 + 3));
    expect(at(4, 16)).toEqual([0x24, 0x50, 0x8c]); // fond : la couleur de marque
    let white = 0;
    for (let i = 0; i < data.length; i += 4) if (data[i] > 200 && data[i + 1] > 200 && data[i + 2] > 200) white++;
    expect(white).toBeGreaterThan(40); // la lettre, dans le neutre le plus lisible
  });

  it("favicon et avatar : le symbole entier, centré, sans rien couper", async () => {
    const sharp = (await import("sharp")).default;
    const K = await import("@/lib/syna-agent/brand-kit");
    const mark = await sharp({ create: { width: 400, height: 200, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: await sharp({ create: { width: 380, height: 180, channels: 4, background: "#C2380F" } }).png().toBuffer(), left: 10, top: 10 }]).png().toBuffer();
    const fav = await sharp(await K.faviconPng(mark, 512)).raw().toBuffer({ resolveWithObject: true });
    expect(fav.info.width).toBe(512);
    expect(fav.data[3]).toBe(0); // coin transparent : de l'air autour, rien de coupé
    const av = await sharp(await K.avatarPng(mark, "#FFFFFF")).raw().toBuffer({ resolveWithObject: true });
    expect(av.info.width).toBe(1080);
    const px = (x: number, y: number) => av.data[(y * 1080 + x) * av.info.channels];
    expect(px(540, 540)).toBeGreaterThan(150); // le symbole au centre (rouge)
    expect(px(60, 540)).toBe(255); // bord : fond blanc, le symbole tient dans le cercle visible
  });

  it("rendus interdits par le propriétaire (7 novembre) : jamais dessinés, jamais présentés ni choisissables", async () => {
    const A = await import("@/lib/logo-v2/artwork");
    expect(A.FORBIDDEN_LOGO_RENDERS.join(" ")).toMatch(/tache, une texture ou une forme floue/);
    expect(A.FORBIDDEN_LOGO_RENDERS.join(" ")).toMatch(/lettre seule accompagnée d'une forme géométrique de base/);
    // Relecture : un rendu interdit devient le code « forbidden », qui interdit pour toujours le choix du logo.
    const review: any = { criteria: {}, textRead: "Heure Dorée", nameExact: true, extraText: false, nameBox: null, clumsyCliche: false, resemblesKnownBrand: false, amateur: false, artifacts: false, issues: [], needsSimplifiedMark: true, genericConcept: false, forbiddenRender: true };
    expect(A.artworkCodes(review, { name: "Heure Dorée" })).toContain("forbidden");
    expect(A.ARTWORK_NEVER).toContain("forbidden");
    expect(A.ARTWORK_REVIEW_SYSTEM("monogram")).toMatch(/« forbiddenRender » = true quand le logo relève d'un de ces rendus INTERDITS/);
    // Dessin : la consigne demande un symbole net, construit avec le nom.
    const t: any = { id: "t1", name: "x", concept: "un concept assez long pour le test", markType: "monogram", composition: "horizontal", typography: { style: "grotesque", weight: "bold", case: "title", tracking: "normal", rationale: "" }, colorRole: { ink: "dark", accent: "primary", rationale: "" }, sobriety: 2, construction: "typographic", symbolIdea: null, distinctive: "", avoid: [], source: "ai", style: "monogram", descriptor: null };
    const brief: any = { name: "Heure Dorée", palette: { primary: "#24508C", secondary: "#F6E7D3", accent: "#C2652B", light: "#FFFFFF", dark: "#1F2A3A" }, trade: { label: "confitures", actions: [], objects: [], generic: false }, activity: "confitures", activities: [], paletteLocked: true, exactNameCase: true };
    expect(A.artworkPrompt(t, brief)).toMatch(/jamais une tache floue, jamais une lettre seule avec une simple forme géométrique/);
  });
  it("notation des logos libres (retour du 7 novembre : « vraiment sévère ») : le logo original au premier regard, pas les versions du studio", async () => {
    const A = await import("@/lib/logo-v2/artwork");
    const sys = A.ARTWORK_REVIEW_SYSTEM("libre");
    expect(sys).toBe(A.FREE_ARTWORK_REVIEW_SYSTEM());
    // La version claire et les réductions viennent du studio : elles ne baissent aucune note.
    expect(sys).toMatch(/FABRIQUÉES AUTOMATIQUEMENT par le studio[^]*NE BAISSE AUCUNE NOTE/);
    // Carte blanche : aucun élément de l'histoire de la marque n'est exigé.
    expect(sys).toMatch(/Ne retire jamais de point parce qu'un élément de l'histoire de la marque/);
    // Le rendu daté est LE défaut sanctionné (essai réel : soleil rayé « années 80 » passé de 7,6 FINAL à 6,7 bloqué).
    expect(sys).toMatch(/soleil rayé de bandes horizontales façon années 70-80[^]*« amateur » = true/);
    expect(sys).toMatch(/PLUSIEURS logos ou variantes dans la même image/);
    expect(sys).toMatch(/« extraText » : tout autre mot que le nom, slogan compris/);
    expect(sys).toMatch(/colle deux mots du nom au point de faire lire un autre mot, legibility à 5 au plus/);
    expect(sys).toContain(A.FORBIDDEN_LOGO_RENDERS[0]);
    // Les autres styles gardent leur relecture.
    expect(A.ARTWORK_REVIEW_SYSTEM("illustrated")).toMatch(/PETITES ENTREPRISES/);
    // Poids : la beauté du dessin et la composition d'abord, l'usage en petit compte peu (version simplifiée du studio).
    const w = A.STYLE_WEIGHTS.libre;
    expect(w.craft).toBeGreaterThan(w.originality);
    expect(w.composition).toBeGreaterThan(w.distinctiveness);
    expect(w.intendedUse).toBeLessThan(1);
    // Calibrage réel (relecture du 7 novembre) : logo libre C 8,1 → au-dessus de la barrière ; ancien « années 80 » 6,7.
    const libreC = { relevance: 9, originality: 7, craft: 9, typography: 8, composition: 8, colour: 9, legibility: 8, memorability: 8, distinctiveness: 7, intendedUse: 7 };
    expect(A.artworkScore({ criteria: libreC }, "libre")).toBe(8.1);
  });

  it("notes de référence du propriétaire (7 novembre : « logo libre noté à 9 et ancien logo 3 ») : échelle fixée, rendu daté plafonné à 3", async () => {
    const A = await import("@/lib/logo-v2/artwork");
    const { BoundedArtworkReviewSchema, ArtworkReviewSchema } = await import("@/lib/logo-v2/ai");
    const sys = A.FREE_ARTWORK_REVIEW_SYSTEM();
    expect(sys).toMatch(/NOTES DE RÉFÉRENCE DU PROPRIÉTAIRE/);
    expect(sys).toMatch(/- 9\/10 : [^\n]*scène généreuse[^\n]*lettrage sur mesure/);
    expect(sys).toMatch(/- 3\/10 : un soleil rayé de bandes horizontales façon années 70-80/);
    expect(sys).toMatch(/« dated » = true/);
    // Relecture réelle après réglage : logo libre 8,9 (critères ci-dessous), ancien logo daté ramené à 3.
    const libre = { relevance: 9, originality: 9, craft: 9, typography: 9, composition: 9, colour: 9, legibility: 8, memorability: 9, distinctiveness: 9, intendedUse: 8 };
    expect(A.freeArtworkScore({ criteria: libre }, "libre")).toBe(8.9);
    const ancien = { relevance: 8, originality: 6, craft: 8, typography: 7, composition: 8, colour: 8, legibility: 9, memorability: 7, distinctiveness: 6, intendedUse: 8 };
    expect(A.freeArtworkScore({ criteria: ancien, dated: true }, "libre")).toBe(A.DATED_MAX_SCORE);
    expect(A.DATED_MAX_SCORE).toBe(3);
    // Le plafond ne concerne que les logos libres ; les autres styles gardent leur moyenne.
    expect(A.freeArtworkScore({ criteria: ancien, dated: true }, "illustrated")).toBe(A.artworkScore({ criteria: ancien }, "illustrated"));
    // « dated » lu dans la réponse ; absent = false (relecture bornée comprise).
    const base = { criteria: libre, textRead: "Heure Dorée", nameExact: true, extraText: false, nameBox: null, clumsyCliche: false, resemblesKnownBrand: false, amateur: false, artifacts: false, person: false, genericConcept: false, forbiddenRender: false, issues: [], needsSimplifiedMark: true, fix: { target: "none", instruction: "" } };
    expect(BoundedArtworkReviewSchema.parse(base).dated).toBe(false);
    expect(ArtworkReviewSchema.parse({ ...base, dated: true }).dated).toBe(true);
  });
});