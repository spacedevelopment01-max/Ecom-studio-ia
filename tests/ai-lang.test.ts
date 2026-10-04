import { describe, expect, it } from "vitest";
import { runWithLang, withContentLang } from "@/lib/i18n-server";
import { systemText } from "@/lib/ai/llm";
import { systemPrompts } from "@/lib/ai/prompts";
import { lintClaims } from "@/lib/ai/tasks";
import { product } from "./fixtures";

describe("langue des consignes envoyées à l'IA", () => {
  it("par défaut, contenus et interface en français", () => {
    const s = systemText({ system: systemPrompts("fr").copy });
    expect(s.startsWith("<langue_de_sortie>")).toBe(true);
    expect(s).toContain("LANGUE DES CONTENUS : français");
    expect(s).toContain("[À compléter : …]");
    expect(s).not.toContain("[To complete");
  });

  it("sous withContentLang(\"en\"), la consigne système impose l'anglais pour les contenus, l'interface reste en français", () => {
    runWithLang({ ui: "fr" }, () =>
      withContentLang("en", () => {
        const s = systemText({ system: systemPrompts("en").copy });
        expect(s.startsWith("<langue_de_sortie>")).toBe(true);
        expect(s).toContain("LANGUE DES CONTENUS : anglais (américain)");
        expect(s).toContain("LANGUE DE L'INTERFACE : français");
        expect(s).toContain("[To complete: …]");
        expect(s).not.toContain("À compléter");
        expect(s).toContain("Anglais impeccable");
      }),
    );
  });

  it("le préfixe système est stable pour une même combinaison de langues (cache)", () => {
    const a = withContentLang("en", () => systemText({ system: systemPrompts("en").brand }));
    const b = withContentLang("en", () => systemText({ system: systemPrompts("en").brand }));
    expect(a).toBe(b);
    expect(a).toContain("facile à prononcer et à retenir en anglais");
  });

  it("le contrôle des allégations repère aussi les affirmations anglaises", () => {
    const issues = lintClaims({ hero: "Certified organic serum with free shipping" }, { product } as any);
    expect(issues.length).toBeGreaterThanOrEqual(2);
  });
});
