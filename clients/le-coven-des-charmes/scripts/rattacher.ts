/**
 * Le Coven des Charmes — rattachement au VRAI projet du client dans le studio (à lancer par Thomas, une fois le
 * projet du client créé par son compte). Sans « --confirmer », le script ne fait que vérifier et décrire.
 *
 *   npx tsx clients/le-coven-des-charmes/scripts/rattacher.ts --projet <identifiant> --kit <chemin>/COVEN_CLIENT \
 *     --visuels <dossier des visuels provisoires> [--confirmer]
 *
 * Ce que fait « --confirmer », pour CE projet uniquement :
 *  1. range le logo original et les quatre photos du client dans la bibliothèque du projet (fichiers du client,
 *     convertis pour le web sans retouche), plus les polices et le sprite d'icônes ;
 *  2. pose le site du Coven dans le thème du projet (sections propres au projet, pages, menus, fiche du bracelet) et
 *     enregistre une nouvelle version du thème (l'ancienne reste restaurable dans l'historique du studio).
 * Aucun compte n'est créé, aucun autre projet n'est lu ni modifié, rien n'est publié sur Shopify, aucun appel IA.
 */
import fs from "node:fs";
import path from "node:path";

const arg = (name: string) => { const i = process.argv.indexOf(`--${name}`); return i > -1 ? process.argv[i + 1] : undefined; };
const pid = arg("projet"), kit = path.resolve(arg("kit") ?? ""), visuels = arg("visuels") ? path.resolve(arg("visuels")!) : null;
const confirm = process.argv.includes("--confirmer");
if (!pid) throw new Error("Indiquez l'identifiant du projet du client : --projet <identifiant> (onglet du projet dans le studio).");
if (!fs.existsSync(path.join(kit, "VERIFIER_COVEN.py"))) throw new Error("Indiquez le dossier COVEN_CLIENT extrait : --kit <chemin>/COVEN_CLIENT");
globalThis.fetch = async () => { throw new Error("Réseau interdit pendant le rattachement"); };

const sharp = (await import("sharp")).default;
const { covenMedia, applyCoven, COVEN_DIR, COVEN_NAME } = await import("../coven-spec");
const { covenSprite } = await import("../icones-ajustees");
const { one } = await import("../../../src/lib/db");
const { loadProject, currentTheme, saveThemeVersion } = await import("../../../src/lib/projects");
const { saveAsset } = await import("../../../src/lib/library");
const { validateSpec } = await import("../../../src/lib/theme/ops");

const row = one<{ id: string; user_id: string; name: string }>("SELECT id, user_id, name FROM projects WHERE id = ?", pid);
if (!row) throw new Error(`Projet ${pid} introuvable dans les données du studio : rien n'a été modifié.`);
const project = loadProject(pid);
const theme = currentTheme(pid);
if (!theme) throw new Error("Le projet n'a pas encore de thème : composez d'abord la boutique dans le studio (n'importe quel thème), puis relancez.");
const media = covenMedia().filter((m) => m.origin !== "maquette" || visuels);
console.log(`Projet : ${row.name} (${pid}) — marque « ${project.brand?.name ?? "?"} »`);
if (!/coven/i.test(`${row.name} ${project.brand?.name ?? ""}`)) console.warn("Attention : le nom du projet ne mentionne pas « Coven ». Vérifiez qu'il s'agit bien du projet du client.");
console.log(`Médias à ranger dans la bibliothèque du projet : ${media.length} (${media.filter((m) => m.origin === "client").length} fichiers du client)`);
console.log(`Thème actuel : version ${theme.version.id} — il restera restaurable dans l'historique.`);
if (!confirm) { console.log("Vérification seulement : ajoutez --confirmer pour poser le site du Coven dans ce projet."); process.exit(0); }

const ids: Record<string, string> = {};
for (const m of media) {
  const src = m.origin === "police" ? path.join(COVEN_DIR, "theme", m.source) : m.origin === "maquette" ? path.join(visuels!, m.source) : path.join(kit, m.source);
  if (!fs.existsSync(src)) { console.warn(`absent : ${m.file}`); continue; }
  let data = fs.readFileSync(src); let mime = "image/png";
  if (m.file.endsWith(".jpg")) { data = await sharp(data).jpeg({ quality: 90, mozjpeg: true }).toBuffer(); mime = "image/jpeg"; }
  else if (m.file.endsWith(".svg")) { data = Buffer.from(covenSprite(data.toString("utf8"))); mime = "image/svg+xml"; }
  else if (m.file.endsWith(".ttf")) mime = "font/ttf";
  const a = await saveAsset({ projectId: pid, userId: row.user_id, data, mime, name: m.file, origin: "upload", role: m.origin === "client" ? "scene" : "detail", status: "approved", meta: { alt: m.alt, provenance: m.origin === "client" ? "Fichier du client (Le Coven des Charmes)" : m.origin } as never });
  ids[m.file] = a.id;
}
const spec = applyCoven(structuredClone(theme.spec), ids, { mode: "client" });
const problems = validateSpec(spec);
if (problems.length) throw new Error("Thème refusé :\n" + problems.join("\n"));
const v = saveThemeVersion(pid, spec, `${COVEN_NAME} — site des six maquettes (projet client dédié)`, "system", undefined, theme.version.id);
console.log(`Version enregistrée : ${v.id}. Ouvrez le projet dans le studio pour vérifier et compléter prix, tailles et informations légales.`);
