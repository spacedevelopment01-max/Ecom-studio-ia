/**
 * SINA — le juge des angles marketing (carte des spécialistes, lot 4) : la stratège écrit, un juge séparé juge, les
 * angles refusés sont réécrits UNE fois et la réécriture repasse les contrôles du Studio. Aucun appel d'IA : le juge et
 * la stratège sont simulés.
 */
import { afterEach, describe, expect, it } from "vitest";

describe("SINA — le juge des angles marketing", async () => {
  const { loadProject } = await import("@/lib/projects");
  const { fixture } = await import("./preparation-fixtures");
  const J = await import("@/lib/preparation/angles-judge");
  const { validateResearch } = await import("@/lib/preparation/research-validation");
  const { anglesOf } = await import("@/lib/syna-agent/angles");
  const { anglesDoubtHint } = await import("@/lib/syna-agent/tools/angles");

  const quotes = ["Je cherche un thé qui me réveille sans me donner la nausée le matin", "On ne sait jamais d'où viennent vraiment les feuilles", "J'aime offrir quelque chose qui se partage à table"];
  const source = (id: string, category: string, quote: string) => ({ id, url: `https://exemple.test/${id}`, title: `Page ${id}`, status: "consulted", category, excerpt: `Avis lus sur la page. ${quote}. Fin de l'extrait.`, relevance: { accepted: true, reason: "pertinente" } });
  const angle = (id: string, o: { title: string; audience: string; motivation: string; message: string; positioning: string; objection: string }) => ({
    id, title: o.title, audience: o.audience, motivation: o.motivation, message: o.message, positioning: o.positioning, emotion: "sérénité",
    communicationChange: "On montre le moment plutôt que la boîte.", tone: "Calme et chaleureux.", visualDirection: "Lumière du matin sur une table en bois.",
    proofsToConfirm: [], arguments: ["Un moment à soi avant la journée."], objections: [{ objection: o.objection, answer: "On répond simplement, avec ce que la fiche confirme." }],
    reason: "Les clients le disent avec leurs mots.", sourceIds: ["s1"], hypothesis: true, goal: "Donner envie", story: "Un matin ordinaire.", show: "La tasse, la vapeur, la fenêtre.", organicExample: "Une publication du matin.", cta: "Découvre le thé.",
  });
  const research = () => ({
    sources: [source("s1", "customers", quotes[0]), source("s2", "sector", quotes[1]), source("s3", "customers", quotes[2])],
    observations: [{ sourceId: "s1", quote: quotes[0] }, { sourceId: "s2", quote: quotes[1] }, { sourceId: "s3", quote: quotes[2] }],
    angles: [
      angle("usage", { title: "Le réveil en douceur", audience: "Salariés pressés levés avant six heures", motivation: "Démarrer la journée sans brusquer son estomac", message: "Ton matin commence avant le bruit.", positioning: "Un rituel calme pour sortir du sommeil", objection: "Est-ce assez tonique pour tenir la matinée entière" }),
      angle("reassurance", { title: "La feuille qu'on connaît", audience: "Parents attentifs lisant chaque provenance", motivation: "Savoir précisément quelle plantation remplit la théière", message: "Tu sais qui a cueilli ta tasse.", positioning: "Une origine racontée parcelle après parcelle", objection: "Comment vérifier le jardin annoncé sur le sachet" }),
      angle("expression", { title: "La table qui rassemble", audience: "Hôtes généreux recevant leurs amis dimanche", motivation: "Partager une théière fumante pendant les retrouvailles", message: "Pose la théière, les conversations suivent.", positioning: "Un geste convivial au centre du repas", objection: "Faut-il un matériel particulier pour servir plusieurs invités" }),
      angle("discovery", { title: "Le voyage dans la tasse", audience: "Curieux gourmands explorant saveurs lointaines", motivation: "Goûter un paysage inconnu depuis sa cuisine", message: "Une gorgée, et tu changes de continent.", positioning: "Une exploration sensorielle guidée par les arômes", objection: "Par quelle variété débuter quand on découvre" }),
      angle("generalist", { title: "La pause qui t'appartient", audience: "Adultes fatigués réclamant quelques minutes tranquilles", motivation: "Retrouver un instant personnel loin des écrans", message: "Cinq minutes rien qu'à toi.", positioning: "Une respiration quotidienne offerte par l'infusion", objection: "Pourquoi choisir cette marque plutôt qu'une autre boutique" }),
    ],
    recommendedId: "usage", recommendation: "Le réveil en douceur répond à ce que disent les clients.", recommendationSourceIds: ["s1"], legalAvailability: "not_checked",
  }) as any;
  const ctx = (id = `job-${Math.random()}`) => ({ job: { id }, step: async (_k: string, fn: () => Promise<unknown>) => fn() }) as any;
  const project = async () => loadProject((await fixture("products")).pid);
  const garde = (id: string) => ({ id, verdict: "garde", why: "Il tient : la parole d'un client le porte.", fixes: [] });
  const refuse = (id: string, why: string) => ({ id, verdict: "reprendre", why, fixes: ["Pars de la parole du client citée, et montre une personne précise un matin précis."] });

  afterEach(() => { delete J.anglesJudgeDeps.judge; delete J.anglesJudgeDeps.fix; });

  it("le jeu d'essai passe les contrôles du Studio (cinq angles distincts, citations exactes)", () => {
    expect(() => validateResearch(research())).not.toThrow();
  });

  it("tous gardés : rien n'est réécrit, l'avis est gardé avec la recherche", async () => {
    const p = await project(), r = research(), prompts: string[] = [];
    let fixes = 0;
    J.anglesJudgeDeps.judge = async (prompt) => { prompts.push(prompt); return { angles: r.angles.map((a: any) => garde(a.id)), overall: "Cinq territoires nets." }; };
    J.anglesJudgeDeps.fix = async () => { fixes++; return { angles: [] }; };
    const out = await J.judgeAngles(p, ctx(), r);
    expect(fixes).toBe(0);
    expect(out.angles).toEqual(r.angles);
    expect(out.judgement).toEqual({ status: "juges", kept: ["usage", "reassurance", "expression", "discovery", "generalist"], redone: [], doubts: [], overall: "Cinq territoires nets." });
    // Le juge voit tout : les cinq angles, les paroles de clients mot pour mot, la marque.
    const seen = JSON.parse(prompts[0]);
    expect(seen.angles.map((a: any) => a.id)).toEqual(["usage", "reassurance", "expression", "discovery", "generalist"]);
    expect(seen.parolesDeClientsEtSources.map((o: any) => o.citation)).toEqual(quotes);
    expect(seen.parolesDeClientsEtSources[0].famille).toBe("customers");
    expect(J.ANGLE_JUDGE_SYSTEM).toMatch(/Tu ne réécris rien/);
    expect(J.ANGLE_JUDGE_SYSTEM).toMatch(/Un concurrent du même métier pourrait-il signer cet angle/);
  });

  it("deux angles refusés : l'un est réécrit et repasse les contrôles, l'autre garde son doute (réécriture sans source retenue)", async () => {
    const p = await project(), r = research(), fixPrompts: string[] = [];
    J.anglesJudgeDeps.judge = async () => ({ angles: [refuse("usage", "N'importe quel vendeur de thé pourrait le signer."), garde("reassurance"), garde("expression"), refuse("discovery", "L'émotion ne vient d'aucune parole de client."), garde("generalist"), { id: "usage", verdict: "garde", why: "Avis en double, ignoré.", fixes: [] }], overall: "Trois tiennent." });
    const better = { ...r.angles[0], hypothesis: undefined, title: "Le matin sans nausée", audience: "Infirmières de nuit rentrant à l'aube", motivation: "Boire chaud sans retourner un estomac épuisé", message: "Après la garde, enfin quelque chose de doux.", positioning: "Une douceur pensée pour les retours de garde", sourceIds: ["s1", "inconnue"], objections: [{ objection: "Peut-on le boire juste avant de dormir", answer: "On répond simplement, avec ce que la fiche confirme." }] };
    const lost = { ...r.angles[3], hypothesis: undefined, title: "Le goût d'ailleurs", sourceIds: ["source-ecartee"] };
    J.anglesJudgeDeps.fix = async (prompt) => { fixPrompts.push(prompt); return { angles: [better, lost] }; };
    const out = await J.judgeAngles(p, ctx(), r);
    expect(fixPrompts).toHaveLength(1);
    const asked = JSON.parse(fixPrompts[0]);
    expect(asked.anglesARefaire.map((a: any) => a.id)).toEqual(["usage", "discovery"]);
    expect(asked.anglesARefaire[0].correctionsDuJuge[0]).toMatch(/Pars de la parole du client citée/);
    expect(asked.anglesGardes.map((a: any) => a.id)).toEqual(["reassurance", "expression", "generalist"]);
    expect(asked.sourcesRetenues.map((s: any) => s.id)).toEqual(["s1", "s2", "s3"]);
    // « usage » est réécrit (source inconnue retirée, hypothèse marquée) ; « discovery » reste, avec le doute du juge.
    expect(out.angles.find((a: any) => a.id === "usage")).toMatchObject({ title: "Le matin sans nausée", sourceIds: ["s1"], hypothesis: true });
    expect(out.angles.find((a: any) => a.id === "discovery")).toEqual(r.angles[3]);
    expect(out.judgement).toEqual({ status: "juges", kept: ["reassurance", "expression", "generalist"], redone: ["usage"], doubts: [{ id: "discovery", why: "L'émotion ne vient d'aucune parole de client." }], overall: "Trois tiennent." });
    expect(() => validateResearch(out)).not.toThrow();
    // Ce que SINA lit et dit : le doute, à la première personne, jamais « le juge ».
    const shown = anglesOf(out);
    expect(shown.judged).toBe("juges");
    expect(shown.redone).toEqual(["usage"]);
    expect(shown.list.find((a) => a.id === "discovery")!.doubt).toBe("L'émotion ne vient d'aucune parole de client.");
    expect(shown.list.find((a) => a.id === "usage")!.doubt).toBeUndefined();
    expect(anglesDoubtHint(shown)).toMatch(/Tu doutes de cet angle .* « Le voyage dans la tasse » \(L'émotion ne vient d'aucune parole de client\.\)/);
    expect(anglesDoubtHint(shown)).toMatch(/sans jamais parler de juge/);
    expect(anglesDoubtHint(shown)).not.toMatch(/recommandé en fait partie/);
  });

  it("une réécriture qui casse les règles est écartée : cible d'un angle déjà autorisé changée, promesse non confirmée, angle devenu trop proche d'un autre", async () => {
    const p = await project(), r = research();
    J.anglesJudgeDeps.judge = async () => ({ angles: [refuse("usage", "Trop général."), refuse("reassurance", "Trop général."), refuse("expression", "Trop général."), garde("discovery"), garde("generalist")], overall: "" });
    J.anglesJudgeDeps.fix = async () => ({ angles: [
      // Angle déjà utilisé par le client : sa cible ne change jamais.
      { ...r.angles[0], hypothesis: undefined, audience: "Étudiants révisant tard" },
      // Promesse non confirmée dans un texte de vente.
      { ...r.angles[1], hypothesis: undefined, message: "Certifié bio et garanti à vie, livré en 24 h." },
      // Copie d'un angle gardé : cinq angles distincts restent exigés.
      { ...r.angles[3], hypothesis: undefined, id: "expression" },
    ] });
    const out = await J.judgeAngles(p, ctx(), r, { locked: ["usage"] });
    expect(out.angles).toEqual(r.angles);
    expect(out.judgement.redone).toEqual([]);
    expect(out.judgement.doubts.map((x) => x.id)).toEqual(["usage", "reassurance", "expression"]);
    // L'angle recommandé fait partie des doutes : SINA ne le recommande pas sans le dire.
    expect(anglesDoubtHint(anglesOf(out))).toMatch(/Tu doutes de ces angles[\s\S]*L'angle recommandé en fait partie/);
  });

  it("un juge en panne ne bloque jamais l'étape : les angles restent, et il est dit qu'ils n'ont pas été relus", async () => {
    const p = await project(), r = research();
    J.anglesJudgeDeps.judge = async () => { throw new Error("modèle indisponible"); };
    const out = await J.judgeAngles(p, ctx(), r);
    expect(out.angles).toEqual(r.angles);
    expect(out.judgement).toMatchObject({ status: "non_juges", kept: [], redone: [], doubts: [] });
    expect(out.judgement.overall).toMatch(/Angles non jugés \(modèle indisponible\)/);
    expect(anglesOf(out).judged).toBe("non_juges");
    expect(anglesDoubtHint(anglesOf(out))).toMatch(/n'ont pas pu être relus avant d'être montrés/);
    // Réécriture en panne : mêmes angles, doute gardé.
    J.anglesJudgeDeps.judge = async () => ({ angles: [refuse("usage", "Trop général."), garde("reassurance"), garde("expression"), garde("discovery"), garde("generalist")], overall: "" });
    J.anglesJudgeDeps.fix = async () => { throw new Error("coupure"); };
    const two = await J.judgeAngles(p, ctx(), r);
    expect(two.angles).toEqual(r.angles);
    expect(two.judgement).toMatchObject({ status: "juges", redone: [], doubts: [{ id: "usage", why: "Trop général." }] });
    // Une recherche d'avant le juge reste lisible : ni doute ni mention.
    expect(anglesOf(r).judged).toBeUndefined();
    expect(anglesDoubtHint(anglesOf(r))).toBe("");
  });
});
