/**
 * Qualité des textes et de l'identité : réponses d'IA médiocres ou mensongères simulées, contrôles qui doivent
 * les rattraper (allégations, formules creuses, longueurs, noms déjà pris, palettes sans contraste), et moteur
 * local qui ne doit jamais produire lui-même ces défauts. Cas réel : SOVA, compagnon pour enfant (rose, oreilles).
 */
import { describe, expect, it, vi } from "vitest";

// IA simulée pour les annonces : réponses défaillantes, puis toujours défaillantes après la reprise.
const llm = vi.hoisted(() => ({ calls: 0, replies: [] as unknown[] }));
vi.mock("@/lib/ai/llm", async (orig) => ({
  ...(await orig<typeof import("@/lib/ai/llm")>()),
  llmConfigured: () => true,
  // La réponse simulée passe par le même schéma que la vraie (tolérances et bornes comprises).
  llmJson: async (_call: unknown, schema: { parse: (v: unknown) => unknown }) => schema.parse(llm.replies[Math.min(llm.calls++, llm.replies.length - 1)]),
}));

vi.mock("@/lib/ai/context", async (orig) => ({ ...(await orig<typeof import("@/lib/ai/context")>()), projectContext: () => "<contexte_projet></contexte_projet>" }));

import { copyQuality, lintClaims, lintHollow, scrubClaims } from "@/lib/ai/tasks";
import { brandIssues, famousBrandClash, finalizeBrand, fixPalette, paletteIssues } from "@/lib/engine/brand-check";
import { localBrand, paletteFromColors } from "@/lib/engine/local";
import { localCopy } from "@/lib/engine/local-copy";
import { checkPostDrafts, localPlan, shortLine } from "@/lib/engine/calendar";
import { adProblems, draftAds, localAds } from "@/lib/engine/ads";
import { logoColors, proposeTaglines } from "@/lib/engine/identity";
import { logoTagline } from "@/lib/media/logo";
import { contrast, hsl } from "@/lib/color";
import { runWithLang } from "@/lib/i18n-server";
import { emptyProduct, PRODUCT_SECTOR_IDS, type Brand } from "@/lib/project-types";
import type { PostDraft } from "@/lib/ai/tasks";
import type { Project } from "@/lib/projects";

const SOVA_COLORS = [
  { hex: "#E6C4C2", share: 0.38, name: "rouge pâle" },
  { hex: "#E4E2E1", share: 0.22, name: "blanc cassé" },
  { hex: "#E9E9E7", share: 0.21, name: "blanc cassé" },
  { hex: "#D4B0AF", share: 0.17, name: "rouge pâle" },
];
const sova = (facts: Project["product"]["facts"] = []) =>
  ({
    id: "p-sova",
    business: "products",
    settings: { language: "fr" },
    catalog: [],
    product: { ...emptyProduct(), name: "SOVA", nameStatus: "provided", sector: "enfants", category: "Compagnon pour enfant", summary: "Compagnon pour enfant : boîtier rose à oreilles, disque central.", facts, price: { amount: 39.9, currency: "EUR", status: "confirmed" }, visual: { colors: SOVA_COLORS } },
  }) as unknown as Project;

/** Textes qu'une IA complaisante écrit volontiers pour un produit pour enfants. */
const BAD_FR = [
  "Sans danger pour les bébés.",
  "Votre enfant joue en toute sécurité.",
  "Matériaux non toxiques et sans BPA.",
  "Conforme aux normes CE et EN 71.",
  "Recommandé par les pédiatres.",
  "SOVA aide votre bébé à s'endormir.",
  "Favorise l'endormissement.",
  "Apaise votre enfant la nuit.",
  "Stimule le développement de votre enfant.",
  "Un objet éco-responsable.",
  "Boîtier incassable.",
  "Fait main en France.",
  "Livraison offerte dès aujourd'hui.",
  "Expédié sous 24 h.",
  "Retours gratuits.",
  "30 jours pour changer d'avis.",
  "Déjà 10 000 parents conquis.",
  "Le meilleur compagnon du marché.",
  "Seulement 29,90 € au lieu de 39,90 €.",
  "Testé en laboratoire.",
];
const BAD_EN = ["Safe for kids.", "Non-toxic and BPA-free.", "Recommended by pediatricians.", "Helps your baby sleep.", "Boosts your child's development.", "Eco-friendly design.", "Free returns.", "Ships in 24 hours.", "Loved by 5,000 families.", "Waterproof shell."];

