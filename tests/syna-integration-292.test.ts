/**
 * Recette #292 : la coquille Encre / Plein cadre avec le moteur SYNA de Codex.
 * - Plein cadre sur tablette : la feuille SYNA s'arrête au-dessus de la barre de commande (défaut trouvé par la recette).
 * - Une seule conversation : la coquille rend le ConversationPanel de Codex, qui porte la confirmation gratuite (#291).
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "..");
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");

describe("recette d'intégration #292", () => {
  it("Plein cadre, tablette : la feuille SYNA laisse la place de la barre de commande", () => {
    const css = read("src/components/studio/syna-shell.css");
    const rule = css.match(/\.syna-ui\[data-syna-mode="plein"\] \.ss-panel\.is-overlay \{[^}]*\}/)?.[0] ?? "";
    expect(rule).toMatch(/bottom: calc\(96px \+ env\(safe-area-inset-bottom, 0px\)\)/);
    // Le téléphone garde sa propre règle (au-dessus de la zone de commande et du clavier virtuel).
    expect(css).toMatch(/@media \(max-width: 1023px\)[\s\S]*?\.ss-panel\.is-overlay \{ top: auto;[^}]*bottom: calc\(var\(--ss-kb, 0px\) \+ 72px/);
  });
  it("une seule conversation, celle qui porte la confirmation gratuite de Codex", () => {
    const shell = read("src/components/studio/syna-shell.tsx");
    expect(shell.match(/<ConversationPanel /g)?.length).toBe(1);
    const panel = read("src/components/studio/conversation-panel.tsx");
    expect(panel).toContain("useLocalSiteConfirmation");
    expect(panel).toContain("ConversationLocalSite");
  });
});

describe("recette #301 : la coquille ne recouvre jamais les fenêtres natives du Studio", () => {
  it("barre du téléphone et feuilles Espaces / Suivi sous les modales natives (z 90), au-dessus de la conversation SYNA (45)", () => {
    const css = read("src/components/studio/syna-shell.css");
    const z = (sel: string) => Number(css.match(new RegExp(sel.replace(/[.]/g, "\\.") + " \\{[^}]*?z-index: (\\d+)"))?.[1]);
    const ui = read("src/components/ui.tsx");
    const modal = Number(ui.match(/className="fixed inset-0 z-\[(\d+)\] flex items-end justify-center/)?.[1]);
    expect(modal).toBe(90);
    for (const sel of [".syna-ui .ss-tabbar", ".syna-ui .ss-sheet-layer"]) {
      expect(z(sel)).toBeGreaterThan(45);
      expect(z(sel)).toBeLessThan(60);
    }
    expect(z(".syna-ui .ss-tabbar")).toBeGreaterThan(z(".syna-ui .ss-sheet-layer"));
  });
});
