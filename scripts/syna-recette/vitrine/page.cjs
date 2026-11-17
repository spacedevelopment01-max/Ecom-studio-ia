// node page.cjs <dossier> <clé de page> <sélecteur> <sortie.png> [largeur]
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
(async () => { const b = await chromium.launch(); const [,, dir, key, sel, out, w] = process.argv;
  const p = await b.newPage({ viewport: { width: Number(w) || 390, height: 844 }, deviceScaleFactor: 2 });
  await p.route('**/*', (r) => { const u = new URL(r.request().url()); if (u.hostname !== 'vitrine.local') return r.abort();
    if (u.pathname === '/') return r.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>' + fs.readFileSync(dir + '/index.html', 'utf8') });
    const f = path.join(dir, decodeURIComponent(u.pathname)); return fs.existsSync(f) ? r.fulfill({ path: f }) : r.fulfill({ status: 404, body: '' }); });
  await p.goto('http://vitrine.local/', { waitUntil: 'load' }); await p.waitForTimeout(1000);
  await p.evaluate((k) => document.querySelector(`[data-go="${k}"]`).click(), key); await p.waitForTimeout(700);
  const el = p.locator(`.tb-pg[data-pg="${key}"] ${sel}`).first(); await el.scrollIntoViewIfNeeded(); await el.screenshot({ path: out });
  await b.close(); })().catch((e) => { console.error('ERREUR', e.message.slice(0, 300)); process.exit(1); });
