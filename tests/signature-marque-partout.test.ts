/**
 * Signature (slogan) changée dans l'onglet Marque (cas réel : Les Tribunes, « La lavande en tribune » remplacée) :
 * le site l'affiche aussitôt dans une nouvelle version du thème, sans IA ; l'ancienne version reste restaurable.
 */
import { describe, expect, it } from "vitest";

describe("Nouvelle signature de marque appliquée au site", async () => {
  const { replaceTagline, applyTaglineToSite } = await import("@/lib/workflow/propagation");
  const { createUser } = await import("@/lib/auth");
  const { seedThemeScenario } = await import("./theme-v2-fixtures");
  const { saveThemeVersion, currentTheme } = await import("@/lib/projects");

  it("remplace la signature en gardant la casse (début de phrase, minuscules, capitales)", () => {
    expect(replaceTagline("La lavande en tribune", "La lavande en tribune", "Portez vos couleurs")).toBe("Portez vos couleurs");
    expect(replaceTagline("<p>Les Tribunes, la lavande en tribune.</p>", "La lavande en tribune", "Portez vos couleurs")).toBe("<p>Les Tribunes, portez vos couleurs.</p>");
    expect(replaceTagline("LA LAVANDE EN TRIBUNE", "La lavande en tribune", "Portez vos couleurs")).toBe("PORTEZ VOS COULEURS");
    expect(replaceTagline("Rien à voir", "La lavande en tribune", "Portez vos couleurs")).toBe("Rien à voir");
  });

  it("le site prend la nouvelle signature dans une nouvelle version, l'ancienne est conservée", async () => {
    const u = await createUser(`sig${Date.now()}${Math.random().toString(36).slice(2, 6)}@test.fr`, "motdepasse-test", "S");
    const pid = await seedThemeScenario(u.id, "cosmetic");
    const spec = { store: { shopName: "Les Tribunes" }, sections: { footer: { type: "footer", settings: { tagline: "La lavande en tribune" }, blocks: { t: { type: "text", settings: { text: "<p>Les Tribunes, la lavande en tribune.</p>" } } } } }, settings: {}, files: {} } as never;
    const v1 = saveThemeVersion(pid, spec, "v1", "ai");
    expect(applyTaglineToSite(pid, "La lavande en tribune", "Portez vos couleurs")).toBe(true);
    const cur = currentTheme(pid)!;
    expect(cur.version.id).not.toBe(v1.id);
    const json = JSON.stringify(cur.spec);
    expect(json).toContain("Portez vos couleurs");
    expect(json).toContain("Les Tribunes, portez vos couleurs.");
    expect(json).not.toMatch(/lavande en tribune/i);
    // Déjà à jour : aucune nouvelle version.
    expect(applyTaglineToSite(pid, "La lavande en tribune", "Portez vos couleurs")).toBe(false);
  });
});
