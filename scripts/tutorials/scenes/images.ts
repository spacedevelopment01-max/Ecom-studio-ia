import type { Locator } from "playwright";
import type { SceneCtx } from "../../build-tutorials";
import type { Recorder } from "../recorder";

/** Onde de clic visible à la position du curseur (sans vrai clic). */
async function ripple(r: Recorder) {
  await r.page.evaluate(([x, y]) => {
    const el = document.getElementById("tuto-ripple")!;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.classList.remove("on");
    void el.offsetWidth;
    el.classList.add("on");
  }, [r.pos.x, r.pos.y] as const);
  await r.wait(250);
}

/** Choix dans une liste déroulante native (la liste du système n'est pas filmée : on montre le geste puis la valeur). */
async function pick(r: Recorder, select: Locator, value: string, settle = 900) {
  await r.point(select);
  await ripple(r);
  await select.selectOption(value);
  await r.wait(settle);
}

/** Projet chargé et vignettes visibles affichées. */
async function ready(r: Recorder, gallery: Locator) {
  await gallery.first().locator("img").waitFor({ state: "visible", timeout: 60_000 });
  await r.page.waitForFunction(() => [...document.querySelectorAll("div.columns-2 img")].filter((i) => i.getBoundingClientRect().top < innerHeight).every((i) => (i as HTMLImageElement).complete && (i as HTMLImageElement).naturalWidth > 0), null, { timeout: 60_000 }).catch(() => {});
  await r.wait(300);
}

export default async function ({ r, t }: SceneCtx) {
  const p = r.page;
  const gallery = p.locator("div.columns-2 > button");
  // Le studio peut être lent à charger : l'attente est coupée au montage.
  await r.during(ready(r, gallery));
  const panel = p.locator("div.lg\\:sticky").first();

  await r.step(0, async () => {
    await r.point(p.getByRole("heading", { name: t("Créer", "Create"), exact: true }));
    await r.spot(panel, 6);
    await r.wait(2200);
    await r.spot(null);
  });
  await r.step(1, async () => {
    await pick(r, p.locator("#ikind"), "packshot", 1300);
    await pick(r, p.locator("#ikind"), "banner", 1300);
    await pick(r, p.locator("#ikind"), "scene", 900);
  });
  await r.step(2, async () => {
    await pick(r, p.locator("#istyle"), "podium", 1200);
    await pick(r, p.locator("#ifmt"), "portrait", 1200);
  });
  await r.step(3, async () => {
    await pick(r, p.locator("#ikind"), "ad", 1000);
    await r.spot(p.locator("#ilay").locator("xpath=..").locator("xpath=.."), 6).catch(() => {});
    await r.wait(300);
    await r.spot(null);
    await r.type(p.locator("#ihead"), t("Prêt à décoller", "Ready for take-off"));
    await r.point(p.locator("#isub"));
    await r.point(p.locator("#icta"));
  }, { hold: 600 });
  await r.step(4, async () => {
    await r.point(p.getByRole("combobox", { name: t("Langue du contenu", "Content language") }));
    await r.wait(600);
    const create = p.getByRole("button", { name: t("Créer l'image", "Create image") });
    await r.spot(create, 6);
    await r.point(create);
    await r.wait(1400);
    const set = p.getByRole("button", { name: t("Jeu complet", "Full set") });
    await r.spot(set, 6);
    await r.point(set);
    await r.wait(1200);
    await r.spot(null);
  }, { hold: 600 });
  await r.step(5, async () => {
    for (const [fr, en, role] of [["Scènes", "Scenes", "scene"], ["Bannières", "Banners", "banner"], ["Tout", "All", "packshot"]] as const) {
      const res = p.waitForResponse((x) => x.url().includes(`/files?role=${role}`), { timeout: 20_000 }).catch(() => {});
      await r.click(p.getByRole("tab", { name: t(fr, en), exact: true }), { settle: 200 });
      await r.during((async () => { await res; await r.wait(250); await ready(r, gallery); })());
      await r.wait(1300);
    }
  });
  await r.step(6, async () => {
    await r.spot(gallery.first().getByText(t("À valider", "To review")), 4);
    await r.point(gallery.first().getByText(t("À valider", "To review")));
    await r.wait(1500);
    await r.spot(null);
    await r.click(gallery.nth(1), { settle: 400 });
    await p.getByRole("dialog").locator("img").first().waitFor({ state: "visible", timeout: 15_000 }).catch(() => {});
    await p.getByRole("dialog").getByRole("button", { name: t("Valider", "Approve") }).waitFor({ timeout: 15_000 });
    await r.wait(600);
  });
  await r.step(7, async () => {
    const d = p.getByRole("dialog");
    const approve = d.getByRole("button", { name: t("Valider", "Approve"), exact: true });
    await r.spot(approve.locator("xpath=.."), 6);
    await r.point(approve);
    await r.wait(700);
    await r.point(d.getByRole("button", { name: t("Écarter", "Reject") }));
    await r.wait(500);
    await r.point(d.getByRole("link", { name: t("Télécharger", "Download") }));
    await r.wait(700);
    const place = d.getByRole("combobox", { name: t("Section de la boutique", "Store section") });
    await r.spot(place.locator("xpath=../.."), 6);
    await r.point(place);
    await r.wait(1000);
    await r.point(d.getByRole("button", { name: t("Créer une publication avec ce média", "Create a post with this media") }));
    await r.wait(1200);
    await r.spot(null);
    await r.click(d.getByRole("button", { name: t("Fermer", "Close") }).first(), { settle: 600 });
  }, { hold: 400 });
}
