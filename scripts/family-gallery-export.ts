/** Galerie de contrôle des bibliothèques par famille (issue #141), consultable sans le studio.
 *
 * Pour chaque famille, deux marques distinctes (boutique spécialisée : FRAISE et ONDE ; e-commerce : ORBE et une
 * marque test B composée dans le thème ORBE ; services : Atelier Rive et une marque test B composée dans le thème
 * Atelier Rive) : une page par fonction (20 par famille) montrant TOUTES ses dispositions, et une page par disposition
 * d'en-tête (5) et de pied de page (5). Tout est rendu par la vraie route d'aperçu du studio, avec l'identité de chaque
 * projet (palette, polices, boutons, textes, médias) et les contenus d'exemple de la galerie, marqués « Exemple ».
 * Aucun appel réseau, aucune IA, aucun paiement. Les visuels viennent de public/demo/<id>/ (kit privé, hors dépôt).
 *
 *   npx tsx scripts/family-gallery-export.ts <dossier-de-sortie> [--only=specialty,catalog,services]
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
if (process.env.DATA_DIR || process.env.DATABASE_FILE) throw new Error("Base existante refusée");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "ecs-familles-")); process.env.DATA_DIR = temp; process.env.STOCK_OFFLINE = "1";
type Ctx = { params: Promise<{ id: string; vid: string; path?: string[] }> };
const args = process.argv.slice(2);
const only = args.find((a) => a.startsWith("--only="))?.slice(7).split(",").filter(Boolean) ?? null;
const out = path.resolve(args.find((a) => !a.startsWith("--")) ?? "reports/galerie-familles"); fs.mkdirSync(out, { recursive: true });
const { demoProject } = await import("../tests/demo-fixtures");
const { createUser } = await import("../src/lib/auth");
const { saveThemeVersion, loadProject, saveBrand, saveProduct } = await import("../src/lib/projects");
const { composeShop } = await import("../src/lib/engine/shop");
const { previewSegment } = await import("../src/lib/theme/preview-access");
const { GET } = await import("../src/app/preview/[id]/v/[vid]/[[...path]]/route");
const { runWithLang } = await import("../src/lib/i18n-server");
const { applyOps } = await import("../src/lib/theme/ops");
const { withProjectMedia } = await import("../src/lib/theme/section-defaults");
const { sectionContentContext } = await import("../src/lib/theme/section-content");
const { FAMILY_LIBRARY, FAMILY_LABEL } = await import("../src/lib/theme/section-families");
const { chromePresets } = await import("../src/lib/theme/family-chrome");
const { chromeOps } = await import("../src/lib/theme/family-ops");
const { thumbSvg } = await import("../src/lib/theme/family-gallery");
type FamilyId = "specialty" | "catalog" | "services";
type ThemeSpec = import("../src/lib/theme/spec").ThemeSpec;
const user = await createUser("galerie-familles@example.invalid", "isolated-test-only", "Galerie de contrôle");
const ORIGIN = "http://127.0.0.1";
function ctxFor(url: URL): Ctx { const m = url.pathname.match(/^\/preview\/([^/]+)\/v\/([^/]+)(?:\/(.*))?$/)!; return { params: Promise.resolve({ id: m[1], vid: m[2], path: (m[3] ?? "").split("/").filter(Boolean) }) }; }
const get = async (p: string) => { const url = new URL(p, ORIGIN); return GET(new Request(url), ctxFor(url)); };
const commit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();

/** Marque test B (e-commerce, services) : même thème, autre identité (nom, accroche, palette), composée par le studio. */
const BRAND_B: Record<"orbe" | "rive", { name: string; product: string; tagline: string; palette: string[] }> = {
  orbe: { name: "Marque test B", product: "Suspension Halo (test)", tagline: "Marque fictive de contrôle : autre nom, autre palette.", palette: ["#1F3B4D", "#E8E2D6", "#C8553D", "#F7F4EE", "#14212B"] },
  rive: { name: "Marque test B", product: "Rénovation (test)", tagline: "Marque fictive de contrôle : autre nom, autre palette.", palette: ["#2E4A3A", "#EFE9DF", "#B9853B", "#FAF7F2", "#1B2A22"] },
};
const FAMS: { family: FamilyId; slug: string; brands: { demo: "fraise" | "onde" | "orbe" | "rive"; b?: boolean; slug: string; label: string }[] }[] = [
  { family: "specialty", slug: "boutique-specialisee", brands: [{ demo: "fraise", slug: "fraise", label: "FRAISE" }, { demo: "onde", slug: "onde", label: "ONDE" }] },
  { family: "catalog", slug: "e-commerce", brands: [{ demo: "orbe", slug: "orbe", label: "ORBE" }, { demo: "orbe", b: true, slug: "orbe-marque-b", label: "Marque test B (thème ORBE)" }] },
  { family: "services", slug: "services", brands: [{ demo: "rive", slug: "rive", label: "Atelier Rive" }, { demo: "rive", b: true, slug: "rive-marque-b", label: "Marque test B (thème Atelier Rive)" }] },
];
const LABEL_CSS = `<style>.fam-ctl{position:relative;z-index:5;font:600 12px/1.4 system-ui,sans-serif;background:#111;color:#fff;padding:10px 16px;letter-spacing:.02em}.fam-ctl b{color:#ffd28a}.fam-ctl a{color:#9cd2ff}.fam-top{position:sticky;top:0;z-index:2147483646;display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;justify-content:space-between;background:#111;color:#fff;font:600 12px/1.3 system-ui,sans-serif;padding:8px 14px}.fam-top a{color:#9cd2ff}</style>`;
const index: { family: FamilyId; slug: string; brands: { slug: string; label: string }[]; entries: { n: number; name: string; description: string; dispositions: { label: string; type: string; thumb: string }[] }[]; header: { label: string; description: string; thumb: string }[]; footer: { label: string; description: string; thumb: string }[] }[] = [];
const report: Record<string, unknown>[] = [];

