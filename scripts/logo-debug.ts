/**
 * Diagnostic des logos facturés (LECTURE SEULE) : retrouve les appels d'images d'un projet dans `ai_calls`, puis
 * les images ORIGINALES encore disponibles, avant vectorisation et contrôle qualité, et les rassemble avec la
 * version vectorisée et le rendu final (accepté ou rejeté) dans une page HTML locale.
 *
 *   npx tsx scripts/logo-debug.ts "Sébastien Blanc"            → reports/logo-debug-sebastien-blanc/index.html
 *   npx tsx scripts/logo-debug.ts <id-du-projet> [dossier] [--provider=openai|google|fal|all]
 *
 * Aucune régénération, aucun appel à un fournisseur, aucune écriture en base : la base est ouverte en lecture seule
 * et aucun module du studio n'est chargé (pas de migration). Seuls des fichiers COPIÉS sont écrits dans le dossier
 * du rapport ; les logos, notes de qualité et fichiers existants ne sont pas touchés.
 *
 * Où vivent les originaux (vérifié dans le code) :
 *  - Logo Engine V2 (tâche « brand.logo.v2 ») : l'image du concept est gardée en base64 dans le point de reprise de
 *    la tâche (`jobs.checkpoint`, étape `v2:<territoire>:concept:<n>`) ; le symbole vectorisé est dans la fiche du
 *    rendu (`assets.meta.spec.custom`) ; le rendu final est l'image `logo-v2` (proposée) ou `logo-v2-trial` (écartée).
 *  - Logos du studio (tâche « brand.logo », pistes) : l'image est vectorisée aussitôt et N'EST PAS enregistrée ; seul
 *    le SVG vectorisé (ou la raison de l'échec) reste dans le point de reprise.
 *  - Logo complet (tâche « brand.full-logo ») : l'image est enregistrée (fond blanc rendu transparent) dès sa
 *    réception (`role = logo-ai-full`), avec sa note de contrôle.
 *  - Depuis la correction du 10/10/2026 : TOUTE image payée est aussi conservée telle que reçue dans
 *    `storage/ai-originals/<projet>/<id de l'appel>.<ext>` (avant vectorisation et contrôle, même rejetée).
 *
 * Étapes imbriquées : quand un moteur tourne à l'intérieur d'une autre étape (Pilote : « plan:<étape> », création
 * complète, marque…), `ai_calls.step` vaut « extérieure/intérieure » ; le point de reprise est rangé sous l'étape
 * INTÉRIEURE. Le diagnostic reconnaît le parcours d'après cette étape intérieure.
 */
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const providerArg = process.argv.find((a) => a.startsWith("--provider="))?.split("=")[1] ?? "openai";
const query = args[0];
if (!query) {
  console.error('Usage : npx tsx scripts/logo-debug.ts "Nom du projet ou de la marque" [dossier de sortie] [--provider=openai|all]');
  process.exit(1);
}
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const DB_FILE = process.env.DATABASE_FILE || path.join(DATA_DIR, "studio.db");
const STORAGE_DIR = process.env.STORAGE_DIR || path.join(DATA_DIR, "storage");
if (!fs.existsSync(DB_FILE)) {
  console.error(`Base introuvable : ${DB_FILE} (lancez le script depuis le dossier du studio, ou réglez DATA_DIR).`);
  process.exit(1);
}
const db = new Database(DB_FILE, { readonly: true, fileMustExist: true });

const slug = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const json = <T,>(s: string | null | undefined, d: T): T => {
  try {
    return s ? (JSON.parse(s) as T) : d;
  } catch {
    return d;
  }
};
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const eur = (micro: number) => `${(micro / 1_000_000).toLocaleString("fr-FR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} €`;
const when = (t: number) => new Date(t).toLocaleString("fr-FR");
const hasCol = (table: string, col: string) => (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).some((c) => c.name === col);