describe("allégations : un produit pour enfants ne promet rien sans preuve", () => {
  it("chaque allégation typique (FR et EN) est repérée", () => {
    const p = sova();
    for (const t of [...BAD_FR, ...BAD_EN]) expect(lintClaims({ t }, p).length, t).toBeGreaterThan(0);
  });

  it("un texte factuel et concret passe sans fausse alerte (prix confirmé compris)", () => {
    const p = sova();
    const ok = { hero: "SOVA, le compagnon rose aux deux oreilles.", text: "Un boîtier rond aux bords arrondis, un disque central blanc. Prix : 39,90 €.", cta: "Découvrir SOVA" };
    expect(lintClaims(ok, p)).toEqual([]);
    expect(lintHollow(ok)).toEqual([]);
  });

  it("une information confirmée par le client n'est plus une allégation", () => {
    const p = sova([{ key: "standard", label: "Normes", value: "Conforme à la norme EN 71", status: "confirmed", source: "user" }]);
    expect(lintClaims({ t: "Conforme à la norme EN 71." }, p)).toEqual([]);
  });

  it("filet de sécurité : la phrase fautive est retirée, le reste et la structure HTML sont gardés", () => {
    const p = sova();
    const r = scrubClaims({ html: "<p>Doux au toucher.</p><p>Favorise l'endormissement de votre enfant.</p><ul><li>Rose</li><li>Testé en laboratoire</li></ul>", caption: "Bonne nuit !\nSOVA aide votre bébé à s'endormir.\nÀ découvrir.", hero: "Sans danger pour les bébés." }, p);
    expect(r.content.html).toBe("<p>Doux au toucher.</p><ul><li>Rose</li></ul>");
    expect(r.content.caption).toBe("Bonne nuit !\nÀ découvrir.");
    expect(r.content.hero).toBe("[À compléter : …]");
    expect(lintClaims(r.content, p)).toEqual([]);
    expect(r.removed.length).toBe(4);
  });
});

describe("textes de boutique : qualité d'agence", () => {
  it("formules creuses, longueurs, tirets et nom du produit sont signalés à l'IA", () => {
    const p = sova();
    const copy = runWithLang({ content: "fr" }, () => localCopy(p.product, { name: "SOVA", tagline: "", story: "", values: [] }));
    expect(copyQuality(copy, p)).toEqual([]);
    const bad = { ...copy, seo: { title: "SOVA ".repeat(20), description: copy.seo.description }, hero: { ...copy.hero, heading: "Le compagnon révolutionnaire de qualité supérieure — enfin" }, product: { ...copy.product, title: "Veilleuse lapin" } };
    const issues = copyQuality(bad, p).join("\n");
    expect(issues).toMatch(/seo\.title/);
    expect(issues).toMatch(/révolutionnaire/);
    expect(issues).toMatch(/qualité supérieure/);
    expect(issues).toMatch(/Tirets cadratins/);
    expect(issues).toMatch(/product\.title/);
  });
});

