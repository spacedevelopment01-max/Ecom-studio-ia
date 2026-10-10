/**
 * BENCHMARK RÉEL (payant, avec accord) — 3 logos pour Sébastien Blanc par le MOTEUR DU STUDIO (Logo V2) : vraies images
 * OpenAI (modèle de l'usage « Logos », en flux), vraies relectures (modèle de contrôle qualité), devis et plafond du
 * studio, originaux sauvegardés dans le projet (visibles dans l'onglet Marque). Seules les 3 directions sont fournies
 * ici (A, B, C demandées par le propriétaire pour CE projet) à la place de l'étape « territoires » : tout le reste est
 * le parcours réel.
 *   npx tsx scripts/benchmark-logo-quality.ts "Sebastien Blanc"            → affiche le devis, n'envoie rien
 *   npx tsx scripts/benchmark-logo-quality.ts "Sebastien Blanc" --prompts  → écrit aussi les demandes exactes (rien n'est envoyé)
 *   npx tsx scripts/benchmark-logo-quality.ts "Sebastien Blanc" --confirm  → lance la série (une seule fois)
 * Sortie : reports/logo-quality/benchmark-<date>/ (originaux, notes, défauts, coûts, demandes envoyées).
 * Aucune nouvelle tentative automatique ; plafond = devis. Aucune clé n'est lue ni écrite ici.
 */
import fs from "node:fs";
import path from "node:path";
import { all, json, one, run } from "@/lib/db";
import { JobContext } from "@/lib/jobs";
import { assetData, getAsset } from "@/lib/library";
import { loadProject } from "@/lib/projects";
import { runWithLang } from "@/lib/i18n-server";
import { runForUser } from "@/lib/ai/access";
import { realLogoV2Ai } from "@/lib/logo-v2/ai";
import { runLogoEngineV2 } from "@/lib/logo-v2/engine";
import { logoSeriesQuote } from "@/lib/logo-v2/quote";
import { artworkPrompt } from "@/lib/logo-v2/artwork";
import { brandDiscovery } from "@/lib/logo-v2/discovery";
import { selectTerritories, type TerritoryDraft } from "@/lib/logo-v2/territories";

const args = process.argv.slice(2);
const query = args.find((a) => !a.startsWith("--"));
if (!query) throw new Error('Nom du projet manquant : npx tsx scripts/benchmark-logo-quality.ts "Sebastien Blanc"');
const fold = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
const proj = all<{ id: string; name: string; user_id: string }>("SELECT id, name, user_id FROM projects ORDER BY updated_at DESC").find((p) => p.id === query || fold(p.name).includes(fold(query)));
if (!proj) throw new Error(`Projet introuvable : ${query}`);
const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);

const T = (o: Partial<TerritoryDraft> & Pick<TerritoryDraft, "name" | "concept" | "markType" | "composition" | "construction" | "style">): TerritoryDraft =>
  ({ whyItFits: "Direction demandée par le propriétaire pour ce projet.", typography: { style: "grotesque", weight: "bold", case: "upper", tracking: "wide", rationale: "" }, colorRole: { ink: "dark", accent: "primary", rationale: "" }, sobriety: 3, symbolIdea: null, distinctive: "", avoid: [], descriptor: "PLÂTRERIE • PEINTURE", ...o }) as TerritoryDraft;

