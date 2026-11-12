/**
 * SINA — dessins des planches de marque : un dessin écrit par un modèle n'arrive jamais tel quel à l'écran. Il passe
 * par une liste blanche stricte et devient un arbre de données sûr, que le Studio redessine. Aucun appel d'IA.
 */
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { ArtSchema, MAX_ART_NODES, artSvg, isSafeArt, sanitizeArt, type Art } from "@/lib/syna-agent/brand-art";
import { pruneDraft, withArt } from "@/lib/syna-agent/brand-chain";
import { clientFacts, isRoute, routeIssues } from "@/lib/syna-agent/brand-routes";
import { journey, route, series } from "./sina-routes-fixtures";

const SCENE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240" width="320" role="img" aria-label="La nuit">
  <defs>
    <linearGradient id="eau" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFB98A"/><stop offset="100%" stop-color="#2B2A8C" stop-opacity=".9"/></linearGradient>
    <radialGradient id="halo" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#FFE44D"/><stop offset="1" stop-color="#FFE44D" stop-opacity="0"/></radialGradient>
    <clipPath id="cadre"><rect x="0" y="0" width="320" height="240" rx="18"/></clipPath>
    <filter id="flou" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>
  </defs>
  <g clip-path="url(#cadre)">
    <rect x="0" y="0" width="320" height="240" fill="#0B1437"/>
    <circle cx="250" cy="46" r="34" fill="url(#halo)" filter="url(#flou)"/>
    <g transform="translate(250 46) rotate(12)"><circle r="20" fill="#FFE44D" stroke="#F2B800" stroke-width="2"/><line x1="-14" y1="0" x2="14" y2="0" stroke="#FFF3A6" stroke-width="2" stroke-linecap="round"/></g>
    <path d="M0 110 Q40 100 80 110 T160 110 T240 110 T320 110 V240 H0Z" fill="url(#eau)"/>
    <polygon points="60,150 70,170 50,170" fill="#FF9F6B" fill-opacity=".9"/>
    <polyline points="20,200 40,190 60,200" fill="none" stroke="white" stroke-opacity=".4" stroke-dasharray="2 3"/>
    <ellipse cx="120" cy="180" rx="9" ry="5" fill="currentColor" opacity=".5"/>
  </g>
