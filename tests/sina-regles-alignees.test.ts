/**
 * Les règles alignées sur les décisions écrites du propriétaire (relevé du 21 novembre 2026,
 * docs/studio/REGLES-EN-DOUBLE-2026-11-21.md, points 2, 3, 4, 6, 7, 8, 11 et 13). Aucun appel d'IA.
 */
import fs from "node:fs";
import { describe, expect, it } from "vitest";

process.env.STUDIO_SYNA_AGENT = "1";

describe("règles alignées sur les décisions du propriétaire", async () => {
  const { REGLE_PERSONNES } = await import("@/lib/people-policy");
  const { SYNA_SYSTEM } = await import("@/lib/syna-agent/prompt");
  const P = await import("@/lib/syna-agent/brand-prompts");
  const I = await import("@/lib/syna-agent/brand-images");
  const B = await import("@/lib/syna-agent/custom-theme/brand");
  const PR = await import("@/lib/syna-agent/custom-theme/preuves");
  const { route } = await import("./sina-routes-fixtures");
  const lire = (f: string) => fs.readFileSync(f, "utf8");
  const imagery = { look: "calme", logo: "La marque.", signs: "Les signes.", hero: "La scène.", object: "L'objet.", site: "Le haut du site.", posts: ["Un.", "Deux.", "Trois."] } as never;

  it("2. les personnes : une seule phrase, la sienne, reprise partout ; sans photo ni accord écrit, aucune personne", () => {
    expect(REGLE_PERSONNES).toBe("Jamais de personne dans une image sans photo fournie par le client ou son accord écrit.");
    expect(SYNA_SYSTEM).toContain(REGLE_PERSONNES);
    expect(SYNA_SYSTEM).not.toMatch(/personne reconnaissable/);
    // La planche : sans accord, aucune personne (consigne, relecteur, image) ; avec, la règle le permet.
    expect(P.imagerySystem("services")).toMatch(/Aucune personne, aucun visage, aucune main, dans aucune image\./);
    // (« Aucune personne réelle ou reconnaissable, aucune marque existante recopiée » est une autre règle : ne jamais copier
    // une vraie personne ni une marque ; elle reste.)
    expect(P.imagerySystem("services", true)).not.toMatch(/Aucune personne, |sans personne/);
    expect(P.imageReviewSystem()).toMatch(/- une personne, un visage ou une main apparaît ;/);
    expect(P.imageReviewSystem(true)).not.toMatch(/une personne, un visage ou une main apparaît/);
    expect(I.imagePrompt("hero", route("A") as never, imagery, { logo: false })).toMatch(/Aucune personne, aucun visage, aucune main\. Aucun objet supplémentaire/);
    expect(I.imagePrompt("hero", route("A") as never, imagery, { logo: false, personnes: true })).not.toMatch(/Aucune personne/);
    expect(lire("src/lib/syna-agent/brand-images.ts")).toContain("const personnes = peopleAllowed(o.who.projectId);");
    // Les consignes plus larges que sa règle (personne « non reconnaissable », mains, silhouette de dos) ont disparu.
    for (const f of ["docs/sina-savoir/publications-direction-artistique.md", "docs/sina-savoir/publications-regles-des-reseaux-et-du-droit.md", "src/lib/syna-agent/custom-theme/tenue-services.ts", "src/lib/syna-agent/custom-theme/familles.ts"]) {
      expect(lire(f), f).not.toMatch(/personne reconnaissable|une silhouette de dos, les traces/);
    }
    expect(lire("docs/sina-savoir/theme-images.md")).toContain("une main ou une personne seulement avec une photo fournie par le client ou son accord écrit");
  });

  it("2. la galerie : un « oui » noté par SINA ne suffit plus, il faut l'accord écrit du client, ses mots", async () => {
    const { ditParLeClient } = await import("@/lib/syna-agent/verrous");
    const { account } = await import("./conversation209-fixtures");
    const { threadFor } = await import("@/lib/syna-agent/thread");
    const { addMessage } = await import("@/lib/syna-agent/store");
    const cid = threadFor(await account(), null);
    addMessage(cid, "user", { text: "Oui, tu peux mettre une personne qui porte le sac." }, null);
    expect(ditParLeClient(cid, "tu peux mettre une personne")).toBe(true);
    expect(ditParLeClient(cid, "j'accepte les personnes")).toBe(false);
    const src = lire("src/lib/syna-agent/tools/gallery.ts");
    expect(src).toContain("if (a.people && !peopleAllowed(p.id) && !(a.accordEcrit && ditParLeClient(ctx.conversationId, a.accordEcrit))) return { ok: false, internal: true, summary: `${REGLE_PERSONNES}");
    const { getTool } = await import("@/lib/syna-agent/registry");
    expect(getTool("gallery.create")!.description).toMatch(/demande son accord ÉCRIT : accordEcrit = ses mots exacts/);
  });

  it("3. les réalisations d'un artisan : SINA les crée quand il n'en a pas assez ; leur moment n'est jamais sauté faute de preuve", () => {
    const brief = PR.preuvesBrief({ a: [], manque: [{ id: "realisations", label: "des réalisations réelles (photos, lieu, date)" }, { id: "avis", label: "des avis réels de clients" }], faits: [], faitsAbsents: [], ids: new Set() } as never);
    expect(brief).toMatch(/PREUVES ABSENTES DU DOSSIER : des avis réels de clients\./);
    expect(brief).toContain(`RÉALISATIONS (artisan ou service) : il n'en a pas assez au dossier ; SINA les crée pour son site. ${REGLE_PERSONNES}`);
    expect(lire("src/lib/syna-agent/custom-theme/partitions.ts")).toContain("réalisations (les siennes ; pour un artisan qui n'en a pas assez, celles que SINA crée)");
    expect(lire("docs/sina-savoir/theme-ordre-et-variete.md")).toContain("réalisations (les siennes ; pour un artisan qui n'en a\n   pas assez, celles que SINA crée)");
  });

  it("4. la planche, sans photo du client : l'objet de la marque, jamais son produit dessiné", () => {
    const t = P.imagerySystem("produits");
    expect(t).not.toMatch(/le vrai produit du client/);
    expect(t.match(/jamais le produit lui-même dessiné/g)?.length).toBeGreaterThanOrEqual(4);
    expect(t).toMatch(/- object : l'objet de la planche, l'objet de la marque \(le sac, la carte, l'emballage…\)/);
    expect(lire("docs/sina-savoir/maquettes-accueil-mobile.md")).toMatch(/jamais le produit lui-même dessiné sans sa photo/);
  });

  it("6 et 7. les cahiers : plus d'accueil qui contredit les règles d'or, plus de cadre arrondi ni de produit dans un rond", () => {
    expect(lire("docs/sina-savoir/theme-construction-des-pages.md")).not.toMatch(/Accueil d'une petite marque \(proposition/);
    const m = lire("docs/sina-savoir/maquettes-accueil-mobile.md");
    expect(m).not.toMatch(/aux angles arrondis/);
    expect(m).not.toMatch(/dans un rond/);
  });

  it("8. le rédacteur du site : clair d'abord, puis l'émotion, jamais avant le sens", () => {
    expect(B.COPY_CRAFT).toMatch(/^- CLAIR D'ABORD ; PUIS L'ÉMOTION, JAMAIS AVANT LE SENS \(règle du propriétaire\) : chaque texte se comprend à la première lecture/m);
    expect(B.COPY_CRAFT).not.toMatch(/L'ÉMOTION D'ABORD/);
  });

  it("1. les questions : la règle du 19 novembre partout hors « faire connaissance » (faits simples ensemble, choix et accord seuls)", async () => {
    const J = await import("@/lib/syna-agent/journey");
    const C = await import("@/lib/syna-agent/conversation");
    expect(SYNA_SYSTEM).toMatch(/pose-les ENSEMBLE dans une seule « question », numérotées et courtes, six au plus/);
    expect(SYNA_SYSTEM).toMatch(/Pendant « faire connaissance », c'est une question à la fois/);
    const j = J.emptyJourney(); for (const n of [0, 1, 2, 3, 4]) J.setStep(j, n, "done");
    const etape5 = J.journeyContext(j);
    expect(etape5).toMatch(/les faits simples ENSEMBLE, numérotés et courts, six au plus \(règle du propriétaire du 19 novembre 2026\), une question de choix ou d'accord SEULE/);
    expect(etape5).not.toMatch(/UNE par UNE/);
    expect(lire("src/lib/syna-agent/tools/activity.ts")).toContain("Questions à poser au client (les faits simples ensemble, numérotés, six au plus ; un choix ou un accord seul)");
    // La galerie : l'accord pour montrer une personne est posé seul, à part.
    expect(lire("src/lib/syna-agent/tools/gallery.ts")).toMatch(/Ensuite, dans un message à part, SEULE \(c'est un accord\) : veut-il une personne/);
    // La relectrice des messages accepte des questions simples groupées et refuse deux questions de choix ou d'accord.
    const rel = lire("src/lib/syna-agent/conversation.ts");
    expect(rel).toContain("Une seule question de réflexion, de choix ou d'accord au plus par message (jamais deux) ; plusieurs questions SIMPLES et indépendantes");
    expect(rel).not.toContain("Une seule question au plus, jamais");
    void C;
  });

  it("11. la galerie dit son prix à SINA en part du budget d'IA, jamais en euros", () => {
    const src = lire("src/lib/syna-agent/tools/gallery.ts");
    // En tutoyant, une seule fois (22 novembre 2026 : « ≈ 3 % de votre budget IA de ton budget d'IA du mois »).
    expect(src).toContain("au plus ${budgetPctTu(ctx.user.id, est.maxMicro, p.id)} du mois");
    expect(src).not.toMatch(/prixParProduit:[^\n]*€/);
  });
});
