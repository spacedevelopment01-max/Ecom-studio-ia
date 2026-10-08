/**
 * Test navigateur réel du studio Réseaux sociaux V2 (phase 9A), sans aucun appel d'IA ni publication :
 *   EMAIL=… PASSWORD=… PROJECT=… BASE=http://localhost:3077 OUT=reports/screenshots/social-v2 npx tsx scripts/e2e-social-v2.ts
 * Le serveur tourne sur une base de démonstration (scripts/seed-social-demo.ts) avec SOCIAL_PUBLISH_DISABLED=1 et
 * SANS worker : rien ne peut partir sur un réseau. Parcours : Créer (14 jours × 2/jour, gratuit) → produire
 * gratuitement → calendrier mois / semaine / jour / liste → glisser-déposer → éditeur (modifier, enregistrer,
 * approuver, programmer) → modification après approbation (réapprobation exigée) → rechargement (tout est conservé)
 * → conversation (« Supprime les publications du dimanche ») → pause / reprise → comptes → statistiques → téléphone.
 */
import fs from "node:fs";
import { chromium, type BrowserContext, type Page } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3077";
const OUT = process.env.OUT ?? "reports/screenshots/social-v2";
const PROJECT = process.env.PROJECT!;
fs.mkdirSync(OUT, { recursive: true });
const results: [string, boolean, string][] = [];
const check = (name: string, okv: boolean, detail = "") => {
  results.push([name, okv, detail]);
  console.log(`${okv ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
};
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium" });
const errors: string[] = [];

async function login(ctx: BrowserContext) {
  await ctx.addInitScript(() => {
    try {
      sessionStorage.setItem("ecsSeen", "1");
      for (const t of ["produit", "calendrier", "publications", "pilote", "boutique", "connexions"]) localStorage.setItem(`ecs-tuto-seen-${t}`, "1");
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
type Post = { id: string; status: string; scheduledAt: number | null; caption: string; network: string; approvedValid: boolean; blocking: string[] };
type Overview = { posts: Post[]; stats: { counts: Record<string, number> } };
const overview = async (page: Page) => {
  const r = await page.request.get(`${BASE}/api/projects/${PROJECT}/social/v2?from=${Date.now() - 86_400_000}&to=${Date.now() + 60 * 86_400_000}`);
  return (await r.json()) as Overview;
};
const ymdParis = (ms: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(ms);
const dayOf = (ms: number) => new Date(`${ymdParis(ms)}T12:00:00Z`).getUTCDay();
const plusDays = (n: number) => ymdParis(Date.now() + n * 86_400_000);

const desk = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "fr-FR", timezoneId: "Europe/Paris" });
const page = await login(desk);
await page.goto(`${BASE}/studio/${PROJECT}/calendrier`, { waitUntil: "networkidle" });
const studio = page.locator("[data-social-studio]");
await studio.waitFor({ timeout: 30_000 });
check("Studio social V2 affiché dans l'onglet Calendrier", await studio.isVisible());

// Stratégie
await page.click("[data-section=strategie]");
const strat = page.locator("[data-social-strategy]");
await strat.waitFor();
check("Stratégie éditoriale (piliers, rien d'inventé annoncé)", /Stratégie éditoriale/.test(await strat.innerText()) && /rien n'est inventé/.test(await strat.innerText()));
await strat.screenshot({ path: `${OUT}/01-strategie.png` });

// Créer : 14 jours × 2 publications, Instagram + Facebook, gratuit.
await page.click("[data-section=creer]");
const create = page.locator("[data-social-create]");
await create.waitFor();
await page.fill("#s-start", plusDays(1));
await page.fill("#s-end", plusDays(14));
await page.click("[data-per-day='2']");
await create.screenshot({ path: `${OUT}/02-creer.png` });
await page.click("[data-action=plan]");
await create.getByText(/publications planifiées/).waitFor({ timeout: 30_000 });
let ov = await overview(page);
check("Planification gratuite : 28 publications (14 jours × 2)", ov.posts.length === 28, `${ov.posts.length}`);
const perDay = new Map<string, number>();
for (const p of ov.posts) perDay.set(ymdParis(p.scheduledAt!), (perDay.get(ymdParis(p.scheduledAt!)) ?? 0) + 1);
check("Exactement 2 publications par jour", [...perDay.values()].every((n) => n === 2) && perDay.size === 14, JSON.stringify([...perDay.values()]));
check("Statut initial « planifiée » (rien de programmé)", ov.posts.every((p) => p.status === "planned"));
await page.click("[data-action=produce-free]");
await create.locator("[data-produce-progress]").waitFor({ timeout: 30_000 }).catch(() => null);
await create.screenshot({ path: `${OUT}/02b-production.png` });
await create.locator("[data-produce-progress]").waitFor({ state: "detached", timeout: 600_000 });
ov = await overview(page);
check("Production gratuite par lots : publications avec visuel « à valider »", ov.posts.filter((p) => p.status === "review").length >= 20, JSON.stringify(ov.stats.counts));

// Calendrier : 4 vues.
await create.getByRole("button", { name: "Voir le calendrier" }).click().catch(() => page.click("[data-section=calendrier]"));
const cal = page.locator("[data-social-calendar]");
await cal.waitFor();
await page.waitForTimeout(800);
const first = [...ov.posts].sort((a, b) => a.scheduledAt! - b.scheduledAt!)[0];
// Le mois affiché est le mois courant : avancer si la première publication est le mois suivant.
if (ymdParis(first.scheduledAt!).slice(0, 7) !== ymdParis(Date.now()).slice(0, 7)) {
  await cal.getByRole("button", { name: "Suivant" }).click();
  await page.waitForTimeout(800);
}
check("Vue mois : publications visibles", (await cal.locator("[data-post]").count()) > 0, `${await cal.locator("[data-post]").count()} cartes`);
await cal.screenshot({ path: `${OUT}/03-calendrier-mois.png` });
const spill = await cal.evaluate((root) => Math.max(0, ...[...root.querySelectorAll("[data-day]")].flatMap((d) => [...d.querySelectorAll("[data-post]")].map((c) => Math.round(c.getBoundingClientRect().right - d.getBoundingClientRect().right)))));
check("Vue mois : chaque carte reste dans sa case", spill <= 0, `${spill}px`);
await page.click("[data-view=week]");
await page.waitForTimeout(600);
await cal.screenshot({ path: `${OUT}/04-calendrier-semaine.png` });
check("Vue semaine", (await cal.locator("[data-day]").count()) === 7);
await page.click("[data-view=day]");
await page.waitForTimeout(600);
check("Vue jour", (await cal.locator("[data-day]").count()) === 1);
await page.click("[data-view=list]");
await page.waitForTimeout(800);
check("Vue liste : publications triées", (await cal.locator("[data-post]").count()) >= 20, `${await cal.locator("[data-post]").count()}`);
await cal.screenshot({ path: `${OUT}/05-calendrier-liste.png` });

// Glisser-déposer (vue mois) : la première publication part 3 jours plus tard, même heure.
await page.click("[data-view=month]");
await page.waitForTimeout(800);
const from = ymdParis(first.scheduledAt!);
const target = ymdParis(first.scheduledAt! + 3 * 86_400_000);
const dropDay = (await cal.locator(`[data-day='${target}']`).count()) ? target : ymdParis(first.scheduledAt! - 86_400_000);
await cal.locator(`[data-post='${first.id}']`).dragTo(cal.locator(`[data-day='${dropDay}']`));
await page.waitForTimeout(1500);
ov = await overview(page);
const moved = ov.posts.find((p) => p.id === first.id)!;
check("Glisser-déposer : date changée, heure conservée", ymdParis(moved.scheduledAt!) === dropDay && new Date(moved.scheduledAt!).getUTCMinutes() === new Date(first.scheduledAt!).getUTCMinutes(), `${from} → ${ymdParis(moved.scheduledAt!)}`);

// Éditeur : modifier, enregistrer, approuver, programmer.
const target2 = ov.posts.find((p) => p.network === "instagram" && p.status === "review") ?? ov.posts.find((p) => p.status === "review")!;
await page.click("[data-view=list]");
await page.waitForTimeout(600);
await cal.locator(`[data-post='${target2.id}']`).click();
const ed = page.locator("[data-post-editor]");
await ed.waitFor();
await page.waitForTimeout(400);
await ed.screenshot({ path: `${OUT}/06-editeur.png` });
const newCaption = "Notre sérum en trois gestes simples, le matin comme le soir. Découvrez la routine complète sur notre boutique.";
await page.fill("#pe-cap", newCaption);
await page.fill("#pe-time", "19:15");
await page.click("[data-action=save-post]");
await page.waitForTimeout(1500);
ov = await overview(page);
let cur = ov.posts.find((p) => p.id === target2.id)!;
check("Modification manuelle enregistrée (légende + heure)", cur.caption === newCaption && new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" }).format(cur.scheduledAt!) === "19:15");
if (cur.blocking.length) console.log("  blocages :", cur.blocking.join(" | "));
await page.click("[data-action=approve-post]");
await page.waitForTimeout(1500);
cur = (await overview(page)).posts.find((p) => p.id === target2.id)!;
check("Approbation de cette version", cur.status === "approved" && cur.approvedValid, `${cur.status} ${cur.blocking.join(",")}`);
await page.click("[data-action=schedule-post]");
await page.waitForTimeout(1500);
cur = (await overview(page)).posts.find((p) => p.id === target2.id)!;
check("Programmation (compte simulé, aucun envoi)", cur.status === "scheduled", cur.status);
await ed.screenshot({ path: `${OUT}/07-editeur-programmee.png` });

// Modification après approbation : la version change → réapprobation exigée, plus programmée.
await page.fill("#pe-cap", `${newCaption} À très vite.`);
await page.click("[data-action=save-post]");
await page.waitForTimeout(1500);
cur = (await overview(page)).posts.find((p) => p.id === target2.id)!;
check("Modification après approbation : réapprobation exigée", cur.status === "review" && !cur.approvedValid, cur.status);
await page.click("[data-action=approve-post]");
await page.waitForTimeout(1200);
await page.click("[data-action=schedule-post]");
await page.waitForTimeout(1200);
await page.keyboard.press("Escape");

// Rechargement : tout est conservé.
await page.reload({ waitUntil: "networkidle" });
await studio.waitFor();
cur = (await overview(page)).posts.find((p) => p.id === target2.id)!;
check("Après rechargement : légende, statut et date conservés", cur.caption === `${newCaption} À très vite.` && cur.status === "scheduled");
await page.click("[data-view=list]");
await page.waitForTimeout(600);
const row = cal.locator(`[data-post='${target2.id}']`);
check("Badge « Programmée » dans la liste", /Programmée/.test(await row.innerText()));

// Conversation : suppression des dimanches (locale, gratuite).
const before = (await overview(page)).posts;
const sundays = before.filter((p) => dayOf(p.scheduledAt!) === 0 && !["scheduled", "published"].includes(p.status)).length;
await cal.locator("[data-social-chat] input").fill("Supprime les publications du dimanche");
await cal.locator("[data-social-chat]").getByRole("button", { name: "Envoyer" }).click();
await page.waitForTimeout(1800);
const after = (await overview(page)).posts;
check("Conversation « Supprime les publications du dimanche » (locale)", sundays > 0 && after.filter((p) => dayOf(p.scheduledAt!) === 0 && p.status !== "scheduled").length === 0, `${sundays} supprimées, ${before.length} → ${after.length}`);
await cal.screenshot({ path: `${OUT}/08-conversation.png` });

// Pause / reprise du calendrier.
await cal.getByRole("button", { name: "Mettre en pause" }).click();
await page.waitForTimeout(1000);
check("Calendrier en pause", await cal.getByRole("button", { name: "Reprendre" }).isVisible());
await cal.getByRole("button", { name: "Reprendre" }).click();
await page.waitForTimeout(1000);
check("Calendrier repris", await cal.getByRole("button", { name: "Mettre en pause" }).isVisible());

// Publications : filtres et actions groupées.
await page.click("[data-section=publications]");
const posts = page.locator("[data-social-posts]");
await posts.waitFor();
await page.click("[data-filter=scheduled]");
await page.waitForTimeout(400);
check("Filtre « Programmées »", (await posts.locator("[data-post]").count()) === 1);
await page.click("[data-filter=todo]");
await posts.screenshot({ path: `${OUT}/09-publications.png` });

// Comptes et statistiques.
await page.click("[data-section=comptes]");
const acc = page.locator("[data-social-accounts]");
await acc.waitFor();
const ig = await acc.locator("[data-platform-card=instagram]").innerText();
const li = await acc.locator("[data-platform-card=linkedin]").innerText();
const tk = await acc.locator("[data-platform-card=tiktok]").innerText();
check("Comptes : CONNECTÉ (simulé) / PRÊT À CONNECTER / EXPORT", /CONNECTÉ/.test(ig) && /PRÊT À CONNECTER/.test(tk) && /EXPORT/.test(li));
await acc.screenshot({ path: `${OUT}/10-comptes.png` });
await page.click("[data-section=stats]");
const st = page.locator("[data-social-stats]");
await st.waitFor();
const stx = await st.innerText();
check("Statistiques : aucune mesure inventée (indisponible / non connecté)", /indisponible|non connecté/.test(stx) && !/\b\d+ vues\b/.test(stx));
await st.screenshot({ path: `${OUT}/11-statistiques.png` });

// Aucune publication réelle.
const fin = await overview(page);
check("Aucune publication envoyée (0 publiée, 0 en cours)", (fin.stats.counts.published ?? 0) === 0 && (fin.stats.counts.publishing ?? 0) === 0);

// Téléphone.
const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "fr-FR", timezoneId: "Europe/Paris" });
const m = await login(phone);
await m.goto(`${BASE}/studio/${PROJECT}/calendrier`, { waitUntil: "networkidle" });
await m.locator("[data-social-studio]").waitFor({ timeout: 30_000 });
await m.waitForTimeout(800);
// Largeur réelle du studio et de la grille (un débordement masqué par un parent ne se voit pas dans scrollWidth).
const wide = () => m.evaluate<number>(`(() => {
  const right = (sel) => Math.max(0, ...[...document.querySelectorAll(sel)].map((e) => e.getBoundingClientRect().right));
  return Math.round(Math.max(document.documentElement.scrollWidth, right("[data-social-studio]"), right("[data-social-calendar] [data-day]"), right("[data-social-calendar] [data-post]")) - document.documentElement.clientWidth);
})()`);
let overflow = await wide();
check("Téléphone : calendrier sans débordement horizontal (page, studio, cases, cartes)", overflow <= 1, `${overflow}px`);
await m.screenshot({ path: `${OUT}/12-telephone-mois.png`, fullPage: false });
await m.click("[data-view=list]");
await m.waitForTimeout(600);
await m.screenshot({ path: `${OUT}/13-telephone-liste.png` });
await m.locator("[data-social-calendar] [data-post]").first().click();
await m.locator("[data-post-editor]").waitFor();
await m.waitForTimeout(500);
overflow = await m.evaluate(() => Math.round(Math.max(document.documentElement.scrollWidth, document.querySelector("[data-post-editor]")!.getBoundingClientRect().right) - document.documentElement.clientWidth));
check("Téléphone : éditeur utilisable (date et heure, sans débordement)", overflow <= 1 && (await m.locator("#pe-date").isVisible()), `${overflow}px`);
await m.screenshot({ path: `${OUT}/14-telephone-editeur.png` });

check("Aucune erreur JavaScript", errors.length === 0, errors.slice(0, 3).join(" | "));
await browser.close();
const ok = results.filter((r) => r[1]).length;
console.log(`\n${ok}/${results.length} vérifications réussies`);
fs.writeFileSync(`${OUT}/resultats.json`, JSON.stringify(results, null, 2));
process.exit(ok === results.length ? 0 : 1);