type Project = { id: string; name: string; brand_json: string | null; user_id: string };
const projects = db.prepare("SELECT id, name, brand_json, user_id FROM projects").all() as Project[];
const q = slug(query);
const found = projects.filter((p) => p.id === query || slug(p.name).includes(q) || slug(json<{ name?: string }>(p.brand_json, {}).name ?? "").includes(q));
if (!found.length) {
  console.error(`Aucun projet ne correspond à « ${query} ». Projets connus : ${projects.slice(0, 30).map((p) => `${p.name} (${p.id})`).join(", ")}`);
  process.exit(1);
}
if (found.length > 1) console.warn(`Plusieurs projets correspondent ; analysés ensemble : ${found.map((p) => `${p.name} (${p.id})`).join(", ")}`);

const OUT = path.resolve(args[1] ?? path.join("reports", `logo-debug-${q || "projet"}`));
fs.mkdirSync(OUT, { recursive: true });

type Call = { id: string; created_at: number; project_id: string; job_id: string | null; task: string; step: string | null; candidate_id: string | null; attempt: number; provider: string; requested_model: string; served_model: string | null; unit: string; quantity: number; cost: number; estimated: number; usage_key: string | null; status: string; error_kind: string | null; routing_reason: string | null; latency_ms: number | null; billing_dedup: number };
const ids = found.map((p) => p.id);
const routingCol = hasCol("ai_calls", "routing_reason") ? "routing_reason" : "NULL AS routing_reason";
const calls = db
  .prepare(`SELECT id, created_at, project_id, job_id, task, step, candidate_id, attempt, provider, requested_model, served_model, unit, quantity, cost, estimated, usage_key, status, error_kind, ${routingCol}, latency_ms, billing_dedup FROM ai_calls WHERE project_id IN (${ids.map(() => "?").join(",")}) AND task = 'image_generation' ${providerArg === "all" ? "" : "AND provider = ?"} ORDER BY created_at, rowid`)
  .all(...ids, ...(providerArg === "all" ? [] : [providerArg])) as Call[];

type Job = { id: string; type: string; status: string; checkpoint: string | null; created_at: number; error: string | null };
const jobs = new Map<string, Job>();
const job = (id: string | null) => {
  if (!id) return null;
  if (!jobs.has(id)) jobs.set(id, (db.prepare("SELECT id, type, status, checkpoint, created_at, error FROM jobs WHERE id = ?").get(id) as Job | undefined) ?? (null as never));
  return jobs.get(id) ?? null;
};
type Asset = { id: string; name: string; role: string | null; mime: string; storage_key: string; status: string; meta: string; created_at: number; deleted_at: number | null; project_id: string };
const assetById = (id: string) => db.prepare("SELECT id, name, role, mime, storage_key, status, meta, created_at, deleted_at, project_id FROM assets WHERE id = ?").get(id) as Asset | undefined;

/** Copie un fichier de la bibliothèque (lecture seule) ; renvoie le chemin relatif au rapport, ou la raison. */
function copyAsset(a: Asset, name: string): { file: string | null; why?: string } {
  const src = path.resolve(STORAGE_DIR, a.storage_key);
  if (!src.startsWith(path.resolve(STORAGE_DIR) + path.sep) || !fs.existsSync(src)) return { file: null, why: `fichier absent du stockage (${a.storage_key})` };
  const ext = path.extname(a.storage_key) || (a.mime.includes("png") ? ".png" : a.mime.includes("svg") ? ".svg" : ".jpg");
  fs.copyFileSync(src, path.join(OUT, name + ext));
  return { file: name + ext };
}
const isImageB64 = (v: unknown): v is string => typeof v === "string" && v.length > 200 && /^(iVBORw0KGgo|\/9j\/|UklGR)/.test(v);
const extOfB64 = (v: string) => (v.startsWith("iVBOR") ? ".png" : v.startsWith("/9j/") ? ".jpg" : ".webp");

