/**
 * LECTURE SEULE, GRATUIT — exporte la dernière série de logos d'un projet pour l'analyser : pour chaque proposition,
 * le fichier ORIGINAL reçu d'OpenAI, la direction (territoire), la note, les défauts relevés par le contrôle, le coût,
 * et la demande envoyée au modèle d'images RECONSTITUÉE avec le code qui l'a produite.
 *   npx tsx scripts/logo-series-export.ts "Sebastien Blanc" [--legacy]
 * --legacy : demande reconstituée avec la version du studio d'AVANT la correction de la qualité (séries faites avant
 * cette mise à jour) ; sans l'option, avec la version actuelle.
 * Sortie : reports/logo-quality/serie-<date>/ (images + serie.json + prompts.md). Aucune clé n'est lue ni écrite.
 */
import fs from "node:fs";
import path from "node:path";
import { all, json, one } from "@/lib/db";
import { assetData, getAsset } from "@/lib/library";
import { loadProject } from "@/lib/projects";
import { brandDiscovery } from "@/lib/logo-v2/discovery";
import { artworkPrompt, STYLE_GUIDE } from "@/lib/logo-v2/artwork";
import { runWithLang } from "@/lib/i18n-server";
import type { BrandBrief, Territory } from "@/lib/logo-v2/types";

const args = process.argv.slice(2);
const legacy = args.includes("--legacy");
const query = args.find((a) => !a.startsWith("--"));
if (!query) throw new Error('Nom du projet manquant : npx tsx scripts/logo-series-export.ts "Nom du projet"');
const fold = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
const proj = all<{ id: string; name: string; updated_at: number }>("SELECT id, name, updated_at FROM projects ORDER BY updated_at DESC").find((p) => p.id === query || fold(p.name).includes(fold(query)));
if (!proj) throw new Error(`Projet introuvable : ${query}`);
const run = json<any>(one<{ value: string }>("SELECT value FROM memory WHERE project_id = ? AND kind = 'artifact' AND key = 'logo_v2_run'", proj.id)?.value, null);
if (!run) throw new Error("Aucune série de logos dans ce projet.");

/** Demande telle que l'envoyait le studio avant la correction de la qualité (copie fidèle de l'ancienne version). */
function legacyPrompt(t: Territory, brief: BrandBrief): string {
  const COMPOSITION: Record<string, string> = { horizontal: "symbol on the left, name on the right", stacked: "symbol above the name, centered", wordmark_only: "the name alone (lettering), with any accent integrated into the letters", badge: "everything inside a badge or seal" };
  const TYPO: Record<string, string> = { geometric_sans: "geometric sans-serif", humanist_sans: "humanist sans-serif", grotesque: "grotesque sans-serif", high_contrast_serif: "high-contrast serif", classic_serif: "classic serif", contemporary_serif: "contemporary serif" };
  const pal = brief.palette;
  const ink = pal[t.colorRole.ink];
  const accent = pal[t.colorRole.accent];
  const others = [...new Set(Object.values(pal))].filter((c) => c !== ink && c !== accent).slice(0, 3);
  const caseWord = t.typography.case === "upper" ? "capitals" : t.typography.case === "lower" ? "lowercase" : "title case";
  return [
    `Design a complete, professional logo for the brand "${brief.name}" (${brief.trade.label || brief.activity}), as a top branding agency would present it — the logo artwork only, not a mockup.`,
    `Creative direction "${t.name}": ${t.concept}`,
    `Style: ${STYLE_GUIDE[t.style]}`,
    t.symbolIdea ? `Symbol idea: ${t.symbolIdea}.` : "",
    t.distinctive ? `What makes it memorable: ${t.distinctive}.` : "",
    `Composition: ${COMPOSITION[t.composition]}. Typography: ${TYPO[t.typography.style]}, ${t.typography.weight} weight, ${caseWord}, ${t.typography.tracking} letter-spacing.`,
    `Colours: the brand palette — main ink ${ink}, accent ${accent}${others.length ? `, also available ${others.join(", ")}` : ""}${t.style === "gradient" ? "; gradients are built only from these colours" : ""}; white or near-black only if needed.`,
    `Text in the logo, spelled EXACTLY with the same accents and spaces: the name "${brief.name}"${t.descriptor ? `, and smaller, the activity line "${t.descriptor}"` : ""}${brief.tagline ? `, and smallest, the slogan "${brief.tagline}"` : ""}. No other words, no slogan${brief.tagline ? " other than this one" : ""}, no fake or extra letters.`,
    `Nothing is imposed: no shape, object, initials, texture or composition is required — follow this direction only. An object or gesture of this business${brief.trade.objects.length ? ` (here, for example: ${brief.trade.objects.slice(0, 3).join(", ")})` : ""} may be used when it is integrated in an original, professional way. Avoid only clumsy stock-icon clichés${t.avoid.length ? ` and: ${t.avoid.slice(0, 6).join(", ")}` : ""}. Never copy or imitate an existing logo.`,
    "No people: no person, face, hands or human silhouette.",
    "Output: crisp edges, centered, generous margins, on a plain transparent or pure white background. No mockup, no paper, no wall, no photo, no frame around the canvas.",
  ]
    .filter(Boolean)
    .join("\n");
}

