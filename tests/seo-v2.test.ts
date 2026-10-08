/**
 * SEO, Copywriting & Blog Engine V2 (phase 8A) — briques gratuites et déterministes : intentions, recherche de
 * mots-clés (hypothèses, jamais de volume), stratégies différentes selon le métier, faits vérifiés et inconnues,
 * fiches produit, pages de prestation (Sébastien Blanc), SEO local, blog sans remplissage, métadonnées, maillage
 * sans URL inventée, détection des affirmations / sources / caractéristiques fausses, multilingue, barrière,
 * routage des appels, opérations d'édition, retouches en conversation, plateformes, audit technique.
 */
import { describe, expect, it } from "vitest";

describe("SEO V2 — briques locales", async () => {
  const { createUser } = await import("@/lib/auth");
  const { loadProject } = await import("@/lib/projects");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { contentIntent, detectContentType } = await import("@/lib/seo-v2/intent");
  const { researchKeywords, classifyIntent, mainCity, HYPOTHESIS_NOTE, setKeywordProvider, enrichWithProvider } = await import("@/lib/seo-v2/keywords");
  const { sitePages, plannedPages } = await import("@/lib/seo-v2/pages");
  const { seoStrategy } = await import("@/lib/seo-v2/strategy");
  const { verifiedFacts } = await import("@/lib/seo-v2/facts");
  const { buildBrief } = await import("@/lib/seo-v2/brief");
  const { localDraft, fit, seoTitle, fromAiDraft } = await import("@/lib/seo-v2/write");
  const { toHtml, toMarkdown, plainText, inlineHtml, structuredData, SEO_TITLE_TARGET, META_DESC_TARGET, ContentDocSchema } = await import("@/lib/seo-v2/doc");
  const { localContentChecks, gateContent, gateStrategy, checkStrategy, similarity } = await import("@/lib/seo-v2/quality");
  const { applyContentOps } = await import("@/lib/seo-v2/ops");
  const { planEdit } = await import("@/lib/seo-v2/local-edit");
  const { suggestLinks } = await import("@/lib/seo-v2/links");
  const { technicalAudit, NEEDS_CRAWL } = await import("@/lib/seo-v2/tech");
  const { cmsTargets, exportBundle } = await import("@/lib/seo-v2/cms");
  const { KIND_ROUTE, writeKind } = await import("@/lib/seo-v2/deps");
  const { POLICIES, POLICY_VERSION } = await import("@/lib/quality/policies");
  const { routeLlm } = await import("@/lib/ai/llm");
  const { seedImageFixture } = await import("./image-v2-fixtures");
  const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);
  const u = await createUser(`seo2-${Date.now()}@test.fr`, "motdepasse-test", "S");
  const project = (k: Parameters<typeof seedImageFixture>[1]) => loadProject(seedImageFixture(u.id, k));
  const sb = project("artisan");
  const serum = project("cosmetic");
  const onde = project("hightech");
  const lison = project("restaurant");

  function draft(p: ReturnType<typeof loadProject>, type: Parameters<typeof buildBrief>[1]["type"], lang: "fr" | "en" | "es" = "fr", pageKind?: string) {
    const pages = sitePages(p);
    const strategy = seoStrategy(p, lang, { pages });
    const page = pages.find((x) => x.kind === (pageKind ?? (type === "product_page" ? "product" : type === "service_page" ? "service" : type === "home_page" ? "home" : type === "local_page" ? "local" : type === "brand_page" ? "brand" : "home")))!;
    const facts = verifiedFacts(p);
    const brief = buildBrief(p, { type, page, lang, strategy, facts });
    return { doc: localDraft(brief, facts, { pages }), brief, facts, strategy, pages };
  }

  it("intentions : type de contenu → intention, demande explicite prioritaire, détection du type dans une phrase", () => {
    expect(contentIntent("product_page")).toBe("sell");
    expect(contentIntent("service_page")).toBe("present_service");
    expect(contentIntent("home_page", { business: "services" })).toBe("present_service");
    expect(contentIntent("blog_article", { searchIntent: "commercial" })).toBe("compare");
    expect(contentIntent("blog_article", { searchIntent: "informational" })).toBe("inform");
    expect(contentIntent("product_page", { request: "Rassure les clients sur l'entretien" })).toBe("reassure");
    expect(contentIntent("local_page")).toBe("local_traffic");
    expect(detectContentType("Écris la fiche produit du sérum")).toBe("product_page");
    expect(detectContentType("Un article de blog sur l'entretien")).toBe("blog_article");
    expect(detectContentType("Optimise la meta description")).toBe("metadata");
    expect(classifyIntent("prix plâtrier mâcon", true)).toBe("transactional");
    expect(classifyIntent("comment choisir un sérum", false)).toBe("informational");
  });

  it("mots-clés : hypothèses sémantiques étiquetées, AUCUN volume / CPC / difficulté sans fournisseur ; fournisseur branchable", async () => {
    const r = researchKeywords(serum, "fr", sitePages(serum));
    expect(r.dataNote).toBe(HYPOTHESIS_NOTE.fr);
    expect(r.provider).toBeNull();
    const all = r.clusters.flatMap((c) => [c.primary, ...c.variants]);
    expect(all.length).toBeGreaterThan(3);
    expect(all.every((k) => k.source === "semantic_hypothesis" && k.metrics === null && k.basis)).toBe(true);
    expect(JSON.stringify(r)).not.toMatch(/volume"\s*:\s*\d|cpc"\s*:\s*\d/);
    // Une variante n'est jamais la requête principale répétée.
    for (const c of r.clusters) expect(c.variants.map((v) => v.term)).not.toContain(c.primary.term);
    // Fournisseur vérifié : seules ses données remplissent les métriques.
    setKeywordProvider({ name: "Fournisseur de test", metrics: async (terms) => new Map(terms.slice(0, 1).map((t) => [t, { volume: 100, cpc: 0.5, difficulty: 20, source: "test", fetchedAt: 1 }])) });
    try {
      const e = await enrichWithProvider(r);
      const withData = e.clusters.flatMap((c) => [c.primary, ...c.variants]).filter((k) => k.metrics);
      expect(withData).toHaveLength(1);
      expect(withData[0].source).toBe("provider");
    } finally {
      setKeywordProvider(null);
    }
    expect(mainCity("Mâcon et 30 km autour")).toBe("Mâcon");
    expect(mainCity("Lyon 4e")).toBe("Lyon 4e");
  });

  it("cannibalisation : une même requête principale visée par deux pages est signalée", () => {
    const r = researchKeywords(serum, "fr", sitePages(serum), { existingKeywords: [{ page: "article:ancien", term: "sérum visage" }] });
    expect(r.cannibalization.some((c) => c.term === "serum visage" || c.term === "sérum visage")).toBe(true);
  });

  it("stratégie : une boutique cosmétique et un plâtrier-peintre n'ont ni les mêmes objectifs, ni les mêmes pages, ni le même calendrier", () => {
    const a = seoStrategy(sb, "fr");
    const b = seoStrategy(serum, "fr");
    expect(a.business).toBe("services");
    expect(b.business).toBe("products");
    expect(a.objectives.join(" ")).toMatch(/Mâcon|zone/i);
    expect(b.objectives.join(" ")).toMatch(/fiche produit/);
    expect(a.priorityPages[0].kind).toBe("home");
    expect(b.priorityPages[0].kind).toBe("product");
    expect(a.priorityPages.filter((p) => p.kind === "service").map((p) => p.title)).toEqual(["Plâtrerie et plaques de plâtre", "Enduits et lissage", "Peinture intérieure"]);
    expect(a.local?.area).toBe("Mâcon et 30 km autour");
    expect(b.local).toBeNull();
    expect(a.calendar.map((c) => c.title)).not.toEqual(b.calendar.map((c) => c.title));
    expect(a.calendar.length).toBeGreaterThan(2);
    // Aucune page prévue n'a d'adresse ; maillage marqué « prévu » tant que les pages n'existent pas.
    expect(a.priorityPages.filter((p) => p.status === "planned").every((p) => p.url === null)).toBe(true);
    expect(a.linking.every((l) => l.status === "planned")).toBe(true);
    expect(a.linking.some((l) => l.from === l.to)).toBe(false);
    // Spécialités non déclarées : à confirmer, jamais affirmées.
    expect(a.gaps.join(" ")).toMatch(/À confirmer : proposez-vous « bandes à joints »/);
    expect(a.dataNote).toMatch(/Hypothèses sémantiques/);
    expect(checkStrategy(a, null).codes).toEqual([]);
    expect(gateStrategy(a, null).verdict).toBe("PROVISIONAL");
  });

  it("faits vérifiés : seulement le confirmé ; livraison, retours, prix inconnus restent des inconnues ; prix en centimes", () => {
    const f = verifiedFacts(serum);
    expect(f.facts).toEqual([{ label: "Contenance", value: "30 ml" }]);
    expect(f.facts.some((x) => /gel fluide/.test(x.value))).toBe(false);
    expect(f.price).toBe("34,90 €");
    expect(f.shipping).toBeNull();
    expect(f.unknowns).toEqual(expect.arrayContaining(["conditions de livraison", "conditions de retour"]));
    expect(f.answers[0].a).toBe("Fabriqué en France");
    const s = verifiedFacts(sb);
    expect(s.services.map((x) => x.name)).toHaveLength(3);
    expect(s.contact.phone).toBe("06 11 22 33 44");
    expect(s.price).toBeNull();
  });

  it("fiche produit : faits confirmés, FAQ réelle, prix confirmé, inconnues « À compléter », aucune livraison inventée ; données structurées sans avis", () => {
    const { doc } = draft(serum, "product_page");
    const md = toMarkdown(doc);
    expect(doc.blocks.filter((b) => b.kind === "h1")).toHaveLength(1);
    expect(md).toContain("**Contenance** : 30 ml");
    expect(md).toContain("34,90 €");
    expect(md).toMatch(/\[À compléter : mode d'emploi/);
    expect(md).not.toMatch(/Livraison et retours/);
    expect(md).not.toMatch(/gel fluide|anti-âge|garanti|avis clients/i);
    expect(doc.blocks.some((b) => b.kind === "faq" && b.a === "Fabriqué en France.")).toBe(true);
    const product = doc.schema.find((s) => s["@type"] === "Product")!;
    expect(product.offers).toEqual({ "@type": "Offer", price: "34.90", priceCurrency: "EUR" });
    expect(JSON.stringify(doc.schema)).not.toMatch(/aggregateRating|review|availability/i);
    expect(doc.schema.some((s) => s["@type"] === "FAQPage")).toBe(true);
    const c = fr(() => localContentChecks(doc, serum, verifiedFacts(serum)));
    expect(c.codes).toEqual([]);
    expect(c.placeholders).toBeGreaterThan(0);
  });

  it("pages de prestation (Sébastien Blanc) : spécialités distinguées (plaques ≠ enduits ≠ lissage ≠ peinture), zone, aucune qualification ni ancienneté inventée", () => {
    const pages = sitePages(sb);
    const strategy = seoStrategy(sb, "fr", { pages });
    const facts = verifiedFacts(sb);
    const out = Object.fromEntries(pages.filter((p) => p.kind === "service").map((page) => [page.title, toMarkdown(localDraft(buildBrief(sb, { type: "service_page", page, lang: "fr", strategy, facts }), facts, { pages }))]));
    expect(out["Plâtrerie et plaques de plâtre"]).toMatch(/Pose de plaques de plâtre/);
    expect(out["Plâtrerie et plaques de plâtre"]).not.toMatch(/Lissage|Enduits\n/);
    expect(out["Enduits et lissage"]).toMatch(/- Enduits/);
    expect(out["Enduits et lissage"]).toMatch(/Lissage des murs/);
    expect(out["Enduits et lissage"]).not.toMatch(/plaques de plâtre/i);
    expect(out["Peinture intérieure"]).toMatch(/Peinture intérieure/);
    expect(out["Peinture intérieure"]).toMatch(/\*\*Tarif\*\* : sur devis/);
    for (const md of Object.values(out)) {
      expect(md).toMatch(/# .* à Mâcon/);
      expect(md).toMatch(/Mâcon et 30 km autour/);
      expect(md).toMatch(/\[À compléter : déroulé d'une intervention/);
      expect(md).not.toMatch(/RGE|certifi|qualifi|ans d'expérience|depuis 19|depuis 20|devis gratuit|24 ?h/i);
    }
    // Les trois pages ne sont pas des copies.
    const [a, b] = Object.values(out);
    expect(similarity(a, b)).toBeLessThan(0.6);
  });

  it("SEO local : une seule page locale (pas de pages de villes en série), coordonnées saisies uniquement, LocalBusiness sans adresse inventée", () => {
    const planned = plannedPages(sb).filter((p) => p.kind === "local");
    expect(planned).toHaveLength(1);
    const { doc } = draft(sb, "local_page");
    const md = toMarkdown(doc);
    expect(md).toContain("06 11 22 33 44");
    expect(md).toContain("12 rue des Artisans, Mâcon");
    const lb = doc.schema.find((s) => s["@type"] === "LocalBusiness")!;
    expect(lb).toMatchObject({ name: "Sébastien Blanc", areaServed: "Mâcon et 30 km autour", telephone: "06 11 22 33 44" });
    // Restaurant sans téléphone ni adresse saisis : rien d'inventé.
    const { doc: d2 } = draft(lison, "home_page");
    const lb2 = d2.schema.find((s) => s["@type"] === "LocalBusiness")!;
    expect(lb2.telephone).toBeUndefined();
    expect(lb2.address).toBeUndefined();
    expect(toMarkdown(d2)).toMatch(/\[À compléter : coordonnées de contact\]/);
  });

  it("blog : plan détaillé sans remplissage ni minimum de mots, aucune étude ni statistique, lien vers la page utile (prévue = texte)", () => {
    const pages = sitePages(serum);
    const strategy = seoStrategy(serum, "fr", { pages });
    const facts = verifiedFacts(serum);
    const page = { key: "article:x", title: strategy.calendar[0].title, url: null, kind: "article" as const, status: "planned" as const };
    const doc = localDraft(buildBrief(serum, { type: "blog_article", page, lang: "fr", strategy, facts, keyword: strategy.clusters.find((c) => !c.page)!.primary }), facts, { pages });
    const md = toMarkdown(doc);
    expect(md).not.toMatch(/étude|selon|%|statistique/i);
    expect(md).toMatch(/\[À compléter/);
    expect(md).toMatch(/Voir le produit : Sérum Éclat\./);
    expect(md).not.toMatch(/\]\(/);
    expect(plainText(doc).split(/\s+/).length).toBeLessThan(250);
  });

  it("métadonnées : 60 / 155 caractères visés, coupées sur un mot, titres uniques par page, mot-clé et ville avec leur casse", () => {
    expect(fit("un deux trois quatre cinq", 12)).toBe("un deux");
    const pages = sitePages(sb);
    const strategy = seoStrategy(sb, "fr", { pages });
    const facts = verifiedFacts(sb);
    const titles = pages.filter((p) => p.kind === "service" || p.kind === "home").map((page) => {
      const brief = buildBrief(sb, { type: page.kind === "home" ? "home_page" : "service_page", page, lang: "fr", strategy, facts });
      const d = localDraft(brief, facts, { pages });
      expect(d.meta.seoTitle.length).toBeLessThanOrEqual(SEO_TITLE_TARGET);
      expect(d.meta.metaDescription.length).toBeLessThanOrEqual(META_DESC_TARGET);
      expect(d.meta.metaDescription).not.toMatch(/\. [a-zà-ÿ]/);
      return d.meta.seoTitle;
    });
    expect(new Set(titles).size).toBe(titles.length);
    expect(titles[0]).toMatch(/Mâcon/);
    expect(seoTitle({ primaryKeyword: { term: "plâtrier peintre mâcon", intent: "local", source: "semantic_hypothesis", metrics: null, basis: "" }, page: pages[0], type: "home_page" }, facts)).toBe("Plâtrier peintre Mâcon | Sébastien Blanc");
  });

  it("maillage : aucune URL inventée — page existante liée par son adresse, page prévue signalée sans lien ; lien hors des pages connues = défaut", () => {
    const { doc, pages } = draft(serum, "product_page");
    const s = suggestLinks({ ...doc, type: "blog_article", page: { ...doc.page, key: "article:x" } }, pages);
    expect(s.length).toBeGreaterThan(0);
    for (const x of s) expect(x.status === "existing" ? !!x.to.url : x.note.includes("aucune adresse")).toBe(true);
    const bad = { ...doc, blocks: [...doc.blocks, { id: "bx", kind: "p" as const, text: "Voir [notre guide](/pages/guide-inexistant)." }] };
    const c = fr(() => localContentChecks(bad, serum, verifiedFacts(serum)));
    expect(c.codes).toContain("invented_link");
    // Un brouillon IA qui cite une adresse non fournie perd le lien (le texte reste).
    const pagesB = sitePages(serum);
    const strategy = seoStrategy(serum, "fr", { pages: pagesB });
    const brief = buildBrief(serum, { type: "product_page", page: pagesB.find((p) => p.kind === "product")!, lang: "fr", strategy });
    const ai = fromAiDraft(brief, verifiedFacts(serum), { seoTitle: "t", metaDescription: "d", blocks: [{ kind: "h1", text: "Sérum" }, { kind: "p", text: "Voir [ici](https://ailleurs.example/x)." }], unknowns: [] }, null);
    expect(toHtml(ai)).not.toContain("ailleurs.example");
  });

  it("contrôles : affirmation inventée, source / statistique, caractéristique fausse, info commerciale non confirmée, formule creuse, sur-optimisation, doublon, structure", () => {
    const { doc } = draft(serum, "product_page");
    const f = verifiedFacts(serum);
    const withP = (text: string) => ({ ...doc, blocks: [...doc.blocks, { id: "bz", kind: "p" as const, text }] });
    const codes = (text: string) => fr(() => localContentChecks(withP(text), serum, f)).codes;
    expect(codes("Certifié bio et testé dermatologiquement.")).toContain("invented_claim");
    expect(codes("Selon une étude, 87 % des femmes l'adoptent.")).toContain("invented_source");
    expect(codes("Un flacon de 50 ml pour deux mois.")).toContain("wrong_fact");
    expect(codes("Livraison gratuite en 24h.")).toContain("unconfirmed_commercial");
    expect(codes("Au prix exceptionnel de 19,90 €.")).toContain("unconfirmed_commercial");
    expect(codes("Une expérience unique qui va révolutionner votre routine.")).toContain("hollow_copy");
    expect(codes("Un sérum anti-âge prouvé.")).toEqual(expect.arrayContaining(["forbidden_claim"]));
    const stuffed = { ...doc, primaryKeyword: "sérum visage", blocks: [...doc.blocks, { id: "s1", kind: "p" as const, text: Array(9).fill("sérum visage").join(" et ") }] };
    expect(fr(() => localContentChecks(stuffed, serum, f)).codes).toContain("keyword_stuffing");
    const twoH1 = { ...doc, blocks: [...doc.blocks, { id: "h", kind: "h1" as const, text: "Encore" }] };
    expect(fr(() => localContentChecks(twoH1, serum, f)).codes).toContain("bad_structure");
    const long = "Ce paragraphe décrit précisément la texture fluide et la façon de l'appliquer matin et soir sur une peau propre et sèche avant la crème habituelle.";
    const dup = { ...doc, blocks: [...doc.blocks, { id: "d1", kind: "p" as const, text: long }] };
    expect(fr(() => localContentChecks(dup, serum, f, { others: [{ key: "autre page", text: `${long} ${long}` }] })).codes).toContain("duplicate_content");
    // Ce qui est confirmé n'est jamais signalé : 30 ml, Fabriqué en France, 34,90 €.
    expect(codes("Flacon de 30 ml, fabriqué en France, 34,90 €.")).toEqual([]);
  });

  it("multilingue : FR / EN / ES adaptés (intitulés, questions, inconnues), pas une traduction mot à mot ; hreflang recommandé, jamais présenté comme en place", () => {
    const fr1 = draft(serum, "product_page", "fr").doc;
    const en = draft(serum, "product_page", "en").doc;
    const es = draft(serum, "product_page", "es").doc;
    expect(toMarkdown(fr1)).toMatch(/## Caractéristiques/);
    expect(toMarkdown(en)).toMatch(/## Specifications/);
    expect(toMarkdown(es)).toMatch(/## Características/);
    expect(toMarkdown(en)).toMatch(/\[To complete:/);
    expect(toMarkdown(es)).toMatch(/\[Por completar:/);
    expect(en.lang).toBe("en");
    const rEn = researchKeywords(serum, "en", sitePages(serum));
    expect(rEn.dataNote).toMatch(/Semantic hypotheses/);
    expect(rEn.clusters.flatMap((c) => c.questions).join(" ")).toMatch(/how to/);
    const s = seoStrategy(serum, "fr", { langs: ["fr", "en", "es"] });
    expect(s.hreflang.recommended).toBe(true);
    expect(s.hreflang.note).toMatch(/non implémenté/);
    expect(seoStrategy(serum, "fr").hreflang.recommended).toBe(false);
  });

  it("barrière : jamais FINAL sans relecture IA ; jamais FINAL avec une information à compléter ; défaut bloquant → reprise ciblée", () => {
    const { doc } = draft(serum, "product_page");
    const local = fr(() => localContentChecks(doc, serum, verifiedFacts(serum)));
    expect(gateContent({ type: "product_page", local, review: null, attempt: 0 }).verdict).toBe("PROVISIONAL");
    const good = { criteria: Object.fromEntries(["relevance", "accuracy", "usefulness", "naturalness", "originality", "clarity", "structure", "brand", "commercial", "intent_fit"].map((k) => [k, 9])) as any, issues: [], invented: [], fix: { blockIds: [], instruction: "" } };
    const g = gateContent({ type: "product_page", local, review: good, attempt: 0 });
    expect(local.placeholders).toBeGreaterThan(0);
    expect(g.verdict).toBe("PROVISIONAL");
    expect(g.reason).toMatch(/à compléter/);
    expect(gateContent({ type: "product_page", local: { ...local, placeholders: 0 }, review: good, attempt: 0 }).verdict).toBe("FINAL");
    expect(gateContent({ type: "product_page", local: { ...local, placeholders: 0 }, review: null, reviewError: "panne", attempt: 0 }).verdict).not.toBe("FINAL");
    const bad = gateContent({ type: "product_page", local: { ...local, codes: ["invented_claim"], issues: ["affirmation"] }, review: null, attempt: 0 });
    expect(bad.verdict).toBe("RETRY");
    expect(bad.blockingCodes).toEqual(["invented_claim"]);
    expect(gateContent({ type: "product_page", local: { ...local, codes: ["invented_claim"], issues: ["x"] }, review: null, attempt: 2 }).verdict).toBe("REJECTED");
    // Une politique par type ; version des politiques changée.
    for (const k of ["seo_product_v2", "seo_service_v2", "seo_category_v2", "seo_home_v2", "seo_article_v2", "seo_metadata_v2", "seo_strategy_v2", "seo_tech_audit_v2"] as const) expect(POLICIES[k]).toBeTruthy();
    expect(POLICY_VERSION).toBe("2026-10-p8a");
    expect(POLICIES.seo_product_v2.blocking).toEqual(expect.arrayContaining(["invented_claim", "invented_source", "wrong_fact", "unconfirmed_commercial"]));
  });

  it("routage : métadonnées et réécritures courtes = modèle économique ; page et article = modèle fort ; relecture = standard", () => {
    expect(KIND_ROUTE.write_meta.difficulty).toBe("simple");
    expect(KIND_ROUTE.rewrite.difficulty).toBe("simple");
    expect(KIND_ROUTE.write_page.difficulty).toBe("complex");
    expect(KIND_ROUTE.write_article.difficulty).toBe("complex");
    expect(KIND_ROUTE.review.difficulty).toBe("standard");
    expect(writeKind("metadata")).toBe("write_meta");
    expect(writeKind("blog_article")).toBe("write_article");
    const strong = routeLlm({ task: "copywriting", routing: { difficulty: "complex" } });
    const cheap = routeLlm({ task: "copywriting", routing: { difficulty: "simple" } });
    expect(strong.tier).toBe("strong");
    expect(cheap.tier).toBe("standard");
  });

  it("édition : opérations locales (texte, liste, niveau, insertion, déplacement, gras, italique, lien sûr, remplacement, raccourci) — source « client »", () => {
    const { doc } = draft(serum, "product_page");
    const p = doc.blocks.find((b) => b.kind === "p")!;
    const out = applyContentOps(doc, [
      { op: "set_text", blockId: p.id, text: "Sérum à la vitamine C. Il s'applique le matin. Il se garde au frais." },
      { op: "bold", blockId: p.id, text: "vitamine C" },
      { op: "italic", blockId: p.id, text: "le matin" },
      { op: "link", blockId: p.id, text: "au frais", url: "/pages/conseils" },
      { op: "shorten", blockId: p.id, maxWords: 12 },
      { op: "insert", after: p.id, block: { kind: "h2", text: "Nouveau" } },
      { op: "move", blockId: p.id, to: 0 },
      { op: "set_meta", field: "seoTitle", value: "Titre manuel" },
    ]);
    const np = out.blocks[0];
    expect(np.kind === "p" && np.text).toBe("Sérum à la **vitamine C**. Il s'applique *le matin*.");
    expect(out.meta.seoTitle).toBe("Titre manuel");
    expect(out.meta2.source).toBe("user");
    expect(inlineHtml("a [x](javascript:alert(1)) **b**")).toBe("a x <strong>b</strong>");
    expect(() => applyContentOps(doc, [{ op: "link", blockId: p.id, text: "Sérum", url: "javascript:alert(1)" }])).toThrow(/refusée/);
    expect(ContentDocSchema.safeParse(out).success).toBe(true);
    expect(toHtml(out)).toContain("<h1>");
  });

  it("retouches en conversation : simples = locales et gratuites, créatives = IA limitée aux blocs visés, portée respectée", () => {
    const { doc, facts, brief } = draft(serum, "product_page");
    const p = doc.blocks.find((b) => b.kind === "p")!;
    expect(planEdit("Raccourcis cette description", doc, { selected: [p.id] }).kind).toBe("local");
    expect(planEdit("Ajoute une FAQ", doc, { facts }).kind).toBe("local");
    const t = planEdit("Optimise ce titre SEO", doc, { facts, brief });
    expect(t.kind === "local" && t.ops[0].op).toBe("set_meta");
    const prem = planEdit("Rends ce texte plus premium", doc, { selected: [p.id] });
    expect(prem.kind).toBe("ai");
    expect(prem.kind === "ai" && prem.blockIds).toEqual([p.id]);
    const only = planEdit("Réécris uniquement ce paragraphe", doc, {});
    expect(only.kind === "ai" && only.blockIds).toEqual([p.id]);
    expect(planEdit("Change le ton", doc, {}).kind).toBe("ai");
    expect(planEdit("bla", doc, {}).kind).toBe("unclear");
    const faq = planEdit("Ajoute une FAQ", { ...doc, blocks: doc.blocks.filter((b) => b.kind !== "faq") }, { facts });
    const next = applyContentOps(doc, faq.kind === "local" ? faq.ops : []);
    expect(next.blocks.slice(-2).map((b) => b.kind)).toEqual(["h2", "faq"]);
  });

  it("plateformes : Shopify (connecté ou export), WooCommerce / PrestaShop (export), Wix / Squarespace (kit) ; SEO Shopify NON VÉRIFIÉ ; export complet", () => {
    const t = cmsTargets(serum);
    expect(t.map((x) => [x.platform, x.mode])).toEqual([["shopify", "export"], ["woocommerce", "export"], ["prestashop", "export"], ["wix", "handover"], ["squarespace", "handover"]]);
    expect(t.every((x) => x.verified === false)).toBe(true);
    const { doc } = draft(serum, "product_page");
    const files = exportBundle(doc);
    expect(Object.keys(files).map((k) => k.split(".").slice(1).join("."))).toEqual(["html", "md", "seo.json", "jsonld.json"]);
  });

  it("audit technique : contrôles locaux distingués de ceux qui demandent une exploration ; jamais « indexé »", () => {
    const { doc, pages } = draft(serum, "product_page");
    const a = technicalAudit(serum.id, [doc, { ...doc, page: { ...doc.page, title: "Autre" } }], pages);
    expect(a.local.some((x) => x.check === "doublons" && x.status === "issue")).toBe(true);
    expect(a.needsCrawl.map((x) => x.check)).toEqual(NEEDS_CRAWL.map((x) => x.check));
    expect(a.needsCrawl.every((x) => x.status === "needs_crawl")).toBe(true);
    expect(JSON.stringify(a)).not.toMatch(/est indexée|is indexed|indexée par Google/);
  });

  it("compatibilité : un projet high-tech et un restaurant passent par les mêmes règles (aucun cas particulier)", () => {
    const { doc } = draft(onde, "product_page");
    expect(toMarkdown(doc)).toContain("**Autonomie** : 30 h");
    expect(fr(() => localContentChecks(doc, onde, verifiedFacts(onde))).codes).toEqual([]);
    const { doc: d } = draft(lison, "service_page");
    expect(toMarkdown(d)).toMatch(/Lyon 4e/);
    expect(structuredData("service_page", d, verifiedFacts(lison)).some((s) => s["@type"] === "Service")).toBe(true);
  });
});

describe("Shopify : relecture du SEO (préparation 8B)", () => {
  it("« vérifié » seulement si le champ SEO du produit reprend les deux valeurs ; sinon NON vérifié", async () => {
    const { compareSeo } = await import("@/lib/integrations/shopify");
    const sent = { title: "Sérum Éclat | Maison", description: "Sérum 30 ml." };
    expect(compareSeo(sent, { metafields: { title: sent.title, description: sent.description }, seo: { title: sent.title, description: sent.description } }).displayed).toBe(true);
    const half = compareSeo(sent, { metafields: { title: sent.title, description: sent.description }, seo: { title: null, description: null } });
    expect(half).toMatchObject({ stored: true, displayed: false });
    expect(compareSeo(sent, { metafields: { title: null, description: null }, seo: { title: null, description: null } }).stored).toBe(false);
  });
});
