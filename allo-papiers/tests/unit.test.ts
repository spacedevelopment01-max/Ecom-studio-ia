import { describe, expect, it } from "vitest";
import { sanitizeAnalysis } from "@/lib/ai/sanitize";
import { EXAMPLES } from "@/lib/examples";
import { AnalysisSchema } from "@/lib/ai/schema";
import { letterPdf, toWinAnsi } from "@/lib/pdf";
import { normalizeRecord, addressesConflict } from "@/lib/annuaire";
import { contentHash } from "@/lib/sends";
import { daysBetween, isIsoDate, parisMonth } from "@/lib/time";
import { PDFDocument } from "pdf-lib";

const base = () => structuredClone(EXAMPLES[0].analysis);

describe("Règles de prudence de l'analyse", () => {
  it("les exemples fictifs respectent le schéma", () => {
    for (const e of EXAMPLES) expect(() => AnalysisSchema.parse(e.analysis)).not.toThrow();
  });
  it("retire une date « écrite » sans citation", () => {
    const a = base();
    a.date_limite.source = null;
    const r = sanitizeAnalysis(a, 1, "2026-10-04");
    expect(r.date_limite.date).toBeNull();
    expect(r.incertitudes.join(" ")).toMatch(/pas retenue/);
  });
  it("retire une date « calculée » sans calcul explicite", () => {
    const a = base();
    a.date_limite.nature = "calculee";
    a.date_limite.calcul = null;
    expect(sanitizeAnalysis(a, 1, "2026-10-04").date_limite.date).toBeNull();
  });
  it("retire une date invalide", () => {
    const a = base();
    a.date_limite.date = "2026-02-31";
    expect(sanitizeAnalysis(a, 1, "2026-10-04").date_limite.date).toBeNull();
  });
  it("requalifie une conséquence « écrite » sans citation", () => {
    const a = base();
    a.consequences.source = null;
    const r = sanitizeAnalysis(a, 1, "2026-10-04");
    expect(r.consequences.fondement).toBe("non_precise_dans_document");
  });
  it("supprime les citations de pages qui n'existent pas", () => {
    const a = base();
    a.passages_sources.push({ element: "x", page: 9, citation: "inventé" });
    expect(sanitizeAnalysis(a, 1, "2026-10-04").passages_sources.every((p) => p.page === 1)).toBe(true);
  });
  it("passe en rouge si la date limite écrite est dans moins de 8 jours", () => {
    const r = sanitizeAnalysis(base(), 1, "2026-10-20");
    expect(r.urgence.niveau).toBe("rouge");
  });
  it("retire une adresse non citée", () => {
    const a = base();
    a.destinataire!.source.citation = "";
    expect(sanitizeAnalysis(a, 1, "2026-10-04").destinataire).toBeNull();
  });
});

describe("PDF", () => {
  it("produit un vrai PDF avec accents, € et plusieurs pages si besoin", async () => {
    const pdf = await letterPdf({
      sender: { name: "Élodie Œuvray", lines: ["12 rue de l'Église", "75001 Paris"] },
      recipient: { name: "Société Exemple", lines: ["1 avenue Test", "69001 Lyon"] },
      place: "Paris",
      date: "4 octobre 2026",
      subject: "Réclamation – facture de 120,50 €",
      body: "Madame, Monsieur,\n\n" + "Ceci est un paragraphe « long » avec des accents éèàçù. ".repeat(120),
      closing: "Je vous prie d'agréer…",
      signature: "Élodie Œuvray",
    });
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    const doc = await PDFDocument.load(pdf);
    expect(doc.getPageCount()).toBeGreaterThan(1);
  });
  it("remplace les caractères non imprimables", () => {
    expect(toWinAnsi("Bonjour 👋 “test” – ok")).toBe('Bonjour ? "test" - ok');
  });
});

describe("Annuaire officiel", () => {
  it("décode un enregistrement (champs JSON) sans rien inventer", () => {
    const o = normalizeRecord({
      id: "abc",
      nom: "France services de Test",
      pivot: JSON.stringify([{ type_service_local: "france_services" }]),
      adresse: JSON.stringify([{ type_adresse: "Adresse", numero_voie: "1 place de la Mairie", code_postal: "01000", nom_commune: "Testville", latitude: "46.2", longitude: "5.2" }]),
      telephone: JSON.stringify([{ valeur: "01 23 45 67 89" }]),
      plage_ouverture: JSON.stringify([{ nom_jour_debut: "Lundi", nom_jour_fin: "Vendredi", valeur_heure_debut_1: "09:00:00", valeur_heure_fin_1: "12:00:00" }]),
      date_modification: "2026-09-01",
    }, [46.2, 5.2]);
    expect(o.telephone).toBe("01 23 45 67 89");
    expect(o.horaires[0]).toBe("Lundi au Vendredi : 09:00–12:00");
    expect(o.siteInternet).toBeNull();
    expect(o.distanceKm).toBe(0);
  });
  it("détecte une contradiction d'adresse", () => {
    expect(addressesConflict({ postalCode: "75001" }, { postalCode: "75002" })).toBe(true);
    expect(addressesConflict({ postalCode: "75001", line: "1 Rue A" }, { postalCode: "75001", line: "1 rue a" })).toBe(false);
  });
});

describe("Empreinte de validation d'un envoi", () => {
  const x = { body: "Texte", sender: { name: "A", line1: "1", line2: "", postalCode: "75001", city: "Paris" }, recipient: { name: "B", line1: "2", line2: "", postalCode: "69001", city: "Lyon" }, attachments: [], priceCents: 990, currency: "eur", service: "lrar", mode: "test" };
  it("change dès qu'un élément validé change", () => {
    const h = contentHash(x);
    expect(contentHash({ ...x, body: "Texte." })).not.toBe(h);
    expect(contentHash({ ...x, priceCents: 991 })).not.toBe(h);
    expect(contentHash({ ...x, recipient: { ...x.recipient, postalCode: "69002" } })).not.toBe(h);
    expect(contentHash({ ...x })).toBe(h);
  });
});

describe("Dates (Europe/Paris)", () => {
  it("calcule le mois de quota en heure de Paris", () => {
    expect(parisMonth(new Date("2026-10-31T23:30:00Z"))).toBe("2026-11"); // 00:30 à Paris le 1er novembre
  });
  it("valide les dates", () => {
    expect(isIsoDate("2026-02-29")).toBe(false);
    expect(daysBetween("2026-10-04", "2026-10-24")).toBe(20);
  });
});
