/**
 * Direction artistique du logo : trois pistes vraiment différentes (produit, concept, typo), SVG de l'IA nettoyés,
 * contrôle « directeur de création » noté avec seuil, reprise ciblée, piste ratée remplacée et jamais montrée,
 * repli sans IA honnête ; présentation (planches), kit réseaux sociaux contrôlé, export ZIP et charte.
 */
import { describe, expect, it } from "vitest";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import sharp from "sharp";
import { unzipSync } from "fflate";
import { createUser } from "@/lib/auth";
import { id, now, one, run, all } from "@/lib/db";
import { loadProject } from "@/lib/projects";
import { runWithLang } from "@/lib/i18n-server";
import { emptyProduct } from "@/lib/project-types";
import { designRoutes, localRoutes, routeFromDraft, routePassed, type CreativeAi, type RouteDraft } from "@/lib/engine/creative-direction";
import { routeBoard, routeLogoSpec, type CreativeRoute, type RouteReview } from "@/lib/media/brand-mockups";
import { buildMonogram, glyphOutline, monogramLetter } from "@/lib/media/monogram";
import { symbolLegibility } from "@/lib/media/logo-symbol";
import { logoSet } from "@/lib/media/logo";
import { RouteReviewSchema } from "@/lib/ai/tasks";
import { checkSocialVoice, hasRealReviews, localSocialVoice, latestSocialKit } from "@/lib/engine/social-kit";
import { highlightThemes, renderSocialKit } from "@/lib/media/social-kit";
import { generateLogos, latestProposals } from "@/lib/engine/identity";
import { saveBrandBook } from "@/lib/engine/brand";
import { localBrand } from "@/lib/engine/local";
import { renderBrandBook } from "@/lib/media/brand-book";

