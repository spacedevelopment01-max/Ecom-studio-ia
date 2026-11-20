/**
 * RÉPÉTITION GRATUITE d'un accueil « dessiné puis codé », de bout en bout, AVANT tout essai payant (décision du
 * propriétaire du 20 novembre 2026, après quatre fautes vues seulement en dépensant : « résous les pannes avant de
 * recommencer »).
 *
 * Tout tourne pour de vrai (le travailleur des tâches, les réservations et les plafonds, le plan, le juge, les dessins,
 * les photos, le contrôle de fidélité, le code déposé puis relevé, le contrôle de Shopify, les captures), SAUF les
 * fournisseurs d'IA : ils sont imités sur place avec les VRAIES réponses d'une création déjà payée (rejouées dans
 * l'ordre). Aucun appel ne part chez Anthropic, OpenAI ni ailleurs : tout autre appel payant est bloqué.
 *
 * Usage (depuis la racine du dépôt, sur une COPIE des données du Studio privé, jamais l'original) :
 *   DATA_DIR=<copie> APP_SECRET=<secret de la copie> npx tsx scripts/syna-recette/repetition-dessin.mts <projet> <tâche-modèle>
 * <tâche-modèle> : une création syna.dessin déjà faite dans ces données, dont les réponses sont rejouées.
 * Sortie : l'état de la répétition, chaque appel avec son coût compté, et le résultat des contrôles.
 */
import fs from "node:fs";
import path from "node:path";

const [projectId, modele] = process.argv.slice(2);
if (!projectId || !modele || !process.env.DATA_DIR) { console.error("usage : DATA_DIR=<copie> APP_SECRET=… npx tsx scripts/syna-recette/repetition-dessin.mts <projet> <tâche-modèle>"); process.exit(2); }
process.env.STUDIO_SYNA_AGENT = "1";
process.env.OPENAI_API_KEY ||= "sk-repetition";

// ------------------------------------------------------------------ les vraies réponses à rejouer
const { all, one } = await import("../../src/lib/db");
type Res = { task: string; provider: string; model: string; status: string; result: string | null };
const rec = all<Res>("SELECT task, provider, model, status, result FROM ai_reservations WHERE job_id = ? ORDER BY created_at", modele).filter((r) => r.status === "settled" && r.result);
const texte = (r: Res) => String(JSON.parse(r.result!).text ?? "");
const plan = rec.filter((r) => r.provider === "anthropic" && r.task === "strategy").map(texte);
const juges = rec.filter((r) => r.provider === "anthropic" && r.task === "quality_control" && /opus/.test(r.model)).map(texte);
const fideles = rec.filter((r) => r.provider === "anthropic" && /sonnet/.test(r.model)).map(texte);
const codes = rec.filter((r) => r.provider === "openai" && r.task === "strategy").map(texte);
const images = rec.filter((r) => r.task === "image_generation").map((r) => fs.readFileSync(path.join(process.env.DATA_DIR!, "storage", JSON.parse(r.result!).file)).toString("base64"));
if (!plan.length || juges.length < 2 || !codes.length || images.length < 6) { console.error(`Tâche-modèle incomplète (plan ${plan.length}, juges ${juges.length}, codes ${codes.length}, images ${images.length}) : rien n'est lancé.`); process.exit(2); }
let nFidele = 0, nImage = 0;

// ------------------------------------------------------------------ les fournisseurs imités
/** Jetons d'entrée estimés comme le fournisseur les compterait : un texte ~3,5 caractères par jeton, une image ~1 600. */
const jetons = (v: unknown): number => {
  if (typeof v === "string") return v.length > 20_000 && !/\s/.test(v.slice(0, 5_000)) ? 1_600 : Math.ceil(v.length / 3.5);
  if (Array.isArray(v)) return v.reduce((n, x) => n + jetons(x), 0);
  if (v && typeof v === "object") return Object.values(v).reduce((n: number, x) => n + jetons(x), 0);
  return 0;
};
const sse = (evs: { event?: string; data: unknown }[]) => new Response(evs.map((e) => `${e.event ? `event: ${e.event}\n` : ""}data: ${JSON.stringify(e.data)}\n\n`).join(""), { status: 200, headers: { "content-type": "text/event-stream" } });
const json = (j: unknown) => new Response(JSON.stringify(j), { status: 200, headers: { "content-type": "application/json" } });
const appels: string[] = [];
const BLOQUES = /(^|\.)(dashscope-intl\.aliyuncs\.com|fal\.run|api\.elevenlabs\.io|generativelanguage\.googleapis\.com|api\.anthropic\.com|api\.openai\.com)$/;