describe("marque : nom, signature, palette", () => {
  const base: Brand = {
    name: "Pixel",
    nameStatus: "proposed",
    alternatives: ["Signal", "Faisceau"],
    tagline: "Grandir en toute sécurité, des nuits apaisées pour tous les enfants du monde entier.",
    positioning: "Le compagnon idéal, révolutionnaire.",
    audience: "Parents",
    personality: [],
    tone: { voice: "", do: [], dont: [] },
    palette: { primary: "#F2C4CE", secondary: "#E9E9E9", accent: "#FFD6A5", light: "#FFFFFF", dark: "#9A9A9A" },
    fonts: { heading: "montserrat_n8", body: "karla_n4" },
    logo: { concept: "", status: "proposed" },
    story: "Fondée par deux parents. Nos matériaux sont non toxiques et sans BPA.",
    values: [{ title: "Sécurité", text: "Testé en laboratoire." }],
    direction: "pop",
    validated: [],
    generatedBy: "ai",
  };

  it("nom déjà pris, signature trop longue, allégations, formules creuses et palette illisible sont détectés", () => {
    const codes = brandIssues(base, sova()).map((i) => i.code);
    for (const c of ["name_taken", "tagline", "claim", "hollow", "palette"]) expect(codes, c).toContain(c);
    expect(brandIssues({ ...base, name: "Compagnon pour enfant" }, sova()).map((i) => i.code)).toContain("name_generic");
  });

  it("le nom donné par le client n'est jamais contesté", () => {
    expect(brandIssues({ ...base, name: "SOVA", nameStatus: "provided" }, sova()).map((i) => i.code)).not.toContain("name_taken");
  });

  it("noms célèbres reconnus, habillage compris ; noms inventés libres", () => {
    expect(famousBrandClash("Maison Pixel")).toBe("pixel");
    expect(famousBrandClash("The Kindle Co")).toBe("kindle");
    expect(famousBrandClash("SOVA")).toBeNull();
    expect(famousBrandClash("Faisceau")).toBeNull();
  });

  it("palette corrigée sans changer son caractère : contrastes AA atteints", () => {
    expect(paletteIssues(base.palette).length).toBeGreaterThan(0);
    const fixed = fixPalette(base.palette);
    expect(paletteIssues(fixed)).toEqual([]);
    expect(contrast(fixed.dark, fixed.light)).toBeGreaterThanOrEqual(7);
    expect(contrast(fixed.primary, fixed.light)).toBeGreaterThanOrEqual(4.5);
  });

  it("dernière passe : nom libre adopté, allégations retirées, points restants listés pour le client", () => {
    const { brand } = runWithLang({ content: "fr", ui: "fr" }, () => finalizeBrand(base, { audience: [], angles: [], pillars: [], keyMessages: ["Sans danger pour bébé."], generatedBy: "ai" }, sova()));
    expect(brand.name).toBe("Faisceau");
    expect(brand.alternatives).not.toContain("Signal");
    expect(brand.story).toBe("Fondée par deux parents.");
    expect(lintClaims({ t: brand.tagline, s: brand.story, v: brand.values }, sova())).toEqual([]);
    expect(paletteIssues(brand.palette)).toEqual([]);
    expect(brand.checks!.join("\n")).toMatch(/non confirmée retirée/);
  });
});