</svg>`;

describe("SINA — dessins des planches de marque", () => {
  it("un dessin riche est accepté : formes, groupes, dégradés, découpe, flou, transformations", async () => {
    const r = sanitizeArt(SCENE);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.art.box).toEqual([0, 0, 320, 240]);
    expect(r.art.nodes.map((n) => n.t)).toEqual(["defs", "g"]);
    expect(JSON.stringify(r.art)).not.toMatch(/xmlns|aria-label|role|width="320"/);
    expect(ArtSchema.safeParse(r.art).success).toBe(true);
    // « white » devient une couleur écrite, les attributs sans effet sont retirés.
    expect(JSON.stringify(r.art)).toMatch(/"stroke":"#FFFFFF"/);
    // Le Studio réécrit le dessin lui-même ; il se relit à l'identique et devient une image.
    const svg = artSvg(r.art, { prefix: "p1-", width: 640 });
    expect(svg).toMatch(/id="p1-eau"/);
    expect(svg).toMatch(/fill="url\(#p1-halo\)" filter="url\(#p1-flou\)"/);
    expect(sanitizeArt(artSvg(r.art, { prefix: "" }))).toEqual(r);
    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    expect((await sharp(png).metadata()).width).toBe(640);
  });

  it("tout ce qui n'est pas un dessin est refusé en entier : script, texte, style, lien, image, événement", () => {
    const wrap = (inner: string, attrs = "") => `<svg viewBox="0 0 100 100"${attrs}>${inner}</svg>`;
    const refused: [string, RegExp][] = [
      [wrap(`<script>alert(1)</script><circle r="4"/>`), /<script> interdite/],
      [wrap(`<text x="0" y="10">Bonjour</text>`), /<text> interdite/],
      [wrap(`<circle r="4"/>Bonjour`), /texte interdit/],
      [wrap(`<circle r="4" style="fill:url(https://x.example/a)"/>`), /« style » interdit/],
      [wrap(`<circle r="4" onclick="alert(1)"/>`), /« onclick » interdit/],
      [wrap(`<image href="https://x.example/a.png" width="10" height="10"/>`), /<image> interdite/],
      [wrap(`<use href="#a"/>`), /<use> interdite/],
      [wrap(`<a href="https://x.example"><circle r="4"/></a>`), /<a> interdite/],
      [wrap(`<foreignObject><div/></foreignObject>`), /<foreignObject> interdite/],
      [wrap(`<animate attributeName="r" to="9"/>`), /<animate> interdite/],
      [wrap(`<circle r="4" fill="url(https://x.example/a.svg#g)"/>`), /valeur refusée pour « fill »/],
      [wrap(`<circle r="4" fill="red; background:url(x)"/>`), /valeur refusée pour « fill »/],
      [wrap(`<circle r="4" fill="url(#absent)"/>`), /référence vers un élément absent/],
      [wrap(`<circle r="4" transform="translate(1) url(x)"/>`), /valeur refusée pour « transform »/],
      [wrap(`<path d="M0 0 L10 10 <"/>`), /valeur refusée pour « d »|mal fermée|texte interdit|incomplet/],
      [wrap(`<circle r="4"/>`, ` onload="alert(1)"`), /« onload » interdit/],
      [wrap(`<!-- note --><circle r="4"/>`), /commentaire/],
      [wrap(`<circle r="&#52;"/>`), /entité/],
      [wrap(`<g><stop offset="0" stop-color="#fff"/></g>`), /<stop> interdit dans <g>/],
      [wrap(`<defs><linearGradient id="g"><stop offset="0" stop-color="#fff"/></linearGradient></defs>`), /dessin vide/],
      [`<svg><circle r="4"/></svg>`, /viewBox/],
      [`<circle r="4"/>`, /commencer par <svg>/],
      [wrap(`<circle r="4"/>`) + `<svg viewBox="0 0 1 1"><circle r="1"/></svg>`, /après la fin/],
      [wrap(Array.from({ length: MAX_ART_NODES + 1 }, () => `<circle r="1"/>`).join("")), /trop chargé/],
      ["", /dessin vide/],
    ];
    for (const [svg, why] of refused) {
      const r = sanitizeArt(svg);
      expect(r.ok, svg.slice(0, 80)).toBe(false);
      if (!r.ok) expect(r.reason).toMatch(why);
    }
  });

  it("un dessin enregistré puis trafiqué n'est plus accepté", () => {
    const r = sanitizeArt(`<svg viewBox="0 0 10 10"><g><circle r="4" fill="#FF0000"/></g></svg>`);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(isSafeArt(r.art)).toBe(true);
    const tamper = (change: (a: any) => void) => { const copy = structuredClone(r.art) as any; change(copy); return copy as Art; };
    expect(isSafeArt(tamper((a) => { a.nodes[0].c[0].a.onclick = "alert(1)"; }))).toBe(false);
    expect(isSafeArt(tamper((a) => { a.nodes[0].c[0].t = "script"; }))).toBe(false);
    expect(isSafeArt(tamper((a) => { a.nodes[0].c[0].a.fill = "url(https://x.example)"; }))).toBe(false);
    expect(isSafeArt(tamper((a) => { a.nodes[0].c[0].html = "<b>"; }))).toBe(false);
    expect(isSafeArt(tamper((a) => { a.nodes.push({ t: "text", a: {} }); }))).toBe(false);
    expect(isSafeArt(tamper((a) => { a.box = [0, 0, 0, 10]; }))).toBe(false);
    expect(ArtSchema.safeParse({ box: [0, 0, 10, 10], nodes: [] }).success).toBe(false);
    expect(ArtSchema.safeParse("<svg/>").success).toBe(false);
  });

  const DOT = (viewBox: string) => `<svg viewBox="${viewBox}"><circle cx="10" cy="10" r="6" fill="#FFE44D"/></svg>`;

  it("les planches d'essai dessinées sont des routes valides, sans défaut de série", () => {
    const j = journey();
    for (const x of series(4)) expect(isRoute(x)).toBe(true);
    expect(routeIssues(series(4), j, 4)).toEqual([]);
    expect(route("A").board.hero!.nodes.length).toBeGreaterThan(5);
    expect(route("B").board.wordmark.swap!.letter).toBe(8);
    expect(route("D").board.hero).toBeUndefined(); // planche de secours : aucun dessin
  });

  it("dessins de l'illustratrice : posés après filtrage, refusés en entier au moindre écart, jamais sur le signe « lettrage »", () => {
    const base = route("D"), facts = clientFacts(journey());
    const r = withArt(base, {
      hero: DOT("0 0 320 250"), object: `<svg viewBox="0 0 190 130"><image href="https://x.example/a.png"/></svg>`, site: "",
      signs: [{ index: 0, svg: DOT("0 0 100 70"), ground: "dark" }, { index: 1, svg: DOT("0 0 100 70"), ground: "accent" }, { index: 2, svg: "", sample: "Trempe, attends.", hand: true }],
      posts: [{ index: 1, svg: DOT("0 0 100 92"), ground: "primary" }, { index: 2, svg: `<svg viewBox="0 0 100 92" onload="x()"><circle r="3"/></svg>` }],
      swap: { letter: 3, svg: DOT("-12 -12 24 24") },
    }, facts);
    expect(r.placed).toBe(4); // scène, un signe, une publication, la lettre
    expect(r.refused).toBe(2); // image extérieure, attribut d'événement
    const b = r.route.board;
    expect(b.hero!.box).toEqual([0, 0, 320, 250]);
    expect(b.object.art).toBeUndefined();
    expect(b.signs[0].kind).toBe("lettrage");
    expect(b.signs[0].art).toBeUndefined();
    expect(b.signs[1]).toMatchObject({ ground: "accent" });
    expect(b.signs[1].art).toBeTruthy();
    expect(b.signs[2]).toMatchObject({ sample: "Trempe, attends.", hand: true });
    expect(b.posts[1]).toMatchObject({ ground: "primary" });
    expect(b.posts[2].art).toBeUndefined();
    expect(b.wordmark.swap!.letter).toBe(3);
    expect(isRoute(r.route)).toBe(true);
    // Rien du dessin brut ne reste : seulement l'arbre filtré.
    expect(JSON.stringify(r.route)).not.toMatch(/onload|href|<svg/);
  });

  it("une lettre hors du nom n'est pas remplacée ; des mots qui inventent une garantie sont retirés", () => {
    const base = route("D"), facts = clientFacts(journey());
    const far = withArt(base, { hero: "", object: "", site: "", signs: [], posts: [], swap: { letter: 30, svg: DOT("-12 -12 24 24") } }, facts);
    expect(far.route.board.wordmark.swap).toBeUndefined();
    const claim = withArt(base, { hero: "", object: "", site: "", signs: [{ index: 1, svg: "", sample: "Garanti 100 % fruits" }], posts: [] }, facts);
    expect(claim.route.board.signs[1].sample).toBeUndefined();
  });

  it("brouillon de la direction : un geste laissé vide ne fait pas refuser la planche, un dessin glissé là est retiré", () => {
    const raw = { name: "Trempette", board: { descriptor: " ", hero: { box: [0, 0, 1, 1], nodes: [] }, parcel: { tape: "" }, voice: { is: ["", "Tendre, pas mièvre."], micro: [{ where: "", text: "x" }] }, wordmark: { case: "lower", note: "", tilt: [], scale: [1], cut: { at: 0.5 }, underline: true, swap: { letter: 0, art: {} } }, object: { kind: "pot", note: "", art: {} }, site: { art: {} }, posts: [{ text: "a", note: "", art: {} }], signs: [{ kind: "motif", sample: "", hand: false, art: {} }] } };
    const b = pruneDraft(raw).board;
    expect(b).not.toHaveProperty("descriptor");
    expect(b).not.toHaveProperty("hero");
    expect(b).not.toHaveProperty("parcel");
    expect(b.voice.is).toEqual(["Tendre, pas mièvre."]);
    expect(b.voice).not.toHaveProperty("micro");
    expect(b.wordmark).toEqual({ case: "lower", scale: [1], cut: { at: 0.5 } }); // un geste, deux au plus : pas de trait en plus de la coupe
    expect(b.object).toEqual({ kind: "pot" });
    expect(b.site).toEqual({});
    expect(b.posts[0]).toEqual({ text: "a" });
    expect(b.signs[0]).toEqual({ kind: "motif" });
  });
});
