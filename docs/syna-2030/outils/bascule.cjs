// Lancer depuis docs/syna-2030/maquettes : node ../outils/bascule.cjs <dossier-captures>
// Test de bascule : l'état (étape, sélection, fil, brouillon) doit survivre au changement de mode.
const { chromium } = require('playwright');
const path = require('path');
(async () => { const out = process.argv[2]; const b = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined }); const r = [];
 for (const [tag, w, h, d] of [['ordinateur', 1440, 900, 1], ['tablette', 1024, 768, 1], ['telephone', 390, 844, 2]]) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: d }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.resolve('prototype.html') + '#encre', { waitUntil: 'load' }); await p.evaluate(() => document.fonts.ready);
  for (let k = 0; k < 3; k++) await p.click('#next');
  await p.fill('#draft', 'Brouillon à garder : ajoute un coffret cadeau');
  const before = await p.evaluate(() => ({ step: document.querySelector('#stepper [aria-current]').textContent, sel: document.querySelector('#ctx').textContent, draft: document.querySelector('#draft').value, mode: document.documentElement.dataset.mode }));
  await p.screenshot({ path: path.join(out, `bascule-1-encre--${tag}.png`) });
  await p.click('[data-set-mode="plein"]'); await p.waitForTimeout(300);
  const after = await p.evaluate(() => ({ step: document.querySelector('#stepper [aria-current]').textContent, sel: document.querySelector('#ctx').textContent, draft: document.querySelector('#draft').value, mode: document.documentElement.dataset.mode, sw: document.documentElement.scrollWidth }));
  await p.screenshot({ path: path.join(out, `bascule-2-plein--${tag}.png`) });
  await p.click('#ask-mode'); await p.waitForTimeout(300);
  const back = await p.evaluate(() => ({ mode: document.documentElement.dataset.mode, last: [...document.querySelectorAll('#thread .msg-syna')].pop().textContent.slice(0, 80), draft: document.querySelector('#draft').value, step: document.querySelector('#stepper [aria-current]').textContent }));
  await p.screenshot({ path: path.join(out, `bascule-3-commande-syna--${tag}.png`) });
  r.push({ tag, ok: before.step === after.step && before.sel === after.sel && before.draft === after.draft && after.mode === 'plein' && back.mode === 'encre' && back.draft === before.draft && back.step === before.step, before, after, back, errs });
  await p.close(); }
 await b.close(); console.log(JSON.stringify(r, null, 1)); })();
