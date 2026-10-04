import type { SceneCtx } from "../../build-tutorials";

/** Attend que les vignettes visibles soient chargées (le serveur peut être lent pendant le tournage). */
const imagesLoaded = (r: SceneCtx["r"], scope = "main") =>
  r.during(
    r.page
      .waitForFunction((sel) => {
        const imgs = [...document.querySelectorAll(`${sel} img`)].slice(0, 15) as HTMLImageElement[];
        return imgs.length > 0 && imgs.every((i) => i.complete && i.naturalWidth > 0);
      }, scope, { timeout: 30_000 })
      .catch(() => {}),
  );

export default async function ({ r, t }: SceneCtx) {
  const p = r.page;
  const main = p.locator("main");
  const tree = main.locator("div.rounded-3xl, .h-max").filter({ has: p.getByRole("button", { name: t("Corbeille", "Trash") }) }).first();
  const folderCard = (re: RegExp) => main.locator("button.rounded-2xl").filter({ hasText: re }).first();
  await r.during(folderCard(/^02 · /).waitFor({ state: "visible", timeout: 30_000 }));

  await r.step(0, async () => {
    await r.spot(tree, 6);
    await r.wait(1600);
    await r.point(tree.getByText(t("Bannières boutique", "Store banners")));
    await r.wait(600);
    await r.spot(null);
  });
  await r.step(1, async () => {
    await r.click(folderCard(/^03 · /), { settle: 300 });
    await r.during(folderCard(/^Packshots/).waitFor({ state: "visible", timeout: 30_000 }));
    await r.wait(700);
    await r.click(folderCard(/^Packshots/), { settle: 300 });
    await r.during(main.locator("input[type=checkbox]").first().waitFor({ state: "visible", timeout: 30_000 }));
    await imagesLoaded(r);
    await r.spot(main.getByRole("navigation", { name: t("Chemin", "Path") }), 6);
    await r.wait(1400);
    await r.spot(null);
  });
  await r.step(2, async () => {
    const tile = main.locator("div.group[draggable]").first();
    await r.click(tile.locator("button").first(), { settle: 300 });
    const viewer = p.getByRole("dialog");
    await r.during(viewer.locator("img").first().waitFor({ state: "visible", timeout: 30_000 }));
    // Grande image : si le serveur, chargé, la laisse échouer, on la redemande (jusqu'à trois fois).
    await r.during((async () => {
      for (let k = 0; k < 3; k++) {
        const ok = await p.waitForFunction(() => { const i = document.querySelector("[role=dialog] img") as HTMLImageElement | null; return !!i && i.complete && (i.naturalWidth > 0 ? "ok" : "bad"); }, null, { timeout: 30_000 }).then((h) => h.jsonValue()).catch(() => "bad");
        if (ok === "ok") return;
        await p.evaluate((k) => { const i = document.querySelector("[role=dialog] img") as HTMLImageElement | null; if (i) i.src = i.src.split("?")[0] + `?retry=${k}`; }, k);
      }
    })());
    await r.wait(800);
    await r.point(viewer.getByText(t("Dimensions", "Dimensions"), { exact: true }));
    await r.wait(900);
    await r.point(viewer.getByRole("button", { name: t("Valider", "Approve"), exact: true }));
    await r.wait(500);
    await r.point(viewer.getByRole("link", { name: t("Télécharger", "Download") }));
    await r.wait(500);
    await r.point(viewer.getByRole("button", { name: t("Placer", "Place"), exact: true }));
    await r.wait(1200);
    await r.click(viewer.getByRole("button", { name: t("Fermer", "Close") }), { settle: 600 });
  }, { hold: 400 });
  await r.step(3, async () => {
    const boxes = main.locator("div.group[draggable] input[type=checkbox]");
    await r.click(boxes.nth(0), { settle: 500 });
    await r.click(boxes.nth(1), { settle: 600 });
    const bar = main.getByRole("button", { name: t("Déplacer", "Move") }).locator("..");
    await r.spot(bar, 6);
    await r.wait(1600);
    await r.spot(null);
    await r.click(main.getByRole("button", { name: t("Désélectionner", "Deselect") }), { settle: 500 });
    await r.point(tree.getByText(t("Scènes & usages", "Scenes & use cases")));
    await r.wait(600);
  });
  await r.step(4, async () => {
    await r.click(main.getByRole("button", { name: t("Liste", "List"), exact: true }), { settle: 1400 });
    await r.spot(main.locator("table"), 6);
    await r.wait(1800);
    await r.spot(null);
    await r.click(main.getByRole("button", { name: t("Vignettes", "Thumbnails"), exact: true }), { settle: 800 });
  });
  await r.step(5, async () => {
    const search = main.getByRole("textbox", { name: t("Rechercher", "Search"), exact: true });
    const res = p.waitForResponse((x) => x.url().includes("/files?q=logo"), { timeout: 30_000 });
    await r.type(search, "logo");
    await r.during(res);
    await imagesLoaded(r);
    await r.wait(1600);
    const back = p.waitForResponse((x) => x.url().includes("/files?folder="), { timeout: 30_000 }).catch(() => {});
    await search.fill("");
    await r.during(back);
    await imagesLoaded(r);
    await r.wait(600);
  });
  await r.step(6, async () => {
    const btn = main.getByRole("button", { name: t("Importer", "Upload"), exact: true });
    await r.spot(btn, 6);
    // Survol seulement : un clic ouvrirait la fenêtre de choix de fichiers du système.
    await r.point(btn);
    await r.wait(1200);
    await r.spot(null);
  });
  await r.step(7, async () => {
    await r.point(tree.getByRole("button", { name: /^(Nouveau dossier|Nouveau sous-dossier|New folder|New subfolder)$/ }));
    await r.wait(1600);
    await r.point(tree.getByRole("button", { name: t("Ranger les fichiers non classés", "Sort unfiled files") }));
    await r.wait(1200);
  });
  await r.step(8, async () => {
    const res = p.waitForResponse((x) => x.url().includes("/files?trash=1"), { timeout: 30_000 });
    await r.click(tree.getByRole("button", { name: t("Corbeille", "Trash") }), { settle: 300 });
    await r.during(res);
    await r.wait(500);
    await r.scroll(-3000);
    const empty = main.getByText(/^(Corbeille vide|Trash is empty)$/).or(main.locator("div.group[draggable]").first()).first();
    await r.spot(empty.locator("xpath=ancestor::div[contains(@class,'rounded')][1]"), 6);
    await r.wait(1600);
    await r.spot(null);
  });
}
