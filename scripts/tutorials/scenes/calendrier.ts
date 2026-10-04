import type { SceneCtx } from "../../build-tutorials";

/** Ce navigateur de tournage ne lit pas le H.264 : on affiche la vignette du média comme image d'attente du lecteur,
 *  comme le ferait un navigateur ordinaire avec la première image de la vidéo. */
async function posterize(p: import("playwright").Page) {
  await p.evaluate(() => {
    const d = document.querySelector("[role=dialog]");
    const v = d?.querySelector("video");
    const img = d?.querySelector("img") as HTMLImageElement | null;
    if (v && !v.poster && img?.src) { v.poster = img.src; v.preload = "none"; v.load(); }
  });
}

/** Publication déplacée pendant le tournage, remise à sa date d'origine par cleanup. */
let moved: { id: string; at: number } | null = null;

// Rien n'est préparé, validé ni enregistré : les fenêtres sont refermées sans valider. Seul le glisser-déposer
// change une date, rétablie ensuite par cleanup().
export default async function ({ r, t, projectId, base }: SceneCtx) {
  const p = r.page;
  const chips = p.locator("button[draggable=true]");
  const day = (n: number) => p.getByRole("button", { name: String(n), exact: true });
  const postsLoaded = () => p.waitForResponse((x) => x.url().includes(`/api/projects/${projectId}/posts?from=`) && x.request().method() === "GET", { timeout: 30_000 }).catch(() => {});
  // Première publication du mois (celle qui sera glissée), lue avant le tournage : l'attente est coupée au montage.
  const first = await r.during((async () => {
    const posts = (await (await p.context().request.get(`${base}/api/projects/${projectId}/posts`)).json()).posts as { id: string; scheduledAt: number | null }[];
    await chips.first().waitFor({ state: "visible", timeout: 60_000 });
    return posts.filter((x) => x.scheduledAt).sort((a, b) => a.scheduledAt! - b.scheduledAt!)[0];
  })());
  await r.wait(400);

  await r.step(0, async () => {
    const grid = chips.first().locator("xpath=ancestor::div[contains(@class,'grid-cols-7')][1]");
    await r.spot(grid, 4);
    await r.wait(1200);
    await r.spot(null);
    await r.point(chips.nth(0), { dx: 10 });
    await r.wait(700);
    await r.point(chips.nth(1), { dx: 10 });
    await r.wait(700);
    await r.point(chips.nth(2), { dx: 10 });
    await r.wait(500);
  });
  await r.step(1, async () => {
    let res = postsLoaded();
    await r.click(p.getByRole("button", { name: t("Suivant", "Next") }), { settle: 200 });
    await r.during(res);
    await r.wait(1200);
    res = postsLoaded();
    await r.click(p.getByRole("button", { name: t("Aujourd'hui", "Today") }), { settle: 200 });
    await r.during((async () => { await res; await chips.first().waitFor({ state: "visible", timeout: 30_000 }); })());
    await r.wait(900);
  });
  await r.step(2, async () => {
    let res = postsLoaded();
    await r.click(day(7), { settle: 200 });
    await r.during(res);
    await r.wait(1500);
    res = postsLoaded();
    await r.click(p.getByRole("button", { name: t("Semaine", "Week"), exact: true }), { settle: 200 });
    await r.during(res);
    await r.wait(1500);
    res = postsLoaded();
    await r.click(p.getByRole("button", { name: t("Mois", "Month"), exact: true }), { settle: 200 });
    await r.during((async () => { await res; await chips.first().waitFor({ state: "visible", timeout: 30_000 }); })());
    await r.wait(600);
  });
  await r.step(3, async () => {
    await r.click(chips.nth(3), { settle: 300 });
    const d = p.getByRole("dialog");
    await r.during(d.locator("#pcap").waitFor({ timeout: 20_000 }));
    await d.locator("img").first().waitFor({ state: "visible", timeout: 10_000 }).catch(() => {});
    await posterize(p);
    await r.wait(800);
    await r.point(d.locator("#pcap"));
    await r.wait(900);
    await r.point(d.locator("#pdate"));
    await r.wait(900);
    await r.click(d.getByRole("button", { name: t("Fermer", "Close") }).first(), { settle: 600 });
  });
  await r.step(4, async () => {
    moved = { id: first.id, at: first.scheduledAt! };
    const chip = chips.first();
    const target = day(13).locator("..");
    await r.point(chip, { dx: 30 });
    await r.wait(300);
    const saved = p.waitForResponse((x) => x.url().includes(`/api/posts/${first.id}`) && x.request().method() === "PATCH", { timeout: 20_000 }).catch(() => {});
    // Le curseur dessiné suit le geste ; le vrai glisser-déposer HTML5 est joué par Playwright.
    await r.point(target);
    await chip.dragTo(target, { sourcePosition: { x: 30, y: 8 } });
    await r.during(saved);
    await r.wait(1600);
    await r.spot(target, 2);
    await r.wait(1200);
    await r.spot(null);
  });
  await r.step(5, async () => {
    const legend = p.getByText(t("Brouillon", "Draft"), { exact: true }).last().locator("..");
    // Le curseur d'abord : le sous-titre passe en haut avant la mise en évidence.
    await r.point(legend, { dx: 20 });
    await r.spot(legend, 8);
    await r.wait(1500);
    await r.spot(null);
  });
  const d = p.getByRole("dialog");
  await r.step(6, async () => {
    await r.click(p.getByRole("button", { name: t("Préparer des publications", "Prepare posts") }), { settle: 300 });
    await r.during(d.locator("#cstart").waitFor({ timeout: 20_000 }));
    await r.wait(600);
    await r.point(d.locator("#cstart"));
    await r.wait(500);
    await r.point(d.locator("#cdays"));
    await r.wait(500);
    await r.click(d.locator("#cper").getByRole("button", { name: "2", exact: true }), { settle: 600 });
    await r.spot(d.locator("#cslot0").locator("../.."), 6);
    await r.point(d.locator("#cslot1"));
    await r.wait(900);
    await r.spot(null);
  });
  await r.step(7, async () => {
    const nets = d.getByText(t("Réseaux et comptes", "Networks and accounts"), { exact: true }).locator("..");
    await r.spot(nets, 6);
    await r.point(nets.getByRole("checkbox").first());
    await r.wait(500);
    await r.point(nets.getByRole("combobox").first());
    await r.wait(800);
    const mix = d.getByText(t("Répartition des contenus", "Content mix"), { exact: true }).locator("..");
    await r.spot(mix, 6);
    await r.point(mix.getByRole("slider").first());
    await r.wait(1000);
    const go = d.getByRole("button", { name: new RegExp(t("^Préparer \\d+ publications", "^Prepare \\d+ posts")) });
    await r.spot(go, 6);
    await r.point(go);
    await r.wait(1200);
    await r.spot(null);
    await r.click(d.getByRole("button", { name: t("Fermer", "Close") }).first(), { settle: 600 });
  });
  await r.step(8, async () => {
    await r.click(p.getByRole("button", { name: t("Règles d'automatisation", "Automation rules") }), { settle: 900 });
    const sw = d.getByRole("switch").first();
    await r.spot(sw.locator(".."), 6);
    await r.point(sw);
    await r.wait(1100);
    await r.spot(null);
    await r.point(d.getByRole("checkbox").first());
    await r.wait(700);
    await r.point(d.getByRole("checkbox").last());
    await r.wait(900);
    await r.click(d.getByRole("button", { name: t("Fermer", "Close") }).first(), { settle: 600 });
  });
}

/** Remet la publication déplacée à sa date d'origine. */
export async function cleanup({ r, base }: SceneCtx) {
  if (!moved) return;
  await r.page.context().request.patch(`${base}/api/posts/${moved.id}`, { data: { scheduledAt: moved.at } });
  moved = null;
}
