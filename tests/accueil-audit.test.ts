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
    // Film et affiche : ceux du film publicitaire ARVEN vérifié image par image (plus l'ancien montage du studio).
    expect([montre.video, montre.videoPoster]).toEqual(["/demo/montre/film-ia.mp4", "/demo/montre/film-ia.jpg"]);
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
    for (const f of ["/demo/montre/detail-1", "/demo/montre/ad-1", "plan2-cuir"]) expect(json).not.toContain(f);
  });
  it("boutique refaite (montre entière), sans éditeur de publicité en direct pour la montre", async () => {
    const { allowsLiveAd } = await import("@/components/home/demo-curation");
    expect([montre.shopDesktop, montre.shopMobile]).toEqual(["/demo/montre/boutique-ia-bureau.jpg", "/demo/montre/boutique-ia-mobile.jpg"]);
    for (const f of [montre.shopDesktop, montre.shopMobile, montre.video, montre.videoPoster]) expect(fs.existsSync(path.join(process.cwd(), "public", f))).toBe(true);
    expect(montre.direction).toBe("atelier");
    expect(allowsLiveAd("montre")).toBe(false);
    expect(allowsLiveAd("gourde")).toBe(true);
    const page = read("src/app/page.tsx");
    expect(page).toContain("allowsLiveAd(hero.id)");
    expect(page).toContain(".filter((d) => d.shopDesktop && d.shopMobile)");
    expect(read("src/components/home/home-story.tsx")).toContain('if (k === "store" && !(d.shopDesktop && d.shopMobile))');
  });
  it("mur : les deux publications IA d'ARVEN, en entier (format vertical), une par rangée", async () => {
    const { wallExtras } = await import("@/components/home/demo-curation");
    expect(wallExtras("montre")).toEqual(["/demo/montre/publicite-ia-1.jpg", "/demo/montre/publication-ia-1.jpg"]);
    for (const f of wallExtras("montre")) expect(fs.existsSync(path.join(process.cwd(), "public", f))).toBe(true);
    expect(read("src/components/home/home-showcase.tsx")).toContain('x.tall ? "aspect-[9/16]');
    expect(read("src/app/page.tsx")).toContain("tall: true");
  });
  it("équilibre : les vitrines ne commencent pas toutes par la même démo", () => {
    const page = read("src/app/page.tsx");
    expect(page).toContain("startAt(list.filter((d) => d.board), SECTION_DEMO.boards)");
    expect(page).toContain("startAt(list.filter((d) => (d.posts?.length ?? 0) >= 4), SECTION_DEMO.feeds)");
  });
  it("la page applique la sélection et les panneaux savent s'afficher sans image", () => {
    expect(read("src/app/page.tsx")).toContain(".map(curateForHome)");
    const story = read("src/components/home/home-story.tsx");
    expect(story).toContain("{!d.ad ? null : (");
    expect(story).toContain("if (!d.videoPoster)");
    expect(read("src/components/home/home-demos.tsx")).toContain("{p.image && <img");
  });
});