function anthropic(url: URL, body: any): Response {
  if (url.pathname.endsWith("/count_tokens")) return json({ input_tokens: jetons({ s: body.system, m: body.messages }) });
  if (!url.pathname.endsWith("/messages")) throw new Error(`répétition : appel Anthropic inattendu ${url.pathname}`);
  const sys = JSON.stringify(body.system ?? ""), msg = JSON.stringify(body.messages ?? "");
  const t = /juge des faits/.test(sys) ? (/TEXTES DU SITE CODÉ/.test(msg) ? juges[juges.length - 1] : juges[0]) : /contrôleur qualité d'une marque/.test(sys) ? fideles[nFidele++ % Math.max(1, fideles.length)] ?? "{\"fidele\":true,\"defaut\":\"\"}" : /PLAN de la PAGE D'ACCUEIL/.test(sys) ? plan[0] : null;
  if (t == null) throw new Error("répétition : demande Anthropic non reconnue (aucune réponse enregistrée)");
  appels.push(`anthropic ${body.model} ${t.slice(0, 40)}`);
  const entree = jetons({ s: body.system, m: body.messages }), sortie = Math.ceil(t.length / 3);
  return sse([
    { event: "message_start", data: { type: "message_start", message: { id: "msg_rep", type: "message", role: "assistant", model: body.model, content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: entree, output_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } } } },
    { event: "content_block_start", data: { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } } },
    { event: "content_block_delta", data: { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: t } } },
    { event: "content_block_stop", data: { type: "content_block_stop", index: 0 } },
    { event: "message_delta", data: { type: "message_delta", delta: { stop_reason: "end_turn", stop_sequence: null }, usage: { output_tokens: sortie } } },
    { event: "message_stop", data: { type: "message_stop" } },
  ]);
}

let reponse: any = null;
async function openai(url: URL, init: RequestInit, body: any): Promise<Response> {
  const p = url.pathname;
  if (p.endsWith("/responses/input_tokens")) return json({ input_tokens: jetons({ i: body.instructions, x: body.input }) });
  if (p.endsWith("/responses") && init.method === "POST") {
    const t = codes[0];
    appels.push(`openai ${body.model} code (${body.background ? "déposé puis relevé" : "en flux"})`);
    reponse = { id: "resp_rep", status: "completed", model: body.model, output: [{ type: "message", content: [{ type: "output_text", text: t }] }], usage: { input_tokens: jetons({ i: body.instructions, x: body.input }), input_tokens_details: { cached_tokens: 0 }, output_tokens: Math.ceil(t.length / 3) } };
    if (body.background) return json({ id: "resp_rep", status: "queued" });
    return sse([{ data: { type: "response.completed", response: reponse } }]);
  }
  if (/\/responses\/resp_rep$/.test(p)) return init.method === "DELETE" ? json({ id: "resp_rep", deleted: true }) : json(reponse ?? { id: "resp_rep", status: "in_progress" });
  if (/\/images\/(edits|generations)$/.test(p)) {
    const b64 = images[nImage++ % images.length];
    const op = p.endsWith("edits") ? "image_edit" : "image_generation";
    const usage = { input_tokens: 600, input_tokens_details: { text_tokens: 400, image_tokens: 200 }, output_tokens: 4160, total_tokens: 4760 };
    appels.push(`openai ${body?.model ?? "image"} ${op}`);
    const flux = body?.stream === true || body?.stream === "true";
    return flux ? sse([{ event: `${op}.completed`, data: { type: `${op}.completed`, b64_json: b64, usage } }]) : json({ data: [{ b64_json: b64 }], usage });
  }
  throw new Error(`répétition : appel OpenAI inattendu ${p}`);
}

const vrai = globalThis.fetch;
globalThis.fetch = (async (input: any, init: RequestInit = {}) => {
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
  if (!BLOQUES.test(url.hostname)) return vrai(input, init);
  let body: any = null;
  const b = init.body ?? (input instanceof Request ? await input.clone().text() : null);
  if (typeof b === "string") { try { body = JSON.parse(b); } catch { body = null; } }
  else if (b instanceof FormData) body = { model: b.get("model"), stream: b.get("stream") };
  else if (b) { try { const s = await new Response(b as BodyInit).text(); body = { model: /name="model"\r?\n\r?\n([^\r\n]+)/.exec(s)?.[1], stream: /name="stream"\r?\n\r?\n(true)/.test(s) }; } catch { body = {}; } }
  if (url.hostname === "api.anthropic.com") return anthropic(url, body ?? {});
  if (url.hostname === "api.openai.com") return openai(url, init, body ?? {});
  throw new Error(`répétition : appel payant bloqué vers ${url.hostname}`);
}) as typeof fetch;

