/**
 * SINA PREND LES DEVANTS (23 novembre 2026, demande du propriétaire : « qu'elle prenne les devants ») : des planches
 * incomplètes (lues sur leur contenu) font griser les anciens boutons qui les choisissent, et, à l'ouverture du projet, le
 * Studio pose lui-même un message de SINA qui propose de les finir à sa charge, sans aucun appel à l'IA. Tout est simulé :
 * aucun appel, aucune clé.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { route } from "./sina-routes-fixtures";

process.env.STUDIO_SYNA_AGENT = "1";

describe("les boutons des anciens messages : une planche incomplète ne se choisit pas", async () => {
  const { plancheDuBouton, PHRASE_PLANCHE_INCOMPLETE } = await import("@/lib/syna-agent/choix-planche");
  const { ChoixDeLaQuestion } = await import("@/components/studio/syna-thread");
  const planches = [{ key: "A", name: "Sillage" }, { key: "B", name: "Halo" }];

  it("reconnaît les boutons qui choisissent une planche, et seulement eux", () => {
    expect(plancheDuBouton("Je prends Sillage", planches)).toBe("A");
    expect(plancheDuBouton("Je choisis l'identité B", planches)).toBe("B");
    expect(plancheDuBouton("Halo", planches)).toBe("B");
    expect(plancheDuBouton("I'll take Halo", planches)).toBe("B");
    expect(plancheDuBouton("Je prends Pénombre", planches)).toBeNull();
    expect(plancheDuBouton("Pourquoi Sillage ?", planches)).toBeNull();
    expect(plancheDuBouton("Je prends Sillages", planches)).toBeNull();
  });

  it("un ancien message à trois boutons, dont deux planches à trou : deux boutons grisés avec la phrase, un bouton actif", () => {
    const html = renderToStaticMarkup(createElement(ChoixDeLaQuestion, { choices: ["Je prends Sillage", "Je prends Halo", "Je prends Pénombre"], incompletes: planches, disabled: false, onSend: () => undefined }));
    expect(html.match(/data-syna-choix-incomplet="/g)).toHaveLength(2);
    expect(html.match(/<button[^>]*disabled=""[^>]*>/g)).toHaveLength(2);
    expect(html.split(PHRASE_PLANCHE_INCOMPLETE.fr.replace(/'/g, "&#x27;")).length - 1).toBe(2);
    expect(html).toMatch(/<button[^>]*data-syna-choix="true"[^>]*>Je prends Pénombre<\/button>/);
    expect(html).not.toMatch(/<button[^>]*disabled=""[^>]*data-syna-choix="true"/);
    // Jamais un bouton coupé : le texte revient à la ligne, le bouton grandit.
    for (const b of html.match(/<button[^>]*>/g)!) expect(b).toMatch(/!h-auto .*!whitespace-normal/);
    // La planche finie : le bouton redevient actif tout seul.
    const apres = renderToStaticMarkup(createElement(ChoixDeLaQuestion, { choices: ["Je prends Sillage", "Je prends Halo", "Je prends Pénombre"], incompletes: [], disabled: false, onSend: () => undefined }));
    expect(apres).not.toMatch(/disabled=""/);
    expect(apres).not.toContain("pas encore complète");
  });

  it("la phrase dessous, en français et en anglais, au tutoiement", () => {
    expect(PHRASE_PLANCHE_INCOMPLETE.fr).toBe("Cette planche n'est pas encore complète : je la finis à ma charge, puis tu pourras la choisir.");
    expect(PHRASE_PLANCHE_INCOMPLETE.en).toBe("This board isn't complete yet: I'll finish it at my expense, then you can choose it.");
  });
});

describe("SINA propose de finir les planches, sans dépense pour le client", async () => {
  const J = await import("@/lib/syna-agent/journey");
  const D = await import("@/lib/syna-agent/devants");
  const { accepterLaProposition, refuserLaProposition } = await import("@/lib/syna-agent/devants-actions");
  const { account, project, emptySpend } = await import("./conversation209-fixtures");
  const { openThread } = await import("@/lib/syna-agent/thread");
  const { decidePending, runAgent, submitMessage } = await import("@/lib/syna-agent/loop");
  const { getRun } = await import("@/lib/syna-agent/store");
  const { SINA_BRAND_JOB } = await import("@/lib/syna-agent/brand-chain");
  const { enqueue } = await import("@/lib/jobs");
  const { all, json, one, run } = await import("@/lib/db");
  const { runWithLang } = await import("@/lib/i18n-server");
  const fr = <T,>(fn: () => Promise<T> | T) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());
  await (await import("./tarif-logo-fixture")).tarifDuModeleDesLogos();

  const NOMS = { A: "Sillage", B: "Halo", C: "Pénombre" } as const;
  /** Trois planches d'avant la correction : grande scène et haut du site, sans logo. */
  async function anciennes() {
    const user = await account();
    const pid = project(user) as string;
    const v0 = await fr(() => openThread(user, pid));
    const cid = v0.conversationId;
    J.updateJourney(cid, (x) => {
      x.steps[0] = { status: "done" };
      x.identities = { list: (["A", "B", "C"] as const).map((k) => { const r = route(k) as any; return { ...r, name: NOMS[k], board: { ...r.board, images: { hero: { id: `hero-${k}` }, site: { id: `site-${k}` } } } }; }), issues: [], comparison: "", at: 1, round: 1 } as any;
    });
    return { user, pid, cid };
  }
  const proposes = (cid: string) => all<{ content_json: string }>("SELECT content_json FROM syna_messages WHERE conversation_id=? AND role='assistant'", cid).map((m) => json<any>(m.content_json, {})).filter((c) => c.devants);

  it("la phrase est construite sur ce qui manque vraiment, avec les vrais noms, en français juste et en anglais", () => {
    const trois = (["A", "B", "C"] as const).map((k) => ({ key: k, name: NOMS[k], manque: ["logo"] }));
    expect(D.phraseDuManque(trois)).toEqual({
      fr: "Il manque le logo de Sillage, de Halo et de Pénombre. Je les finis à ma charge, ça ne te coûte rien. On y va ?",
      en: "Still missing: the logo for Sillage, Halo and Pénombre. I'll finish them at my expense, it costs you nothing. Shall we go ahead?",
    });
    expect(D.phraseDuManque([{ key: "A", name: "Aurore", manque: ["hero"] }]).fr).toBe("Il manque la grande scène d'Aurore. Je la finis à ma charge, ça ne te coûte rien. On y va ?");
    expect(D.phraseDuManque([{ key: "A", name: "Sillage", manque: ["logo"] }, { key: "B", name: "Halo", manque: ["logo"] }, { key: "C", name: "Pénombre", manque: ["hero", "site"] }]).fr)
      .toBe("Il manque le logo de Sillage et de Halo, la grande scène de Pénombre, et le haut du site de Pénombre. Je les finis à ma charge, ça ne te coûte rien. On y va ?");
    expect(D.boutonsDuMessage("les").oui).toEqual({ fr: "Oui, finis-les", en: "Yes, finish them" });
  });

  it("à l'ouverture : un seul message posé, sans aucun appel à l'IA ; pas de second tant que rien ne change ; un nouveau si ce qui manque change", async () => {
    const t = await anciennes();
    const avant = emptySpend();
    const v = await fr(() => openThread(t.user, t.pid));
    // Aucun appel à l'IA, aucune tâche, aucune dépense.
    expect(emptySpend()).toEqual(avant);
    const m = proposes(t.cid);
    expect(m).toHaveLength(1);
    expect(m[0].message).toBe("Il manque le logo de Sillage, de Halo et de Pénombre. Je les finis à ma charge, ça ne te coûte rien. On y va ?");
    expect(v.devants).toMatchObject({ ouverte: true, empreinte: m[0].devants.empreinte });
    expect(v.journey!.identities!.incompletes!.map((x: any) => x.name)).toEqual(["Sillage", "Halo", "Pénombre"]);
    // Rouvert : rien de plus.
    await fr(() => openThread(t.user, t.pid));
    await fr(() => openThread(t.user, t.pid));
    expect(proposes(t.cid)).toHaveLength(1);
    // Ce qui manque change (le logo de Sillage est fini) : un nouveau message, sur ce qui manque encore.
    J.updateJourney(t.cid, (x) => { (x.identities!.list[0] as any).board.images.logo = { id: "logo-A" }; });
    await fr(() => openThread(t.user, t.pid));
    const n = proposes(t.cid);
    expect(n).toHaveLength(2);
    expect(n[1].message).toBe("Il manque le logo de Halo et de Pénombre. Je les finis à ma charge, ça ne te coûte rien. On y va ?");
    expect(emptySpend().calls).toBe(avant.calls);
  });

  it("rien n'est posé pendant une reprise des images", async () => {
    const t = await anciennes();
    enqueue({ userId: t.user.id, projectId: t.pid, type: SINA_BRAND_JOB, label: "Images refaites (essai)", payload: { projectId: t.pid, conversationId: t.cid, imagesOnly: true } });
    const v = await fr(() => openThread(t.user, t.pid));
    expect(proposes(t.cid)).toHaveLength(0);
    expect(v.devants).toMatchObject({ ouverte: false });
    expect(D.ligneDesPlanchesAFinir(t.cid, t.pid)).toBe("");
  });

  it("« Oui, finis-les » ouvre la carte à 0 % et, accordée, lance la reprise à la charge du Studio, sans aucun appel à l'IA", async () => {
    const t = await anciennes();
    await fr(() => openThread(t.user, t.pid));
    const empreinte = proposes(t.cid)[0].devants.empreinte;
    const avant = emptySpend();
    const v = await fr(() => accepterLaProposition(t.user, t.cid, empreinte));
    expect(v.run!.status).toBe("waiting_confirmation");
    // Le logo qui manque se fait par la méthode des graphistes, une planche à la fois (Sillage d'abord).
    expect(v.run!.pending).toMatchObject({ tool: "logo.pistes", reason: "cost", args: { planche: "A" } });
    expect(v.run!.pending!.preview).toMatch(/À ma charge : 0 % de ton budget/);
    expect(v.run!.pending!.preview).not.toMatch(/€/);
    // Les boutons du message disparaissent : il a dit oui ; la ligne prioritaire aussi.
    expect(v.devants).toMatchObject({ ouverte: false });
    expect(D.ligneDesPlanchesAFinir(t.cid, t.pid)).toBe("");
    expect(emptySpend().calls).toBe(avant.calls);
    // Il confirme sur la carte : la reprise part par le même chemin que si SINA l'avait proposée.
    const r = decidePending(t.user, t.cid, { pendingId: v.run!.pending!.id, approve: true });
    let raisonne = 0;
    await fr(() => runAgent(r.id, getRun(r.id)!.job_id!, { reason: async () => { raisonne++; return { message: "", actions: [], question: null, done: true }; } }));
    expect(raisonne).toBe(0); // SINA attend la fin de la reprise
    const { LOGO_GRAPHISTES_JOB } = await import("@/lib/syna-agent/logo-graphistes-tache");
    const job = one<{ payload: string }>("SELECT payload FROM jobs WHERE project_id=? AND type=? ORDER BY created_at DESC LIMIT 1", t.pid, LOGO_GRAPHISTES_JOB)!;
    expect(json<any>(job.payload, {})).toMatchObject({ studio: true, phase: "recherche", nom: "Sillage", planche: "A" });
    void SINA_BRAND_JOB;
    expect(emptySpend().calls).toBe(avant.calls);
    // Rien de nouveau posé pendant la reprise.
    await fr(() => openThread(t.user, t.pid));
    expect(proposes(t.cid)).toHaveLength(1);
  });

  it("la ligne prioritaire est en tête du contexte de SINA au message suivant, et absente après « Plus tard »", async () => {
    const t = await anciennes();
    await fr(() => openThread(t.user, t.pid));
    const contexte = async (texte: string) => {
      const r = submitMessage(t.user, t.cid, { requestId: `req-${Math.random()}`, text: texte });
      let ctx = "";
      await fr(() => runAgent(r.id, r.job_id!, { reason: async (call) => { ctx = call.context ?? ""; return { message: "D'accord.", actions: [], question: null, done: true }; } }));
      return ctx;
    };
    const avec = await contexte("Bonjour, on en est où ?");
    expect(avec.startsWith("# À DIRE EN PREMIER, avant tout le reste\nIl manque le logo de Sillage, de Halo et de Pénombre")).toBe(true);
    expect(avec).toMatch(/logo\.pistes avec planche = A \(puis B, C, chaque fois qu'un logo est posé\)[\s\S]*logo\.autre/);
    expect(avec).toMatch(/À ma charge : 0 % de ton budget/);
    // « Plus tard » : c'est un non, la ligne ne revient pas (et les boutons disparaissent).
    const v = await fr(() => refuserLaProposition(t.user, t.cid, proposes(t.cid)[0].devants.empreinte));
    expect(v.devants).toMatchObject({ ouverte: false });
    const sans = await contexte("Et pour la suite ?");
    expect(sans).not.toMatch(/À DIRE EN PREMIER/);
  });

  it("la carte de la reprise refusée vaut un non : plus de ligne prioritaire", async () => {
    const t = await anciennes();
    await fr(() => openThread(t.user, t.pid));
    const v = await fr(() => accepterLaProposition(t.user, t.cid, proposes(t.cid)[0].devants.empreinte));
    decidePending(t.user, t.cid, { pendingId: v.run!.pending!.id, approve: false });
    run("UPDATE syna_runs SET status='done' WHERE conversation_id=?", t.cid);
    expect(D.ligneDesPlanchesAFinir(t.cid, t.pid)).toBe("");
  });

  it("une empreinte dépassée est refusée (le fil a changé) ; rien n'est lancé", async () => {
    const t = await anciennes();
    await expect(fr(() => accepterLaProposition(t.user, t.cid, "A:hero"))).rejects.toThrow(/ont changé/);
  });
});
