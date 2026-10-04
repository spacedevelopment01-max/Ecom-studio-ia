/**
 * Enregistre de VRAIES vidéos du site en fonctionnement (téléphone Android simulé), puis
 * les convertit en MP4 (H.264) avec des sous-titres français incrustés.
 * Prérequis : site local en mode démonstration (npm run dev, DEMO_MODE=true), ffmpeg installé.
 * Usage : npx tsx scripts/record-videos.ts   → public/videos/*.mp4 et *.jpg (affiches)
 */
import { chromium, devices, type Browser, type BrowserContext, type Page } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const BASE = process.env.BASE ?? "http://localhost:3100";
const OUT = path.join(process.cwd(), "public", "videos");
const TMP = "/tmp/ap-videos";
const ASSETS = process.env.ASSETS ?? "/tmp/claude-0/shots/e2e";
const VIEW = { width: 480, height: 1000 };
mkdirSync(OUT, { recursive: true });
rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });

type Cap = { t: number; text: string };

function lastMail(to: string) {
  const dir = path.join(process.cwd(), ".data", "outbox");
  const mails = readdirSync(dir).sort().map((f) => JSON.parse(readFileSync(path.join(dir, f), "utf8"))).filter((m) => m.to === to);
  return mails[mails.length - 1] as { subject: string; text: string };
}

async function resetRateLimits() {
  const env = readFileSync(".env.local", "utf8");
  const url = /^DATABASE_URL=(.*)$/m.exec(env)?.[1];
  if (!url || !/127\.0\.0\.1|localhost/.test(url)) return;
  const postgres = (await import("postgres")).default;
  const db = postgres(url, { max: 1 });
  await db`delete from rate_limits`;
  await db.end();
}