// ------------------------------------------------------------------ la répétition : une vraie tâche, le vrai travailleur
const { enqueue, getJob } = await import("../../src/lib/jobs");
const { dessinQuote, PHOTOS_ACCUEIL, SINA_DESSIN_JOB } = await import("../../src/lib/syna-agent/dessin/job");
const { runWithLang } = await import("../../src/lib/i18n-server");
const p = one<{ user_id: string }>("SELECT user_id FROM projects WHERE id = ?", projectId);
if (!p) { console.error("Projet introuvable."); process.exit(2); }
const q = dessinQuote(PHOTOS_ACCUEIL);
const job = runWithLang({ ui: "fr", content: "fr" }, () => enqueue({ userId: p.user_id, projectId, type: SINA_DESSIN_JOB, label: "Répétition gratuite", payload: { projectId, userId: p.user_id, conversationId: "repetition", runId: `repetition-${Date.now()}`, capMicro: q.maxMicro, consigne: "Répétition gratuite : les réponses d'une création déjà payée sont rejouées." }, maxAttempts: 1, idempotencyKey: `repetition:${Date.now()}` }));
console.log(`Répétition ${job.id} : plafond ${(q.maxMicro / 1e6).toFixed(2)} €, prix probable ${((q.probableMicro ?? 0) / 1e6).toFixed(2)} €.`);
await import("../../worker/index");
const t0 = Date.now();
let j = getJob(job.id)!;
while (!["done", "failed", "cancelled"].includes(j.status) && Date.now() - t0 < 20 * 60_000) { await new Promise((r) => setTimeout(r, 2_000)); j = getJob(job.id)!; }

const calls = all<{ step: string; status: string; error_kind: string | null; cost: number }>("SELECT step, status, error_kind, cost FROM ai_calls WHERE job_id = ? ORDER BY created_at", job.id);
console.log(`\nÉtat : ${j.status}${j.status !== "done" ? ` — ${j.error ?? j.message}` : ""} (${Math.round((Date.now() - t0) / 1000)} s)`);
for (const c of calls) console.log(`  ${c.status === "ok" ? "ok    " : "ÉCHEC "} ${c.step}  ${(c.cost / 1e6).toFixed(3)} €${c.error_kind ? `  (${c.error_kind})` : ""}`);
console.log(`Appels imités : ${appels.length} (${appels.filter((a) => /déposé/.test(a)).length} déposé(s) puis relevé(s)).`);
console.log(`Compté : ${(calls.reduce((n, c) => n + c.cost, 0) / 1e6).toFixed(2)} € pour ${calls.length} appels imités (aucun n'est parti chez un fournisseur).`);
if (j.status === "done") {
  const r = JSON.parse(j.result ?? "{}");
  console.log(`Contrôle de Shopify : ${r.controle?.erreurs ?? "?"} erreur(s), ${r.controle?.avertissements ?? "?"} avertissement(s).`);
  for (const c of r.controle?.captures ?? []) console.log(`  ${c.appareil} : débordement ${c.debordement ? "OUI" : "non"}, hors écran ${c.horsEcran.length}, manques ${c.manquantes}, panier ${c.panier === false ? "ABSENT" : "là"}, produits absents ${c.produitsAbsents?.length ? c.produitsAbsents.join(", ") : "aucun"}, photos trop recadrées ${c.photosRecadrees?.length ? c.photosRecadrees.map((x: any) => `${x.photo} (${x.garde} % visible)`).join(", ") : "aucune"}`);
  console.log(`Photos refusées au contrôle de fidélité : ${r.photosRefusees?.length ?? 0}.`);
  for (const x of r.photosRefusees ?? []) console.log(`  section ${x.section} : ${/non fait/.test(x.defaut ?? "") ? "ALERTE, CONTRÔLE NON FAIT — " : ""}${x.defaut}`);
  console.log(`Juge du plan : ${r.juge?.corrections ?? "?"} correction(s) posée(s), ${r.juge?.ignorees ?? 0} ignorée(s)${r.juge?.ignorees ? " — ALERTE, CORRECTIONS DU JUGE NON POSÉES" : ""} ; juge du code : ${r.juge?.code?.corrections ?? "?"} posée(s) sur ${r.juge?.code?.demandees ?? "?"}${r.juge?.code && r.juge.code.corrections < r.juge.code.demandees ? " — ALERTE" : ""}.`);
  const alertes = (r.juge?.ignorees ?? 0) + (r.juge?.code && r.juge.code.corrections < r.juge.code.demandees ? 1 : 0) + (r.photosRefusees ?? []).filter((x: { defaut?: string }) => /non fait/.test(x.defaut ?? "")).length + (r.controle?.erreurs ?? 0) + (r.controle?.captures ?? []).filter((c: any) => c.debordement || c.horsEcran.length || c.manquantes || c.panier === false || c.produitsAbsents?.length || c.photosRecadrees?.length).length;
  console.log(alertes ? `\nRÉPÉTITION À REVOIR : ${alertes} alerte(s) ci-dessus. Aucun essai payant avant de les régler.` : "\nRÉPÉTITION RÉUSSIE : rien à régler avant l'essai payant.");
  process.exit(alertes ? 1 : 0);
}
process.exit(j.status === "done" ? 0 : 1);
