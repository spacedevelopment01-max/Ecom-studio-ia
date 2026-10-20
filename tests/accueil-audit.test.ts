import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buttonColors, storyMedia } from "@/components/home/story-media";

const read = (f: string) => fs.readFileSync(path.join(process.cwd(), f), "utf8");
const exists = (f: string) => fs.existsSync(path.join(process.cwd(), "public", f));
const OLD_DEMO_PATHS = /\/demo\/(montre|tribunes|gourde|casque|paysagiste|fleuriste|services|pub-video|drone)\//;

// Démonstration sans packshot ni détail, scènes « En situation » : la carte « Images » ne promet rien de plus.
const sparse = {
  photo: "/demo/x/photo.jpg",
  images: [
    { label: "Détourage", src: "/demo/x/cutout-1.webp" },
    { label: "En situation", src: "/demo/x/lifestyle-1.jpg" },
    { label: "En situation", src: "/demo/x/lifestyle-2.jpg" },
    { label: "En situation", src: "/demo/x/lifestyle-3.jpg" },
  ],
  posts: ["/demo/x/post-1.jpg", "/demo/x/post-2.jpg", "/demo/x/post-3.jpg"],
};

describe("Accueil : parcours « 03 Images » sans fausse promesse", () => {
  it("n'affiche jamais la photo d'origine comme une création, ni deux fois la même image", () => {
    const m = storyMedia(sparse);
    const srcs = m.tiles.map((x) => x.src);
    expect(srcs).not.toContain(sparse.photo);
    expect(new Set(srcs).size).toBe(srcs.length);
    for (const k of ["scene1", "scene2", "packshot", "detail", "ad", "social", "banner"] as const) expect(m[k]).not.toBe(sparse.photo);
  });
  it("chaque case porte la vraie nature de l'image (« En situation » = mise en situation, pas « Fond blanc » ni « Détail »)", () => {
    const m = storyMedia(sparse);
    expect(m.tiles.map((x) => x.kind)).toEqual(["cutout", "scene", "scene", "scene"]);
  });
  it("une démonstration complète garde ses packshot, détail et scène", () => {
    const m = storyMedia({ photo: "/p.jpg", images: [{ label: "Détourage", src: "/c" }, { label: "Packshot", src: "/pk" }, { label: "Détail", src: "/d" }, { label: "Scène", src: "/s" }, { label: "Publicité", src: "/ad" }, { label: "Bannière", src: "/b" }] });
    expect(m.tiles.map((x) => x.kind)).toEqual(["cutout", "packshot", "detail", "scene"]);
    expect([m.packshot, m.detail, m.scene1, m.ad, m.banner]).toEqual(["/pk", "/d", "/s", "/ad", "/b"]);
  });
  it("la démo « Personnalisation » ne propose pas deux fois la même couleur", () => {
    expect(buttonColors(["#1E2225", "#E8DACF", "#A86932", "#FAF7F5", "#1E2225"])).toEqual(["#1E2225", "#A86932"]);
    expect(buttonColors(["#0D0D0D", "#C4C4C4", "#E10600", "#FAFAFA", "#050505"])).toEqual(["#0D0D0D", "#E10600"]);
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
    expect(home).toContain('t("Compte Découverte · gratuit", "Discovery account · free")');
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
    expect(read("src/components/intro/intro-source.ts")).toContain(">Passer</button>");
  });
});

