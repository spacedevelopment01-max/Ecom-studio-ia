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

// Aucune vidéo n'est produite pendant le tournage (le rendu est long) : on montre les réglages et le bouton,
// puis les vidéos déjà présentes dans le projet de démonstration.
export default async function ({ r, t }: SceneCtx) {
  const p = r.page;
  const panel = p.locator("div.lg\\:sticky").first();
  const video = p.locator("main video, video").first();
  await r.during((async () => {
    await video.waitFor({ state: "visible", timeout: 60_000 });
    await p.waitForFunction(() => {
      const v = document.querySelector("video");
      if (!v?.poster) return true;
      const img = new Image();
      img.src = v.poster;
      return img.complete;
    }, null, { timeout: 30_000 }).catch(() => {});
    await r.wait(800);
  })());

  await r.step(0, async () => {
    await r.point(p.getByRole("heading", { name: t("Produire une vidéo", "Produce a video") }));
    await r.wait(500);
    const tabs = p.getByRole("tablist", { name: t("Type de vidéo", "Video type") });
    await r.spot(tabs, 6);
    await r.point(tabs.getByRole("tab", { name: "Motion design" }));
    await r.wait(900);
    await r.point(tabs.getByRole("tab", { name: t("UGC par IA", "AI UGC") }));
    await r.wait(700);
    await r.spot(null);
  });
  await r.step(1, async () => {
    await r.click(p.getByRole("tab", { name: t("UGC par IA", "AI UGC") }), { settle: 900 });
    await r.spot(panel, 6);
    await r.wait(3200);
    await r.spot(null);
    await r.click(p.getByRole("tab", { name: "Motion design" }), { settle: 700 });
  });
  await r.step(2, async () => {
    await pick(r, p.locator("#vfmt"), "1:1", 1100);
    await pick(r, p.locator("#vfmt"), "4:5", 900);
  });
  await r.step(3, async () => {
    await r.type(p.locator("#vgoal"), t("Publicité de lancement", "Launch ad"));
    await pick(r, p.locator("#vtarget"), "social", 900);
    await pick(r, p.locator("#vmusic"), "pulse", 900);
    await r.point(p.locator("#vurl"));
    await r.wait(600);
  });
  await r.step(4, async () => {
    const go = p.getByRole("button", { name: t("Produire la vidéo", "Produce the video") });
    await r.spot(go, 6);
    await r.point(go);
    await r.wait(1800);
    await r.spot(null);
  });
  await r.step(5, async () => {
    await p.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    await r.wait(900);
    await r.spot(video, 4);
    await r.point(video, { dx: 30, dy: (await video.boundingBox())!.height - 24 });
    await r.wait(1600);
    await r.spot(null);
  });
  await r.step(6, async () => {
    const plan = p.locator("ol").first();
    await r.reveal(plan);
    const badges = p.getByText(t("À valider", "To review"), { exact: true }).first();
    await r.spot(badges.locator(".."), 6);
    await r.point(badges);
    await r.wait(1300);
    await r.spot(plan, 8);
    await r.point(plan.locator("li").first());
    await r.wait(700);
    await r.point(plan.locator("li").last());
    await r.wait(800);
    await r.spot(null);
  });
  await r.step(7, async () => {
    const mp4 = p.getByRole("link", { name: "MP4" }).first();
    await r.spot(mp4.locator(".."), 6);
    await r.point(mp4);
    await r.wait(700);
    await r.point(p.getByRole("link", { name: t("Sous-titres SRT", "SRT subtitles") }).first());
    await r.wait(700);
    await r.point(p.getByRole("link", { name: t("Pack CapCut", "CapCut pack") }).first());
    await r.wait(900);
    await r.spot(null);
  });
  await r.step(8, async () => {
    await r.click(p.getByRole("button", { name: t("Valider, réutiliser, Canva…", "Approve, reuse, Canva…") }).first(), { settle: 400 });
    const d = p.getByRole("dialog");
    await r.during(d.getByRole("button", { name: t("Valider", "Approve"), exact: true }).waitFor({ timeout: 20_000 }));
    await r.wait(900);
    const approve = d.getByRole("button", { name: t("Valider", "Approve"), exact: true });
    await r.spot(approve.locator(".."), 6);
    await r.point(approve);
    await r.wait(1000);
    const place = d.getByRole("combobox", { name: t("Section de la boutique", "Store section") });
    await r.spot(place.locator("xpath=../.."), 6);
    await r.point(place);
    await r.wait(900);
    await r.point(d.getByRole("button", { name: t("Créer une publication avec ce média", "Create a post with this media") }));
    await r.wait(1000);
    await r.spot(null);
    await r.click(d.getByRole("button", { name: t("Fermer", "Close") }).first(), { settle: 600 });
  }, { hold: 400 });
}
