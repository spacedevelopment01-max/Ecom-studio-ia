/**
 * La liaison du thème sur mesure avec les vraies données du client (13 novembre 2026 ; questions du propriétaire :
 * « comment tu va jouer la liaison ? Et les méga menu tu va faire commenr pour les clients ? »). Une fiche par produit,
 * chaque carte mène à sa fiche, le menu se calcule depuis le catalogue (simple, sous-menu par familles, grand menu),
 * les prestations viennent du profil des services, une rupture de stock se dit. Gratuit, sans IA, aucun appel réel.
 */
import { describe, expect, it } from "vitest";
import * as F from "./tenue-fauteuil-fixtures";

process.env.STUDIO_SYNA_AGENT = "1";

describe("thème sur mesure : le menu calculé depuis le catalogue", async () => {
  const M = await import("@/lib/syna-agent/custom-theme/menu");
  const S = await import("@/lib/syna-agent/custom-theme/theme");
  const theme = (pages: [string, string, string?][]) => ({ version: 1, family: "classique", style: "classique", header: null, footer: null, search: null, rev: 0, at: 0, pages: pages.map(([key, label, product]) => ({ key, label, sections: [], ...(product ? { product } : {}) })) }) as any;
  const base: [string, string, string?][] = [["home", "Accueil"], ["shop", "La boutique"], ["product", "Fiche produit", "the-vert"], ["about", "Notre histoire"], ["aide", "Aide"], ["contact", "Contact"]];
  const prod = (handle: string, title: string, ...categories: string[]) => ({ handle, title, categories });

  it("peu de produits sans famille : un menu simple ; chacun avec sa fiche : ils entrent dans le menu", () => {
    const t = theme(base);
    expect(M.proposeMenu(t, [prod("the-vert", "Thé vert"), prod("rooibos", "Rooibos")], "products")).toEqual([
      { label: "La boutique", to: "shop" }, { label: "Notre histoire", to: "about" }, { label: "Aide", to: "aide" }, { label: "Contact", to: "contact" },
    ]);
    const each = theme([...base, ["product-rooibos", "Rooibos", "rooibos"]]);
    expect(M.proposeMenu(each, [prod("the-vert", "Thé vert"), prod("rooibos", "Rooibos")], "products")[0]).toEqual({ label: "La boutique", to: "shop", children: [{ label: "Thé vert", to: "product" }, { label: "Rooibos", to: "product-rooibos" }] });
    // Un seul produit, pas de boutique : la fiche est l'entrée du menu.
    expect(M.proposeMenu(theme(base.filter(([k]) => k !== "shop")), [prod("the-vert", "Thé vert")], "products")[0]).toEqual({ label: "Fiche produit", to: "product" });
  });

  it("des familles : un sous-menu ; beaucoup de familles ou de produits : un grand menu, quelques produits par famille", () => {
    const t = theme(base);
    const few = [prod("a", "Sencha", "Thés verts"), prod("b", "Earl Grey", "Thés noirs"), prod("c", "Genmaicha", "Thés verts")];
    expect(M.proposeMenu(t, few, "products")[0]).toEqual({ label: "La boutique", to: "shop", children: [{ label: "Tout voir", to: "shop" }, { label: "Thés verts", to: "shop:Thés verts" }, { label: "Thés noirs", to: "shop:Thés noirs" }] });
    const many = [...few, prod("d", "Rooibos vanille", "Rooibos"), prod("e", "Verveine", "Infusions"), ...Array.from({ length: 6 }, (_, i) => prod(`v${i}`, `Vert ${i}`, "Thés verts"))];
    const big = M.proposeMenu(t, many, "products")[0];
    expect(big.grand).toBe(true);
    expect(big.children!.map((c) => c.label)).toEqual(["Tout voir", "Thés verts", "Thés noirs", "Rooibos", "Infusions"]);
    // Une famille de plus de cinq produits ne les liste pas (« Tout voir » suffit) ; une petite famille les montre.
    expect(big.children!.find((c) => c.label === "Thés verts")!.items).toBeUndefined();
    expect(big.children!.find((c) => c.label === "Rooibos")!.items).toEqual([{ label: "Rooibos vanille", to: "product" }]);
  });

  it("services : prestations et prise de rendez-vous ; un lien ne mène jamais à une page absente", () => {
    const t = theme([["home", "Accueil"], ["prestations", "Nos prestations"], ["reservation", "Prendre rendez-vous"], ["about", "Le salon"], ["contact", "Contact"]]);
    expect(M.proposeMenu(t, [], "services").map((m) => m.to)).toEqual(["prestations", "reservation", "about", "contact"]);
    const { menu, dropped } = M.validMenu(t, [{ label: "Prestations", to: "prestations", children: [{ label: "Coupes", to: "prestations:Coupes" }, { label: "Blog", to: "journal" }] }, { label: "Boutique", to: "shop" }]);
    expect(menu).toEqual([{ label: "Prestations", to: "prestations", children: [{ label: "Coupes", to: "prestations:Coupes" }] }]);
    expect(dropped).toEqual(["Boutique", "Blog"]);
  });

  it("le menu se pose dans l'en-tête à tenue : liens, sous-menus en volets, grand menu en colonnes", async () => {
    const { tenueSection } = await import("@/lib/syna-agent/custom-theme/tenue");
    const header = tenueSection("tn-entete")!.html;
    const html = M.withMenu(header, [{ label: "La boutique", to: "shop", grand: true, children: [{ label: "Tout voir", to: "shop" }, { label: "Rooibos", to: "shop:Rooibos", items: [{ label: "Rooibos <vanille>", to: "product" }] }] }, { label: "Contact", to: "contact" }]);
    expect(html).toContain('<details class="tn-sous" data-tn-grand><summary>La boutique</summary><div class="tn-sous-in"><a class="tn-fam" href="#" onclick="return false" data-go="shop">Tout voir</a><div class="tn-col"><a class="tn-fam" href="#" onclick="return false" data-go="shop:Rooibos">Rooibos</a><a href="#" onclick="return false" data-go="product">Rooibos &lt;vanille&gt;</a></div></div></details><a href="#" onclick="return false" data-go="contact">Contact</a></nav>');
    expect(html).not.toContain(">Notre histoire<"); // les liens d'exemple ont disparu
    expect(M.withMenu(header, undefined)).toBe(header);
    expect(M.withMenu('<section class="autre"><nav><a>Accueil</a></nav></section>', [{ label: "X", to: "home" }])).toContain("<a>Accueil</a>"); // un autre en-tête n'est pas touché
    void S;
  });
});

