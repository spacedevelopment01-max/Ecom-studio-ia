/**
 * Test navigateur réel de l'éditeur de site Theme Engine V2 (phase 10A), sans aucun appel d'IA :
 *   DATA_DIR=… EMAIL=… PASSWORD=… PROJECT=… BASE=http://localhost:3077 OUT=reports/screenshots/theme-v2/editeur \
 *     npx tsx scripts/e2e-theme-v2.ts
 * Le serveur (next start) et le worker tournent sur une base de démonstration (scripts/seed-theme-demo.ts) avec un
 * compte en découverte gratuite : toutes les retouches passent par le moteur local.
 * Parcours (section 35) : ouvrir le projet → aperçu (ordinateur, tablette, téléphone) → choisir une page → modifier
 * un texte désigné → remplacer une image désignée → couleur des boutons → typographie → disposition d'une section →
 * déplacer / ajouter / supprimer une section → réglage d'un bouton → enregistrement automatique (versions) →
 * rechargement (tout est conservé) → restaurer une version → exporter (Shopify, WooCommerce, PrestaShop, kits).
 */
import fs from "node:fs";
import { unzipSync, strFromU8 } from "fflate";
import { chromium, type BrowserContext, type Page } from "playwright";
import { all, one } from "@/lib/db";
import { currentTheme } from "@/lib/projects";

const BASE = process.env.BASE ?? "http://localhost:3077";
const OUT = process.env.OUT ?? "reports/screenshots/theme-v2/editeur";
const PROJECT = process.env.PROJECT!;
fs.mkdirSync(OUT, { recursive: true });
const results: [string, boolean, string][] = [];
const check = (name: string, okv: boolean, detail = "") => {
  results.push([name, okv, detail]);
  console.log(`${okv ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
};
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium" });
const errors: string[] = [];
const spec = () => currentTheme(PROJECT)!.spec;
const versionNo = () => currentTheme(PROJECT)!.version.number;
const idx = () => spec().templates.index;
const homeTypes = () => idx().order.map((id) => idx().sections[id].type);

async function login(ctx: BrowserContext) {
  await ctx.addInitScript(() => {
    try {
      sessionStorage.setItem("ecsSeen", "1");
      for (const t of ["produit", "boutique", "site", "marque", "visuels"]) localStorage.setItem(`ecs-tuto-seen-${t}`, "1");
    } catch {}
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${BASE}/connexion`, { waitUntil: "networkidle" });
  await page.fill("#email", process.env.EMAIL!);
  await page.fill("#password", process.env.PASSWORD!);
  await Promise.all([page.waitForURL(/studio/), page.click("button[type=submit]")]);
  return page;
}

/** Attend la réponse du studio à une demande (nouveau message de l'assistant, tâche du worker terminée). */
async function waitReply(before: number, timeout = 60_000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const n = one<{ n: number }>("SELECT COUNT(*) AS n FROM chat_messages WHERE project_id = ? AND thread = 'shop' AND role = 'assistant'", PROJECT)!.n;
    if (n > before) return all<{ content: string }>("SELECT content FROM chat_messages WHERE project_id = ? AND thread = 'shop' AND role = 'assistant' ORDER BY created_at DESC LIMIT 1", PROJECT)[0].content;
    await new Promise((r) => setTimeout(r, 500));
  }
  return null;
}
const assistantCount = () => one<{ n: number }>("SELECT COUNT(*) AS n FROM chat_messages WHERE project_id = ? AND thread = 'shop' AND role = 'assistant'", PROJECT)!.n;

async function ask(page: Page, text: string) {
  const before = assistantCount();
  await page.getByLabel("Votre demande").fill(text);
  await page.getByRole("button", { name: "Envoyer" }).click();
  const reply = await waitReply(before);
  await page.waitForTimeout(1500); // rechargement de l'aperçu
  return reply;
}
const preview = (page: Page) => page.frameLocator("iframe[title='Aperçu de la boutique']").first();

