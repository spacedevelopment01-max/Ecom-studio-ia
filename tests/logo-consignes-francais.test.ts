/**
 * Consignes envoyées au modèle d'images pour les LOGOS : en français (règle du propriétaire), concrètes, et seuls les
 * textes à écrire dans le logo entre guillemets (jamais le nom de la direction créative).
 */
import { describe, expect, it } from "vitest";

describe("consignes des logos en français", () => {
  it("logo complet (moteur Logo V2) : demande, styles, composition et typographie en français ; seuls les textes voulus entre guillemets", async () => {
    const { artworkPrompt, STYLE_GUIDE } = await import("@/lib/logo-v2/artwork");
    const brief = { name: "Racines & Pierres", activity: "paysagiste", activities: ["Paysagiste", "Dallage"], trade: { label: "paysagiste", actions: [] }, palette: { primary: "#2F4A3A", secondary: "#B9A27E", accent: "#C46A3C", light: "#F4F0E8", dark: "#1E2621" }, paletteLocked: true, tagline: null } as any;
    const t = { id: "t1", name: "Atelier du jardin", concept: "une feuille et une pierre réunies", style: "emblem", markType: "emblem", composition: "stacked", typography: { style: "classic_serif", weight: "bold", case: "upper", tracking: "wide", rationale: "" }, colorRole: { ink: "dark", accent: "accent" }, symbolIdea: "une feuille posée sur une pierre plate", descriptor: "PAYSAGISTE • DALLAGE", distinctive: "", avoid: [], sobriety: 3, construction: "illustrative" } as any;
    const p = artworkPrompt(t, brief, "feuille plus grande");
    expect(p).toContain("Dessine un beau logo professionnel pour « Racines & Pierres », paysagiste (Dallage).");
    expect(p).toContain(STYLE_GUIDE.emblem);
    expect(p).toContain("Composition : symbole au-dessus du nom, centré. Typographie : police à empattements classique, graisse grasse.");
    expect(p).toContain("« RACINES & PIERRES »");
    expect(p).toContain("« PAYSAGISTE • DALLAGE »");
    expect(p).toContain("Changements pour cette version : feuille plus grande.");
    // Le nom de la direction n'est pas entre guillemets (le modèle l'écrirait) ; aucune phrase anglaise.
    expect(p).not.toMatch(/«\s*Atelier du jardin|"Atelier du jardin"/);
    const quoted = [...p.matchAll(/«\s*([^»]+?)\s*»/g)].map((m) => m[1]);
    expect(quoted).toEqual(["Racines & Pierres", "RACINES & PIERRES", "PAYSAGISTE • DALLAGE"]);
    expect(p).not.toMatch(/\b(Design|logo for|The name|Colours|Spell|background|Changes for)\b/);
    for (const g of Object.values(STYLE_GUIDE)) expect(g).toMatch(/^Logo [A-ZÀÉÈ]/);
  });

  it("brief du directeur artistique demandé en français ; citations remplacées par « le nom » et « la ligne d'activités »", async () => {
    const { TERRITORIES_SYSTEM } = await import("@/lib/logo-v2/ai");
    const { briefWithoutText } = await import("@/lib/logo-v2/artwork");
    expect(TERRITORIES_SYSTEM()).toContain("imageBrief (EN FRANÇAIS");
    expect(TERRITORIES_SYSTEM()).not.toContain("EN ANGLAIS");
    expect(briefWithoutText("Le nom « Racines & Pierres » en capitales, « PAYSAGES » dessous", "Racines & Pierres")).toBe("Le nom le nom en capitales, la ligne d'activités dessous");
  });
});
