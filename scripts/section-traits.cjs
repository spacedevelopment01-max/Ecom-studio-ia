/**
 * Caractéristiques visuelles de chaque section de la bibliothèque (public/sections/section-traits.json), mesurées dans
 * un vrai navigateur : fond (clair, sombre, photo), densité (texte par écran), nombre de photos, hauteur. Servent au
 * concepteur du thème sur mesure (custom.design) pour régler le rythme d'une page (alternance des fonds, une section
 * qui respire après une section dense). Usage : node scripts/section-traits.cjs (gratuit, aucune IA).
 */
const { chromium } = require("playwright");
const fs = require("fs"), path = require("path"), os = require("os");
const DIR = path.join(__dirname, "..", "public", "sections");
const lib = JSON.parse(fs.readFileSync(path.join(DIR, "library.json"), "utf8"));
(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "traits-"));
  for (const f of ["library.css", "library.js"]) fs.copyFileSync(path.join(DIR, f), path.join(tmp, f));
  fs.symlinkSync(path.join(DIR, "photos"), path.join(tmp, "photos"));
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const out = {};
  for (const s of lib.sections) {
    fs.writeFileSync(path.join(tmp, "one.html"), `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="library.css"></head><body style="margin:0;background:#fff"><div style="container-type:inline-size">${s.html}</div><script src="library.js"></script></body></html>`);
    await p.goto("file://" + path.join(tmp, "one.html")); await p.waitForTimeout(250);
    out[s.id] = await p.evaluate(() => {
      const root = document.body.firstElementChild.firstElementChild; if (!root) return null;
      const r = root.getBoundingClientRect();
      const lum = (c) => { const m = c.match(/rgba?\(([\d.]+), ([\d.]+), ([\d.]+)(?:, ([\d.]+))?/); if (!m || (m[4] !== undefined && +m[4] < .5)) return null; return (0.2126 * m[1] + 0.7152 * m[2] + 0.0722 * m[3]) / 255; };
      // fond : l'élément le plus grand qui a une couleur de fond ou une image de fond
      let bg = null, photo = false, best = 0;
      for (const e of [root, ...root.querySelectorAll("*")]) {
        const b = e.getBoundingClientRect(), area = b.width * b.height; if (area < r.width * r.height * .45) continue;
        const cs = getComputedStyle(e);
        if (cs.backgroundImage.includes("url(")) { if (area > best) { best = area; photo = true; } continue; }
        const l = lum(cs.backgroundColor); if (l !== null && area >= best) { best = area; bg = l; photo = false; }
        if (e.tagName === "IMG" && area >= best) { best = area; photo = true; }
      }
      const text = (root.innerText || "").replace(/\s+/g, " ").trim().length;
      const imgs = root.querySelectorAll("img").length + [...root.querySelectorAll("*")].filter((e) => getComputedStyle(e).backgroundImage.includes("url(")).length;
      return { fond: photo ? "photo" : bg === null ? "clair" : bg < .35 ? "sombre" : bg < .75 ? "couleur" : "clair", densite: text / Math.max(1, r.height / 900) > 700 ? "dense" : text / Math.max(1, r.height / 900) < 220 ? "aérée" : "moyenne", photos: imgs, hauteur: Math.round(r.height) };
    });
  }
  await b.close();
  // le drapeau « inversable » vient de scripts/section-invert-check.cjs : gardé
  try { const prev = JSON.parse(fs.readFileSync(path.join(DIR, "section-traits.json"), "utf8")); for (const [k, v] of Object.entries(out)) if (v && prev[k] && "inversable" in prev[k]) v.inversable = prev[k].inversable; } catch { /* premier passage */ }
  fs.writeFileSync(path.join(DIR, "section-traits.json"), JSON.stringify(out));
  const vals = Object.values(out).filter(Boolean);
  console.log(vals.length, "sections ;", ["clair", "sombre", "couleur", "photo"].map((f) => `${f} ${vals.filter((v) => v.fond === f).length}`).join(", "), ";", ["dense", "moyenne", "aérée"].map((d) => `${d} ${vals.filter((v) => v.densite === d).length}`).join(", "));
})();
