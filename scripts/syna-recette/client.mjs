/**
 * Joue UN client inventé face à SINA dans le Studio privé d'essai (jamais le Studio en ligne) : ce script n'écrit
 * que ce que dirait le client ; c'est SINA qui travaille, avec la vraie IA.
 *
 * Usage (depuis la racine du dépôt, Studio privé lancé par lancer-agent.mts) :
 *   node scripts/syna-recette/client.mjs <email> "<message du client>"   envoie le message et attend la réponse
 *   node scripts/syna-recette/client.mjs <email> @oui | @non              répond à la carte d'accord (prix annoncé)
 *   node scripts/syna-recette/client.mjs <email> "@budget 25"            relève le budget des réponses de SINA (en %)
 *   node scripts/syna-recette/client.mjs <email> @etat                    relit le fil sans rien envoyer
 *   node scripts/syna-recette/client.mjs <email> @attendre                attend la fin d'une création en arrière-plan
 * Variables : ORIGINE (http://localhost:3493), MOT_DE_PASSE (celui des comptes fictifs), ATTENTE_MIN (40).
 */
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

const [, , email, said] = process.argv;
const origin = process.env.ORIGINE ?? "http://localhost:3493";
const password = process.env.MOT_DE_PASSE ?? "Recette-492-fictif";
const maxMs = Number(process.env.ATTENTE_MIN ?? 40) * 60_000;
if (!email || !said) { console.error("usage : client.mjs <email> <message | @oui | @non | @etat | @attendre>"); process.exit(2); }

let cookie = "";
async function call(method, url, body) {
  const r = await fetch(origin + url, { method, headers: { "content-type": "application/json", origin, ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const set = r.headers.getSetCookie?.() ?? [];
  if (set.length) cookie = [...new Set([...cookie.split("; ").filter(Boolean), ...set.map((c) => c.split(";")[0])])].join("; ");
  const text = await r.text();
  let data; try { data = JSON.parse(text); } catch { data = { raw: text.slice(0, 300) }; }
  if (!r.ok) throw new Error(`${r.status} ${url} : ${JSON.stringify(data).slice(0, 400)}`);
  return data;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await call("POST", "/api/auth/login", { email, password });
// Le fil du client : celui de son projet s'il en a un, sinon le brouillon de départ.
const projects = (await call("GET", "/api/projects")).projects ?? [];
let view = await call("POST", "/api/syna/open", { projectId: projects[0]?.id ?? null });
const cid = view.conversationId, before = Math.max(0, ...view.messages.map((m) => m.seq ?? 0));

const t0 = Date.now();
if (said.startsWith("@budget")) {
  // « @budget 25 » : le client relève le budget autorisé pour les réponses de SINA (en % de son budget d'IA).
  view = await call("POST", `/api/syna/${cid}/budget`, { pct: Number(said.split(/\s+/)[1] ?? 20) });
} else if (said === "@oui" || said === "@non") {
  const pending = view.run?.status === "waiting_confirmation" ? view.run.pending : null;
  if (!pending) { console.log("Aucune carte d'accord en attente."); process.exit(1); }
  view = await call("POST", `/api/syna/${cid}/decision`, { pendingId: pending.id, approve: said === "@oui" });
} else if (!said.startsWith("@")) {
  view = await call("POST", `/api/syna/${cid}`, { requestId: randomUUID(), text: said, attachmentIds: [] });
}
// Attente : tant que SINA réfléchit ; « @attendre » attend aussi la fin d'une création en arrière-plan.
const busy = (v) => ["queued", "running"].includes(v.run?.status) || ((said === "@attendre" || said === "@oui") && v.run?.status === "waiting_jobs" && !v.background) || (said === "@attendre" && v.background);
while (said !== "@etat" && busy(view) && Date.now() - t0 < maxMs) { await sleep(4000); view = await call("GET", `/api/syna/${cid}`); }

for (const m of view.messages.filter((x) => (x.seq ?? 0) > (said === "@etat" ? 0 : before))) {
  const c = m.content ?? {};
  if (m.role === "user") console.log(`\nCLIENT : ${c.text}`);
  else if (m.role === "assistant") console.log(`\nSINA : ${c.message ?? ""}${c.question ? `\n  ❓ ${c.question.text}${c.question.choices?.length ? `  [${c.question.choices.join(" | ")}]` : ""}` : ""}`);
  else if (m.role === "tool" && !c.internal) console.log(`   · ${c.tool} ${c.ok ? "fait" : "REFUS"} : ${String(c.summary ?? "").slice(0, 400)}`);
  else if (m.role === "event" && c.kind !== "waiting_jobs") console.log(`   (${c.kind}${c.message ? ` : ${String(c.message).slice(0, 300)}` : ""})`);
}
const p = view.run?.status === "waiting_confirmation" ? view.run.pending : null;
if (p) console.log(`\n🟧 CARTE D'ACCORD : ${p.text ?? p.reason ?? p.tool}`);
console.log(`\n— état : ${view.run?.status ?? "aucune demande"}${view.background ? " (création en arrière-plan, le client peut parler)" : ""} · étape ${view.journey?.current ?? "?"} · budget engagé ${view.budget?.spentPct ?? "?"} % · ${Math.round((Date.now() - t0) / 1000)} s`);
const out = process.env.JOURNAL;
if (out) { fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, JSON.stringify(view, null, 1)); }
