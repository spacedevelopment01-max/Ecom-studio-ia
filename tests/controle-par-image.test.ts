/**
 * Le contrôle par l'image (point 5 validé par le propriétaire le 17 novembre 2026 : « Fait les 5 ») : avant que le client
 * voie son site, l'accueil est capturé (téléphone et ordinateur), réduit en une empreinte sans IA et comparé aux derniers
 * sites du Studio ; trop proche, il est corrigé sans IA ; si rien ne suffit, il n'est pas présenté comme fini.
 *
 *  1. Le seuil, sur les empreintes des sites de l'essai (rendus gratuits, sans IA, le 17 novembre 2026 ; fichier
 *     tests/fixtures/ressemblance) : un même site contre lui-même fait 100 ; Bécane contre Atelier Vasco, les tenues de
 *     Vasco et Vasco sous une autre marque sont trop proches ; des accueils d'une autre disposition et d'autres fonds
 *     passent.
 *  2. La correction sans IA (captures simulées, déterministes) : un site jumeau d'un site déjà monté est rendu
 *     différent en changeant des dispositions, sans casser les contrôles ; quand rien ne suffit, c'est « trop-proche » ;
 *     sans navigateur, « non-fait », dit, jamais en silence.
 *  3. Dans la création du site : un site trop proche ne devient pas la version active et le compte rendu le dit en tête.
 *  4. Avec un navigateur (CHROMIUM) : un vrai accueil capturé deux fois fait 100, et un site monté à l'identique d'un
 *     autre est corrigé pour de vrai.
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { afterEach, describe, expect, it } from "vitest";

process.env.STUDIO_SYNA_AGENT = "1";

const R = await import("@/lib/syna-agent/custom-theme/ressemblance");
type E = import("@/lib/syna-agent/custom-theme/ressemblance").Empreinte;

describe("contrôle par l'image : le seuil, calibré sur les sites de l'essai", () => {
  const F = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(process.cwd(), "tests/fixtures/ressemblance/empreintes-essai.json.gz"))).toString("utf8")) as Record<string, E>;
  const note = (a: string, b: string) => R.ressemblance(F[a], F[b]).note;

  it("un même site contre lui-même fait 100", () => {
    for (const n of Object.keys(F)) expect(note(n, n)).toBe(100);
  });
  it("Bécane et Atelier Vasco se ressemblent trop (jugement du propriétaire) ; les tenues de Vasco et Vasco sous une autre marque sont « le même site »", () => {
    expect(note("vasco", "becane")).toBeGreaterThanOrEqual(R.SEUIL);
    for (const v of ["v-maison", "v-spectaculaire", "braise-vasco", "trempe-vasco"]) expect(note("vasco", v), v).toBeGreaterThanOrEqual(R.SEUIL);
    expect(note("v-maison", "v-spectaculaire")).toBeGreaterThanOrEqual(R.SEUIL);
    expect(note("braise-vasco", "trempe-vasco")).toBeGreaterThanOrEqual(R.SEUIL);
    expect(R.tropProche(note("vasco", "becane"))).toBe(true);
  });
  it("un accueil d'une autre disposition, avec d'autres fonds, passe", () => {
    for (const v of ["vasco", "becane", "v-maison", "v-spectaculaire", "braise-vasco", "trempe-vasco", "trempe-autre"]) expect(note("braise-autre", v), v).toBeLessThan(R.SEUIL);
    for (const v of ["v-maison", "braise-vasco"]) expect(note("trempe-autre", v), v).toBeLessThan(R.SEUIL);
  });
  it("les sections jumelles à l'œil sont celles que le propriétaire a vues (les questions, la phrase sur une photo pleine)", () => {
    const d = R.ressemblanceVue(F.vasco.telephone!, F.becane.telephone!);
    expect(d.paires.length).toBe(2);
    expect(d.lettres).toBeGreaterThanOrEqual(85);
  });
});

// ─────────────────────────────────────────────────────────────── captures simulées, déterministes

describe("contrôle par l'image : la correction sans IA", async () => {
  const sharp = (await import("sharp")).default;
  const { run, now, one } = await import("@/lib/db");
  const { account } = await import("./conversation209-fixtures");
  const S = await import("@/lib/syna-agent/custom-theme/theme");
  const C = await import("@/lib/syna-agent/custom-theme/controle-image");
  const { validConstruction } = await import("@/lib/syna-agent/custom-theme/tenue");
  afterEach(() => { delete C.controleDeps.capture; delete process.env.ES_NO_CHROMIUM; });
  /** Un Studio sans autre site monté : chaque essai part de zéro. */
  const studioVide = () => run("UPDATE memory SET state='superseded' WHERE kind='artifact' AND key IN (?,?)", S.THEME_KEY, C.EMPREINTE_KEY);

  const hash = (s: string) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; return h; };
  /**
   * Une capture simulée. La MARQUE (le projet) donne le fond clair, la couleur sombre et l'épaisseur des lettres ; la
   * PIÈCE et sa DISPOSITION donnent la place des masses dans sa section : lignes de texte, photo, aplat sombre, vide.
   * `fige` : toutes les sections pareilles, quoi qu'on change (aucune retouche ne peut rien).
   */
  const MARQUES = [{ fond: [250, 246, 236], sombre: [30, 26, 40], trait: 2 }, { fond: [240, 246, 250], sombre: [52, 20, 28], trait: 5 }];
  async function simule(pid: string, t: import("@/lib/syna-agent/custom-theme/theme").CustomTheme, fige = false): Promise<E> {
    const home = t.pages.find((p) => p.key === "home")!.sections;
    const m = MARQUES[pid === premier ? 0 : 1];
    const out: E = { v: 1, at: 0, telephone: null, ordinateur: null };
    for (const vue of ["telephone", "ordinateur"] as const) {
      const W = R.VUES[vue].width, H = 400, cols = R.VUES[vue].cols;
      const img = Buffer.alloc(W * H * home.length * 3), masses = Buffer.alloc(img.length);
      home.forEach((s, i) => {
        const h = hash(fige ? "même" : `${s.id}:${validConstruction(s.id, s.construction) ?? ""}`);
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const c = Math.floor((x / W) * cols), r = Math.floor((y / H) * 4), sorte = (h >>> ((c * 4 + r) % 29)) & 3;
          const ligne = y % 14 < m.trait && x % (W / cols) > 8;
          const px = sorte === 1 ? [90 + (x % 40), 120, 70 + (y % 50)] : sorte === 2 ? (ligne ? m.fond : m.sombre) : sorte === 0 && ligne ? m.sombre : m.fond;
          const k = ((i * H + y) * W + x) * 3;
          img.set(px, k); masses.set(sorte === 1 ? [128, 128, 128] : px, k);
        }
      });
      const png = (b: Buffer) => sharp(b, { raw: { width: W, height: H * home.length, channels: 3 } }).png().toBuffer();
      out[vue] = await R.empreinteDe(await png(img), vue, home.map((s, i) => ({ uid: s.uid, role: "page", top: i * H, height: H })), await png(masses));
    }
    return out;
  }
  /** Le premier projet d'un essai prend la première marque, le suivant l'autre. */
  let premier: string | null = null;
  const SECTIONS = [["tn-ouverture", "dans-la-photo"], ["tn-questions", "filets"], ["tn-engagements", "liste"], ["tn-garantie", "bande"], ["tn-atouts", "lignes"], ["tn-final", "sombre-centre"], ["tn-texte-photo", "photo-gauche"], ["tn-chiffres", "lignes"]];
  async function projet(nom: string) {
    const u = await account();
    const pid = `p${hash(nom + Math.random()).toString(36)}`;
    run("INSERT INTO projects (id, user_id, name, created_at, updated_at) VALUES (?,?,?,?,?)", pid, u.id, nom, now(), now());
    const t = S.saveCustomTheme(pid, { version: 1, family: "classique", style: "x", header: null, footer: null, search: null, rev: 0, at: 0,
      pages: [{ key: "home", label: "Accueil", sections: SECTIONS.map(([id, c], i) => ({ uid: `s${nom.slice(0, 3)}${i}`.padEnd(9, "0"), id, construction: c })) }] } as any, { history: false });
    return { pid, t };
  }
  const site = { business: "products" as const, products: 1 };

  it("un site jumeau d'un site déjà monté est rendu différent, sans IA ; l'empreinte est gardée avec le site", async () => {
    studioVide();
    C.controleDeps.capture = async (pid, t) => simule(pid, t);
    const a = await projet("Alpha");
    premier = a.pid;
    const ra = await C.controleParImage(a.pid, site);
    expect(ra.statut).toBe("passe");
    expect(ra.compares).toBe(0);
    expect(C.ligneControle(ra)).toMatch(/premier site du Studio/);
    const b = await projet("Bravo");
    const rb = await C.controleParImage(b.pid, site);
    expect(rb.statut, JSON.stringify(rb)).toBe("corrige");
    expect(rb.avant!).toBeGreaterThanOrEqual(R.SEUIL);
    expect(rb.note!).toBeLessThan(R.SEUIL);
    expect(rb.changements.length).toBeGreaterThan(0);
    expect(rb.changements.every((x) => /disposition|ouverture|allure|fond|titre/.test(x))).toBe(true);
    const tb = S.loadCustomTheme(b.pid)!;
    expect(tb.rev).toBeGreaterThan(b.t.rev);
    // Les pièces restent les mêmes (les textes écrits pour le client restent justes), seules les dispositions changent.
    expect(tb.pages[0].sections.map((s) => s.id)).toEqual(SECTIONS.map(([id]) => id));
    expect(tb.pages[0].sections.map((s) => s.construction)).not.toEqual(SECTIONS.map(([, c]) => c));
    // Recomparé : il passe ; et son empreinte est gardée (version du site comprise).
    const g = JSON.parse(one<{ value: string }>("SELECT value FROM memory WHERE project_id=? AND key=?", b.pid, C.EMPREINTE_KEY)!.value);
    expect(g.rev).toBe(tb.rev);
    expect(R.ressemblance(g, await simule(a.pid, S.loadCustomTheme(a.pid)!)).note).toBeLessThan(R.SEUIL);
    expect(C.ligneControle(rb)).toMatch(/corrigé sans IA/);
  }, 60_000);

  it("quand aucune retouche ne suffit : « trop-proche », dit avec la note, le site n'est pas changé en vain", async () => {
    studioVide();
    C.controleDeps.capture = async (pid, t) => simule(pid, t, true);
    const a = await projet("Charlie");
    premier = a.pid;
    await C.controleParImage(a.pid, site);
    const b = await projet("Delta");
    const rb = await C.controleParImage(b.pid, site);
    expect(rb.statut).toBe("trop-proche");
    expect(rb.raison).toMatch(/ressemble encore trop à un site déjà monté par le Studio pour une autre marque \(note \d+(\.\d)? sur 100, seuil 48\), même après 0 retouche/);
    expect(S.loadCustomTheme(b.pid)!.rev).toBe(b.t.rev);
    expect(C.ligneControle(rb)).toMatch(/ressemble encore trop/);
  }, 60_000);

  it("sans navigateur de captures : « non-fait », et la raison est dite", async () => {
    process.env.ES_NO_CHROMIUM = "1";
    const a = await projet("Echo");
    const r = await C.controleParImage(a.pid, site);
    expect(r.statut).toBe("non-fait");
    expect(r.raison).toMatch(/navigateur de captures n'est pas installé/);
    expect(C.ligneControle(r)).toMatch(/^pas comparé en image aux autres sites du Studio : le navigateur/);
  });

  it("les sites comparés sont ceux de la règle de variété : les 12 derniers, puis les plus anciens du même métier", async () => {
    const a = await projet("Foxtrot");
    const all = C.sitesCompares(a.pid, null);
    expect(all.length).toBeLessThanOrEqual(12);
    expect(all.every((x) => x.projectId !== a.pid)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────── dans la création du site

describe("contrôle par l'image : dans la création du site", async () => {
  const { one } = await import("@/lib/db");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { account } = await import("./conversation209-fixtures");
  const { threadFor } = await import("@/lib/syna-agent/thread");
  const { getTool } = await import("@/lib/syna-agent/registry");
  const S = await import("@/lib/syna-agent/custom-theme/theme");
  const J = await import("@/lib/syna-agent/custom-theme/site-job");
  const { journeyOf, STEP_GUIDES } = await import("@/lib/syna-agent/journey") as any;
  const fr = <T,>(fn: () => Promise<T> | T) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());
  const call = async (name: string, ctx: any, args: unknown): Promise<any> => {
    ctx.projectId = one<{ project_id: string | null }>("SELECT project_id FROM agent_conversations WHERE id=?", ctx.conversationId)?.project_id ?? null;
    return fr(() => getTool(name)!.run(ctx, getTool(name)!.args.parse(args)));
  };

  it("un site encore trop proche n'est pas présenté comme fini : pas de version active, et c'est la première chose dite", async () => {
    const user = await account();
    const cid = threadFor(user, null), ctx: any = { user, conversationId: cid, runId: `run-${Date.now()}`, projectId: null, attachment: () => null };
    await call("start.answer", ctx, { answers: [{ field: "business", value: "products" }, { field: "offer", value: "Des objets faits à la main." }] });
    await call("start.answer", ctx, { answers: [
      { field: "existing", value: "Rien." }, { field: "audience", value: "Adultes." }, { field: "image", value: "Doux." }, { field: "setup", value: "1 objet" }, { field: "market", value: "France." },
      { field: "price", value: "25 €" }, { field: "difference", value: "Fait main." }, { field: "taste", status: "none" }, { field: "photos", value: "Non." }, { field: "language", value: "Français seulement" }, { field: "contact", status: "later" }, { field: "platform", value: "shopify" },
    ] });
    await (await import("./faits-fixtures")).avecLesFaitsDemandes(ctx, () => call("start.confirm", ctx, {}));
    const pid = one<any>("SELECT project_id FROM agent_conversations WHERE id=?", cid).project_id as string;
    // Un site complet et valide, monté par l'outil du Studio (toutes les pages obligatoires d'une boutique).
    await call("theme.family", ctx, { family: "classique" });
    const composed = await call("custom.compose", ctx, { header: "En-tête classique", footer: "Pied de page complet", pages: [
      { key: "home", label: "Accueil", sections: ["Ouverture photo pleine", "Collection en vedette", "Histoire du produit au défilement", "Citation en grand", "Avis clients", "Grille bento", "Nos engagements", "Chiffres clés", "Texte qui s'allume en lisant", "Questions en bulles de discussion"] },
      { key: "shop", label: "Boutique", sections: ["Catalogue avec filtres et tri"] },
      { key: "product", label: "Fiche produit", sections: ["Produit vedette", "Points forts du produit", "Mode d'emploi en étapes", "Résumé des avis", "Questions sur le produit", "Fiche produit à onglets", "Badges de confiance", "Cartes qui s'empilent", "Comparatif « nous / les autres »", "Photo à points cliquables"] },
      { key: "cart", label: "Panier", sections: ["Page panier complète"] }, { key: "compte", label: "Mon compte", sections: ["Connexion et création de compte"] },
      { key: "about", label: "Notre histoire", sections: ["L'atelier et la personne derrière"] }, { key: "contact", label: "Contact", sections: ["Contact"] },
      { key: "aide", label: "Aide", sections: ["Suivi de commande et aide"] }, { key: "legal", label: "Informations légales", sections: ["Mentions et conditions"] }, { key: "404", label: "Page 404", sections: ["Page introuvable (404)"] },
    ] });
    expect(composed.ok, composed.summary).toBe(true);
    const designed = { ok: true as const, t: S.loadCustomTheme(pid)!, d: { concept: "Un site simple.", tenue: null }, left: [], result: { ok: true, summary: "" } };
    const runSite = async (id: string, statut: "trop-proche" | "non-fait" | "corrige") => {
      J.siteJobDeps.design = async () => designed as any;
      J.siteJobDeps.estimate = () => ({ maxMicro: 100_000, probableMicro: 50_000, label: "" });
      J.siteJobDeps.build = async () => ({ sections: 1, regards: { pages: ["home"] } });
      J.siteJobDeps.image = async () => statut === "non-fait"
        ? { statut, avant: null, note: null, seuil: 48, compares: 0, nonCompares: 0, changements: [], raison: "le navigateur de captures n'est pas installé sur le serveur" }
        : { statut, avant: 71.5, note: statut === "corrige" ? 40.2 : 55.1, seuil: 48, compares: 3, nonCompares: 0, changements: ["tn-questions : disposition filets → cartes"], ...(statut === "trop-proche" ? { raison: "encore trop proche" } : {}) };
      try { await fr(() => J.runSinaSiteJob({ job: { id }, payload: { projectId: pid, userId: user.id, conversationId: cid, runId: "r", capMicro: 10_000_000 }, checkpoint: {}, progress: () => undefined, step: async (_k: string, fn: () => Promise<unknown>) => fn() } as any)); }
      finally { delete J.siteJobDeps.design; delete J.siteJobDeps.estimate; delete J.siteJobDeps.build; delete J.siteJobDeps.image; }
      return journeyOf(cid).site.report as Record<string, any>;
    };
    const proche = await runSite(`j-${Date.now()}-proche`, "trop-proche");
    expect(Object.keys(proche)[0]).toBe("ressemblance");
    expect(proche.ressemblance).toMatch(/^ton site ressemble encore trop, à l'œil, à un site déjà fait par le Studio pour une autre marque, même après mes retouches : je ne te le présente pas comme fini/);
    expect(proche.pret).toBe(false);
    expect(proche.aCompleter[0]).toMatch(/ressemble encore trop à un site déjà fait par le Studio/);
    expect(proche.aRevoir[0]).toMatch(/ressemble encore trop/);
    expect(journeyOf(cid).steps[6].note).toMatch(/pas encore fini/);
    const aveugle = await runSite(`j-${Date.now()}-aveugle`, "non-fait");
    expect(aveugle.ressemblance).toMatch(/^je n'ai pas pu comparer ton site en image aux autres sites du Studio \(le navigateur de captures n'est pas installé sur le serveur\) : à dire au client en premier/);
    expect(aveugle.aRevoir[0]).toMatch(/^pas comparé en image/);
    const corrige = await runSite(`j-${Date.now()}-corrige`, "corrige");
    expect("ressemblance" in corrige).toBe(false);
    expect(corrige.controleImage).toMatch(/il ressemblait trop à l'un d'eux \(71.5 sur 100\), corrigé sans IA \(tn-questions : disposition filets → cartes\)/);
    expect(STEP_GUIDES[6]).toMatch(/« ressemblance »[^]*EN PREMIER[^]*tu ne le lui présentes PAS comme fini/);
  }, 60_000);
});

// ─────────────────────────────────────────────────────────────── avec un vrai navigateur

const { chromiumPath } = await import("@/lib/theme/snapshot");
describe.runIf(!!chromiumPath())("contrôle par l'image : avec un vrai navigateur", async () => {
  const { run, now } = await import("@/lib/db");
  const { account } = await import("./conversation209-fixtures");
  const S = await import("@/lib/syna-agent/custom-theme/theme");
  const C = await import("@/lib/syna-agent/custom-theme/controle-image");
  const ACCUEIL = [["tn-ouverture", "titre-centre"], ["tn-engagements", "liste"], ["tn-questions", "filets"], ["tn-garantie", "bande"], ["tn-atouts", "lignes"], ["tn-chiffres", "lignes"], ["tn-final", "sombre-centre"]];
  /** Deux marques d'essai (polices et palettes différentes, comme la règle des identités l'exige désormais). */
  const BRANDS = [
    { name: "Atelier Un", fonts: { heading: "archivo_black_n4", body: "inter_n4" }, palette: { dark: "#2B1D24", primary: "#73294F", secondary: "#FFF7EE", accent: "#9C6B4E", light: "#FFFCF7" } },
    { name: "Atelier Deux", fonts: { heading: "fraunces_n8", body: "lato_n4" }, palette: { dark: "#241612", primary: "#FF6650", secondary: "#3D2720", accent: "#E8B86A", light: "#FBEBD8" } },
  ];
  async function projet(nom: string, marque = 0) {
    const u = await account();
    const pid = `q${Math.random().toString(36).slice(2, 12)}`;
    run("INSERT INTO projects (id, user_id, name, brand_json, created_at, updated_at) VALUES (?,?,?,?,?,?)", pid, u.id, nom, JSON.stringify(BRANDS[marque]), now(), now());
    let t: any = { version: 1, family: "classique", style: "x", header: null, footer: null, search: null, pages: [], rev: 0, at: 0, famille: "epure-editorial" };
    t = S.applyStructure(t, [{ op: "page", key: "home", label: "Accueil" }, ...ACCUEIL.map(([id, c]) => ({ op: "add", page: "home", section: id, construction: c })), { op: "tenue", tenue: { titres: "fins", bouton: "droit", cadre: "droit", fond: "uni", petits: "normal", signe: "" } }] as any);
    return { pid, t: S.saveCustomTheme(pid, t, { history: false }) };
  }
  const site = { business: "products" as const, products: 1 };

  it("un vrai accueil capturé deux fois fait 100 ; un site monté à l'identique d'un autre est corrigé sans IA jusqu'à passer", async () => {
    run("UPDATE memory SET state='superseded' WHERE kind='artifact' AND key IN (?,?)", S.THEME_KEY, C.EMPREINTE_KEY);
    const a = await projet("Atelier Un");
    const e1 = await C.capturerAccueil(a.pid, a.t), e2 = await C.capturerAccueil(a.pid, a.t);
    expect(e1 && e2).toBeTruthy();
    expect(R.ressemblance(e1!, e2!).note).toBeGreaterThanOrEqual(99);
    expect((await C.controleParImage(a.pid, site)).statut).toBe("passe");
    // Le même site sous une autre marque (autre police, autres couleurs) : « le même site » pour l'œil, corrigé sans IA.
    const b = await projet("Atelier Deux", 1);
    const r = await C.controleParImage(b.pid, site);
    expect(r.avant!, JSON.stringify(r)).toBeGreaterThanOrEqual(R.SEUIL);
    expect(r.statut, JSON.stringify(r)).toBe("corrige");
    expect(r.note!).toBeLessThan(R.SEUIL);
    console.log(`contrôle par l'image, vrai navigateur : ${C.ligneControle(r)}`);
  }, 300_000);
});
