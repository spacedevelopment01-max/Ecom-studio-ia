const { chromium } = require('playwright');
const path = require('path');
(async () => { const [out, ...files] = process.argv.slice(2); const b = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
 for (const f of files) for (const [tag, w, h, d] of [['ordinateur', 1440, 900, 1], ['telephone', 390, 844, 2]]) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: d }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.resolve(f), { waitUntil: 'load' }); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
  const sw = await p.evaluate(() => document.documentElement.scrollWidth);
  await p.screenshot({ path: path.join(out, path.basename(f, '.html') + '--' + tag + '.png'), fullPage: true });
  console.log(f, tag, 'largeur', sw, 'erreurs', errs.length); await p.close(); }
 await b.close(); })();
