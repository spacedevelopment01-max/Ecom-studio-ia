/** Exécute le pilote complet sur une photo, sans navigateur. */
import fs from "node:fs";
import { createUser } from "../src/lib/auth";
import { id, now, run, all, one } from "../src/lib/db";
import { saveAsset, ensureFolders } from "../src/lib/library";
import { enqueue, claimNext, JobContext, completeJob, failJob, getJob } from "../src/lib/jobs";
import { handlers } from "../worker/handlers";

const photo = process.argv[2];
const user = await createUser(`e2e-${Date.now()}@test.fr`, "motdepasse-e2e", "Test");
const pid = id();
run("INSERT INTO projects (id, user_id, name, created_at, updated_at) VALUES (?,?,?,?,?)", pid, user.id, "Nouveau projet", now(), now());
ensureFolders(pid);
await saveAsset({ projectId: pid, userId: user.id, data: fs.readFileSync(photo), name: "photo.png", mime: "image/png", role: "original", folderKey: "product.originals", origin: "upload" });
enqueue({ userId: user.id, projectId: pid, type: "pipeline.run", payload: { projectId: pid, mode: "autopilot", input: { productName: process.argv[3], brandName: process.argv[4], description: process.argv[5], price: process.argv[6] } } });
const t0 = Date.now();
for (;;) {
  const job = claimNext(Object.keys(handlers));
  if (!job) break;
  const ctx = new JobContext(job);
  const t = Date.now();
  try { const r = await handlers[job.type](ctx); completeJob(job.id, r); console.log("✓", job.type, ((Date.now()-t)/1000).toFixed(1)+"s", JSON.stringify(r).slice(0, 200)); }
  catch (e) { failJob(getJob(job.id)!, e, { permanent: true }); console.log("✗", job.type, (e as Error).stack?.slice(0, 800)); }
}
console.log("total", ((Date.now()-t0)/1000).toFixed(1), "s");
console.log(all("SELECT role, COUNT(*) n FROM assets WHERE project_id = ? GROUP BY role", pid));
console.log(one("SELECT status, name FROM projects WHERE id = ?", pid));
console.log(all("SELECT network, status, title, scheduled_at FROM posts WHERE project_id = ? LIMIT 3", pid));
console.log("PROJECT", pid, "USER", user.email);