try {
  for (const fam of FAMS.filter((x) => !only || only.includes(x.family))) {
    const entries = FAMILY_LIBRARY[fam.family];
    for (const brand of fam.brands) await runWithLang({ content: "fr", ui: "fr" }, async () => {
      const f = await demoProject(user.id, brand.demo);
      let spec: ThemeSpec = f.spec;
      if (brand.b) {
        const b = BRAND_B[brand.demo as "orbe" | "rive"], p = loadProject(f.pid);
        const [primary, secondary, accent, light, dark] = b.palette;
        saveBrand(f.pid, { ...p.brand!, name: b.name, tagline: b.tagline, story: b.tagline, palette: { primary, secondary, accent, light, dark } });
        if (p.product) saveProduct(f.pid, { ...p.product, name: b.product, nameStatus: "provided" });
        spec = (await composeShop(f.pid, brand.demo, null, false)).spec;
      }
      const project = loadProject(f.pid);
      // Une page par fonction : toutes ses dispositions, chacune avec le contenu d'exemple du projet.
      spec = JSON.parse(JSON.stringify(spec));
      const pages: { file: string; handle: string; title: string; labels: Record<string, string> }[] = [];
      for (const e of entries) {
        const key = `fam-${String(e.n).padStart(2, "0")}`, tpl = `page.${key}`;
        spec.templates[tpl] = { sections: {}, order: [] };
        spec.store.pages = [...spec.store.pages.filter((x) => x.handle !== key), { handle: key, title: e.name.fr, template_suffix: key, body_html: "" }];
        const labels: Record<string, string> = {};
        e.dispositions.forEach((d, i) => {
          const cctx = sectionContentContext(project, spec, true, tpl);
          const filled = withProjectMedia(spec, d.type, { ...(d.settings ?? {}) }, undefined, cctx);
          const r = applyOps(spec, [{ op: "add_section", template: tpl, type: d.type, settings: { ...filled.settings, ...(d.settings ?? {}) } as never, blocks: filled.blocks as never } as never], { targeted: new Set(), overrideLocks: true });
          if (!r.applied.length) { console.warn(`refus ${brand.slug} ${e.key}~${d.id} : ${r.rejected.map((x) => x.reason).join(" ; ")}`); return; }
          spec = r.spec;
          const sid = spec.templates[tpl].order.at(-1)!;
          labels[sid] = `${FAMILY_LABEL[fam.family].fr} · ${e.n}. ${e.name.fr} — disposition ${i + 1}/${e.dispositions.length} : <b>${d.label.fr}</b> <span style="opacity:.6">(${d.type})</span>`;
        });
        pages.push({ file: `${key}.html`, handle: key, title: e.name.fr, labels });
      }
      // Page courte pour les en-têtes et pieds de page : l'ouverture de la famille.
      spec.templates["page.fam-chrome"] = { sections: {}, order: [] };
      spec.store.pages.push({ handle: "fam-chrome", title: "En-tête et pied de page", template_suffix: "fam-chrome", body_html: "" });
      { const d = entries[0].dispositions[0]; const filled = withProjectMedia(spec, d.type, { ...(d.settings ?? {}) }, undefined, sectionContentContext(project, spec, true, "page.fam-chrome")); spec = applyOps(spec, [{ op: "add_section", template: "page.fam-chrome", type: d.type, settings: { ...filled.settings, ...(d.settings ?? {}) } as never, blocks: filled.blocks as never } as never], { targeted: new Set(), overrideLocks: true }).spec; }
      const dir = path.join(out, fam.slug, brand.slug); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(path.join(dir, "assets"), { recursive: true }); fs.mkdirSync(path.join(dir, "fonts"));
      const assets = new Set<string>(), fonts = new Set<string>();
      const nav = (title: string) => `<div class="fam-top"><span>Galerie de contrôle · ${FAMILY_LABEL[fam.family].fr} · ${brand.label} · ${title}</span><span><a href="../../index.html">Sommaire</a> · version ${commit.slice(0, 7)} · contenus d'exemple marqués « Exemple »</span></div>`;
      const exportVersion = async (s: ThemeSpec, files: { file: string; route: string; title: string; labels?: Record<string, string> }[]) => {
        const version = saveThemeVersion(f.pid, s, "Galerie de contrôle", "user");
        const base = `/preview/${f.pid}/v/${previewSegment(version.id, user.id, f.pid)}`;
        const esc = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const rewrite = (text: string) => text.replace(new RegExp(`${esc(base)}((?:/[^"'\\s)<>\\\\]*)?)`, "g"), (_, rest: string) => {
          const p = decodeURIComponent(rest || "/").split("?")[0].replace(/#.*$/, "");
          if (p.startsWith("/assets/")) { assets.add(p.slice(8)); return `assets/${p.slice(8)}`; }
          if (p.startsWith("/__fonts/")) { fonts.add(p.slice(9)); return `fonts/${p.slice(9)}`; }
          if (p.startsWith("/pages/fam-")) return `${p.slice(7)}.html`;
          return "#";
        });
        for (const x of files) {
          const r = await get(`${base}${x.route}?es_raw=1`);
          if (r.status !== 200) throw new Error(`${brand.slug} ${x.route} → ${r.status}`);
          let html = rewrite(await r.text());
          for (const [sid, label] of Object.entries(x.labels ?? {})) html = html.replace(new RegExp(`(<div id="shopify-section-[^"]*__${esc(sid)}")`), `<div class="fam-ctl">${label}</div>$1`);
          html = html.replace("</head>", `${LABEL_CSS}</head>`).replace(/<body([^>]*)>/, `<body$1>${nav(x.title)}`);
          fs.writeFileSync(path.join(dir, x.file), html);
        }
        const fetched = new Set<string>();
        for (let round = 0; round < 4; round++) for (const name of [...assets]) {
          if (fetched.has(name)) continue; fetched.add(name);
          const r = await get(`${base}/assets/${name}`); if (r.status !== 200) { console.warn(`asset absent : ${name}`); continue; }
          const buf = Buffer.from(await r.arrayBuffer());
          if (/\.(css|js)$/.test(name)) { const text = rewrite(buf.toString("utf8")); fs.writeFileSync(path.join(dir, "assets", name), text); for (const m of text.matchAll(/url\(\s*["']?(?!data:|https?:|\/\/)([^"')?#]+)/g)) if (!m[1].startsWith("fonts/") && !m[1].startsWith("../")) assets.add(path.basename(m[1])); } else fs.writeFileSync(path.join(dir, "assets", name), buf);
        }
        for (const file of fonts) { const r = await get(`${base}/__fonts/${file}`); if (r.status === 200) fs.writeFileSync(path.join(dir, "fonts", file), Buffer.from(await r.arrayBuffer())); }
      };
      await exportVersion(spec, pages.map((p) => ({ file: p.file, route: `/pages/${p.handle}`, title: p.title, labels: p.labels })));
      // Cinq en-têtes, cinq pieds de page : chacun posé par les opérations du studio (mêmes règles que le panneau).
      for (const part of ["header", "footer"] as const) for (const [i, preset] of chromePresets(fam.family, part).entries()) {
        const sv = project.services; const r = chromeOps(spec, fam.family, part, preset.id, "fr", { address: sv?.address || sv?.area, phone: sv?.phone, email: sv?.email, hours: sv?.hours });
        if ("error" in r) throw new Error(r.error.fr);
        const s = r.ops.length ? applyOps(spec, r.ops, { targeted: new Set(r.ops.map((o: any) => `${o.template}:${o.section}`)) }).spec : spec;
        await exportVersion(s, [{ file: `${part === "header" ? "en-tete" : "pied"}-${i + 1}.html`, route: "/pages/fam-chrome", title: `${part === "header" ? "En-tête" : "Pied de page"} ${i + 1} : ${preset.label.fr}` }]);
      }
      report.push({ family: fam.family, brand: brand.slug, pages: pages.length, dispositions: pages.reduce((n, p) => n + Object.keys(p.labels).length, 0), shopName: spec.store.shopName, accent: (spec.settings.color_schemes as any)?.["scheme-1"]?.settings?.accent ?? null });
      console.log(JSON.stringify(report.at(-1)));
    });
    index.push({
      family: fam.family, slug: fam.slug, brands: fam.brands.map((b) => ({ slug: b.slug, label: b.label })),
      entries: entries.map((e) => ({ n: e.n, name: e.name.fr, description: e.description.fr, dispositions: e.dispositions.map((d) => ({ label: d.label.fr, type: d.type, thumb: thumbSvg(d.thumb) })) })),
      header: chromePresets(fam.family, "header").map((x) => ({ label: x.label.fr, description: x.description.fr, thumb: thumbSvg(x.thumb) })),
      footer: chromePresets(fam.family, "footer").map((x) => ({ label: x.label.fr, description: x.description.fr, thumb: thumbSvg(x.thumb) })),
    });
  }
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const hub = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Bibliothèques de sections</title><style>
:root{--bg:#f6f3ee;--ink:#1d1b18;--muted:#6d665c;--line:#ddd6cb;--card:#fff;--accent:#c2603d}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#151412;--ink:#f2eee8;--muted:#a59d91;--line:#34302b;--card:#1e1c19;--accent:#e08a66}}
:root[data-theme="dark"]{--bg:#151412;--ink:#f2eee8;--muted:#a59d91;--line:#34302b;--card:#1e1c19;--accent:#e08a66}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.55 system-ui,-apple-system,sans-serif}main{max-width:1180px;margin:0 auto;padding:24px 16px 80px}h1{font-size:clamp(26px,4vw,40px);margin:0 0 6px}h2{margin:44px 0 6px;font-size:24px}h3{margin:26px 0 10px;font-size:15px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)}
.meta{color:var(--muted);font-size:13px}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:12px}.card h4{margin:0 0 4px;font-size:15px}.card p{margin:0 0 8px;color:var(--muted);font-size:13px}.thumbs{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0}.thumbs figure{margin:0;width:76px}.thumbs img{width:76px;border-radius:6px;border:1px solid var(--line);display:block}.thumbs figcaption{font-size:10px;line-height:1.2;color:var(--muted);margin-top:3px}.links a{display:inline-block;margin:4px 8px 0 0;color:var(--accent);font-weight:600;font-size:13px}nav.toc a{margin-right:14px;color:var(--accent);font-weight:600}
</style></head><body><main><h1>Bibliothèques de sections par famille</h1><p class="meta">Galerie de contrôle (issue #141) · version ${commit.slice(0, 7)} · ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC · rendue par le moteur d'aperçu du studio ; contenus d'exemple marqués « Exemple », jamais enregistrés. À valider par Thomas.</p><nav class="toc">${index.map((f) => `<a href="#${f.slug}">${FAMILY_LABEL[f.family].fr}</a>`).join("")}</nav>
${index.map((f) => `<section id="${f.slug}"><h2>${FAMILY_LABEL[f.family].fr} — ${f.entries.length} sections</h2><p class="meta">Deux marques de la même famille, sans retouche manuelle : ${f.brands.map((b) => esc(b.label)).join(" et ")}.</p>
<div class="grid">${f.entries.map((e) => `<article class="card"><h4>${e.n}. ${esc(e.name)}</h4><p>${esc(e.description)}</p><div class="thumbs">${e.dispositions.map((d) => `<figure><img src="${d.thumb}" alt=""><figcaption>${esc(d.label)}</figcaption></figure>`).join("")}</div><div class="links">${f.brands.map((b) => `<a href="${f.slug}/${b.slug}/fam-${String(e.n).padStart(2, "0")}.html">${esc(b.label)}</a>`).join("")}</div></article>`).join("")}</div>
<h3>En-têtes (5)</h3><div class="grid">${f.header.map((x, i) => `<article class="card"><h4>${i + 1}. ${esc(x.label)}</h4><p>${esc(x.description)}</p><div class="thumbs"><figure><img src="${x.thumb}" alt=""></figure></div><div class="links">${f.brands.map((b) => `<a href="${f.slug}/${b.slug}/en-tete-${i + 1}.html">${esc(b.label)}</a>`).join("")}</div></article>`).join("")}</div>
<h3>Pieds de page (5)</h3><div class="grid">${f.footer.map((x, i) => `<article class="card"><h4>${i + 1}. ${esc(x.label)}</h4><p>${esc(x.description)}</p><div class="thumbs"><figure><img src="${x.thumb}" alt=""></figure></div><div class="links">${f.brands.map((b) => `<a href="${f.slug}/${b.slug}/pied-${i + 1}.html">${esc(b.label)}</a>`).join("")}</div></article>`).join("")}</div></section>`).join("")}
</main></body></html>`;
  fs.writeFileSync(path.join(out, "index.html"), hub);
  fs.writeFileSync(path.join(out, "resume.json"), JSON.stringify({ commit, date: new Date().toISOString(), runs: report }, null, 2) + "\n");
} finally { fs.rmSync(temp, { recursive: true, force: true }); }
