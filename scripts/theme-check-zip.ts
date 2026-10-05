/**
 * Theme Check (outil officiel de Shopify) sur le ZIP réellement téléchargé par le client (exportThemeZip),
 * et pas seulement sur les fichiers compilés : thèmes de démonstration (dont un thème avec une section sur mesure)
 * ou, avec --db, le thème actuel de chaque projet de la base locale.
 *
 * Usage : tsx scripts/theme-check-zip.ts [dossier] [--db]
 * Code de sortie 1 si une erreur Theme Check est trouvée dans un thème du studio (les thèmes importés
 * du client sont seulement signalés : leurs défauts viennent du thème d'origine).
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { unzipSync } from "fflate";
import { check } from "@shopify/theme-check-node";
import { buildSpec } from "../src/lib/theme/directions";
import { localCopy } from "../src/lib/engine/local-copy";
import { emptyProduct } from "../src/lib/project-types";
import { exportThemeZip } from "../src/lib/theme/compile";
import { applyOps } from "../src/lib/theme/ops";
import type { AssetLoader } from "../src/lib/theme/compile";
import type { ThemeSpec } from "../src/lib/theme/spec";
import { runWithLang } from "../src/lib/i18n-server";

const args = process.argv.slice(2);
const fromDb = args.includes("--db");
const root = args.find((a) => !a.startsWith("--")) || path.join(os.tmpdir(), "es-theme-check-zip");

/** Section sur mesure conforme (réglages, blocs, préréglage) : vérifie le chemin « thème entièrement sur mesure ». */
const CUSTOM = `<section id="es-{{ section.id }}" class="es-section es-cx-demo color-{{ section.settings.color_scheme }}" style="--pt: {{ section.settings.padding_top }}px; --pb: {{ section.settings.padding_bottom }}px;">
  <div class="es-container"><h2 class="es-heading es-h2">{{ section.settings.heading | escape }}</h2>
  {% for block in section.blocks %}<div {{ block.shopify_attributes }}>{{ block.settings.text | escape }}</div>{% endfor %}</div>
</section>
{% schema %}
{"name":"Démo","tag":"div","settings":[{"type":"text","id":"heading","label":"Titre","default":"Bonjour"},{"type":"color_scheme","id":"color_scheme","label":"Couleurs","default":"scheme-1"},{"type":"range","id":"padding_top","min":0,"max":200,"step":8,"unit":"px","label":"Haut","default":96},{"type":"range","id":"padding_bottom","min":0,"max":200,"step":8,"unit":"px","label":"Bas","default":96}],"blocks":[{"type":"item","name":"Élément","settings":[{"type":"text","id":"text","label":"Texte","default":"x"}]}],"presets":[{"name":"Démo"}]}
{% endschema %}`;

function demoSpec(direction: string): ThemeSpec {
  const product = { ...emptyProduct(), name: "Sérum Éclat", sector: "beaute" as const, summary: "Sérum.", facts: [] };
  const copy = runWithLang({ content: "fr" }, () => localCopy(product, { name: "Maison Ondine", tagline: "Le soin, simplement.", story: "", values: [] }));
  return buildSpec({ direction: direction as any, shopName: "Maison Ondine", palette: { primary: "#8A4B2A", secondary: "#E9D8C4", accent: "#C9A27E", light: "#F6F1EA", dark: "#1E1612" }, copy, images: { hero: "es-hero.jpg", packshot: "es-packshot.jpg" }, files: {}, product: { title: "Sérum", handle: "serum", vendor: "M", description_html: "", price: 100, compare_at_price: null, currency: "EUR", options: [], variants: [], images: [], tags: [] }, language: "fr" });
}

async function themes(): Promise<{ name: string; spec: ThemeSpec; load: AssetLoader }[]> {
  if (fromDb) {
    const { all } = await import("../src/lib/db");
    const { currentTheme } = await import("../src/lib/projects");
    const { libraryLoader } = await import("../src/lib/theme/loader");
    return all<{ id: string; name: string }>("SELECT id, name FROM projects ORDER BY created_at DESC")
      .map((p) => ({ p, v: currentTheme(p.id) }))
      .filter((x) => x.v)
      .map(({ p, v }) => ({ name: `${p.id} ${p.name}`, spec: v!.spec as ThemeSpec, load: libraryLoader }));
  }
  const noFiles: AssetLoader = () => null;
  const out = ["atelier", "gourmand", "flux"].map((d) => ({ name: `démo ${d}`, spec: demoSpec(d), load: noFiles }));
  const custom = applyOps(demoSpec("atelier"), [
    { op: "custom_section", type: "es-custom-demo", name: "Démo", liquid: CUSTOM },
    { op: "add_section", template: "index", type: "es-custom-demo", settings: {} },
  ]);
  if (custom.rejected.length) throw new Error(`Section sur mesure refusée : ${custom.rejected.map((r) => r.reason).join(" ; ")}`);
  out.push({ name: "démo atelier + section sur mesure", spec: custom.spec, load: noFiles });
  return out;
}

let failures = 0;
await runWithLang({ content: "fr", ui: "fr" }, async () => {
  for (const t of await themes()) {
    const { zip } = await exportThemeZip(t.spec, t.load);
    const dir = path.join(root, t.name.replace(/[^\w-]+/g, "-"));
    fs.rmSync(dir, { recursive: true, force: true });
    for (const [f, d] of Object.entries(unzipSync(new Uint8Array(zip)))) {
      if (f.endsWith("/")) continue;
      fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
      fs.writeFileSync(path.join(dir, f), d);
    }
    const offenses = await check(dir);
    const errors = offenses.filter((o) => o.severity === 0);
    console.log(`${errors.length ? "ERREUR" : "ok"} ${t.name}${t.spec.imported ? " (importé)" : ""} : ${errors.length} erreur(s), ${offenses.length - errors.length} autre(s)`);
    for (const e of errors.slice(0, 10)) console.log(`   ${e.check} ${e.uri.replace(dir, "")}:${e.start?.line ?? ""} ${e.message.slice(0, 200)}`);
    if (errors.length && !t.spec.imported) failures++;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
if (failures) {
  console.error(`${failures} thème(s) du studio avec des erreurs Theme Check.`);
  process.exit(1);
}
