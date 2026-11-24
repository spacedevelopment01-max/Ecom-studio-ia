/**
 * La méthode des graphistes : la demande exacte de recherche et la découpe des planches (gratuites, sans IA).
 * Fausses planches dessinées par le code : grille régulière, grille décalée, dessin qui déborde, bout de voisine, case vide, 2 × 3.
 */
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { controleDuMetier, deLArticle, demandeDeRecherche, laPiste, phraseEvite } from "@/lib/syna-agent/logo-recherche";
import { COTE_ESQUISSE, decouperLaPlanche, plancheContact } from "@/lib/syna-agent/esquisses";

const W = 1536, H = 1024;
type Bloc = { x: number; y: number; w: number; h: number; c?: string };
const blocs = (list: Bloc[]) => list.map((b) => ({ input: { create: { width: b.w, height: b.h, channels: 3 as const, background: b.c ?? "#1F3D5B" } }, left: b.x, top: b.y }));
/** Un « logo » : un signe et cinq lettres, dans une boîte de 300 × 200 centrée en (cx, cy). */
const dessin = (cx: number, cy: number, c = "#1F3D5B"): Bloc[] => [
  { x: cx - 40, y: cy - 100, w: 80, h: 80, c: "#E0703A" },
  ...Array.from({ length: 5 }, (_v, i) => ({ x: cx - 150 + i * 62, y: cy + 10, w: 44, h: 80, c })),
];
const planche = async (list: Bloc[], w = W, h = H) => sharp({ create: { width: w, height: h, channels: 3, background: "#FFFFFF" } }).composite(blocs(list)).png().toBuffer();
const grille = (dx = 0, decaleBas = 0) => [0, 1].flatMap((r) => [0, 1, 2].map((c) => dessin(256 + c * 512 + dx + (r ? decaleBas : 0), 256 + r * 512)));

describe("la demande exacte de la recherche (mot pour mot celle des preuves)", () => {
  it("Reflet, un artisan : « le savoir-faire du nettoyage automobile »", () => {
    const t = demandeDeRecherche({ nom: "Reflet", metier: { metier: "une entreprise de nettoyage de voitures, intérieur et extérieur", court: "le nettoyage automobile", piste: "savoir-faire" } });
    expect(t).toBe("Crée une planche de recherche graphique pour Reflet, une entreprise de nettoyage de voitures, intérieur et extérieur. Présente six esquisses de logos contemporains sur une grille de trois colonnes et deux lignes. Explore différentes manières de traduire le savoir-faire du nettoyage automobile dans le dessin des lettres et des signes graphiques. Chaque piste doit pouvoir devenir une véritable marque commerciale. Travaille sur fond blanc, sans maquette de présentation.");
  });
  it("Poppy, un commerce : « l'univers des accessoires pour chiens »", () => {
    const t = demandeDeRecherche({ nom: "Poppy", metier: { metier: "une entreprise qui vend des accessoires pour chiens, notamment des harnais, des laisses et des colliers", court: "les accessoires pour chiens", piste: "univers" } });
    expect(t).toBe("Crée une planche de recherche graphique pour Poppy, une entreprise qui vend des accessoires pour chiens, notamment des harnais, des laisses et des colliers. Présente six esquisses de logos contemporains sur une grille de trois colonnes et deux lignes. Explore différentes manières de traduire l'univers des accessoires pour chiens dans le dessin des lettres et des signes graphiques. Chaque piste doit pouvoir devenir une véritable marque commerciale. Travaille sur fond blanc, sans maquette de présentation.");
  });
  it("« Évite ces pistes déjà présentées » : une seule phrase, ajoutée à la fin, rien d'autre ne change", () => {
    const metier = { metier: "une entreprise de menuiserie spécialisée dans les cuisines et dressings sur mesure", court: "la menuiserie", piste: "savoir-faire" as const };
    const nue = demandeDeRecherche({ nom: "Tenon", metier });
    const avec = demandeDeRecherche({ nom: "Tenon", metier, eviter: ["un T en assemblage à tenon", "un rabot stylisé."] });
    expect(avec).toBe(`${nue} Évite ces pistes déjà présentées : un T en assemblage à tenon ; un rabot stylisé.`);
    expect(phraseEvite(["a"])).toBe("Évite ces pistes déjà présentées : a.");
    expect(laPiste({ court: "l'ébénisterie", piste: "savoir-faire" })).toBe("le savoir-faire de l'ébénisterie");
    expect(deLArticle("les bougies")).toBe("des bougies");
  });
  it("le contrôle gratuit du métier : article, sans point, sans le nom, « court » avec son article", () => {
    const bon = { metier: "une entreprise de céramique", court: "la céramique", piste: "savoir-faire" as const };
    expect(controleDuMetier(bon, "Argile")).toBeNull();
    expect(controleDuMetier({ ...bon, metier: "Entreprise de céramique" }, "Argile")).toMatch(/une/);
    expect(controleDuMetier({ ...bon, metier: "une entreprise de céramique." }, "Argile")).toMatch(/point/);
    expect(controleDuMetier({ ...bon, metier: "une entreprise Argile de céramique" }, "Argile")).toMatch(/nom/);
    expect(controleDuMetier({ ...bon, court: "céramique" }, "Argile")).toMatch(/article/);
  });
});

