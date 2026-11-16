/**
 * Monte la page d'essai du ciel en un seul fichier (moteur et styles du Studio inclus).
 * Usage : npx tsx scripts/ciel/essai.mts <fichier de sortie.html>
 */
import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";

const racine = path.resolve(import.meta.dirname, "../.."), sortie = process.argv[2];
if (!sortie) throw new Error("Indique le fichier de sortie.");
const js = (await build({ entryPoints: [path.join(racine, "scripts/ciel/essai-page.ts")], bundle: true, minify: true, write: false, format: "iife", target: "es2020", alias: { "@": path.join(racine, "src") } })).outputFiles[0].text;
const css = fs.readFileSync(path.join(racine, "src/components/studio/ciel/ciel.css"), "utf8");
fs.writeFileSync(sortie, `<title>Le ciel du Studio</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600&display=swap">
<style>
/* Mise en page : une barre d'essai fine en haut, puis le ciel du Studio sur tout l'écran. Un seul habit : la nuit. */
:root { --fond: #070B1F; --barre: #0C1230; --trait: rgba(157,180,255,.22); --texte: #E9EDFF; --doux: #9AA5CF; --bleu: #7C9CFF; --font-sans: "Inter", system-ui, sans-serif; --font-serif: "Instrument Serif", Georgia, serif; color-scheme: dark; }
html, body { height: 100%; }
body { background: var(--fond); color: var(--texte); font: 400 14px/1.4 var(--font-sans); display: grid; grid-template-rows: auto minmax(0, 1fr); overflow: hidden; }
.barre { background: var(--barre); border-bottom: 1px solid var(--trait); padding-block: 10px; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); display: flex; flex-wrap: wrap; align-items: center; gap: 8px 14px; }
.barre .choix { display: inline-flex; padding: 3px; border: 1px solid var(--trait); border-radius: 999px; }
.barre button { font: 500 12.5px var(--font-sans); color: var(--doux); background: none; border: 0; padding: 7px 12px; border-radius: 999px; cursor: pointer; white-space: nowrap; }
.barre button[aria-pressed="true"] { background: var(--bleu); color: var(--fond); }
.barre button:focus-visible { outline: 2px solid var(--bleu); outline-offset: 2px; }
.barre p { margin: 0; font-size: 12px; color: var(--doux); }
.barre #qualite-lue { color: var(--texte); font-weight: 500; }
#scene { min-height: 0; position: relative; }
#scene .ciel { height: 100%; min-height: 0; }
${css}
</style>
<div class="barre">
  <div class="choix" role="group" aria-label="Moment du projet" data-groupe="moment"><button type="button" data-valeur="jour" aria-pressed="false">Premier jour</button><button type="button" data-valeur="chantier" aria-pressed="false">En construction</button><button type="button" data-valeur="livre" aria-pressed="true">Livré</button></div>
  <div class="choix" role="group" aria-label="Qualité du ciel" data-groupe="qualite"><button type="button" data-valeur="auto" aria-pressed="true">Automatique</button><button type="button" data-valeur="pleine" aria-pressed="false">Complète</button><button type="button" data-valeur="allegee" aria-pressed="false">Allégée</button></div>
  <p><span id="qualite-lue"></span> sur cet appareil. Projets inventés pour l'essai.</p>
</div>
<div id="scene"></div>
<script>${js.replace(/<\/script/g, "<\\/script")}</script>
`);
console.log("page écrite :", sortie, Math.round(fs.statSync(sortie).size / 1024) + " Ko");
