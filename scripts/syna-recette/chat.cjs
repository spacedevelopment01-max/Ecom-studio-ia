// Usage : node chat.cjs <profil> <nom> <url> <message> [fichier1,fichier2] — envoie dans le vrai fil SYNA et attend la fin.
const { chromium } = require('playwright');
const fs = require('fs');
const S = __dirname, [,, profil, nom, url, message, files] = process.argv;
(async () => {
  const ctx = await chromium.launchPersistentContext(S + '/profil-agent' + profil, { viewport: { width: 1440, height: 1000 } });
  const p = ctx.pages()[0] || await ctx.newPage();
  p.on('dialog', (d) => d.accept());
  await p.goto('http://localhost:3493' + url, { waitUntil: 'networkidle', timeout: 90000 });
  await p.locator('[data-syna-thread]').first().waitFor({ timeout: 60000 });
  if (files) { await p.setInputFiles('[data-syna-thread] input[type=file]', files.split(',').map((f) => S + '/medias/' + f)); await p.waitForTimeout(4000); }
  if (message && message !== '-') {
    await p.locator('[data-syna-thread] textarea').fill(message);
    await p.locator('[data-syna-thread] button', { hasText: 'Envoyer' }).click();
    await p.waitForTimeout(3000);
  }
  const t0 = Date.now();
  while (Date.now() - t0 < 25 * 60000) {
    const busy = await p.locator('[data-syna-working]').count();
    if (!busy) break;
    await p.waitForTimeout(4000);
  }
  await p.waitForTimeout(2000);
  await p.screenshot({ path: `${S}/preuves/${nom}.png`, fullPage: false });
  const txt = await p.locator('[data-syna-thread]').first().innerText();
  fs.writeFileSync(`${S}/preuves/${nom}.txt`, txt);
  console.log('URL', p.url(), 'durée', Math.round((Date.now() - t0) / 1000), 's');
  await ctx.close();
})().catch((e) => { console.error('ERREUR', e.message.slice(0, 400)); process.exit(1); });
