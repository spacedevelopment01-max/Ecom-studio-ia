import { describe, expect, it } from "vitest";
import { emptyProduct } from "@/lib/project-types";
import { withContentLang } from "@/lib/i18n-server";

/** Mots-outils français courants : aucun ne doit apparaître dans un contenu anglais. */
const FRENCH = /\b(le|la|les|des|du|une|est|et|pour|avec|vous|voici|regardez|sur|dans|au choix|découvrir|lien|vidéo|générée|produit)\b|[«»]|\s[:;?!]/i;

const productEn = {
  ...emptyProduct(),
  name: "Glow Serum",
  sector: "beaute" as const,
  facts: [
    { key: "capacity", label: "Capacity", value: "30 ml", status: "confirmed" as const, source: "photo" as const },
    { key: "shipping", label: "Shipping", value: "", status: "unknown" as const, source: "ai" as const },
  ],
  variants: [{ name: "Color", values: ["Amber", "Clear"] }],
};

describe("médias créés en anglais", () => {
  it("script UGC local entièrement en anglais, honnête et conforme aux règles", async () => {
    const { localUgcScript } = await import("@/lib/engine/ugc");
    const { ugcIssues } = await import("@/lib/ugc-rules");
    const p = { product: productEn, brand: { name: "Lumen" } } as any;
    for (const angle of ["presentation", "deballage"]) {
      const s = withContentLang("en", () => localUgcScript(p, { format: "9:16", beats: 4, presenter: "femme", age: "25-35", setting: "salle-de-bain", tone: "naturel", angle, url: "lumen.com" }));
      expect(s.beats).toHaveLength(4);
      const text = [s.concept, ...s.beats.flatMap((b) => [b.line, b.caption])].join(" \n ");
      expect(text, text).not.toMatch(FRENCH);
      expect(s.beats[0].line).toContain("Glow Serum");
      expect(text).toContain("30 ml");
      expect(s.beats[3].line).toContain("lumen.com");
      // Sous-titres courts (lecture au téléphone) et répliques tenant en 8 s.
      for (const b of s.beats) expect(b.caption.length).toBeLessThanOrEqual(64);
      expect(ugcIssues(s)).toEqual([]);
    }
  });

  it("le français reste inchangé par défaut", async () => {
    const { localUgcScript, aiLabel } = await import("@/lib/engine/ugc");
    const p = { product: productEn, brand: { name: "Lumen" } } as any;
    const s = localUgcScript(p, { format: "9:16", beats: 2, presenter: "femme", age: "25-35", setting: "salon", tone: "naturel", angle: "presentation" });
    // Accroche de créateur (geste + produit nommé), puis démonstration et appel (structure UGC du studio).
    expect(s.beats[0].line).toBe("Attendez, regardez ce que j'ai dans la main : Glow Serum.");
    expect(s.beats[1].line).toBe("Premier détail à voir : 30 ml. Le lien pour le découvrir est juste en dessous de la vidéo.");
    expect(aiLabel()).toBe("Vidéo générée par IA");
  });

  it("mention IA, consigne de voix et pastilles des visuels en anglais", async () => {
    const { aiLabel, beatPrompt, localUgcScript } = await import("@/lib/engine/ugc");
    const { confirmedFacts } = await import("@/lib/engine/images");
    const p = { product: productEn, brand: { name: "Lumen" } } as any;
    const o = { format: "9:16" as const, beats: 2, presenter: "homme", age: "35-50", setting: "cuisine", tone: "expert", angle: "demonstration" };
    withContentLang("en", () => {
      expect(aiLabel()).toBe("AI-generated video");
      const script = localUgcScript(p, o);
      const prompt = beatPrompt(script, 0, o, true);
      expect(prompt).toContain("says in English");
      expect(prompt).not.toContain("French");
      const facts = confirmedFacts(p);
      expect(facts).toContain("2 colors available");
      for (const f of facts) expect(f).not.toMatch(FRENCH);
    });
    expect(confirmedFacts(p)).toContain("2 colors au choix");
  });

  it("bibliothèque de prompts : version anglaise complète, mêmes identifiants", async () => {
    const { libraryPrompts, categories, sectorData, fillPrompt, PROMPT_STATS } = await import("@/lib/prompts-library");
    const fr = libraryPrompts("fr");
    const en = libraryPrompts("en");
    expect(en).toHaveLength(PROMPT_STATS.total);
    expect(en.map((p) => p.id)).toEqual(fr.map((p) => p.id));
    expect(fr[0].body).toContain("## Contexte");
    for (const p of en) {
      const all = [p.title, p.sectorLabel, p.categoryLabel, p.group, p.body].join("\n");
      expect(all, p.id).not.toMatch(/[«»àâçéèêëîïôûùœ]|\s[:;?!](\s|$)/);
      expect(p.body).toContain("## Context");
      expect(p.body).toContain("[To complete: …]");
    }
    expect(categories("en").map((c) => c.label)).toContain("Instagram carousel");
    expect(sectorData("en").map((s) => s.id)).toEqual(sectorData("fr").map((s) => s.id));
    expect(withContentLang("en", () => libraryPrompts()[0].body)).toContain("## Context");
    expect(withContentLang("en", () => fillPrompt("{{inconnu}}", {}))).toBe("[inconnu: to specify]");
  });
});