describe("Accueil : les quatre démonstrations seulement, de vrais visuels ou rien (priorité du 19 octobre 2026)", async () => {
  const { curateForHome, HOME_CURATION, HOME_EXCLUDED_FILES, DEMO_FILMS, CALENDAR_POSTS, SECTION_DEMO, wallExtras, homeExtras, allowsLiveAd } = await import("@/components/home/demo-curation");
  const { demos, DEMO_IDS, localizeDemo } = await import("@/lib/demo-content");
  const all = [...demos(), ...demos("manifest.en.json"), ...demos().map((d) => localizeDemo(d, "en"))].map(curateForHome);

  it("seules FRAISE, ONDE, ORBE et Atelier Rive ; aucune ancienne démonstration dans les sources de l'accueil ni de la découverte", () => {
    expect([...new Set(all.map((d) => d.id))]).toEqual([...DEMO_IDS]);
    for (const f of ["src/app/page.tsx", "src/app/studio/decouverte/page.tsx", "src/components/home/demo-curation.ts", "src/lib/discovery-demos.ts", "src/lib/demo-content.ts", "src/components/auth-form.tsx", "src/app/themes/page.tsx"]) {
      expect(read(f), f).not.toMatch(OLD_DEMO_PATHS);
      expect(read(f), f).not.toMatch(/ARVEN|Racines & Pierres|Atelier Pivoine|\bCime\b|Les Tribunes|\bSonore\b|Ostral/);
    }
    expect(HOME_CURATION).toEqual({});
    expect(HOME_EXCLUDED_FILES).toEqual([]);
    expect(DEMO_FILMS).toEqual([]);
    expect(CALENDAR_POSTS).toEqual([]);
    for (const id of DEMO_IDS) { expect(wallExtras(id)).toEqual([]); expect(homeExtras(id)).toEqual({ editorAd: null, social: [] }); expect(allowsLiveAd(id)).toBe(true); }
  });
  it("chaque visuel annoncé existe ; une création absente laisse la case vide, jamais un gabarit ni une photo d'une autre démo", () => {
    for (const d of all) {
      const shown = [d.photo, d.logo, d.shopDesktop, d.shopMobile, d.video, d.videoPoster, d.board ?? "", ...d.images.map((x) => x.src), ...(d.posts ?? [])].filter(Boolean);
      for (const s of shown) { expect(exists(s), `${d.id} : ${s}`).toBe(true); expect(s, `${d.id} : ${s}`).toMatch(new RegExp(`/(demo|theme-assets)/${d.id}/`)); } // SILLON : médias suivis dans le dépôt (issue #148)
      const m = storyMedia(d);
      expect(m.tiles.map((x) => x.src)).not.toContain(d.photo);
      expect(new Set(m.tiles.map((x) => x.src)).size).toBe(m.tiles.length);
      for (const x of m.tiles) expect(["cutout", "packshot", "detail", "scene", "banner", "social", "ad", "post"]).toContain(x.kind);
      expect(d.posts ?? []).toEqual([]);
      expect(d.board).toBeUndefined();
      expect(d.video).toBe("");
    }
  });
  it("les sections tournent entre les quatre démos (produits et services mêlés), jamais deux fois de suite la même", () => {
    const order = [SECTION_DEMO.boards, SECTION_DEMO.stores, "onde" /* vignettes des thèmes */, SECTION_DEMO.beforeAfter, SECTION_DEMO.feeds, SECTION_DEMO.seo, SECTION_DEMO.calendar, SECTION_DEMO.control];
    for (let i = 1; i < order.length; i++) expect(order[i], `position ${i}`).not.toBe(order[i - 1]);
    expect(order).toContain("rive");
    expect(new Set(order).size).toBe(4);
    for (const id of order) expect(DEMO_IDS as readonly string[]).toContain(id);
  });
  it("la page applique la sélection et les panneaux savent s'afficher sans image ni vidéo", () => {
    const page = read("src/app/page.tsx");
    expect(page).toContain(".map(curateForHome)");
    expect(page).toContain("allowsLiveAd(hero.id)");
    expect(page).toContain(".filter((d) => d.shopDesktop && d.shopMobile)");
    expect(page).toContain("startAt(list.filter((d) => d.board), SECTION_DEMO.boards)");
    expect(page).toContain("CALENDAR_POSTS.slice(0, 4)");
    expect(page).toContain("{posts.length > 0 && (");
    expect(page).toContain("{films.length > 0 && (");
    const story = read("src/components/home/home-story.tsx");
    expect(story).toContain('if (k === "store" && !(d.shopDesktop && d.shopMobile))');
    expect(story).toContain("{!d.ad ? null : (");
    expect(story).toContain("if (!d.videoPoster)");
    expect(read("src/components/home/home-demos.tsx")).toContain("{p.image && <img");
  });
});

describe("Conditions : section 4 conforme à la règle Découverte (décision du propriétaire)", () => {
  const c = read("src/app/conditions/page.tsx");
  it("FR et EN : compte Découverte = visite du studio de démonstration, rien créé, aucune IA", () => {
    expect(c).toContain("<h2>4. Compte Découverte gratuit</h2>");
    expect(c).toContain("Le compte Découverte ne permet de rien créer ni modifier");
    expect(c).toContain("<h2>4. Free Discovery account</h2>");
    expect(c).toContain("A Discovery account cannot create or change anything");
    expect(c).not.toContain("product analysis by AI");
  });
});
