/**
 * Le Coven des Charmes — contrôle des interactions sur l'aperçu exporté (fichiers plats, aucun réseau).
 *
 *   node clients/le-coven-des-charmes/scripts/interactions.cjs <dossier de l'aperçu>
 *
 * Menu du téléphone (ouverture, Échap, focus), liens actifs, galerie, taille obligatoire si des tailles existent,
 * quantité, ajout au panier (simulation), panier (taille, quantité, retrait, vide), commande (erreurs, refus simulé,
 * pas de double envoi, confirmation sans tirage ni expédition annoncés), compte (aucun compte connecté, onglets),
 * contact (erreurs, envoi simulé), FAQ (accordéons, rubriques), informations (onglets, cookies), bandeau de cookies
 * (aucun choix facultatif avant accord), absence de défilement horizontal à 360, 390, 430, 768 et 1440 px.
 */
const path = require("path");
let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require("/opt/node22/lib/node_modules/playwright")); }

const dir = path.resolve(process.argv[2] || "");
const url = (f) => "file://" + path.join(dir, f);
const results = [];
const check = (name, ok, detail = "") => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? "OK " : "ÉCHEC"} ${name}${detail ? " — " + detail : ""}`); };

(async () => {
  const fs = require("fs");
  const exe = process.env.CHROMIUM || (fs.existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined);
  const browser = await chromium.launch(exe ? { executablePath: exe } : {});
  const ctx = async (w, h = 900) => { const c = await browser.newContext({ viewport: { width: w, height: h } }); return c; };
  const errors = [];
  const open = async (c, file) => { const p = await c.newPage(); p.on("pageerror", (e) => errors.push(file + ": " + e.message)); await p.goto(url(file)); await p.waitForTimeout(250); return p; };

  // ---------------------------------------------------------------- cookies : aucun accord facultatif avant choix
  {
    const c = await ctx(1440); const p = await open(c, "index.html");
    check("Bandeau de cookies visible au premier passage", await p.isVisible("[data-cvn-cookies]"));
    check("Mesure d'audience désactivée par défaut", (await p.evaluate(() => localStorage.getItem("cvn-consent"))) === null);
    await p.click("[data-cvn-consent-custom]");
    check("Personnaliser ouvre les choix", await p.isVisible("[data-cvn-cookies-prefs]"));
    check("Case d'audience décochée par défaut", !(await p.isChecked("[data-cvn-cookies] [data-cvn-consent=audience]")));
    await p.click("[data-cvn-consent-custom]");
    const saved = JSON.parse(await p.evaluate(() => localStorage.getItem("cvn-consent")));
    check("Enregistrer garde le refus d'audience", saved && saved.audience === false);
    await p.reload(); await p.waitForTimeout(200);
    check("Bandeau absent après choix", !(await p.isVisible("[data-cvn-cookies]")));
    await c.close();
  }

  // ---------------------------------------------------------------- menu du téléphone et lien actif
  {
    const c = await ctx(390, 844); const p = await open(c, "page-le-tirage.html");
    await p.evaluate(() => localStorage.setItem("cvn-consent", JSON.stringify({ audience: false, at: 1 })));
    await p.reload(); await p.waitForTimeout(200);
    await p.click("[data-cvn-menu-open]");
    check("Menu du téléphone ouvert", await p.isVisible("[data-cvn-menu]"));
    check("Focus sur « Fermer »", await p.evaluate(() => document.activeElement && document.activeElement.hasAttribute("data-cvn-menu-close")));
    check("Lien actif dans le menu", (await p.locator(".cvn-menu__link.is-active").count()) >= 1);
    await p.keyboard.press("Escape");
    check("Échap ferme le menu", !(await p.isVisible("[data-cvn-menu]")));
    check("Burger à gauche, panier à droite", await p.evaluate(() => { const b = document.querySelector("[data-cvn-menu-open]").getBoundingClientRect(), k = document.querySelector("[data-cvn-cart-link]").getBoundingClientRect(); return b.left < 60 && k.right > 330; }));
    await c.close();
  }

  // ---------------------------------------------------------------- fiche, panier, commande, confirmation
  {
    const c = await ctx(1440); const p = await open(c, "produit.html");
    await p.evaluate(() => { localStorage.setItem("cvn-consent", JSON.stringify({ audience: false, at: 1 })); localStorage.removeItem("cvn-cart"); sessionStorage.removeItem("cvn-order"); });
    await p.reload(); await p.waitForTimeout(200);
    check("Prix non inventé (« — € Tarif à renseigner »)", (await p.textContent(".cvn-pinfo__price")).includes("Tarif à renseigner"));
    check("Aucun choix de charms sur la fiche", (await p.locator("select, input[type=radio]").evaluateAll((els) => els.filter((e) => /charm/i.test(e.name || "")).length)) === 0);
    const thumbs = await p.locator("[data-cvn-thumb]").count();
    if (thumbs > 1) { await p.locator("[data-cvn-thumb]").nth(1).click(); check("Galerie : la vignette change la photo", await p.evaluate(() => { const s = document.querySelectorAll("[data-cvn-slide]"); return s[0].hidden && !s[1].hidden; })); }
    await p.click("[data-cvn-qty-step='1']"); await p.click("[data-cvn-qty-step='1']");
    check("Quantité augmentée à 3", (await p.inputValue("#CvnProductForm input[name=quantity]")) === "3");
    await p.fill("#CvnProductForm input[name=quantity]", "99"); await p.dispatchEvent("#CvnProductForm input[name=quantity]", "change");
    check("Quantité plafonnée", Number(await p.inputValue("#CvnProductForm input[name=quantity]")) <= 10);
    await p.fill("#CvnProductForm input[name=quantity]", "2"); await p.dispatchEvent("#CvnProductForm input[name=quantity]", "change");
    await p.click("[data-cvn-add]"); await p.waitForTimeout(300);
    const cart = JSON.parse(await p.evaluate(() => localStorage.getItem("cvn-cart")));
    check("Ajout au panier (simulation) avec quantité et taille", cart && cart.items.length === 1 && cart.items[0].qty === 2 && cart.items[0].price === null, JSON.stringify(cart && cart.items[0]));
    check("Compteur du panier mis à jour", (await p.textContent("[data-cvn-cart-count]")).trim() === "2");
    // double clic : aucun doublon de ligne
    await p.click("[data-cvn-add]"); await p.waitForTimeout(300);
    const cart2 = JSON.parse(await p.evaluate(() => localStorage.getItem("cvn-cart")));
    check("Même taille : une seule ligne, quantité cumulée", cart2.items.length === 1 && cart2.items[0].qty === 4);

    const q = await open(c, "panier.html");
    check("Panier : une ligne affichée", (await q.locator("[data-cvn-line]").count()) === 1);
    check("Panier : total « — € » sans tarif", (await q.textContent("[data-cvn-total]")).includes("—"));
    check("Panier : livraison « calculée à l'étape suivante »", (await q.textContent(".cvn-cart__row--ship")).includes("étape suivante"));
    await q.click("[data-cvn-line-step='-1']"); await q.waitForTimeout(200);
    check("Panier : quantité diminuée", (await q.inputValue("[data-cvn-line-qty]")) === "3");
    await q.click("[data-cvn-line-remove]"); await q.waitForTimeout(200);
    check("Panier vide après retrait", await q.isVisible("[data-cvn-cart-empty]"));
    check("Compteur masqué quand le panier est vide", await q.evaluate(() => document.querySelector("[data-cvn-cart-count]").hidden));

    await p.click("[data-cvn-add]"); await p.waitForTimeout(300);
    const k = await open(c, "page-commande.html");
    check("Commande : bandeau de simulation", (await k.textContent(".cvn-demo-banner")).includes("aucun paiement"));
    check("Commande : récapitulatif repris du panier", (await k.locator("[data-cvn-sum-lines] .cvn-sum__line").count()) === 1);
    await k.click("[data-cvn-submit]"); await k.waitForTimeout(200);
    check("Commande : résumé des erreurs", await k.isVisible("[data-cvn-errors]"));
    check("Commande : erreurs à côté des champs", (await k.locator(".cvn-field.is-invalid").count()) >= 6);
    await k.fill("#CvnCoEmail", "cliente@example.invalid"); await k.fill("#CvnCoFirst", "Alix"); await k.fill("#CvnCoLast", "Test");
    await k.fill("#CvnCoAddress", "1 rue des Essais"); await k.fill("#CvnCoZip", "75001"); await k.fill("#CvnCoCity", "Paris");
    await k.check("input[name=cgv]"); await k.check("[data-cvn-simulate-refusal]");
    await k.click("[data-cvn-submit]"); await k.waitForTimeout(1200);
    check("Commande refusée (simulation) : message, panier gardé", (await k.textContent("[data-cvn-status]")).includes("pas pu être validée") && JSON.parse(await k.evaluate(() => localStorage.getItem("cvn-cart"))).items.length === 1);
    await k.uncheck("[data-cvn-simulate-refusal]");
    await k.click("[data-cvn-submit]");
    check("Pas de double envoi pendant la vérification", await k.evaluate(() => document.querySelector("[data-cvn-submit]").disabled));
    await k.waitForURL(/confirmation/, { timeout: 5000 }).catch(() => {});
    check("Redirection vers la confirmation", /confirmation/.test(k.url()));
    await k.waitForTimeout(300);
    check("Confirmation : saisie reprise (prénom, ville)", (await k.textContent("[data-cvn-confirm-who]")).includes("Alix") && (await k.textContent("[data-cvn-confirm-who]")).includes("Paris"));
    check("Confirmation : seule l'étape « commande enregistrée » est actuelle", (await k.locator(".cvn-state.is-current").count()) === 1 && (await k.locator(".cvn-state[data-cvn-state='1'].is-current").count()) === 1);
    check("Confirmation : tirage et expédition « à venir »", (await k.locator("[data-cvn-state-status]").allTextContents()).slice(1).every((t) => /venir/i.test(t)));
    check("Panier vidé après la commande simulée", JSON.parse(await k.evaluate(() => localStorage.getItem("cvn-cart"))).items.length === 0);
    await c.close();
  }

  // ---------------------------------------------------------------- compte, contact, FAQ, informations
  {
    const c = await ctx(390, 844); const p = await open(c, "page-compte.html");
    await p.evaluate(() => localStorage.setItem("cvn-consent", JSON.stringify({ audience: false, at: 1 }))); await p.reload(); await p.waitForTimeout(200);
    check("Compte : aucun compte connecté d'office", (await p.locator("text=Bonjour").count()) === 0 && await p.isVisible("#CvnLogin"));
    await p.click("#CvnTabRegister");
    check("Compte : onglet Inscription", await p.isVisible("#CvnRegister") && !(await p.isVisible("#CvnLogin")));
    await p.click("#CvnTabLogin");
    await p.click("#CvnLogin button[type=submit]"); await p.waitForTimeout(100);
    check("Compte : erreurs de connexion", (await p.locator("#CvnLogin .cvn-field.is-invalid").count()) === 2);
    await p.click("[data-cvn-pass]");
    check("Compte : afficher le mot de passe", (await p.getAttribute("#CvnLoginPass", "type")) === "text");
    await p.click("#CvnLogin [data-cvn-toggle]");
    check("Compte : mot de passe oublié", await p.isVisible("#CvnRecover"));
    await p.click("[data-cvn-needs-login] >> nth=0");
    check("Compte : commandes protégées par la connexion", (await p.textContent("[data-cvn-needs-status]")).includes("Connectez-vous"));
    await c.close();
  }
  {
    const c = await ctx(1440); const p = await open(c, "page-contact.html");
    await p.click("[data-cvn-submit]");
    check("Contact : champs obligatoires signalés", (await p.locator(".cvn-field.is-invalid").count()) === 5);
    await p.fill("#CvnCName", "Alix"); await p.fill("#CvnCEmail", "pas-un-email"); await p.selectOption("#CvnCSubject", { index: 1 }); await p.fill("#CvnCMessage", "Bonjour, une question sur le tirage."); await p.check("input[name='contact[consent]']");
    await p.click("[data-cvn-submit]");
    check("Contact : e-mail invalide refusé", (await p.locator(".cvn-field.is-invalid").count()) === 1);
    await p.fill("#CvnCEmail", "alix@example.invalid"); await p.click("[data-cvn-submit]"); await p.waitForTimeout(900);
    check("Contact : envoi simulé annoncé, rien d'envoyé", (await p.textContent("#CvnContactForm [data-cvn-status]")).includes("rien n'a été envoyé"));
    const f = await open(c, "page-faq.html");
    check("FAQ : première question ouverte", (await f.getAttribute(".cvn-faq [data-cvn-acc-btn] >> nth=0", "aria-expanded")) === "true");
    await f.click(".cvn-faq [data-cvn-acc-btn] >> nth=1");
    check("FAQ : une seule question ouverte à la fois", (await f.locator(".cvn-faq [data-cvn-acc-btn][aria-expanded=true]").count()) === 1);
    await f.click("[data-cvn-faq-cat='4']");
    check("FAQ : rubrique « Livraison & retours » ouvre sa question", await f.evaluate(() => { const g = document.querySelector("[data-cvn-faq-group='4'] [data-cvn-acc-btn]"); return g && g.getAttribute("aria-expanded") === "true"; }));
    const i = await open(c, "page-informations.html");
    await i.click("[role=tab][data-cvn-tab=cgv]");
    check("Informations : onglet CGV", await i.isVisible("text=Conditions générales de vente") );
    check("Informations : valeurs « À renseigner »", (await i.locator("dd:has-text('À renseigner')").count()) >= 3);
    await i.click("[data-cvn-prefs] [data-cvn-consent-all='true']");
    check("Informations : préférences enregistrées", JSON.parse(await i.evaluate(() => localStorage.getItem("cvn-consent"))).audience === true);
    const j = await c.newPage(); await j.goto(url("page-informations.html") + "#cookies"); await j.waitForTimeout(200);
    check("Informations : adresse directe #cookies", await j.evaluate(() => document.querySelector("[role=tab][data-cvn-tab=cookies]").getAttribute("aria-selected") === "true"));
    await c.close();
  }

  // ---------------------------------------------------------------- 404 et débordements
  {
    const c = await ctx(1440); const p = await open(c, "404.html");
    check("404 : « Vous vous êtes égaré dans le Coven. »", (await p.textContent("h1")).replace(/\s+/g, " ").includes("Vous vous êtes égaré dans le Coven."));
    await c.close();
    const files = ["index.html", "produit.html", "panier.html", "404.html", ...["le-tirage", "le-coven", "creations", "faq", "contact", "informations", "commande", "confirmation", "compte"].map((h) => `page-${h}.html`)];
    for (const w of [360, 390, 430, 768, 1024, 1440]) {
      const cc = await ctx(w, 800); const bad = [];
      for (const f of files) { const pg = await open(cc, f); const sw = await pg.evaluate(() => document.documentElement.scrollWidth); if (sw > w) bad.push(`${f} ${sw}`); await pg.close(); }
      check(`Aucun défilement horizontal à ${w} px`, !bad.length, bad.join(", "));
      await cc.close();
    }
  }
  check("Aucune erreur JavaScript", !errors.length, errors.slice(0, 3).join(" | "));
  await browser.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} contrôles réussis`);
  process.exit(failed ? 1 : 0);
})();
