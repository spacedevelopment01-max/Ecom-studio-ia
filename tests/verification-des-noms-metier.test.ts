/**
 * LA VÉRIFICATION DES NOMS COMPARE AU MÉTIER DE LA FICHE (essai réel de la maroquinerie, 27 novembre 2026, étape des noms) :
 * « Patine » a été écarté parce que « c'est le même secteur que ton projet de vêtements », alors que le client fait de la
 * maroquinerie. Le vérificateur ne recevait que les noms et les pages, jamais la fiche : il a deviné le métier du client
 * d'après les pages. Désormais :
 *  - chaque appel de l'étape des noms (recherches, étude, idées, équipes, juge, recherche des noms gardés, vérification)
 *    porte le métier de la fiche ;
 *  - un nom n'est dit « pris » que comparé au métier de la fiche : un verdict qui prête au client un autre métier (recopié
 *    dans `metierDuClient`, ou dit dans sa note : « ton projet de … ») ne compte pas ; le nom n'est pas écarté, mais il
 *    n'est pas dit « vérifié » non plus (contrôle gratuit).
 * Appels simulés : aucun appel payant.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const FICHIER = "scripts/syna-recette/clients/maroquinerie.json";
/** Le verdict rendu par le vérificateur à l'essai réel, mot pour mot (rapport.txt de l'essai). */
const PAGE_DE_L_ESSAI = "https://www.pratiks.com/que-faut-il-savoir-sur-patine";
const NOTE_DE_L_ESSAI = "J'ai lu que Patine est un label de mode parisien lancé en 2017, présent aussi sur d'autres pages comme marque de vêtements : c'est le même secteur que ton projet de vêtements, donc le nom est pris.";

