/** Exécute uniquement le vrai handler de choix d'identité sur les fixtures isolées.
 * Aucun worker créatif/génération : réseau interdit, IA désactivée explicitement.
 */
import fs from "node:fs";
import path from "node:path";
const dir = process.env.DATA_DIR;
if (!dir || !path.isAbsolute(dir) || !path.basename(dir).startsWith("ecs-preparation-test-") || !fs.existsSync(path.join(dir, "mission-private.json"))) throw new Error("Données synthétiques de mission obligatoires.");
globalThis.fetch = async () => { throw new Error("Réseau interdit : choix d’identité synthétique."); };
const { claimNext, JobContext, completeJob, failJob } = await import("../../src/lib/jobs");
const { handlers } = await import("../../worker/handlers");
const { runForUser, withAiDisabled } = await import("../../src/lib/ai/access");
const { runWithLang } = await import("../../src/lib/i18n-server");
const allowed = new Set(JSON.parse(fs.readFileSync(path.join(dir, "mission-private.json"), "utf8")).map((f: { pid: string }) => f.pid));
const stopAt = Date.now() + 10 * 60_000;
while (Date.now() < stopAt) {
  const job = claimNext(["brand.logo.v2.choose"]);
  if (!job) { await new Promise(r => setTimeout(r, 250)); continue; }
  try {
    if (!allowed.has(job.project_id)) throw new Error("Projet absent du jeu isolé.");
    const result = await runWithLang({ ui: "fr", content: "fr" }, () => runForUser(job.user_id, () => withAiDisabled("Choix local synthétique : aucun appel payant", () => handlers[job.type](new JobContext(job))), "normal", job.project_id));
    completeJob(job.id, result);
    console.log("Choix d’identité exécuté par le handler natif, aucun fournisseur.");
  } catch (e) { failJob(job, e, { permanent: true }); console.error("Choix isolé en échec :", (e as Error).message); }
}
