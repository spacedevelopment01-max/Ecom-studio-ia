/** Vérifie les deux ZIP effectivement remis, sans installer de CMS ni utiliser de réseau. */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { unzipSync } from "fflate";
import { check } from "@shopify/theme-check-node";
const output = path.dirname(fileURLToPath(import.meta.url));
globalThis.fetch = async () => { throw new Error("Réseau interdit dans la vérification des ZIP."); };
const results = [];
for (const kind of ["products", "services"]) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "ecs-lot2a-export-"));
  try {
    const bytes = fs.readFileSync(path.join(output, kind, "shopify.zip"));
    const zip = unzipSync(bytes);
    for (const [file, data] of Object.entries(zip)) {
      if (file.includes("..") || path.isAbsolute(file)) throw new Error("Chemin ZIP invalide.");
      const to = path.join(temp, file); fs.mkdirSync(path.dirname(to), { recursive: true }); fs.writeFileSync(to, data);
    }
    const offenses = await check(temp);
    const items = (severity) => offenses.filter((x) => x.severity === severity).map((x) => ({ check: x.check, message: x.message }));
    results.push({ kind, files: Object.keys(zip).length, sha256: crypto.createHash("sha256").update(bytes).digest("hex"), errors: items(0), warnings: items(1) });
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
}
const proof = JSON.parse(fs.readFileSync(path.join(output, "preuves.json"), "utf8"));
const result = { sourceCommit: proof.sourceCommit, cmsInstalled: false, results };
fs.writeFileSync(path.join(output, "export-check.json"), JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result));
if (results.some((x) => x.errors.length)) process.exitCode = 1;