/** Désigne un élément de l'aperçu (comme le client : bouton « Désigner », puis clic dans l'aperçu). */
async function designate(page: Page, selector: string) {
  await page.getByRole("button", { name: /^Désigner$/ }).click();
  // L'aperçu « ordinateur » est réduit à l'échelle (transform) : le clic est envoyé dans la page de l'aperçu, au
  // centre de l'élément, exactement comme un clic de souris (événement « click » avec ses coordonnées).
  await page.waitForTimeout(300);
  await preview(page).locator(selector).first().evaluate((el) => {
    el.scrollIntoView({ block: "center" });
    const r = el.getBoundingClientRect();
    el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 }));
  });
  await page.waitForTimeout(600);
}

const desk = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "fr-FR", acceptDownloads: true });
const page = await login(desk);
const ai0 = one<{ n: number }>("SELECT COUNT(*) AS n FROM ai_calls")!.n;

// 1. Ouvrir le projet, aperçu réel.
await page.goto(`${BASE}/studio/${PROJECT}/boutique`, { waitUntil: "networkidle" });
const frame = preview(page);
await frame.locator("[data-es-type='v2-hero']").first().waitFor({ timeout: 30_000 });
check("Projet ouvert : aperçu du site V2 affiché (ouverture V2 rendue dans l'aperçu)", true);
const panel = page.locator("[data-v2-panel]");
const panelText = await panel.innerText().catch(() => "");
check("Panneau Theme Engine V2 : langage visuel et plan des pages", (await panel.count()) > 0 && (await page.locator("[data-v2-language]").count()) > 0, panelText.replace(/\s+/g, " ").slice(0, 160));
await page.screenshot({ path: `${OUT}/01-editeur-ordinateur.png` });

// 2. Aperçu ordinateur / tablette / téléphone.
for (const [d, file] of [["Tablette", "02-apercu-tablette"], ["Téléphone", "03-apercu-telephone"], ["Ordinateur", ""]] as const) {
  const b = page.locator(`[role=group][aria-label=Appareil] button[title='${d}']`);
  if (await b.count()) {
    await b.click();
    await page.waitForTimeout(900);
    if (file) await page.screenshot({ path: `${OUT}/${file}.png` });
  }
}
check("Aperçu par appareil (ordinateur, tablette, téléphone)", fs.existsSync(`${OUT}/02-apercu-tablette.png`) && fs.existsSync(`${OUT}/03-apercu-telephone.png`));

// 3. Choisir une page : la fiche produit puis retour à l'accueil.
const pageSelect = page.getByLabel("Page affichée");
const opts = await pageSelect.locator("option").allTextContents();
const productOpt = await pageSelect.locator("option").evaluateAll((os) => (os as HTMLOptionElement[]).map((o) => o.value).find((v) => v.includes("/products/")));
if (productOpt) {
  await pageSelect.selectOption(productOpt);
  await preview(page).locator("[data-es-type='main-product']").first().waitFor({ timeout: 20_000 });
  await page.screenshot({ path: `${OUT}/04-page-produit.png` });
}
check("Choix de la page affichée (fiche produit)", !!productOpt, opts.join(" | "));
await pageSelect.selectOption("/");
await frame.locator("[data-es-type='v2-hero']").first().waitFor({ timeout: 20_000 });

// 4. Modifier un texte désigné (moteur local : texte entre guillemets dans l'élément désigné).
const vText = versionNo();
await designate(page, "[data-es-type='v2-cta'] h2");
const r1 = await ask(page, "Remplace par « Votre sérum vous attend »");
const ctaHeading = Object.values(idx().sections).find((s) => s.type === "v2-cta")?.settings.heading;
check("Texte désigné modifié sans IA, nouvelle version enregistrée", ctaHeading === "Votre sérum vous attend" && versionNo() > vText, `${r1?.slice(0, 80)} · titre = ${ctaHeading}`);
await preview(page).locator("[data-es-type='v2-cta']").first().screenshot({ path: `${OUT}/05-texte-modifie.png` }).catch(() => {});

