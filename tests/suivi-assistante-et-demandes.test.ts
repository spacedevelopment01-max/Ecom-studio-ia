/**
 * Le suivi dans la durée (recherche 08, points 4 et 5), sans aucun appel réel :
 *  - l'assistante du site se présente comme une IA, ne répond qu'avec la fiche du client, transmet le reste ; éteinte par
 *    défaut (aucune bulle, adresse publique en 404) ;
 *  - les demandes triées en quatre cases (ou « à regarder ») et résumées en cinq champs, par le code ;
 *  - les liens d'un geste : SMS selon le téléphone, WhatsApp, e-mail ; sur ordinateur, pas de SMS.
 */
import { afterEach, describe, expect, it } from "vitest";

describe("suivi : l'assistante du site et la boîte des demandes", async () => {
  const { runWithLang } = await import("@/lib/i18n-server");
  const { setSetting } = await import("@/lib/settings");
  const A = await import("@/lib/suivi/assistante");
  const D = await import("@/lib/suivi/demandes");
  const fr = <T,>(fn: () => Promise<T> | T) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());
  afterEach(() => { setSetting("suivi.assistante", null); setSetting("suivi.envoiGeste", null); delete A.assistanteDeps.ecrire; delete A.assistanteDeps.fiche; });

  it("éteinte par défaut : aucune bulle posée sur le site, aucune réponse", async () => {
    const { avecAssistante } = await import("@/lib/sites/serve");
    const page = "<html><body><p>x</p></body></html>";
    expect(avecAssistante(page, "p")).toBe(page);
    await expect(fr(() => A.repondreVisiteur({ id: "p", userId: "u", name: "N" }, "Bonjour"))).rejects.toThrow(/éteinte/);
    setSetting("suivi.assistante", "1");
    const avec = await fr(() => avecAssistante(page, "p"));
    expect(avec).toMatch(/data-assistante-ia/);
    expect(avec).toMatch(/Assistante IA/);
    expect(avec).toMatch(/je suis l'assistante IA de/);
  });

  it("le premier message dit qu'elle est une IA ; le badge reste au-dessus du champ", async () => {
    expect(await fr(() => A.premierMessage("Atelier Bois", "Marc"))).toBe("Bonjour, je suis l'assistante IA de Atelier Bois. Je réponds avec les informations que Marc m'a données ; pour le reste, je lui transmets ta question.");
    const b = A.bulleAssistante("https://studio.test/api/public/assistante/p", "Bonjour", "Assistante IA");
    expect(b.indexOf('t.textContent=B')).toBeLessThan(b.indexOf("f.appendChild(i)"));
    expect(b).not.toMatch(/<\/script>.*<\/script>/s);
  });

  it("relecture par le code : un prix, un délai ou une promesse hors fiche font transmettre la question", () => {
    const fiche = [{ sujet: "Table en chêne", texte: "prix : 890,00 €" }, { sujet: "Zone", texte: "Lyon et 30 km autour" }];
    expect(A.horsFiche("La table en chêne est à 890,00 €.", fiche)).toEqual([]);
    expect(A.horsFiche("Nous venons jusqu'à 30 km de Lyon.", fiche)).toEqual([]);
    expect(A.horsFiche("Elle est à 790 € et livrée sous 5 jours.", fiche)).toEqual(expect.arrayContaining(["790", "5", "sous 5"]));
    expect(A.horsFiche("La livraison est gratuite.", fiche)).toEqual(["gratuite"]);
  });

  it("une réponse hors fiche est remplacée par la transmission et le formulaire ; une réponse juste passe ; sans fiche, aucun appel ; le plafond transmet", async () => {
    setSetting("suivi.assistante", "1");
    const p = { id: `assist-${Math.random()}`, userId: "u", name: "Atelier" };
    let calls = 0, reponse = "Oui, comptez 12 € et c'est livré demain.";
    A.assistanteDeps.fiche = () => [{ sujet: "Table en chêne", texte: "prix : 890,00 €" }];
    A.assistanteDeps.ecrire = async (_s, prompt) => { calls++; expect(prompt).toMatch(/FAITS \(donnés par lui, les seuls permis\)[\s\S]*890,00/); return { reponse, transmettre: false }; };
    const r = await fr(() => A.repondreVisiteur(p, "Combien ?", { prenom: "Marc" }));
    expect(r).toMatchObject({ transmettre: true, formulaire: true, badge: "Assistante IA" });
    expect(r.reponse).toMatch(/^Je pose la question à Marc/);
    reponse = "La table en chêne est à 890,00 €.";
    expect(await fr(() => A.repondreVisiteur(p, "Combien la table ?"))).toEqual({ reponse, transmettre: false, formulaire: false, badge: "Assistante IA" });
    A.assistanteDeps.fiche = () => [];
    expect((await fr(() => A.repondreVisiteur(p, "Combien ?"))).transmettre).toBe(true);
    expect(calls).toBe(2);
    A.assistanteDeps.fiche = () => [{ sujet: "Table", texte: "prix : 890,00 €" }];
    const { run, id } = await import("@/lib/db");
    const jour = new Date().toISOString().slice(0, 10);
    for (let i = 0; i < A.PLAFOND_JOUR; i++) run("INSERT INTO assistante_echanges(id,project_id,jour,question,reponse,transmis,created_at) VALUES(?,?,?,?,?,?,?)", id(), p.id, jour, "q", "r", 0, Date.now());
    expect(await fr(() => A.repondreVisiteur(p, "Encore une ?"))).toMatchObject({ transmettre: true, formulaire: true, raison: "plafond" });
    expect(calls).toBe(2);
  });

  it("tri : l'urgence passe avant tout ; un message flou va dans « à regarder » ; résumé à cinq champs sans rien deviner", async () => {
    await fr(() => {
      expect(D.trierDemande({ message: "Fuite sous l'évier, c'est urgent !" }).case).toBe("urgence");
      expect(D.trierDemande({ message: "Pouvez-vous me faire un devis pour une terrasse ?" })).toEqual({ case: "devis", raison: "le message demande « devis »" });
      expect(D.trierDemande({ message: "Je voudrais réserver samedi" }).case).toBe("rendez-vous");
      expect(D.trierDemande({ message: "Vous ouvrez le dimanche ?" }).case).toBe("question");
      expect(D.trierDemande({ message: "Bonjour" })).toEqual({ case: "a-regarder", raison: "je ne sais pas la classer : à regarder" });
      expect(D.trierDemande({ message: "Bonjour" }, "devis").case).toBe("devis");
      expect(D.resumerDemande({ name: "Julie Martin", email: "j@m.fr", phone: "06 12 34 56 78", message: "Une terrasse de 20 m²", ville: "Lyon" })).toEqual({ qui: "Julie Martin", quoi: "Une terrasse de 20 m²", ou: "Lyon", quand: "non donné", coordonnees: "j@m.fr · 06 12 34 56 78" });
    });
  });

  it("liens d'un geste : SMS écrit selon le téléphone, WhatsApp au format international, pas de SMS sur ordinateur", async () => {
    await fr(() => {
      expect(D.appareilDe("Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X)")).toBe("iphone");
      expect(D.appareilDe("Mozilla/5.0 (Linux; Android 16)")).toBe("android");
      expect(D.appareilDe("Mozilla/5.0 (Windows NT 10.0)")).toBe("ordinateur");
      expect(D.numeroInternational("06 12 34 56 78")).toBe("33612345678");
      expect(D.numeroInternational("+32 470 12 34 56")).toBe("32470123456");
      expect(D.numeroInternational("12")).toBeNull();
      const t = "Bonjour Julie, je passe jeudi à 9 h & je vous apporte le devis.";
      const ios = D.liensEnvoi(t, { telephone: "06 12 34 56 78", email: "j@m.fr", appareil: "iphone" });
      expect(ios.sms).toBe(`sms:0612345678&body=${encodeURIComponent(t)}`);
      expect(ios.whatsapp).toBe(`https://wa.me/33612345678?text=${encodeURIComponent(t)}`);
      expect(ios.email).toMatch(/^mailto:j@m\.fr\?subject=Votre%20demande&body=/);
      expect(D.liensEnvoi(t, { telephone: "0612345678", appareil: "android" }).sms).toBe(`sms:0612345678?body=${encodeURIComponent(t)}`);
      const pc = D.liensEnvoi(t, { telephone: "0612345678", appareil: "ordinateur" });
      expect(pc.sms).toBeNull();
      expect(pc.copier).toBe(t);
      expect(D.liensEnvoi("x".repeat(D.LONGUEUR_MAX_REPONSE + 1), { appareil: "iphone" }).trop_long).toBe(true);
    });
  });
  it("chaque fonction du suivi a son réglage, éteint par défaut, que seule l'administration peut allumer", async () => {
    const R = await import("@/lib/suivi/reglages");
    const src = (await import("node:fs")).readFileSync("src/app/api/admin/settings/route.ts", "utf8");
    for (const k of Object.keys(R.FONCTIONS_DU_SUIVI) as (keyof typeof R.FONCTIONS_DU_SUIVI)[]) {
      expect(R.suiviAllume(k)).toBe(false);
      expect(src).toContain(k);
    }
  });
});