/** Les 3 directions du propriétaire pour CE projet (jamais une règle pour les autres marques). */
const DIRECTIONS: TerritoryDraft[] = [
  T({
    name: "Signature premium",
    concept: "Un monogramme SB réellement dessiné, élégant et contemporain, qui signe le travail comme une griffe d'atelier.",
    markType: "monogram", composition: "stacked", construction: "typographic", style: "premium", sobriety: 2,
    typography: { style: "contemporary_serif", weight: "regular", case: "upper", tracking: "wide", rationale: "Élégance sans faux luxe." },
    symbolIdea: "les lettres S et B construites ensemble, la courbe du S devenant le geste d'un lissage parfait",
    distinctive: "un monogramme qu'on reconnaît seul, sur un camion ou une carte",
    avoid: ["letters inside a circle or square frame", "gold foil effect", "script font"],
    colors: ["#2E2E33", "#B8916A"],
    imageBrief: "A refined monogram of the letters S and B, custom-drawn as one mark: the S flows into the bowl of the B with a single continuous, perfectly smoothed curve, like a flawless finish on a wall. Precise contrast between thick and thin strokes, sharp terminals, generous negative space, no frame around the letters. Below, the name SÉBASTIEN BLANC in a contemporary serif, spaced capitals, then the line PLÂTRERIE • PEINTURE much smaller and widely spaced. Deep charcoal #2E2E33 for the name and most of the mark, warm sand #B8916A for one accent stroke of the monogram. Calm, confident, high-end craftsman signature, like a premium interior-finishing studio. Flat vector look, no texture, no gradients, no gold effect, no badge.",
  }),
  T({
    name: "Savoir-faire artisanal",
    concept: "La précision des finitions et la matière : un geste professionnel net, une texture d'enduit maîtrisée, un rendu d'atelier haut de gamme.",
    markType: "symbol_wordmark", composition: "stacked", construction: "organic", style: "textured", sobriety: 4,
    typography: { style: "grotesque", weight: "bold", case: "upper", tracking: "normal", rationale: "Solide et lisible sur un chantier comme sur un devis." },
    symbolIdea: "une seule passe de lame qui laisse une bande d'enduit parfaitement lisse, bord net d'un côté, matière de l'autre",
    distinctive: "le contraste entre la matière brute et la surface parfaitement lissée",
    avoid: ["clip-art tools", "paint splashes", "house icon"],
    colors: ["#30343B", "#C8A27A", "#EDE6DC"],
    imageBrief: "A crafted mark showing one confident pass of a finishing blade: a wide band of plaster rendered with a fine, real mineral texture, perfectly smooth and flat where the blade passed, with one razor-sharp edge — the precision of a high-end finish. The band is slightly angled and forms a subtle S-shaped rhythm. Above or integrated with the name SÉBASTIEN BLANC in a strong grotesque, bold capitals, tight and crisp, with the activity line PLÂTRERIE • PEINTURE smaller and spaced. Colours: graphite #30343B for the name, warm plaster sand #C8A27A for the textured band, light lime #EDE6DC only as a subtle highlight. Agency-quality, tactile but clean; the name stays perfectly crisp. No literal tool clip-art, no splashes, no house icon.",
  }),
  T({
    name: "Architecture contemporaine",
    concept: "Une construction graphique forte qui évoque l'espace transformé : des plans, un angle, une lumière — le chantier devenu intérieur fini.",
    markType: "abstract_mark", composition: "horizontal", construction: "geometric", style: "minimal", sobriety: 2,
    typography: { style: "geometric_sans", weight: "bold", case: "upper", tracking: "wide", rationale: "Moderne, structurée, présence forte." },
    symbolIdea: "deux plans qui se rejoignent en perspective pour former à la fois un angle de pièce et la lettre B, une face claire, une face ombrée",
    distinctive: "une double lecture : un intérieur en perspective et l'initiale B",
    avoid: ["roof outline", "house pictogram", "rounded square", "circle"],
    colors: ["#1F2A30", "#D6A15A"],
    imageBrief: "A bold, architectural abstract mark: two or three flat planes meeting in perspective that read at the same time as the corner of a freshly finished room and as a stylised letter B — one plane lit, one in shadow, built on a precise grid with clean angles and a deliberate negative-space cut. Strong visual presence, distinctive silhouette, no outline house, no roof shape. To its right, SÉBASTIEN BLANC in a geometric sans-serif, bold, widely spaced capitals, with PLÂTRERIE • PEINTURE below in a lighter weight. Colours: deep slate #1F2A30 and warm ochre light #D6A15A for the lit plane. Contemporary architecture-studio feel, flat colours, crisp edges, works in one colour too.",
  }),
];

const brief = fr(() => brandDiscovery(loadProject(proj.id)));
const kept = fr(() => selectTerritories(DIRECTIONS.map((d) => ({ ...d, source: "ai" as const })), brief, 3)).kept;
const quote = fr(() => logoSeriesQuote());
console.log(`Projet : ${proj.name}. Directions : ${kept.map((t) => t.name).join(", ")}.`);
console.log(`Devis (plafond de la série) : ${(quote.maxMicro / 1e6).toFixed(2)} € au maximum — ${quote.images} image(s) à ${quote.imageMaxMicro != null ? (quote.imageMaxMicro / 1e6).toFixed(2) : "?"} € max chacune, relectures et directions comprises.`);
if (quote.mode !== "artwork") throw new Error("Aucun modèle d'images capable d'écrire le nom n'est actif pour « Logos » : configurez OpenAI GPT Image 2 dans l'administration.");
if (args.includes("--prompts")) {
  // Demandes exactes qui partiraient vers OpenAI (sans rien envoyer).
  fs.mkdirSync("reports/logo-quality", { recursive: true });
  const md = kept.map((t, i) => `## ${String.fromCharCode(65 + i)}. ${t.name} (${t.style})\n\n\`\`\`\n${fr(() => artworkPrompt(t, brief))}\n\`\`\`\n`).join("\n");
  fs.writeFileSync("reports/logo-quality/prompts-apres.md", `# Demandes envoyées à OpenAI après correction — ${proj.name}\n\nGénérées par \`artworkPrompt\` (moteur du studio) pour les 3 directions du benchmark ; rien n'a été envoyé.\n\n${md}`);
  console.log("Demandes écrites dans reports/logo-quality/prompts-apres.md");
}
if (!args.includes("--confirm")) {
  console.log("Rien n'a été envoyé. Relancez avec --confirm après accord explicite.");
  process.exit(0);
}

