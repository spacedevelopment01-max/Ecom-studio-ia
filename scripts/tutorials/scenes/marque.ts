import type { SceneCtx } from "../../build-tutorials";

/** Onglet Marque : les essais (signature, direction) restent locaux et sont annulés ; rien n'est enregistré ni lancé. */
export default async function ({ r, t, projectId, base }: SceneCtx) {
  const p = r.page;
  const main = p.locator("main");
  const card = (text: string) => main.getByText(text, { exact: true }).first().locator("xpath=ancestor::div[contains(@class,'rounded-3xl')][1]");
  const identity = card(t("Identité", "Identity"));
  const name = identity.getByLabel(t("Nom de marque", "Brand name"));
  // Toutes les attentes de chargement d'ouverture en une seule coupe au montage.
  await r.during((async () => {
    await name.waitFor({ state: "visible", timeout: 120_000 });
    await p.waitForLoadState("networkidle").catch(() => {});
    await p.waitForFunction(() => { const imgs = ([...document.querySelectorAll("main img")] as HTMLImageElement[]).filter((i) => i.getBoundingClientRect().top < innerHeight); return imgs.length > 0 && imgs.every((i) => i.complete && i.naturalWidth > 0); }, null, { timeout: 120_000 }).catch(() => {});
    // Planches de la charte préchargées : elles s'affichent aussitôt qu'on les feuillette.
    const book = await p.context().request.get(`${base}/api/projects/${projectId}/brand/book`).then((res) => res.json()).catch(() => null);
    const pages: string[] = book?.book?.pages ?? [];
    if (pages.length) await p.evaluate((urls) => Promise.all(urls.map((u) => new Promise((ok) => { const i = new Image(); i.onload = i.onerror = () => ok(null); i.src = u; }))), pages.slice(0, 4));
  })());

  await r.step(0, async () => {
    await r.spot(identity, 4);
    await r.wait(900);
    await r.spot(name.locator("xpath=.."), 6);
    await r.point(name);
    await r.wait(900);
    await r.spot(null);
  });
  await r.step(1, async () => {
    const tagline = identity.getByLabel(t("Signature", "Tagline"));
    const before = await tagline.inputValue();
    const chips = identity.getByText(t("Autres signatures :", "Other taglines:")).locator("xpath=..").getByRole("button");
    await r.spot(tagline.locator("xpath=.."), 6);
    if (await chips.count()) {
      await r.click(chips.first(), { settle: 900 });
      await r.point(tagline);
      await r.wait(600);
    } else await r.point(tagline);
    await r.spot(identity.getByRole("button", { name: t("Enregistrer", "Save"), exact: true }), 6);
    await r.point(identity.getByRole("button", { name: t("Enregistrer", "Save"), exact: true }));
    await r.wait(1000);
    await tagline.fill(before);
    await r.spot(null);
  });
  await r.step(2, async () => {
    const approve = identity.getByRole("button", { name: t("Valider", "Approve"), exact: true });
    await r.spot(approve.first(), 6);
    // Survol seulement : le clic enregistrerait la validation.
    await r.point(approve.first());
    await r.wait(900);
    await r.spot(approve.nth(1), 6);
    await r.point(approve.nth(1));
    await r.wait(700);
    await r.spot(null);
  });
  await r.step(3, async () => {
    await r.point(identity.getByLabel(t("Positionnement", "Positioning")));
    await r.wait(500);
    await r.point(identity.getByLabel(t("Voix", "Voice")));
    await r.wait(500);
    const palette = identity.locator("input[type=color]");
    await r.reveal(palette.first());
    await r.spot(palette.first().locator("xpath=ancestor::div[contains(@class,'grid-cols-5')][1]"), 8);
    await r.point(palette.nth(0));
    await r.wait(500);
    await r.point(palette.nth(2));
    await r.wait(700);
    await r.spot(null);
  });
  await r.step(4, async () => {
    const logo = card("Logo");
    await r.reveal(logo);
    await r.during(logo.evaluate((el) => new Promise((ok) => { const check = () => ([...el.querySelectorAll("img")] as HTMLImageElement[]).every((i) => i.complete) ? ok(null) : setTimeout(check, 200); check(); setTimeout(() => ok(null), 30_000); })));
    await r.spot(logo, 4);
    const pick = logo.getByRole("button", { name: t("Choisir", "Select"), exact: true });
    // Survol seulement : « Choisir » applique le logo et crée une nouvelle version de la boutique.
    if (await pick.count()) await r.point(pick.first());
    await r.wait(900);
    await r.point(logo.getByText(t("Déclinaisons", "Variations"), { exact: true }));
    await r.wait(900);
    await r.spot(null);
  });
  await r.step(5, async () => {
    const dir = card(t("Direction de la boutique", "Store direction"));
    const opts = dir.getByRole("button");
    await r.reveal(opts.first());
    await r.during(p.waitForFunction(() => [...document.querySelectorAll("main button[aria-pressed] img")].slice(0, 6).every((i) => (i as HTMLImageElement).complete), null, { timeout: 60_000 }).catch(() => {}));
    await r.spot(dir, 4);
    const n = await opts.count();
    let current = 0;
    for (let i = 0; i < n; i++) if ((await opts.nth(i).getAttribute("aria-pressed")) === "true") current = i;
    await r.click(opts.nth(current === 0 ? 1 : 0), { settle: 1200 });
    await r.click(opts.nth(current), { settle: 900 });
    await r.spot(null);
  });
  await r.step(6, async () => {
    const book = card(t("Charte de marque", "Brand guidelines"));
    await r.reveal(book);
    await r.spot(book, 4);
    const next = book.getByRole("button", { name: t("Planche suivante", "Next page") });
    if (await next.count()) {
      await r.click(next, { settle: 300 });
      await r.during(p.waitForFunction(() => [...document.querySelectorAll("main img[alt^='Planche'], main img[alt^='Page']")].every((i) => (i as HTMLImageElement).complete && (i as HTMLImageElement).naturalWidth > 0), null, { timeout: 60_000 }).catch(() => {}));
      await r.wait(900);
      await r.click(next, { settle: 300 });
      await r.during(p.waitForFunction(() => [...document.querySelectorAll("main img[alt^='Planche'], main img[alt^='Page']")].every((i) => (i as HTMLImageElement).complete && (i as HTMLImageElement).naturalWidth > 0), null, { timeout: 60_000 }).catch(() => {}));
      await r.wait(900);
      await r.point(book.getByRole("link", { name: "PDF" }));
      await r.wait(700);
    }
    await r.spot(null);
  });
  await r.step(7, async () => {
    const strategy = card(t("Stratégie", "Strategy"));
    await r.reveal(strategy);
    await r.point(strategy.getByText(t("Angles", "Angles"), { exact: true }));
    await r.spot(strategy, 4);
    await r.wait(1200);
    await r.spot(null);
  });
  await r.step(8, async () => {
    await p.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    await r.wait(1000);
    await r.click(identity.getByRole("button", { name: t("Nouvelle proposition", "New proposal") }), { settle: 900 });
    const dialog = p.getByRole("dialog");
    await r.point(dialog.getByRole("textbox").first());
    await r.wait(700);
    // Survol seulement : « Lancer » referait réellement la marque.
    await r.point(dialog.getByRole("button", { name: t("Lancer", "Start") }));
    await r.wait(1200);
    await r.click(dialog.getByRole("button", { name: t("Fermer", "Close") }).first(), { settle: 600 });
  });
}
