// Recette #232 : visiteur ANONYME sur un site publié (aucun cookie du studio), ordinateur puis téléphone. Pages, liens,
// fichiers, erreurs console, absence de tout élément de l'aperçu, envoi réel du formulaire de contact.
// node r2-visiteur.mjs <clé du site> <hôte> <prefixe> [contact=1]
import { browser, context, save, shot, watch } from "./lib.mjs";
const [, , key, host, pre, withContact] = process.argv;
const SITE = `https://${host}:3943`;
const b = await browser();
const result = { site: SITE, ordinateur: {}, telephone: {} };
for (const kind of ["ordinateur", "telephone"]) {
  const ctx = await context(b, kind);
  const page = await ctx.newPage();
  const log = [];
  watch(page, log);
  const r = await page.goto(SITE + "/", { waitUntil: "networkidle" });
  const res = result[kind];
  res.accueil = r.status();
  res.cookies = (await ctx.cookies()).map((c) => c.name);
  const links = await page.$$eval("a[href^='/']", (as) => [...new Set(as.map((a) => a.getAttribute("href").split("#")[0].split("?")[0]))].filter((h) => !h.startsWith("/assets")));
  res.liens = links;
  await shot(page, `${pre}-${kind}-accueil`);
  await shot(page, `${pre}-${kind}-accueil-page`, true);
  res.pages = {};
  for (const l of links.slice(0, 14)) {
    const rr = await page.goto(SITE + l, { waitUntil: "networkidle" });
    const text = await page.locator("body").innerText();
    res.pages[l] = { status: rr.status(), apercu: /Aperçu du studio|aperçu ·|demandes de test|Article d.exemple/i.test(text), aCompleter: /\[(À|A) compléter/.test(text), debordement: await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1) };
    if (/contact|devis|prestations|mentions/.test(l)) await shot(page, `${pre}-${kind}-${l.replace(/\W+/g, "-").replace(/^-|-$/g, "")}`);
  }
  if (withContact === "1" && kind === "ordinateur") {
    const contactPath = links.find((l) => /contact/.test(l)) ?? "/pages/contact";
    await page.goto(SITE + contactPath, { waitUntil: "networkidle" });
    const form = page.locator('form[action="/contact#contact_form"]').first();
    await form.scrollIntoViewIfNeeded();
    for (const el of await form.locator("input:visible, textarea:visible, select:visible").all()) {
      const type = await el.getAttribute("type"), name = (await el.getAttribute("name")) ?? "";
      // Champ piège invisible pour un humain (hors écran, aria-hidden, hors tabulation) : jamais rempli par un visiteur.
      if (type === "hidden" || type === "submit" || type === "file" || name === "contact[site_web]" || (await el.evaluate((e) => !!e.closest("[aria-hidden=true]")))) continue;
      if (type === "checkbox" || type === "radio") { if (await el.isVisible()) await el.check().catch(() => {}); continue; }
      if ((await el.evaluate((e) => e.tagName)) === "SELECT") { const v = await el.locator("option").nth(1).getAttribute("value"); if (v) await el.selectOption(v); continue; }
      await el.fill(type === "email" || /email/.test(name) ? "visiteur.fictif@example.test" : type === "tel" || /phone/.test(name) ? "0600000000" : /body|message/.test(name) ? "Bonjour, je souhaite un devis pour accorder un piano droit (demande fictive de recette)." : "Visiteur fictif");
    }
    await shot(page, `${pre}-${kind}-contact-rempli`);
    const sent = page.waitForResponse((x) => x.url().endsWith("/contact") && x.request().method() === "POST", { timeout: 30000 });
    await form.locator('button[type="submit"], input[type="submit"]').first().click();
    const resp = await sent;
    res.envoi = { status: resp.status(), redirection: resp.headers()["location"] ?? null, body: resp.status() >= 300 && resp.status() < 400 ? "" : (await resp.text()).slice(0, 300) };
    await page.waitForTimeout(1500);
    res.pageApresEnvoi = page.url();
    res.messageAffiche = await page.locator(".ed-form__done, [role=status], main h1, main h2").allInnerTexts();
    await shot(page, `${pre}-${kind}-contact-envoye`);
  }
  // Le studio n'est jamais servi sous le nom du site.
  res.studioSousLeSite = {};
  for (const p of ["/studio", "/admin", "/api/version", "/connexion", "/preview/x/v/current/"]) res.studioSousLeSite[p] = (await page.goto(SITE + p)).status();
  res.robots = await (await page.goto(SITE + "/robots.txt")).text();
  res.erreurs = log.filter((l) => !/\/(studio|admin|api\/version|connexion|preview)/.test(l));
  await ctx.close();
}
save(`${pre}-visiteur`, result);
console.log(JSON.stringify(result, null, 1).slice(0, 5000));
await b.close();
