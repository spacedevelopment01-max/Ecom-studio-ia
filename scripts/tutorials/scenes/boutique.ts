import type { SceneCtx } from "../../build-tutorials";

export default async function ({ r, t }: SceneCtx) {
  const p = r.page;
  const frame = p.locator("iframe").first();
  await r.step(0, async () => {
    await r.spot(frame, 4);
    await r.wait(1200);
    await r.spot(null);
    await r.point(p.getByRole("combobox", { name: t("Page affichée", "Page shown") }));
  });
  await r.step(1, async () => {
    await r.click(p.getByTitle(t("Téléphone", "Phone")), { settle: 1800 });
    await r.click(p.getByTitle(t("Tablette", "Tablet")), { settle: 1400 });
    await r.click(p.getByTitle(t("Ordinateur", "Desktop")), { settle: 1200 });
  });
  await r.step(2, async () => {
    await r.click(p.getByTitle(t("Voir cette section dans l'aperçu", "Show this section in the preview")).nth(3), { settle: 1800 });
    await r.click(p.getByTitle(t("Voir cette section dans l'aperçu", "Show this section in the preview")).nth(6), { settle: 1800 });
  });
  await r.step(3, async () => {
    const row = p.locator("div.group", { has: p.getByTitle(t("Voir cette section dans l'aperçu", "Show this section in the preview")) }).nth(2);
    await r.spot(row, 6);
    await r.point(row, { dx: 22 });
    await r.wait(900);
    await r.point(row.getByRole("button", { name: t("Masquer", "Hide") }));
    await r.wait(500);
    await r.spot(null);
  });
  await r.step(4, async () => {
    await r.click(p.getByRole("button", { name: t("Ajouter une section", "Add a section") }).last(), { settle: 1500 });
    const options = p.getByRole("dialog").getByRole("option");
    // Survol seulement : un clic ajouterait la section.
    // Attente de l'aperçu de la section (coupée au montage), puis temps de regard.
    const loaded = () => r.during(p.getByRole("dialog").getByText(/Aperçu dans votre boutique…|Previewing in your store…/).waitFor({ state: "detached", timeout: 30_000 }).catch(() => {}));
    await r.point(options.nth(4));
    await r.wait(400);
    await loaded();
    await r.wait(2200);
    await r.point(options.nth(9));
    await r.wait(400);
    await loaded();
    await r.wait(2200);
    await r.point(options.nth(0));
    await r.wait(2200);
    await r.click(p.getByRole("dialog").getByRole("button", { name: t("Fermer", "Close") }), { settle: 800 });
  });
  await r.step(5, async () => {
    await r.type(p.getByRole("textbox", { name: t("Votre demande", "Your request") }), t("Mets les boutons en noir", "Make the buttons black"));
    const reply = p.waitForResponse((res) => res.url().includes("/theme/chat") && res.request().method() === "POST", { timeout: 90_000 });
    await r.click(p.getByRole("button", { name: t("Envoyer", "Send") }), { settle: 300 });
    await r.during(reply.then(() => waitPreview(p)));
    await r.spot(p.locator("iframe").first(), 4);
    await r.wait(1500);
    await r.spot(null);
  }, { hold: 800 });
  await r.step(6, async () => {
    await r.click(p.getByTitle(t("Versions", "Versions")), { settle: 2200 });
    await r.click(p.getByRole("dialog").getByRole("button", { name: t("Fermer", "Close") }), { settle: 600 });
  });
  await r.step(7, async () => {
    await r.click(p.getByRole("button", { name: t("Thèmes", "Themes") }), { settle: 300 });
    await p.getByRole("dialog").locator("img").first().waitFor({ state: "visible", timeout: 20_000 }).catch(() => {});
    await p.waitForFunction(() => [...document.querySelectorAll("[role=dialog] img")].slice(0, 6).every((i) => (i as HTMLImageElement).complete), null, { timeout: 20_000 }).catch(() => {});
    await r.wait(1800);
    await r.point(p.getByRole("dialog").locator("img").nth(4));
    await p.mouse.wheel(0, 420);
    await r.wait(1800);
    await r.click(p.getByRole("dialog").getByRole("button", { name: t("Fermer", "Close") }).first(), { settle: 600 });
  });
  await r.step(8, async () => {
    await r.click(p.getByRole("button", { name: t("Exporter et installer", "Export and install") }), { settle: 2600 });
  }, { hold: 1200 });
  await p.keyboard.press("Escape");
}

/** Attend que l'aperçu (iframe) ait fini de se recharger. */
async function waitPreview(p: SceneCtx["r"]["page"]) {
  await p.waitForTimeout(1200);
  const f = p.frames().find((x) => x.url().includes("/preview/"));
  await f?.waitForLoadState("load", { timeout: 30_000 }).catch(() => {});
  await p.waitForTimeout(1500);
}

/** Remet la boutique de démonstration dans son état d'origine (la retouche filmée crée une version). */
export async function cleanup({ r, projectId, base }: SceneCtx) {
  const api = r.page.context().request;
  const th = await (await api.get(`${base}/api/projects/${projectId}/theme`)).json();
  const first = th.versions?.find((v: any) => v.number === 1);
  if (first && th.current?.versionId !== first.id) await api.post(`${base}/api/projects/${projectId}/theme/restore`, { data: { versionId: first.id } });
}