describe("la vérification des noms compare au métier de la fiche", async () => {
  const C = await import("@/lib/syna-agent/brand-chain");
  const P = await import("@/lib/syna-agent/brand-prompts");
  const { briefFromJourney } = await import("@/lib/syna-agent/identities");
  const { clientDeLEssai, typeDuProjet } = await import("../scripts/syna-recette/client-de-l-essai");
  const client = clientDeLEssai({ CLIENT_JSON: FICHIER }, { sansNom: true });
  const at = Date.now();
  // La fiche telle que la vérification la reçoit dans la tâche des noms (`briefFromJourney`).
  const fiche = briefFromJourney({ start: { business: { value: typeDuProjet(client), status: "answered", source: "client", at }, offer: { value: `${client.metier} : ${client.produits.join(", ")}`, status: "answered", source: "client", at } }, keep: [], steps: {} } as never);

  it("le contrôle gratuit : le verdict de l'essai prête au client un autre métier (« vêtements »), un verdict comparé à sa fiche passe", () => {
    expect(fiche).toContain("maroquinerie artisanale");
    expect(C.metierPreteAuClient({ note: NOTE_DE_L_ESSAI }, fiche)).toBe("vêtements");
    expect(C.metierPreteAuClient({ note: "Patine vend des vêtements, pas de la maroquinerie : autre secteur.", metierDuClient: "vêtements" }, fiche)).toBe("vêtements");
    // Comparé au bon métier : rien à redire, que le nom soit pris ou non.
    expect(C.metierPreteAuClient({ note: "Une maroquinerie qui vend des sacs en cuir sous ce nom, comme ta maroquinerie artisanale.", metierDuClient: "maroquinerie artisanale qui fabrique et vend en ligne des sacs, des portefeuilles et des ceintures en cuir" }, fiche)).toBeNull();
    expect(C.metierPreteAuClient({ note: "Un atelier de sacs en cuir porte ce nom.", metierDuClient: "Maroquinerie" }, fiche)).toBeNull();
    expect(C.metierPreteAuClient({ note: "Une marque de ceintures en cuir porte ce nom : le même secteur que tes ceintures." }, fiche)).toBeNull();
    expect(C.metierPreteAuClient({ note: "", metierDuClient: "" }, fiche)).toBeNull();
  });

  it("le rejeu de l'essai, sans appel : la fiche part au vérificateur ; avec le même verdict, Patine n'est plus écarté (ni dit vérifié)", async () => {
    const envoyes: { id: string; system?: string; prompt: string }[] = [];
    const ai = {
      research: async (id: string, query: string) => { envoyes.push({ id: `web:${id}`, prompt: query }); return [{ url: PAGE_DE_L_ESSAI, title: "Que faut-il savoir sur Patine ?", category: "competitors" as const, excerpt: "Patine, label de mode parisien lancé en 2017." }]; },
      ask: async (id: string, c: { system: string; prompt: string; schema: { parse: (v: unknown) => unknown } }) => { envoyes.push({ id, system: c.system, prompt: c.prompt }); return c.schema.parse({ checks: [{ name: "Patine", taken: true, url: PAGE_DE_L_ESSAI, note: NOTE_DE_L_ESSAI }] }); },
    };
    const v = await C.verifierLesNoms(ai as never, "verify-noms-1", ["Patine", "Maroquin", "Havane"], fiche);
    // La recherche et la vérification portent le métier de la fiche.
    for (const e of envoyes) expect(e.prompt, e.id).toContain("maroquinerie artisanale qui fabrique et vend en ligne des sacs");
    const verif = envoyes.find((e) => e.id === "verify-noms-1")!;
    expect(verif.prompt.indexOf("# Fiche du client")).toBe(0);
    expect(verif.system).toMatch(/Le secteur du client est celui de SA fiche[\s\S]*ne le devine jamais d'après les pages/);
    expect(verif.system).toMatch(/metierDuClient = le métier du client recopié mot pour mot depuis la fiche/);
    // Le verdict de l'essai ne compte plus comme une preuve.
    expect(v.taken).toEqual([]);
    expect(v.preuves).toEqual([]);
    expect(v.aRevoir).toEqual([{ name: "Patine", url: PAGE_DE_L_ESSAI, note: NOTE_DE_L_ESSAI, metier: "vêtements" }]);
    const e = C.nomsEcartes({ equipes1: [{ team: "mots", names: ["Patine", "Maroquin", "Havane"].map((name) => ({ name, detail: "le cuir", second: "aucune", idea: "i1" })) }], concurrents: [], dejaMontres: [], juge1: { kept: ["Patine", "Maroquin", "Havane"].map((name) => ({ name, seen: "", why: "" })), almost: [] }, todo: 2, verification: v });
    expect(e.ecartes.filter((x) => x.etape === "verification")).toEqual([]);
    expect(e.libres).toEqual(["Patine", "Maroquin", "Havane"]);
  });

  it("un vrai conflit, comparé au métier de la fiche, écarte toujours le nom", async () => {
    const ai = {
      research: async () => [{ url: "https://annuaire.example/cuir", title: "Maroquiniers", category: "competitors" as const, excerpt: "Havane, maroquinerie : sacs en cuir." }],
      ask: async (_id: string, c: { schema: { parse: (v: unknown) => unknown } }) => c.schema.parse({ checks: [{ name: "Havane", taken: true, url: "https://annuaire.example/cuir", note: "Une maroquinerie vend des sacs en cuir sous ce nom, comme ta maroquinerie artisanale.", metierDuClient: "maroquinerie artisanale" }] }),
    };
    const v = await C.verifierLesNoms(ai as never, "verify-noms-1", ["Havane", "Maroquin"], fiche);
    expect(v.taken).toEqual(["Havane"]);
    expect(v.aRevoir).toBeUndefined();
  });

  it("la consigne du vérificateur ne porte aucun exemple d'essai", () => {
    expect(P.VERIFY_SYSTEM).not.toMatch(/maroquin|cuir|vêtement|Patine|torréf|café|savon|Écume|Racine/i);
  });

  describe("la tâche des noms entière (appels simulés) : le métier de la fiche à chaque appel", async () => {
    const billing = await import("@/lib/billing");
    const { withTrace } = await import("@/lib/ai/trace");
    const { essaiDesNoms } = await import("../scripts/syna-recette/essai-noms-outil");
    await (await import("../scripts/syna-recette/tarifs-verifies")).appliquerTarifsVerifies();
    const APPEL = 30_000;
    const NOMS = ["Patine", "Maroquin", "Havane", "Besace", "Sellier"];
    const PAGE = "https://avis.example/cuir";
    const envoyes: { id: string; prompt: string }[] = [];
    const paye = (q: { userId: string; jobId: string }) => withTrace({ jobId: q.jobId }, async () => { const rid = billing.reserve(q.userId, APPEL, { task: "strategy", provider: "anthropic", model: "simule", jobId: q.jobId }); billing.settle(rid, APPEL / 2, null, "strategy"); });
    const simule = (q: { userId: string; projectId: string; jobId: string }) => ({
      research: async (id: string, query: string) => {
        envoyes.push({ id: `web:${id}`, prompt: query }); await paye(q);
        return id.startsWith("verify") ? [{ url: PAGE_DE_L_ESSAI, title: "Que faut-il savoir sur Patine ?", category: "competitors" as const, excerpt: "Patine, label de mode parisien." }]
          : [{ url: PAGE, title: "Avis sur un sac en cuir", category: "customers" as const, excerpt: "« Mon sac en cuir a dix ans et il est plus beau qu'au premier jour. »" }];
      },
      ask: async (id: string, c: { kind: string; prompt: string; schema: { parse: (v: unknown) => unknown } }) => {
        envoyes.push({ id, prompt: c.prompt }); await paye(q);
        const r: Record<string, unknown> = {
          study: { quotes: [{ text: "Mon sac en cuir a dix ans et il est plus beau qu'au premier jour.", url: PAGE }], competitors: [], mould: "des noms de famille et du noir" },
          strategy: { job: "garder un bel objet longtemps", confessions: [{ text: "j'ai peur qu'il s'abîme vite", quotes: [0] }], ideas: [1, 2, 3, 4].map((i) => ({ id: `i${i}`, belief: `idée ${i}`, enemy: "le jetable", proof: "le cuir", cost: "coudre à la main", strong: true })) },
          team: { names: NOMS.map((name) => ({ name, detail: "le cuir", second: "aucune", idea: "i1" })) },
          judge: { kept: ["Patine", "Maroquin", "Havane"].map((name) => ({ name, seen: "du cuir", why: "il dit la matière" })) },
          verify: { checks: [{ name: "Patine", taken: true, url: PAGE_DE_L_ESSAI, note: NOTE_DE_L_ESSAI }] },
        };
        return c.schema.parse(r[c.kind]);
      },
      draw: async () => { throw new Error("interdit"); },
      look: async () => { throw new Error("interdit"); },
    });
    const dossiers: string[] = [];
    afterEach(() => { for (const d of dossiers.splice(0)) fs.rmSync(d, { recursive: true, force: true }); envoyes.length = 0; delete process.env.STUDIO_ESSAI_PLAFOND_EUROS; delete process.env.STUDIO_ESSAI_DEBUT; });

    it("chaque appel porte « maroquinerie artisanale », aucun ne parle de vêtements ; Patine reste proposé, « non vérifié », et c'est écrit", async () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "essai-noms-maroquinerie-")); dossiers.push(dir);
      const adresses = async (nom: string) => ({ taken: [], free: [`${nom.toLowerCase()}.fr`], unknown: [], at: Date.now() });
      const r = await essaiDesNoms({ sortie: dir, plafondEuros: "20", client, ai: simule as never, lirePage: async () => "<p>« Mon sac en cuir a dix ans et il est plus beau qu'au premier jour. »</p>", trouverLesAdresses: adresses });
      expect(r.arret).toBeUndefined();
      expect(envoyes.map((e) => e.id)).toEqual(["web:paroles", "web:concurrents", "web:usages", "study", "strategy", "team-langue", "team-mots", "team-univers", "team-verite", "judge-1", "web:verify-noms-1", "verify-noms-1"]);
      for (const e of envoyes) {
        expect(e.prompt, e.id).toContain("maroquinerie artisanale qui fabrique et vend en ligne des sacs, des portefeuilles et des ceintures en cuir");
        expect(e.prompt, e.id).not.toMatch(/vêtement/i);
      }
      expect(r.noms.map((n) => [n.nom, n.verification])).toEqual([["Patine", "non_verifie"], ["Maroquin", "verifie"], ["Havane", "verifie"]]);
      expect(r.notes.join("\n")).toMatch(/« Patine » : la vérification l'a comparé à un autre métier que celui de la fiche \(« vêtements »\)/);
      const rapport = fs.readFileSync(path.join(dir, "rapport.txt"), "utf8");
      expect(rapport).toContain("1. Patine [non vérifié]");
      expect(rapport).not.toMatch(/Patine \(équipe « [a-z]+ » \) : déjà porté/);
      // Le compte rendu de l'étude des clients : où les paroles se sont perdues (ici, aucune : la page simulée la porte).
      expect(rapport).toContain("L'étude des clients (pour toi seulement) :");
      expect(rapport).toContain("Paroles rendues par l'étude : 1 ; gardées après les deux relectures : 1.");
      expect(JSON.parse(fs.readFileSync(path.join(dir, "etude-des-clients.json"), "utf8")).lecture.pages).toEqual([{ url: PAGE, famille: "customers", extrait: 69 }]);
    });
  });
});

