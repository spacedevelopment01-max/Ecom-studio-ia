/**
 * #301 « SINA complète », lot 2 — mesure du contraste réel après « couleur d'une section » (opération native
 * section_colors, la même que SINA propose). Pour chaque section de l'accueil : fond repeint (bleu, puis vert sombre,
 * puis clair), rendu Liquid réel du studio dans Chromium, et pour CHAQUE élément portant du texte visible : rapport de
 * contraste WCAG entre sa couleur et le fond réellement peint derrière lui. Les boutons sont aussi mesurés contre le
 * fond de la section (composant d'interface, 3:1).
 * Usage : npx tsx scripts/syna301-contraste-section.ts [sortie.json]
 */
import fs from "node:fs";
import { chromium } from "playwright";
import { compileTheme } from "../src/lib/theme/compile";
import { renderPage } from "../src/lib/theme/render";
import { applyOps } from "../src/lib/theme/ops";

const FONDS = [{ nom: "bleu", colors: { background: "#1D4ED8", text: "#FFFFFF" } }, { nom: "vert sombre", colors: { background: "#14352B", text: "#F5F6F1" } }, { nom: "crème", colors: { background: "#FBF3E4", text: "#1B1B1B" } }];
const { sampleSpec, serviceSpec } = await import("../tests/fixtures");
const direction = (process.env.DIRECTION ?? "atelier") as never;
const base = (process.env.BUSINESS === "services" ? serviceSpec(direction) : sampleSpec(direction, "mono", { rich: true })) as never as { templates: { index: { order: string[]; sections: Record<string, { type: string }> } } };

const b = await chromium.launch({ args: ["--no-sandbox"] });
const page = await b.newPage({ viewport: { width: 1440, height: 1000 } });
await page.addInitScript(() => { (globalThis as { __name?: unknown }).__name = (t: unknown) => t; });
const rows: Record<string, unknown>[] = [];
for (const fond of FONDS) for (const section of base.templates.index.order) {
  const r = applyOps(structuredClone(base) as never, [{ op: "section_colors", template: "index", section, colors: fond.colors }] as never, { targeted: new Set([`index:${section}`]) } as never);
  if (r.rejected.length) continue;
  const spec = r.spec as never;
  const files = compileTheme(spec);
  const html = (await renderPage({ spec, base: "http://probe.local/p", files, cart: [] } as never, "/", new URLSearchParams())).html;
  await page.route("http://probe.local/**", (route) => {
    const u = new URL(route.request().url());
    if (u.pathname === "/") return route.fulfill({ contentType: "text/html", body: html });
    const f = files.get(u.pathname.replace(/^\/p\//, ""));
    return f !== undefined ? route.fulfill({ body: f, contentType: u.pathname.endsWith(".css") ? "text/css" : "application/javascript" }) : route.fulfill({ status: 404, body: "" });
  });
  await page.goto("http://probe.local/", { waitUntil: "load" });
  const found = await page.evaluate(([id]) => {
    type C = { r: number; g: number; b: number; a: number };
    const parse = (c: string): C => { const srgb = c.startsWith("color(srgb"); const m = (c.match(/[\d.]+/g) ?? ["0", "0", "0", "0"]).map(Number); const k = srgb ? 255 : 1; return { r: m[0] * k, g: m[1] * k, b: m[2] * k, a: c.includes("/") || (!srgb && m.length > 3) ? m[3] : 1 }; };
    const colorsIn = (img: string) => (img.match(/(rgba?\([^)]*\)|color\(srgb[^)]*\))/g) ?? []).map(parse);
    const lum = (c: { r: number; g: number; b: number }) => { const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
    const ratio = (a: { r: number; g: number; b: number }, c: { r: number; g: number; b: number }) => { const x = lum(a), y = lum(c); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    const over = (top: C, under: C): C => ({ r: top.r * top.a + under.r * (1 - top.a), g: top.g * top.a + under.g * (1 - top.a), b: top.b * top.a + under.b * (1 - top.a), a: 1 });
    // Fonds possibles derrière un élément : couches composées de l'élément vers la page ; un dégradé donne plusieurs fonds.
    const bgsOf = (el: Element | null): C[] => {
      const layers: C[][] = [];
      for (let e = el; e; e = e.parentElement) {
        const st = getComputedStyle(e), c = parse(st.backgroundColor), g = colorsIn(st.backgroundImage);
        const opts = [...(c.a > 0 ? [c] : []), ...g.filter((x) => x.a > 0)];
        if (opts.length) layers.push(opts);
        if (opts.some((x) => x.a >= 0.99)) break;
      }
      let acc: C[] = [{ r: 255, g: 255, b: 255, a: 1 }];
      for (const layer of layers.reverse()) acc = layer.flatMap((top) => acc.map((u) => over(top, u)));
      return acc;
    };
    const worst = (fg: C, bgs: C[]) => Math.min(...bgs.map((b) => ratio(over(fg, b), b)));
    const root = document.getElementById(`shopify-section-${id}`) ?? document.querySelector(`[id$="${id}"]`);
    if (!root) return { missing: true, items: [] };
    const sectionBgs = bgsOf(root.querySelector("[class*='color-es-']") ?? root);
    const items: { el: string; text: string; ratio: number; vsSection?: number; kind: string }[] = [];
    for (const el of Array.from(root.querySelectorAll("*"))) {
      const own = Array.from(el.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent!.trim()).join(" ").trim();
      const st = getComputedStyle(el), rect = el.getBoundingClientRect();
      if (!own || st.visibility === "hidden" || st.display === "none" || rect.width === 0 || +st.opacity === 0) continue;
      if (el.closest("[aria-hidden='true'], .visually-hidden, .sr-only")) continue;
      // Texte posé sur une photo voilée de noir (bandeau d'appel à l'action) : fond = photo, non mesurable ici.
      if (el.closest(".es-cta__media + .es-cta__inner")) continue;
      const fg = parse(st.color), bgs = bgsOf(el);
      const btn = el.closest(".es-button, button, a.button");
      items.push({ el: el.tagName.toLowerCase() + "." + String(el.className).split(" ").slice(0, 2).join("."), text: own.slice(0, 40), ratio: Math.round(worst(fg, bgs) * 100) / 100, kind: btn ? "bouton" : "texte", ...(btn ? { vsSection: Math.round(Math.min(...bgsOf(btn).flatMap((x) => sectionBgs.map((y) => ratio(x, y)))) * 100) / 100 } : {}) });
    }
    return { missing: false, items };
  }, [section]);
  await page.unroute("http://probe.local/**");
  const bad = found.items.filter((i) => i.ratio < 4.5);
  rows.push({ fond: fond.nom, section, type: base.templates.index.sections[section].type, mesures: found.items.length, illisibles: bad });
  if (bad.length) console.log(`✗ ${fond.nom} · ${section} : ` + bad.map((i) => `${i.el} « ${i.text} » ${i.ratio}`).join(" | "));
}
await b.close();
const n = rows.reduce((s, r) => s + (r.illisibles as unknown[]).length, 0);
console.log(`${rows.length} sections × fonds mesurées, ${n} textes sous 4,5:1`);
fs.writeFileSync(process.argv[2] ?? "contraste-section.json", JSON.stringify(rows, null, 2) + "\n");
