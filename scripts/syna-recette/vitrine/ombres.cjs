// node ombres.cjs <dossier> [largeur] — tout élément dont l'ombre décalée ou le bord sort de sa section (donc recouvert par la section suivante) ou de l'écran
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
(async () => { const b = await chromium.launch(); const dir = process.argv[2];
  const p = await b.newPage({ viewport: { width: Number(process.argv[3]) || 390, height: 844 } });
  await p.route('**/*', (r) => { const u = new URL(r.request().url()); if (u.hostname !== 'vitrine.local') return r.abort();
    if (u.pathname === '/') return r.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>' + fs.readFileSync(dir + '/index.html', 'utf8') });
    const f = path.join(dir, decodeURIComponent(u.pathname)); return fs.existsSync(f) ? r.fulfill({ path: f }) : r.fulfill({ status: 404, body: '' }); });
  await p.goto('http://vitrine.local/', { waitUntil: 'load' }); await p.waitForTimeout(1200);
  const out = await p.evaluate(() => { const res = [];
    for (const pg of document.querySelectorAll('.tb-pg')) pg.hidden = false;
    for (const el of document.querySelectorAll('.tn *')) { if (!el.offsetHeight) continue; const cs = getComputedStyle(el); if (cs.boxShadow === 'none') continue;
      const m = /(-?[\d.]+)px (-?[\d.]+)px (-?[\d.]+)px/.exec(cs.boxShadow.replace(/rgba?\([^)]*\)|color\([^)]*\)/g, '')); if (!m || +m[3] > 0) continue; const dx = Math.max(0, +m[1]), dy = Math.max(0, +m[2]); if (!dx && !dy) continue;
      const sec = el.closest('.tn'), r = el.getBoundingClientRect(), sr = sec.getBoundingClientRect(), sc = getComputedStyle(sec);
      const bas = r.bottom + dy - sr.bottom, droite = r.right + dx - Math.min(sr.right, innerWidth);
      if (bas > 0.5 || droite > 0.5) res.push(`${el.closest('.tb-pg')?.dataset.pg || 'coque'} | ${sec.className.slice(0, 36)} ${sec.dataset.tnC || ''} | <${el.tagName.toLowerCase()} class="${String(el.className).slice(0, 24)}"> « ${el.textContent.trim().slice(0, 22)} » ${bas > 0.5 ? 'bas +' + bas.toFixed(0) : ''} ${droite > 0.5 ? 'droite +' + droite.toFixed(0) : ''}`); }
    return [...new Set(res)]; });
  console.log(out.length + ' ombres coupées\n' + out.join('\n')); await b.close(); })();
