// node shoot2.cjs <sortie> <tailles: o,t,m> <modes: encre,plein> fichiers...
const { chromium } = require('playwright');
const path = require('path');
const SIZES = { o: ['ordinateur', 1440, 900, 1], t: ['tablette', 1024, 768, 1], m: ['telephone', 390, 844, 2] };
(async () => {
  const [out, sizes, modes, ...files] = process.argv.slice(2);
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
  const res = [];
  for (const f of files) for (const mode of modes.split(',')) for (const s of sizes.split(',')) {
    const [tag, w, h, dpr] = SIZES[s];
    const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr });
    const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto('file://' + path.resolve(f) + '#' + mode, { waitUntil: 'load' });
    await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(350);
    const m = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, mode: document.documentElement.dataset.mode, missing: [...document.images].filter(i => !i.complete || !i.naturalWidth).length }));
    const name = `${path.basename(f, '.html')}--${mode}--${tag}.png`;
    await p.screenshot({ path: path.join(out, name) });
    res.push({ name, over: m.sw > m.cw, mode: m.mode, missing: m.missing, errs });
    await p.close();
  }
  await b.close();
  const bad = res.filter(r => r.over || r.missing || r.errs.length || !r.name.includes('--' + r.mode + '--'));
  console.log(JSON.stringify({ n: res.length, bad }));
})();