const fr = <T,>(fn: () => Promise<T>) => runWithLang({ ui: "fr", content: "fr" }, fn);
const PAL = { primary: "#A3304F", secondary: "#F6DCE2", accent: "#E07A93", light: "#FDF6F7", dark: "#2A1A20" };
const BRAND = { name: "Lunelle", tagline: "Une voix douce pour grandir", palette: PAL, direction: "pop", sector: "enfants" };
const svg = (inner: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${inner}</svg>`;

/** Détourage synthétique : compagnon rond à deux oreilles (cas SOVA). */
async function bunny(): Promise<Buffer> {
  const c = createCanvas(600, 700);
  const x = c.getContext("2d");
  x.fillStyle = "#EBB8C0";
  x.beginPath();
  x.roundRect(130, 20, 90, 300, 45);
  x.roundRect(380, 20, 90, 300, 45);
  x.fill();
  x.beginPath();
  x.arc(300, 420, 260, 0, Math.PI * 2);
  x.fill();
  x.fillStyle = "#EEEEEE";
  x.beginPath();
  x.arc(300, 430, 170, 0, Math.PI * 2);
  x.fill();
  return c.encode("png");
}

const D_PRODUIT: RouteDraft = { key: "produit", name: "Deux oreilles, une voix", why: "Le symbole garde les deux oreilles et le disque du compagnon, réduits à trois formes. Il devient un visage ami, lisible dans un onglet comme sur une boîte.", svg: svg(`<rect x="21" y="6" width="17" height="38" rx="8.5" fill="currentColor"/><rect x="62" y="6" width="17" height="38" rx="8.5" fill="currentColor"/><path fill-rule="evenodd" fill="#A3304F" d="M18 62A32 32 0 1 0 82 62A32 32 0 1 0 18 62Z M36 62A14 14 0 1 1 64 62A14 14 0 1 1 36 62Z"/>`), heading: "Jost", headingWeight: 600, body: "DM Sans", case: "lower", tracking: 0.02, composition: "horizontal", ink: "dark", accent: "primary", ground: "primary" };
const D_CONCEPT: RouteDraft = { key: "concept", name: "La lune qui parle", why: "Un croissant de lune se prolonge en bulle de parole, avec un point qui murmure en son creux. L'idée est propre à la marque et se lit d'un coup d'œil.", svg: svg(`<path fill-rule="evenodd" fill="currentColor" d="M54 6A44 44 0 1 0 54 94C38 86 30 70 30 50C30 30 38 14 54 6Z M18 84L6 98L30 92Z"/><circle cx="64" cy="50" r="13" fill="#A3304F"/>`), heading: "Playfair Display", headingWeight: 700, body: "Inter", case: "title", tracking: 0.02, composition: "stacked", ink: "dark", accent: "primary", ground: "dark" };
const D_TYPO: RouteDraft = { key: "typo", name: "Le L qui veille", why: "Le L de Lunelle se termine par un point, comme une petite lune posée au-dessus de son pied. Le logotype en minuscules douces parle aux parents.", svg: svg(`<path d="M30 12V80H74" fill="none" stroke="currentColor" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/><circle cx="72" cy="34" r="12" fill="#E07A93"/>`), heading: "Bricolage Grotesque", headingWeight: 800, body: "DM Sans", case: "lower", tracking: 0, composition: "wordmark", ink: "dark", accent: "accent", ground: "primary" };
const D_CLICHE: RouteDraft = { ...D_CONCEPT, name: "Cœur étoilé", why: "Un cœur et une étoile pour dire la tendresse et le rêve. Simple et chaleureux pour les familles.", svg: svg(`<path d="M50 85 C20 62 10 45 22 30 C32 18 46 22 50 32 C54 22 68 18 78 30 C90 45 80 62 50 85Z" fill="currentColor"/>`) };

const GOOD: RouteReview = { scores: { originality: 8, memorability: 8, relevance: 8, simplicity: 8, smallSizes: 8, coherence: 8, distinctiveness: 8 }, cliche: false, resemblesKnownBrand: false, readsAsLetters: null, issues: [], fix: "" };
const CLICHE: RouteReview = { ...GOOD, scores: { ...GOOD.scores, originality: 3, distinctiveness: 2 }, cliche: true, issues: ["cœur : code le plus vu du secteur"], fix: "partir de la voix du compagnon" };

function fakeAi(opts: { drafts?: RouteDraft[]; redraws?: Record<string, RouteDraft[]>; review?: (r: CreativeRoute) => RouteReview; reviewThrows?: boolean }) {
  const calls = { redraw: [] as { key: string; feedback: string }[], review: [] as string[] };
  const ai: CreativeAi = {
    routes: async () => structuredClone(opts.drafts ?? [D_PRODUIT, D_CONCEPT, D_TYPO]),
    redraw: async (key, feedback) => {
      calls.redraw.push({ key, feedback });
      const next = opts.redraws?.[key]?.shift();
      if (!next) throw new Error("pas de reprise");
      return structuredClone(next);
    },
    review: async (r, board) => {
      expect(board.length).toBeGreaterThan(10_000);
      calls.review.push(`${r.key}:${r.source}:${r.name}`);
      if (opts.reviewThrows) throw new Error("vision indisponible");
      return opts.review ? opts.review(r) : r.markKind === "ai-monogram" ? { ...GOOD, readsAsLetters: true } : GOOD;
    },
  };
  return { ai, calls };
}

describe("pistes du studio, sans IA (repli honnête)", () => {
  it("trois pistes différentes : silhouette, monogramme géométrique dessiné, logotype — typographies distinctes", async () => {
    await fr(async () => {
      const r = await designRoutes({ brand: BRAND, cutout: await bunny(), library: "sun", ai: null });
      expect(r.ai).toBe("off");
      expect(r.routes.map((x) => x.key)).toEqual(["produit", "concept", "typo"]);
      expect(r.routes.map((x) => x.markKind)).toEqual(["silhouette", "monogram", "letter"]);
      expect(new Set(r.routes.map((x) => x.heading)).size).toBe(3);
      expect(new Set(r.routes.map((x) => x.composition)).size).toBe(3);
      for (const x of r.routes) {
        expect(x.source).toBe("local");
        // Jamais présenté comme une création par IA.
        expect(x.why).not.toMatch(/\bIA\b.*(dessin|cré)/i);
        expect(x.why.split(/(?<=[.!?])\s/).length).toBeLessThanOrEqual(3);
        expect(symbolLegibility(x.mark!).ok).toBe(true);
      }
      expect(r.routes[1].why).toMatch(/sans création par IA/);
    });
  });

  it("produit à silhouette banale : pictogramme de bibliothèque, signalé comme version de secours", async () => {
    await fr(async () => {
      const c = createCanvas(300, 760);
      const x = c.getContext("2d");
      x.fillStyle = "#F2C230";
      x.beginPath();
      x.roundRect(20, 20, 260, 720, 30);
      x.fill();
      const r = await localRoutes({ ...BRAND, name: "Siroco" }, { cutout: await c.encode("png"), library: "leaf" });
      expect(r.produit).toHaveLength(1);
      expect(r.produit[0].markKind).toBe("library");
      expect(r.produit[0].why).toMatch(/secours/);
    });
  });

  it("monogramme : contour de la lettre en tracés (aucun texte ni police dans le SVG livré)", async () => {
    expect(monogramLetter("Maison Orée")).toBe("O");
    expect(monogramLetter("l'atelier Brume")).toBe("B");
    const g = glyphOutline("K", "Space Grotesk", 700)!;
    expect(g.d).toMatch(/^M[\d.]+ [\d.]+L/);
    const m = buildMonogram("Kestra", { family: "Space Grotesk", weight: 700, frame: "corner", tone: "accent" })!;
    expect(m.shapes[0].rule).toBe("evenodd");
    const set = await logoSet({ name: "Kestra", family: "Space Grotesk", weight: 700, case: "upper", tracking: 0.04, layout: "wordmark", emblem: "none", custom: m, markFrame: false, color: "#111111", accent: "#2353C8" });
    for (const s of [set.mainSvg, set.monoSvg]) expect(s).not.toMatch(/<text|font-family|<script|href=/i);
    // Une graisse trop fine pour 16 px est refusée plutôt que livrée illisible.
    expect(buildMonogram("Gaïa", { family: "Instrument Serif", weight: 400, frame: "none" })).toBeNull();
  });
});

describe("pistes de l'IA contrôlées", () => {
  it("réponses réalistes : trois pistes IA, chacune notée sur sa planche de mises en situation", async () => {
    await fr(async () => {
      const { ai, calls } = fakeAi({});
      const r = await designRoutes({ brand: BRAND, cutout: await bunny(), library: "sun", ai });
      expect(r.routes.map((x) => `${x.key}:${x.source}`)).toEqual(["produit:ai", "concept:ai", "typo:ai"]);
      expect(r.routes.every((x) => x.review)).toBe(true);
      expect(calls.review).toHaveLength(3);
      // Le logotype reprend le détail d'accent du monogramme (point final).
      expect(r.routes[2].dot).toBe(true);
      expect(routeLogoSpec(r.routes[2], BRAND).layout).toBe("wordmark");
    });
  });

  it("piste cliché : reprise CIBLÉE de cette seule piste avec les défauts relevés, la version refusée n'est jamais montrée", async () => {
    await fr(async () => {
      const { ai, calls } = fakeAi({ drafts: [D_PRODUIT, D_CLICHE, D_TYPO], redraws: { concept: [D_CONCEPT] }, review: (x) => (/Cœur/.test(x.name) ? CLICHE : x.markKind === "ai-monogram" ? { ...GOOD, readsAsLetters: true } : GOOD) });
      const r = await designRoutes({ brand: BRAND, cutout: null, library: "sun", ai });
      expect(calls.redraw.map((c) => c.key)).toEqual(["concept"]);
      expect(calls.redraw[0].feedback).toMatch(/cliché/);
      expect(calls.redraw[0].feedback).toMatch(/voix du compagnon/);
      expect(r.routes.map((x) => x.name)).toEqual(["Deux oreilles, une voix", "La lune qui parle", "Le L qui veille"]);
    });
  });

  it("SVG malveillant ou hors règles (script, <text>, trait fin) refusé ; après deux échecs, version du studio contrôlée", async () => {
    await fr(async () => {
      const evil = { ...D_PRODUIT, svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><script>alert(1)</script><circle cx="50" cy="50" r="40"/></svg>` };
      const text = { ...D_TYPO, svg: svg(`<text x="10" y="80">L</text>`) };
      const thin = { ...D_TYPO, svg: svg(`<path d="M30 12V80H74" fill="none" stroke="currentColor" stroke-width="2"/>`) };
      const { ai, calls } = fakeAi({ drafts: [evil, D_CONCEPT, text], redraws: { produit: [evil], typo: [thin] } });
      const r = await designRoutes({ brand: BRAND, cutout: await bunny(), library: "sun", ai });
      expect(calls.redraw.find((c) => c.key === "produit")!.feedback).toMatch(/SVG refusé/);
      expect(calls.redraw.find((c) => c.key === "typo")!.feedback).toMatch(/text/);
      expect(r.routes.map((x) => `${x.key}:${x.source}:${x.markKind}`)).toEqual(["produit:local:silhouette", "concept:ai:ai-symbol", "typo:local:letter"]);
      expect(JSON.stringify(r.routes)).not.toMatch(/script|alert|<text/);
      // La version du studio a elle aussi été soumise au contrôle.
      expect(calls.review.some((x) => x.startsWith("produit:local"))).toBe(true);
    });
  });

  it("police inexistante, rôle de couleur inventé, justification vide → refus avec consigne", () => {
    expect(routeFromDraft({ ...D_PRODUIT, heading: "Comic Sans" }, BRAND as any)).toMatchObject({ ok: false, reason: expect.stringMatching(/police/) });
    expect(routeFromDraft({ ...D_PRODUIT, ink: "#000000" as any }, BRAND as any)).toMatchObject({ ok: false });
    expect(routeFromDraft({ ...D_PRODUIT, why: "" }, BRAND as any)).toMatchObject({ ok: false });
  });

  it("allégation dans la justification → reprise demandée", async () => {
    await fr(async () => {
      const claim = { ...D_PRODUIT, why: "Le symbole garde les oreilles du compagnon, le jouet le plus sûr du marché. Sécurité garantie pour les enfants dès la naissance." };
      const { ai, calls } = fakeAi({ drafts: [claim, D_CONCEPT, D_TYPO], redraws: { produit: [D_PRODUIT] } });
      const r = await designRoutes({ brand: BRAND, cutout: null, library: "sun", ai, textIssues: (t) => (/garanti|le plus sûr/i.test(t) ? ["sécurité garantie"] : []) });
      expect(calls.redraw[0]).toMatchObject({ key: "produit" });
      expect(r.routes[0].why).not.toMatch(/garanti/);
    });
  });

  it("contrôle visuel en panne : aucune piste de l'IA non contrôlée n'est montrée", async () => {
    await fr(async () => {
      const { ai } = fakeAi({ reviewThrows: true });
      const r = await designRoutes({ brand: BRAND, cutout: await bunny(), library: "sun", ai });
      expect(r.routes.every((x) => x.source === "local")).toBe(true);
      expect(r.notes.join(" ")).toMatch(/non montrée/);
    });
  });

  it("tout refusé, y compris les versions du studio : pistes retirées, seul le logotype reste, avec la raison", async () => {
    await fr(async () => {
      const { ai } = fakeAi({ review: () => CLICHE });
      const r = await designRoutes({ brand: BRAND, cutout: await bunny(), library: "sun", ai });
      expect(r.routes).toHaveLength(1);
      expect(r.routes[0]).toMatchObject({ key: "typo", source: "local" });
      expect(r.notes.join(" ")).toMatch(/n'est pas présentée/);
    });
  });

  it("grille : seuil exigeant pour l'IA, défauts rédhibitoires, réponse hors format refusée", () => {
    expect(routePassed(GOOD, "ai")).toBe(true);
    expect(routePassed({ ...GOOD, scores: { ...GOOD.scores, smallSizes: 5 } }, "ai")).toBe(false);
    expect(routePassed({ ...GOOD, scores: { originality: 7, memorability: 7, relevance: 7, simplicity: 7, smallSizes: 7, coherence: 7, distinctiveness: 7 } }, "ai")).toBe(false);
    expect(routePassed({ ...GOOD, resemblesKnownBrand: true }, "ai")).toBe(false);
    expect(routePassed({ ...GOOD, readsAsLetters: false }, "ai")).toBe(false);
    // Version du studio : pas d'originalité exigée, mais nette en petit et cohérente.
    expect(routePassed({ ...GOOD, scores: { ...GOOD.scores, originality: 4, distinctiveness: 4 } }, "local")).toBe(true);
    const broken = RouteReviewSchema.parse({ verdict: "ok" });
    expect(routePassed(broken as RouteReview, "ai")).toBe(false);
    expect(routePassed(null, "local")).toBe(false);
  });
});