describe("moteur local : aucune allégation, aucun nom pris, palettes lisibles", () => {
  for (const lang of ["fr", "en"] as const) {
    it(`tous les secteurs produits (${lang})`, () => {
      runWithLang({ content: lang, ui: lang }, () => {
        for (const sector of PRODUCT_SECTOR_IDS) {
          for (const seed of ["#E6C4C2", "#7B7D82", "#1D4ED8", "#2F7D32", "#C2410C"]) {
            const product = { ...emptyProduct(), name: "", sector, visual: { colors: [{ hex: seed, name: "", share: 1 }] } };
            const p = { business: "products", catalog: [], product, settings: { language: lang } } as unknown as Project;
            const b = localBrand(product, undefined, p);
            expect(famousBrandClash(b.brand.name), `${sector} ${b.brand.name}`).toBeNull();
            for (const a of b.brand.alternatives) expect(famousBrandClash(a), `${sector} ${a}`).toBeNull();
            expect(paletteIssues(fixPalette(b.brand.palette))).toEqual([]);
            const proj = { ...p, brand: b.brand, strategy: b.strategy } as Project;
            const texts = { brand: b.brand, strategy: b.strategy, taglines: proposeTaglines(proj), copy: localCopy(product, b.brand), posts: localPlan(proj, { startDate: "2026-01-01", days: 6, perDay: 1, slots: ["10:00"], timezone: "Europe/Paris", networks: [{ network: "instagram" }], goals: "", tone: "", mix: { photo: 100, video: 0, text: 0 }, approval: "manual" }).map((x) => ({ t: x.title, c: x.caption, h: x.visual.headline })), ads: localAds(proj, lang, 4) };
            expect(lintClaims(texts, proj), sector).toEqual([]);
            expect(lintHollow(texts), sector).toEqual([]);
          }
        }
      });
    });
  }

  it("produit gris : palette neutre et un seul accent (pas de bleu inventé à partir d'un reflet)", () => {
    const pal = paletteFromColors([{ hex: "#7B7D82", share: 0.3 }, { hex: "#373B41", share: 0.3 }, { hex: "#A9ABAF", share: 0.2 }], "hightech");
    expect(hsl(pal.primary)[1]).toBeLessThan(0.12);
    expect(hsl(pal.accent)[1]).toBeGreaterThan(0.4);
    expect(logoColors({ brand: { palette: pal } as Brand }).accent).toBe(pal.accent);
  });

  it("produit rose pastel (SOVA) : couleur principale rose profond, pas brun brique", () => {
    const pal = paletteFromColors(SOVA_COLORS, "enfants");
    const [h] = hsl(pal.primary);
    expect(h > 330 || h < 5).toBe(true);
    expect(contrast(pal.primary, "#FFFFFF")).toBeGreaterThanOrEqual(4.5);
  });

  it("signature dans un logo : sans point final, omise si trop longue", () => {
    runWithLang({ content: "fr" }, () => {
      expect(logoTagline("Pour les petits, avec soin.", 34)).toBe("POUR LES PETITS, AVEC SOIN");
      expect(logoTagline("Une signature beaucoup trop longue pour un petit emblème rond", 34)).toBe("");
    });
  });
});

describe("calendrier : aucune allégation ne part sans relecture", () => {
  const post = (caption: string, headline = "Un compagnon tout doux pour les nuits"): PostDraft => ({ day: 0, slot: 0, network: "instagram", format: "image", angle: "Produit", title: "SOVA", caption, hashtags: ["#sova", "doudou"], visual: { kind: "creative", headline, subline: "", layout: "editorial" } });

  it("réécrite une fois ; si l'IA s'entête, l'allégation est retirée et la publication marquée « à vérifier »", async () => {
    const p = sova();
    const fixed = await runWithLang({ content: "fr", ui: "fr" }, () => checkPostDrafts([post("Livraison offerte ! Le compagnon rose de vos enfants.")], p, async () => ({ title: "SOVA", caption: "Le compagnon rose de vos enfants.", hashtags: ["sova"] })));
    expect(fixed[0].caption).toBe("Le compagnon rose de vos enfants.");
    expect(fixed[0].claims).toBeUndefined();
    const stubborn = await runWithLang({ content: "fr", ui: "fr" }, () => checkPostDrafts([post("Sans danger pour bébé. Le compagnon rose.")], p, async () => ({ title: "SOVA", caption: "Sans danger pour bébé. Le compagnon rose.", hashtags: [] })));
    expect(stubborn[0].caption).toBe("Le compagnon rose.");
    expect(stubborn[0].claims?.length).toBeGreaterThan(0);
    // Titre du visuel coupé à un mot entier.
    expect(fixed[0].visual.headline).toBe("Un compagnon tout doux pour les nuits");
    expect(shortLine("Un compagnon tout doux pour les nuits calmes et longues", 40)).toBe("Un compagnon tout doux pour les nuits");
  });
});

