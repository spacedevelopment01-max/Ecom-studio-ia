import type { SceneCtx } from "../../build-tutorials";

const TOPIC = { fr: "Ton des légendes", en: "Caption tone" };

export default async function ({ r, t }: SceneCtx) {
  const p = r.page;
  const main = p.locator("main");
  const card = (text: string) => main.getByText(text, { exact: true }).first().locator("xpath=ancestor::div[contains(@class,'rounded-3xl')][1]");
  const progress = card(t("Avancement de la création", "Creation progress"));
  await r.during(progress.locator("ol li").first().waitFor({ state: "visible", timeout: 120_000 }));
  await r.during(p.waitForLoadState("networkidle").catch(() => {}));
  // Photo de couverture et logo chargés avant de filmer.
  await r.during(p.waitForFunction(() => { const imgs = [...document.querySelectorAll("main img")] as HTMLImageElement[]; return imgs.length > 0 && imgs.every((i) => i.complete && i.naturalWidth > 0); }, null, { timeout: 120_000 }).catch(() => {}));

  await r.step(0, async () => {
    await r.spot(progress, 6);
    await r.point(progress.locator("ol li").nth(1));
    await r.wait(700);
    await r.point(progress.locator("ol li").nth(5));
    await r.wait(700);
    await r.spot(null);
  });
  await r.step(1, async () => {
    const rerun = progress.getByRole("button", { name: t("Relancer", "Rerun") }).first();
    await r.spot(rerun.locator("xpath=ancestor::li[1]"), 4);
    // Survol seulement : un clic relancerait réellement la création.
    await r.point(rerun);
    await r.wait(1200);
    await r.spot(null);
  });
  await r.step(2, async () => {
    const counters = main.locator("a[href$='/images']").locator("xpath=..");
    await r.spot(counters, 4);
    await r.point(main.locator("a[href$='/images']"));
    await r.wait(500);
    await r.point(main.locator("a[href$='/videos']"));
    await r.wait(500);
    await r.point(main.locator("a[href$='/publications']"));
    await r.wait(500);
    await r.spot(null);
  });
  await r.step(3, async () => {
    const editor = main.getByRole("link", { name: t("Ouvrir l'éditeur", "Open the editor") });
    await r.spot(editor.locator("xpath=ancestor::div[contains(@class,'rounded-3xl')][1]"), 4);
    await r.point(editor);
    await r.wait(900);
    await r.point(main.getByRole("link", { name: t("Changer de thème", "Change theme") }));
    await r.wait(900);
    await r.spot(null);
  });
  await r.step(4, async () => {
    const questions = card(t("Quelques questions indispensables", "A few essential questions"));
    await r.spot(questions, 4);
    // Saisie de démonstration, jamais enregistrée (aucun clic sur le bouton).
    await r.type(questions.getByPlaceholder(t("Votre réponse", "Your answer")).first(), t("Expédition sous 48 h", "Ships within 48 hours"), { delay: 55 });
    await r.point(questions.getByRole("button", { name: t("Enregistrer mes réponses", "Save my answers") }));
    await r.wait(900);
    await questions.getByPlaceholder(t("Votre réponse", "Your answer")).first().fill("");
    await r.spot(null);
  }, { hold: 400 });
  const settings = card(t("Réglages du projet", "Project settings"));
  await r.step(5, async () => {
    const platforms = settings.getByText(t("Plateforme de la boutique", "Store platform")).locator("xpath=..");
    await r.reveal(platforms);
    await r.spot(platforms, 6);
    await r.point(platforms.getByText("Shopify", { exact: true }).first());
    await r.wait(700);
    await r.point(platforms.getByText("WordPress / WooCommerce").first());
    await r.wait(700);
    await r.point(platforms.getByText("Wix", { exact: true }).first());
    await r.wait(500);
    await r.spot(null);
  });
  await r.step(6, async () => {
    const lang = settings.getByLabel(t("Langue des contenus du projet", "Project content language"));
    await r.spot(lang.locator("xpath=.."), 6);
    await r.point(lang);
    await r.wait(1200);
    await r.spot(null);
  });
  const memory = card(t("Mémoire du projet", "Project memory"));
  await r.step(7, async () => {
    await r.reveal(memory.getByRole("button", { name: t("Ajouter", "Add") }));
    await r.spot(memory, 4);
    await r.type(memory.getByPlaceholder(t("Sujet (ex. ton des légendes)", "Topic (e.g. caption tone)")), t(TOPIC.fr, TOPIC.en), { delay: 50 });
    await r.type(memory.getByPlaceholder(t("Ce qu'il faut retenir (ex. jamais d'emoji, vouvoyer)", "What to remember (e.g. never use emojis, keep a formal tone)")), t("Jamais d'emoji, toujours vouvoyer", "No emojis, always a formal tone"), { delay: 45 });
    const saved = p.waitForResponse((res) => res.url().includes("/memory") && res.request().method() === "POST", { timeout: 60_000 });
    await r.click(memory.getByRole("button", { name: t("Ajouter", "Add") }), { settle: 200 });
    await r.during(saved);
    await r.during(memory.getByText(t(TOPIC.fr, TOPIC.en), { exact: true }).waitFor({ timeout: 60_000 }));
    await r.spot(null);
  });
  await r.step(8, async () => {
    const item = memory.locator("li", { hasText: t(TOPIC.fr, TOPIC.en) }).first();
    await r.spot(item, 4);
    await r.point(item.getByText(t(TOPIC.fr, TOPIC.en), { exact: true }));
    await r.wait(900);
    await r.point(item.getByRole("button", { name: t("Oublier", "Forget") }));
    await r.wait(900);
    await r.spot(null);
  });
}

/** Retire la préférence ajoutée pendant le tournage. */
export async function cleanup({ r, projectId, base }: SceneCtx) {
  const api = r.page.context().request;
  const res = await api.get(`${base}/api/projects/${projectId}/memory`);
  if (!res.ok()) return;
  const { items } = (await res.json()) as { items: { id: string; key: string }[] };
  for (const m of items ?? []) if (m.key === TOPIC.fr || m.key === TOPIC.en) await api.delete(`${base}/api/projects/${projectId}/memory?item=${m.id}`);
}
