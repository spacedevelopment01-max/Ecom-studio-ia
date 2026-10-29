/**
 * Worker d'arrière-plan : exécute les créations longues et les publications
 * programmées indépendamment du navigateur. À lancer en continu
 * (`npm run worker`, inclus dans `npm run dev` et `npm start`).
 */
import "./env";
import os from "node:os";
import { claimNext, completeJob, failJob, JobContext, JobCancelled, JobPaused, LeaseLost, WORKER_ID, getJob, releaseJob, jobQuotaScope, LEASE_RENEW_MS, markFinished, markRunning, renewLease } from "../src/lib/jobs";
import { stopInterruptedPaidJob } from "../src/lib/job-recovery";
import { retryStripeCancellations } from "../src/lib/payments";
import { db, logError, now, run } from "../src/lib/db";
import { enqueueDueV2, recoverStale } from "../src/lib/social-v2/scheduler";
import { realPublisher, realSocialDeps } from "../src/lib/social-v2/deps";
import { runDueAutomations } from "../src/lib/social-v2/automations";
import { runDueAutopilots } from "../src/lib/social-v2/autopilot";
import { handlers, HANDLER_TYPES } from "./handlers";
import { aiActiveFor, runForUser, withAiDisabled } from "../src/lib/ai/access";
import { withTrace } from "../src/lib/ai/trace";
import { intentsFromAction } from "../src/lib/orchestrator/intent";

/** Plafond de dépense accepté par le client pour cette tâche (création lancée par une demande), sinon aucun. */
const capOf = (payload: unknown) => {
  const c = (payload as { costCapMicro?: unknown } | null)?.costCapMicro;
  return typeof c === "number" && Number.isFinite(c) && c >= 0 ? c : undefined;
};

/** Intention d'une tâche de fond, sans IA (trace : chaque appel est rattaché à ce que le client a demandé). */
const jobIntent = (type: string, payload: unknown) => intentsFromAction(type, payload as { regenerate?: boolean })?.join("+");
import { runWithLang, userLang } from "../src/lib/i18n-server";
import { isLang } from "../src/lib/i18n";
import { json, one } from "../src/lib/db";
import { migrateLegacySecrets } from "../src/lib/secrets-migration";
import { processOutbox } from "../src/lib/sites/notify";
import { cleanupInterrupted } from "../src/lib/sites/maintenance";

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
  // Reprise d'une tâche interrompue pendant un appel payant : jamais relancée d'office (voir job-recovery.ts).
  if (job.recovered && runWithLang({ ui: userLang(job.user_id) }, () => stopInterruptedPaidJob(job))) {
    console.log(`[worker] ✗ ${job.type} ${job.id} : interrompue pendant un appel payant, non relancée d'office`);
    return true;
  }
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
      // Création lancée par une demande sans devis payant accepté : moteurs locaux seulement (aucune dépense).
      const exec = () => handlers[job.type](ctx);
      const guarded = (ctx.payload as { aiOff?: boolean })?.aiOff ? () => withAiDisabled("demande lancée sans devis payant accepté", exec) : exec;
      const result = await runWithLang(jobLangs(job), () => runForUser(job.user_id, () => withTrace({ jobId: job.id, projectId: job.project_id, intent: jobIntent(job.type, ctx.payload), costCapMicro: capOf(ctx.payload) }, guarded), jobQuotaScope(job), job.project_id ?? null));
      // Écriture du résultat : en cas d'échec (base occupée…), nouvel essai — jamais une relance du traitement,
      // qui referait (et repaierait) ce qui vient d'être fait.
      for (let i = 0; ; i++) {
        try {
          runWithLang({ ui: userLang(job.user_id) }, () => completeJob(job.id, result));
          break;
        } catch (e) {
          if (i >= 4) throw e;
          await new Promise((r) => setTimeout(r, 500 * (i + 1)));
        }
      }
      console.log(`[worker] ✓ ${job.type} ${job.id} en ${((Date.now() - started) / 1000).toFixed(1)} s`);
    } catch (e) {
      if (e instanceof LeaseLost) {
        // Un autre processus a repris la tâche : celui-ci s'efface sans rien écrire.
        console.log(`[worker] ⇄ ${job.type} ${job.id} reprise ailleurs, abandon ici`);
      } else if (e instanceof JobCancelled) {
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
    // Social V2 : verrous orphelins (worker arrêté pendant un envoi) traités sans renvoi à l'aveugle, puis
    // publications arrivées à échéance (hors calendriers en pause), puis règles d'automatisation.
    await recoverStale(realPublisher).catch((e) => logError("worker:social-recover", e));
    enqueueDueV2();
    await runDueAutomations().catch((e: unknown) => logError("worker:social-automations", e));
    // « Ma communication automatique » : remplissage glissant, visuels progressifs, validation (client ou pilote).
    await runDueAutopilots((p) => realSocialDeps(null, p, aiActiveFor(p.userId, p.id))).catch((e: unknown) => logError("worker:social-autopilot", e));
    // Sites publiés (#232) : e-mails des demandes de devis ou de contact encore à envoyer (reprises espacées).
    await processOutbox().catch((e) => logError("worker:site-notify", e));
    // Publications interrompues (arrêt pendant l'écriture) : dossiers temporaires de plus d'une heure supprimés.
    try { cleanupInterrupted(); } catch (e) { logError("worker:sites-cleanup", e); }
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

// Erreur asynchrone oubliée par un moteur (promesse sans catch) : journalisée, le worker continue — sans ce
// garde-fou, Node 22 arrête TOUT le worker (et les autres tâches en cours) pour une seule promesse rejetée.
process.on("unhandledRejection", (reason) => {
  logError("worker:unhandledRejection", reason);
  console.error("[worker] erreur asynchrone non interceptée (journalisée, le worker continue) :", reason instanceof Error ? reason.message : reason);
});
// Exception synchrone non interceptée : l'état du processus n'est plus sûr. Journalisée avec sa pile, puis arrêt
// avec le code 1 (le lanceur affiche la raison et relance ; les tâches en cours sont reprises grâce à leur bail).
process.on("uncaughtException", (err) => {
  logError("worker:uncaughtException", err);
  console.error("[worker] exception non interceptée, arrêt (code 1) :", err.stack ?? err.message);
  process.exit(1);
});

// Arrêt demandé : plus aucune nouvelle tâche ; celles en cours ont jusqu'à 45 s pour finir (un appel payant en
// cours arrive alors à son terme et son résultat est enregistré). Au-delà, elles sont reprises au redémarrage.
const STOP_GRACE_MS = 45_000;
for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    if (stopping) return;
    stopping = true;
    console.log(`[worker] arrêt demandé${running ? ` ; ${running} tâche(s) en cours, jusqu'à ${STOP_GRACE_MS / 1000} s pour finir` : ""}.`);
    const started = Date.now();
    const wait = setInterval(() => {
      if (running === 0 || Date.now() - started > STOP_GRACE_MS) {
        clearInterval(wait);
        if (running) console.log("[worker] tâches encore en cours : elles seront reprises au redémarrage.");
        process.exit(0);
      }
    }, 250);
  });
}

loop().catch((e) => {
  console.error(e);
  process.exit(1);
});
