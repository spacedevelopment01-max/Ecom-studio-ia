/**
 * Le suivi dans la durée (recherche 08, points 2 et 10), sans aucun appel réel :
 *  - les vrais chiffres (demandes du site, commandes Shopify ou WooCommerce, visites) lus par une seule fonction, chacun
 *    avec sa source ; un chiffre illisible est « non disponible » avec sa raison ;
 *  - « ta journée est prête » montre les demandes et commandes depuis hier, et le premier résultat la première semaine ;
 *  - « le point du mois » honnête : bon ou faible dit par le code, trois lignes avec leur source, un mois faible ne
 *    s'ouvre jamais sur le travail fait ; un nombre absent des chiffres comptés fait refuser le bilan ;
 *  - l'horaire : une tâche par projet abonné au début du mois, une seule, aucune sans forfait.
 */
import { afterEach, describe, expect, it } from "vitest";

describe("suivi : les vrais chiffres et le point du mois honnête", async () => {
  const { createUser } = await import("@/lib/auth");
  const { loadProject } = await import("@/lib/projects");
  const { seedImageFixture } = await import("./image-v2-fixtures");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { run, id, now } = await import("@/lib/db");
  const { ensureSiteTables } = await import("@/lib/sites/store");
  const M = await import("@/lib/suivi/mesures");
  const R = await import("@/lib/syna-agent/rendez-vous");
  const fr = <T,>(fn: () => Promise<T> | T) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());
  afterEach(() => { delete M.mesuresDeps.shopify; delete M.mesuresDeps.woo; delete M.mesuresDeps.fetch; delete R.pointDuMoisDeps.ecrire; });

  async function projet() {
    const u = await createUser(`suivi-${Date.now()}-${Math.random()}@test.fr`, "motdepasse-test", "P");
    return loadProject(seedImageFixture(u.id, "cosmetic"));
  }
  function publier(projectId: string, userId: string, at: number) {
    ensureSiteTables();
    run("INSERT INTO site_publications (id, project_id, user_id, number, theme_version_id, spec_hash, theme_fingerprint, code_commit, status, pages, bytes, manifest_sha, origin, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)", id(), projectId, userId, 1, "t", "h", "f", "c", "ready", 3, 10, "m", "https://site.test", at);
  }
  const demande = (projectId: string, at: number) => run("INSERT INTO site_requests (id, project_id, publication_id, hostname, page, fields, email, ip_hash, created_at, notified, kind) VALUES (?,?,?,?,?,?,?,?,?,?,?)", id(), projectId, "pub", "site.test", "/contact", "{}", "a@b.fr", "x", at, "queued", "contact");

  it("sans site ni boutique : chaque chiffre est « non disponible » avec sa raison, jamais zéro inventé", async () => {
    const p = await projet();
    M.mesuresDeps.shopify = () => undefined; M.mesuresDeps.woo = () => null;
    const m = await fr(() => M.mesuresDuProjet(p, "2026-11-01", "2026-11-30", 0, now()));
    expect(m.map((c) => c.cle)).toEqual(["demandes", "commandes", "montant", "visites"]);
    for (const c of m) { expect(c.valeur).toBeNull(); expect(c.raison).toMatch(/^non disponible : /); }
    expect(m.find((c) => c.cle === "commandes")!.raison).toMatch(/aucune boutique reliée/);
  });

  it("site hébergé et WooCommerce : demandes, commandes et pages vues lues, chacune avec sa source", async () => {
    const p = await projet();
    const t = Date.UTC(2026, 10, 10);
    publier(p.id, p.userId, t); demande(p.id, t + 1000); demande(p.id, t + 2000);
    (await import("@/lib/sites/visites")).compterVue(p.id, "/", t);
    M.mesuresDeps.shopify = () => undefined;
    M.mesuresDeps.woo = () => ({ url: "https://boutique.test", key: "k", secret: "s" });
    M.mesuresDeps.fetch = (async () => new Response(JSON.stringify([{ total: "20.00", currency: "EUR" }]), { status: 200 })) as never;
    const m = await fr(() => M.mesuresDuProjet(p, "2026-11-01", "2026-11-30", Date.UTC(2026, 10, 1), Date.UTC(2026, 11, 1)));
    expect(m.find((c) => c.cle === "demandes")).toMatchObject({ valeur: 2, source: "formulaires de ton site" });
    expect(m.find((c) => c.cle === "commandes")).toMatchObject({ valeur: 1, source: expect.stringMatching(/WooCommerce/) });
    expect(m.find((c) => c.cle === "montant")).toMatchObject({ valeur: 20, libelle: "montant des commandes (EUR)" });
    expect(m.find((c) => c.cle === "visites")).toMatchObject({ valeur: 1, source: expect.stringMatching(/sans suivre personne/) });
  });

  it("Shopify sans le droit de lire les commandes : la raison dit le droit qui manque ; une boutique muette le dit", async () => {
    const p = await projet();
    M.mesuresDeps.shopify = () => ({ id: "c", scopes: "write_themes" } as any);
    const m = await fr(() => M.mesuresDuProjet(p, "2026-11-01", "2026-11-30", 0, now()));
    expect(m.find((c) => c.cle === "commandes")!.raison).toMatch(/read_orders/);
    M.mesuresDeps.shopify = () => undefined;
    M.mesuresDeps.woo = () => ({ url: "https://boutique.test", key: "k", secret: "s" });
    M.mesuresDeps.fetch = (async () => new Response("", { status: 500 })) as never;
    const m2 = await fr(() => M.mesuresDuProjet(p, "2026-11-01", "2026-11-30", 0, now()));
    expect(m2.find((c) => c.cle === "commandes")).toMatchObject({ valeur: null, raison: "non disponible : ta boutique WooCommerce n'a pas répondu" });
  });

  it("ta journée : demandes depuis hier, et le premier résultat la première semaine après la mise en ligne", async () => {
    const p = await projet();
    M.mesuresDeps.shopify = () => undefined; M.mesuresDeps.woo = () => null;
    const at = Date.UTC(2026, 10, 20, 9);
    publier(p.id, p.userId, at - 2 * 86_400_000);
    expect(R.premierResultat(p.id, at)).toMatch(/aucune visite comptée/);
    demande(p.id, at - 3_600_000);
    const j = await fr(() => R.journeePrete(p, at));
    expect(j.chiffres.find((c) => c.cle === "demandes")!.valeur).toBe(1);
    expect(j.message).toMatch(/1 demande reçue depuis hier\./);
    expect(j.premierResultat).toMatch(/^Premier résultat : ton site a reçu 1 demande/);
    // Après sept jours, plus de « premier résultat ».
    expect(R.premierResultat(p.id, at + 8 * 86_400_000)).toBeNull();
  });

  it("le point honnête : bon ou faible dit par le code, trois lignes sourcées, un mois faible commence par la raison", async () => {
    const c = (cle: string, valeur: number | null, source = "s") => ({ cle, libelle: cle, valeur, source });
    const bon = [c("demandes", 4), c("commandes", 2), c("visites", 300), c("prevues", 10), c("publiees", 9)];
    const faible = [c("demandes", 1), c("commandes", 0), c("visites", 120), c("prevues", 10), c("publiees", 3)];
    expect(R.etatDuMois(bon, faible).etat).toBe("bon");
    expect(R.etatDuMois(faible, bon)).toMatchObject({ etat: "faible", raison: "demandes et commandes : 1, contre 6 le mois d'avant" });
    expect(R.etatDuMois([c("prevues", 0), c("publiees", 0)], null).etat).toBe("premier");
    expect(R.troisLignes(bon)).toEqual(["commandes : 2 (s)", "demandes : 4 (s)", "visites : 300 (s)"]);
    expect(R.ordreDuPoint("faible")).toEqual(["lignes", "raison", "bilan", "actions", "travail"]);
    expect(R.ordreDuPoint("bon").slice(0, 2)).toEqual(["lignes", "travail"]);
  });

  it("le point du mois : un mois faible perd son « mieux », un nombre inventé est refusé, le prompt porte les sources", async () => {
    const p = await projet();
    M.mesuresDeps.shopify = () => undefined; M.mesuresDeps.woo = () => null;
    let prompt = "";
    R.pointDuMoisDeps.ecrire = async (pr) => { prompt = pr; return { bilan: "Ce mois-ci, rien n'est encore arrivé sur ton site : on commence par le rendre visible.", mieux: "Tout a très bien marché.", actions: ["Préparer le calendrier du mois", "Valider les trois premières publications", "Choisir l'heure où tu publies"] }; };
    const pt = await fr(() => R.pointDuMois(p, "2026-10"));
    expect(prompt).toMatch(/ÉTAT \(dit par le code\)/);
    expect(prompt).toMatch(/commandes : non disponible : aucune boutique reliée/);
    expect(pt.etat!.etat).toBe("premier");
    expect(pt.lignes).toEqual(["publications cochées « publié » : 0 (ton calendrier dans le Studio)", "publications créées ce mois : 0 (tes publications dans le Studio)", "publications prévues au calendrier : 0 (ton calendrier dans le Studio)"]);
    R.pointDuMoisDeps.ecrire = async () => ({ bilan: "Tu as eu 37 demandes ce mois, un excellent début pour ton atelier.", mieux: "", actions: ["Action une précise", "Action deux précise", "Action trois précise"] });
    await expect(fr(() => R.pointDuMois(p, "2026-09"))).rejects.toThrow(/nombres absents.*37/);
  });

  it("l'horaire : à partir du 1er à 8 h, une tâche par projet abonné pour le mois écoulé ; aucune sans forfait ni avant 8 h", async () => {
    const p = await projet();
    publier(p.id, p.userId, Date.UTC(2026, 9, 1));
    const queued: any[] = [];
    const enqueue = (i: any) => { queued.push(i); };
    R.planifierPointsDuMois(Date.UTC(2026, 11, 1, 5), { enqueue, plan: () => "essentiel" }); // 6 h à Paris
    expect(queued.filter((q) => q.projectId === p.id)).toHaveLength(0);
    R.planifierPointsDuMois(Date.UTC(2026, 11, 1, 9), { enqueue, plan: (pid) => (pid === p.id ? "essentiel" : null) });
    const mine = queued.filter((q) => q.projectId === p.id);
    expect(mine).toEqual([expect.objectContaining({ type: "syna.point-du-mois", payload: { month: "2026-11" }, idempotencyKey: `point-du-mois:${p.id}:2026-11` })]);
    const sans: any[] = [];
    R.planifierPointsDuMois(Date.UTC(2026, 11, 1, 9), { enqueue: (i: any) => sans.push(i), plan: () => null });
    expect(sans).toHaveLength(0);
    const { HANDLER_TYPES } = await import("../worker/handlers");
    expect(HANDLER_TYPES).toContain("syna.point-du-mois");
  });
});
