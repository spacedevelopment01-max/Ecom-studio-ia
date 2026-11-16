/**
 * Chantier « plateformes » : essai RÉEL de l'achat d'un site monté par SINA sur une boutique locale
 * (WordPress + WooCommerce, ou PrestaShop), avec un vrai navigateur. Aucune IA, aucun paiement.
 *
 *   node scripts/plateformes-essai.cjs <woocommerce|prestashop> <adresse de la boutique> <dossier des captures>
 *
 * La boutique doit avoir reçu l'export du site d'essai (tests/plateformes-fixtures.ts ; archives écrites par
 * PLATEFORMES_OUT=<dossier> npx vitest run tests/theme-unique-plateformes.test.ts), son catalogue importé et publié.
 * Ce que le script fait, comme un client sur son téléphone :
 *   1. ouvre la fiche produit : prix, versions et stock doivent venir de la boutique ;
 *   2. choisit le pack de 3 avec trois versions différentes, ajoute au panier ;
 *   3. LIT LE PANIER DE LA PLATEFORME (pas celui du thème) : lignes, quantités, cadeau, total remisé ;
 *   4. retire un article : le cadeau doit partir, la remise redescendre au palier du lot ;
 *   5. vérifie la barre d'achat qui reste visible, « plus que N » avec le vrai stock, le refus au-delà du stock.
 * Il rend un compte rendu JSON (résultats.json) et s'arrête en erreur si un contrôle échoue.
 *
 * Avec « sans-remises » en quatrième argument, après avoir coupé ou retiré les remises dans la boutique : la boutique
 * doit le dire, la pièce des packs ne doit plus s'afficher, et trois articles doivent être au plein prix, sans cadeau.
 */
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const [plateforme, base, dossier, mode] = process.argv.slice(2);
if (!["woocommerce", "prestashop"].includes(plateforme) || !base || !dossier) { console.error("usage : node scripts/plateformes-essai.cjs <woocommerce|prestashop> <adresse> <dossier>"); process.exit(2); }
fs.mkdirSync(dossier, { recursive: true });
const racine = base.replace(/\/+$/, "");
const FICHE = plateforme === "woocommerce" ? `${racine}/product/tee-essai/` : `${racine}/products/tee-essai`;
const ETAT = plateforme === "woocommerce" ? `${racine}/?rest_route=/es/v1/offre` : `${racine}/index.php?fc=module&module=esstudio&controller=offre`;
const controles = [];
const note = (nom, ok, detail) => { controles.push({ nom, ok: !!ok, detail }); console.log(`${ok ? "OK  " : "ÉCHEC"} ${nom}${detail !== undefined ? " — " + (typeof detail === "string" ? detail : JSON.stringify(detail)) : ""}`); };
const capture = (page, nom, o = {}) => page.screenshot({ path: path.join(dossier, `${plateforme}-${nom}.png`), ...o });