describe("thème sur mesure : une fiche par produit, les prestations, la rupture de stock", async () => {
  const { one, run } = await import("@/lib/db");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { account } = await import("./conversation209-fixtures");
  const { threadFor } = await import("@/lib/syna-agent/thread");
  const { getTool } = await import("@/lib/syna-agent/registry");
  const S = await import("@/lib/syna-agent/custom-theme/theme");
  const N = await import("@/lib/syna-agent/custom-theme/tenue");
  const { renderCustomTheme } = await import("@/lib/syna-agent/custom-theme/render");
  const { saveBrand, loadProject } = await import("@/lib/projects");
  const { saveAsset } = await import("@/lib/library");
  const { createProduct, listProducts } = await import("@/lib/products/catalog") as any;
  const fr = <X,>(fn: () => Promise<X> | X) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());
  const call = async (name: string, ctx: any, args: unknown): Promise<any> => {
    ctx.projectId = one<{ project_id: string | null }>("SELECT project_id FROM agent_conversations WHERE id=?", ctx.conversationId)?.project_id ?? null;
    return fr(() => getTool(name)!.run(ctx, getTool(name)!.args.parse(args)));
  };

  it("applyStructure : chaque produit reçoit sa fiche, bâtie comme la fiche commune, à écrire pour lui", () => {
    let t: any = { version: 1, family: "classique", style: "classique", header: null, footer: null, search: null, pages: [], rev: 0, at: 0 };
    t = S.applyStructure(t, [{ op: "page", key: "home", label: "Accueil" }, { op: "page", key: "product", label: "Fiche produit" }, { op: "page", key: "contact", label: "Contact" },
      { op: "add", page: "product", section: "tn-achat" }, { op: "add", page: "product", section: "tn-de-pres", construction: "sans-titre" }, { op: "add", page: "product", section: "tn-mesures", construction: "sac" }]);
    t.pages[1].sections[0].html = "<section class=\"tn tn-achat\">écrit pour le premier</section>"; t.pages[1].sections[0].clientTexts = true;
    const products = Array.from({ length: 14 }, (_, i) => ({ handle: `produit-${i}`, title: `Produit ${i}` }));
    const next = S.applyStructure(t, [{ op: "product_pages", products }]);
    const fiches = next.pages.filter((p: any) => p.product);
    expect(fiches.length).toBe(S.MAX_PRODUCT_PAGES); // au-delà, la fiche commune
    expect(next.pages.map((p: any) => p.key).slice(0, 4)).toEqual(["home", "product", "product-produit-1", "product-produit-2"]); // rangées après la fiche commune, avant le reste
    expect(next.pages.at(-1)!.key).toBe("contact");
    expect(next.pages[1].product).toBe("produit-0");
    const second = next.pages[2];
    expect(second.sections.map((s: any) => [s.id, s.construction ?? null])).toEqual([["tn-achat", null], ["tn-de-pres", "sans-titre"], ["tn-mesures", "sac"]]);
    // Les textes écrits pour le premier produit ne sont jamais recopiés sur un autre.
    expect(second.sections.every((s: any) => !s.html && !s.clientTexts)).toBe(true);
    expect(new Set(next.pages.flatMap((p: any) => p.sections.map((s: any) => s.uid))).size).toBe(3 * (1 + S.MAX_PRODUCT_PAGES - 1));
    // Refaire l'opération n'ajoute rien.
    expect(S.applyStructure(next, [{ op: "product_pages", products }]).pages.length).toBe(next.pages.length);
    expect(() => S.applyStructure({ ...t, pages: [t.pages[0]] }, [{ op: "product_pages", products }])).toThrow(/aucune fiche produit/);
  });

  it("les prestations du client remplacent les lignes d'exemple ; ce qu'il n'a pas donné reste à compléter", () => {
    const html = '<section class="tn tn-prestations" data-tn-prestations><h2>Nos prestations</h2><ul class="tn-liste-p"><li><b>Exemple</b><span>Durée : [À compléter]</span><i>[À compléter : prix]</i></li></ul></section>';
    const out = N.withTenuePrestations(html, [{ name: "Coupe & brushing", duration: "45 min", price: "38 €" }, { name: "Couleur", duration: null, price: null }]);
    expect(out).toContain('<li><b>Coupe &amp; brushing</b><span>Durée : 45 min</span><i>38 €</i></li>');
    expect(out).toContain('<li><b>Couleur</b><span>Durée : <mark class="tn-manque">À compléter</mark></span><i><mark class="tn-manque">À compléter : prix</mark></i></li>');
    expect(out).not.toContain("Exemple");
    expect(N.withTenuePrestations(html, [])).toBe(html); // sans prestation connue : l'exemple, annoncé comme tel
    expect(N.withTenuePrestations("<section class=\"tn tn-autre\"><ul class=\"tn-liste-p\"><li>x</li></ul></section>", [{ name: "A", duration: null, price: null }])).toContain("<li>x</li>");
  });

  it("par les outils de SINA : une fiche par produit, les cartes mènent à leur fiche, le menu suit, la rupture se dit", async () => {
    const user = await account();
    const cid = threadFor(user, null), ctx: any = { user, conversationId: cid, runId: `run-${Date.now()}`, projectId: null, attachment: () => null };
    await call("start.answer", ctx, { answers: [{ field: "business", value: "products" }, { field: "offer", value: "Des fauteuils et leurs accessoires." }] });
    await call("start.answer", ctx, { answers: [
      { field: "existing", value: "Rien." }, { field: "audience", value: "Adultes." }, { field: "image", value: "Calme." }, { field: "setup", value: "3 produits" }, { field: "market", value: "France." },
      { field: "price", value: "à définir" }, { field: "difference", value: "Bien fait." }, { field: "taste", status: "none" }, { field: "photos", value: "Oui." }, { field: "language", value: "Français seulement" }, { field: "contact", status: "later" }, { field: "platform", value: "shopify" },
    ] });
    await call("start.confirm", ctx, {});
    const pid = one<any>("SELECT project_id FROM agent_conversations WHERE id=?", cid).project_id as string;
    saveBrand(pid, F.FAUTEUIL_BRAND as any);
    const names = [["Fauteuil Alcôve terracotta", "Fauteuils"], ["Repose-pieds Alcôve", "Accessoires"], ["Coussin Alcôve", "Accessoires"]] as const;
    const photos: string[] = [];
    for (const [i, [title, family]] of names.entries()) {
      const a = await saveAsset({ projectId: pid, userId: user.id, data: await F.photo(F.PRODUCT_PHOTOS[i]), name: `p${i}.jpg`, mime: "image/jpeg", role: "original", origin: "upload" });
      photos.push(a.id);
      createProduct(pid, { title, categories: [family], images: [{ assetId: a.id }], ...(i === 1 ? { price: 8900 } : {}) } as any);
    }
    await call("theme.family", ctx, { family: "classique" });
    await call("theme.ambiance", ctx, { ambiance: "clair" });
    // Un site déjà monté (structure seulement) : accueil, boutique, fiche commune et les pages obligatoires.
    const page = (key: string, label: string, sections: [string, string?][]) => [{ op: "page", key, label } as const, ...sections.map(([section, construction]) => ({ op: "add", page: key, section, ...(construction ? { construction } : {}) }) as const)];
    let t: any = { version: 1, family: "classique", style: "classique", header: null, footer: null, search: null, pages: [], rev: 0, at: Date.now() };
    t = S.applyStructure(t, [
      ...page("home", "Accueil", [["tn-ouverture", "dans-la-photo"], ["tn-de-pres", "sans-titre"], ["tn-produits"], ["tn-atouts"], ["tn-emotion"], ["tn-places"], ["tn-questions"], ["tn-final"]]),
      ...page("shop", "La boutique", [["tn-produits"]]),
      ...page("product", "Fiche produit", [["tn-achat"], ["tn-description"], ["tn-de-pres", "avec-titre"], ["tn-emotion"], ["tn-places"], ["tn-mesures", "fauteuil"], ["tn-questions"], ["tn-final"]]),
      ...page("cart", "Panier", [["tn-panier"]]), ...page("compte", "Mon compte", [["tn-compte"]]), ...page("about", "Notre histoire", [["tn-histoire"]]),
      ...page("contact", "Contact", [["tn-contact"]]), ...page("aide", "Aide", [["tn-questions"]]), ...page("legal", "Informations légales", [["tn-legal"]]), ...page("404", "Page introuvable", [["tn-404"]]),
      { op: "shell", slot: "header", section: "tn-entete" }, { op: "shell", slot: "footer", section: "tn-pied" }, { op: "tenue", tenue: { ...F.FAUTEUIL_TENUE } },
    ]);
    S.saveCustomTheme(pid, t, { history: false });

    // 1) Une fiche par produit.
    const r = await call("custom.products", ctx, {});
    expect(r.ok, r.summary).toBe(true);
    expect(r.data.fichesAjoutees).toEqual(["Repose-pieds Alcôve", "Coussin Alcôve"]);
    expect(r.data.sectionsAEcrire).toBe(16);
    t = S.loadCustomTheme(pid)!;
    const handles = listProducts(pid).map((x: any) => x.handle);
    expect(t.pages.filter((p: any) => p.product).map((p: any) => [p.key, p.product])).toEqual([["product", handles[0]], [`product-${handles[1]}`, handles[1]], [`product-${handles[2]}`, handles[2]]]);
    expect((await call("custom.products", ctx, {})).summary).toMatch(/déjà sa fiche/);

    // 2) Le rendu : chaque carte mène à SA fiche ; chaque fiche montre SES photos et SON prix.
    let html = renderCustomTheme(loadProject(pid), t, { embed: true });
    const cards = [...html.matchAll(/<a class="tn-carte-p[^"]*"[^>]*data-go="([^"]+)"><div class="tn-ph" style="background-image:url\(\/api\/files\/([\w-]+)\)"><\/div><b>([^<]+)<\/b>/g)].slice(0, 3).map((m) => [m[1], m[2], m[3]]);
    expect(cards).toEqual([["product", photos[0], names[0][0]], [`product-${handles[1]}`, photos[1], names[1][0]], [`product-${handles[2]}`, photos[2], names[2][0]]]);
    const fiche = (key: string) => new RegExp(`<main class="tb-pg" data-pg="${key}"[^]*?</main>`).exec(html)![0];
    expect(fiche(`product-${handles[1]}`)).toContain(`<div class="tn-grande tn-ph" style="background-image:url(/api/files/${photos[1]})">`);
    expect(fiche(`product-${handles[1]}`)).toContain('<div class="tn-prix">89 €</div>');
    expect(fiche("product")).toContain(`<div class="tn-grande tn-ph" style="background-image:url(/api/files/${photos[0]})">`);
    expect(fiche("product")).toContain('<div class="tn-prix">Prix : <mark class="tn-manque">À compléter</mark></div>');

    // 3) Le menu, calculé : deux familles, donc un sous-menu ; le client le corrige ; un lien mort est retiré et dit.
    const m = await call("custom.menu", ctx, {});
    expect(m.ok, m.summary).toBe(true);
    expect(m.data.menu[0]).toEqual({ label: "La boutique", to: "shop", children: [{ label: "Tout voir", to: "shop" }, { label: "Fauteuils", to: "shop:Fauteuils" }, { label: "Accessoires", to: "shop:Accessoires" }] });
    html = renderCustomTheme(loadProject(pid), S.loadCustomTheme(pid)!, { embed: true });
    expect(html).toMatch(/<details class="tn-sous"><summary>La boutique<\/summary><div class="tn-sous-in">[^]*data-go="shop:Accessoires">Accessoires<\/a><\/div><\/details><a href="#" onclick="return false" data-go="about">Notre histoire<\/a>/);
    // Captures à la demande (TENUE_OUT=<dossier>) : le menu ouvert, sur téléphone et sur ordinateur, et la fiche du second produit.
    if (process.env.TENUE_OUT) {
      const fs = await import("node:fs");
      const { shootPages } = await import("@/lib/syna-agent/custom-theme/shots");
      const open = html.replace('<details class="tn-menu">', '<details class="tn-menu" open>').replace(/<details class="tn-sous"/g, '<details open class="tn-sous"');
      for (const view of ["téléphone", "ordinateur"] as const) for (const s of (await shootPages(open, ["home", `product-${handles[1]}`], { view, maxHeight: 1400 })) ?? []) fs.writeFileSync(`${process.env.TENUE_OUT}/liaison-${s.key}-${view === "téléphone" ? "tel" : "ordi"}.jpg`, s.data);
    }
    const fixed = await call("custom.menu", ctx, { menu: [{ label: "Les fauteuils", to: "shop" }, { label: "Le journal", to: "journal" }, { label: "Nous écrire", to: "contact" }] });
    expect(fixed.ok).toBe(true);
    expect(fixed.data.retires).toEqual(["Le journal"]);
    expect(S.loadCustomTheme(pid)!.menu).toEqual([{ label: "Les fauteuils", to: "shop" }, { label: "Nous écrire", to: "contact" }]);
    expect((await call("custom.menu", ctx, { remove: true })).ok).toBe(true);
    expect(S.loadCustomTheme(pid)!.menu).toBeUndefined();

    // 4) Rupture de stock : dite sur la carte et sur la fiche, le bouton ne commande plus, aucun délai inventé.
    const second = listProducts(pid)[1];
    run("UPDATE studio_variants SET data_json=json_set(data_json,'$.stock',0,'$.stockPolicy','deny') WHERE product_id=?", second.id);
    expect(listProducts(pid)[1].variants.length).toBeGreaterThan(0);
    html = renderCustomTheme(loadProject(pid), S.loadCustomTheme(pid)!, { embed: true });
    expect(html).toMatch(new RegExp(`<a class="tn-carte-p tn-epuise"[^>]*data-go="product-${handles[1]}">[^]*?<span>Épuisé</span>`));
    expect(fiche2(html, `product-${handles[1]}`)).toContain('<div class="tn-rupture">Épuisé pour l\'instant. Retour en stock : <mark class="tn-manque">À compléter</mark></div>');
    expect(fiche2(html, `product-${handles[1]}`)).toContain('<a class="tn-bt tn-off" aria-disabled="true"');
    expect(fiche2(html, "product")).not.toContain("tn-rupture");
  }, 240_000);
});

const fiche2 = (html: string, key: string) => new RegExp(`<main class="tb-pg" data-pg="${key}"[^]*?</main>`).exec(html)![0];
