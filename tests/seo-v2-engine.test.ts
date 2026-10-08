/**
 * SEO V2 (phase 8A) — moteur complet avec outils simulés : AUCUN appel d'IA, aucune dépense. Vérifie : rédaction
 * locale gratuite, rédaction IA contrôlée puis relue (FINAL seulement si complet et relu), reprise ciblée sur un
 * défaut identifié (et seulement alors), texte IA fautif écarté, plafond avant envoi, idempotence, lignée du client
 * protégée, éditions manuelles sans IA, retouche IA limitée et refusée si elle invente, versions et restauration,
 * Blog V2 rangé dans le blog existant (forfait respecté), orchestrateur, benchmarks simulés A–E.
 */
import { describe, expect, it } from "vitest";

describe("SEO V2 — moteur", async () => {
  const { createUser } = await import("@/lib/auth");
  const { all, one, run } = await import("@/lib/db");
  const { getSubscription, syncAllowance } = await import("@/lib/billing");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { runContentEngineV2, saveUserEdit, editContentV2 } = await import("@/lib/seo-v2/engine");
  const { latestContent, listContentVersions, restoreContentVersion, listContents } = await import("@/lib/seo-v2/store");
  const { applyContentOps } = await import("@/lib/seo-v2/ops");
  const { toMarkdown } = await import("@/lib/seo-v2/doc");
  const { localOnlyDeps } = await import("@/lib/seo-v2/deps");
  const { blogIdFor } = await import("@/lib/seo-v2/blog");
  const { ACTION_STEPS } = await import("@/lib/orchestrator/execute");
  const { intentsFromAction } = await import("@/lib/orchestrator/intent");
  const { HANDLER_TYPES } = await import("../worker/handlers");
  const { seedImageFixture } = await import("./image-v2-fixtures");
  const { mockSeoDeps, review, faithfulDraft } = await import("./seo-v2-mock");
  const { SEO_SCENARIOS, SEO_FIXTURE, SEO_TYPES } = await import("./seo-v2-fixtures");
  const fr = <T,>(fn: () => Promise<T>) => runWithLang({ ui: "fr", content: "fr" }, fn);
  const u = await createUser(`seo2e-${Date.now()}@test.fr`, "motdepasse-test", "S");
  const pro = await createUser(`seo2p-${Date.now()}@test.fr`, "motdepasse-test", "P");
  getSubscription(pro.id);
  run("UPDATE subscriptions SET status = 'active', plan = 'dominer' WHERE user_id = ?", pro.id);
  syncAllowance(pro.id);
  const seed = (k: Parameters<typeof seedImageFixture>[1], who = u.id) => seedImageFixture(who, k);

  it("sans IA (Découverte) : rédaction locale immédiate, 0 €, PROVISOIRE, version enregistrée", async () => {
    const pid = seed("cosmetic");
    const r = await fr(() => runContentEngineV2(null, pid, { type: "product_page" }, localOnlyDeps()));
    expect(r.by).toBe("local");
    expect(r.costMicro).toBe(0);
    expect(r.verdict).toBe("PROVISIONAL");
    expect(r.notes.join(" ")).toMatch(/0 €/);
    expect(latestContent(pid, r.docKey!)!.version.version).toBe(1);
    expect(all("SELECT 1 FROM ai_calls WHERE project_id = ?", pid)).toHaveLength(0);
  });

  it("IA : rédaction fidèle aux faits, relue → FINAL quand rien ne manque ; modèle fort pour la page, coût mesuré", async () => {
    const pid = seed("hightech");
    const { deps, log } = mockSeoDeps();
    const r = await fr(() => runContentEngineV2(null, pid, { type: "faq" }, deps));
    expect(log.kinds).toEqual(["write_page"]);
    expect(log.reviews).toBe(1);
    expect(r.by).toBe("ai");
    expect(r.codes).toEqual([]);
    expect(r.verdict).toBe("FINAL");
    expect(r.costMicro).toBe(3_000);
    // La consigne porte les faits, les inconnues, les interdits et l'hypothèse sémantique.
    expect(log.writes[0]).toMatch(/FAITS VÉRIFIÉS/);
    expect(log.writes[0]).toMatch(/INCONNUES/);
    expect(log.writes[0]).toMatch(/hypothèse sémantique, sans donnée de volume/);
  });

  it("texte IA avec information manquante : jamais FINAL même bien noté", async () => {
    const pid = seed("cosmetic");
    const { deps } = mockSeoDeps({ drafts: [(p) => { const d = faithfulDraft(p); d.blocks.push({ kind: "h2", text: "Utilisation" }, { kind: "p", text: "[À compléter : mode d'emploi]" }); return d; }] });
    const r = await fr(() => runContentEngineV2(null, pid, { type: "product_page" }, deps));
    expect(r.verdict).toBe("PROVISIONAL");
  });

  it("reprise ciblée : seulement avec un défaut identifié (blocs et consigne) ; une bonne première version n'est jamais refaite", async () => {
    const pid = seed("cosmetic");
    const { deps, log } = mockSeoDeps({ drafts: [(p) => ({ ...faithfulDraft(p), blocks: [...faithfulDraft(p).blocks, { kind: "p", text: "Certifié bio et livraison gratuite en 24h." }] }), (p) => faithfulDraft(p)] });
    const r = await fr(() => runContentEngineV2(null, pid, { type: "product_page" }, deps));
    expect(r.stats.retries).toBe(1);
    expect(log.writes[1]).toMatch(/CORRECTION CIBLÉE/);
    expect(log.writes[1]).toMatch(/affirmation non confirmée|information commerciale non confirmée/);
    expect(log.writes[1]).toMatch(/blocs : b/);
    expect(toMarkdown(r.doc!)).not.toMatch(/bio|livraison gratuite/i);
    const pid2 = seed("hightech");
    const m2 = mockSeoDeps();
    const r2 = await fr(() => runContentEngineV2(null, pid2, { type: "faq" }, m2.deps));
    expect(r2.stats.retries).toBe(0);
    expect(m2.log.writes).toHaveLength(1);
  });

  it("texte IA qui invente encore après les reprises : écarté, remplacé par le texte local construit sur les faits", async () => {
    const pid = seed("cosmetic");
    const liar = (p: string) => ({ ...faithfulDraft(p), blocks: [...faithfulDraft(p).blocks, { kind: "p" as const, text: "Selon une étude, 92 % des utilisatrices voient un effet anti-âge prouvé." }] });
    const { deps, log } = mockSeoDeps({ drafts: [liar] });
    const r = await fr(() => runContentEngineV2(null, pid, { type: "product_page" }, deps));
    expect(log.writes.length).toBe(3);
    expect(r.by).toBe("local");
    expect(r.notes.join(" ")).toMatch(/texte IA écarté/);
    expect(toMarkdown(r.doc!)).not.toMatch(/étude|92 %|anti-âge/);
  });

  it("relecture en panne : jamais validé ; relecture qui trouve une invention : reprise", async () => {
    const pid = seed("hightech");
    const { deps } = mockSeoDeps({ reviews: [new Error("délai dépassé")] });
    const r = await fr(() => runContentEngineV2(null, pid, { type: "faq" }, deps));
    expect(r.verdict).not.toBe("FINAL");
    const pid2 = seed("hightech");
    const m = mockSeoDeps({ reviews: [review(8.5, { invented: ["étanche"] }), review(8.8)] });
    const r2 = await fr(() => runContentEngineV2(null, pid2, { type: "faq" }, m.deps));
    expect(r2.stats.retries).toBe(1);
    expect(m.log.writes[1]).toMatch(/inventé : étanche/);
    expect(r2.verdict).toBe("FINAL");
  });

  it("plafond de coût : appel refusé AVANT l'envoi, texte local gardé, arrêt signalé", async () => {
    const pid = seed("cosmetic");
    const { deps, log } = mockSeoDeps({ estimate: 900_000 });
    const r = await fr(() => runContentEngineV2(null, pid, { type: "product_page", maxCostEur: 0.5 }, deps));
    expect(log.writes).toHaveLength(0);
    expect(r.stoppedByCostCap).toBe(true);
    expect(r.by).toBe("local");
    expect(r.costMicro).toBe(0);
  });

  it("idempotence : même brief, mêmes faits → rien refait ni payé ; un fait ajouté → nouvelle rédaction", async () => {
    const pid = seed("hightech");
    const { deps, log } = mockSeoDeps();
    const a = await fr(() => runContentEngineV2(null, pid, { type: "faq" }, deps));
    const b = await fr(() => runContentEngineV2(null, pid, { type: "faq" }, deps));
    expect(b.skipped).toBe(true);
    expect(b.costMicro).toBe(0);
    expect(b.docKey).toBe(a.docKey);
    expect(log.writes).toHaveLength(1);
    expect(listContentVersions(pid, a.docKey!)).toHaveLength(1);
    run("UPDATE projects SET product_json = json_insert(product_json, '$.facts[#]', json(?)) WHERE id = ?", JSON.stringify({ key: "weight", label: "Poids", value: "250 g", status: "confirmed", source: "user" }), pid);
    const c = await fr(() => runContentEngineV2(null, pid, { type: "faq" }, deps));
    expect(c.skipped).toBe(false);
    expect(log.writes).toHaveLength(2);
    const d = await fr(() => runContentEngineV2(null, pid, { type: "faq", force: true }, deps));
    expect(d.skipped).toBe(false);
  });

  it("modifications du client : manuelles sans IA, versionnées ; jamais écrasées par une nouvelle rédaction ; restauration = copie", async () => {
    const pid = seed("cosmetic");
    const r = await fr(() => runContentEngineV2(null, pid, { type: "product_page" }, localOnlyDeps()));
    const doc = latestContent(pid, r.docKey!)!.doc;
    const p = doc.blocks.find((b) => b.kind === "p")!;
    const edited = applyContentOps(doc, [{ op: "set_text", blockId: p.id, text: "Mon texte validé, écrit par moi." }]);
    const before = all("SELECT 1 FROM ai_calls WHERE project_id = ?", pid).length;
    const s = saveUserEdit(pid, r.docKey!, edited);
    expect(s.version.version).toBe(2);
    expect(all("SELECT 1 FROM ai_calls WHERE project_id = ?", pid).length).toBe(before);
    const again = await fr(() => runContentEngineV2(null, pid, { type: "product_page", force: true }, localOnlyDeps()));
    expect(again.docKey).not.toBe(r.docKey);
    expect(again.notes.join(" ")).toMatch(/modifié par le client : conservé/);
    expect(toMarkdown(latestContent(pid, r.docKey!)!.doc)).toContain("Mon texte validé, écrit par moi.");
    const back = restoreContentVersion(pid, r.docKey!, 1);
    expect(back.version).toBe(3);
    expect(listContentVersions(pid, r.docKey!).map((v) => v.version)).toEqual([3, 2, 1]);
  });

  it("retouches en conversation : locale gratuite ; IA limitée aux blocs visés ; réécriture qui invente refusée", async () => {
    const pid = seed("cosmetic");
    const r = await fr(() => runContentEngineV2(null, pid, { type: "product_page" }, localOnlyDeps()));
    const key = r.docKey!;
    const p = latestContent(pid, key)!.doc.blocks.find((b) => b.kind === "p")!;
    const m0 = mockSeoDeps();
    const loc = await fr(() => editContentV2(null, pid, key, "Ajoute une FAQ", {}, m0.deps));
    expect(loc.by).toBe("local");
    expect(loc.applied).toBe(true);
    expect(m0.log.rewrites).toBe(0);
    // Sans IA : la demande créative n'est pas faite (rien d'inventé localement).
    const no = await fr(() => editContentV2(null, pid, key, "Rends ce texte plus premium", { selected: [p.id] }, localOnlyDeps()));
    expect(no.applied).toBe(false);
    expect(no.needsAi).toBe(true);
    // IA : seul le bloc ciblé change, même si la réponse touche d'autres blocs.
    const other = latestContent(pid, key)!.doc.blocks.find((b) => b.kind === "h2")!;
    const ok = mockSeoDeps({ rewrite: { blocks: [{ id: p.id, text: "Sérum Éclat : un geste précis, 30 ml de soin." }, { id: other.id, text: "Titre changé sans demande" }], note: "" } });
    const e = await fr(() => editContentV2(null, pid, key, "Rends ce texte plus premium", { selected: [p.id] }, ok.deps));
    expect(e.applied).toBe(true);
    const after = latestContent(pid, key)!.doc;
    expect(after.blocks.find((b) => b.id === p.id)).toMatchObject({ text: "Sérum Éclat : un geste précis, 30 ml de soin." });
    expect(after.blocks.find((b) => b.id === other.id)).toMatchObject({ text: (other as { text: string }).text });
    const liar = mockSeoDeps({ rewrite: { blocks: [{ id: p.id, text: "Certifié bio, résultats cliniquement prouvés." }], note: "" } });
    const n = await fr(() => editContentV2(null, pid, key, "Rends ce texte plus premium", { selected: [p.id] }, liar.deps));
    expect(n.applied).toBe(false);
    expect(n.summary).toMatch(/refusée/);
    expect(latestContent(pid, key)!.doc.blocks.find((b) => b.id === p.id)).toMatchObject({ text: "Sérum Éclat : un geste précis, 30 ml de soin." });
  });

  it("Blog V2 : brouillon rangé dans le blog existant ; IA seulement si le forfait inclut le blog (sinon local, 0 €) ; quota décompté une fois", async () => {
    const pid = seed("cosmetic");
    const free = mockSeoDeps();
    const r = await fr(() => runContentEngineV2(null, pid, { type: "blog_article" }, free.deps));
    expect(free.log.writes).toHaveLength(0);
    expect(r.by).toBe("local");
    expect(r.notes[0]).toMatch(/non inclus dans votre forfait/);
    const a = one<{ status: string; title: string; body_html: string }>("SELECT status, title, body_html FROM blog_articles WHERE id = ?", blogIdFor(r.docKey!))!;
    expect(a.status).toBe("draft");
    expect(a.body_html).not.toContain("<h1>");
    const pid2 = seed("cosmetic", pro.id);
    const paid = mockSeoDeps();
    const r2 = await fr(() => runContentEngineV2(null, pid2, { type: "blog_article" }, paid.deps));
    expect(paid.log.kinds).toEqual(["write_article"]);
    expect(r2.by).toBe("ai");
    expect(one<{ c: number }>("SELECT COUNT(*) c FROM quota_events WHERE user_id = ? AND ref LIKE 'blog2:%'", pro.id)?.c).toBe(1);
    expect(one("SELECT 1 FROM blog_articles WHERE id = ?", blogIdFor(r2.docKey!))).toBeTruthy();
    expect(listContents(pid2, ["blog_article"])).toHaveLength(1);
  });

  it("branchements : tâche de fond, orchestrateur (intention SEO → moteur V2), politiques reliées aux étapes", () => {
    expect(HANDLER_TYPES).toContain("content.v2");
    expect(ACTION_STEPS["content.v2"]).toEqual(["seo"]);
    expect(intentsFromAction("content.v2")).toEqual(["SEO"]);
  });

  it("benchmarks simulés A–E : chaque scénario produit ses contenus sans affirmation inventée ni lien inventé, sans code propre au scénario", async () => {
    for (const s of SEO_SCENARIOS) {
      const pid = seed(SEO_FIXTURE[s], pro.id);
      for (const type of SEO_TYPES[s]) {
        const { deps } = mockSeoDeps();
        const r = await fr(() => runContentEngineV2(null, pid, { type }, deps));
        expect(r.doc, `${s} ${type}`).toBeTruthy();
        expect(r.codes.filter((c) => ["invented_claim", "invented_source", "wrong_fact", "unconfirmed_commercial", "invented_link", "forbidden_claim"].includes(c)), `${s} ${type}`).toEqual([]);
        expect(["FINAL", "PROVISIONAL"]).toContain(r.verdict);
        expect(r.costMicro).toBeLessThanOrEqual(Math.round(0.6 * 1_000_000));
      }
    }
  });
});
