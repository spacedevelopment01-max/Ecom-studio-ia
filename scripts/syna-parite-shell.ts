/**
 * SYNA FULL PARITY (#301) : rejoue les recettes navigateur de Codex (`verify-agent211-*-ui.ts`, lancées par
 * `verify-agent211-build.ts`) DANS la coquille Encre / Plein cadre, sans modifier les fichiers de Codex.
 *
 * Le lanceur génère des copies temporaires (`scripts/zz-parite-*.ts`), lance la recette demandée, puis les supprime.
 * Adaptations, et rien d'autre (les vérifications de Codex restent identiques) :
 *  - ouverture de SYNA : l'accès de la coquille (`[aria-controls="syna-panel"]` visible : onglet signature en Encre,
 *    bouton « Ouvrir Syna » de la barre en Plein cadre, onglet Syna au téléphone) au lieu de la pastille noire « SYNA » ;
 *  - fenêtre SYNA : `#syna-panel` (colonne, feuille ou panneau selon le mode et la taille) au lieu du dialogue du dock ;
 *  - coquille activée (`STUDIO_SYNA_SHELL=1`) et chaque compte de test reçoit le mode demandé, conversation repliée à
 *    l'arrivée (comme la pastille actuelle, fermée par défaut).
 *
 * Usage : npx tsx scripts/syna-parite-shell.ts <encre|plein> <dossier de preuve> <options de verify-agent211-build…>
 * Exige un build de production (`.next/BUILD_ID`), comme le harnais de Codex. Aucun fournisseur réel : le harnais de
 * Codex remplace les fournisseurs par un serveur local simulé.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const [mode, out, ...flags] = process.argv.slice(2);
if (mode !== "encre" && mode !== "plein") throw Error("Mode attendu : encre ou plein");
if (!out || !flags.length) throw Error("Usage : syna-parite-shell.ts <encre|plein> <dossier> <options…>");

const dir = path.resolve("scripts");
const prefix = "zz-parite-";
const sources = fs.readdirSync(dir).filter((f) => /^verify-agent211-.*\.ts$/.test(f));
const rename = (s: string) => s.replace(/(["'`])\.\/verify-agent211-/g, `$1./${prefix}verify-agent211-`);
const generated: string[] = [];
const write = (name: string, text: string) => { const p = path.join(dir, prefix + name); fs.writeFileSync(p, text); generated.push(p); };

let replaced = { opener: 0, panel: 0 };
for (const f of sources) {
  let s = fs.readFileSync(path.join(dir, f), "utf8");
  const before = s;
  s = s.replace(/getByRole\('button',\{name:'SYNA',exact:true\}\)/g, () => { replaced.opener++; return `locator('[aria-controls="syna-panel"]:visible').first()`; });
  s = s.replace(/getByRole\('dialog',\{name:'SYNA — conversation du projet',exact:true\}\)/g, () => { replaced.panel++; return `locator('#syna-panel')`; });
  s = rename(s);
  if (f === "verify-agent211-build.ts") {
    const anchor = "const {account}=await import('../tests/conversation209-fixtures');";
    if (!s.includes(anchor)) throw Error("Point d'ancrage du harnais introuvable : la recette de Codex a changé");
    s = s.replace(anchor,
      "const {account:__account0}=await import('../tests/conversation209-fixtures');" +
      "const {writeSynaPrefs:__synaPrefs}=await import('../src/lib/syna-ui/prefs-store');" +
      `const account=(async(...a:Parameters<typeof __account0>)=>{const u=await __account0(...a);__synaPrefs(u.id,'account',null,{mode:'${mode}',panel:'collapsed'});return u;}) as typeof __account0;`);
    s = s.replace("process.env.STUDIO_CONVERSATION_LOT_A='1';", "process.env.STUDIO_CONVERSATION_LOT_A='1';process.env.STUDIO_SYNA_SHELL='1';");
  }
  if (s !== before || f === "verify-agent211-build.ts") write(f, s);
}
// Les copies non modifiées doivent exister aussi : le harnais généré les importe sous le nouveau nom.
for (const f of sources) if (!fs.existsSync(path.join(dir, prefix + f))) write(f, rename(fs.readFileSync(path.join(dir, f), "utf8")));

console.log(`· parité coquille : mode ${mode}, ${generated.length} copies, ${replaced.opener} ouvertures et ${replaced.panel} fenêtres adaptées`);
let code = 1;
try {
  const r = spawnSync(process.execPath, ["--import", "tsx", path.join(dir, prefix + "verify-agent211-build.ts"), out, ...flags], { stdio: "inherit", env: process.env });
  code = r.status ?? 1;
} finally {
  for (const p of generated) fs.rmSync(p, { force: true });
}
process.exit(code);
