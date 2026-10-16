import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buttonColors, storyMedia } from "@/components/home/story-media";

const read = (f: string) => fs.readFileSync(path.join(process.cwd(), f), "utf8");

// Démonstration ARVEN telle que dans public/demo/manifest.json : ni packshot ni détail, scènes « En situation ».
const arven = {
  photo: "/demo/montre/photo.jpg",
  images: [
    { label: "Détourage", src: "/demo/montre/cutout-1.webp" },
    { label: "En situation", src: "/demo/montre/lifestyle-1.jpg" },
    { label: "En situation", src: "/demo/montre/lifestyle-2.jpg" },
    { label: "En situation", src: "/demo/montre/lifestyle-3.jpg" },
  ],
  posts: ["/demo/montre/post-1.jpg", "/demo/montre/post-2.jpg", "/demo/montre/post-3.jpg"],
};

describe("Accueil : parcours « 03 Images » sans fausse promesse", () => {
  it("n'affiche jamais la photo d'origine du fournisseur comme une création, ni deux fois la même image", () => {
    const m = storyMedia(arven);
    const srcs = m.tiles.map((x) => x.src);
    expect(srcs).not.toContain(arven.photo);
    expect(new Set(srcs).size).toBe(srcs.length);
    for (const k of ["scene1", "scene2", "packshot", "detail", "ad", "social", "banner"] as const) expect(m[k]).not.toBe(arven.photo);
  });
  it("chaque case porte la vraie nature de l'image (« En situation » = mise en situation, pas « Fond blanc » ni « Détail »)", () => {
    const m = storyMedia(arven);
    expect(m.tiles.map((x) => x.kind)).toEqual(["cutout", "scene", "scene", "scene"]);
  });
  it("une démonstration complète garde ses packshot, détail et scène", () => {
    const m = storyMedia({ photo: "/p.jpg", images: [{ label: "Détourage", src: "/c" }, { label: "Packshot", src: "/pk" }, { label: "Détail", src: "/d" }, { label: "Scène", src: "/s" }, { label: "Publicité", src: "/ad" }, { label: "Bannière", src: "/b" }] });
    expect(m.tiles.map((x) => x.kind)).toEqual(["cutout", "packshot", "detail", "scene"]);
    expect([m.packshot, m.detail, m.scene1, m.ad, m.banner]).toEqual(["/pk", "/d", "/s", "/ad", "/b"]);
  });
  it("la démo « Personnalisation » ne propose pas deux fois la même couleur", () => {
    expect(buttonColors(["#1E2225", "#E8DACF", "#A86932", "#FAF7F5", "#1E2225"])).toEqual(["#1E2225", "#A86932"]);
  });
});

describe("Accueil : promesses conformes aux forfaits et aux règles", () => {
  const page = read("src/app/page.tsx");
  it("la vidéo témoignage n'est annoncée que pour le forfait qui l'inclut, et seulement avec l'accord du client", () => {
    expect(page).not.toContain("Vendre et Dominer");
    expect(page).not.toContain("Sell and Dominate");
    expect(page).toContain("forfait ${PLANS.dominer.name.fr}) : une personne créée par l'IA présente votre vrai produit face caméra, uniquement avec votre accord");
  });
  it("l'accueil du studio ne présente pas la Découverte comme un forfait", () => {
    const home = read("src/components/studio/home.tsx");
    expect(home).not.toContain("Forfait Découverte");
    expect(home).not.toContain("Discovery plan");
  });
  it("le bouton du pied de page mène au studio d'une personne connectée", () => {
    expect(read("src/components/site-footer.tsx")).toContain('href={user ? "/studio" : "/inscription"}');
  });
});

describe("Intro animée en anglais", () => {
  it("remplace « Passer » et le sous-titre français quand l'interface est en anglais", () => {
    const src = read("src/components/intro/intro-splash.tsx");
    expect(src).toContain("if(d.documentElement.lang==='en')");
    expect(src).toContain('skip: "Skip"');
    expect(src).toContain('sub: "The all-in-one e-commerce platform"');
    // Le fichier fourni par le propriétaire reste intact (copie exacte, voir intro-splash.test.ts).
    expect(read("src/components/intro/intro-source.ts")).toContain(">Passer</button>");
  });
});

describe("Accueil : démo montre (ARVEN) sans aucun visuel fait par gabarit du studio", async () => {
  const { curateForHome, HOME_EXCLUDED_FILES } = await import("@/components/home/demo-curation");
  const { demos, localizeDemo } = await import("@/lib/demo-content");
  const all = [...demos(), ...demos("manifest.en.json"), ...demos().map((d) => localizeDemo(d, "en"))].map(curateForHome);
  const montre = all.find((d) => d.id === "montre")!;

  it("aucun fichier gabarit de la montre (publications, planche, vidéo, affiche) n'est référencé", () => {
    expect(montre).toBeTruthy();
    const json = JSON.stringify(all);
    for (const f of HOME_EXCLUDED_FILES) expect(json).not.toContain(f);
  });
  it("carte « Images » : quatre visuels différents choisis par le propriétaire (découpé, fond blanc, mise en situation, publicité IA)", () => {
    expect(montre.images.map((x) => x.src)).toEqual(["/demo/montre/cutout-1.webp", "/demo/montre/lifestyle-1.jpg", "/demo/montre/packshot-1.jpg", "/demo/montre/publicite-ia-1.jpg"]);
    for (const x of montre.images) expect(fs.existsSync(path.join(process.cwd(), "public", x.src))).toBe(true);
    expect(montre.posts).toEqual([]);
    expect(montre.board).toBeUndefined();
    expect(montre.videoPoster).toBe("");
    const m = storyMedia(montre);
    expect(m.tiles.map((x) => x.kind)).toEqual(["cutout", "packshot", "scene", "ad"]);
    expect(new Set(m.tiles.map((x) => x.src)).size).toBe(4);
  });
  it("la publicité tout IA n'est pas présentée comme une publicité modifiable, ni comme une publication du calendrier", () => {
    const m = storyMedia(montre);
    expect([m.ad, m.social, m.banner]).toEqual(["", "", ""]);
  });
  it("les visuels refusés par le propriétaire ne sont jamais utilisés (detail-1, ad-1, image coupée des films)", () => {
    const json = JSON.stringify(all) + read("src/components/home/demo-curation.ts").replace(/\/\/.*|\*.*$/gm, "");
    for (const f of ["/demo/montre/detail-1", "/demo/montre/ad-1", "plan2-cuir", "velours", "publication-ia"]) expect(json).not.toContain(f);
  });
  it("la page applique la sélection et les panneaux savent s'afficher sans image", () => {
    expect(read("src/app/page.tsx")).toContain(".map(curateForHome)");
    const story = read("src/components/home/home-story.tsx");
    expect(story).toContain("{!d.ad ? null : (");
    expect(story).toContain("if (!d.videoPoster)");
    expect(read("src/components/home/home-demos.tsx")).toContain("{p.image && <img");
  });
});
