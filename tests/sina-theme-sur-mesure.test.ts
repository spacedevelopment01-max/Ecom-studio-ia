/**
 * Thèmes sur mesure (SINA, étape 6) : bibliothèque de sections, montage selon les règles du propriétaire, retouches,
 * rendu aux couleurs de la marque du client. Sans IA, sans réseau.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DEMO_BRANDS, familySections, libSection, sectionByRef, sectionLibrary, withBrandName } from "@/lib/syna-agent/custom-theme/library";
import { applyStructure, checkCustomTheme, replaceOnce, scopedCss, type CustomTheme } from "@/lib/syna-agent/custom-theme/theme";
import { starterTheme, STARTERS } from "@/lib/syna-agent/custom-theme/starters";
import { brandCss, buyFlags, renderCustomTheme } from "@/lib/syna-agent/custom-theme/render";
import { SECTION_FAMILIES } from "@/lib/syna-agent/section-families";

const brand = { name: "Ardent", nameStatus: "validated", alternatives: [], tagline: "", positioning: "", audience: "", personality: [], tone: { voice: "", do: [], dont: [] }, palette: { primary: "#C2410C", secondary: "#E7E5E4", accent: "#0F766E", light: "#FAFAF9", dark: "#1C1917" }, fonts: { heading: "", body: "" }, logo: { concept: "", status: "proposed" } } as any;
const proj = { id: "p-test", name: "Ardent", brand };
const blocking = (t: CustomTheme) => checkCustomTheme(t).filter((p) => p.level === "bloquant").map((p) => p.text);
/** Montage de A à Z (sans thème de départ), toutes les pages obligatoires d'une boutique, avec les sections de la famille. */
function fullSite(family: "classique" | "moderne") {
  // Projets de test sur Shopify : pas de page commande ni de confirmation (pages de Shopify).
  if (family === "moderne") { const st = STARTERS["sport-chic"]; return { header: st.header, footer: st.footer, search: st.search, pages: st.pages.filter(([key]) => key !== "commande" && key !== "merci").map(([key, label, sections]) => ({ key, label, sections })) }; }
  return {
    header: "En-tête classique", footer: "Pied de page complet",
    pages: [
      { key: "home", label: "Accueil", sections: ["Ouverture photo pleine", "Collection en vedette", "Avis clients"] },
      { key: "shop", label: "Boutique", sections: ["Catalogue avec filtres et tri"] },
      { key: "product", label: "Fiche produit", sections: ["Produit vedette", "Points forts du produit"] },
      { key: "cart", label: "Panier", sections: ["Page panier complète"] },
      { key: "compte", label: "Mon compte", sections: ["Connexion et création de compte"] },
      { key: "about", label: "Notre histoire", sections: ["L'atelier et la personne derrière"] },
      { key: "contact", label: "Contact", sections: ["Contact"] },
      { key: "aide", label: "Aide", sections: ["Suivi de commande et aide"] },
      { key: "legal", label: "Informations légales", sections: ["Mentions et conditions"] },
      { key: "404", label: "Page 404", sections: ["Page introuvable (404)"] },
    ],
  };
}

describe("thème sur mesure : bibliothèque", () => {
  it("toutes les sections du catalogue (sans les e-mails), deux familles, rôles de la famille Moderne complets", () => {
    const lib = sectionLibrary();
    expect(lib.sections.length).toBeGreaterThanOrEqual(180);
    expect(new Set(lib.sections.map((s) => s.id)).size).toBe(lib.sections.length);
    const moderne = familySections("moderne");
    expect(moderne).toHaveLength(55);
    // Chaque section nommée dans les familles du Studio existe dans la bibliothèque.
    for (const f of SECTION_FAMILIES.filter((x) => x.id === "moderne")) for (const titles of Object.values(f.roles)) for (const t of titles) expect(sectionByRef(t), t).toBeTruthy();
    // Les démonstrations en fausse fenêtre ne sont jamais proposées.
    expect(familySections("classique").some((s) => s.demoFrame)).toBe(false);
    for (const f of ["library.css", "library.js", "templates.html"]) expect(fs.existsSync(path.join(process.cwd(), "public", "sections", f)), f).toBe(true);
    const photos = new Set(fs.readdirSync(path.join(process.cwd(), "public", "sections", "photos")));
    for (const s of moderne) for (const ph of [...s.html.matchAll(/photos\/([\w-]+\.(?:webp|png|jpg))/g)].map((m) => m[1])) expect(photos.has(ph), `${s.title} → ${ph}`).toBe(true);
  });

  it("le nom d'une marque de démonstration est remplacé par celui du client, casse comprise", () => {
    expect(withBrandName("RUPTURE · Rupture · rupture. #RUPTURE Brindi", "Le Fil Rouge")).toBe("LE FIL ROUGE · Le Fil Rouge · le fil rouge. #LEFILROUGE Le Fil Rouge");
    expect(DEMO_BRANDS).toContain("Solstice");
    expect(withBrandName('<div><span style="--i:0">S</span><span style="--i:1">O</span><span style="--i:2">L</span><span style="--i:3">S</span><span style="--i:4">T</span><span style="--i:5">I</span><span style="--i:6">C</span><span style="--i:7">E</span></div>', "Le Fil")).toBe('<div><span style="--i:0">L</span><span style="--i:1">E</span><span style="--i:2">&nbsp;</span><span style="--i:3">F</span><span style="--i:4">I</span><span style="--i:5">L</span></div>');
    expect(withBrandName("Brindi", "A<b>")).toBe("A&lt;b&gt;");
  });
});