/** Le panier de la PLATEFORME, lu sans passer par l'adaptateur du Studio. */
async function panierPlateforme(page) {
  if (plateforme === "woocommerce") {
    // L'API de la boutique WooCommerce, appelée directement.
    return page.evaluate(async () => {
      const c = await (await fetch(window.tnBoutiqueConfig.api + "cart", { credentials: "same-origin", headers: { Accept: "application/json" } })).json();
      return { source: "WooCommerce Store API /cart", nombre: c.items_count, total: Number(c.totals.total_items) + Number(c.totals.total_items_tax) - Number(c.totals.total_discount) - Number(c.totals.total_discount_tax),
        lignes: c.items.map((i) => ({ id: String(i.id), nom: i.name, versions: (i.variation || []).map((v) => v.value).join(" / "), quantite: i.quantity, unitaire: Number(i.prices.price), ligne: Number(i.totals.line_total) + Number(i.totals.line_total_tax), cadeau: !!(i.extensions && i.extensions.es && i.extensions.es.cadeau) })) };
    });
  }
  // PrestaShop : la page panier native, lue dans son HTML (lignes, prix, total).
  const p = await page.context().newPage();
  await p.goto(`${racine}/index.php?controller=cart&action=show`, { waitUntil: "networkidle" });
  const out = await p.evaluate(() => {
    const cents = (t) => { const m = String(t || "").replace(/[\s  ]/g, "").match(/(\d+)(?:[.,](\d{1,2}))?/); return m ? Number(m[1]) * 100 + Number(((m[2] || "0") + "0").slice(0, 2)) : null; };
    const lignes = [...document.querySelectorAll(".cart-item")].map((li) => {
      const t = (s) => { const e = li.querySelector(s); return e ? e.textContent.replace(/\s+/g, " ").trim() : ""; };
      const q = li.querySelector("input.js-cart-line-product-quantity");
      const total = t(".product-price strong, .product-price");
      const cadeau = !!li.querySelector(".gift, .gift-quantity") || /offert|gift|cadeau/i.test(total);
      return { nom: t(".product-line-info a.label, .product-line-info .label"), versions: [...li.querySelectorAll(".product-line-info .value")].map((e) => e.textContent.trim()).filter((x) => !/€/.test(x)).join(" / "), quantite: q ? Number(q.value) : Number((t(".gift-quantity") || "1").replace(/\D/g, "")) || 1, ligne: cadeau ? 0 : cents(total), cadeau, brut: total };
    });
    const tot = document.querySelector(".cart-summary-totals .cart-total .value, .cart-total .value");
    const remise = document.querySelector(".cart-summary-line.cart-discount .value, #cart-subtotal-discount .value");
    return { source: "PrestaShop, page panier native", lignes, totalAffiche: tot ? tot.textContent.trim() : null, total: tot ? cents(tot.textContent) : null, remise: remise ? remise.textContent.trim() : null, nombre: lignes.reduce((n, l) => n + l.quantite, 0) };
  });
  await p.close();
  return out;
}

/** Remises coupées ou retirées dans la boutique : rien ne doit s'afficher que le panier ne tient pas. */
async function sansRemises() {
  const etat = await (await fetch(ETAT)).json();
  note("la boutique dit que ses remises ne sont PAS en place", etat.actif === false && etat.manque.length > 0, etat);
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: "fr-FR" })).newPage();
  await page.goto(FICHE, { waitUntil: "networkidle" });
  await capture(page, "6-sans-remises-fiche", { fullPage: true });
  const vu = await page.evaluate(() => ({ packs: document.querySelectorAll("[data-tn-packs], [data-tn-lots]").length, prix: (document.querySelector(".tn-achat .tn-prix") || {}).textContent, achat: !!document.querySelector(".tn-achat select[name=id]"), offre: window.tnBoutiqueConfig.offre, ids: [...document.querySelectorAll(".tn-achat select[name=id] option")].map((o) => o.value) }));
  note("sans remises : ni packs ni prix de lot sur la fiche ; le bloc d'achat reste, au vrai prix", vu.packs === 0 && vu.achat && /29/.test(vu.prix || "") && vu.offre === null, { packs: vu.packs, prix: vu.prix, offre: vu.offre });
  await page.evaluate((ids) => window.tnBoutique.ajouter([{ id: ids[0], quantite: 1 }, { id: ids[1], quantite: 1 }, { id: ids[5], quantite: 1 }]), vu.ids);
  const p = await panierPlateforme(page);
  note("sans remises : trois articles au plein prix (87 €), aucun cadeau", p.total === 8700 && p.lignes.filter((l) => l.cadeau).length === 0 && p.lignes.length === 3, p);
  await page.goto(await page.evaluate(() => window.tnBoutiqueConfig.panier), { waitUntil: "networkidle" });
  await capture(page, "7-sans-remises-panier", { fullPage: true });
  await browser.close();
  fs.writeFileSync(path.join(dossier, `${plateforme}-sans-remises-resultats.json`), JSON.stringify({ plateforme, base: racine, date: new Date().toISOString(), controles }, null, 1));
  const rates = controles.filter((c) => !c.ok);
  console.log(`\n${controles.length - rates.length} contrôle(s) réussi(s) sur ${controles.length}.`);
  process.exit(rates.length ? 1 : 0);
}

