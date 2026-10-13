/**
 * « Où en est votre projet ? » : chaque étape n'est cochée que si son résultat existe vraiment (produit renseigné,
 * logo choisi, boutique composée, visuels, vidéo, publications relues, programmées), et la prochaine étape mène au
 * bon onglet.
 */
import { describe, expect, it } from "vitest";
import { projectProgress } from "@/lib/project-progress";

const empty = { product: { name: "", questions: [] }, brand: null, theme: null, counts: {}, posts: {} };

describe("Progression du projet", () => {
  it("projet vide : rien n'est coché, la prochaine étape est le produit", () => {
    const r = projectProgress(empty);
    expect(r.done).toBe(0);
    expect(r.next?.id).toBe("info");
    expect(r.next?.tab).toBe("produit");
  });

  it("une question obligatoire sans réponse garde l'étape produit ouverte ; un logo provisoire ne compte pas", () => {
    const r = projectProgress({ ...empty, product: { name: "Sérum", questions: [{ required: true }] }, brand: { logo: { assetId: "a", provisional: true } } });
    expect(r.steps.find((s) => s.id === "info")!.done).toBe(false);
    expect(r.steps.find((s) => s.id === "logo")!.done).toBe(false);
  });

  it("projet avancé : étapes faites cochées, prochaine étape = relire les publications", () => {
    const r = projectProgress({
      product: { name: "Sérum", questions: [{ required: true, answer: "30 ml" }] },
      brand: { logo: { assetId: "logo1", status: "validated" } },
      theme: { versionId: "v1" },
      counts: { social: 12, video: 2 },
      posts: { review: 28 },
    });
    expect(r.steps.slice(0, 5).every((s) => s.done)).toBe(true);
    expect(r.next?.id).toBe("review");
    expect(r.next?.tab).toBe("publications");
    expect(r.done).toBe(5);
  });

  it("services : la fiche d'activité incomplète garde l'étape « Activité » ouverte ; tout fait → plus de prochaine étape", () => {
    expect(projectProgress({ ...empty, business: "services", missingActivity: 2 }).steps[0]).toMatchObject({ done: false, label: ["Activité renseignée", "Business details"] });
    const all = projectProgress({ business: "services", missingActivity: 0, product: { name: "Atelier" }, brand: { logo: { assetId: "l" } }, theme: {}, counts: { social: 5, video: 1 }, posts: { scheduled: 3, approved: 0 } });
    expect(all.next).toBeNull();
    expect(all.done).toBe(all.steps.length);
  });
});
