/**
 * Le ciel partagé : ce que chacun a le droit de voir des projets des autres. Un projet verrouillé ne montre ni nom, ni
 * couleurs, ni avancement, ni son vrai numéro ; un projet ouvert se visite sans rien livrer de ce que le client a dit à
 * SINA. Aucun appel d'IA ni réseau.
 */
import { describe, expect, it } from "vitest";

process.env.STUDIO_SYNA_AGENT = "1";

describe("Ciel partagé", async () => {
  const { run, one } = await import("@/lib/db");
  const { account, project } = await import("./conversation209-fixtures");
  const { threadFor } = await import("@/lib/syna-agent/thread");
  const J = await import("@/lib/syna-agent/journey");
  const { cielCommun, cleDuProjet, ouvrirAuxVisites, visiteDuProjet, derniereEtape } = await import("@/lib/ciel/ciel-commun");
  const { placesCommun } = await import("@/lib/ciel/vue");

  const dit = (value: string) => ({ value, status: "answered" as const, source: "client" as const, at: 1 });
  /** Un client, son projet avec une marque, une fiche et deux étapes finies. */
  const client = async () => {
    const user = await account(), projectId = project(user) as string;
    run("UPDATE projects SET sector='batiment', store_url='https://exemple.invalid', brand_json=? WHERE id=?", JSON.stringify({ name: "Copeau", tagline: "Le bois qui reste.", palette: { primary: "#D9A066" }, logo: { assetId: "logo-secret" } }), projectId);
    J.updateJourney(threadFor(user, projectId), (j) => { J.setStep(j, 0, "done"); J.setStep(j, 1, "done"); j.start.offer = dit("Mes tarifs confidentiels"); j.notes = [{ sujet: "objectifs", value: "Note privée", at: 1 }]; });
    return { user, projectId };
  };

  it("un projet verrouillé : une constellation anonyme, sans nom, sans couleurs, sans avancement, sans son vrai numéro", async () => {
    const a = await client(), b = await client();
    const vu = cielCommun(b.user.id).autres.find((x) => x.cle === cleDuProjet(a.projectId))!;
    expect(vu).toBeTruthy();
    expect(vu.ouvert).toBe(false);
    expect(Object.keys(vu).sort()).toEqual(["cle", "dernier", "endormi", "forme", "metier", "ouvert"]);
    const texte = JSON.stringify(cielCommun(b.user.id));
    for (const secret of [a.projectId, "Copeau", "D9A066", "tarifs confidentiels", "Note privée", "logo-secret"]) expect(texte).not.toContain(secret);
    // Ses propres projets ne sont pas dans « les autres ».
    expect(cielCommun(a.user.id).autres.some((x) => x.cle === cleDuProjet(a.projectId))).toBe(false);
    // Verrouillé : pas de visite possible.
    expect(visiteDuProjet(cleDuProjet(a.projectId), b.user.id)).toBeNull();
  });

  it("ouvrir son projet est le choix de son propriétaire, et de lui seul ; il le referme quand il veut", async () => {
    const a = await client(), b = await client();
    expect(ouvrirAuxVisites(b.user.id, a.projectId, true)).toBe(false);
    expect(one<{ o: number }>("SELECT ciel_ouvert o FROM projects WHERE id=?", a.projectId)!.o).toBe(0);
    expect(ouvrirAuxVisites(a.user.id, a.projectId, true)).toBe(true);
    const vu = cielCommun(b.user.id).autres.find((x) => x.cle === cleDuProjet(a.projectId))!;
    expect(vu).toMatchObject({ ouvert: true, nom: "Copeau" });
    expect(vu.etats!.slice(0, 2)).toEqual(["fait", "cours"]);
    expect(ouvrirAuxVisites(a.user.id, a.projectId, false)).toBe(true);
    expect(cielCommun(b.user.id).autres.find((x) => x.cle === cleDuProjet(a.projectId))!.nom).toBeUndefined();
  });

  it("la visite d'un projet ouvert : sa marque et son site, jamais ce que le client a dit à SINA ni son logo ; elle est notée pour la comète", async () => {
    const a = await client(), b = await client();
    ouvrirAuxVisites(a.user.id, a.projectId, true);
    const v = visiteDuProjet(cleDuProjet(a.projectId), b.user.id)!;
    expect(v.data.name).toBe("Copeau");
    expect(v.data.brand).toMatchObject({ name: "Copeau", slogan: "Le bois qui reste.", logo: null });
    expect(v.site).toBe("https://exemple.invalid");
    expect(v.data.fiche).toEqual([]);
    expect(v.data.notes).toEqual([]);
    expect(v.data.angle).toBeNull();
    expect(JSON.stringify(v)).not.toMatch(/tarifs confidentiels|Note privée|logo-secret/);
    expect(JSON.stringify(v)).not.toContain(a.projectId);
    // Le propriétaire voit passer la visite ; une seconde visite de la même personne dans le quart d'heure ne compte pas deux fois.
    visiteDuProjet(cleDuProjet(a.projectId), b.user.id);
    expect(cielCommun(a.user.id).regards.filter((r) => r.projectId === a.projectId)).toHaveLength(1);
    // Sa propre visite ne fait pas passer de comète, et les autres ne voient pas ses visites.
    visiteDuProjet(cleDuProjet(a.projectId), a.user.id);
    expect(cielCommun(a.user.id).regards.filter((r) => r.projectId === a.projectId)).toHaveLength(1);
    expect(cielCommun(b.user.id).regards.some((r) => r.projectId === a.projectId)).toBe(false);
  });

  it("en direct et en pause : l'heure de la dernière étape finie, et le sommeil d'un projet en pause", async () => {
    const a = await client(), b = await client();
    expect(derniereEtape(a.projectId)).toBeGreaterThan(0);
    run("UPDATE projects SET status='paused' WHERE id=?", a.projectId);
    const vu = cielCommun(b.user.id).autres.find((x) => x.cle === cleDuProjet(a.projectId))!;
    expect(vu.endormi).toBe(true);
    expect(vu.dernier).toBe(derniereEtape(a.projectId));
  });

  it("les amas par métier : chaque métier a son amas, loin du centre, et deux constellations ne sont jamais au même endroit", () => {
    const astres = [...Array.from({ length: 12 }, (_, i) => ({ cle: `b${i}`, metier: "batiment" })), ...Array.from({ length: 5 }, (_, i) => ({ cle: `r${i}`, metier: "restauration" })), { cle: "x", metier: null }];
    const { places, amas } = placesCommun(astres);
    expect(amas.map((a) => [a.metier, a.n])).toEqual([["", 1], ["batiment", 12], ["restauration", 5]]);
    expect(placesCommun([...astres].reverse()).places).toEqual(places);
    const pts = Object.values(places);
    for (let i = 0; i < pts.length; i++) {
      expect(Math.hypot(pts[i].x, pts[i].y)).toBeGreaterThan(1400);
      for (let j = 0; j < i; j++) expect(Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y)).toBeGreaterThan(260);
    }
  });
});