async function loggedInState(browser: Browser, email: string) {
  const ctx = await browser.newContext({ ...devices["Pixel 7"], viewport: VIEW, locale: "fr-FR" });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/connexion`);
  await p.fill("#email", email);
  await p.check('input[type="checkbox"]');
  await p.click("text=Recevoir mon lien de connexion");
  await p.waitForSelector("text=Regardez votre boîte email");
  await p.waitForTimeout(300);
  await p.goto(/(http\S+connexion\/verifier#\S+)/.exec(lastMail(email).text)![1]);
  await p.click("text=Me connecter");
  await p.waitForURL(/\/espace/);
  // Consentement IA déjà donné : la vidéo montre l'analyse directement
  await p.request.post(`${BASE}/api/account/consent-ai`, { data: { accept: true }, headers: { origin: BASE } });
  const state = await ctx.storageState();
  await ctx.close();
  return state;
}

async function record(browser: Browser, name: string, state: Awaited<ReturnType<typeof loggedInState>> | undefined, scenario: (p: Page, cap: (t: string) => void) => Promise<void>) {
  const dir = path.join(TMP, name);
  const ctx: BrowserContext = await browser.newContext({
    ...devices["Pixel 7"],
    viewport: VIEW,
    deviceScaleFactor: 2,
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
    storageState: state,
    recordVideo: { dir, size: VIEW },
  });
  const page = await ctx.newPage();
  const t0 = Date.now();
  const caps: Cap[] = [];
  const cap = (text: string) => caps.push({ t: (Date.now() - t0) / 1000, text });
  await scenario(page, cap);
  await page.waitForTimeout(1200);
  const total = (Date.now() - t0) / 1000;
  await ctx.close();
  const webm = readdirSync(dir).find((f) => f.endsWith(".webm"))!;
  renameSync(path.join(dir, webm), path.join(dir, "raw.webm"));
  return { raw: path.join(dir, "raw.webm"), caps, total };
}

function ass(caps: Cap[], total: number) {
  const fmt = (s: number) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = (s % 60).toFixed(2).padStart(5, "0");
    return `${h}:${String(m).padStart(2, "0")}:${sec}`;
  };
  const lines = caps.map((c, i) => `Dialogue: 0,${fmt(c.t)},${fmt(i < caps.length - 1 ? caps[i + 1].t : total)},Bas,,0,0,0,,${c.text.replace(/\n/g, "\\N")}`);
  return `[Script Info]
ScriptType: v4.00+
PlayResX: ${VIEW.width}
PlayResY: ${VIEW.height}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Bas,DejaVu Sans,21,&H00FFFFFF,&H00FFFFFF,&H10361E0F,&H10361E0F,1,0,0,0,100,100,0,0,3,10,0,2,24,24,40,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${lines.join("\n")}
`;
}

function encode(name: string, r: { raw: string; caps: Cap[]; total: number }) {
  const assFile = path.join(TMP, `${name}.ass`);
  writeFileSync(assFile, ass(r.caps, r.total));
  const mp4 = path.join(OUT, `${name}.mp4`);
  execFileSync("ffmpeg", [
    "-loglevel", "error", "-y", "-i", r.raw,
    "-vf", `subtitles=${assFile},fps=25`,
    "-c:v", "libx264", "-profile:v", "main", "-pix_fmt", "yuv420p", "-crf", "28", "-preset", "slow",
    "-movflags", "+faststart", "-an", mp4,
  ]);
  execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-ss", String(Math.min(3, r.total / 3)), "-i", mp4, "-frames:v", "1", "-q:v", "4", path.join(OUT, `${name}.jpg`)]);
  console.log(`✔ ${name}.mp4 (${r.total.toFixed(0)} s)`);
}

const slowScroll = async (p: Page, px: number, steps = 6) => {
  for (let i = 0; i < steps; i++) {
    await p.evaluate((d) => window.scrollBy({ top: d, behavior: "smooth" }), px / steps);
    await p.waitForTimeout(260);
  }
};

async function main() {
  await resetRateLimits();
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
  const email = `video.${Date.now()}@exemple.fr`;
  const state = await loggedInState(browser, email);
  const jpg = path.join(ASSETS, "courrier-test.jpg");

  // 1. Comprendre un courrier
  const r1 = await record(browser, "comprendre-un-courrier", state, async (p, cap) => {
    await p.goto(`${BASE}/nouveau`);
    cap("1. Choisissez le type de document");
    await p.waitForTimeout(1500);
    await p.click("text=Courrier du quotidien");
    await p.waitForTimeout(900);
    cap("2. Prenez le courrier en photo\n(ou importez un PDF)");
    await p.locator("text=2. Ajoutez les pages").scrollIntoViewIfNeeded();
    await p.waitForTimeout(900);
    await p.setInputFiles('input[aria-label="Importer des fichiers"]', [jpg]);
    await p.waitForSelector("text=Page 1", { timeout: 30000 });
    await p.locator("text=Page 1").scrollIntoViewIfNeeded();
    cap("Le site vérifie que la photo est lisible");
    await p.waitForTimeout(2200);
    cap("3. Lancez l'analyse");
    await p.locator("text=Analyser ce document").scrollIntoViewIfNeeded();
    await p.waitForTimeout(900);
    await p.click("text=Analyser ce document");
    await p.waitForURL(/\/documents\/[0-9a-f-]{36}$/, { timeout: 60000 });
    cap("Le résultat : l'essentiel en français simple\n(exemple simulé)");
    await p.waitForTimeout(1500);
    await slowScroll(p, 520);
    await p.waitForTimeout(1500);
    cap("La date limite, citée mot pour mot");
    await p.locator("text=Date limite").first().scrollIntoViewIfNeeded();
    await p.evaluate(() => scrollBy(0, -60));
    await p.waitForTimeout(2200);
    cap("Vous confirmez la date : les rappels sont programmés");
    await p.click("text=J'ai vérifié cette date : programmer des rappels");
    await p.waitForSelector("text=Date confirmée");
    await p.waitForTimeout(1800);
    cap("Les étapes à cocher, une par une");
    await p.locator("text=Les étapes, une par une").scrollIntoViewIfNeeded();
    await p.waitForTimeout(800);
    const boxes = p.locator('section:has-text("Les étapes") input[type="checkbox"]');
    for (let i = 0; i < 2; i++) {
      await boxes.nth(i).check();
      await p.waitForTimeout(700);
    }
    cap("Et un brouillon de réponse, à modifier");
    await p.locator("text=Brouillon proposé").scrollIntoViewIfNeeded();
    await p.waitForTimeout(2600);
  });
  encode("comprendre-un-courrier", r1);

  // 2. Rédiger un courrier sans document
  const r2 = await record(browser, "rediger-un-courrier", state, async (p, cap) => {
    await p.goto(`${BASE}/courriers`);
    cap("Rédiger un courrier, même sans document");
    await p.waitForTimeout(1500);
    const search = p.locator('input[placeholder^="Ex. démission"]');
    await search.click();
    cap("Cherchez votre démarche");
    await search.pressSequentially("résiliation", { delay: 110 });
    await p.waitForTimeout(1000);
    await p.click("text=Résiliation d'une assurance ou d'un abonnement");
    await p.waitForURL(/\/courriers\/nouveau\//);
    cap("Répondez à quelques questions simples");
    await p.waitForTimeout(1200);
    for (let step = 0; step < 6; step++) {
      for (const el of await p.locator("form input[type=text]:visible, form textarea:visible").all()) {
        if (!(await el.inputValue())) {
          await el.click();
          await el.pressSequentially("Exemple", { delay: 60 });
        }
      }
      for (const el of await p.locator("form input[type=date]:visible").all()) await el.fill("2026-11-30");
      for (const el of await p.locator("form select:visible").all()) await el.selectOption({ index: 1 });
      const radios = p.locator("form fieldset:has(input[type=radio])");
      for (let r = 0; r < (await radios.count()); r++) await radios.nth(r).locator("input[type=radio]").first().check();
      await p.waitForTimeout(700);
      if (await p.locator("text=Préparer mon courrier").count()) {
        cap("Vos adresses, puis le courrier est prêt");
        await p.fill('input[aria-label="Nom et prénom"]', "Camille Exemple");
        await p.fill('input[aria-label="Adresse"]', "3 rue des Lilas");
        await p.fill('input[aria-label="Code postal"]', "75011");
        await p.fill('input[aria-label="Ville"]', "Paris");
        await p.fill('input[aria-label="Nom du destinataire"]', "Assurance Exemple");
        await p.fill('input[aria-label="Adresse du destinataire"]', "10 avenue Imaginaire");
        await p.fill('input[aria-label="Code postal du destinataire"]', "69002");
        await p.fill('input[aria-label="Ville du destinataire"]', "Lyon");
        await p.waitForTimeout(800);
        await p.click("text=Préparer mon courrier");
        break;
      }
      await p.click("button:has-text('Continuer')");
      await p.waitForTimeout(500);
    }
    await p.waitForURL(/\/courriers\/[0-9a-f-]{36}$/);
    cap("Votre courrier : modifiable librement");
    await p.waitForTimeout(1800);
    await slowScroll(p, 700, 8);
    await p.waitForTimeout(800);
    cap("Relisez, puis téléchargez un PDF propre");
    await p.locator("text=J'ai relu ce courrier en entier").scrollIntoViewIfNeeded();
    await p.waitForTimeout(700);
    await p.check("text=J'ai relu ce courrier en entier");
    await p.waitForTimeout(2600);
  });
  encode("rediger-un-courrier", r2);

  // 3. Suivre ses démarches (dossier + rappels)
  const r3 = await record(browser, "suivre-ses-demarches", state, async (p, cap) => {
    await p.goto(`${BASE}/dossiers`);
    cap("Regroupez une démarche dans un dossier");
    await p.waitForTimeout(1200);
    await p.click("text=Nouveau dossier");
    await p.locator("#f-name").pressSequentially("Aide au logement", { delay: 80 });
    await p.locator("#f-next").pressSequentially("Envoyer l'attestation", { delay: 50 });
    await p.click("button:has-text('Créer')");
    await p.waitForURL(/\/dossiers\/[0-9a-f-]{36}$/);
    await p.waitForTimeout(1000);
    cap("Notez les pièces à fournir");
    await p.locator('input[aria-label="Nouvelle pièce"]').scrollIntoViewIfNeeded();
    await p.locator('input[aria-label="Nouvelle pièce"]').pressSequentially("Attestation de loyer", { delay: 70 });
    await p.click('button[aria-label="Ajouter la pièce"]');
    await p.waitForTimeout(1500);
    cap("Gardez la chronologie de vos échanges");
    await p.locator('input[aria-label="Description"]').scrollIntoViewIfNeeded();
    await p.locator('input[aria-label="Description"]').pressSequentially("Courrier reçu de la caisse", { delay: 60 });
    await p.click("form >> button:has-text('Ajouter')");
    await p.waitForTimeout(1500);
    cap("Et quand c'est réglé, vous le dites");
    await p.getByRole("button", { name: "Mon problème est réglé" }).scrollIntoViewIfNeeded();
    await p.waitForTimeout(700);
    await p.getByRole("button", { name: "Mon problème est réglé" }).click();
    await p.waitForSelector("text=Réglé le");
    await p.evaluate(() => scrollTo({ top: 0, behavior: "smooth" }));
    await p.waitForTimeout(2000);
    await p.goto(`${BASE}/rappels`);
    cap("Vos échéances et les rappels programmés");
    await p.waitForTimeout(1500);
    await slowScroll(p, 600, 6);
    await p.waitForTimeout(2000);
  });
  encode("suivre-ses-demarches", r3);

  // 4. Coffre-fort et envoi validé
  const r4 = await record(browser, "coffre-fort-et-envoi", state, async (p, cap) => {
    await p.goto(`${BASE}/coffre-fort`);
    cap("Votre coffre-fort est protégé");
    await p.waitForTimeout(1800);
    cap("Empreinte, visage, ou code reçu par email");
    await p.click("text=Recevoir un code par email");
    await p.waitForSelector("text=Un code à 6 chiffres vient d'être envoyé");
    await p.waitForTimeout(700);
    const code = /(\d{6})/.exec(lastMail(email).subject)![1];
    await p.locator("#code-email").pressSequentially(code, { delay: 160 });
    await p.click("button:has-text('Valider')");
    await p.waitForSelector("text=Mes pages originales");
    cap("Vos originaux, accessibles à vous seul");
    await p.waitForTimeout(1500);
    await p.locator("text=Afficher les fichiers").first().click();
    await p.waitForTimeout(2000);
    // Préparer un envoi recommandé à partir du courrier rédigé
    const letters = await (await p.request.get(`${BASE}/api/letters`)).json();
    await p.goto(`${BASE}/courriers/${letters.letters[0].id}`);
    await p.waitForTimeout(800);
    if (!(await p.locator("text=J'ai relu ce courrier en entier").isChecked())) {
      await p.check("text=J'ai relu ce courrier en entier");
      await p.waitForTimeout(600);
    }
    cap("Envoi en recommandé : vous gardez la main");
    await p.locator("text=Préparer l'envoi recommandé").scrollIntoViewIfNeeded();
    await p.waitForTimeout(900);
    await p.click("text=Préparer l'envoi recommandé");
    await p.waitForURL(/\/envois\//);
    await p.waitForSelector("text=Prix total");
    cap("Tout est affiché : texte, adresse, pièces, prix\n(ici en mode test : aucun envoi réel)");
    await p.waitForTimeout(1500);
    await slowScroll(p, 1400, 10);
    await p.waitForTimeout(800);
    cap("Rien ne part sans votre validation");
    await p.locator("text=J'ai relu et je valide cet envoi en mon nom").scrollIntoViewIfNeeded();
    await p.waitForTimeout(700);
    await p.check("text=J'ai relu et je valide cet envoi en mon nom");
    await p.waitForTimeout(2800);
  });
  encode("coffre-fort-et-envoi", r4);

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