describe("thème sur mesure : montage et règles du propriétaire", () => {
  it("les trois points de départ respectent les règles (aucun point bloquant)", () => {
    for (const [fam, style] of [["moderne", "sport-chic"], ["moderne", "streetwear-neon"], ["classique", "classique"]] as const) {
      const t = starterTheme(fam, style);
      expect(blocking(t), `${fam}/${style}`).toEqual([]);
      expect(t.pages[0].key).toBe("home");
    }
    expect(Object.keys(STARTERS)).toEqual(["sport-chic", "streetwear-neon", "classique"]);
  });

  it("refuse le mélange de familles, deux « Produit vedette », deux sections de cartes, la même section à la suite", () => {
    const t = starterTheme("moderne", "sport-chic");
    const mix = applyStructure(t, [{ op: "add", page: "home", section: sectionByRef("Ouverture photo pleine")!.id }]);
    expect(blocking(mix).join(" ")).toMatch(/jamais de mélange de familles/);
    const twoPv = applyStructure(t, [{ op: "add", page: "product", section: sectionByRef("Produit vedette · drop limité")!.id }]);
    expect(blocking(twoPv).join(" ")).toMatch(/deux sections « Produit vedette »/);
    const notTop = applyStructure(t, [{ op: "move", uid: t.pages[2].sections[0].uid, at: 3 }]);
    expect(blocking(notTop).join(" ")).toMatch(/doit ouvrir la fiche produit/);
    const twoCards = applyStructure(t, [{ op: "add", page: "home", section: sectionByRef("Grille à filtres animés")!.id }]);
    expect(blocking(twoCards).join(" ")).toMatch(/une seule par page/);
    const sameRole = applyStructure(t, [{ op: "add", page: "home", section: sectionByRef("Avis et ajustement")!.id, at: 7 }]);
    expect(checkCustomTheme(sameRole).filter((p) => p.level === "à revoir").map((p) => p.text).join(" ")).toMatch(/deux sections « confiance » à la suite/);
    const twice = applyStructure(t, [{ op: "add", page: "home", section: t.pages[0].sections[0].id, at: 1 }]);
    expect(blocking(twice).join(" ")).toMatch(/deux fois à la suite/);
    const noHeader = { ...t, header: null };
    expect(blocking(noHeader).join(" ")).toMatch(/il manque un en-tête/);
  });

  it("opérations de structure : ajouter, retirer, déplacer, remplacer, pages", () => {
    const t = starterTheme("moderne", "streetwear-neon");
    const uid = t.pages[0].sections[1].uid;
    const a = applyStructure(t, [{ op: "remove", uid }]);
    expect(a.pages[0].sections.some((s) => s.uid === uid)).toBe(false);
    expect(t.pages[0].sections.some((s) => s.uid === uid)).toBe(true); // l'original ne bouge pas
    const b = applyStructure(t, [{ op: "replace", uid, section: sectionByRef("Offre en deux tuiles")!.id }]);
    expect(libSection(b.pages[0].sections[1].id)!.title).toBe("Offre en deux tuiles");
    const c = applyStructure(t, [{ op: "page", key: "faq", label: "Questions" }, { op: "add", page: "faq", section: sectionByRef("Questions numérotées")!.id }, { op: "rename_page", key: "faq", label: "Vos questions" }]);
    expect(c.pages.at(-1)).toMatchObject({ key: "faq", label: "Vos questions" });
    expect(() => applyStructure(t, [{ op: "add", page: "nulle-part", section: "x" }])).toThrow(/introuvable/);
  });

  it("retouche d'un passage exact et règles CSS limitées à la section", () => {
    expect(replaceOnce("<h2>Bonjour</h2><p>Salut</p>", "Bonjour", "Hello")).toBe("<h2>Hello</h2><p>Salut</p>");
    expect(() => replaceOnce("<p>a</p><p>a</p>", "a", "b")).toThrow(/plusieurs fois/);
    expect(() => replaceOnce("<p>a</p>", "z", "b")).toThrow(/introuvable/);
    expect(scopedCss("s1", ":scope h2{color:red} :scope > p{margin:0}")).toBe('[data-ct="s1"] h2{color:red} [data-ct="s1"] > p{margin:0}');
    expect(() => scopedCss("s1", "h2{color:red}")).toThrow(/hors de la section/);
    expect(() => scopedCss("s1", ':scope{background:url("https://x.y/a.png")}')).toThrow(/extérieure/);
  });
});