describe("Accueil : parcours ARVEN, un vrai résultat à chaque étape", async () => {
  const { homeExtras, HOME_CURATION } = await import("@/components/home/demo-curation");
  const x = homeExtras("montre");
  const exists = (f: string) => fs.existsSync(path.join(process.cwd(), "public", f));

  it("publicités : la publicité faite dans l'éditeur, texte du propriétaire mot pour mot, dans les quatre formats", () => {
    expect(x.editorAd?.title).toBe("Acier et cuir véritable.");
    expect(x.editorAd?.formats.map((f) => f.aspect).sort()).toEqual(["16:9", "1:1", "4:5", "9:16"]);
    for (const f of x.editorAd!.formats) expect(exists(f.src)).toBe(true);
    const story = read("src/components/home/home-story.tsx");
    expect(story).toContain("{d.adTitle ?? t(");
    expect(story).toContain('aria-label={t("Formats de la publicité", "Ad formats")}');
  });
  it("vidéos : le film est lu (sans le son, en boucle) avec son affiche", () => {
    expect(read("src/components/home/home-story.tsx")).toContain("<video src={d.video} poster={d.videoPoster} muted loop playsInline");
  });
  it("réseaux sociaux : quatre publications vérifiées, légendes FR/EN, jamais « chronographe »", () => {
    expect(x.social).toHaveLength(4);
    for (const p of x.social) {
      expect(exists(p.src)).toBe(true);
      for (const c of p.caption) expect(c.toLowerCase()).not.toContain("chronographe");
    }
    expect(read("src/app/page.tsx")).toContain("socialPosts: extras.social.map(");
    expect(read("src/components/home/home-story.tsx")).toContain("const sp = d.socialPosts ?? [];");
  });
  it("aucun texte de la sélection n'écrit « chronographe » (vocabulaire du client : « montre »)", () => {
    expect(JSON.stringify(HOME_CURATION).toLowerCase()).not.toMatch(/chronograph(e|s)?"/);
    expect(JSON.stringify(x).toLowerCase()).not.toContain("chronographe");
  });
  it("les scripts de fabrication sont locaux et gratuits (moteur de thème, éditeur de publicités, aucun appel IA)", () => {
    const b = read("scripts/demo-arven-boutique.ts");
    const a = read("scripts/demo-arven-pubs.ts");
    expect(b).toContain("compileTheme(spec)");
    expect(a).toContain("composeAd({");
    for (const src of [a, b]) expect(src).not.toMatch(/@\/lib\/ai\/|openai|dashscope|fal\.run/i);
    expect(a).toContain('headline: process.env.HEADLINE ?? "Acier et cuir véritable."');
  });
  it("l'article de blog de démonstration n'écrit plus « son montre »", () => {
    expect(read("src/app/page.tsx")).not.toContain("Comment bien choisir son ${story.product.toLowerCase()}");
  });
});

describe("Accueil : les sections tournent entre les démos, chacune avec de vrais visuels", async () => {
  const { SECTION_DEMO, DEMO_FILMS, CALENDAR_POSTS } = await import("@/components/home/demo-curation");
  const exists = (f: string) => fs.existsSync(path.join(process.cwd(), "public", f));
  const order = [SECTION_DEMO.boards, SECTION_DEMO.stores, "gourde" /* thèmes */, SECTION_DEMO.beforeAfter, SECTION_DEMO.feeds, SECTION_DEMO.seo, SECTION_DEMO.calendar, SECTION_DEMO.control];

  it("jamais deux sections consécutives avec la même démo, produits et services mêlés", () => {
    for (let i = 1; i < order.length; i++) expect(order[i]).not.toBe(order[i - 1]);
    expect(order.some((d) => d === "paysagiste" || d === "fleuriste")).toBe(true);
    expect(new Set(order).size).toBeGreaterThanOrEqual(5);
  });
  it("vidéos de démonstration : une par démo retenue, fichiers présents, produits et services", () => {
    expect(DEMO_FILMS.map((f) => f.id)).toEqual(["montre", "paysagiste", "casque", "fleuriste", "tribunes"]);
    expect(DEMO_FILMS.map((f) => f.id)).not.toContain("gourde");
    for (const f of DEMO_FILMS) expect(exists(f.src) && exists(f.poster)).toBe(true);
    expect(JSON.stringify(DEMO_FILMS)).not.toContain("/demo/montre/video");
    const films = read("src/components/home/home-films.tsx");
    expect(films).toContain("muted={muted}");
    expect(films).toContain('preload="none"');
    expect(read("src/app/page.tsx")).toContain("<DemoFilms films={films} />");
  });
  it("calendrier « Votre semaine de publications » : quatre publications de Racines & Pierres avec leurs images", () => {
    expect(CALENDAR_POSTS).toHaveLength(4);
    for (const p of CALENDAR_POSTS) expect(exists(p.src)).toBe(true);
    expect(CALENDAR_POSTS.map((p) => p.src)).not.toContain("/demo/paysagiste/post-7.jpg");
    expect(read("src/app/page.tsx")).toContain("CALENDAR_POSTS.slice(0, 4)");
  });
});