/**
 * LA LECTURE DES PAROLES DE CLIENTS (même essai : « 0 parole réelle de clients trouvée ») : deux défauts gratuits de la
 * relecture des pages, corrigés sans toucher aux recherches ni aux appels, et un compte rendu qui dit où chaque parole se perd.
 */
describe("la relecture des paroles de clients sur leur page", async () => {
  const C = await import("@/lib/syna-agent/brand-chain");
  const { lignesDeLaLectureDeLEtude } = await import("../scripts/syna-recette/essai-noms-outil");

  it("les accents écrits en entités nommées (« &eacute; ») se lisent : une parole recopiée avec ses accents se retrouve sur la page", () => {
    const html = "<div class=\"post\">J&rsquo;ai achet&eacute; ce sac il y a dix ans, il est toujours aussi beau. La boucle s&#39;est patin&eacute;e, c&#8217;est encore mieux&nbsp;! &OElig;uvre d&rsquo;un vrai ma&icirc;tre, &agrave; la fa&ccedil;on d&rsquo;autrefois.</div>";
    const t = C.pageText(html);
    expect(t).toContain("J'ai acheté ce sac il y a dix ans");
    expect(t).toContain("Œuvre d'un vrai maître, à la façon d'autrefois.");
    expect(C.quoteOnPage("J’ai acheté ce sac il y a dix ans, il est toujours aussi beau.", t)).toBe(true);
    // Une entité inconnue reste telle quelle (rien n'est inventé).
    expect(C.pageText("a &zzzz; b")).toBe("a &zzzz; b");
  });

  it("une page en ISO-8859-1 ou windows-1252 garde ses accents ; l'UTF-8 reste l'UTF-8", () => {
    const latin = Buffer.from("<html><head><meta charset=\"iso-8859-1\"></head><body>Très déçue par la couture, ça s'est décousu</body></html>", "latin1");
    expect(C.texteDeLaPage(latin)).toContain("Très déçue par la couture");
    expect(C.texteDeLaPage(Buffer.from("Très déçue", "latin1"), "text/html; charset=windows-1252")).toBe("Très déçue");
    expect(C.texteDeLaPage(Buffer.from("Très déçue", "utf8"), "text/html; charset=UTF-8")).toBe("Très déçue");
    expect(C.texteDeLaPage(Buffer.from("Très déçue", "utf8"))).toBe("Très déçue");
  });

  it("chaque parole écartée à la relecture dit pourquoi ; ce qui est gardé ne change pas", async () => {
    C.brandPageDeps.read = async (url) => (url.endsWith("/lue") ? "<p>Mon sac en cuir a dix ans et il est plus beau qu'au premier jour.</p>" : url.endsWith("/vide") ? null : "<p>autre chose</p>");
    try {
      const r = await C.quotesReadOnPages([
        { text: "Mon sac en cuir a dix ans et il est plus beau qu'au premier jour.", url: "https://a.example/lue" },
        { text: "La couture a lâché au bout d'un mois.", url: "https://a.example/vide" },
        { text: "Je l'ai offert à mon père pour ses soixante ans.", url: "https://a.example/autre" },
      ]);
      expect(r.kept.map((q) => q.url)).toEqual(["https://a.example/lue"]);
      expect(r.unread).toBe(2);
      expect(r.ecartees.map((x) => x.pourquoi)).toEqual(["page_illisible", "pas_sur_la_page"]);
    } finally { C.brandPageDeps.read = undefined; }
  });

  it("le compte rendu de l'étude : pages par famille, paroles rendues et gardées, chaque écartée avec sa raison", () => {
    const lignes = lignesDeLaLectureDeLEtude({
      quotes: [],
      lecture: {
        pages: [{ url: "https://avis.example/sac", famille: "customers", extrait: 820 }, { url: "https://marque.example", famille: "competitors", extrait: 400 }],
        proposees: 2,
        ecartees: [{ text: "Une parole réécrite", url: "https://avis.example/sac", pourquoi: "hors_extrait" }, { text: "Une parole d'un site fermé", url: "https://avis.example/sac", pourquoi: "page_illisible" }],
      },
    });
    const t = lignes.join("\n");
    expect(t).toContain("Pages trouvées par les recherches : 2 (1 paroles de clients, 1 concurrents)");
    expect(t).toContain("https://avis.example/sac (extrait de 820 caractères)");
    expect(t).toContain("Paroles rendues par l'étude : 2 ; gardées après les deux relectures : 0.");
    expect(t).toContain("1 pas retrouvée mot pour mot dans l'extrait de la recherche ; 1 page impossible à relire");
    expect(lignesDeLaLectureDeLEtude({ quotes: [], sources: 12, dropped: 3 }).join("\n")).toMatch(/12 page\(s\) lue\(s\) ; 0 parole\(s\) gardée\(s\), 3 écartée\(s\) \(le détail n'était pas encore gardé\)/);
  });
});
