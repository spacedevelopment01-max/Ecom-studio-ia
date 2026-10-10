/**
 * GRATUIT — fait passer une image de logo RÉELLE (déjà payée, par ex. celle du test OpenAI) dans le vrai moteur
 * Logo V2 du studio, sur une base de démonstration séparée : réception, nettoyage, enregistrement de l'original,
 * puis choix du client → déclinaisons, symbole seul, couleurs, typographies, version SVG si fidèle, planche.
 * Aucun appel d'IA : l'image est fournie, la relecture est SIMULÉE (notée comme telle) ; seul le code du studio tourne.
 *   DATA_DIR=$(mktemp -d) npx tsx scripts/identity-from-real-logo.ts <logo.png> [dossier-de-sortie]
 * Ne jamais lancer sur la base de production.
 */
import fs from "node:fs";
import path from "node:path";
import { all, one, run } from "@/lib/db";
import { createUser } from "@/lib/auth";
import { getSubscription, syncAllowance } from "@/lib/billing";
import { runWithLang } from "@/lib/i18n-server";
import { JobContext } from "@/lib/jobs";
import { assetData, getAsset } from "@/lib/library";
import { loadProject } from "@/lib/projects";
import { runLogoEngineV2 } from "@/lib/logo-v2/engine";
import { chooseLogoV2 } from "@/lib/logo-v2/choose";
import { ART_CRITERIA } from "@/lib/logo-v2/types";
import { seedLogoFixture } from "../tests/logo-v2-fixtures";
import { mockAi } from "../tests/logo-v2-mock";

if (!process.env.DATA_DIR) throw new Error("DATA_DIR obligatoire (base de démonstration séparée).");
const [src, outArg] = process.argv.slice(2);
if (!src) throw new Error("Chemin du logo PNG manquant.");
const OUT = path.resolve(outArg ?? "reports/openai-real-brand-test/identite");
fs.mkdirSync(OUT, { recursive: true });
const real = fs.readFileSync(src);
const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);

const u = await createUser(`identite-${Date.now()}@demo.fr`, "motdepasse-demo", "Démo");
getSubscription(u.id);
run("UPDATE subscriptions SET status = 'active', plan = 'creer' WHERE user_id = ?", u.id);
syncAllowance(u.id);
const pid = fr(() => seedLogoFixture(u.id, "artisan"));
const jid = `job-identite-${Date.now()}`;
run("INSERT INTO jobs (id, user_id, project_id, type, label, payload, status, run_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)", jid, u.id, pid, "brand.logo.v2", "brand.logo.v2", JSON.stringify({ projectId: pid }), "running", Date.now(), Date.now(), Date.now());
const ctx = new JobContext(one<any>("SELECT * FROM jobs WHERE id = ?", jid));

// Une seule direction (monogramme, comme la demande faite à OpenAI) ; l'image est celle fournie.
const DIRECTION = { name: "Monogramme d'artisan", markType: "monogram", composition: "stacked", construction: "illustrative", sobriety: 3, style: "monogram", symbolIdea: "les initiales S et B, un toit, la truelle et le coup de pinceau", descriptor: "PLÂTRERIE • PEINTURE" };
const drafts = (b: any) => [{ concept: `Monogramme S B pour ${b.name}, avec les gestes du métier.`, whyItFits: "Les initiales signent le travail de l'artisan.", typography: { style: "grotesque", weight: "bold", case: "upper", tracking: "normal", rationale: "" }, colorRole: { ink: "dark", accent: "primary", rationale: "" }, distinctive: "", avoid: [], ...DIRECTION }];
const ai = {
  ...mockAi({ calls: [] } as any, { drafts: drafts as any }),
  artworkRoute: () => ({ provider: "openai", model: "gpt-image-2" }),
  drawArtwork: async () => real,
  // Relecture SIMULÉE (aucun appel) : le texte a été vérifié à l'œil sur l'image réelle.
  reviewArtwork: async (_b: Buffer, _t: any, _br: any, exp: { name: string }) => ({ criteria: Object.fromEntries(ART_CRITERIA.map((k) => [k, 8.6])), textRead: exp.name, nameExact: true, extraText: false, nameBox: null, clumsyCliche: false, resemblesKnownBrand: false, amateur: false, artifacts: false, issues: [], needsSimplifiedMark: true }),
};
const r = await fr(() => runLogoEngineV2(ctx, pid, { ai: ai as any, count: 1 } as any));
const prop = r.shown[0] ?? r.discarded[0];
if (!prop?.assetId) throw new Error(`Aucune proposition enregistrée : ${JSON.stringify(r.notes ?? r)}`);
const original = getAsset(prop.assetId)!;
const kept = one<{ id: string }>("SELECT id FROM assets WHERE project_id = ? AND role = 'logo-v2-original' AND source_asset_id = ?", pid, prop.assetId);
console.log(`Proposition enregistrée : ${original.name} — fichier reçu conservé à l'identique : ${!!kept && Buffer.compare(assetData(getAsset(kept.id)!), real) === 0}`);
await fr(() => chooseLogoV2(null, pid, prop.assetId!));

const brand = loadProject(pid).brand!;
const rows = all<any>("SELECT id, name, role, mime, meta FROM assets WHERE project_id = ? AND deleted_at IS NULL ORDER BY created_at, rowid", pid);
const listed: { role: string; file: string; bytes: number }[] = [];
for (const a of rows) {
  if (!a.role || !/^(logo|favicon|brand-board)/.test(a.role)) continue;
  const data = assetData(getAsset(a.id)!);
  const file = `${a.role}-${a.name}`;
  fs.writeFileSync(path.join(OUT, file), data);
  listed.push({ role: a.role, file, bytes: data.length });
}
const summary = { project: brand.name, logo: { status: brand.logo.status, provisional: brand.logo.provisional ?? false, engine: brand.logo.engine }, palette: brand.palette, fonts: brand.fonts, files: listed, review: "SIMULÉE (aucun appel d'IA)" };
fs.writeFileSync(path.join(OUT, "identite.json"), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
