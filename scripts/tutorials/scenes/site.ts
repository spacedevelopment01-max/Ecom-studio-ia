import type { SceneCtx } from "../../build-tutorials";

/** Site vitrine d'une entreprise de services : même onglet que la boutique (tab-boutique.tsx), sans panier. */
/** Aperçu prêt : document chargé, texte présent et premières images affichées (l'aperçu est rechargé à chaque changement d'appareil ou de version). */
const previewReady = (r: SceneCtx["r"]) =>
  r.during(
    r.page
      .waitForFunction(() => {
        const f = document.querySelector("iframe") as HTMLIFrameElement | null;
        try {
          const d = f?.contentDocument;
          if (!d || d.location.href === "about:blank" || d.readyState !== "complete" || (d.body?.innerText.length ?? 0) < 80) return false;
          return [...d.images].slice(0, 4).every((i) => i.complete) && d.fonts.status === "loaded";
        } catch {
          return false;
        }
      }, null, { timeout: 120_000, polling: 250 })
      .catch(() => {}),
  );

let startedAt = 0;

export default async function ({ r, t }: SceneCtx) {
  startedAt = Date.now() - 1000;
  const p = r.page;
  const frame = p.locator("iframe").first();
  const sectionBtn = p.getByTitle(t("Voir cette section dans l'aperçu", "Show this section in the preview"));
  // L'aperçu doit être chargé avant de commencer (le serveur peut être lent pendant le tournage).
  await r.during(frame.waitFor({ state: "visible", timeout: 150_000 }));
  await previewReady(r);
  await r.wait(800);

  await r.step(0, async () => {
    await r.spot(frame, 4);
    await r.wait(1200);
    await r.spot(null);
    await r.point(p.getByRole("combobox", { name: t("Page affichée", "Page shown") }));
  });
  await r.step(1, async () => {
    await r.click(p.getByTitle(t("Téléphone", "Phone")), { settle: 400 });
    await previewReady(r);
    await r.wait(1400);
    await r.click(p.getByTitle(t("Tablette", "Tablet")), { settle: 400 });
    await previewReady(r);
    await r.wait(1100);
    await r.click(p.getByTitle(t("Ordinateur", "Desktop")), { settle: 400 });
    await previewReady(r);
    await r.wait(900);
  });
  await r.step(2, async () => {
    await r.click(sectionBtn.nth(4), { settle: 1800 });
    await r.click(sectionBtn.nth(6), { settle: 1800 });
  });
  await r.step(3, async () => {
    const row = p.locator("div.group", { has: sectionBtn }).nth(2);
    await r.spot(row, 6);
    await r.point(row, { dx: 22 });
    await r.wait(900);
    await r.point(row.getByRole("button", { name: t("Masquer", "Hide") }));
    await r.wait(500);
    await r.spot(null);
  });
  await r.step(4, async () => {
    await r.click(p.getByRole("button", { name: t("Ajouter une section", "Add a section") }).last(), { settle: 600 });
    const dialog = p.getByRole("dialog");
    const options = dialog.getByRole("option");
    await r.during(options.nth(9).waitFor({ state: "visible", timeout: 30_000 }));
    await r.wait(800);
    // Survol seulement : un clic ajouterait la section.
    await r.point(options.nth(4));
    await r.wait(2200);
    await r.point(options.nth(0));
    await r.wait(2000);
    await r.click(dialog.getByRole("button", { name: t("Fermer", "Close") }), { settle: 800 });
  });
  await r.step(5, async () => {
    await r.type(p.getByRole("textbox", { name: t("Votre demande", "Your request") }), t("Mets les boutons en noir", "Make the buttons black"));
    const before = await frame.getAttribute("src");
    const reply = p.waitForResponse((res) => res.url().includes("/theme/chat") && res.request().method() === "POST", { timeout: 90_000 });
    await r.click(p.getByRole("button", { name: t("Envoyer", "Send") }), { settle: 300 });
    await r.during(reply);
    // La retouche crée une version : l'aperçu change d'adresse puis se recharge.
    await r.during(p.waitForFunction((old) => document.querySelector("iframe")?.getAttribute("src") !== old, before, { timeout: 60_000 }).catch(() => {}));
    await previewReady(r);
    await r.wait(800);
    await r.spot(frame, 4);
    await r.wait(1500);
    await r.spot(null);
  }, { hold: 800 });
  await r.step(6, async () => {
    await r.click(p.getByTitle(t("Versions", "Versions")), { settle: 600 });
    await r.during(p.getByRole("dialog").getByRole("button").nth(1).waitFor({ state: "visible", timeout: 30_000 }));
    await r.wait(1600);
    await r.click(p.getByRole("dialog").getByRole("button", { name: t("Fermer", "Close") }), { settle: 600 });
  });
  await r.step(7, async () => {
    await r.click(p.getByRole("button", { name: t("Thèmes", "Themes") }), { settle: 300 });
    await r.during(p.getByRole("dialog").locator("img").first().waitFor({ state: "visible", timeout: 30_000 }).catch(() => {}));
    await r.during(p.waitForFunction(() => [...document.querySelectorAll("[role=dialog] img")].slice(0, 6).every((i) => (i as HTMLImageElement).complete), null, { timeout: 30_000 }).catch(() => {}));
    await r.wait(1500);
    await r.point(p.getByRole("dialog").locator("img").nth(4));
    await p.mouse.wheel(0, 420);
    await r.wait(1800);
    await r.click(p.getByRole("dialog").getByRole("button", { name: t("Fermer", "Close") }).first(), { settle: 600 });
    if (await p.getByRole("dialog").isVisible()) {
      await p.keyboard.press("Escape");
      await r.wait(500);
    }
  });
  await r.step(8, async () => {
    const pill = p.getByTitle(t("Plateforme du site", "Site platform"));
    await r.during(p.getByRole("dialog").waitFor({ state: "hidden", timeout: 15_000 }).catch(() => {}));
    await r.click(pill, { settle: 900 });
    if (!(await p.getByRole("listbox").isVisible())) {
      await p.keyboard.press("Escape");
      await r.wait(500);
      await r.click(pill, { settle: 900 });
    }
    const rec = p.getByRole("listbox").getByRole("option").filter({ hasText: t("Conseillé", "Recommended") });
    await r.spot(rec, 4);
    await r.point(rec.getByText(t("Conseillé", "Recommended")));
    await r.wait(2200);
    await r.spot(null);
    await p.keyboard.press("Escape");
    await r.wait(400);
    await r.click(p.getByRole("button", { name: t("Exporter et installer", "Export and install") }), { settle: 1200 });
    await r.point(p.getByRole("dialog").getByRole("link").first());
    await r.wait(1200);
  }, { hold: 1200 });
  await p.keyboard.press("Escape");
}

/** Remet le site de démonstration dans son état d'origine : version 1 courante, versions et messages du tournage retirés. */
export async function cleanup({ projectId }: SceneCtx) {
  const { one, run } = await import("../../../src/lib/db");
  const v1 = one<{ id: string }>("SELECT id FROM theme_versions WHERE project_id = ? AND number = 1", projectId);
  if (!v1) return;
  run("UPDATE projects SET current_theme_version_id = ? WHERE id = ?", v1.id, projectId);
  run("DELETE FROM chat_messages WHERE project_id = ? AND thread = 'shop' AND created_at >= ?", projectId, startedAt);
  run("DELETE FROM theme_versions WHERE project_id = ? AND number > 1 AND created_at >= ?", projectId, startedAt);
}
