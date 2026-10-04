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

// Rien n'est enregistré, validé ni publié pendant le tournage : la fenêtre est refermée sans enregistrer,
// les cases cochées sont décochées et « Nouvelle publication » est seulement montrée.
export default async function ({ r, t }: SceneCtx) {
  const p = r.page;
  const boxes = p.getByRole("checkbox", { name: t("Sélectionner", "Select") });
  const firstRow = boxes.first().locator("xpath=../..");
  const filter = (fr: string, en: string) => p.getByRole("button", { name: new RegExp(`^${t(fr, en)} \\d+$`) });
  await r.during((async () => {
    await boxes.first().waitFor({ state: "visible", timeout: 60_000 });
    // Une vignette en échec (serveur chargé) est redemandée.
    await p.waitForFunction(() => {
      let ok = true;
      for (const i of [...document.querySelectorAll("img")].filter((i) => i.getBoundingClientRect().top < innerHeight) as HTMLImageElement[]) {
        if (!i.complete) ok = false;
        else if (i.naturalWidth === 0 && i.src.includes("/api/files/")) {
          ok = false;
          i.src = i.src.replace(/[?&]r=\d+$/, "") + `${i.src.includes("?") ? "&" : "?"}r=${Date.now()}`;
        }
      }
      return ok;
    }, null, { timeout: 60_000, polling: 2000 }).catch(() => {});
    await r.wait(500);
  })());

  await r.step(0, async () => {
    await r.spot(filter("Toutes", "All").locator(".."), 6);
    await r.click(filter("Toutes", "All"), { settle: 1200 });
    await r.point(filter("Publiées", "Published"));
    await r.wait(500);
    await r.point(filter("Brouillons", "Drafts"));
    await r.wait(500);
    await r.click(filter("À valider", "To review"), { settle: 900 });
    await r.spot(null);
  });
  await r.step(1, async () => {
    await r.spot(firstRow, 4);
    await r.point(firstRow.locator("span.text-muted").first(), { dx: 40 });
    await r.wait(900);
    await r.point(firstRow.locator("span.line-clamp-2"), { dx: 80 });
    await r.wait(900);
    await r.point(firstRow.getByText(t("À valider", "To review")));
    await r.wait(600);
  });
  await r.step(2, async () => {
    const warn = firstRow.getByText(t("compte à choisir", "account to choose"));
    await r.spot(warn, 6);
    await r.point(warn);
    await r.wait(1200);
    await r.spot(null);
  });
  const d = p.getByRole("dialog");
  await r.step(3, async () => {
    await r.click(firstRow.locator("span.line-clamp-2"), { settle: 300 });
    await r.during(d.locator("#pcap").waitFor({ timeout: 20_000 }));
    await d.locator("img").first().waitFor({ state: "visible", timeout: 10_000 }).catch(() => {});
    await posterize(p);
    await r.wait(700);
    await r.point(d.locator("#pnet"));
    await r.wait(500);
    await r.point(d.locator("#pfmt"));
    await r.wait(500);
    await r.spot(d.locator("#pacc").locator(".."), 6);
    await r.point(d.locator("#pacc"));
    await r.wait(900);
    await r.spot(null);
  });
  await r.step(4, async () => {
    await r.spot(d.locator("#pcap").locator(".."), 6);
    await r.point(d.locator("#pcap"));
    await r.wait(800);
    await r.point(d.getByText(new RegExp(`/ \\d+ ${t("caractères", "characters")}`)));
    await r.wait(1000);
    await r.spot(d.locator("#ptags").locator(".."), 6);
    await r.point(d.locator("#ptags"));
    await r.wait(700);
    await r.spot(null);
  });
  await r.step(5, async () => {
    await r.point(d.locator("#pdate"));
    await r.wait(600);
    await r.point(d.locator("#plink"));
    await r.wait(500);
    const regen = d.getByText(t("Régénérer avec l'IA", "Regenerate with AI"), { exact: true }).locator("..");
    await r.spot(regen, 6);
    await r.point(regen.getByRole("button", { name: t("Texte", "Text"), exact: true }));
    await r.wait(500);
    await r.point(regen.getByRole("button", { name: t("Visuel", "Visual"), exact: true }));
    await r.wait(700);
    await r.spot(null);
  });
  await r.step(6, async () => {
    const add = d.getByRole("button", { name: t("Ajouter un média", "Add media") });
    const preview = add.locator("xpath=../..");
    await r.spot(preview, 6);
    await r.point(preview.locator("img, video").first());
    await r.wait(900);
    await r.point(add);
    await r.wait(900);
    await r.spot(null);
  });
  await r.step(7, async () => {
    const save = d.getByRole("button", { name: t("Enregistrer", "Save"), exact: true });
    await r.spot(save.locator(".."), 6);
    await r.point(save);
    await r.wait(500);
    await r.point(d.getByRole("button", { name: t("Valider et programmer", "Approve and schedule") }));
    await r.wait(700);
    await r.point(d.getByRole("button", { name: t("Publier maintenant", "Publish now") }));
    await r.wait(900);
    await r.spot(null);
    await r.click(d.getByRole("button", { name: t("Fermer", "Close") }).first(), { settle: 700 });
  }, { hold: 300 });
  await r.step(8, async () => {
    await r.click(boxes.nth(0), { settle: 400 });
    await r.click(boxes.nth(1), { settle: 600 });
    const bulk = p.getByRole("button", { name: t("Valider la sélection", "Approve selection") });
    await r.spot(bulk, 6);
    await r.point(bulk);
    await r.wait(1300);
    await r.spot(null);
    await r.click(boxes.nth(1), { settle: 300 });
    await r.click(boxes.nth(0), { settle: 500 });
    const fresh = p.getByRole("button", { name: t("Nouvelle publication", "New post") });
    await r.spot(fresh, 6);
    await r.point(fresh);
    await r.wait(1200);
    await r.spot(null);
  }, { hold: 400 });
}
