/**
 * État des visuels de chaque démonstration de thème sur CE serveur (diagnostic du 22 octobre) : lecture seule, base
 * temporaire, aucun réseau, aucune IA. FRAISE, ONDE, ORBE et Atelier Rive lisent le kit privé (public/demo/<id>/, hors
 * dépôt) ; les sept autres thèmes ont leurs médias suivis dans le dépôt (public/theme-assets/<id>/).
 *
 *   npx tsx scripts/theme-kit-check.ts
 *
 * Sortie : une ligne par thème (complet, ou la liste des visuels absents) et le code 1 si un visuel manque.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
if (process.env.DATA_DIR || process.env.DATABASE_FILE) throw new Error("Base existante refusée : ce contrôle travaille sur sa propre base temporaire.");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "ecs-kit-check-"));
process.env.DATA_DIR = temp;
process.env.STOCK_OFFLINE = "1";
globalThis.fetch = async () => { throw new Error("Aucun réseau pendant le contrôle"); };
const { createUser } = await import("../src/lib/auth");
const { demoProject } = await import("../tests/demo-fixtures");
const { DEMO_THEMES, KIT_THEMES, kitDir } = await import("../src/lib/theme/theme-demos");
const { themePreviewPath } = await import("../src/lib/theme/theme-fit");
const user = await createUser("kit-check@example.invalid", "controle-local-uniquement", "Contrôle du kit");
let incomplete = 0;
try {
  for (const id of DEMO_THEMES) {
    const { missing } = await demoProject(user.id, id as never);
    const thumb = path.join(process.cwd(), "public", themePreviewPath(id).replace(/^\//, ""));
    const lacks = [...(missing ?? []), ...(fs.existsSync(thumb) ? [] : [`vignette ${path.relative(process.cwd(), thumb)}`])];
    const where = (KIT_THEMES as readonly string[]).includes(id) ? `kit privé ${path.relative(process.cwd(), kitDir(id))}/` : "médias suivis dans le dépôt";
    if (lacks.length) incomplete++;
    console.log(`${lacks.length ? "MANQUE" : "complet"}  ${id.padEnd(12)} ${where}${lacks.length ? ` — ${lacks.length} absent(s) : ${lacks.join(", ")}` : ""}`);
  }
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

// Accueil et inscription (recette VANS, #204) : chemins lus par la page d'accueil (manifeste des démonstrations, avant
// le filtre onlyPresentFiles qui les vide en silence) et visuel de l'inscription.
const { DEMO_IDS } = await import("../src/lib/demo-content");
const manifest = JSON.parse(fs.readFileSync(path.join(process.cwd(), "public", "demo", "manifest.json"), "utf8")) as { demos: Record<string, unknown>[] };
const pages: [string, string[]][] = manifest.demos
  .filter((d) => (DEMO_IDS as readonly string[]).includes(d.id as string))
  .map((d) => [`accueil · démonstration ${d.id}`, [d.logo, d.photo, d.shopDesktop, d.shopMobile, d.video, d.videoPoster, ...((d.images as { src: string }[]) ?? []).map((x) => x.src), ...((d.posts as string[]) ?? [])].filter((s): s is string => typeof s === "string" && !!s)]);
pages.push(["inscription et connexion · visuel", ["/demo/onde/07-scene-salon.webp"]]);
for (const [label, files] of pages) {
  const lacks = files.filter((f) => !fs.existsSync(path.join(process.cwd(), "public", f.replace(/^\//, ""))));
  if (lacks.length) incomplete++;
  console.log(`${lacks.length ? "MANQUE" : "complet"}  ${label}${lacks.length ? ` — ${lacks.length} absent(s) : ${lacks.join(", ")}` : ""}`);
}
if (incomplete) console.log("\nCopier le kit reçu de Thomas dans public/demo/<id>/ (dossiers fraise, onde, orbe, rive, directions…), puis relancer ce contrôle. Les démos de la galerie se préparent ensuite d'elles-mêmes.");
console.log("Studio compilé (« npm run studio ») : il ne sert que les fichiers de public/ présents à son démarrage. Après une copie du kit, le redémarrer (« npm run maj » ou Ctrl+C puis « npm run studio »).");
process.exit(incomplete ? 1 : 0);