describe("thème sur mesure : rendu", () => {
  it("aux couleurs, au nom et aux polices de la marque ; sections marquées ; désignation dans le Studio seulement", () => {
    const t = starterTheme("moderne", "streetwear-neon");
    const html = renderCustomTheme(proj, t, { nonce: "abc" });
    expect(html).toContain("ARDENT");
    const visible = html.replace(/window\.CT_DEMO=\[[^\]]*\];/, "");
    for (const d of ["RUPTURE", "Rupture", "Brindi", "SOLSTICE"]) expect(visible.includes(d), d).toBe(false);
    expect(html).toContain('<base href="/sections/">');
    expect(html).toContain("--q-lm:#C2410C");
    expect((html.match(/data-ct="s[0-9a-f]{8}"/g) ?? []).length).toBe(t.pages.reduce((n, p) => n + p.sections.length, 0) + 3);
    expect((html.match(/<script(?! nonce="abc")[ >]/g) ?? []).length).toBe(0);
    expect(html).not.toContain("ct-preview\",type:\"picked\"");
    const studio = renderCustomTheme(proj, t, { studio: true, nonce: "abc" });
    expect(studio).toContain('type:"picked"');
    expect(studio).toContain("textes et photos d'exemple");
    // Pages complètes et liens reliés (demande du propriétaire du 9 novembre 2026) ; compteur du panier commun.
    expect(t.pages.map((p) => p.key)).toEqual(expect.arrayContaining(["commande", "merci", "compte", "aide", "contact", "legal"]));
    const map = JSON.parse(/window\.TB_MAP=(\{[^<]*?\});/.exec(html)![1]);
    expect(map).toMatchObject({ "Passer commande": "commande", "Mon compte": "compte", "Suivi de commande": "aide", "Conditions générales": "legal:cgv", "Confidentialité": "legal:confidentialite" });
    expect(html).toContain("window.TB_GO=go");
    expect(html).toContain("tb-toast");
    expect(html).toContain("Aucune donnée de carte n'est demandée ici");
    if (process.env.CT_DUMP) for (const [f, s] of [["moderne", "sport-chic"], ["moderne", "streetwear-neon"], ["classique", "classique"]] as const) fs.writeFileSync(path.join(process.env.CT_DUMP, `ct-${s}.html`), renderCustomTheme(proj, starterTheme(f, s), { studio: true, nonce: "n0nce" }));
  });

  it("bloc d'achat : seules les fonctions que le produit a vraiment", () => {
    expect(buyFlags(null)).toEqual({ poInit: "1" });
    const f = { colors: null, formats: [{ option: "Taille", values: ["S", "M"] }], promo: null, quantity: { kind: "bogo", buy: 2, free: 1 }, subscription: null, bundle: null, gifts: [], range: ["A", "B"], delivery: { minDays: 2, maxDays: 4, cutoffHour: null }, loyalty: null, hidden: [] } as any;
    expect(buyFlags(f)).toMatchObject({ poCouleur: "0", poTaille: "1", poOffre: "bogo", poGamme: "1", poLivraison: "1", poAbo: "0", poFidelite: "0" });
    expect(brandCss({ brand: null })).toBe("");
  });
});

