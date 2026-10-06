/**
 * Passe « excellence » des réseaux sociaux : calendrier éditorial (piliers, séries, formats natifs, accroches,
 * appels à l'interaction, hashtags, temps forts honnêtes, pas de répétition), boucle de qualité « directeur de
 * création social media » avec IA simulée (réponses excellentes, moyennes, mauvaises), ligne éditoriale du kit,
 * éditeur de publication et assistant de retouche de la boutique (jamais de fausse affirmation de changement).
 * Cas d'exemple : compagnon pour enfant d'une marque inventée (Lunelle).
 */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { createUser } from "@/lib/auth";
import { id, now, run } from "@/lib/db";
import { loadProject, type Project } from "@/lib/projects";
import { runWithLang } from "@/lib/i18n-server";
import { emptyProduct, type SocialVoice } from "@/lib/project-types";
import { localBrand } from "@/lib/engine/local";
import { lintClaims, lintHollow, SocialReviewSchema, type PostDraft } from "@/lib/ai/tasks";
import { systemPrompts } from "@/lib/ai/prompts";
import { localPlan, localStrategy, quotedHeadline, scheduleLines, type PlanParams } from "@/lib/engine/calendar";
import { keyMoments, NETWORK_RULES, normalizePost, planIssues, planQuality, postAdvice, refinePlan, reviewPassed, voiceIssues, type SocialQualityAi, type SocialReview } from "@/lib/engine/social-quality";
import { ensureSocialVoice, localSocialVoice, voiceMarkdown } from "@/lib/engine/social-kit";
import { claimsChange, honestChatNote } from "@/lib/engine/shop-chat";

const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);
const en = <T,>(fn: () => T) => runWithLang({ ui: "en", content: "en" }, fn);

/** Compagnon pour enfant (marque inventée « Lunelle ») : faits confirmés, deux coloris, une vraie question de client. */
function lunelle(lang: "fr" | "en" = "fr"): Project {
  const product = {
    ...emptyProduct(),
    name: lang === "fr" ? "Compagnon lapin" : "Bunny companion",
    nameStatus: "provided" as const,
    sector: "enfants" as const,
    category: lang === "fr" ? "Compagnon pour enfant" : "Kids companion",
    facts: [
      { key: "size", label: lang === "fr" ? "Dimensions" : "Size", value: "14 × 12 cm", status: "confirmed" as const, source: "user" as const },
      { key: "material", label: lang === "fr" ? "Matière" : "Material", value: lang === "fr" ? "silicone souple au toucher" : "soft-touch silicone", status: "confirmed" as const, source: "user" as const },
      { key: "charge", label: lang === "fr" ? "Recharge" : "Charging", value: lang === "fr" ? "câble USB-C fourni" : "USB-C cable included", status: "confirmed" as const, source: "user" as const },
      { key: "shipping", label: lang === "fr" ? "Livraison" : "Shipping", value: "", status: "unknown" as const, source: "ai" as const },
    ],
    variants: [{ name: lang === "fr" ? "Coloris" : "Color", values: lang === "fr" ? ["Rose poudré", "Bleu nuit"] : ["Powder pink", "Midnight blue"] }],
    questions: [{ id: "q1", question: lang === "fr" ? "Combien de temps tient la batterie" : "How long does the battery last", answer: lang === "fr" ? "Environ 8 heures en lumière douce, d'après nos essais." : "About 8 hours on soft light, in our own tests.", why: "", field: "battery" }],
    price: { amount: 3990, currency: "EUR", status: "confirmed" as const },
  } as any;
  const p = { id: "p-lunelle", userId: "u", name: "Lunelle", business: "products", catalog: [], settings: { language: lang, timezone: "Europe/Paris" }, product, strategy: null } as unknown as Project;
  const b = (lang === "fr" ? fr : en)(() => localBrand(product, "Lunelle", p));
  return { ...p, brand: b.brand, strategy: b.strategy } as Project;
}

const PARAMS: PlanParams = {
  startDate: "2026-10-12",
  days: 14,
  perDay: 1,
  slots: ["11:30"],
  timezone: "Europe/Paris",
  networks: [{ network: "instagram" }, { network: "tiktok" }, { network: "instagram" }, { network: "facebook" }, { network: "pinterest" }],
  goals: "",
  tone: "",
  mix: { photo: 50, video: 30, text: 20 },
  link: "https://lunelle.example/products/compagnon-lapin",
  approval: "manual",
};