/** SVG autonome d'un symbole vectorisé (formes du studio), en noir. */
function symbolSvg(sym: { viewBox: [number, number, number]; shapes: { d: string; paint: string; tone: string; width?: number; rule?: string }[] }, accent = "#C0392B"): string {
  const [x, y, s] = sym.viewBox;
  const shapes = sym.shapes
    .map((sh) => {
      const color = sh.tone === "accent" ? accent : "#111";
      return sh.paint === "stroke"
        ? `<path d="${esc(sh.d)}" fill="none" stroke="${color}" stroke-width="${sh.width ?? 8}" stroke-linecap="round" stroke-linejoin="round"/>`
        : `<path d="${esc(sh.d)}" fill="${color}"${sh.rule === "evenodd" ? ' fill-rule="evenodd"' : ""}/>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${s} ${s}" width="512" height="512">${shapes}</svg>`;
}

type Row = {
  n: number;
  call: Call;
  jobType: string | null;
  flow: string;
  original: string | null;
  originalNote: string;
  vector: string | null;
  vectorNote: string;
  finals: { file: string | null; label: string; status: string; verdict?: string; score?: number | null; reason?: string; codes?: string[] }[];
  notes: string[];
};
const rows: Row[] = [];

for (const [i, c] of calls.entries()) {
  const n = i + 1;
  const pre = String(n).padStart(2, "0");
  const j = job(c.job_id);
  const cp = json<Record<string, unknown>>(j?.checkpoint, {});
  const row: Row = { n, call: c, jobType: j?.type ?? null, flow: "inconnu", original: null, originalNote: "", vector: null, vectorNote: "", finals: [], notes: [] };
  // Étape imbriquée (« plan:s3/v2:t2:concept:0 ») : le parcours et le point de reprise suivent l'étape intérieure.
  const inner = c.step ? c.step.split("/").pop()! : null;
  const outer = c.step && c.step.includes("/") ? c.step.slice(0, c.step.lastIndexOf("/")) : null;
  const stepVal = c.step ? (c.step in cp ? cp[c.step] : inner ? cp[inner] : undefined) : undefined;
  if (outer) row.notes.push(`étape imbriquée : « ${inner} » exécutée à l'intérieur de « ${outer} »${outer.startsWith("plan:") ? " (Pilote / orchestrateur)" : ""}`);
  // Original conservé à la facturation (studio corrigé) : prioritaire, quel que soit le parcours.
  const keptDir = path.join(STORAGE_DIR, "ai-originals", c.project_id.replace(/[^\w-]/g, "_"));
  const kept = fs.existsSync(keptDir) ? fs.readdirSync(keptDir).find((f) => f.startsWith(c.id + ".")) : undefined;
  const takeKept = () => {
    if (!kept || row.original) return false;
    row.original = `${pre}-original${path.extname(kept)}`;
    fs.copyFileSync(path.join(keptDir, kept), path.join(OUT, row.original));
    row.originalNote = "image reçue du fournisseur, conservée telle quelle au moment de la facturation (storage/ai-originals)";
    return true;
  };

  if (!j) {
    row.originalNote = c.job_id ? "tâche supprimée de la base : point de reprise perdu" : "appel hors tâche (aucun point de reprise)";
  } else if (inner && /^v2:[^:]+:(concept:\d+|explore)$/.test(inner)) {
    // ---- Logo Engine V2 : concept gardé en base64 dans le point de reprise.
    row.flow = "Logo Engine V2 — concept du symbole";
    const tid = inner.split(":")[1];
    if (takeKept()) {
      /* original conservé à la facturation */
    } else if (isImageB64(stepVal)) {
      row.original = `${pre}-original${extOfB64(stepVal)}`;
      fs.writeFileSync(path.join(OUT, row.original), Buffer.from(stepVal, "base64"));
      row.originalNote = "image reçue d'OpenAI, telle quelle (point de reprise de la tâche)";
    } else row.originalNote = stepVal === null ? "aucune image produite pour cette étape" : c.status !== "ok" ? `appel en échec (${c.error_kind ?? c.status}) : aucune image reçue` : "point de reprise absent (tâche relancée ou nettoyée)";
    // Rendus de ce territoire dans cette série (proposé, provisoire ou écarté) + symbole vectorisé.
    const renders = db.prepare("SELECT id, name, role, mime, storage_key, status, meta, created_at, deleted_at, project_id FROM assets WHERE project_id = ? AND role IN ('logo-v2','logo-v2-studio','logo-v2-trial') AND json_extract(meta, '$.run') = ? AND json_extract(meta, '$.territory.id') = ?").all(c.project_id, c.job_id, tid) as Asset[];
    for (const a of renders) {
      const m = json<any>(a.meta, {});
      const label = a.role === "logo-v2" ? "rendu final proposé" : a.role === "logo-v2-studio" ? "rendu provisoire (studio)" : "rendu final écarté";
      const cp2 = copyAsset(a, `${pre}-rendu-${a.role}`);
      row.finals.push({ file: cp2.file, label: `${label}${cp2.why ? ` — ${cp2.why}` : ""}`, status: a.deleted_at ? "supprimé" : a.status, verdict: m.gate?.verdict, score: m.gate?.score ?? null, reason: m.gate?.reason, codes: m.gate?.codes });
      if (!row.vector && m.spec?.custom?.shapes?.length) {
        row.vector = `${pre}-vectorise.svg`;
        fs.writeFileSync(path.join(OUT, row.vector), symbolSvg(m.spec.custom));
        row.vectorNote = `symbole utilisé dans le rendu (source : ${m.symbolSource ?? "?"})${m.symbolSource === "ai_image_traced" ? " — vectorisation automatique de l'image" : m.symbolSource === "ai_image_finalized" ? " — redessiné en vectoriel par l'IA de texte à partir de l'image" : ""}`;
      }
    }
    if (!renders.length) row.notes.push("aucun rendu enregistré pour ce territoire (série interrompue, plafond de dépense, ou territoire écarté avant le rendu)");
    if (!row.vector) row.vectorNote = renders.length ? "le rendu n'utilise pas de symbole vectorisé (concept refusé ou non vectorisable)" : "—";
    const run = json<any>((db.prepare("SELECT value FROM memory WHERE project_id = ? AND kind = 'artifact' AND key = 'logo_v2_run'").get(c.project_id) as { value: string } | undefined)?.value, null);
    if (run?.runId === c.job_id) for (const note of (run.notes ?? []) as string[]) if (note.includes(json<any>(renders[0]?.meta, {}).territory?.name ?? "\u0000") || note.toLowerCase().includes(tid)) row.notes.push(note);
  } else if (inner && /^full-logo:\d+:\d+:image$/.test(inner)) {
    // ---- Logo complet : enregistré dès réception (fond blanc rendu transparent).
    row.flow = "Logo complet dessiné par l'IA";
    const a = typeof stepVal === "string" ? assetById(stepVal) : undefined;
    if (a) {
      const m = json<any>(a.meta, {});
      const cp2 = copyAsset(a, `${pre}-original-fond-transparent`);
      row.original = cp2.file;
      row.originalNote = cp2.file ? "image d'OpenAI enregistrée à la réception ; seul changement : le fond blanc rendu transparent" : cp2.why!;
      row.vectorNote = "pas de vectorisation dans ce parcours (logo complet en image)";
      row.finals.push({ file: cp2.file, label: "même image, avec sa note de contrôle", status: a.deleted_at ? "supprimé" : a.status, verdict: m.gate?.verdict, score: m.gate?.score ?? null, reason: m.gate?.reason ?? m.qcWarning, codes: m.gate?.codes });
    } else row.originalNote = c.status !== "ok" ? `appel en échec (${c.error_kind ?? c.status}) : aucune image reçue` : "image introuvable (point de reprise ou fichier absent)";
  } else if (inner && /^logo:[^:]+:(routes|[^:]+:redraw:\d+)$/.test(inner)) {
    // ---- Pistes du studio : image vectorisée aussitôt, jamais enregistrée.
    row.flow = "Pistes de logo du studio — symbole";
    if (!takeKept()) row.originalNote = "NON ENREGISTRÉE : ce parcours vectorisait l'image dès sa réception et ne gardait que le SVG (ou la raison de l'échec). L'image d'origine n'existe plus nulle part dans le studio.";
    const drafts = (Array.isArray(stepVal) ? stepVal : stepVal ? [stepVal] : []) as { key?: string; name?: string; svg?: string; imageNote?: string }[];
    const withSvg = drafts.filter((d) => d?.svg);
    if (withSvg.length) {
      // Plusieurs pistes dans la même étape : on joint toutes les versions vectorisées de l'étape.
      row.vector = `${pre}-vectorise.svg`;
      fs.writeFileSync(path.join(OUT, row.vector), withSvg[Math.min(c.attempt, withSvg.length - 1)].svg!);
      row.vectorNote = `SVG gardé dans le point de reprise (pistes de l'étape : ${drafts.map((d) => d?.name ?? d?.key).filter(Boolean).join(", ")})`;
    } else row.vectorNote = drafts.map((d) => d?.imageNote).filter(Boolean).join(" ; ") || "aucun SVG gardé";
    // Pistes rendues de cette série (« logo-proposal », même série ; même piste pour un redessin).
    const [, batch, maybeKey] = inner.split(":");
    const logos = (db.prepare("SELECT id, name, role, mime, storage_key, status, meta, created_at, deleted_at, project_id FROM assets WHERE project_id = ? AND role = 'logo-proposal' AND json_extract(meta, '$.batch') = ? ORDER BY created_at").all(c.project_id, batch) as Asset[]).filter((a) => maybeKey === "routes" || json<any>(a.meta, {}).key === maybeKey);
    for (const a of logos) {
      const m = json<any>(a.meta, {});
      const cp2 = copyAsset(a, `${pre}-rendu-piste-${m.key ?? a.id}`);
      row.finals.push({ file: cp2.file, label: `piste rendue « ${m.label ?? m.key ?? "?"} »${cp2.why ? ` — ${cp2.why}` : ""}`, status: a.deleted_at ? "supprimé" : a.status, verdict: m.gate?.verdict, score: m.gate?.score ?? null, reason: m.gate?.reason ?? m.qcWarning, codes: m.gate?.codes });
    }
  } else {
    row.flow = `autre parcours (${j.type}, étape ${c.step ?? "?"})`;
    const keys = Object.keys(cp);
    row.originalNote = isImageB64(stepVal) ? "" : `parcours non reconnu par ce diagnostic — étape intérieure « ${inner ?? "aucune"} » ; ${inner && inner in cp ? `point de reprise présent (type ${Array.isArray(stepVal) ? "liste" : typeof stepVal}, ${JSON.stringify(stepVal ?? null).length} caractères)` : "aucun point de reprise sous cette étape"} ; ${keys.length} clé(s) dans la sauvegarde de la tâche`;
    takeKept();
    if (!row.original && isImageB64(stepVal)) {
      row.original = `${pre}-original${extOfB64(stepVal)}`;
      fs.writeFileSync(path.join(OUT, row.original), Buffer.from(stepVal, "base64"));
      row.originalNote = "image trouvée dans le point de reprise de la tâche";
    }
  }
  if (!row.original) takeKept();
  if (c.status !== "ok") row.notes.push(`appel en statut « ${c.status} » ${c.error_kind ? `: ${c.error_kind}` : ""}`);
  if (c.billing_dedup) row.notes.push("reprise : appel déjà compté, non refacturé");
  rows.push(row);
}

// Toutes les images encore présentes dans les sauvegardes des tâches concernées (même hors des étapes reconnues).
const used = new Set(rows.map((r) => r.call.step?.split("/").pop()));
const cpImages: { job: string; key: string; file: string }[] = [];
for (const [jid, jj] of jobs) {
  if (!jj) continue;
  const cpj = json<Record<string, unknown>>(jj.checkpoint, {});
  for (const [k, v] of Object.entries(cpj)) {
    if (used.has(k) || !isImageB64(v)) continue;
    const f = `sauvegarde-${jid.slice(0, 8)}-${k.replace(/[^\w.-]+/g, "_")}${extOfB64(v)}`;
    fs.writeFileSync(path.join(OUT, f), Buffer.from(v, "base64"));
    cpImages.push({ job: jid, key: k, file: f });
  }
}

// Fichiers temporaires encore présents autour des appels (les tâches de logo n'en créent normalement pas).
const tmpRoot = path.join(DATA_DIR, "tmp");
const tmpHits: string[] = [];
if (fs.existsSync(tmpRoot) && calls.length) {
  const t0 = calls[0].created_at - 10 * 60_000;
  const t1 = calls[calls.length - 1].created_at + 30 * 60_000;
  const walk = (d: string, depth = 0) => {
    if (depth > 3) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p, depth + 1);
      else if (/\.(png|jpe?g|webp|svg)$/i.test(e.name)) {
        const st = fs.statSync(p);
        if (st.mtimeMs >= t0 && st.mtimeMs <= t1) tmpHits.push(p);
      }
    }
  };
  walk(tmpRoot);
  for (const [k, p] of tmpHits.entries()) fs.copyFileSync(p, path.join(OUT, `tmp-${String(k + 1).padStart(2, "0")}${path.extname(p)}`));
}

