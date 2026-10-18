/** Inventaire de TOUTES les sections du thème de base et de leur couverture : bibliothèque du studio (Thème → Sections),
 * famille d'origine, où elles sont utilisées, variantes (dispositions, styles, formats), réglages, blocs et couverture
 * d'export par plateforme. Produit docs/coordination/BIBLIOTHEQUE_SECTIONS_COUVERTURE.md ; le test
 * tests/section-library-coverage.test.ts vérifie que l'inventaire et la bibliothèque citent chaque section.
 *
 *   npx tsx scripts/sections-inventory.ts
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { SECTION_LIBRARY, addable, libraryCoverage, libraryEntry } from "../src/lib/theme/section-library";
import { LAYOUT_CHOICES } from "../src/lib/theme/layout-choices";
import { baseSectionTypes, sectionSchema } from "../src/lib/theme/spec";
import { CAPABILITIES } from "../src/lib/cms-v2/capabilities";

const ROOT = process.cwd();
const types = baseSectionTypes().sort();
const FAMILY: [RegExp, string][] = [
  [/^(header|footer|announcement-bar|cart-drawer|main-)/, "Structure (tous les thèmes)"],
  [/^cv-/, "FRAISE GUMMIES / ONDE AUDIO (profil conversion, lot 2C)"],
  [/^ed-/, "ORBE / Atelier Rive (éditorial, lot 2B)"],
  [/^ref-/, "Thèmes de référence (lot 2A)"],
  [/^v2-/, "Moteur v2 (Codex)"],
  [/^(booking|services-list|practical-info|pricing|team|portfolio|shipping-journey|precautions)/, "Sites de services"],
];
const family = (t: string) => FAMILY.find(([re]) => re.test(t))?.[1] ?? "Base du studio (11 directions)";
const VARIANT_KEYS = new Set(["layout", "style", "ratio", "variant", "columns", "columns_mobile", "align", "heading_align", "position", "size", "width", "image_position", "text_position", "shape", "format"]);
/** Fichiers qui citent le type (générateurs de thèmes, moteur v2, démonstrations) : « utilisée par ». */
const grep = (() => {
  const out = execFileSync("grep", ["-rlF", "--include=*.ts", "-e", "PLACEHOLDER", "src/lib/theme", "src/lib/cms-v2", "src/lib/engine", "tests", "worker"], { cwd: ROOT, encoding: "utf8" }).trim(); void out; // réchauffe
  return (t: string) => { try { return execFileSync("grep", ["-rlF", "--include=*.ts", `"${t}"`, "src/lib/theme", "src/lib/engine", "tests", "worker"], { cwd: ROOT, encoding: "utf8" }).trim().split("\n").filter(Boolean).filter((f) => !/section-library|layout-choices|section-defaults|spec\.ts|sections-inventory/.test(f)).map((f) => path.basename(f)); } catch { return [] as string[]; } };
})();
const rows = types.map((t) => {
  const schema = sectionSchema(null, t, "fr")!; const e = libraryEntry(t, "fr")!;
  const settings = schema.settings.filter((s) => s.id);
  const byType = settings.reduce<Record<string, number>>((acc, s) => ((acc[s.type] = (acc[s.type] ?? 0) + 1), acc), {});
  const variants = [...new Set([...(LAYOUT_CHOICES[t] ?? []), ...settings.filter((s) => s.type === "select" && VARIANT_KEYS.has(s.id!)).map((s) => s.id!)])].map((k) => { const s = settings.find((x) => x.id === k); return s?.options ? `${k} (${s.options.length})` : k; });
  const hasAsset = settings.some((s) => s.type === "text" && (s.id === "image_asset" || /_asset$/.test(s.id!))) || schema.blocks.some((b) => (b.settings ?? []).some((s) => s.type === "text" && /_asset$/.test(s.id ?? "")));
  const anim = settings.some((s) => s.id === "animation");
  return { type: t, name: e.name, category: e.category, family: family(t), used: grep(t), variants, settings: settings.length, byType, blocks: schema.blocks.filter((b) => !b.type.startsWith("@")).map((b) => `${b.name ?? b.type}${b.limit ? ` (max ${b.limit})` : ""}`), maxBlocks: schema.max_blocks, library: addable(t) ? "ajoutable" : "structurelle (réglable, non dupliquée)", hasAsset, anim, presets: schema.presets?.length ?? 0 };
});
const cov = libraryCoverage(types);
const plat = (k: keyof typeof CAPABILITIES) => CAPABILITIES[k].capabilities.native_editing;
const fmtTypes = (b: Record<string, number>) => Object.entries(b).sort((x, y) => y[1] - x[1]).map(([k, n]) => `${k} ×${n}`).join(", ");
const md = `# Bibliothèque de sections — inventaire et couverture

Généré par \`scripts/sections-inventory.ts\` le ${new Date().toISOString().slice(0, 10)} ; contrôlé par \`tests/section-library-coverage.test.ts\` (une section ajoutée sans entrée de bibliothèque ou absente de cet inventaire fait échouer la CI).

**${types.length} sections** dans \`theme-base/sections/\` : **${types.filter(addable).length} ajoutables** depuis Studio → Boutique → « Ajouter une section » (Thème → Sections) et **${types.filter((t) => !addable(t)).length} composants structurels** (en-tête, bandeau, pied de page, panier latéral, corps de gabarits) rangés dans la catégorie « Structure » : retrouvables et réglables depuis la bibliothèque et le menu « Modifier les réglages », jamais ajoutés ni dupliqués (un seul en-tête, un seul panier). Couverture bibliothèque : ${cov.covered.length}/${types.length} (FR et EN). Sections avec réglages d'animation : ${rows.filter((r) => r.anim).length}.

Toute section de page est **ajoutable, duplicable, déplaçable, masquable, supprimable et sauvegardée** (menu « … » et poignée de la structure ; chaque action crée une version restaurable). Les réglages de chaque section s'éditent **manuellement** (panneau « Modifier les réglages » : textes, visuels, liens, boutons, couleurs, formats, dispositions, blocs et leur ordre, animations) et **par l'IA** (discussion) : mêmes opérations \`/theme/ops\`, même source de données.

## Couverture d'export (par plateforme, pour toutes les sections)

| Plateforme | Livraison | Édition native après installation (registre Codex, \`src/lib/cms-v2/capabilities.ts\`) |
|---|---|---|
| Shopify | thème OS 2.0 | ${plat("shopify").status} — ${plat("shopify").note.fr} Chaque réglage du schéma devient un champ de l'éditeur de thème ; les réglages \`image_asset\` (fichier du thème) y restent des champs texte, l'image native passe par le réglage \`image\` (image_picker) présent sur les sections visuelles. |
| WordPress / WooCommerce | thème de blocs | ${plat("woocommerce").status} — ${plat("woocommerce").note.fr} |
| PrestaShop | thème | ${plat("prestashop").status} — ${plat("prestashop").note.fr} |
| Wix, Squarespace | kit de reconstruction | ${plat("wix").status} — ${plat("wix").note.fr} |

Détail du contrat d'édition et des manques : \`docs/coordination/LOT_2C_CONTRAT_EDITION_EXPORT.md\`.

## Inventaire

Colonnes : famille d'origine ; fichiers qui utilisent la section (générateurs, moteur v2, démonstrations) ; variantes = réglages de disposition / style / format (nombre d'options) ; réglages par type ; blocs ; bibliothèque ; A = réglages d'animation, F = visuel par fichier du thème (\`image_asset\`).

| Section | Nom (bibliothèque) | Catégorie | Famille d'origine | Utilisée par | Variantes | Réglages | Blocs | Bibliothèque | A | F |
|---|---|---|---|---|---|---|---|---|---|---|
${rows.map((r) => `| \`${r.type}\` | ${r.name} | ${r.category} | ${r.family} | ${r.used.length ? r.used.slice(0, 4).join(", ") + (r.used.length > 4 ? ` (+${r.used.length - 4})` : "") : "—"} | ${r.variants.length ? r.variants.join(", ") : "—"} | ${r.settings} (${fmtTypes(r.byType)}) | ${r.blocks.length ? r.blocks.join(", ") + (r.maxBlocks ? ` · max ${r.maxBlocks}` : "") : "—"} | ${r.library} | ${r.anim ? "oui" : "—"} | ${r.hasAsset ? "oui" : "—"} |`).join("\n")}

## Lecture rapide par famille

${[...new Set(rows.map((r) => r.family))].map((f) => `- **${f}** : ${rows.filter((r) => r.family === f).length} sections — ${rows.filter((r) => r.family === f).map((r) => `\`${r.type}\``).join(", ")}`).join("\n")}
`;
fs.writeFileSync(path.join(ROOT, "docs", "coordination", "BIBLIOTHEQUE_SECTIONS_COUVERTURE.md"), md);
console.log(JSON.stringify({ sections: types.length, addable: types.filter(addable).length, structural: types.filter((t) => !addable(t)).length, covered: cov.covered.length, library: SECTION_LIBRARY.length, animated: rows.filter((r) => r.anim).length }));