// 5. Remplacer une image désignée par une image du projet.
const heroImg0 = Object.values(idx().sections).find((s) => s.type === "v2-split")?.settings.image_asset;
await designate(page, "[data-es-type='v2-split'] img");
const replaceBtn = page.getByRole("button", { name: "Remplacer par une image du projet" });
let imgOk = false;
let imgDetail = "désignation d'image non reconnue";
if (await replaceBtn.count()) {
  await replaceBtn.click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor({ timeout: 10_000 });
  const tiles = dialog.locator("button[aria-pressed]:has(img)");
  await tiles.first().waitFor({ timeout: 10_000 }).catch(() => {});
  const n = await tiles.count();
  // Une autre image que celle en place (le flacon détouré ou le visuel principal).
  for (let i = 0; i < n; i++) {
    const alt = (await tiles.nth(i).locator("img").getAttribute("alt")) ?? "";
    if (/flacon-detoure|packshot/i.test(alt) || i === n - 1) {
      await tiles.nth(i).click();
      break;
    }
  }
  await page.waitForTimeout(400);
  await dialog.getByRole("button", { name: /Utiliser ce média/ }).click();
  await page.waitForTimeout(400);
  const r2 = await ask(page, "Remplace cette image par celle-ci");
  const after = Object.values(idx().sections).find((s) => s.type === "v2-split")?.settings.image_asset;
  imgOk = !!after && after !== heroImg0;
  imgDetail = `${r2?.slice(0, 80)} · ${heroImg0} → ${after}`;
}
check("Image désignée remplacée par une image du projet (sans IA)", imgOk, imgDetail);
await preview(page).locator("[data-es-type='v2-split']").first().screenshot({ path: `${OUT}/06-image-remplacee.png` }).catch(() => {});

// 6. Couleur des boutons.
const acc0 = (spec().settings.color_schemes as Record<string, { settings: Record<string, string> }>)["scheme-1"].settings.accent;
const r3 = await ask(page, "Mets les boutons en vert sapin");
const acc1 = (spec().settings.color_schemes as Record<string, { settings: Record<string, string> }>)["scheme-1"].settings.accent;
check("Couleur des boutons changée (moteur local)", acc1 !== acc0, `${acc0} → ${acc1} · ${r3?.slice(0, 60)}`);
await page.screenshot({ path: `${OUT}/07-couleur.png` });

// 7. Typographie (association suivante du Theme Engine V2).
const f0 = spec().settings.type_heading_font;
const r4 = await ask(page, "Change la typographie");
const f1 = spec().settings.type_heading_font;
check("Typographie changée (association V2, sans IA)", f1 !== f0, `${f0} → ${f1} · ${r4?.slice(0, 60)}`);

// 8. Disposition d'une section (une seule section change).
const lay0 = Object.values(idx().sections).find((s) => s.type === "v2-cta")?.settings.layout;
const r5 = await ask(page, "Change la disposition de l'appel final");
const lay1 = Object.values(idx().sections).find((s) => s.type === "v2-cta")?.settings.layout;
check("Disposition d'une section changée (cette section seulement)", lay1 !== lay0, `${lay0} → ${lay1} · ${r5?.slice(0, 60)}`);
await page.screenshot({ path: `${OUT}/08-typo-disposition.png` });

// 9. Ajouter une section (conversation) — contenu de départ « [À compléter] », rien d'inventé.
const n0 = idx().order.length;
const r6 = await ask(page, "Ajoute une FAQ");
check("Section ajoutée (FAQ V2, contenu « À compléter »)", idx().order.length === n0 + 1 && homeTypes().includes("v2-faq") && /À compléter/.test(JSON.stringify(idx())), `${r6?.slice(0, 60)} · ${homeTypes().join(" › ")}`);