const jid = `bench-logo-${Date.now()}`;
run("INSERT INTO jobs (id, user_id, project_id, type, label, payload, status, run_at, created_at, updated_at, max_attempts) VALUES (?,?,?,?,?,?,?,?,?,?,?)", jid, proj.user_id, proj.id, "brand.logo.v2", "Benchmark qualité des logos (3 directions)", JSON.stringify({ projectId: proj.id }), "running", Date.now(), Date.now(), Date.now(), 1);
const ctx = new JobContext(one<any>("SELECT * FROM jobs WHERE id = ?", jid));
const real = realLogoV2Ai(ctx, { userId: proj.user_id, projectId: proj.id });
const ai = { ...real, territories: async () => DIRECTIONS };
const t0 = Date.now();
let status = "done";
let error: string | null = null;
let r: Awaited<ReturnType<typeof runLogoEngineV2>> | null = null;
try {
  r = await fr(() => runForUser(proj.user_id, () => runLogoEngineV2(ctx, proj.id, { ai, territories: 3, capMicro: quote.maxMicro })));
} catch (e) {
  status = "failed";
  error = (e as Error).message;
}
run("UPDATE jobs SET status = ?, error = ?, progress = 1, updated_at = ? WHERE id = ?", status, error, Date.now(), jid);

const OUT = path.resolve("reports/logo-quality", `benchmark-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}`);
fs.mkdirSync(OUT, { recursive: true });
const rows = all<{ id: string; role: string; meta: string }>("SELECT id, role, meta FROM assets WHERE project_id = ? AND role IN ('logo-v2','logo-v2-trial') AND json_extract(meta, '$.run') = ? ORDER BY created_at", proj.id, jid);
const items = rows.map((a, i) => {
  const m = json<any>(a.meta, {});
  const orig = one<{ id: string }>("SELECT id FROM assets WHERE project_id = ? AND role = 'logo-v2-original' AND source_asset_id = ?", proj.id, a.id);
  const file = `${i + 1}-${fold(m.territory.name).replace(/[^a-z0-9]+/g, "-")}.png`;
  fs.writeFileSync(path.join(OUT, file), assetData(getAsset(orig?.id ?? a.id)!));
  const t = kept.find((k) => k.name === m.territory.name)!;
  return { file, direction: m.territory.name, style: m.territory.style, verdict: m.gate?.verdict, score: m.gate?.score, reason: m.gate?.reason, codes: m.gate?.codes, criteria: m.artwork?.criteria, issues: m.artwork?.issues, fix: m.artwork?.fix, costEur: typeof m.artwork?.costMicro === "number" ? m.artwork.costMicro / 1e6 : null, prompt: t ? fr(() => artworkPrompt(t, brief)) : null };
});
const calls = all<{ task: string; provider: string; cost: number }>("SELECT task, provider, cost FROM ai_calls WHERE job_id = ?", jid);
const spent = calls.reduce((s, c) => s + (c.cost ?? 0), 0) / 1e6;
fs.writeFileSync(path.join(OUT, "benchmark.json"), JSON.stringify({ project: proj.name, jobId: jid, status, error, durationS: Math.round((Date.now() - t0) / 1000), quoteEur: quote.maxMicro / 1e6, spentEur: spent, calls: calls.length, notes: r?.notes ?? [], items }, null, 2));
console.log(JSON.stringify({ status, error, spentEur: spent, items: items.map(({ prompt, ...x }) => x) }, null, 2));
console.log(`Résultats : ${path.relative(process.cwd(), OUT)} — et dans l'onglet Marque du projet.`);