const p = loadProject(proj.id);
const brief = runWithLang({ ui: "fr", content: "fr" }, () => brandDiscovery(p));
const OUT = path.resolve("reports/logo-quality", `serie-${new Date(run.at ?? Date.now()).toISOString().slice(0, 16).replace(/[:T]/g, "-")}`);
fs.mkdirSync(OUT, { recursive: true });
const rows = all<{ id: string; role: string; meta: string }>("SELECT id, role, meta FROM assets WHERE project_id = ? AND role IN ('logo-v2','logo-v2-studio','logo-v2-trial') AND json_extract(meta, '$.run') = ? AND deleted_at IS NULL ORDER BY created_at", proj.id, run.runId);
const out: any[] = [];
let md = `# Série de logos — ${proj.name}\n\nSérie ${run.runId} du ${new Date(run.at ?? 0).toLocaleString("fr-FR")}. Demandes ${legacy ? "reconstituées avec la version d'AVANT la correction" : "reconstituées avec la version actuelle"} (le studio n'enregistre pas le texte envoyé ; il est recalculé à partir de la direction gardée avec chaque proposition et de la marque actuelle).\n`;
for (const [i, r] of rows.entries()) {
  const m = json<any>(r.meta, {});
  const t: Territory = { ...m.territory, style: m.territory?.style ?? "minimal", descriptor: m.territory?.descriptor ?? null };
  const name = `${i + 1}-${fold(t.name ?? "logo").replace(/[^a-z0-9]+/g, "-").slice(0, 40)}`;
  const original = one<{ id: string }>("SELECT id FROM assets WHERE project_id = ? AND role = 'logo-v2-original' AND source_asset_id = ?", proj.id, r.id);
  fs.writeFileSync(path.join(OUT, `${name}.png`), assetData(getAsset(original?.id ?? r.id)!));
  const prompt = legacy ? legacyPrompt(t, brief) : runWithLang({ ui: "fr", content: "fr" }, () => artworkPrompt(t, brief));
  const item = { file: `${name}.png`, original: !!original, role: r.role, direction: t.name, style: t.style, concept: t.concept, symbolIdea: t.symbolIdea, verdict: m.gate?.verdict, score: m.gate?.score, reason: m.gate?.reason, codes: m.gate?.codes ?? [], criteria: m.artwork?.criteria ?? null, issues: m.artwork?.issues ?? [], fix: m.artwork?.fix ?? null, provider: m.artwork?.provider ?? null, costEur: typeof m.artwork?.costMicro === "number" ? Math.round(m.artwork.costMicro / 1e4) / 100 : null };
  out.push({ ...item, prompt });
  md += `\n## ${i + 1}. ${t.name} — ${t.style} — ${m.gate?.score ?? "?"}/10 (${m.gate?.verdict ?? "?"})\n\n![${t.name}](${name}.png)\n\n- Concept : ${t.concept}\n- Idée de symbole : ${t.symbolIdea ?? "—"}\n- Défauts relevés : ${(m.artwork?.issues ?? []).join(" ; ") || "—"}\n- Raison : ${m.gate?.reason ?? "—"}\n\n\`\`\`\n${prompt}\n\`\`\`\n`;
}
fs.writeFileSync(path.join(OUT, "serie.json"), JSON.stringify({ project: proj.name, runId: run.runId, at: run.at, art: run.art, brand: { palette: brief.palette, paletteLocked: brief.paletteLocked, positioning: brief.positioning, audience: brief.audience, personality: brief.personality }, items: out }, null, 2));
fs.writeFileSync(path.join(OUT, "prompts.md"), md);
console.log(`${out.length} proposition(s) exportée(s) dans ${path.relative(process.cwd(), OUT)}`);
