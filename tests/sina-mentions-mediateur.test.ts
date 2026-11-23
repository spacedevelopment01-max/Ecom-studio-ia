/**
 * Le médiateur de la consommation et l'hébergeur dans les mentions (recherche 04, 22 novembre 2026) : demandés au
 * client à l'étape de l'activité, bloquants tant qu'ils manquent, et donnés tels quels au rédacteur du site.
 */
import fs from "node:fs";
import { describe, expect, it } from "vitest";

process.env.STUDIO_SYNA_AGENT = "1";

describe("médiateur et hébergeur", async () => {
  const Act = await import("@/lib/syna-agent/activity");
  it("demandés, obligatoires, et donnés au rédacteur des informations légales", () => {
    const m = Act.COMPANY_FIELDS.find((f) => f.key === "mediateur")!, h = Act.COMPANY_FIELDS.find((f) => f.key === "hebergeur")!;
    expect(m.required).toBe(true);
    expect(h.required).toBe(true);
    expect(m.question).toMatch(/obligatoire dès qu'on vend à des particuliers/);
    expect(m.question).toMatch(/entreprendre\.service-public\.gouv\.fr/);
    const brand = fs.readFileSync("src/lib/syna-agent/custom-theme/brand.ts", "utf8");
    expect(brand).toContain("Médiateur de la consommation (à écrire dans les informations légales, tel quel) : ${plan.company.mediateur}.");
    expect(brand).toContain("Hébergeur du site (à écrire dans les mentions légales, tel quel) : ${plan.company.hebergeur}.");
  });
  it("tant qu'ils manquent, l'activité ne se valide pas", () => {
    const gaps = Act.activityGaps({ company: { legalName: "X", email: "a@b.fr", address: "Y", shipping: "Z", returns: "W" }, none: [], missing: Act.COMPANY_FIELDS.filter((f) => f.key === "mediateur" || f.key === "hebergeur").map(({ key, question, required }) => ({ key, question, required })), angle: { id: "a" }, products: [{ id: "p", title: "P", price: 1, status: "active" }], offer: { price: null, facts: [] }, keyMessages: [], objections: [], at: 0 } as never);
    expect(gaps).toEqual(["médiateur de la consommation", "hébergeur du site"]);
  });
});
