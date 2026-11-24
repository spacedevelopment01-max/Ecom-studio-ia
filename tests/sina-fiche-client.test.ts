/**
 * LA FICHE DU CLIENT (le socle, 21 novembre 2026) : tout ce qu'il a dit, avec ses mots exacts, la date, le genre (fait,
 * goût, refus) et la portée ; relue en entier par SINA à chaque pas et avant chaque création ; le refus du logo arrive au
 * dessinateur et au relecteur ; le client la lit et la corrige (« Ce que SINA sait de toi »). Aucun appel d'IA.
 */
import fs from "node:fs";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

process.env.STUDIO_SYNA_AGENT = "1";
vi.mock("next/navigation", () => ({ usePathname: () => "/studio/p1/pilote", useRouter: () => ({ push: () => {}, refresh: () => {}, replace: () => {} }) }));

describe("SINA — la fiche du client", async () => {
  const { account, project } = await import("./conversation209-fixtures");
  const { threadFor } = await import("@/lib/syna-agent/thread");
  const { one } = await import("@/lib/db");
  const { remember } = await import("@/lib/projects");
  const { addWordingRule } = await import("@/lib/client-wording");
  const J = await import("@/lib/syna-agent/journey");
  const F = await import("@/lib/syna-agent/fiche");
  const C = await import("@/lib/syna-agent/brand-chain");
  const I = await import("@/lib/syna-agent/brand-images");
  const { clientNotes, clientNotesBrief } = await import("@/lib/syna-agent/custom-theme/site-facts");
  const { dashboardOf } = await import("@/lib/syna-agent/dashboard");
  const { ProjectDashboard } = await import("@/components/studio/project-dashboard");
  const answered = (value: string) => ({ value, status: "answered" as const, source: "client" as const, at: Date.UTC(2026, 10, 20) });

  const setup = async () => {
    const user = await account(), projectId = project(user, "services") as string, cid = threadFor(user, projectId);
    J.updateJourney(cid, (j) => { J.setStep(j, 0, "done"); j.start.business = answered("services"); j.start.offer = answered("Plomberie et salles de bain"); j.start.image = answered("Du vert sapin, sobre."); });
    return { user, projectId, cid };
  };

  it("chaque chose dite garde ses mots, sa date, son genre et sa portée ; la fiche entière se relit en un bloc", async () => {
    const { projectId, cid } = await setup();
    F.addNotes(cid, [
      { sujet: "son histoire", value: "Quinze ans chez un artisan avant de me lancer." },
      { sujet: "le style plombier", value: "le style plombier avec une goutte d'eau et une clé à molette", genre: "refuse", portee: "logo" },
      { sujet: "les matières", value: "le laiton et le cuivre", genre: "aime", portee: "images" },
    ]);
    addWordingRule(projectId, { avoid: "dépanneur", use: "artisan" });
    const txt = F.ficheDuProjet(projectId);
    expect(txt).toMatch(/^# La fiche du client/);
    expect(txt).toContain("- Offre : « Plomberie et salles de bain » (20 novembre 2026)");
    expect(txt).toMatch(/## Ce qu'il nous a dit\n- son histoire : « Quinze ans chez un artisan avant de me lancer\. » \(pour tout, \d+ \S+ \d{4}\)/);
    expect(txt).toMatch(/## Ce qu'il refuse\n- le style plombier : « le style plombier avec une goutte d'eau et une clé à molette » \(pour le logo,/);
    expect(txt).toMatch(/## Ce qu'il aime\n- les matières : « le laiton et le cuivre » \(pour les images,/);
    expect(txt).toContain("## Ses mots (corrigés une fois, valables pour toujours)\n- « artisan », jamais « dépanneur »");
    // Le même sujet remplace l'ancien (il a changé d'avis : la plus récente compte).
    F.addNotes(cid, [{ sujet: "Son histoire", value: "Seize ans, en fait." }]);
    expect(F.ficheOf(cid).notes.filter((n) => /histoire/i.test(n.sujet)).map((n) => n.value)).toEqual(["Seize ans, en fait."]);
  });

  it("le refus pour le logo arrive au relecteur avec ses goûts, jamais au dessinateur du logo (décision du 23 novembre 2026)", async () => {
    const { projectId, cid } = await setup();
    F.addNotes(cid, [
      { sujet: "le style plombier", value: "le style plombier avec une goutte d'eau", genre: "refuse", portee: "logo" },
      { sujet: "les matières", value: "le laiton et le cuivre", genre: "aime", portee: "images" },
      { sujet: "ses publications", value: "pas de mèmes", genre: "refuse", portee: "publications" },
    ]);
    const gouts = C.goutsDuClient(J.journeyOf(cid), projectId)!;
    expect(gouts.split("\n")).toEqual(["Du vert sapin, sobre.", "Il ne veut pas : le style plombier avec une goutte d'eau", "Il aime : le laiton et le cuivre"]);
    // Le dessinateur du logo ne reçoit plus la phrase de refus (décision du 23 novembre 2026) : le métier et le nom.
    expect((I as Record<string, unknown>).clientRefusal).toBeUndefined();
    // Un refus pour les publications ne vaut pas pour les images de la marque.
    expect(gouts).not.toContain("mèmes");
    expect(F.refusPour(F.ficheOf(cid).notes, "publications")).toEqual(["pas de mèmes"]);
    expect(F.refusPour(F.ficheOf(cid).notes, "logo")).toEqual(["le style plombier avec une goutte d'eau"]);
    // La chaîne de la marque reçoit la fiche entière, et chaque planche reçoit ses goûts.
    const chain = fs.readFileSync("src/lib/syna-agent/brand-chain.ts", "utf8");
    expect(chain).toContain("const briefBlock = (j: Journey, projectId: string, guidance?: string) => [ficheTexte({ j, notes: notesDuProjet(projectId), projectId })");
    expect(chain).toContain("clientLogo, gouts: goutsDuClient(j, p.id) });");
    expect(chain).not.toContain("refusLogo");
  });

  it("SINA relit la fiche entière à chaque pas après les questions de départ ; ses choix y figurent", async () => {
    const { projectId, cid } = await setup();
    F.addNotes(cid, [{ sujet: "le style plombier", value: "surtout pas de goutte", genre: "refuse", portee: "logo" }]);
    J.updateJourney(cid, (j) => { j.identities = { list: [{ key: "A", name: "Aplomb" } as never], issues: [], comparison: "", at: 1, round: 1 }; j.identityChoice = { key: "A", mix: {}, at: Date.UTC(2026, 10, 21) }; J.setStep(j, 1, "done"); });
    const ctx = J.journeyContext(J.journeyOf(cid), { fiche: F.ficheDuFil(cid, projectId) });
    expect(ctx).toContain("# La fiche du client");
    expect(ctx).toContain("- le style plombier : « surtout pas de goutte » (pour le logo,");
    expect(ctx).toContain("- Identité choisie : A « Aplomb », le 21 novembre 2026.");
    const loop = fs.readFileSync("src/lib/syna-agent/loop.ts", "utf8");
    expect(loop).toContain("fiche: ficheDuFil(r.conversation_id, r.project_id)");
  });

  it("une seule façon de noter : la fiche (l'ancienne mémoire n'a plus d'outil ; ses notes restent lues)", async () => {
    const { projectId, cid } = await setup();
    const { allTools } = await import("@/lib/syna-agent/registry");
    expect(allTools().some((t) => t.name === "memory.note")).toBe(false);
    remember(projectId, { kind: "fact", key: "syna.paiement", value: "Par virement.", status: "confirmed", source: "user", origin: "user" as never });
    F.addNotes(cid, [{ sujet: "délais", value: "rappel sous 24 h", portee: "site" }, { sujet: "les vignettes", value: "pas de photo ronde", genre: "refuse", portee: "site" }]);
    expect(F.notesDuProjet(projectId).map((n) => n.sujet).sort()).toEqual(["délais", "les vignettes", "paiement"]);
    // Le dossier du site lit la fiche.
    expect(clientNotes(projectId).map((n) => n.title)).toEqual(expect.arrayContaining(["délais", "les vignettes (il refuse, pour site)", "paiement"]));
    expect(clientNotesBrief(projectId)).toContain("- délais : rappel sous 24 h");
  });

  it("le client corrige ou efface une ligne de sa fiche ; sa correction est datée et marquée", async () => {
    const { projectId, cid } = await setup();
    remember(projectId, { kind: "fact", key: "syna.paiement", value: "Par chèque.", status: "confirmed", source: "user", origin: "user" as never });
    F.addNotes(cid, [{ sujet: "son histoire", value: "Quinze ans." }, { sujet: "le style plombier", value: "pas de goutte", genre: "refuse", portee: "logo" }]);
    F.corrigerFiche(projectId, { type: "note", sujet: "son histoire", value: "Vingt ans chez un artisan." });
    const n = F.ficheOf(cid).notes.find((x) => x.sujet === "son histoire")!;
    expect(n).toMatchObject({ value: "Vingt ans chez un artisan.", genre: "fait", portee: "tout" });
    expect(n.corrigeLe).toBeGreaterThan(0);
    expect(F.ficheDuProjet(projectId)).toMatch(/« Vingt ans chez un artisan\. » \(pour tout, .*corrigé par lui\)/);
    // Une ligne effacée ne revient pas, ni depuis la fiche ni depuis l'ancienne mémoire.
    F.corrigerFiche(projectId, { type: "note", sujet: "le style plombier", value: null });
    F.corrigerFiche(projectId, { type: "note", sujet: "paiement", value: null });
    expect(F.notesDuProjet(projectId).map((x) => x.sujet)).toEqual(["son histoire"]);
    expect(one<{ status: string }>("SELECT status FROM memory WHERE project_id=? AND key='syna.paiement'", projectId)!.status).toBe("rejected");
    // Une réponse de départ se corrige aussi ; l'activité (produits ou services) se demande à SINA.
    F.corrigerFiche(projectId, { type: "reponse", champ: "offer", value: "Plomberie, chauffage et salles de bain" });
    expect(J.journeyOf(cid).start.offer).toMatchObject({ value: "Plomberie, chauffage et salles de bain", source: "client" });
    expect(() => F.corrigerFiche(projectId, { type: "reponse", champ: "business", value: "products" })).toThrow();
    // La page « Ce que SINA sait de toi » se corrige par la route du projet.
    const route = fs.readFileSync("src/app/api/projects/[id]/fiche/route.ts", "utf8");
    expect(route).toContain("export const PATCH");
    expect(route).toContain("corrigerFiche(p.id, b)");
  });

  it("le tableau de bord montre « Ce que SINA sait de toi » : ses refus avec leur portée, ses choix, et de quoi corriger", async () => {
    const { projectId, cid } = await setup();
    F.addNotes(cid, [{ sujet: "le style plombier", value: "pas de goutte d'eau", genre: "refuse", portee: "logo" }, { sujet: "son histoire", value: "Quinze ans." }]);
    J.updateJourney(cid, (j) => { j.angles = { list: [{ id: "a1", title: "Le dimanche sans fuite" } as never], recommendedId: "a1", recommendation: "", sourceCount: 0, at: 1 } as never; j.angleChoice = { id: "a1", at: Date.UTC(2026, 10, 21) }; });
    const d = dashboardOf(projectId)!;
    expect(d.savoir?.notes.map((x) => [x.sujet, x.genre, x.porteeLabel])).toEqual([["le style plombier", "refuse", "pour le logo"], ["son histoire", "fait", "pour tout"]]);
    const html = renderToStaticMarkup(h(ProjectDashboard, { data: d }));
    expect(html).toContain("Ce que SINA sait de toi");
    expect(html).toContain("Ce que tu refuses");
    expect(html).toContain("pas de goutte d&#x27;eau");
    expect(html).toContain("pour le logo");
    expect(html).toContain("Angle choisi : « Le dimanche sans fuite », le 21 novembre 2026.");
    expect(html).toContain("SINA n&#x27;y touche que si tu le lui demandes");
    expect(html).toContain(">Corriger<");
    expect(html).toContain(">Effacer<");
  });
});
