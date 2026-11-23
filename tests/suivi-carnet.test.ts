/**
 * Le carnet de clients qui sépare « relation » et « offre » (recherche 08, point 9), sans aucun envoi : origine, accord
 * daté, fin à trois ans, demande d'avis aux seuls vrais clients, une fois, sans offre ; corriger, refuser, effacer.
 */
import { describe, expect, it } from "vitest";

describe("suivi : le carnet de clients", async () => {
  const { runWithLang } = await import("@/lib/i18n-server");
  const C = await import("@/lib/suivi/carnet");
  const fr = <T,>(fn: () => Promise<T> | T) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());
  const pid = () => `carnet-${Math.random()}`;
  const t0 = Date.UTC(2026, 0, 10);

  it("une même personne n'a qu'une fiche ; une origine de vrai client l'emporte ; un e-mail ou un téléphone est exigé", async () => {
    const p = pid();
    C.noter(p, { nom: "Julie Petit", email: "Julie@x.fr", origine: "demande", at: t0 });
    const f = C.noter(p, { nom: "", email: "julie@x.fr", telephone: "06 12 34 56 78", origine: "devis-signe", at: t0 + 1000 });
    expect(C.carnet(p)).toHaveLength(1);
    expect(f).toMatchObject({ nom: "Julie Petit", origine: "devis-signe", telephone: "0612345678", dernier_contact_at: t0 + 1000 });
    expect(C.noter(p, { nom: "", telephone: "0612345678", origine: "demande", at: t0 + 2000 }).origine).toBe("devis-signe");
    await expect(fr(() => C.noter(p, { nom: "X", origine: "ajout" }))).rejects.toThrow(/e-mail ou un téléphone/);
  });

  it("relation à tous ; offre seulement avec un accord daté, ou à un vrai client pour des produits semblables ; rien après trois ans ou un refus", async () => {
    const p = pid();
    const prospect = C.noter(p, { nom: "Paul", email: "p@x.fr", origine: "demande", at: t0 });
    const client = C.noter(p, { nom: "Anne", email: "a@x.fr", origine: "achat", at: t0 });
    const accord = C.noter(p, { nom: "Léa", email: "l@x.fr", origine: "demande", at: t0, accordOffre: { source: "case cochée sur le formulaire" } });
    await fr(() => {
      expect(C.peutRecevoir(prospect, "relation", { at: t0 }).oui).toBe(true);
      expect(C.peutRecevoir(prospect, "offre", { at: t0 })).toEqual({ oui: false, raison: "pas d'accord écrit pour recevoir des offres" });
      expect(C.peutRecevoir(client, "offre", { at: t0 }).oui).toBe(false);
      expect(C.peutRecevoir(client, "offre", { at: t0, semblable: true }).oui).toBe(true);
      expect(C.peutRecevoir(accord, "offre", { at: t0 }).raison).toBe("accord donné le 2026-01-10 (case cochée sur le formulaire)");
      expect(C.peutRecevoir(client, "relation", { at: t0 + C.TROIS_ANS + 1 }).oui).toBe(false);
    });
    C.refuse(p, accord.id, t0 + 5);
    const apres = C.carnet(p).find((x) => x.id === accord.id)!;
    expect(await fr(() => C.peutRecevoir(apres, "relation", { at: t0 + 10 }))).toEqual({ oui: false, raison: "cette personne a demandé à ne plus être contactée" });
  });

  it("la demande d'avis : vrais clients seulement, une seule fois, avec le lien, jamais d'offre dedans", async () => {
    const p = pid();
    const prospect = C.noter(p, { nom: "Paul", email: "p@x.fr", origine: "demande", at: t0 });
    const client = C.noter(p, { nom: "Anne Roux", email: "a@x.fr", origine: "chantier", at: t0 });
    const lien = "https://g.page/r/abc/review";
    await fr(() => {
      expect(C.demandeAvis(prospect, { lienAvis: lien, prenomPro: "Marc", at: t0 })).toEqual({ ok: false, raison: "ce n'est pas encore un client (seulement une demande)" });
      const r = C.demandeAvis(client, { lienAvis: lien, prenomPro: "Marc", at: t0 });
      expect(r).toEqual({ ok: true, message: `Bonjour Anne, merci encore de ta confiance. Si tu as deux minutes, ton avis sur Google aiderait beaucoup : ${lien} — Marc` });
      expect(C.demandeAvis(client, { lienAvis: lien, prenomPro: "Marc", message: "Laisse un avis et reçois -10 % !", at: t0 })).toMatchObject({ ok: false, raison: expect.stringMatching(/jamais d'offre/) });
      expect(C.demandeAvis(client, { lienAvis: "", prenomPro: "Marc", at: t0 })).toMatchObject({ ok: false });
    });
    C.marquerAvisDemande(client.id, t0 + 1);
    const deja = C.carnet(p).find((x) => x.id === client.id)!;
    expect(await fr(() => C.demandeAvis(deja, { lienAvis: lien, prenomPro: "Marc", at: t0 + 2 }))).toMatchObject({ ok: false, raison: expect.stringMatching(/jamais deux fois/) });
  });

  it("corriger, effacer, et l'effacement seul à trois ans", () => {
    const p = pid();
    const f = C.noter(p, { nom: "Anne", email: "a@x.fr", origine: "achat", at: t0 });
    C.corriger(p, f.id, { nom: "Anne Roux", telephone: "07 00 00 00 01" });
    expect(C.carnet(p)[0]).toMatchObject({ nom: "Anne Roux", email: "a@x.fr", telephone: "0700000001" });
    C.purgerCarnet(t0 + C.TROIS_ANS + 10);
    expect(C.carnet(p)).toHaveLength(0);
    const g = C.noter(p, { nom: "B", email: "b@x.fr", origine: "ajout" });
    C.effacer(p, g.id);
    expect(C.carnet(p)).toHaveLength(0);
  });
});
