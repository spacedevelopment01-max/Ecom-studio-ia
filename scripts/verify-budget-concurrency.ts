/** Sous-processus du test de concurrence : aucun fournisseur, uniquement une base temporaire isolée. */
import path from "node:path";
if (!process.env.DATA_DIR || !path.basename(process.env.DATA_DIR).startsWith("ecs-test-142-billing-")) throw new Error("Base isolée de test obligatoire");
globalThis.fetch = async () => { throw new Error("Aucun réseau autorisé dans ce test"); };
const { reserve } = await import("../src/lib/billing");
const { UserFacingError } = await import("../src/lib/jobs");
try {
  reserve(process.argv[2], 60_000, { task: "copywriting", provider: "synthetic", model: "test-rate" });
  console.log("reserved");
} catch (e) {
  if (!(e instanceof UserFacingError)) throw e;
  console.log("blocked");
}
