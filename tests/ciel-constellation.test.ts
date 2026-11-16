/**
 * Le ciel du Studio : la forme des constellations (jamais symétrique, aucune ne ressemble à une autre, gardée pour
 * toujours), les couleurs du soleil, et la règle « SINA ne va sur une étoile que pour un vrai travail ».
 * Aucun appel d'IA ni réseau.
 */
import { describe, expect, it } from "vitest";
import { asymetrique, ecart, ECART_MIN, estForme, formeDe, formeUnique, NB_ETOILES, PORTEE, silhouette, type Forme } from "@/lib/ciel/forme";
import { etoileDeLaTache, placesDuCiel, sinaDe, soleilDe, vueDuProjet } from "@/lib/ciel/vue";
import type { DashboardData } from "@/lib/syna-agent/dashboard";

const DEG = Math.PI / 180;
const tourne = (p: { x: number; y: number }, a: number) => ({ x: p.x * Math.cos(a) - p.y * Math.sin(a), y: p.x * Math.sin(a) + p.y * Math.cos(a) });
/** La même forme, tournée autour du cœur. */
const tour = (f: Forme, a: number): Forme => f.map((b) => ({ ...b, dx: tourne({ x: b.dx, y: b.dy }, a).x, dy: tourne({ x: b.dx, y: b.dy }, a).y }));
const miroir = (f: Forme): Forme => f.map((b) => ({ ...b, dy: -b.dy }));
/** Une forme faite de branches qui partent toutes du cœur, à ces angles (degrés) et ces longueurs. */
const rayons = (angles: number[], l: (i: number) => number): Forme => angles.map((d, i) => ({ parent: -1, dx: Math.cos(d * DEG) * l(i), dy: Math.sin(d * DEG) * l(i), s: 1, tw: 0 }));

describe("Ciel — la forme d'une constellation", () => {
  it("neuf branches, une par étape ; les étoiles ne sont jamais collées et tiennent dans le cadre", () => {
    let chaines = 0;
    for (let k = 0; k < 80; k++) {
      const f = formeDe(`projet-${k}`);
      expect(estForme(f)).toBe(true);
      expect(f).toHaveLength(NB_ETOILES);
      const pts = silhouette(f);
      for (let i = 0; i < pts.length; i++) {
        expect(Math.hypot(pts[i].x, pts[i].y)).toBeLessThanOrEqual(PORTEE + 0.3);
        expect(Math.hypot(pts[i].x, pts[i].y)).toBeGreaterThan(0.3);
        // Chaque nom a la place de s'écrire : deux étoiles sont toujours écartées.
        for (let j = 0; j < i; j++) expect(Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y)).toBeGreaterThan(0.2);
      }
      // Les branches n'ont jamais toutes la même longueur.
      expect(new Set(f.map((b) => Math.hypot(b.dx, b.dy).toFixed(2))).size).toBeGreaterThan(4);
      if (f.some((b) => b.parent >= 0)) chaines++;
    }
    // De la variété : des éclats (tout part du cœur) et des chaînes (une branche repart d'une étoile).
    expect(chaines).toBeGreaterThan(15);
    expect(chaines).toBeLessThan(75);
  });

  it("la même graine donne toujours la même forme", () => {
    expect(formeDe("abc", 2)).toEqual(formeDe("abc", 2));
    expect(formeDe("abc", 2)).not.toEqual(formeDe("abc", 3));
  });

  it("jamais symétrique : une roue régulière est refusée, une forme tirée est acceptée", () => {
    const roue = rayons([0, 40, 80, 120, 160, 200, 240, 280, 320], () => 0.8);
    expect(asymetrique(roue)).toBe(false);
    const papillon = rayons([-80, -60, -40, -20, 0, 20, 40, 60, 80], (i) => 0.6 + Math.abs(i - 4) * 0.1);
    expect(asymetrique(papillon)).toBe(false);
    expect(asymetrique(formeUnique("un projet", []).forme)).toBe(true);
  });

  it("une forme tournée ou vue en miroir reste la même forme : l'écart le voit", () => {
    const f = formeDe("fleuriste");
    expect(ecart(f, tour(f, 40 * DEG))).toBeLessThan(0.02);
    expect(ecart(f, miroir(tour(f, 130 * DEG)))).toBeLessThan(0.02);
    expect(ecart(f, formeDe("menuisier"))).toBeGreaterThan(0.05);
  });

  it("aucune constellation ne ressemble à une autre : trois cents projets, tous différents, même en tournant le ciel", () => {
    const faites: Forme[] = [];
    for (let k = 0; k < 300; k++) {
      const { forme } = formeUnique(`p${k}`, faites);
      for (const o of faites) expect(ecart(forme, o)).toBeGreaterThanOrEqual(ECART_MIN);
      expect(asymetrique(forme)).toBe(true);
      faites.push(forme);
    }
  }, 120_000);

  it("une forme trop proche d'une autre est refaite", () => {
    const prise = formeDe("jumeau", 0);
    const { forme, essai } = formeUnique("jumeau", [tour(prise, 25 * DEG)]);
    expect(essai).toBeGreaterThan(0);
    expect(ecart(forme, prise)).toBeGreaterThanOrEqual(ECART_MIN);
  });
});

describe("Ciel — la forme est gardée pour toujours", async () => {
  const { run, one } = await import("@/lib/db");
  const { formeDuProjet } = await import("@/lib/ciel/constellations");
  it("enregistrée à la première demande, relue ensuite, différente des autres, et inchangée quand un autre projet disparaît", () => {
    const a = formeDuProjet("ciel-test-a"), b = formeDuProjet("ciel-test-b");
    expect(ecart(a, b)).toBeGreaterThanOrEqual(ECART_MIN);
    expect(one<{ n: number }>("SELECT COUNT(*) n FROM constellations WHERE project_id IN ('ciel-test-a','ciel-test-b')")!.n).toBe(2);
    run("DELETE FROM constellations WHERE project_id='ciel-test-a'");
    expect(formeDuProjet("ciel-test-b")).toEqual(b);
  });
});