describe("thème sur mesure : outils de SINA", async () => {
  process.env.STUDIO_SYNA_AGENT = "1";
  const { one } = await import("@/lib/db");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { account } = await import("./conversation209-fixtures");
  const { threadFor } = await import("@/lib/syna-agent/thread");
  const { getTool } = await import("@/lib/syna-agent/registry");
  const T = await import("@/lib/syna-agent/custom-theme/tools");
  const { loadCustomTheme } = await import("@/lib/syna-agent/custom-theme/theme");
  const fr = <R,>(fn: () => Promise<R> | R) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());
  const call = async (name: string, ctx: any, args: unknown): Promise<any> => {
    ctx.projectId = one<{ project_id: string | null }>("SELECT project_id FROM agent_conversations WHERE id=?", ctx.conversationId)?.project_id ?? null;
    return fr(() => getTool(name)!.run(ctx, getTool(name)!.args.parse(args)));
  };
  async function project() {
    const user = await account();
    const cid = threadFor(user, null), ctx: any = { user, conversationId: cid, runId: `run-${Date.now()}`, projectId: null, attachment: () => null };
    await call("start.answer", ctx, { answers: [{ field: "business", value: "products" }, { field: "offer", value: "Des sacs et accessoires en cuir faits main." }] });
    await call("start.answer", ctx, { answers: [
      { field: "existing", value: "Rien." }, { field: "audience", value: "Femmes de 25 à 45 ans." }, { field: "image", value: "Solaire et sportif." },
      { field: "setup", value: "4 produits" }, { field: "market", value: "En ligne, France." }, { field: "price", value: "50 à 130 €" }, { field: "difference", value: "Faits main." },
      { field: "taste", status: "none" }, { field: "photos", value: "Pas encore." }, { field: "language", value: "Français seulement" }, { field: "contact", status: "later" }, { field: "platform", value: "shopify" },
    ] });
    await call("start.confirm", ctx, {});
    return { ctx, pid: one<any>("SELECT project_id FROM agent_conversations WHERE id=?", cid).project_id as string };
  }

  it("famille d'abord, puis montage, lecture, modification, désignation, structure, annulation et choix (gratuits)", async () => {
    const { ctx, pid } = await project();
    for (const n of ["custom.sections", "custom.compose", "custom.show", "custom.section", "custom.structure", "custom.edit", "custom.undo", "custom.choose"]) expect(getTool(n)!.estimate, n).toBeUndefined();
    expect(getTool("custom.photo")!.kind).toBe("generate");
    expect((await call("custom.sections", ctx, {})).summary).toMatch(/famille de sections pas encore choisie/);
    await call("theme.family", ctx, { family: "moderne", style: "sport-chic" });
    const lib = await call("custom.sections", ctx, { role: "produit vedette" });
    expect(Object.keys(lib.data.roles)).toEqual(["produit vedette"]);
    expect(lib.data.roles["produit vedette"]).toHaveLength(3);
    // Aucun thème de départ : une page obligatoire absente est refusée, rien n'est enregistré.
    const site = fullSite("moderne");
    const partial = await call("custom.compose", ctx, { ...site, pages: site.pages.filter((p) => p.key !== "legal") });
    expect(partial.ok).toBe(false);
    expect(partial.summary).toMatch(/page « Informations légales[^»]*» absente/);
    expect(loadCustomTheme(pid)).toBeNull();
    // Shopify tient lui-même le paiement et la confirmation : une page « commande » dans le thème est refusée.
    const withCheckout = await call("custom.compose", ctx, { ...site, pages: [...site.pages, { key: "commande", label: "Commande", sections: ["Commande en une page"] }] });
    expect(withCheckout.ok).toBe(false);
    expect(withCheckout.summary).toMatch(/page « Commande » en trop : sur Shopify/);
    const made = await call("custom.compose", ctx, site);
    expect(made.ok, made.summary).toBe(true);
    const card = made.data.customTheme;
    expect(card.href).toBe(`/api/projects/${pid}/custom-theme?studio=1&embed=1&rev=1`);
    expect(card.pages.map((p: any) => p.key)).toEqual(["home", "shop", "product", "cart", "compte", "aide", "journal", "article", "contact", "legal", "404"]);
    // Mélange de familles refusé : rien n'est enregistré.
    const mixed = await call("custom.compose", ctx, { ...site, pages: [{ key: "home", label: "Accueil", sections: ["Ouverture photo pleine"] }, ...site.pages.slice(1)] });
    expect(mixed.ok).toBe(false);
    expect(mixed.summary).toMatch(/Rien n'est enregistré[^]*mélange de familles/);
    expect(loadCustomTheme(pid)!.rev).toBe(1);
    // Lire puis modifier un texte désigné par le client.
    const hero = card.pages[0].sections[0].uid;
    const read = await call("custom.section", ctx, { uid: hero });
    expect(read.data.html).toContain("L'été prend");
    const ed = await call("custom.edit", ctx, { uid: hero, edits: [{ find: "L'été prend", replace: "La saison s'ouvre" }] });
    expect(ed.ok).toBe(true);
    expect(loadCustomTheme(pid)!.pages[0].sections[0].html).toContain("La saison s'ouvre");
    // Passage absent, script, règle hors section : refusés, rien ne change.
    expect((await call("custom.edit", ctx, { uid: hero, edits: [{ find: "texte qui n'existe pas", replace: "x" }] })).summary).toMatch(/Rien n'est modifié[^]*introuvable/);
    expect((await call("custom.edit", ctx, { uid: hero, edits: [{ find: "La saison s'ouvre", replace: "<script>alert(1)</script>" }] })).summary).toMatch(/balise refusée/);
    expect((await call("custom.edit", ctx, { uid: hero, css: "body{display:none}" })).summary).toMatch(/hors de la section/);
    // Élément désigné masqué puis réaffiché, mise en forme propre à la section.
    expect((await call("custom.edit", ctx, { uid: hero, hide: ["div:nth-child(1) > a:nth-child(2)"], css: ":scope h1{letter-spacing:.02em}" })).ok).toBe(true);
    expect(loadCustomTheme(pid)!.pages[0].sections[0].css).toMatch(/\[data-ct="s[0-9a-f]{8}"\] > div:nth-child\(1\) > a:nth-child\(2\)\{display:none!important\}[^]*letter-spacing/);
    expect((await call("custom.edit", ctx, { uid: hero, show: ["div:nth-child(1) > a:nth-child(2)"] })).ok).toBe(true);
    expect((await call("custom.edit", ctx, { uid: hero, hide: ["body"] })).ok).toBe(false);
    // Structure : remplacer, retirer, ajouter une page ; annuler revient en arrière.
    const shop = loadCustomTheme(pid)!.pages[1];
    const st = await call("custom.structure", ctx, { ops: [{ op: "replace", uid: shop.sections[1].uid, section: "Questions numérotées" }, { op: "page", key: "boutiques", label: "Nos boutiques" }, { op: "add", page: "boutiques", section: "Boutique et contact" }] });
    expect(st.ok).toBe(true);
    expect(loadCustomTheme(pid)!.pages.map((p) => p.key)).toContain("boutiques");
    const revBefore = loadCustomTheme(pid)!.rev;
    expect((await call("custom.undo", ctx, {})).ok).toBe(true);
    const back = loadCustomTheme(pid)!;
    expect(back.pages.map((p) => p.key)).not.toContain("boutiques");
    expect(back.rev).toBe(revBefore + 1);
    // Choix du client.
    const ch = await call("custom.choose", ctx, {});
    expect(ch.ok).toBe(true);
    expect(loadCustomTheme(pid)!.chosen).toBe(true);
    expect(ch.hint).toMatch(/textes ou photos d'exemple/);
  });

  it("photo : prix d'abord, puis créée (fausse génération, aucun appel réel) et posée à la place de la photo d'exemple", async () => {
    const { ctx, pid } = await project();
    await call("theme.family", ctx, { family: "moderne", style: "streetwear-neon" });
    expect((await call("custom.compose", ctx, fullSite("moderne"))).ok).toBe(true);
    T.customPhotoDeps.unit = () => 47_000;
    const sharp = (await import("sharp")).default;
    T.customPhotoDeps.make = async () => sharp({ create: { width: 64, height: 80, channels: 3, background: "#222" } }).png().toBuffer();
    try {
      const t = loadCustomTheme(pid)!;
      const { sectionHtml } = await import("@/lib/syna-agent/custom-theme/theme");
      const target = t.pages.flatMap((p) => p.sections).find((s) => /photos\/[a-z]{2}-[a-z0-9]+\.webp/.test(sectionHtml(s)))!;
      const file = sectionHtml(target).match(/photos\/[a-z]{2}-[a-z0-9]+\.webp/)![0];
      const est = await getTool("custom.photo")!.estimate!(ctx, { uid: target.uid, find: file, description: "Photo de mode éditoriale, cadrage en pied, fond béton gris, une veste noire portée.", ratio: "4:5" } as any);
      expect(est.maxMicro).toBe(47_000);
      const r = await call("custom.photo", ctx, { uid: target.uid, find: file, description: "Photo de mode éditoriale, cadrage en pied, fond béton gris, une veste noire portée.", ratio: "4:5" });
      expect(r.ok).toBe(true);
      const after = sectionHtml(loadCustomTheme(pid)!.pages.flatMap((p) => p.sections).find((s) => s.uid === target.uid)!);
      expect(after).not.toContain(file);
      expect(after).toContain(r.data.href);
    } finally { delete T.customPhotoDeps.unit; delete T.customPhotoDeps.make; }
  });

  it("carte d'accord d'une dépense : l'action en clair et son prix en % du budget, jamais le nom de l'outil (essai réel du 9 novembre)", async () => {
    const { ctx, pid } = await project();
    const { confirmationText } = await import("@/lib/syna-agent/loop");
    const text = await fr(() => confirmationText(getTool("custom.build")!, { photos: true, images: "sina" }, ctx, ctx.user.id, pid, { label: "thème sur mesure monté à ta marque : 34 sections écrites, 48 photos créées", probableMicro: 6_330_000, maxMicro: 10_460_000 }));
    expect(text).toMatch(/^Thème sur mesure monté à ta marque : 34 sections écrites, 48 photos créées\./);
    expect(text).toMatch(/Coût probable : .*%.* ; au plus .*%/);
    expect(text).not.toMatch(/custom\.build|\{|€/);
  });
});

describe("thème sur mesure : montage à la marque (textes et photos), sans aucun appel réel", async () => {
  process.env.STUDIO_SYNA_AGENT = "1";
  const { one } = await import("@/lib/db");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { account } = await import("./conversation209-fixtures");
  const { threadFor } = await import("@/lib/syna-agent/thread");
  const { getTool } = await import("@/lib/syna-agent/registry");
  const B = await import("@/lib/syna-agent/custom-theme/brand");
  const T = await import("@/lib/syna-agent/custom-theme/tools");
  const { loadCustomTheme, allSections, sectionHtml } = await import("@/lib/syna-agent/custom-theme/theme");
  const fr = <R,>(fn: () => Promise<R> | R) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());
  const call = async (name: string, ctx: any, args: unknown): Promise<any> => {
    ctx.projectId = one<{ project_id: string | null }>("SELECT project_id FROM agent_conversations WHERE id=?", ctx.conversationId)?.project_id ?? null;
    return fr(() => getTool(name)!.run(ctx, getTool(name)!.args.parse(args)));
  };

  it("devis d'abord, puis chaque section réécrite pour la marque et chaque photo d'exemple remplacée ; le thème est en place pour la Boutique", async () => {
    const user = await account();
    const cid = threadFor(user, null), ctx: any = { user, conversationId: cid, runId: `run-${Date.now()}`, projectId: null, attachment: () => null };
    await call("start.answer", ctx, { answers: [{ field: "business", value: "products" }, { field: "offer", value: "Des bougies parfumées coulées à la main." }] });
    await call("start.answer", ctx, { answers: [
      { field: "existing", value: "Rien." }, { field: "audience", value: "Adultes." }, { field: "image", value: "Doux." }, { field: "setup", value: "3 bougies" }, { field: "market", value: "France." },
      { field: "price", value: "25 €" }, { field: "difference", value: "Cire de colza." }, { field: "taste", status: "none" }, { field: "photos", value: "Non." }, { field: "language", value: "Français seulement" }, { field: "contact", status: "later" }, { field: "platform", value: "shopify" },
    ] });
    await call("start.confirm", ctx, {});
    const pid = one<any>("SELECT project_id FROM agent_conversations WHERE id=?", cid).project_id as string;
    expect((await call("custom.build", ctx, {})).summary).toMatch(/style|famille/i); // la famille d'abord
    await call("theme.family", ctx, { family: "classique" });
    expect((await call("custom.build", ctx, {})).summary).toMatch(/compose d'abord toutes les pages/); // puis tout le site, monté de A à Z
    const composed = await call("custom.compose", ctx, fullSite("classique"));
    expect(composed.ok, composed.summary).toBe(true);
    // Un thème qui enfreint une règle (page de paiement Shopify ajoutée) n'a jamais de devis : SINA le corrige d'abord.
    const S = await import("@/lib/syna-agent/custom-theme/theme");
    const cur = S.loadCustomTheme(pid)!;
    S.saveCustomTheme(pid, S.applyStructure(cur, [{ op: "page", key: "commande", label: "Commande" }, { op: "add", page: "commande", section: "commande-pas-a-pas" }]));
    ctx.projectId = pid;
    await expect(fr(() => getTool("custom.build")!.estimate!(ctx, {}))).rejects.toThrow(/Thème à corriger avant le devis : page « Commande » en trop/);
    S.saveCustomTheme(pid, cur);
    T.customPhotoDeps.unit = () => 50_000;
    try {
      ctx.projectId = pid;
      const est = await fr(() => getTool("custom.build")!.estimate!(ctx, {}));
      expect(est.maxMicro).toBeGreaterThan(est.probableMicro!);
      expect(est.label).toMatch(/sections écrites, \d+ photos/);
      const r = await call("custom.build", ctx, {});
      expect(r.ok).toBe(true);
      expect(r.jobs).toHaveLength(1);
      const job = one<any>("SELECT * FROM jobs WHERE id=?", r.jobs[0]);
      expect(job.type).toBe("syna.custom.brand");
      expect(JSON.parse(job.payload)).toMatchObject({ projectId: pid, photos: true });
      expect(r.data.customTheme.boutique).toBe(`/studio/${pid}/boutique`);
      // Exécution de la tâche avec une fausse écriture et une fausse photo (aucun appel réel).
      const sharp = (await import("sharp")).default;
      let writes = 0, photos = 0;
      B.customBrandDeps.write = async (prompt) => {
        writes++;
        expect(prompt).toContain("Marque : «");
        const html = prompt.slice(prompt.indexOf("HTML actuel"));
        const h = html.match(/<(h[1-4])[^>]*>([^<]{3,80})</);
        const imgs = [...new Set([...html.matchAll(/photos\/[\w-]+\.(?:webp|png|jpg)/g)].map((m) => m[0]))];
        return { edits: h ? [{ find: `>${h[2]}<`, replace: `>Texte de la marque ${writes}<` }] : [], photos: imgs.map((f) => ({ find: f, description: "Photo de bougie en verre ambré sur une table en chêne, lumière douce du soir.", ratio: "4:5" as const, product: null })) };
      };
      B.customBrandDeps.photo = async () => { photos++; return sharp({ create: { width: 40, height: 50, channels: 3, background: "#a86" } }).png().toBuffer(); };
      const fake: any = { job: { id: job.id }, payload: JSON.parse(job.payload), checkpoint: {}, progress: () => undefined, step: async (_k: string, fn: () => Promise<unknown>) => fn() };
      const out: any = await fr(() => B.runCustomBrandJob(fake));
      const t = loadCustomTheme(pid)!;
      expect(writes).toBe(allSections(t).length);
      expect(out.sections).toBe(writes);
      expect(photos).toBeGreaterThan(0);
      expect(out.photosMade).toBe(photos);
      for (const x of allSections(t)) expect(sectionHtml(x.s), x.place).not.toMatch(/photos\/[a-z]+-?[a-z0-9]*\.(webp|jpg|png)/);
      expect(allSections(t).filter((x) => x.s.clientTexts).length).toBeGreaterThan(0);
    } finally { delete T.customPhotoDeps.unit; delete B.customBrandDeps.write; delete B.customBrandDeps.photo; }
  });

  it("images : SINA dit combien il en faut ; celles du client d'abord ; jamais assez → refus et choix au client ; « mix » : SINA crée seulement les autres", async () => {
    const user = await account();
    const cid = threadFor(user, null), ctx: any = { user, conversationId: cid, runId: `run-${Date.now()}`, projectId: null, attachment: () => null };
    await call("start.answer", ctx, { answers: [{ field: "business", value: "products" }, { field: "offer", value: "Des savons artisanaux." }] });
    await call("start.answer", ctx, { answers: [
      { field: "existing", value: "Rien." }, { field: "audience", value: "Adultes." }, { field: "image", value: "Doux." }, { field: "setup", value: "3 savons" }, { field: "market", value: "France." },
      { field: "price", value: "8 €" }, { field: "difference", value: "Saponification à froid." }, { field: "taste", status: "none" }, { field: "photos", value: "Oui." }, { field: "language", value: "Français seulement" }, { field: "contact", status: "later" }, { field: "platform", value: "shopify" },
    ] });
    await call("start.confirm", ctx, {});
    const pid = one<any>("SELECT project_id FROM agent_conversations WHERE id=?", cid).project_id as string;
    await call("theme.family", ctx, { family: "classique" });
    expect((await call("custom.compose", ctx, fullSite("classique"))).ok).toBe(true);
    const need = await call("custom.images", ctx, {});
    expect(need.ok).toBe(true);
    const n = need.data.imagesNecessaires as number;
    expect(n).toBeGreaterThan(3);
    expect(need.hint).toMatch(/tes images, ou je les crée[^]*qu'il en faut \d+[^]*mix[^]*sina/);
    // Deux images envoyées par le client.
    const sharp = (await import("sharp")).default;
    const { saveAsset } = await import("@/lib/library");
    const mine: string[] = [];
    for (const c of ["#335", "#553"]) mine.push((await saveAsset({ projectId: pid, userId: user.id, data: await sharp({ create: { width: 30, height: 30, channels: 3, background: c } }).png().toBuffer(), name: `client-${c}.png`, mime: "image/png", role: "original", origin: "upload" })).id);
    expect((await call("custom.images", ctx, {})).data.imagesDuClient.map((x: any) => x.id)).toEqual(mine);
    // « Seulement mes images » sans en avoir assez : rien n'est lancé, SINA propose les autres choix.
    const short = await call("custom.build", ctx, { images: "client", clientAssets: mine });
    expect(short.ok).toBe(false);
    expect(short.summary).toMatch(new RegExp(`Il faut ${n} images et le client en a donné 2`));
    expect(short.hint).toMatch(/mix[^]*sina/);
    expect((await call("custom.build", ctx, { images: "mix", clientAssets: ["inconnue"] })).summary).toMatch(/Images inconnues/);
    T.customPhotoDeps.unit = () => 50_000;
    try {
      ctx.projectId = pid;
      const mix = await fr(() => getTool("custom.build")!.estimate!(ctx, { images: "mix", clientAssets: mine }));
      const all = await fr(() => getTool("custom.build")!.estimate!(ctx, { images: "sina" }));
      expect(all.maxMicro - mix.maxMicro).toBe(2 * 50_000); // deux photos de moins à créer
      expect(mix.label).toMatch(new RegExp(`${n - 2} photos créées, 2 de tes images posées`));
      const r = await call("custom.build", ctx, { images: "mix", clientAssets: mine });
      expect(r.ok).toBe(true);
      const job = one<any>("SELECT * FROM jobs WHERE id=?", r.jobs[0]);
      expect(JSON.parse(job.payload)).toMatchObject({ images: "mix", clientAssets: mine });
      let made = 0;
      B.customBrandDeps.write = async (prompt) => ({ edits: [], photos: [...new Set([...prompt.slice(prompt.indexOf("HTML actuel")).matchAll(/photos\/[\w-]+\.(?:webp|png|jpg)/g)].map((m) => m[0]))].map((f) => ({ find: f, description: "Photo d'un savon blanc sur une pierre grise, lumière douce du matin.", ratio: "1:1" as const, product: null })) });
      B.customBrandDeps.photo = async () => { made++; return sharp({ create: { width: 20, height: 20, channels: 3, background: "#999" } }).png().toBuffer(); };
      const out: any = await fr(() => B.runCustomBrandJob({ job: { id: job.id }, payload: JSON.parse(job.payload), checkpoint: {}, progress: () => undefined, step: async (_k: string, fn: () => Promise<unknown>) => fn() } as any));
      expect(out.photosClient).toBe(2);
      expect(made).toBe(out.photosMade);
      expect(out.photosClient + out.photosMade).toBe(n);
      const html = allSections(loadCustomTheme(pid)!).map((x) => sectionHtml(x.s)).join("");
      for (const id of mine) expect(html).toContain(id);
    } finally { delete T.customPhotoDeps.unit; delete B.customBrandDeps.write; delete B.customBrandDeps.photo; }
  });

  it("un remplacement qui ne s'applique pas est compté, jamais deviné ; aucun script n'entre", () => {
    const w = { edits: [{ find: "<h2>Bonjour</h2>", replace: "<h2>Salut</h2>" }, { find: "absent", replace: "x" }, { find: "<p>a</p>", replace: "<script>x</script>" }], photos: [] };
    expect(B.applyWrite("<h2>Bonjour</h2><p>a</p>", w)).toEqual({ html: "<h2>Salut</h2><p>a</p>", failed: 2 });
  });
});
