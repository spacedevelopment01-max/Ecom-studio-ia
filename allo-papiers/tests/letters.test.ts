import { describe, it, expect } from "vitest";
import {
  LETTER_TEMPLATES,
  formatDateFr,
  getTemplate,
  missingRequired,
  visibleQuestions,
} from "../src/lib/letters/catalog";
import type { Answers, LetterTemplate } from "../src/lib/letters/types";

const REQUIRED_IDS = [
  "demission-cdi",
  "demande-entretien-rupture-conventionnelle",
  "fin-periode-essai",
  "rupture-anticipee-cdd-accord",
  "depart-retraite",
  "demande-documents-fin-contrat",
  "explication-fiche-paie",
  "salaire-non-recu",
  "demande-conges",
  "amenagement-horaires",
  "demande-attestation",
  "demande-reparations",
  "restitution-depot-garantie",
  "explication-charges",
  "conge-location-locataire",
  "resiliation-assurance-abonnement",
  "declaration-sinistre",
  "explication-refus-assurance",
  "commande-non-recue",
  "produit-defectueux",
  "demande-remboursement",
  "explication-frais-bancaires",
  "signalement-prelevement",
  "correction-facture",
  "demande-echeancier",
  "demande-administrative",
  "reclamation",
  "relance-notaire",
  "preparation-rdv-avocat",
];

const DATE_RE = /\b\d{1,2}(er)? (janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre) \d{4}\b/g;

/** Remplit toutes les questions (y compris celles révélées par showIf) avec des valeurs d'exemple. */
function sampleAnswers(tpl: LetterTemplate, optionIndex = 0): Answers {
  const a: Answers = {};
  for (let pass = 0; pass < 3; pass++) {
    for (const q of visibleQuestions(tpl, a)) {
      if (a[q.id]) continue;
      switch (q.type) {
        case "date":
          a[q.id] = "2026-10-24";
          break;
        case "money":
          a[q.id] = "120,50";
          break;
        case "number":
          a[q.id] = "3";
          break;
        case "select":
        case "radio": {
          const opts = q.options ?? [];
          a[q.id] = opts[Math.min(optionIndex, opts.length - 1)]?.value ?? "";
          break;
        }
        default:
          a[q.id] = "Exemple de réponse";
      }
    }
  }
  return a;
}

describe("catalogue des courriers", () => {
  it("contient tous les modèles requis", () => {
    for (const id of REQUIRED_IDS) expect(getTemplate(id), id).not.toBeNull();
    expect(getTemplate("inexistant")).toBeNull();
  });

  it("a des identifiants uniques en kebab-case", () => {
    const ids = LETTER_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("a des métadonnées complètes", () => {
    for (const t of LETTER_TEMPLATES) {
      expect(t.title.length, t.id).toBeGreaterThan(0);
      expect(t.description.length, t.id).toBeGreaterThan(0);
      expect(t.keywords.length, t.id).toBeGreaterThan(0);
      expect(t.sending.note.length, t.id).toBeGreaterThan(0);
      expect(t.questions.length, t.id).toBeGreaterThanOrEqual(3);
      expect(t.questions.length, t.id).toBeLessThanOrEqual(8);
      const qids = t.questions.map((q) => q.id);
      expect(new Set(qids).size, t.id).toBe(qids.length);
    }
  });

  it("produit un courrier propre avec des réponses complètes", () => {
    for (const t of LETTER_TEMPLATES) {
      const nbVariants = Math.max(1, ...t.questions.map((q) => q.options?.length ?? 1));
      for (let i = 0; i < nbVariants; i++) {
        const a = sampleAnswers(t, i);
        expect(missingRequired(t, a), t.id).toEqual([]);
        const l = t.build(a);
        expect(l.subject.trim().length, t.id).toBeGreaterThan(0);
        expect(l.body.trim().length, t.id).toBeGreaterThan(0);
        expect(l.checks.length, t.id).toBeGreaterThanOrEqual(2);
        expect(l.checks.length, t.id).toBeLessThanOrEqual(5);
        const all = [l.subject, l.body, ...l.checks].join("\n");
        expect(all, t.id).not.toMatch(/undefined|NaN|\[object Object\]|null/);
        expect(all, t.id).not.toContain("[à compléter");
        expect(l.body, t.id).not.toMatch(/agréer/i);
      }
    }
  });

  it("ne plante pas avec des réponses vides", () => {
    for (const t of LETTER_TEMPLATES) {
      const l = t.build({});
      expect([l.subject, l.body].join("\n"), t.id).not.toMatch(/undefined|NaN/);
    }
  });

  it("formate les dates et montants", () => {
    expect(formatDateFr("2026-10-24")).toBe("24 octobre 2026");
    expect(formatDateFr("2026-03-01")).toBe("1er mars 2026");
    expect(formatDateFr("bad")).toBe("");
    const l = getTemplate("restitution-depot-garantie")!.build(sampleAnswers(getTemplate("restitution-depot-garantie")!));
    expect(l.body).toContain("120,50 €");
    expect(l.body).toContain("24 octobre 2026");
  });

  it("la demande de rupture conventionnelle n'est pas une démission", () => {
    const t = getTemplate("demande-entretien-rupture-conventionnelle")!;
    const body = t.build(sampleAnswers(t)).body.toLowerCase();
    expect(body).not.toContain("je vous informe de ma démission");
    expect(body).not.toContain("démissionner");
    expect(body).not.toContain("ma démission");
    expect(body).toContain("rupture conventionnelle");
    expect(body).toContain("n'est pas une démission");
    expect(t.warning?.toLowerCase()).toContain("pas une démission");
  });

  it("la démission ne calcule aucune date de fin", () => {
    const t = getTemplate("demission-cdi")!;
    const body = t.build({ poste: "Comptable", date_embauche: "2015-03-02", dispense: "non" }).body;
    const dates = body.match(DATE_RE) ?? [];
    expect(dates).toEqual(["2 mars 2015"]);
    expect(body).toContain("préavis");
    expect(t.warning).toMatch(/CDI/);
    expect(t.warning).toMatch(/fonction publique/);
  });

  it("visibleQuestions applique showIf", () => {
    const t = getTemplate("resiliation-assurance-abonnement")!;
    const ids = (a: Answers) => visibleQuestions(t, a).map((q) => q.id);
    expect(ids({})).not.toContain("autre");
    expect(ids({})).not.toContain("date");
    expect(ids({ type: "autre" })).toContain("autre");
    expect(ids({ type: "assurance" })).not.toContain("autre");
    expect(ids({ quand: "date" })).toContain("date");
  });

  it("missingRequired liste les questions obligatoires visibles vides", () => {
    const t = getTemplate("resiliation-assurance-abonnement")!;
    const labels = (q: string) => t.questions.find((x) => x.id === q)!.label;
    const missing = missingRequired(t, { type: "abonnement", quand: "asap" });
    expect(missing).toEqual([labels("numero")]);
    const missing2 = missingRequired(t, { type: "autre", numero: "  ", quand: "date" });
    expect(missing2).toEqual([labels("autre"), labels("numero"), labels("date")]);
    expect(missingRequired(t, { type: "abonnement", numero: "A1", quand: "asap" })).toEqual([]);
  });
});
