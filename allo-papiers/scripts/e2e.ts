/**
 * Parcours navigateur de bout en bout (Chromium, profil téléphone Android + ordinateur).
 * Prérequis : site lancé en local (npm run dev) avec DEMO_MODE=true et sans clé Resend
 * (les emails sont alors écrits dans .data/outbox, ce qui permet de lire les liens et codes).
 * Usage : BASE=http://localhost:3100 npx tsx scripts/e2e.ts
 */
import { chromium, devices, type Browser, type Page } from "playwright";
import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { PDFDocument, StandardFonts } from "pdf-lib";

const BASE = process.env.BASE ?? "http://localhost:3100";
const OUT = process.env.SHOTS ?? "/tmp/claude-0/shots/e2e";
mkdirSync(OUT, { recursive: true });
const outbox = path.join(process.cwd(), ".data", "outbox");
let step = 0;
const results: { name: string; ok: boolean; detail?: string }[] = [];

let current: Page | null = null;
async function check(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`✔ ${name}`);
  } catch (e) {
    results.push({ name, ok: false, detail: e instanceof Error ? e.message.split("\n")[0] : String(e) });
    if (current) await current.screenshot({ path: path.join(OUT, `echec-${results.length}.png`) }).catch(() => {});
    console.log(`✘ ${name} — ${e instanceof Error ? e.message.split("\n")[0] : e}`);
  }
}

function lastMail(to: string) {
  const mails = readdirSync(outbox)
    .sort()
    .map((f) => JSON.parse(readFileSync(path.join(outbox, f), "utf8")))
    .filter((m) => m.to === to);
  if (!mails.length) throw new Error(`aucun email pour ${to}`);
  return mails[mails.length - 1] as { subject: string; text: string };
}

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(OUT, `${String(++step).padStart(2, "0")}-${name}.png`) });
}

async function login(page: Page, email: string) {
  await page.goto(`${BASE}/connexion`);
  await page.fill("#email", email);
  await page.check('input[type="checkbox"]');
  await page.click("text=Recevoir mon lien de connexion");
  await page.waitForSelector("text=Regardez votre boîte email");
  await page.waitForTimeout(300);
  const link = /(http\S+connexion\/verifier#\S+)/.exec(lastMail(email).text)![1];
  await page.goto(link);
  await page.click("text=Me connecter");
  await page.waitForURL(/\/espace/);
}

async function makeAssets() {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
  const p = await browser.newPage({ viewport: { width: 1240, height: 1754 } });
  await p.setContent(`<body style="font-family:Arial;padding:90px;font-size:30px;line-height:1.5;background:#fff">
    <h2>CAISSE D'EXEMPLE (document fictif de test)</h2><p>Le 2 octobre 2026</p><p>Objet : mise à jour de votre dossier</p>
    <p>Madame, Monsieur,</p><p>Merci de nous transmettre votre dernier avis d'imposition avant le 24 octobre 2026.</p>
    ${"<p>Texte complémentaire de test pour remplir la page et vérifier la lecture.</p>".repeat(8)}</body>`);
  const jpg = path.join(OUT, "courrier-test.jpg");
  await p.screenshot({ path: jpg, type: "jpeg", quality: 85, fullPage: true });
  await browser.close();
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= 2; i++) pdf.addPage().drawText(`Page ${i} - document PDF fictif de test`, { x: 60, y: 760, size: 18, font });
  const pdfPath = path.join(OUT, "courrier-test.pdf");
  (await import("node:fs")).writeFileSync(pdfPath, await pdf.save());
  return { jpg, pdfPath };
}