const firstLine = (c: string) => (c.split("\n").find((l) => l.trim()) ?? "").trim();
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9à-ÿ]+/g, " ").trim();

// ---------------------------------------------------------------- moteur local

describe("calendrier du studio (sans IA) : niveau community manager", () => {
  for (const lang of ["fr", "en"] as const) {
    it(`14 jours pour le compagnon pour enfant (${lang}) : variété, formats natifs, accroches, hashtags, rien d'inventé`, () => {
      const p = lunelle(lang);
      const posts = (lang === "fr" ? fr : en)(() => localPlan(p, PARAMS));
      expect(posts).toHaveLength(14);
      const q = (lang === "fr" ? fr : en)(() => planQuality(posts, p));
      expect(q.global, JSON.stringify(q.global)).toEqual([]);
      expect(q.score, JSON.stringify([...q.issues.entries()])).toBeGreaterThanOrEqual(8);
      // Rien d'inventé, aucune formule creuse.
      expect(lintClaims(posts.map((x) => ({ t: x.title, c: x.caption, h: x.visual.headline, s: x.visual.slides ?? [] })), p)).toEqual([]);
      expect(lintHollow(posts.map((x) => ({ t: x.title, c: x.caption, h: x.visual.headline })))).toEqual([]);
      // Pas de répétition d'un jour à l'autre : angle, accroche, titre de visuel.
      for (let i = 1; i < posts.length; i++) expect(posts[i].angle, `jour ${i + 1}`).not.toBe(posts[i - 1].angle);
      const hooks = posts.map((x) => norm(firstLine(x.caption)));
      expect(new Set(hooks).size).toBe(hooks.length);
      // Formats natifs et variés : TikTok en vidéo, Pinterest en Pin, au moins un carrousel avec ses diapositives.
      for (const x of posts) expect(NETWORK_RULES[x.network].formats, `${x.network} ${x.format}`).toContain(x.format);
      expect(new Set(posts.map((x) => x.format)).size).toBeGreaterThanOrEqual(4);
      const carousel = posts.find((x) => x.format === "carousel");
      expect(carousel?.visual.slides?.length).toBeGreaterThanOrEqual(3);
      // Hashtags en nombre raisonnable, propres, jamais génériques.
      for (const x of posts) {
        const [min, max] = NETWORK_RULES[x.network].tags;
        expect(x.hashtags.length, `${x.network} ${x.hashtags}`).toBeLessThanOrEqual(max);
        expect(x.hashtags.length, `${x.network} ${x.hashtags}`).toBeGreaterThanOrEqual(min);
        for (const t of x.hashtags) expect(t).toMatch(/^[\p{L}\p{N}_]+$/u);
      }
      // Lien cliquable seulement là où il l'est (Instagram : « lien en bio »).
      for (const x of posts.filter((y) => y.network === "instagram" || y.network === "tiktok")) expect(x.caption).not.toMatch(/https?:\/\//);
      // Accroche : jamais « Découvrez… » ni le nom de la marque suivi de deux-points.
      for (const x of posts) expect(firstLine(x.caption)).not.toMatch(/^(Découvrez|Voici|Discover|Introducing|Lunelle\s*:)/i);
      // Temps fort honnête (Halloween pour un produit enfant), sans promotion.
      expect(posts.some((x) => /Halloween/.test(x.caption))).toBe(true);
      expect(posts.map((x) => x.caption).join(" ")).not.toMatch(/-\s?\d+\s?%|promo|réduction|offert|discount|% off|free shipping/i);
      // Série récurrente reconnaissable, vraie question de client reprise telle quelle.
      expect(posts.some((x) => x.series)).toBe(true);
      expect(posts.some((x) => x.caption.includes(lang === "fr" ? "8 heures" : "8 hours"))).toBe(true);
      expect((lang === "fr" ? fr : en)(() => localStrategy(p, PARAMS, posts))).toMatch(lang === "fr" ? /Piliers en alternance/ : /Alternating pillars/);
    });
  }

  it("sans aucun fait confirmé : un seul « [À compléter : …] » au plus par publication, toujours varié", () => {
    fr(() => {
      const base = lunelle();
      const p = { ...base, product: { ...base.product, facts: [], variants: [], questions: [] } } as Project;
      const posts = localPlan(p, { ...PARAMS, networks: [{ network: "instagram" }, { network: "facebook" }] });
      for (const x of posts) expect((x.caption.match(/\[À compléter/g) ?? []).length, x.caption).toBeLessThanOrEqual(1);
      const q = planQuality(posts, p);
      expect(q.score, JSON.stringify([...q.issues.entries(), q.global])).toBeGreaterThanOrEqual(8);
      expect(lintClaims(posts.map((x) => x.caption), p)).toEqual([]);
    });
  });

  it("temps forts : seulement ceux de la période et du secteur", () => {
    fr(() => {
      expect(keyMoments("2026-10-12", 14, "enfants").map((m) => m.id)).toEqual(["halloween"]);
      expect(keyMoments("2026-12-01", 14, "bijoux").map((m) => m.id)).toEqual(["noel"]);
      expect(keyMoments("2026-07-01", 14, "bijoux")).toEqual([]);
      expect(keyMoments("2026-10-12", 14, "hightech").map((m) => m.id)).toEqual([]);
      // Fête des mères en France : dernier dimanche de mai ; aux États-Unis : 2e dimanche.
      expect(keyMoments("2026-05-20", 14, "beaute").find((m) => m.id === "meres")?.date).toBe("2026-05-31");
      expect(en(() => keyMoments("2026-05-01", 14, "beaute")).find((m) => m.id === "meres")?.date).toBe("2026-05-10");
    });
  });

  it("dates et horaires transmis à l'IA, jour par jour", () => {
    const lines = fr(() => scheduleLines({ ...PARAMS, days: 2 }));
    expect(lines).toMatch(/day 0 : lundi 12 octobre · slot 0 à 11:30/);
    expect(lines.split("\n")).toHaveLength(2);
  });
});

// ---------------------------------------------------------------- normalisation

describe("normalisation d'une publication (réseau, hashtags, emojis, lien)", () => {
  const draft = (over: Partial<PostDraft>): PostDraft => ({ day: 0, slot: 0, network: "instagram", format: "image", angle: "Détail", title: "t", caption: "Un détail.", hashtags: [], visual: { kind: "creative", headline: "Vu de près", subline: "", layout: "editorial" }, ...over });

  it("format natif, hashtags bornés et pertinents, hashtags de la légende rangés, lien en bio, emojis selon la ligne", () => {
    fr(() => {
      const tiktok = normalizePost(draft({ network: "tiktok", format: "image" }));
      expect(tiktok.format).toBe("video");
      expect(tiktok.visual.kind).toBe("video");
      expect(normalizePost(draft({ network: "pinterest", format: "carousel" })).format).toBe("pin");
      expect(normalizePost(draft({ network: "youtube", format: "reel" })).format).toBe("short");
      const ig = normalizePost(
        draft({ caption: "Deux oreilles — un disque ✨🌙🐰\nÀ voir sur https://lunelle.example #veilleuse #fyp", hashtags: ["#Lunelle", "lunelle", "viral", "chambre enfant", "décoration", "cadeau", "naissance", "bébé"] }),
        { emoji: "sparing" },
      );
      expect(ig.caption).not.toMatch(/—|https?:|#/);
      expect(ig.caption).toMatch(/lien en bio/);
      expect(ig.caption.match(/\p{Extended_Pictographic}/gu)).toHaveLength(1);
      expect(ig.hashtags).toEqual(["Lunelle", "chambreenfant", "decoration", "cadeau", "naissance"]);
      expect(normalizePost(draft({ caption: "Un détail ✨" }), { emoji: "none" }).caption).toBe("Un détail");
      expect(normalizePost(draft({ network: "facebook", hashtags: ["a1", "b2", "c3", "d4"] })).hashtags).toHaveLength(2);
    });
  });

  it("conseils de relecture dans l'éditeur, dans la langue de l'interface", () => {
    const row = { network: "instagram", format: "image", title: "", caption: "Découvrez notre nouveauté", hashtags: "", angle: "", brief: JSON.stringify({ kind: "creative", headline: "Un titre de visuel beaucoup trop long pour un téléphone", subline: "", layout: "bold" }) };
    const adviceFr = fr(() => postAdvice(row, "fr"));
    expect(adviceFr.join(" ")).toMatch(/Accroche/);
    expect(adviceFr.join(" ")).toMatch(/appel à l'interaction/);
    expect(adviceFr.join(" ")).toMatch(/Hashtags insuffisants/);
    expect(adviceFr.join(" ")).toMatch(/Titre du visuel/);
    expect(en(() => postAdvice(row, "en")).join(" ")).toMatch(/first-line hook/);
  });

  it("titre de visuel : une consigne n'est jamais imprimée sur l'image, seul un texte entre guillemets l'est", () => {
    expect(quotedHeadline("plus court, plus pédagogique")).toBe("");
    expect(quotedHeadline("titre « Rose ou bleu ? »")).toBe("Rose ou bleu ?");
    expect(quotedHeadline('headline "Two ears, one glow"')).toBe("Two ears, one glow");
  });
});

// ---------------------------------------------------------------- boucle de qualité (IA simulée)

/** Plan d'IA médiocre : accroches génériques, légendes recopiées, mêmes hashtags, même format, une allégation. */
function badPlan(): PostDraft[] {
  return Array.from({ length: 8 }, (_, i) => ({
    day: i,
    slot: 0,
    network: (i % 2 ? "facebook" : "instagram") as PostDraft["network"],
    format: "image" as const,
    angle: "Produit",
    title: "Lunelle",
    caption: i === 3 ? "Découvrez Lunelle, sans danger pour bébé !" : "Découvrez notre compagnon lapin, le cadeau parfait pour vos enfants.",
    hashtags: ["lunelle", "kids", "cute", "love"],
    visual: { kind: "creative" as const, headline: "Le compagnon de vos nuits", subline: "", layout: "editorial" as const },
  }));
}

/** Réécriture « excellente » d'une publication (ce qu'un bon community manager rendrait). */
function excellent(i: number, net: string) {
  const hooks = [
    "Rose poudré ou bleu nuit : vous prendriez lequel ?",
    "Dimensions : 14 × 12 cm. Ça tient dans deux mains d'enfant.",
    "« Combien de temps tient la batterie ? » Bonne question.",
    "Ce que vous ne voyez pas sur la fiche produit : [À compléter : la photo des coulisses].",
    "Silicone souple au toucher : le détail qu'on remarque en premier.",
    "Recharge : câble USB-C fourni, rien d'autre à acheter.",
    "La première chose que vous regardez : la couleur, la forme ou les oreilles ?",
    "Halloween approche : quel déguisement cette année ?",
  ];
  return {
    index: i,
    angle: ["Coloris", "Taille", "Vos questions", "Coulisses", "Matière", "Recharge", "Question", "Halloween"][i],
    ...(i === 2 ? { format: "reel" as const } : i === 4 ? { format: "carousel" as const, slides: ["Doux au toucher", "Silicone souple", "14 × 12 cm", "À enregistrer"] } : {}),
    title: `Compagnon lapin, ${["coloris", "taille", "batterie", "coulisses", "matière", "recharge", "question", "Halloween"][i]}`,
    caption: `${hooks[i]}\n\nCompagnon lapin, de Lunelle.\n\n${["Dites-le-nous en commentaire.", "Enregistrez la publication pour la retrouver.", "Partagez-la à la personne à qui vous pensez."][i % 3]}`,
    hashtags: net === "facebook" ? ["lunelle"] : ["lunelle", "chambreenfant", ["compagnonenfant", "veilleuse", "rosepoudre", "halloween"][i % 4]],
    headline: ["Rose ou bleu ?", "14 × 12 cm", "Vos questions", "En coulisses", "Doux au toucher", "Recharge USB-C", "Et vous ?", "Halloween"][i],
  };
}

function fakeAi(kind: "excellent" | "moyenne" | "mauvaise") {
  const calls = { review: 0, repair: 0, repaired: [] as number[] };
  const ai: SocialQualityAi = {
    async review(posts) {
      calls.review++;
      const scores = kind === "excellent" ? { hooks: 9, variety: 9, native: 9, voice: 8.5, engagement: 9, honesty: 10 } : kind === "moyenne" ? { hooks: 7, variety: 6, native: 8, voice: 8, engagement: 6, honesty: 9 } : { hooks: 3, variety: 2, native: 5, voice: 5, engagement: 3, honesty: 3 };
      const review: SocialReview = { scores, posts: kind === "excellent" ? [] : posts.map((_, i) => ({ index: i, problem: "accroche générique", fix: "ouvrir sur un détail" })).slice(0, kind === "moyenne" ? 2 : 8), verdict: "" };
      return SocialReviewSchema.parse(review) as SocialReview;
    },
    async repair(items) {
      calls.repair++;
      calls.repaired = items.map((x) => x.index);
      // Réponse « mauvaise » à la reprise : l'IA ajoute une allégation à la publication 0 (elle doit être refusée).
      return { posts: items.map((x) => (kind === "mauvaise" && x.index === 0 ? { index: 0, title: "Lunelle", caption: "Aide votre bébé à s'endormir en toute sécurité.\n\nDites-le en commentaire.", hashtags: ["lunelle"] } : excellent(x.index, x.post.network))) };
    },
  };
  return { ai, calls };
}

describe("boucle de qualité du calendrier : relecture notée, une reprise ciblée, la meilleure version gardée", () => {
  it("plan médiocre + reprise excellente : la note passe au-dessus du seuil", async () => {
    const p = lunelle();
    const before = fr(() => planQuality(badPlan().map((d) => normalizePost(d)), p));
    expect(before.score).toBeLessThan(5);
    expect(before.global.map((g) => g.code)).toEqual(expect.arrayContaining(["one-format", "same-cta"]));
    const { ai, calls } = fakeAi("moyenne");
    const r = await fr(() => refinePlan(badPlan(), p, ai));
    expect(calls.review).toBe(1);
    expect(calls.repair).toBe(1);
    expect(r.report.scoreAfter).toBeGreaterThanOrEqual(8);
    expect(r.report.scoreAfter).toBeGreaterThan(r.report.scoreBefore);
    expect(r.report.kept).toBe(8);
    expect(planIssues(r.posts).byPost.size).toBe(0);
  });

  it("plan excellent : relu, aucune reprise payée", async () => {
    const p = lunelle();
    const good = fr(() => localPlan(p, PARAMS));
    const { ai, calls } = fakeAi("excellent");
    const r = await fr(() => refinePlan(good, p, ai));
    expect(calls.review).toBe(1);
    expect(calls.repair).toBe(0);
    expect(r.report.passed).toBe(true);
    expect(r.posts.map((x) => x.caption)).toEqual(good.map((x) => x.caption));
  });

  it("reprise « mauvaise » qui ajoute une allégation : refusée, l'originale est gardée", async () => {
    const p = lunelle();
    const { ai } = fakeAi("mauvaise");
    const r = await fr(() => refinePlan(badPlan(), p, ai));
    expect(r.posts[0].caption).toMatch(/^Découvrez notre compagnon/);
    expect(lintClaims(r.posts[0].caption, p)).toEqual([]);
    expect(r.report.kept).toBe(7);
  });

  it("relecture impossible (panne) : le plan reste utilisable, reprise guidée par la grille du studio", async () => {
    const p = lunelle();
    const { ai, calls } = fakeAi("moyenne");
    const broken: SocialQualityAi = { review: async () => Promise.reject(new Error("surcharge")), repair: ai.repair };
    const r = await fr(() => refinePlan(badPlan(), p, broken));
    expect(calls.repair).toBe(1);
    expect(r.report.review).toBeNull();
    expect(r.report.scoreAfter).toBeGreaterThanOrEqual(8);
  });

  it("seuil du directeur de création : moyenne ≥ 8, aucune note sous 6, honnêteté ≥ 8", () => {
    expect(reviewPassed({ scores: { hooks: 9, variety: 9, native: 9, voice: 9, engagement: 9, honesty: 7 }, posts: [], verdict: "" })).toBe(false);
    expect(reviewPassed({ scores: { hooks: 10, variety: 5, native: 10, voice: 10, engagement: 10, honesty: 10 }, posts: [], verdict: "" })).toBe(false);
    expect(reviewPassed({ scores: { hooks: 8, variety: 8, native: 8, voice: 8, engagement: 8, honesty: 9 }, posts: [], verdict: "" })).toBe(true);
  });

  it("consignes : rôle d'expert, méthode, règles par réseau, grille de relecture", () => {
    const s = systemPrompts("fr");
    expect(s.social).toMatch(/community manager d'une marque reconnue/);
    expect(s.social).toMatch(/3 à 5 hashtags/);
    expect(s.social).toMatch(/moins de 125 caractères/);
    expect(s.socialReview).toMatch(/moyenne d'au moins 8/);
    expect(s.socialVoice).toMatch(/séries récurrentes/);
    expect(s.themeEdit).toMatch(/jamais « c'est fait »/);
  });
});

// ---------------------------------------------------------------- ligne éditoriale du kit

describe("ligne éditoriale du kit réseaux sociaux", () => {
  it("version du studio : légendes avec accroche, corps et appel à l'interaction ; séries récurrentes ; aucun défaut de grille", () => {
    fr(() => {
      const p = lunelle();
      const v = localSocialVoice(p);
      expect(voiceIssues(v, p)).toEqual([]);
      expect(v.series?.length).toBe(3);
      expect(v.captions[0].text).toMatch(/Rose poudré ou Bleu nuit/);
      expect(v.captions[1].text).toMatch(/8 heures/);
      expect(voiceMarkdown("Lunelle", v)).toMatch(/## Séries récurrentes/);
      expect(lintClaims({ pillars: v.pillars, captions: v.captions, series: v.series }, p)).toEqual([]);
    });
  });

  it("IA médiocre puis reprise : la meilleure version est gardée (deux appels au plus)", async () => {
    const u = await createUser(`rs-${Date.now()}@test.fr`, "motdepasse-test", "R");
    const pid = id();
    const base = lunelle();
    run(
      "INSERT INTO projects (id, user_id, name, status, platform, product_json, brand_json, settings_json, sources_json, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
      pid, u.id, "Lunelle", "creating", "shopify", JSON.stringify(base.product), JSON.stringify(base.brand), JSON.stringify({ language: "fr" }), "[]", now(), now(),
    );
    const poor: Omit<SocialVoice, "generatedBy"> = {
      pillars: [{ title: "Inspiration", idea: "Des images" }, { title: "Inspiration", idea: "Encore des images" }, { title: "Produit", idea: "Le produit" }],
      say: ["Être positif", "Être sympa"],
      dontSay: ["Rien de faux", "Pas de promesse"],
      emoji: "sparing",
      emojis: ["✨"],
      captions: [{ pillar: "", text: "Découvrez notre nouveauté !" }, { pillar: "", text: "Découvrez notre nouveauté !" }, { pillar: "", text: "Lunelle : le doudou qui rassure votre enfant." }],
    };
    const great: Omit<SocialVoice, "generatedBy"> = {
      pillars: [{ title: "Deux oreilles, un disque", idea: "Montrer les détails réels : silicone, taille, coloris." }, { title: "Les questions des parents", idea: "Batterie, recharge, entretien : des réponses vérifiées." }, { title: "Chez Lunelle", idea: "Préparation des commandes et choix des coloris." }],
      say: ["Une seule idée par légende", "Ce que montre la photo, rien de plus", "Des questions à choix"],
      dontSay: ["Aucune promesse de sommeil ou d'apaisement", "Aucun avis inventé", "Aucune promotion non confirmée"],
      emoji: "sparing",
      emojis: ["🌙"],
      captions: [
        { pillar: "", text: "Rose poudré ou bleu nuit : lequel irait dans sa chambre ?\nLes deux ont les mêmes oreilles.\nDites-le en commentaire." },
        { pillar: "", text: "« Combien de temps tient la batterie ? »\nEnviron 8 heures en lumière douce, d'après nos essais.\nUne autre question ? Posez-la en commentaire." },
        { pillar: "", text: "Avant que le colis parte, il y a ceci : [À compléter : la photo des coulisses].\nQuelle étape voulez-vous voir ? Dites-le-nous." },
      ],
      series: [{ name: "Vu de près", idea: "Un détail en gros plan.", weekday: 2 }, { name: "Vos questions", idea: "Une vraie question, une réponse vérifiée.", weekday: 4 }],
    };
    const feedback: (string | undefined)[] = [];
    const voice = await fr(() => ensureSocialVoice(pid, { force: true, ai: async (_p, fb) => (feedback.push(fb), fb ? great : poor) }));
    expect(feedback).toHaveLength(2);
    expect(feedback[1]).toMatch(/générique|accroche|allégation/);
    expect(voice!.pillars[0].title).toBe("Deux oreilles, un disque");
    expect(voice!.series?.map((s) => s.name)).toEqual(["Vu de près", "Vos questions"]);
    expect(loadProject(pid).brand!.social?.captions[1].text).toMatch(/8 heures/);
  });
});

// ---------------------------------------------------------------- assistant de retouche de la boutique

describe("assistant de retouche de la boutique : jamais de fausse affirmation de changement", () => {
  it("réponse qui affirme un changement sans opération : remplacée par la vérité", () => {
    fr(() => {
      expect(claimsChange("C'est fait ! J'ai passé le titre en bleu.")).toBe(true);
      expect(claimsChange("Je propose de passer le titre en bleu : voulez-vous que je le fasse ?")).toBe(false);
      const n = honestChatNote({ reply: "C'est fait, j'ai agrandi le bouton.", mode: "ai", revert: false, opsCount: 0, applied: [], rejected: [] });
      expect(n).toMatch(/rien n'a été changé/);
      expect(n).not.toMatch(/agrandi/);
    });
  });

  it("proposition sans opération : gardée telle quelle (conseil d'expert)", () => {
    fr(() => {
      const reply = "Deux options : un titre plus court (« Doux comme un lapin ») ou un fond rose poudré. Laquelle préférez-vous ?";
      expect(honestChatNote({ reply, mode: "ai", revert: false, opsCount: 0, applied: [], rejected: [] })).toBe(reply);
    });
  });

  it("opérations toutes refusées : rien n'est annoncé comme fait ; en partie : dit clairement", () => {
    fr(() => {
      expect(honestChatNote({ reply: "Je passe le bouton en pilule.", mode: "ai", revert: false, opsCount: 1, applied: [], rejected: ["réglage inconnu"] })).toMatch(/^Je n'ai pas pu appliquer.*\n\nNon appliqué : réglage inconnu\.$/s);
      const partial = honestChatNote({ reply: "Je passe le bouton en pilule et le titre en italique.", mode: "ai", revert: false, opsCount: 2, applied: ["Bouton du héros"], rejected: ["option « italique » inconnue"] });
      expect(partial).toMatch(/^Modification appliquée en partie/);
      expect(partial).toMatch(/Modifié : Bouton du héros\./);
      expect(partial).toMatch(/Non appliqué : option « italique » inconnue\./);
    });
    en(() => {
      expect(honestChatNote({ reply: "Done! I've updated the hero.", mode: "local", revert: false, opsCount: 0, applied: [], rejected: [] })).toMatch(/nothing was changed/);
    });
  });
});

// ---------------------------------------------------------------- planche d'exemples (relecture d'expert)

describe("planche d'exemples", () => {
  it("14 jours avant / après pour le compagnon pour enfant", async () => {
    const out = process.env.EXCELLENCE_DOC;
    if (!out) return;
    const p = lunelle();
    const old = await import(path.join(out, "calendar-avant.ts"));
    const before: PostDraft[] = fr(() => old.localPlan(p, PARAMS));
    const after = fr(() => localPlan(p, PARAMS));
    const { ai } = fakeAi("moyenne");
    const refined = await fr(() => refinePlan(badPlan(), p, ai));
    const qb = fr(() => planQuality(before.map((d) => ({ ...d })), p));
    const qa = fr(() => planQuality(after, p));
    fs.writeFileSync(path.join(out, "data.json"), JSON.stringify({ before, after, qb: { score: qb.score, weak: qb.weak, global: qb.global }, qa: { score: qa.score, weak: qa.weak, global: qa.global }, bad: badPlan(), refined: refined.posts, report: refined.report, strategy: fr(() => localStrategy(p, PARAMS, after)), voice: fr(() => localSocialVoice(p)) }, null, 2));
  });
});