// 10. Déplacer une section (panneau Structure : « Monter »).
const order0 = homeTypes().join(">");
const structure = page.getByRole("region", { name: "Structure" }).or(page.locator("section[aria-label=Structure]"));
const faqRow = structure.locator("li", { hasText: "Questions V2" }).first();
await faqRow.hover().catch(() => {});
await faqRow.getByRole("button", { name: "Monter" }).click({ force: true }).catch(() => {});
await page.waitForTimeout(2500);
check("Section déplacée depuis le panneau Structure", homeTypes().join(">") !== order0, `${order0} → ${homeTypes().join(">")}`);

// 11. Supprimer une section (avec confirmation).
page.once("dialog", (d) => d.accept());
const nBefore = idx().order.length;
await faqRow.hover().catch(() => {});
await structure.locator("li", { hasText: "Questions V2" }).first().getByRole("button", { name: "Supprimer la section" }).click({ force: true }).catch(() => {});
await page.waitForTimeout(2500);
check("Section supprimée (versionnée, réversible)", idx().order.length === nBefore - 1, `${nBefore} → ${idx().order.length}`);

// 12. Réglage d'un bouton (texte du bouton désigné).
await designate(page, "[data-es-type='v2-hero'] a.v2-btn");
const r7 = await ask(page, "Remplace par « Découvrir le sérum »");
const hero = idx().sections[idx().order[0]];
check("Bouton désigné modifié (libellé)", hero.settings.button_label === "Découvrir le sérum" || hero.settings.button2_label === "Découvrir le sérum", `${r7?.slice(0, 60)} · ${hero.settings.button_label}`);
await preview(page).locator("[data-es-type='v2-hero']").first().screenshot({ path: `${OUT}/09-bouton.png` }).catch(() => {});

// 13. Rechargement : tout est conservé.
const vBefore = versionNo();
await page.reload({ waitUntil: "networkidle" });
await preview(page).locator("[data-es-type='v2-hero']").first().waitFor({ timeout: 30_000 });
const heroText = await preview(page).locator("[data-es-type='v2-hero']").first().innerText();
const ctaText = await preview(page).locator("[data-es-type='v2-cta']").first().innerText();
check("Après rechargement, les modifications sont conservées (aperçu)", /Découvrir le sérum/i.test(heroText) && /Votre sérum vous attend/i.test(ctaText) && versionNo() === vBefore);
await page.screenshot({ path: `${OUT}/10-apres-rechargement.png` });

// 14. Versions : restaurer la version d'origine.
await page.getByTitle("Versions").click();
const modal = page.getByRole("dialog");
await modal.waitFor();
await modal.screenshot({ path: `${OUT}/11-versions.png` });
const versions = modal.locator("li, [data-version]");
const nv = await versions.count();
await versions.last().getByRole("button").first().click().catch(() => {});
await page.waitForTimeout(1200);
const restore = page.getByRole("button", { name: "Restaurer celle-ci" });
let restored = false;
if (await restore.count()) {
  await restore.click();
  await page.waitForTimeout(2500);
  const first = Object.values(idx().sections).find((s) => s.type === "v2-cta")?.settings.heading;
  restored = first !== "Votre sérum vous attend" && versionNo() > vBefore;
}
check("Restaurer une version (une nouvelle version est créée)", restored, `${nv} version(s) listée(s), version actuelle n°${versionNo()}`);
await page.screenshot({ path: `${OUT}/12-version-restauree.png` });

