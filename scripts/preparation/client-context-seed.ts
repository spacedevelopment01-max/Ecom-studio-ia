/** Brouillons fictifs pour la preuve navigateur #204 ; aucun fournisseur, aucune base existante. */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
const dir = process.env.DATA_DIR;
if (!dir || !path.isAbsolute(dir) || !path.basename(dir).startsWith("ecs-preparation-test-204-")) throw new Error("Dossier temporaire de recette obligatoire");
fs.mkdirSync(dir, { recursive: true });
if (fs.readdirSync(dir).length) throw new Error("Dossier non vide refusé : ne pas modifier une base ou une recette existante");
globalThis.fetch = async () => { throw new Error("Aucun réseau fournisseur dans cette simulation"); };
const { fixture, initializeSynthetic } = await import("../../tests/preparation-fixtures");
const { stateOf, requestHash } = await import("../../src/lib/preparation/engine");
const { commitState } = await import("../../src/lib/preparation/store");
const { applyFicheChange } = await import("../../src/lib/preparation/fiche");
const { reconcileAnalysis } = await import("../../src/lib/preparation/analysis-context");
const { enqueue } = await import("../../src/lib/jobs");
const { run, now, all } = await import("../../src/lib/db");
const { syncAllowance } = await import("../../src/lib/billing");
const cases: { slug: string; pid: string; token: string; width: number }[] = [];
for (const width of [1440, 390]) for (const [slug, business, attempts] of [["service-reprise", "services", 1], ["service-limite", "services", 2], ["produit", "products", 0]] as const) {
  const f = await fixture(business); f.input.photoIds = [];
  run("UPDATE users SET name='Recette fictive — aucun appel IA' WHERE id=?", f.uid);
  run("UPDATE subscriptions SET plan='vendre' WHERE user_id=?", f.uid); syncAllowance(f.uid);
  run("UPDATE projects SET name=? WHERE id=?", `SIMULATION — ${slug}`, f.pid);
  if (business === "services") {
    Object.assign(f.input, { offerName: "", brandName: "", description: "Nous sommes un atelier fictif de mobilier près de Dijon. Nous concevons des meubles et restaurons ceux que nos clients apportent. Le site doit présenter nos prestations et recevoir des demandes de devis, avec un rendez-vous possible. Aucun tarif, label ou délai n'est encore défini.", target: "Particuliers de la région.", services: { ...f.input.services, area: "Près de Dijon", address: "", email: "", phone: "", contactMode: "quote", contactModes: ["quote", "booking"], services: [{ name: "Mobilier sur mesure", description: "Étudier les usages et concevoir le mobilier selon l'espace.", source: "client" }, { name: "Restauration partielle", description: "Définir avec le client les éléments à remettre en état après étude du meuble.", source: "client" }] } });
  }
  initializeSynthetic(f.pid, f.input);
  commitState(f.pid, stateOf(f.pid)!.revision, n => {
    const b = n.stages.brief!.data;
    b.profile.summary = "Présentation fictive à relire ; aucune création fournisseur.";
    if (business === "services") {
      b.profile.questions = [];
      applyFicheChange(b, { kind: "fact", key: "customization", label: "Personnalisation", topic: "customization", value: "Chaque projet dépend de l'espace, des usages et du budget du client, étudiés ensemble avant la proposition." });
      applyFicheChange(b, { kind: "fact", key: "request_process", label: "Déroulement d’une demande", topic: "process", value: "Premier échange sur les usages, informations et photos, éventuel rendez-vous, proposition puis devis à valider avant les travaux." });
      applyFicheChange(b, { kind: "later", key: "quote_price_old", label: "Gratuité du devis", topic: "quote" });
      applyFicheChange(b, { kind: "later", key: "quote_delay_old", label: "Délai du devis", topic: "quote" });
      const simulated = structuredClone(b);
      simulated.profile.questions = [
        { id: "changed_process", factKey: "new_steps", question: "Comment se passe une demande, du premier contact jusqu’au devis ?", why: "Simulation", topic: "process", required: false },
        { id: "changed_custom", factKey: "new_custom", question: "Qu’adaptez-vous selon chaque client (par exemple les matériaux et finitions) ?", why: "Simulation", topic: "customization", required: false },
        { id: "quote_inputs", factKey: "quote_inputs", question: "De quelles informations avez-vous besoin pour établir un devis ?", why: "Précision encore absente", topic: "quote", required: false },
      ];
      simulated.profile.facts.push({ key: "new_free_quote", label: "Devis gratuit", status: "unknown", source: "ai", value: "", topic: "quote" });
      Object.assign(b, reconcileAnalysis(b, simulated));
    }
    // Ancien message figé : stateOf doit recalculer les vrais points, sans réécrire l'historique.
    b.missing = ["Indiquez au moins une prestation.", "Coordonnées obligatoires."];
  });
  for (let i = 0; i < attempts; i++) {
    const s = stateOf(f.pid)!;
    const j = enqueue({ userId: f.uid, projectId: f.pid, type: "project.prepare", payload: { step: "brief", action: "analyze", inputHash: requestHash(s, "brief", "analyze"), revision: s.revision }, label: "Ancien essai fictif (aucun fournisseur)" });
    run("UPDATE jobs SET status='done',finished_at=? WHERE id=?", now(), j.id);
  }
  const token = crypto.randomBytes(32).toString("base64url");
  run("INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)", crypto.createHash("sha256").update(token).digest("hex"), f.uid, now() + 86400000, now());
  cases.push({ slug, pid: f.pid, token, width });
}
fs.writeFileSync(path.join(dir, "private-session.json"), JSON.stringify(cases), { mode: 0o600 });
console.log(JSON.stringify({ simulation: true, cases: cases.map(c => ({ slug: c.slug, pid: c.pid })), aiCalls: all("SELECT id FROM ai_calls").length }));