describe("publicités : réponses médiocres de l'IA rattrapées", () => {
  it("reprise demandée, puis nettoyage si l'IA garde ses allégations", async () => {
    const base = sova();
    const p = { ...base, brand: { ...runWithLang({ content: "fr" }, () => localBrand(base.product, "SOVA", base)).brand } } as unknown as Project;
    const bad = { ads: [{ angle: "Sommeil", primary: "SOVA aide votre bébé à s'endormir. Un boîtier rose aux oreilles de lapin.", headline: "Le compagnon révolutionnaire", cta: "Acheter" }] };
    expect(adProblems(bad.ads, p).length).toBeGreaterThan(0);
    llm.calls = 0;
    llm.replies = [bad, bad];
    const r = await runWithLang({ content: "fr", ui: "fr" }, () => draftAds(p, { userId: "u", count: 1 }));
    expect(llm.calls).toBe(2);
    expect(r.ads[0].primary).toBe("Un boîtier rose aux oreilles de lapin.");
    expect(lintClaims(r.ads, p)).toEqual([]);
  });
});

describe("boucles de contrôle avec une IA simulée", () => {
  it("textes de boutique : trois passes fautives, puis rien de faux n'est gardé et les points restent signalés", async () => {
    const { aiShopCopyChecked } = await import("@/lib/ai/tasks");
    const p = sova();
    const good = runWithLang({ content: "fr" }, () => localCopy(p.product, { name: "SOVA", tagline: "", story: "", values: [] }));
    const bad = { ...good, hero: { ...good.hero, text: "Sans danger pour les bébés. Un boîtier rose aux oreilles." }, shipping: { ...good.shipping, body_html: "<p>Livraison offerte.</p><p>[À compléter : délais]</p>" } };
    const qcOk = { verdict: "ok", issues: [] };
    llm.calls = 0;
    llm.replies = [bad, qcOk, bad, qcOk, bad, qcOk];
    const r = await runWithLang({ content: "fr", ui: "fr" }, () => aiShopCopyChecked({ userId: "u", projectId: "p", usageKey: "k" }, p));
    expect(r.qc.rounds).toBe(3);
    expect(r.qc.remaining.length).toBeGreaterThan(0);
    expect(r.copy.hero.text).toBe("Un boîtier rose aux oreilles.");
    expect(lintClaims(r.copy, p)).toEqual([]);
  });

  it("marque : une proposition au nom déjà pris est reprise une fois avec les corrections", async () => {
    const { aiBrandChecked } = await import("@/lib/engine/brand-check");
    const p = sova();
    const brand = (name: string, tagline: string) => ({ name, nameStatus: "proposed", alternatives: ["Luciole"], tagline, positioning: "Pour les parents.", audience: "Parents", personality: [], tone: { voice: "", do: [], dont: [] }, palette: { primary: "#8A2E43", secondary: "#E2CAD0", accent: "#C9775E", light: "#F7F2F3", dark: "#1F1417" }, fonts: { heading: "x", body: "y" }, direction: "pop", directionReason: "", logo: { concept: "", family: "Jost", weight: 1200, italic: false, case: "upper", tracking: 0.9, layout: "wordmark", emblem: "none" }, story: "", values: [], strategy: { audience: [], angles: [], pillars: [], keyMessages: [] } });
    llm.calls = 0;
    llm.replies = [brand("Kinder", "Des nuits apaisées, garanties."), brand("Ourson", "Le compagnon rose aux oreilles.")];
    const r = await runWithLang({ content: "fr", ui: "fr" }, () => aiBrandChecked({ userId: "u", projectId: "p", usageKey: "k" }, p));
    expect(llm.calls).toBe(2);
    expect(r.name).toBe("Ourson");
    // Graisse et interlettrage hors bornes ramenés dans l'intervalle lisible (au lieu de faire échouer l'étape).
    expect(r.logo.weight).toBe(900);
    expect(r.logo.tracking).toBe(0.3);
  });
});