describe("présentation et kit réseaux sociaux", () => {
  it("planche de mises en situation : portrait, couleurs de la piste (blanc sur couleur) visibles", async () => {
    await fr(async () => {
      const r = (await designRoutes({ brand: BRAND, cutout: await bunny(), library: "sun", ai: null })).routes[0];
      const png = await routeBoard({ route: r, brand: BRAND, product: await bunny() });
      const meta = await sharp(png).metadata();
      expect([meta.width, meta.height]).toEqual([1200, 1640]);
      // Le panneau « blanc sur couleur » est bien de la couleur de fond de la piste.
      const { data } = await sharp(png).extract({ left: 60, top: 600, width: 4, height: 4 }).raw().toBuffer({ resolveWithObject: true });
      const hex = `#${[data[0], data[1], data[2]].map((v) => v.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
      expect(hex).toBe(r.colors.ground.toUpperCase());
    });
  });

  it("stories à la une : « Avis » seulement si de vrais avis existent, sinon « Questions »", () => {
    const p = { product: { ...emptyProduct(), facts: [] } } as any;
    expect(hasRealReviews(p)).toBe(false);
    expect(highlightThemes(false)).toEqual(["produit", "questions", "coulisses", "conseils", "nouveautes"]);
    const withReviews = { product: { ...emptyProduct(), facts: [{ key: "avis", label: "Note moyenne des avis", value: "4,6/5 (212 avis Trustpilot)", status: "confirmed", source: "user" }] } } as any;
    expect(hasRealReviews(withReviews)).toBe(true);
    const guessed = { product: { ...emptyProduct(), facts: [{ key: "avis", label: "Avis", value: "très bons", status: "inferred", source: "ai" }] } } as any;
    expect(hasRealReviews(guessed)).toBe(false);
  });

  it("kit : profil, 5 stories à la une, 3 modèles, 2 bannières aux bons formats", async () => {
    await fr(async () => {
      const r = (await designRoutes({ brand: BRAND, cutout: await bunny(), library: "sun", ai: null })).routes[0];
      const kit = await renderSocialKit({ route: r, brand: BRAND, product: await bunny(), productName: "Compagnon", hasReviews: false });
      const size = (item: string) => kit.find((k) => k.item === item)!;
      expect(kit.map((k) => k.item)).toEqual(["profil", "une-produit", "une-questions", "une-coulisses", "une-conseils", "une-nouveautes", "post-annonce", "post-conseil", "post-citation", "banniere-facebook", "banniere-linkedin"]);
      expect([size("profil").width, size("profil").height]).toEqual([1080, 1080]);
      expect([size("une-coulisses").width, size("une-coulisses").height]).toEqual([1080, 1920]);
      expect([size("post-conseil").width, size("post-conseil").height]).toEqual([1080, 1350]);
      expect([size("banniere-facebook").width, size("banniere-linkedin").width]).toEqual([1640, 1128]);
      // L'icône d'une story à la une est bien dessinée (encre blanche au centre, dans la zone ronde visible).
      const img = await loadImage(size("une-questions").png);
      const c = createCanvas(1080, 1920);
      c.getContext("2d").drawImage(img, 0, 0);
      const d = c.getContext("2d").getImageData(540 - 210, 960 - 210, 420, 420).data;
      let white = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i] > 240 && d[i + 1] > 240 && d[i + 2] > 240) white++;
      expect(white / (420 * 420)).toBeGreaterThan(0.04);
    });
  });

  it("ligne éditoriale de l'IA : légende avec allégation remplacée, emojis retirés quand la ligne dit « aucun »", async () => {
    await fr(async () => {
      const product = { ...emptyProduct(), name: "Compagnon lapin", sector: "enfants" as const, category: "Jouet" };
      const brand = localBrand(product, "Lunelle").brand;
      const p = { product, brand: { ...brand, palette: PAL, fonts: { heading: "", body: "" }, direction: "pop", logo: { concept: "", status: "proposed" } }, strategy: null, business: "products", catalog: [] } as any;
      const r = checkSocialVoice(
        {
          pillars: [{ title: "Le compagnon en vrai", idea: "Gestes et détails" }, { title: "Vos questions", idea: "Réponses vérifiées" }, { title: "Coulisses", idea: "La préparation" }],
          say: ["Des phrases courtes", "Ce que montre la photo"],
          dontSay: ["Aucune promesse"],
          emoji: "none",
          emojis: ["✨"],
          captions: [{ pillar: "x", text: "Le jouet 100 % sûr, sécurité garantie pour bébé ✨" }, { pillar: "y", text: "Vous nous demandez l'âge conseillé ✨ : [À compléter : âge conseillé]" }, { pillar: "z", text: "Dans l'atelier ce matin." }],
        },
        p,
      );
      expect(r.fixed.join(" ")).toMatch(/légende 1/);
      expect(r.voice.captions[0].text).not.toMatch(/garanti|100 %/);
      expect(r.voice.captions[1].text).not.toMatch(/✨/);
      expect(r.voice.emojis).toEqual([]);
      // La règle « ne pas dire » vide ou trop courte est complétée par celle du studio.
      expect(r.voice.dontSay.length).toBeGreaterThanOrEqual(2);
      const local = localSocialVoice(p);
      expect(local.captions.every((c) => /\[À compléter/.test(c.text))).toBe(true);
    });
  });
});

describe("dans le studio : pistes, choix, déclinaisons, kit (PNG + ZIP) et charte", () => {
  async function newProject() {
    const u = await createUser(`da-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@test.fr`, "motdepasse-test", "D");
    const pid = id();
    const product = { ...emptyProduct(), name: "Compagnon lapin", sector: "enfants" as const, category: "Jouet", visual: { ...emptyProduct().visual, labelText: ["SOVA"] } };
    const brand = { ...localBrand(product, "Lunelle").brand, palette: PAL, fonts: { heading: "montserrat_n7", body: "jost_n4" }, direction: "pop", logo: { concept: "", status: "proposed" } };
    run(
      "INSERT INTO projects (id, user_id, name, status, platform, product_json, brand_json, settings_json, sources_json, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
      pid, u.id, "Lunelle", "creating", "shopify", JSON.stringify(product), JSON.stringify(brand), JSON.stringify({ language: "fr" }), "[]", now(), now(),
    );
    return pid;
  }

  it("trois pistes enregistrées avec leurs planches ; choix → déclinaisons, kit réseaux (PNG + ZIP) et charte avec planche « Réseaux sociaux »", async () => {
    await fr(async () => {
      const pid = await newProject();
      const { ai } = fakeAi({});
      await generateLogos(null, pid, { redrawSymbol: true, routeAi: ai });
      const props = latestProposals(pid);
      expect(props.map((x) => x.info.key)).toEqual(["produit", "concept", "typo"]);
      for (const pr of props) expect(one("SELECT 1 FROM assets WHERE role = 'logo-route-board' AND source_asset_id = ?", pr.id)).toBeTruthy();
      let p = loadProject(pid);
      expect(p.brand!.logo.proposal).toBe("produit");
      expect(p.brand!.logo.route?.heading).toBe("Jost");
      expect(p.brand!.social?.pillars).toHaveLength(3);
      const kit = latestSocialKit(pid)!;
      expect(kit.items).toHaveLength(11);
      const { assetData } = await import("@/lib/library");
      const files = Object.keys(unzipSync(new Uint8Array(assetData(kit.zip!))));
      expect(files.filter((f) => f.endsWith(".png"))).toHaveLength(11);
      expect(files.some((f) => f.endsWith(".md"))).toBe(true);

      // Choix d'une autre piste : typographies du kit et déclinaisons suivent.
      const { applyLogo } = await import("@/lib/engine/identity");
      const typo = props.find((x) => x.info.key === "typo")!;
      await applyLogo(null, pid, { key: "typo", label: typo.info.label, concept: typo.info.concept, spec: typo.info.spec, colors: typo.info.colors, route: typo.info.route });
      p = loadProject(pid);
      expect(p.brand!.logo.route?.heading).toBe("Bricolage Grotesque");
      const svgMain = all<{ id: string }>("SELECT id FROM assets WHERE project_id = ? AND role = 'logo-mark-svg' ORDER BY created_at DESC LIMIT 1", pid)[0];
      expect(Buffer.from((await import("@/lib/library")).assetData((await import("@/lib/library")).getAsset(svgMain.id)!)).toString()).not.toMatch(/<text|<script/);
      const book = await saveBrandBook(pid);
      expect(JSON.parse(book!.meta as any).pages).toBe(11);

      // Changement de nom sans nouvelle création : pas d'appel à l'IA, pistes reprises.
      const { ai: ai2, calls } = fakeAi({});
      run("UPDATE projects SET brand_json = json_set(brand_json, '$.name', 'Lunelia') WHERE id = ?", pid);
      await generateLogos(null, pid, { routeAi: ai2 });
      expect(calls.review).toHaveLength(0);
      expect(latestProposals(pid).map((x) => x.info.route.name)).toEqual(props.map((x) => x.info.route.name));
    });
  });

  it("réserve de 3 pistes : une suppression libère une place, « Nouvelles pistes » complète sans remplacer, jamais plus de 3", async () => {
    await fr(async () => {
      const { removeProposal } = await import("@/lib/engine/identity");
      const pid = await newProject();
      await generateLogos(null, pid, { redrawSymbol: true, routeAi: null });
      const first = latestProposals(pid);
      expect(first).toHaveLength(3);
      const applied = loadProject(pid).brand!.logo.proposalId;
      expect(first.map((x) => x.id)).toContain(applied);
      // Pleine : pas de nouvelle piste tant qu'aucune n'est supprimée.
      await expect(generateLogos(null, pid, { redrawSymbol: true, add: true, routeAi: null })).rejects.toThrow(/supprimez-en une/);
      const gone = first.find((x) => x.id !== applied)!;
      removeProposal(pid, gone.id);
      expect(latestProposals(pid)).toHaveLength(2);
      await generateLogos(null, pid, { redrawSymbol: true, add: true, routeAi: null });
      const after = latestProposals(pid);
      expect(after).toHaveLength(3);
      // Les deux pistes gardées sont toujours là, la supprimée non ; le logo en place n'a pas changé.
      for (const k of first.filter((x) => x.id !== gone.id)) expect(after.map((x) => x.id)).toContain(k.id);
      expect(after.map((x) => x.id)).not.toContain(gone.id);
      expect(loadProject(pid).brand!.logo.proposalId).toBe(applied);
    });
  });

  it("charte sans kit : 10 planches (pas de planche vide)", async () => {
    await fr(async () => {
      const product = { ...emptyProduct(), name: "X", sector: "maison" as const };
      const b = { ...localBrand(product, "Brume").brand, palette: PAL, fonts: { heading: "", body: "" }, direction: "atelier", logo: { concept: "", status: "proposed" } } as any;
      const r = renderBrandBook({ brand: b, strategy: null, headingFamily: "Cormorant", bodyFamily: "Jost", logo: null, logoLight: null, logoWeb: null, mark: null, product: null, sectorLabel: "Maison", date: new Date() });
      expect(r.pages).toHaveLength(10);
    });
  });
});

describe("« Nouvelles pistes » : refonte radicale, jamais une variante", () => {
  it("sans IA : chaque nouvelle série change de typographies (aucune reprise de la série précédente)", async () => {
    const { avoidOf } = await import("@/lib/engine/creative-direction");
    const first = await fr(() => designRoutes({ brand: BRAND, cutout: null, library: "spark", ai: null }));
    const avoid = avoidOf(first.routes);
    const second = await fr(() => designRoutes({ brand: BRAND, cutout: null, library: "spark", ai: null, avoid, variant: 1 }));
    const before = new Set(first.routes.map((r) => r.heading));
    expect(second.routes.length).toBe(first.routes.length);
    for (const r of second.routes) expect(before.has(r.heading), `${r.key} ${r.heading}`).toBe(false);
    // Composition ou traitement des couleurs changent aussi.
    const sig = (r: CreativeRoute) => `${r.key}:${r.composition}:${r.roles?.ground}:${r.roles?.accent}`;
    expect(second.routes.map(sig)).not.toEqual(first.routes.map(sig));
    const third = await fr(() => designRoutes({ brand: BRAND, cutout: null, library: "spark", ai: null, avoid: avoidOf(second.routes), variant: 2 }));
    for (const r of third.routes) expect(new Set(second.routes.map((x) => x.heading)).has(r.heading)).toBe(false);
  });

  it("avec l'IA : une piste trop proche de la série précédente est refusée et redessinée avec la consigne", async () => {
    const { avoidOf } = await import("@/lib/engine/creative-direction");
    const shown = await fr(() => designRoutes({ brand: BRAND, cutout: null, library: "spark", ai: fakeAi({}).ai }));
    const avoid = avoidOf(shown.routes);
    const fresh: RouteDraft = { ...D_CONCEPT, name: "Le phare de poche", why: "Un phare minuscule dont le faisceau devient une bulle : la marque veille et répond. Une idée neuve, loin de la lune.", heading: "Libre Baskerville", composition: "emblem", ground: "light", accent: "accent" };
    // Même série que la précédente : refusée (même typographie / même nom), puis reprise avec une idée neuve.
    const { ai, calls } = fakeAi({ redraws: { concept: [fresh], produit: [{ ...D_PRODUIT, name: "Le nid", heading: "Archivo", composition: "stacked" }], typo: [{ ...D_TYPO, name: "Lettre ouverte", heading: "Space Grotesk", ground: "dark" }] } });
    const next = await fr(() => designRoutes({ brand: BRAND, cutout: null, library: "spark", ai, avoid, variant: 1 }));
    expect(calls.redraw.map((c) => c.key).sort()).toEqual(["concept", "produit", "typo"]);
    expect(calls.redraw.every((c) => /déjà montrée/.test(c.feedback))).toBe(true);
    const concept = next.routes.find((r) => r.key === "concept")!;
    expect(concept.name).toBe("Le phare de poche");
    for (const r of next.routes) expect(avoid.some((a) => a.heading === r.heading), r.name).toBe(false);
  });
});