describe("la découpe des planches (gratuite, sans IA)", () => {
  it("une grille régulière : six esquisses carrées de 512 px, rien de refusé", async () => {
    const d = await decouperLaPlanche(await planche(grille().flat()));
    expect(d.ok).toBe(true);
    if (!d.ok) return;
    expect(d.cases.map((c) => !!c.png)).toEqual([true, true, true, true, true, true]);
    const m = await sharp(d.cases[0].png!).metadata();
    expect([m.width, m.height]).toEqual([COTE_ESQUISSE, COTE_ESQUISSE]);
    // Une marge blanche autour du dessin : les coins sont blancs.
    const { data } = await sharp(d.cases[0].png!).raw().toBuffer({ resolveWithObject: true });
    expect([data[0], data[1], data[2]]).toEqual([255, 255, 255]);
  });
  it("une grille décalée (la rangée du bas glissée vers la droite) : les colonnes sont cherchées par rangée", async () => {
    const haut = [0, 1, 2].map((c) => dessin(256 + c * 512, 256)), bas = [420, 940, 1350].map((cx) => dessin(cx, 768));
    const d = await decouperLaPlanche(await planche([...haut, ...bas].flat()));
    expect(d.ok).toBe(true);
    if (d.ok) { expect(d.cases.filter((c) => c.png)).toHaveLength(6); expect(d.grille.colonnes[0][0]).not.toBe(d.grille.colonnes[1][0]); }
  });
  it("un dessin qui touche le bord : cette esquisse est refusée, les autres gardées", async () => {
    const list = grille().flat();
    list.push({ x: 200, y: 0, w: 40, h: 170 }); // la case 1 : son signe monte jusqu'au bord de la planche
    const d = await decouperLaPlanche(await planche(list));
    expect(d.ok).toBe(true);
    if (d.ok) { expect(d.cases[0].refus).toMatch(/touche le bord/); expect(d.cases.slice(1).every((c) => c.png)).toBe(true); }
  });
  it("un bout de la voisine, séparé par du blanc et collé au bord : retiré par recadrage, l'esquisse est gardée", async () => {
    const list = grille().flat();
    list.push({ x: 0, y: 300, w: 14, h: 60 }); // collé au bord gauche de la case 1, loin de son dessin
    const d = await decouperLaPlanche(await planche(list));
    expect(d.ok).toBe(true);
    if (!d.ok) return;
    expect(d.cases[0].png).toBeTruthy();
    expect(d.cases[0].recadree).toBe(true);
    // Le bout retiré n'est plus dans l'esquisse : la colonne de gauche (dans la marge) est blanche.
    const { data, info } = await sharp(d.cases[0].png!).raw().toBuffer({ resolveWithObject: true });
    let encre = 0; for (let y = 0; y < info.height; y++) for (let x = 0; x < 30; x++) if (data[(y * info.width + x) * 3] < 200) encre++;
    expect(encre).toBe(0);
  });
  it("une case vide : refusée", async () => {
    const g = grille(); g[4] = [];
    const d = await decouperLaPlanche(await planche(g.flat()));
    expect(d.ok).toBe(true);
    if (d.ok) { expect(d.cases[4].refus).toBe("case vide"); expect(d.cases.filter((c) => c.png)).toHaveLength(5); }
  });
  it("une case d'une seule couleur : refusée", async () => {
    const g = grille(); g[2] = [{ x: 1030, y: 4, w: 500, h: 500, c: "#C83A3A" }];
    const d = await decouperLaPlanche(await planche(g.flat()));
    expect(d.ok).toBe(true);
    if (d.ok) expect(d.cases[2].refus).toMatch(/seule couleur|touche le bord/);
  });
  it("une planche en deux colonnes et trois lignes : pas de grille 3 × 2, la planche est refusée", async () => {
    const list = [0, 1, 2].flatMap((r) => [0, 1].map((c) => dessin(384 + c * 768, 170 + r * 341))).flat();
    const d = await decouperLaPlanche(await planche(list));
    expect(d.ok).toBe(false);
    if (!d.ok) expect(d.raison).toMatch(/trois colonnes et deux lignes/);
  });
  it("les traits de la grille dessinés par le modèle ne cachent pas les bandes blanches", async () => {
    const list = grille().flat();
    list.push({ x: 511, y: 0, w: 2, h: H, c: "#BBBBBB" }, { x: 1023, y: 0, w: 2, h: H, c: "#BBBBBB" }, { x: 0, y: 511, w: W, h: 2, c: "#BBBBBB" });
    const d = await decouperLaPlanche(await planche(list));
    expect(d.ok).toBe(true);
  });
  it("la planche-contact numérotée est faite par le code", async () => {
    const d = await decouperLaPlanche(await planche(grille().flat()));
    if (!d.ok) throw new Error("découpe");
    const c = await plancheContact(d.cases.map((x, i) => ({ numero: i + 1, png: x.png! })));
    const m = await sharp(c).metadata();
    expect(m.width).toBeGreaterThan(1000);
  });
});
