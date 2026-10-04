import type { SceneCtx } from "../../build-tutorials";

/** Aucune connexion réelle : on montre les cartes, leurs possibilités et leurs limites, sans cliquer sur « Connecter ». */
export default async function ({ r, t }: SceneCtx) {
  const p = r.page;
  const main = p.locator("main");
  const card = (name: string) => main.locator("div.rounded-3xl").filter({ has: p.getByText(name, { exact: true }) }).first();
  const meta = card("Meta (Facebook et Instagram)").or(card("Meta (Facebook and Instagram)")).first();
  await r.during(meta.waitFor({ state: "visible", timeout: 30_000 }));

  await r.step(0, async () => {
    await r.spot(main.getByText(t("Aucun mot de passe n'est demandé ni conservé", "No password is requested or stored")).locator(".."), 6);
    await r.wait(2400);
    await r.spot(null);
  });
  await r.step(1, async () => {
    await r.spot(meta, 6);
    await r.wait(800);
    await r.point(meta.locator("li").first());
    await r.wait(800);
    await r.point(meta.locator("li").nth(1));
    await r.wait(600);
  });
  await r.step(2, async () => {
    const summary = meta.getByText(t("Limites de l'API et autorisations demandées", "API limits and requested permissions"));
    await r.click(summary, { settle: 600 });
    await r.spot(meta, 6);
    await r.point(meta.getByRole("link", { name: t("Documentation officielle", "Official documentation") }));
    await r.wait(2400);
    await r.click(summary, { settle: 600 });
  });
  await r.step(3, async () => {
    await r.spot(null);
    const badge = meta.getByText(/^(Disponible|Non configuré|Available|Not configured)$/);
    await r.spot(badge, 6);
    await r.point(badge);
    await r.wait(1500);
    await r.spot(null);
  });
  await r.step(4, async () => {
    const bottom = meta.locator("div.mt-auto");
    await r.spot(bottom, 8);
    await r.point(bottom);
    await r.wait(1800);
    await r.spot(null);
  });
  await r.step(5, async () => {
    await r.point(card("TikTok").locator("li").first());
    await r.wait(1000);
    await r.point(card("YouTube").locator("li").first());
    await r.wait(1000);
    await r.point(card("Pinterest").locator("li").first());
    await r.wait(1000);
    await r.spot(card("Canva"), 6);
    await r.point(card("Canva").locator("li").first());
    await r.wait(1400);
    await r.spot(null);
  });
  await r.step(6, async () => {
    const shopify = card("Shopify");
    await r.spot(shopify, 6);
    await r.point(shopify.locator("li").first());
    await r.wait(900);
    await r.point(shopify.locator("li").nth(1));
    await r.wait(700);
    await r.point(shopify.locator("li").nth(2));
    await r.wait(600);
    await r.spot(null);
  });
  await r.step(7, async () => {
    const note = main.getByText(t("CapCut ne propose pas d'API publique", "CapCut doesn't offer a public editing API"));
    await r.scroll(1200);
    await r.wait(300);
    await r.spot(note, 6);
    await r.point(note);
    await r.wait(1600);
    await r.spot(null);
  });
}