async function main() {
  // Base locale de test uniquement : remise à zéro des compteurs anti-abus (sinon la limite de
  // 10 demandes de lien par heure et par IP bloque les lancements successifs du test).
  const env = readFileSync(".env.local", "utf8");
  const dbUrl = /^DATABASE_URL=(.*)$/m.exec(env)?.[1];
  if (dbUrl && /127\.0\.0\.1|localhost/.test(dbUrl)) {
    const postgres = (await import("postgres")).default;
    const db = postgres(dbUrl, { max: 1 });
    await db`delete from rate_limits`;
    await db.end();
  }
  const { jpg, pdfPath } = await makeAssets();
  const browser: Browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
  const mobile = await browser.newContext({ ...devices["Pixel 7"], locale: "fr-FR", timezoneId: "Europe/Paris" });
  const page = await mobile.newPage();
  current = page;
  const consoleErrors: string[] = [];
  page.on("pageerror", (e) => consoleErrors.push(e.message));
  const emailA = `alice.${Date.now()}@exemple.fr`;
  let docId = "";
  let letterUrl = "";

  await check("Pages publiques : mention d'indépendance en bas de chaque page, pas de débordement", async () => {
    for (const p of ["/", "/exemples/caf-justificatifs", "/exemples/amende-stationnement", "/aide", "/mentions-legales", "/confidentialite", "/conditions", "/orientation"]) {
      await page.goto(`${BASE}${p}`);
      const footer = await page.textContent("footer");
      if (!footer?.includes("Allô Papiers est un service privé indépendant, non affilié à l'administration.")) throw new Error(`mention absente sur ${p}`);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      if (overflow > 0) throw new Error(`débordement horizontal de ${overflow}px sur ${p}`);
      if ((await page.content()).match(/Gros caractères|Lire les explications/)) throw new Error("bouton supprimé réapparu");
    }
    await page.goto(`${BASE}/exemples/caf-justificatifs`);
    await shot(page, "exemple-mobile");
  });

  await check("Accès protégé : /nouveau redirige vers la connexion", async () => {
    await page.goto(`${BASE}/nouveau`);
    await page.waitForURL(/\/connexion\?suite=/);
  });

  await check("Connexion par lien magique (lien à usage unique)", async () => {
    await login(page, emailA);
    await shot(page, "espace-bienvenue");
    // Le même lien ne fonctionne pas deux fois
    const link = /(http\S+connexion\/verifier#\S+)/.exec(lastMail(emailA).text)![1];
    const p2 = await mobile.newPage();
    await p2.goto(link);
    await p2.click("text=Me connecter");
    await p2.waitForSelector("text=expiré ou a déjà été utilisé");
    await p2.close();
  });

  await check("Nouveau document : photo + PDF, contrôle de qualité, gestion des pages", async () => {
    await page.goto(`${BASE}/nouveau`);
    await page.click("text=Courrier du quotidien");
    await page.setInputFiles('input[aria-label="Importer des fichiers"]', [jpg, pdfPath]);
    await page.waitForSelector("text=PDF · 2 pages", { timeout: 30000 });
    await page.waitForSelector("text=Page 1");
    await shot(page, "nouveau-pages");
    const list = await (await page.request.get(`${BASE}/api/documents`)).json();
    if (list.documents.length !== 1 || list.documents[0].page_count !== 3) throw new Error(`les pages importées ensemble n'ont pas formé un seul document (${list.documents.length} documents)`);
    const plusLocked = await page.locator("button:has-text('Fiche de paie') >> text=Plus").count();
    if (!plusLocked) throw new Error("le parcours Plus n'est pas signalé comme réservé");
  });

  await check("Analyse (mode démonstration, clairement signalée) et page de résultat", async () => {
    await page.check("text=J'accepte que mon document soit transmis");
    await page.click("text=Analyser ce document");
    await page.waitForURL(/\/documents\/[0-9a-f-]{36}$/, { timeout: 60000 });
    docId = page.url().split("/").pop()!;
    await page.waitForSelector("text=Résultat simulé");
    for (const t of ["En bref", "Date limite", "Les étapes, une par une", "Si vous ne faites rien", "Répondre", "Adresse et coordonnées", "ne remplace pas un avocat"]) {
      if (!(await page.locator(`text=${t}`).count())) throw new Error(`section absente : ${t}`);
    }
    await shot(page, "resultat-haut");
  });

  await check("Étapes cochées conservées côté serveur", async () => {
    const box = page.locator('section:has-text("Les étapes") input[type="checkbox"]').first();
    await Promise.all([page.waitForResponse((r) => r.url().endsWith("/checklist") && r.ok()), box.check()]);
    await page.reload();
    if (!(await page.locator('section:has-text("Les étapes") input[type="checkbox"]').first().isChecked())) throw new Error("étape non conservée");
  });

  await check("Rappel programmé seulement après confirmation de la date", async () => {
    await page.click("text=J'ai vérifié cette date : programmer des rappels");
    await page.waitForSelector("text=Date confirmée");
    await page.goto(`${BASE}/rappels`);
    await page.waitForSelector("text=Rappels effectivement programmés");
    await shot(page, "rappels");
  });

  await check("Coffre-fort : originaux accessibles seulement après vérification par code", async () => {
    await page.goto(`${BASE}/documents/${docId}`);
    await page.click("text=Voir les pages originales");
    await page.waitForSelector("text=Confirmez que c'est bien vous");
    await shot(page, "verification-renforcee");
    await page.click("text=Recevoir un code par email");
    await page.waitForSelector("text=Un code à 6 chiffres vient d'être envoyé");
    const code = /(\d{6})/.exec(lastMail(emailA).subject)![1];
    await page.fill("#code-email", code);
    await page.click("button:has-text('Valider')");
    await page.waitForSelector('img[alt^="Page originale"]', { timeout: 20000 });
  });

  await check("Brouillon → courrier modifiable, relecture obligatoire, PDF réel", async () => {
    await page.click("text=Modifier et exporter");
    await page.waitForURL(/\/courriers\/[0-9a-f-]{36}$/);
    letterUrl = page.url();
    const pdfBlocked = await page.request.get(`${letterUrl.replace("/courriers/", "/api/letters/")}/pdf`);
    if (pdfBlocked.status() !== 409) throw new Error(`PDF accessible sans relecture (${pdfBlocked.status()})`);
    await page.fill("#body", (await page.inputValue("#body")) + "\n\nPhrase ajoutée par l'utilisateur.");
    await page.fill('input[aria-label="Expéditeur – nom"]', "Alice Test");
    await page.fill('input[aria-label="Expéditeur – adresse"]', "3 rue des Lilas");
    await page.fill('input[aria-label="Expéditeur – code postal"]', "75011");
    await page.fill('input[aria-label="Expéditeur – ville"]', "Paris");
    await page.fill('input[aria-label="Destinataire – nom"]', "Caisse d'exemple");
    await page.fill('input[aria-label="Destinataire – adresse"]', "1 rue Imaginaire");
    await page.fill('input[aria-label="Destinataire – code postal"]', "69001");
    await page.fill('input[aria-label="Destinataire – ville"]', "Lyon");
    // L'adresse saisie contredit celle du courrier : une vérification explicite est exigée
    await page.waitForSelector("text=Adresses différentes");
    await page.check("text=J'ai vérifié : cette adresse est la bonne.");
    await page.waitForSelector("text=Enregistré", { timeout: 10000 });
    await page.check("text=J'ai relu ce courrier en entier");
    await page.waitForTimeout(600);
    const pdf = await page.request.get(`${letterUrl.replace("/courriers/", "/api/letters/")}/pdf`);
    if (pdf.headers()["content-type"] !== "application/pdf") throw new Error(`PDF non produit (${pdf.status()})`);
    const body = await pdf.body();
    if (body.subarray(0, 5).toString() !== "%PDF-") throw new Error("fichier PDF invalide");
    await page.reload();
    if (!(await page.inputValue("#body")).includes("Phrase ajoutée par l'utilisateur.")) throw new Error("modification non conservée");
    await shot(page, "courrier-editeur");
  });

  await check("Recommandé : récapitulatif complet, case obligatoire, aucun envoi sans paiement confirmé", async () => {
    if (!(await page.locator("text=J'ai relu ce courrier en entier").isChecked())) {
      await page.check("text=J'ai relu ce courrier en entier");
      await page.waitForTimeout(500);
    }
    await page.click("text=Préparer l'envoi recommandé");
    await page.waitForURL(/\/envois\//);
    await page.waitForSelector("text=Prix total", { timeout: 30000 });
    for (const t of ["MODE TEST", "Texte final", "Destinataire et adresse", "Pièces jointes", "Prix total", "Nature de l'envoi", "J'ai relu et je valide cet envoi en mon nom"]) {
      if (!(await page.locator(`text=${t}`).count())) throw new Error(`élément absent du récapitulatif : ${t}`);
    }
    if (await page.locator("button:has-text('Envoyer')").isEnabled()) throw new Error("bouton Envoyer actif sans case cochée");
    await shot(page, "envoi-recapitulatif");
    await page.check("text=J'ai relu et je valide cet envoi en mon nom");
    await page.click("button:has-text('Envoyer')");
    await page.waitForSelector("text=STRIPE_SECRET_KEY", { timeout: 15000 }); // paiements non configurés en local
    const sendId = page.url().split("/").pop()!.split("?")[0];
    const s = await (await page.request.get(`${BASE}/api/sends/${sendId}`)).json();
    if (s.send.status === "submitted" || s.send.trackingNumber) throw new Error("un envoi a été déclenché sans paiement confirmé");
  });

  await check("Rédaction guidée sans document (démission CDI)", async () => {
    await page.goto(`${BASE}/courriers`);
    await page.fill('input[placeholder^="Ex. démission"]', "démission");
    await page.click("text=Démission d'un CDI");
    await page.waitForURL(/\/courriers\/nouveau\//);
    await shot(page, "rediger-demission");
    for (let i = 0; i < 6; i++) {
      for (const el of await page.locator("form input[type=text]:visible, form textarea:visible").all()) if (!(await el.inputValue())) await el.fill("Test");
      for (const el of await page.locator("form input[type=date]:visible").all()) await el.fill("2026-11-02");
      for (const el of await page.locator("form select:visible").all()) await el.selectOption({ index: 1 });
      const radios = page.locator("form fieldset:has(input[type=radio])");
      for (let r = 0; r < (await radios.count()); r++) await radios.nth(r).locator("input[type=radio]").first().check();
      if (await page.locator("text=Préparer mon courrier").count()) {
        await page.click("text=Préparer mon courrier");
        break;
      }
      await page.click("button:has-text('Continuer')");
    }
    await page.waitForURL(/\/courriers\/[0-9a-f-]{36}$/);
    const text = await page.inputValue("#body");
    if (!/démission/i.test(text)) throw new Error("courrier de démission non généré");
  });

  await check("Dossier : création, pièce manquante, chronologie, « Mon problème est réglé »", async () => {
    await page.goto(`${BASE}/dossiers`);
    await page.click("text=Nouveau dossier");
    await page.fill("#f-name", "Dossier de test CAF");
    await page.click("button:has-text('Créer')");
    await page.waitForURL(/\/dossiers\/[0-9a-f-]{36}$/);
    await page.fill('input[aria-label="Nouvelle pièce"]', "Avis d'imposition");
    await page.click('button[aria-label="Ajouter la pièce"]');
    await page.waitForSelector("text=Manquante");
    await page.fill('input[aria-label="Description"]', "Courrier reçu de la caisse");
    await page.click("form >> button:has-text('Ajouter')");
    await page.waitForSelector("text=Courrier reçu de la caisse");
    await page.click("text=Mon problème est réglé");
    await page.waitForSelector("text=Réglé le");
    await shot(page, "dossier");
  });

  await check("Fiche de rendez-vous et export PDF", async () => {
    await page.goto(`${BASE}/rendez-vous`);
    await page.click("text=Créer la fiche");
    await page.waitForURL(/\/rendez-vous\/[0-9a-f-]{36}$/);
    await page.waitForSelector("text=Aucun rendez-vous n'est réservé");
    const id = page.url().split("/").pop();
    const pdf = await page.request.get(`${BASE}/api/appointments/${id}/pdf`);
    if (pdf.headers()["content-type"] !== "application/pdf") throw new Error("PDF de fiche non produit");
  });

  await check("Verrouillage après inactivité (contrôlé par le serveur)", async () => {
    await page.request.post(`${BASE}/api/auth/lock`, { headers: { origin: BASE } });
    await page.goto(`${BASE}/espace`);
    await page.waitForURL(/\/deverrouiller/);
    const api = await page.request.get(`${BASE}/api/documents`);
    if (api.status() !== 423) throw new Error(`API accessible session verrouillée (${api.status()})`);
    await shot(page, "verrouille");
  });

  await check("Isolation : un second compte n'accède à rien du premier", async () => {
    const desk = await browser.newContext({ viewport: { width: 1366, height: 860 }, locale: "fr-FR" });
    const p = await desk.newPage();
    await login(p, `bob.${Date.now()}@exemple.fr`);
    for (const url of [`/api/documents/${docId}`, `/api/documents/${docId}/chat`, `${letterUrl.replace(BASE, "").replace("/courriers/", "/api/letters/")}`]) {
      const r = await p.request.get(`${BASE}${url}`);
      if (r.status() !== 404) throw new Error(`${url} → ${r.status()} (attendu 404)`);
    }
    const files = await p.request.get(`${BASE}/api/documents/${docId}/files/00000000-0000-0000-0000-000000000000`);
    if (files.status() !== 404) throw new Error(`fichier → ${files.status()}`);
    const del = await p.request.delete(`${BASE}/api/documents/${docId}`, { headers: { origin: BASE } });
    if (del.status() !== 404) throw new Error(`suppression → ${del.status()}`);
    await p.goto(`${BASE}/espace`);
    await shot(p, "espace-ordinateur");
    await desk.close();
  });

  await check("Protection CSRF : requête d'une autre origine refusée", async () => {
    const r = await page.request.post(`${BASE}/api/auth/request`, { headers: { origin: "https://pirate.example" }, data: { email: "x@exemple.fr", terms: true } });
    if (r.status() !== 403) throw new Error(`statut ${r.status()}`);
  });

  await check("Aucune erreur JavaScript dans le navigateur", async () => {
    const relevant = consoleErrors.filter((e) => !/ResizeObserver|hydrat/i.test(e));
    if (relevant.length) throw new Error(relevant.slice(0, 3).join(" | "));
  });

  await browser.close();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} vérifications réussies. Captures : ${OUT}`);
  process.exit(failed.length ? 1 : 0);
}

main();
