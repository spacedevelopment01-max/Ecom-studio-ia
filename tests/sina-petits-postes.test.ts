/**
 * Les petits postes de la conversation (audit du 22 novembre 2026), sans IA : la raison écrite de chaque action n'est
 * plus demandée, la relectrice garde sa consigne une heure, la fiche n'est donnée qu'une fois.
 */
import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("petits postes de la conversation", async () => {
  const J = await import("@/lib/syna-agent/journey");
  const { SYNA_SYSTEM } = await import("@/lib/syna-agent/prompt");
  it("plus de raison écrite pour chaque action (personne ne la lisait)", () => {
    expect(SYNA_SYSTEM).not.toContain('"why": "raison courte"');
  });
  it("la relectrice garde sa consigne une heure en mémoire", () => {
    const src = fs.readFileSync("src/lib/syna-agent/loop.ts", "utf8");
    expect(src).toMatch(/system: REPLY_REVIEW_SYSTEM, promptKey: "syna-reply-review-1",\n[^\n]*\n\s*memoireLongue: true,/);
  });
  it("la fiche est donnée une seule fois : avec elle, ni « Ce que tu sais déjà », ni « Tes notes », ni les réponses de l'étape 0 redonnées", () => {
    const j = J.emptyJourney();
    j.start.offer = { status: "answered", value: "Des bougies à 30 €", source: "client" } as never;
    const notes = [{ sujet: "son histoire", value: "Douze ans d'atelier." }];
    expect(J.journeyContext(j, { notes })).toContain("Ce que tu sais déjà");
    const avec = J.journeyContext(j, { notes, fiche: "## Sa fiche\n- offre : « Des bougies à 30 € »" });
    expect(avec).not.toContain("Ce que tu sais déjà");
    expect(avec).not.toContain("Tes notes");
    expect(avec).toContain("Tout ce qu'il a déjà dit est dans sa fiche");
    expect(J.activityStepContext(j, { fiche: true }).join("\n")).not.toContain("« Des bougies à 30 € »");
  });
  it("le compte rendu du site est donné une fois avec le résultat de la tâche ; le contexte ne garde que ce qui reste", () => {
    const src = fs.readFileSync("src/lib/syna-agent/loop.ts", "utf8");
    expect(src).toContain("data: compteRendu ? { taches: results, compteRenduDuSite: compteRendu } : results");
    expect(J.resteDuSite({ concept: "x", signe: "y", aCompleter: ["le téléphone"], aRevoir: [], pret: false } as never)).toEqual({ aCompleter: ["le téléphone"], pret: false });
  });
  it("les pièces jointes : celles du dernier message décrites en entier, les anciennes en une ligne", async () => {
    const { piecesJointes } = await import("@/lib/syna-agent/loop");
    const { run } = await import("@/lib/db");
    const cid = `conv-pj-${Math.random().toString(36).slice(2)}`;
    const ins = (id: string, name: string, chars: number) => run("INSERT INTO syna_attachments(id, conversation_id, user_id, kind, name, mime, path, size, analysis_json, created_at) VALUES(?,?,?,?,?,?,?,?,?,?)", id, cid, "u", "document", name, "text/plain", "/tmp/x", 10, JSON.stringify({ characters: chars, text: "Contenu du document." }), Date.now());
    try { ins("att-ancien", "ancien.txt", 100); ins("att-neuf", "neuf.txt", 200); } catch (e) { console.log("schéma :", (e as Error).message); return; }
    const h = [{ id: "1", seq: 1, role: "user", runId: null, content: { text: "voici", attachments: ["att-neuf"] }, createdAt: 0 }] as never;
    const out = piecesJointes(cid, h);
    expect(out).toContain("- att-ancien : « ancien.txt »");
    expect(out).toMatch(/- att-neuf : document « neuf\.txt », 200 caractères\. Début : Contenu du document\./);
  });
  it("pendant les retouches, avant la validation, SINA voit son site ; ces captures changeantes partent après le fil", async () => {
    const { imageQuiChange } = await import("@/lib/syna-agent/loop");
    expect(imageQuiChange("Thème sur mesure du client — accueil (téléphone), partie 1/3")).toBe(true);
    expect(imageQuiChange("Galerie produit créée il y a quelques minutes")).toBe(true);
    expect(imageQuiChange("Marque du client — logo")).toBe(false);
    expect(imageQuiChange("Identité A")).toBe(false);
    const src = fs.readFileSync("src/lib/syna-agent/attachments.ts", "utf8");
    expect(src).toContain(`(j.siteMode?.mode === "mockup" || j.customChosenAt || j.site?.at)`);
  });
});

