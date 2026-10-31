// Recette #232 : un abonnement fictif « Développer » par projet de recette (règle du studio : un abonnement = un projet).
const W = process.cwd();
const fs = await import("node:fs");
const ids = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const { grantProjectPlan } = await import(W + "/src/lib/project-subscriptions.ts");
const { projectPlan } = await import(W + "/src/lib/project-billing.ts");
for (const k of ["artisan", "reservation", "agence"]) if (!projectPlan(ids[k])) grantProjectPlan(ids[k], "vendre");
console.log(["artisan", "reservation", "agence"].map((k) => `${k}=${projectPlan(ids[k])}`).join(" "));
