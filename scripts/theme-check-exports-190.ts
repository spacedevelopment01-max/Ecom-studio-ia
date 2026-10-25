/**
 * Mission #190, point 6 — Theme Check (outil officiel de Shopify) sur les ZIP Shopify livrés au client.
 *
 *   npx tsx scripts/theme-check-exports-190.ts <dossier des exports> [sortie.json]
 *
 * <dossier>/<thème>/shopify.zip est décompressé dans un dossier temporaire puis contrôlé : erreurs (bloquantes, comme
 * la CI) et avertissements par thème.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { unzipSync } from "fflate";
import { check } from "@shopify/theme-check-node";

const [root, outFile] = process.argv.slice(2);
const result: Record<string, { errors: number; warnings: number; detail: string[] }> = {};
for (const theme of fs.readdirSync(root).filter((d) => fs.existsSync(path.join(root, d, "shopify.zip")))) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `tc-${theme}-`));
  const files = unzipSync(new Uint8Array(fs.readFileSync(path.join(root, theme, "shopify.zip"))));
  for (const [p, data] of Object.entries(files)) { if (p.endsWith("/")) continue; fs.mkdirSync(path.dirname(path.join(dir, p)), { recursive: true }); fs.writeFileSync(path.join(dir, p), data); }
  const offenses = await check(dir);
  const errors = offenses.filter((o) => o.severity === 0);
  result[theme] = { errors: errors.length, warnings: offenses.length - errors.length, detail: errors.slice(0, 8).map((o) => `${o.check} ${o.uri.slice(o.uri.indexOf(theme) + theme.length)}:${o.start?.line ?? ""} ${o.message}`) };
  console.log(`${errors.length ? "✗" : "✓"} ${theme} : ${errors.length} erreur(s), ${offenses.length - errors.length} avertissement(s)`);
  fs.rmSync(dir, { recursive: true, force: true });
}
if (outFile) fs.writeFileSync(outFile, JSON.stringify(result, null, 2) + "\n");
process.exit(Object.values(result).some((r) => r.errors) ? 1 : 0);
