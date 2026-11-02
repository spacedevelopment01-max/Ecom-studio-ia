/**
 * SYNA FULL PARITY (#301) : rejoue les recettes navigateur de Codex (`verify-agent211-*-ui.ts`, lancées par
 * `verify-agent211-build.ts`) DANS la coquille Encre / Plein cadre, sans modifier les fichiers de Codex.
 *
 * Le lanceur génère des copies temporaires (`scripts/zz-parite-*.ts`), lance la recette demandée, puis les supprime.
 * Adaptations, et rien d'autre (les vérifications de Codex restent identiques) :
 *  - ouverture de SYNA : l'accès de la coquille (`[aria-controls="syna-panel"]` visible : onglet signature en Encre,
 *    bouton « Ouvrir Syna » de la barre en Plein cadre, onglet Syna au téléphone) au lieu de la pastille noire « SYNA » ;
 *  - fenêtre SYNA : `#syna-panel:visible` (colonne, feuille ou panneau selon le mode et la taille) au lieu du dialogue du
 *    dock. Repliée, la colonne reste dans la page (même conversation) mais masquée : seule la fenêtre visible compte,
 *    comme un dialogue fermé qui disparaît de l'arbre d'accessibilité ;
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
// Préfixe unique : deux lanceurs en parallèle (Encre et Plein cadre) ne partagent jamais leurs copies.
const prefix = `zz-parite-${mode}-${process.pid}-`;
const sources = fs.readdirSync(dir).filter((f) => /^verify-agent211-.*\.ts$/.test(f));
const rename = (s: string) => s.replace(/(["'`])\.\/verify-agent211-/g, `$1./${prefix}verify-agent211-`);
const generated: string[] = [];
const write = (name: string, text: string) => { const p = path.join(dir, prefix + name); fs.writeFileSync(p, text); generated.push(p); };

let replaced = { opener: 0, panel: 0 };
for (const f of sources) {
  let s = fs.readFileSync(path.join(dir, f), "utf8");
  const before = s;
  s = s.replace(/getByRole\('button',\{name:'SYNA',exact:true\}\)/g, () => { replaced.opener++; return `locator('[aria-controls="syna-panel"]:visible').first()`; });
  s = s.replace(/getByRole\('dialog',\{name:'SYNA — conversation du projet',exact:true\}\)/g, () => { replaced.panel++; return `locator('#syna-panel:visible')`; });
  // Même fenêtre désignée sans son nom (recette de la conversation) : seul dialogue SYNA visé par ces lectures de texte.
  s = s.replace(/getByRole\('dialog'\)\.getByText\(/g, () => { replaced.panel++; return `locator('#syna-panel:visible').getByText(`; });
  // Identifiant du panneau : `#central-agent-panel` (dock) devient `#syna-panel` (coquille), modal aussi au téléphone.
  s = s.replace(/central-agent-panel/g, () => { replaced.panel++; return "syna-panel"; });
  // Diagnostic facultatif (PARITE_DIAG=1) : avant l'assertion de débordement de Codex, inchangée, on journalise les
  // éléments qui dépassent la largeur de l'écran.
  if (process.env.PARITE_DIAG === "1") s = s.replace(/assert\.ok\(await ([a-zA-Z]+)\.evaluate\(\(\)=>document\.documentElement\.scrollWidth<=innerWidth\)\)/g, (m, pg) => `{const __o=await ${pg}.evaluate(()=>document.documentElement.scrollWidth<=innerWidth?null:{w:innerWidth,sw:document.documentElement.scrollWidth,o:[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.right>innerWidth+1;}).slice(0,15).map(e=>e.tagName+'#'+e.id+'.'+String(e.getAttribute('class')??'').slice(0,90)+' right='+Math.round(e.getBoundingClientRect().right))});if(__o)console.log('DEBORDEMENT '+JSON.stringify(__o));}${m}`);
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
