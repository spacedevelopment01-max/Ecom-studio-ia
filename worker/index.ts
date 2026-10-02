/**
 * Worker d'arrière-plan : exécute les créations longues et les publications
 * programmées indépendamment du navigateur. À lancer en continu
 * (`npm run worker`, inclus dans `npm run dev` et `npm start`).
 */
import os from "node:os";
import { claimNext, completeJob, failJob, JobContext, JobCancelled, WORKER_ID, getJob } from "../src/lib/jobs";
import { db, logError, now, run } from "../src/lib/db";
import { enqueueDuePosts } from "../src/lib/engine/calendar";
import { handlers, HANDLER_TYPES } from "./handlers";

const CONCURRENCY = Math.max(1, Math.min(3, Number(process.env.WORKER_CONCURRENCY) || Math.floor(os.cpus().length / 2) || 1));
let running = 0;
let stopping = false;

async function runOne() {
  const job = claimNext(HANDLER_TYPES);
  if (!job) return false;
  running++;
  const ctx = new JobContext(job);
  const started = Date.now();
  console.log(`[worker] ▶ ${job.type} ${job.id} (essai ${job.attempts})`);
  (async () => {
    try {
      const result = await handlers[job.type](ctx);
      completeJob(job.id, result);
      console.log(`[worker] ✓ ${job.type} ${job.id} en ${((Date.now() - started) / 1000).toFixed(1)} s`);
    } catch (e) {
      if (e instanceof JobCancelled) {
        console.log(`[worker] ■ ${job.type} ${job.id} annulée`);
      } else {
        const fresh = getJob(job.id) ?? job;
        failJob(fresh, e);
        logError(`job:${job.type}`, e, { userId: job.user_id, projectId: job.project_id ?? undefined, details: { jobId: job.id } });
        console.error(`[worker] ✗ ${job.type} ${job.id} :`, (e as Error).message);
      }
    } finally {
      running--;
    }
  })();
  return true;
}

async function tick() {
  try {
    enqueueDuePosts();
    run("INSERT INTO worker_heartbeat (id, beat_at, info) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET beat_at = excluded.beat_at, info = excluded.info", WORKER_ID, now(), JSON.stringify({ running, concurrency: CONCURRENCY }));
  } catch (e) {
    logError("worker:tick", e);
  }
}

async function loop() {
  db();
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