// 15. Export : Shopify (ZIP OS 2.0), WooCommerce, PrestaShop, kits Wix / Squarespace.
const exp = async (platform: string) => {
  const r = await page.request.get(`${BASE}/api/projects/${PROJECT}/theme/export?platform=${platform}`);
  return { status: r.status(), type: r.headers()["content-type"] ?? "", body: Buffer.from(await r.body()) };
};
// Découverte gratuite : l'export est réservé aux forfaits (règle du produit) — vérifié, puis forfait « Créer »
// attribué à la main pour tester l'export (aucun fournisseur d'IA n'est configuré sur cette base : toujours 0 €).
const blocked = await exp("shopify");
check("Découverte gratuite : export refusé (réservé aux forfaits)", blocked.status === 402, `${blocked.status}`);
const { run } = await import("@/lib/db");
const uid = one<{ user_id: string }>("SELECT user_id FROM projects WHERE id = ?", PROJECT)!.user_id;
run("UPDATE subscriptions SET status = 'active', plan = 'creer' WHERE user_id = ?", uid);
const shop = await exp("shopify");
let shopOk = false;
if (shop.status === 200) {
  const z = unzipSync(new Uint8Array(shop.body));
  const tpl = JSON.parse(strFromU8(z["templates/index.json"]).replace(/^\s*\/\*[\s\S]*?\*\/\s*/, ""));
  shopOk = !!z["sections/v2-hero.liquid"] && !!z["assets/theme-v2.css"] && Object.values(tpl.sections as Record<string, { type: string }>).some((s) => s.type === "v2-hero") && strFromU8(z["config/settings_data.json"]).includes("ds_language");
}
check("Export Shopify : ZIP OS 2.0 avec les sections et le design system V2", shopOk, `${shop.status} · ${Math.round(shop.body.length / 1024)} Ko`);
for (const pf of ["woocommerce", "prestashop", "wix", "squarespace"]) {
  const r = await exp(pf);
  let detail = `${r.status} ${r.type}`;
  let okv = r.status === 200 && r.body.length > 0;
  if (okv && /zip/.test(r.type)) {
    const z = unzipSync(new Uint8Array(r.body));
    detail += ` · ${Object.keys(z).length} fichier(s) : ${Object.keys(z).slice(0, 6).join(", ")}`;
  }
  check(`Export ${pf} (${pf === "wix" || pf === "squarespace" ? "kit, pas un thème natif" : "ce qui est implémenté"})`, okv, detail);
}
await page.getByTitle(/Exporter/).first().click().catch(() => {});
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/13-export.png` });
await page.keyboard.press("Escape").catch(() => {});

// 16. Téléphone : l'éditeur reste utilisable (onglets Discussion / Aperçu / Structure).
const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "fr-FR" });
const mp = await login(phone);
await mp.goto(`${BASE}/studio/${PROJECT}/boutique`, { waitUntil: "networkidle" });
await mp.getByRole("tab", { name: /Aperçu/ }).click().catch(() => {});
await mp.waitForTimeout(1500);
await mp.screenshot({ path: `${OUT}/14-telephone-apercu.png` });
await mp.getByRole("tab", { name: /Structure/ }).click().catch(() => {});
await mp.waitForTimeout(800);
await mp.screenshot({ path: `${OUT}/15-telephone-structure.png` });
const hOverflow = (await mp.evaluate("document.documentElement.scrollWidth > innerWidth + 1")) as boolean;
check("Téléphone : éditeur sans débordement horizontal", !hOverflow);

const aiSpent = one<{ n: number }>("SELECT COUNT(*) AS n FROM ai_calls")!.n - ai0;
check("Aucun appel d'IA pendant tout le parcours", aiSpent === 0, `${aiSpent}`);
check("Aucune erreur JavaScript dans le studio", errors.length === 0, errors.slice(0, 3).join(" | "));

await browser.close();
const passed = results.filter((r) => r[1]).length;
fs.writeFileSync(`${OUT}/resultats.json`, JSON.stringify({ passed, total: results.length, results: results.map(([name, okv, detail]) => ({ name, ok: okv, detail })) }, null, 2));
console.log(`\n${passed}/${results.length} vérifications réussies`);
process.exit(passed === results.length ? 0 : 1);