// ---------------------------------------------------------------- page HTML locale
const total = calls.reduce((s, c) => s + c.cost, 0);
const img = (f: string | null, alt: string) => (f ? `<a href="${esc(f)}" target="_blank"><img src="${esc(f)}" alt="${esc(alt)}" loading="lazy"></a><code>${esc(f)}</code>` : `<div class="none">non disponible</div>`);
const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Diagnostic logos — ${esc(found.map((p) => p.name).join(", "))}</title>
<style>
:root{--bg:#f6f5f2;--card:#fff;--ink:#16181d;--muted:#5d6370;--line:#e3e1dc;--ok:#1d7a46;--warn:#9a6200;--bad:#b3261e}
@media (prefers-color-scheme:dark){:root{--bg:#121417;--card:#1b1e23;--ink:#eceef2;--muted:#a3a9b5;--line:#2c3038;--ok:#5cc28a;--warn:#e6b450;--bad:#f2867d}}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:1280px;margin:0 auto;padding:24px 16px}
h1{font-size:22px;margin:0 0 4px}.muted{color:var(--muted)}
.call{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px;margin:16px 0}
.head{display:flex;flex-wrap:wrap;gap:8px 16px;align-items:baseline}.head b{font-size:16px}
.tag{display:inline-block;padding:1px 8px;border-radius:99px;border:1px solid var(--line);font-size:12px}
.ok{color:var(--ok)}.warn{color:var(--warn)}.bad{color:var(--bad)}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;margin-top:12px}
figure{margin:0;border:1px solid var(--line);border-radius:10px;padding:10px;background:var(--bg)}
figcaption{font-weight:600;font-size:13px;margin-bottom:6px}
figure img{width:100%;aspect-ratio:1;object-fit:contain;background:repeating-conic-gradient(#ddd 0 25%,#fff 0 50%) 0 0/20px 20px;border-radius:6px}
figure code{display:block;font-size:11px;color:var(--muted);word-break:break-all;margin-top:4px}
.none{aspect-ratio:1;display:grid;place-items:center;border:1px dashed var(--line);border-radius:6px;color:var(--muted)}
.note{font-size:13px;color:var(--muted);margin:6px 0 0}
ul{margin:6px 0 0;padding-left:18px;font-size:13px}
table{border-collapse:collapse;width:100%;font-size:13px}td,th{border-bottom:1px solid var(--line);padding:6px;text-align:left;vertical-align:top}
</style></head><body><main>
<h1>Diagnostic des logos facturés</h1>
<p class="muted">Projet : ${esc(found.map((p) => `${p.name} (${p.id})`).join(", "))} · fournisseur : ${esc(providerArg)} · ${calls.length} appel(s) d'images · coût enregistré : <b>${eur(total)}</b> · généré le ${esc(when(Date.now()))} (lecture seule, aucune régénération)</p>
${calls.length ? "" : `<p class="bad">Aucun appel d'images ${esc(providerArg)} n'est enregistré pour ce projet dans <code>ai_calls</code>. Essayez <code>--provider=all</code>.</p>`}
${rows
  .map(
    (r) => `<section class="call">
<div class="head"><b>Appel ${r.n}</b><span>${esc(when(r.call.created_at))}</span><span class="tag">${esc(r.call.requested_model)}${r.call.served_model && r.call.served_model !== r.call.requested_model ? ` → ${esc(r.call.served_model)}` : ""}</span>
<span>coût : <b>${eur(r.call.cost)}</b>${r.call.estimated ? " (estimé au tarif saisi)" : ""}</span><span class="${r.call.status === "ok" ? "ok" : "bad"}">statut : ${esc(r.call.status)}</span></div>
<p class="note">${esc(r.flow)} · tâche ${esc(r.jobType ?? "—")} (${esc(r.call.job_id ?? "—")}) · étape <code>${esc(r.call.step ?? "—")}</code> · appel <code>${esc(r.call.id)}</code> · tentative ${r.call.attempt}${r.call.routing_reason ? ` · routage : ${esc(r.call.routing_reason)}` : ""}</p>
<div class="grid">
<figure><figcaption>1. Original (avant vectorisation et contrôle)</figcaption>${img(r.original, "original")}<p class="note">${esc(r.originalNote)}</p></figure>
<figure><figcaption>2. Version vectorisée</figcaption>${img(r.vector, "vectorisé")}<p class="note">${esc(r.vectorNote)}</p></figure>
${(r.finals.length ? r.finals : [{ file: null, label: "aucun rendu enregistré", status: "—" } as Row["finals"][number]])
  .map(
    (f) => `<figure><figcaption>3. ${esc(f.label)}</figcaption>${img(f.file, "rendu")}<p class="note">statut : <b class="${f.status === "rejected" ? "bad" : f.status === "review" ? "warn" : "ok"}">${esc(f.status)}</b>${f.verdict ? ` · verdict : <b>${esc(f.verdict)}</b>` : ""}${f.score != null ? ` · note : ${esc(f.score)}/10` : ""}</p>${f.reason ? `<p class="note">${esc(f.reason)}</p>` : ""}${f.codes?.length ? `<p class="note">codes : ${esc(f.codes.join(", "))}</p>` : ""}</figure>`,
  )
  .join("")}
</div>
${r.notes.length ? `<ul>${r.notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>` : ""}
</section>`,
  )
  .join("")}
${cpImages.length ? `<section class="call"><b>Autres images trouvées dans les sauvegardes des tâches</b><div class="grid">${cpImages.map((x) => `<figure><figcaption>${esc(x.key)}</figcaption>${img(x.file, x.key)}<p class="note">tâche ${esc(x.job)}</p></figure>`).join("")}</div></section>` : ""}
${tmpHits.length ? `<section class="call"><b>Fichiers temporaires retrouvés autour des appels</b><div class="grid">${tmpHits.map((p, k) => `<figure><figcaption>${esc(path.basename(p))}</figcaption>${img(`tmp-${String(k + 1).padStart(2, "0")}${path.extname(p)}`, "tmp")}<code>${esc(p)}</code></figure>`).join("")}</div></section>` : `<p class="note">Fichiers temporaires : aucun fichier image dans <code>${esc(tmpRoot)}</code> autour des appels.</p>`}
<section class="call"><b>Tableau des appels</b><table><tr><th>#</th><th>Date</th><th>Modèle</th><th>Coût</th><th>Statut</th><th>Étape</th><th>Original</th></tr>
${rows.map((r) => `<tr><td>${r.n}</td><td>${esc(when(r.call.created_at))}</td><td>${esc(r.call.requested_model)}</td><td>${eur(r.call.cost)}</td><td>${esc(r.call.status)}</td><td><code>${esc(r.call.step ?? "—")}</code></td><td>${r.original ? "disponible" : "<span class=bad>non disponible</span>"}</td></tr>`).join("")}
</table></section>
</main></body></html>`;
fs.writeFileSync(path.join(OUT, "index.html"), html);
fs.writeFileSync(path.join(OUT, "resume.json"), JSON.stringify({ projects: found.map((p) => ({ id: p.id, name: p.name })), provider: providerArg, totalCostEur: total / 1e6, calls: rows.map((r) => ({ n: r.n, id: r.call.id, at: new Date(r.call.created_at).toISOString(), model: r.call.requested_model, costEur: r.call.cost / 1e6, status: r.call.status, job: r.call.job_id, jobType: r.jobType, step: r.call.step, flow: r.flow, original: r.original, originalNote: r.originalNote, vector: r.vector, vectorNote: r.vectorNote, finals: r.finals, notes: r.notes })), tmpFiles: tmpHits }, null, 2));

console.log(`\n${calls.length} appel(s) d'images ${providerArg} — coût enregistré ${eur(total)}`);
for (const r of rows) console.log(`  ${r.n}. ${when(r.call.created_at)} ${r.call.requested_model} ${eur(r.call.cost)} [${r.call.status}] ${r.flow} — original : ${r.original ?? `NON DISPONIBLE (${r.originalNote})`}`);
console.log(`\nRapport : ${path.join(OUT, "index.html")}\n(ouvrez-le dans VS Code avec « Open Preview » ou dans le navigateur ; les images sont à côté, dans le même dossier)`);