(async () => {
  if (mode === "sans-remises") return sansRemises();
  const etat0 = await (await fetch(ETAT)).json();
  note("la boutique dit ses remises en place", etat0.actif === true, etat0);

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: "fr-FR" });
  const page = await ctx.newPage();
  const erreurs = [];
  page.on("pageerror", (e) => erreurs.push(String(e.message || e)));
  page.on("console", (m) => { if (m.type() === "error") erreurs.push(m.text()); });

  // ---- 1. la fiche produit
  await page.goto(FICHE, { waitUntil: "networkidle" });
  await capture(page, "1-fiche", { fullPage: true });
  const fiche = await page.evaluate(() => {
    const t = (s) => { const e = document.querySelector(s); return e ? e.textContent.replace(/\s+/g, " ").trim() : null; };
    const table = document.querySelector("script[data-tn-versions]");
    return {
      prix: t(".tn-achat .tn-prix"), versions: [...document.querySelectorAll(".tn-achat select[name=id] option")].map((o) => ({ id: o.value, texte: o.textContent.trim(), grise: o.disabled })),
      table: table ? JSON.parse(table.textContent) : null, packs: [...document.querySelectorAll("[data-tn-pack]")].map((p) => ({ quantite: p.getAttribute("data-tn-quantite"), prix: p.getAttribute("data-tn-prix"), cadeau: p.getAttribute("data-tn-cadeau"), etiquette: (p.querySelector(".tn-pack-etiquette") || {}).textContent || null, texte: p.querySelector("label").textContent.replace(/\s+/g, " ").trim() })),
      contrat: !!(window.tnBoutique && window.tnAchat && window.tnAchat.pret), feuille: getComputedStyle(document.querySelector(".tn-achat .tn-bt")).backgroundColor,
    };
  });
  note("fiche : prix lu dans la boutique", /29/.test(fiche.prix || ""), fiche.prix);
  note("fiche : six versions avec leur identifiant de la plateforme", fiche.versions.length === 6 && fiche.versions.every((v) => /^\d+(-\d+)?$/.test(v.id)), fiche.versions.map((v) => `${v.id}=${v.texte}`));
  note("fiche : le vrai stock de chaque version (Sable / L : 3)", fiche.table && fiche.table.some((v) => v.options.join("/") === "Sable/L" && v.stock === 3), fiche.table && fiche.table.map((v) => `${v.options.join("/")}:${v.stock}`));
  note("fiche : trois packs, prix calculés sur le vrai prix, cadeau par son identifiant, « le plus populaire »", fiche.packs.length === 3 && fiche.packs[2].prix === "6960" && !!fiche.packs[2].cadeau && /populaire/i.test(fiche.packs[2].etiquette || ""), fiche.packs);
  note("fiche : le script commun et l'adaptateur de la plateforme sont chargés", fiche.contrat, { feuilleBouton: fiche.feuille });

  // ---- 5a. « plus que N » : seulement avec le vrai stock (Sable / L en a 3, le seuil est 5 ; Noir / S en a 20)
  const stock = async (id) => page.evaluate((id) => { const s = document.querySelector(".tn-achat select[name=id]"); s.value = id; s.dispatchEvent(new Event("change", { bubbles: true })); const e = document.querySelector("[data-tn-stock]"); return e ? { cache: e.hidden, texte: e.textContent.trim() } : null; }, id);
  const idDe = (c, t) => fiche.table.find((v) => v.options[0] === c && v.options[1] === t).id;
  const peu = await stock(idDe("Sable", "L")), beaucoup = await stock(idDe("Noir", "S"));
  note("stock : « plus que 3 » pour la version qui n'en a que 3", peu && !peu.cache && /3/.test(peu.texte), peu);
  note("stock : rien pour une version bien fournie", beaucoup && beaucoup.cache, beaucoup);

  // ---- 5b. la barre d'achat reste visible quand le bouton du bloc sort de l'écran
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.6));
  await page.waitForTimeout(600);
  const barre = await page.evaluate(() => { const b = document.querySelector(".tn-achat > .tn-barre"); if (!b) return null; const r = b.getBoundingClientRect(), s = getComputedStyle(b); return { cache: b.hidden || s.display === "none", position: s.position, haut: Math.round(r.top), bas: Math.round(r.bottom), ecran: window.innerHeight, texte: b.textContent.replace(/\s+/g, " ").trim() }; });
  note("barre d'achat : visible, collée en bas de l'écran pendant le défilement", barre && !barre.cache && barre.position === "fixed" && barre.bas <= barre.ecran + 1 && barre.haut > barre.ecran / 2, barre);
  await capture(page, "2-barre-visible");

  // ---- 2. le pack de 3, trois versions différentes
  const choix = [["Noir", "S"], ["Noir", "M"], ["Sable", "L"]];
  await page.evaluate(() => { const p = [...document.querySelectorAll("[data-tn-pack]")].find((x) => x.getAttribute("data-tn-quantite") === "3"); const r = p.querySelector("input[type=radio]"); r.checked = true; r.dispatchEvent(new Event("change", { bubbles: true })); p.scrollIntoView({ block: "center" }); });
  await page.waitForTimeout(300);
  const lignesPack = await page.evaluate((choix) => {
    const p = [...document.querySelectorAll("[data-tn-pack]")].find((x) => x.getAttribute("data-tn-quantite") === "3");
    const lignes = [...p.querySelectorAll("[data-tn-article]")];
    lignes.forEach((l, i) => [...l.querySelectorAll("select")].forEach((s, j) => { s.value = choix[i][j]; s.dispatchEvent(new Event("change", { bubbles: true })); }));
    return lignes.map((l) => [...l.querySelectorAll("select")].map((s) => s.value).join(" / "));
  }, choix);
  note("pack : une ligne par article, chacun avec SA couleur et SA taille", lignesPack.length === 3 && lignesPack.join(" | ") === "Noir / S | Noir / M | Sable / L", lignesPack);
  await capture(page, "3-pack-choisi");
  await Promise.all([page.waitForURL((u) => u.toString() !== page.url() && !/tee-essai/.test(u.toString()), { timeout: 45000 }).catch(() => null), page.evaluate(() => document.querySelector("[data-tn-packs] [data-tn-acheter]").click())]);
  await page.waitForLoadState("networkidle");
  const erreurAchat = await page.evaluate(() => { const e = document.querySelector("[data-tn-erreur]:not([hidden])"); return e ? e.textContent.trim() : null; });
  note("pack : ajouté sans message d'erreur, le client arrive sur le panier de la plateforme", !erreurAchat && !/tee-essai/.test(page.url()), { adresse: page.url(), erreurAchat });
  await capture(page, "4-panier-pack", { fullPage: true });

  // ---- 3. le panier de la plateforme
  const attendu = { payantes: 3, unitaire: 2320, total: 6960 };
  const p1 = await panierPlateforme(page);
  const payantes1 = p1.lignes.filter((l) => !l.cadeau), cadeaux1 = p1.lignes.filter((l) => l.cadeau);
  note("panier : trois lignes payantes, une par version choisie, quantité 1", payantes1.length === 3 && payantes1.every((l) => l.quantite === 1) && new Set(payantes1.map((l) => l.versions)).size === 3, payantes1.map((l) => `${l.nom} [${l.versions}] ×${l.quantite} = ${l.ligne}`));
  note("panier : chaque article du pack à 23,20 € (29 € − 20 %)", payantes1.every((l) => l.ligne === attendu.unitaire), payantes1.map((l) => l.ligne));
  note("panier : le cadeau est là, une fois, à 0 €", cadeaux1.length === 1 && cadeaux1[0].quantite === 1 && cadeaux1[0].ligne === 0 && /chaussettes/i.test(cadeaux1[0].nom), cadeaux1);
  note("panier : total remisé 69,60 € (au lieu de 87 € + 9 €)", p1.total === attendu.total, { total: p1.total, source: p1.source, affiche: p1.totalAffiche });
  const viaContrat = await page.evaluate(() => window.tnBoutique.panier());
  note("contrat : tnBoutique.panier() rend le même panier que la plateforme", viaContrat.total === p1.total && viaContrat.nombre === 4 && viaContrat.lignes.filter((l) => l.cadeau).length === 1, viaContrat);

  // ---- 4. un article retiré : le cadeau part, la remise redescend au lot (2 articles, −10 %)
  if (plateforme === "woocommerce") {
    await page.evaluate(async () => { const api = window.tnBoutiqueConfig.api; const r0 = await fetch(api + "cart", { credentials: "same-origin" }); const c = await r0.json(); const nonce = r0.headers.get("Nonce"); const l = c.items.find((i) => !(i.extensions.es && i.extensions.es.cadeau)); await fetch(api + "cart/remove-item", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", Nonce: nonce }, body: JSON.stringify({ key: l.key }) }); });
  } else {
    const lien = await page.evaluate(() => { const a = [...document.querySelectorAll(".cart-item a.remove-from-cart")].find((x) => !x.closest(".cart-item").querySelector(".gift, .gift-quantity")); return a ? a.href : null; });
    if (lien) await page.goto(lien, { waitUntil: "networkidle" });
  }
  await page.goto(await page.evaluate(() => window.tnBoutiqueConfig.panier), { waitUntil: "networkidle" });
  await capture(page, "5-panier-apres-retrait", { fullPage: true });
  const p2 = await panierPlateforme(page);
  note("après retrait : deux articles au prix du lot (26,10 €), plus de cadeau, total 52,20 €", p2.lignes.filter((l) => l.cadeau).length === 0 && p2.lignes.length === 2 && p2.lignes.every((l) => l.ligne === 2610) && p2.total === 5220, p2);

  const erreursAvantRefus = erreurs.slice();
  // ---- 5c. au-delà du stock : la boutique refuse, le message arrive au client (Sable / L : 3 en stock)
  await page.goto(FICHE, { waitUntil: "networkidle" });
  const refus = await page.evaluate(async (id) => { try { await window.tnBoutique.ajouter([{ id, quantite: 9 }]); return null; } catch (e) { return e.message; } }, idDe("Sable", "L"));
  note("stock : 9 exemplaires d'une version qui en a 3 → refus de la boutique, dit au client", !!refus, refus);
  const p3 = await panierPlateforme(page);
  note("stock : le panier n'a pas bougé après le refus", p3.total === p2.total, { total: p3.total });

  // (Le refus de la boutique à l'étape précédente est une réponse d'erreur voulue : il n'est pas compté.)
  note("aucune erreur de script sur les pages visitées", erreursAvantRefus.length === 0, erreursAvantRefus.slice(0, 6));
  await browser.close();
  fs.writeFileSync(path.join(dossier, `${plateforme}-resultats.json`), JSON.stringify({ plateforme, base: racine, date: new Date().toISOString(), controles }, null, 1));
  const rates = controles.filter((c) => !c.ok);
  console.log(`\n${controles.length - rates.length} contrôle(s) réussi(s) sur ${controles.length}.`);
  process.exit(rates.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(3); });