describe("Ciel — le soleil aux couleurs de la marque", () => {
  it("sans marque : pas de couleurs (le cœur reste bleu comme SINA)", () => {
    expect(soleilDe(null)).toBeNull();
    expect(soleilDe([])).toBeNull();
    expect(soleilDe(["pas une couleur"])).toBeNull();
  });
  it("trois teintes tirées de la palette : une claire, la plus vive, une sombre", () => {
    const [clair, moyen, sombre] = soleilDe(["#F4EFE6", "#9DB08A", "#4E5B3C", "#222222"])!;
    expect(clair).toBe("#f4efe6");
    expect(moyen).toBe("#9db08a");
    expect(sombre).toMatch(/^#[0-9a-f]{6}$/);
  });
  it("une marque très sombre brille quand même : sa teinte est éclaircie", () => {
    const [clair, moyen] = soleilDe(["#1B2A4A"])!;
    const lum = (h: string) => [1, 3, 5].reduce((s, i) => s + parseInt(h.slice(i, i + 2), 16), 0) / 765;
    expect(lum(moyen)).toBeGreaterThan(lum("#1B2A4A"));
    expect(lum(clair)).toBeGreaterThan(0.75);
  });
});

describe("Ciel — SINA ne va sur une étoile que pour un vrai travail", () => {
  const etapes = (cur: number, statut: "todo" | "doing" | "review" = "todo") => Array.from({ length: 9 }, (_, i) => ({ n: i + 1, fr: `Étape ${i + 1}`, en: `Step ${i + 1}`, status: i + 1 < cur ? "done" as const : i + 1 === cur ? statut : "todo" as const, ready: true, promise: { fr: "p", en: "p" } }));
  const base = (o: Partial<DashboardData>): DashboardData => ({ name: "Projet", building: false, started: true, current: 1, mode: "creation", keep: [], steps: etapes(1), fiche: [], notes: [], brand: null, angle: null, ...o });

  it("projet livré, aucune tâche : SINA est au cœur, sans phrase", () => {
    expect(sinaDe(base({ current: 9, steps: etapes(10) }))).toEqual({ etoile: null, phrase: null });
  });
  it("une vraie tâche de fond l'envoie sur son étoile, avec le nom de la tâche", () => {
    const s = sinaDe(base({ current: 9, steps: etapes(10) }), [{ type: "post.regenerate", label: "Ta publication du jour", status: "running" }]);
    expect(s).toEqual({ etoile: 7, phrase: { fr: "Ta publication du jour", en: "Ta publication du jour" } });
  });
  it("une tâche en pause ne compte pas ; une tâche d'un genre inconnu la laisse au cœur, avec sa phrase", () => {
    expect(sinaDe(base({ current: 9, steps: etapes(10) }), [{ type: "post.regenerate", label: "x", status: "paused" }]).etoile).toBeNull();
    expect(sinaDe(base({ current: 9, steps: etapes(10) }), [{ type: "files.classify", label: "Je range tes fichiers", status: "running" }])).toEqual({ etoile: null, phrase: { fr: "Je range tes fichiers", en: "Je range tes fichiers" } });
  });
  it("pendant la création : sur l'étape en cours, ou qui attend l'avis du client ; jamais sur une étape pas commencée", () => {
    expect(sinaDe(base({ building: true, current: 2, steps: etapes(2, "doing") })).etoile).toBe(2);
    expect(sinaDe(base({ building: true, current: 2, steps: etapes(2, "review") })).phrase!.fr).toContain("attend ton avis");
    expect(sinaDe(base({ building: true, current: 2, steps: etapes(2, "todo") }))).toEqual({ etoile: null, phrase: null });
  });
  it("chaque genre de tâche a son étoile", () => {
    expect([etoileDeLaTache("syna.brand"), etoileDeLaTache("brand.logo"), etoileDeLaTache("syna.angles"), etoileDeLaTache("shop.build"), etoileDeLaTache("theme.custom"), etoileDeLaTache("shopify.push"), etoileDeLaTache("calendar.plan"), etoileDeLaTache("stock.search")]).toEqual([2, 2, 3, 5, 5, 6, 7, null]);
  });
  it("la vue : l'état de chaque étoile, et l'espace qu'elle ouvre", () => {
    const v = vueDuProjet(base({ building: true, current: 3, steps: etapes(3, "review"), brand: { name: "Lueur", slogan: null, logo: null, colors: ["#E8C27A"] } }));
    expect(v.etoiles.map((e) => e.etat)).toEqual(["fait", "fait", "avis", "avenir", "avenir", "avenir", "avenir", "avenir", "avenir"]);
    expect(v.etoiles.map((e) => e.espace)).toEqual([null, "marque", "strategie", "produit", "boutique", "boutique", "publications", "publicites", null]);
    expect(v.couleurs).not.toBeNull();
  });
});

describe("Ciel — la place des autres projets du compte", () => {
  it("toujours la même pour les mêmes projets, jamais deux au même endroit, jamais sur le projet ouvert", () => {
    const ids = Array.from({ length: 12 }, (_, i) => `proj${i}`);
    const p = placesDuCiel(ids);
    expect(placesDuCiel([...ids].reverse())).toEqual(p);
    const pts = Object.values(p);
    for (let i = 0; i < pts.length; i++) {
      expect(Math.hypot(pts[i].x, pts[i].y)).toBeGreaterThan(900);
      for (let j = 0; j < i; j++) expect(Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y)).toBeGreaterThan(420);
    }
  });
});
