/** Harnais local de preuve, jamais chargé par le serveur/worker de production. Fournisseurs intégralement simulés. */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createUser } from "@/lib/auth";
import { id, now, run, one, all } from "@/lib/db";
import { getSubscription, alignPeriod, syncAllowance } from "@/lib/billing";
import { claimNext, JobContext, completeJob, failJob } from "@/lib/jobs";
import {
  runPreparation,
  stateOf,
  readyContract,
} from "@/lib/preparation/engine";
import { runForUser } from "@/lib/ai/access";
import { runWithLang } from "@/lib/i18n-server";
import { setSetting } from "@/lib/settings";
import { simulatedDependencies, CASES } from "../../tests/preparation-fixtures";
const dir = process.env.DATA_DIR;
if (
  !dir ||
  !path.isAbsolute(dir) ||
  !path.basename(dir).startsWith("ecs-preparation-test-")
)
  throw new Error(
    "DATA_DIR isolé ecs-preparation-test-* obligatoire ; ce harnais refuse les données du studio.",
  );
fs.mkdirSync(dir, { recursive: true });
const command = process.argv[2];
if (command === "seed") {
  if (fs.existsSync(path.join(dir, "test-only.json")))
    throw new Error("Ce dossier de test existe déjà.");
  const uid = (
    await createUser(
      `verification-${id()}@example.test`,
      crypto.randomBytes(24).toString("base64url"),
      "Parcours de vérification",
    )
  ).id;
  run("UPDATE users SET role='client' WHERE id=?", uid);
  getSubscription(uid);
  run(
    "UPDATE subscriptions SET status='active',plan='dominer',billing='monthly',owner_user_id=? WHERE user_id=?",
    uid,
    uid,
  );
  alignPeriod(uid, now());
  syncAllowance(uid);
  const sid = `test-${id()}`;
  run(
    "INSERT INTO subscriptions (user_id,status,plan,billing,owner_user_id,source,created_at,updated_at) VALUES (?,'active','dominer','monthly',?,'admin',?,?)",
    sid,
    uid,
    now(),
    now(),
  );
  alignPeriod(sid, now());
  syncAllowance(sid);
  const token = crypto.randomBytes(32).toString("base64url");
  run(
    "INSERT INTO sessions (id,user_id,expires_at,created_at) VALUES (?,?,?,?)",
    crypto.createHash("sha256").update(token).digest("hex"),
    uid,
    now() + 86400000,
    now(),
  );
  setSetting(
    "provider.openai.apiKey",
    "test-only-never-contact-a-provider",
    true,
  );
  setSetting(
    "provider.anthropic.apiKey",
    "test-only-never-contact-a-provider",
    true,
  );
  fs.writeFileSync(
    path.join(dir, "test-only.json"),
    JSON.stringify({ uid, token, cases: CASES.slice(0, 2) }),
    { mode: 0o600 },
  );
  console.log(
    "Compte et deux abonnements synthétiques créés. Aucune clé réelle, aucun appel IA.",
  );
} else if (command === "worker") {
  if (!fs.existsSync(path.join(dir, "test-only.json")))
    throw new Error("Dossier de test non initialisé.");
  // Tout appel réseau est interdit dans ce worker. Seule la recherche injectée lit une source synthétique.
  globalThis.fetch = async () => {
    throw new Error("Réseau interdit dans le harnais fournisseurs simulés");
  };
  for (;;) {
    const job = claimNext(["project.prepare"]);
    if (!job) {
      await new Promise((r) => setTimeout(r, 250));
      continue;
    }
    try {
      const payload = JSON.parse(job.payload);
      if (payload.correction?.includes("[TEST_ECHEC_FOURNISSEUR]"))
        throw new Error(
          "Échec fournisseur simulé : données et versions conservées.",
        );
      const ctx = new JobContext(job);
      const result = await runWithLang({ ui: "fr", content: "fr" }, () =>
        runForUser(
          job.user_id,
          () => runPreparation(ctx, simulatedDependencies),
          "normal",
          job.project_id,
        ),
      );
      completeJob(job.id, result);
      console.log(
        "Proposition simulée enregistrée",
        JSON.parse(job.payload).step,
        JSON.parse(job.payload).action,
      );
    } catch (e) {
      failJob(job, e, { permanent: true });
      const { commitState } = await import("@/lib/preparation/store");
      const s = stateOf(job.project_id!);
      if (s?.pending?.jobId === job.id)
        commitState(job.project_id!, s.revision, (n) => {
          delete n.pending;
          n.error = {
            step: JSON.parse(job.payload).step,
            message: (e as Error).message,
            at: now(),
          };
        });
      console.log("Échec simulé enregistré", JSON.parse(job.payload).step);
    }
  }
} else if (command === "proof") {
  const receipt = {
    simulation: true,
    at: now(),
    projects: all<{ id: string }>("SELECT id FROM projects").map((p) => ({
      id: p.id,
      revision: stateOf(p.id)?.revision,
      ready: readyContract(p.id),
      jobs: all(
        "SELECT type,status,max_attempts,result,error FROM jobs WHERE project_id=?",
        p.id,
      ),
    })),
    aiCalls: one<{ n: number }>("SELECT COUNT(*) n FROM ai_calls")!.n,
    reservations: one<{ n: number }>("SELECT COUNT(*) n FROM ai_reservations")!
      .n,
    themes: one<{ n: number }>("SELECT COUNT(*) n FROM theme_versions")!.n,
  };
  fs.writeFileSync(
    path.join(dir, "persistence-proof.json"),
    JSON.stringify(receipt, null, 2),
  );
  console.log(
    "Preuve de persistance sauvegardée, appels IA :",
    receipt.aiCalls,
    "thèmes :",
    receipt.themes,
  );
} else throw new Error("Commande seed, worker ou proof requise.");
