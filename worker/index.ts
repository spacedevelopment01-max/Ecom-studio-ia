/**
 * Worker d'arrière-plan : exécute les créations longues et les publications
 * programmées indépendamment du navigateur. À lancer en continu
 * (`npm run worker`, inclus dans `npm run dev` et `npm start`).
 */
import "./env";
import os from "node:os";
import { claimNext, completeJob, failJob, JobContext, JobCancelled, JobPaused, WORKER_ID, getJob, releaseJob, jobQuotaScope, LEASE_RENEW_MS, markFinished, markRunning, renewLease } from "../src/lib/jobs";
import { retryStripeCancellations } from "../src/lib/payments";
import { db, logError, now, run } from "../src/lib/db";
import { enqueueDuePosts } from "../src/lib/engine/calendar";
import { handlers, HANDLER_TYPES } from "./handlers";
import { runForUser } from "../src/lib/ai/access";
import { withTrace } from "../src/lib/ai/trace";
import { intentsFromAction } from "../src/lib/orchestrator/intent";

/** Intention d'une tâche de fond, sans IA (trace : chaque appel est rattaché à ce que le client a demandé). */
const jobIntent = (type: string, payload: unknown) => intentsFromAction(type, payload as { regenerate?: boolean })?.join("+");
import { runWithLang, userLang } from "../src/lib/i18n-server";
import { isLang } from "../src/lib/i18n";
import { json, one } from "../src/lib/db";
import { migrateLegacySecrets } from "../src/lib/secrets-migration";

/** Langue des contenus d'une tâche : celle choisie pour l'action, sinon celle du projet. */
function jobLangs(job: { user_id: string | null; project_id: string | null; payload: string }) {
  const p = json<{ lang?: string }>(job.payload, {});
  const proj = job.project_id ? one<{ settings_json: string }>("SELECT settings_json FROM projects WHERE id = ?", job.project_id) : null;
  const projLang = json<{ language?: string }>(proj?.settings_json ?? "{}", {}).language;
  return { ui: userLang(job.user_id), content: isLang(p.lang) ? p.lang : isLang(projLang) ? projLang : "fr", contentForced: isLang(p.lang) } as const;
}

const CONCURRENCY = Math.max(1, Math.min(3, Number(process.env.WORKER_CONCURRENCY) || Math.floor(os.cpus().length / 2) || 1));
let running = 0;
let stopping = false;

async function runOne() {
  const job = claimNext(HANDLER_TYPES);
  if (!job) return false;
  running++;
  markRunning(job.id);
  // Battement : le bail est prolongé pendant toute l'exécution (un appel IA peut durer plusieurs minutes sans
  // point d'avancement) ; sinon la tâche serait reprise en double après 90 s.
  const lease = setInterval(() => {
    try {
      renewLease(job.id);
    } catch (e) {
      logError("worker:lease", e, { details: { jobId: job.id } });
    }
  }, LEASE_RENEW_MS);
  const ctx = new JobContext(job);
  const started = Date.now();
  console.log(`[worker] ▶ ${job.type} ${job.id} (essai ${job.attempts})`);
  (async () => {
    try {
      // Budget IA épuisé : les étapes IA basculent discrètement sur le moteur local (voir src/lib/ai/access.ts).
      const result = await runWithLang(jobLangs(job), () => runForUser(job.user_id, () => withTrace({ jobId: job.id, projectId: job.project_id, intent: jobIntent(job.type, ctx.payload) }, () => handlers[job.type](ctx)), jobQuotaScope(job)));
      runWithLang({ ui: userLang(job.user_id) }, () => completeJob(job.id, result));
      console.log(`[worker] ✓ ${job.type} ${job.id} en ${((Date.now() - started) / 1000).toFixed(1)} s`);
    } catch (e) {
      if (e instanceof JobCancelled) {
        releaseJob(job.id);
        console.log(`[worker] ■ ${job.type} ${job.id} annulée`);
      } else if (e instanceof JobPaused) {
        releaseJob(job.id);
        console.log(`[worker] ❚❚ ${job.type} ${job.id} en pause`);
      } else {
        const fresh = getJob(job.id) ?? job;
        // Mise en pause ou annulée pendant un appel : l'erreur qui suit ne la remet jamais en file.
        if (fresh.status === "paused" || fresh.status === "cancelled") return releaseJob(job.id);
        runWithLang({ ui: userLang(job.user_id) }, () => failJob(fresh, e));
        logError(`job:${job.type}`, e, { userId: job.user_id, projectId: job.project_id ?? undefined, details: { jobId: job.id } });
        console.error(`[worker] ✗ ${job.type} ${job.id} :`, (e as Error).message);
      }
    } finally {
      clearInterval(lease);
      markFinished(job.id);
      running--;
    }
  })();
  return true;
}

async function tick() {
  try {
    enqueueDuePosts();
    // Anciens abonnements Stripe dont l'arrêt a échoué (changement de forfait) : nouvel essai.
    await retryStripeCancellations().catch((e) => logError("worker:stripe-cancel", e));
    // L'identifiant du worker change à chaque démarrage : les battements des anciens démarrages sont purgés.
    run("DELETE FROM worker_heartbeat WHERE beat_at < ?", now() - 86400_000);
    run("INSERT INTO worker_heartbeat (id, beat_at, info) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET beat_at = excluded.beat_at, info = excluded.info", WORKER_ID, now(), JSON.stringify({ running, concurrency: CONCURRENCY }));
  } catch (e) {
    logError("worker:tick", e);
  }
}

async function loop() {
  db();
  // Clés d'API et jetons chiffrés avec l'ancienne constante de développement : rechiffrés avec le secret actuel.
  try {
    const migrated = migrateLegacySecrets();
    if (migrated) console.log(`[worker] ${migrated} secret(s) rechiffré(s) avec le secret maître actuel`);
  } catch (e) {
    logError("worker:secrets", e);
  }
  console.log(`[worker] démarré (${WORKER_ID}, ${CONCURRENCY} tâche(s) en parallèle)`);
  await tick();
  let lastTick = Date.now();
  while (!stopping) {
    let started = false;
    while (running < CONCURRENCY && (await runOne())) started = true;
    if (Date.now() - lastTick > 15_000) {
      await tick();
      lastTick = Date.now();
    }
    await new Promise((r) => setTimeout(r, started ? 200 : 1500));
  }
}

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    stopping = true;
    console.log("[worker] arrêt demandé ; les tâches en cours seront reprises au redémarrage.");
    setTimeout(() => process.exit(0), running ? 3000 : 0);
  });
}

loop().catch((e) => {
  console.error(e);
  process.exit(1);
});
