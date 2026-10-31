/**
 * SYNA lot 1 bis (#282) : les deux modes de la coquille, rendus réellement (React), à partir des réglages lus sur le
 * serveur. Un seul balisage pour les écrans et la conversation ; seules la mise en page et les accès changent.
 */
import fs from "node:fs";
import path from "node:path";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ data: null as unknown, path: "/studio/p1/boutique" }));
vi.mock("next/navigation", () => ({ usePathname: () => state.path, useRouter: () => ({ push: () => {}, refresh: () => {}, replace: () => {} }) }));
vi.mock("@/components/studio/project-context", () => ({ useProject: () => ({ id: "p1", data: state.data, reload: () => {} }), useOptionalProject: () => ({ id: "p1", data: state.data, reload: () => {} }) }));
vi.mock("@/components/ui", async (original) => ({ ...(await original<object>()), useApi: () => ({ data: { user: { role: "user", email: "x@example.invalid" } }, reload: () => {} }) }));
vi.mock("@/components/billing-client", () => ({ useBilling: () => ({ billing: null }), AiUsageBar: () => null, PlanLink: () => null, QuotaBanner: () => null }));
vi.mock("@/components/studio/conversation-panel", () => ({ ConversationPanel: () => h("div", { "data-conversation-panel": "" }), ConversationDock: () => null }));

import { SynaStudioShell } from "@/components/studio/syna-shell";
import { AgentUiProvider } from "@/components/studio/agent-ui-context";

const root = path.resolve(import.meta.dirname, "..");
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");
state.data = {
  project: { id: "p1", name: "Projet", status: "draft", platform: "shopify", storeUrl: null, createdAt: 1, updatedAt: 1, sectorLabel: "Test", business: "products" },
  business: "products", product: { questions: [] }, services: {}, brand: { name: "SILLON" }, strategy: null, settings: {}, pipeline: null,
  active: [], counts: {}, posts: { review: 0 }, theme: null, logoUrl: null, coverUrl: null, cutoutUrl: null, ai: { llm: false, image: false, video: false }, credits: { usedPct: 0, alert: false, paused: false },
};
function render(account: Record<string, unknown>, agentUi = true, project: Record<string, unknown> | null = null) {
  const child = h("p", { id: "ecran-actuel" }, "Écran de l'espace");
  return renderToStaticMarkup(h(AgentUiProvider, { enabled: agentUi, children: h(SynaStudioShell, { projectId: "p1", initialPrefs: { account, project, updatedAt: 1 }, children: child }) }));
}

describe("deux vrais modes à partir des réglages du serveur", () => {
  it("Encre par défaut : menu complet, onglet signature, commande en tête de la conversation, sélecteur visible", () => {
    const html = render({});
    expect(html).toContain('data-syna-shell="encre"');
    expect(html).toContain('data-variant="rail"');
    expect(html).not.toContain("ss-cmd-zone");
    expect(html).toMatch(/class="ss-modeswitch"[\s\S]*?aria-pressed="true"[^>]*>Encre</);
    expect(html).toContain("lg:grid-cols-[252px_minmax(0,1fr)_auto]");
  });
  it("Plein cadre (réglage du compte) : menu compact, barre de commande dans une zone réservée, plus d'onglet signature", () => {
    const html = render({ mode: "plein", accent: "prusse" });
    expect(html).toContain('data-syna-shell="plein"');
    expect(html).toContain("ss-cmd-zone");
    expect(html).toContain("data-syna-command");
    expect(html).not.toContain('data-variant="rail"');
    expect(html).toContain("lg:grid-cols-[72px_minmax(0,1fr)_auto]");
    expect(html).toContain('data-syna-accent="prusse"');
    expect(html).toMatch(/padding-bottom:calc\(/);
  });
  it("l'exception du projet l'emporte sur le compte", () => {
    expect(render({ mode: "plein" }, true, { mode: "encre" })).toContain('data-syna-shell="encre"');
    expect(render({ mode: "encre" }, true, { mode: "plein" })).toContain('data-syna-shell="plein"');
  });
  it("les conteneurs suivent l'apparence du Studio (jamais deux thèmes mélangés) ; la largeur choisie est posée", () => {
    const html = render({ appearance: "dark", convoWidth: 500 });
    expect(html).not.toContain('data-syna-scheme="dark"');
    expect(html).toContain('data-syna-scheme="auto"');
    expect(html).toContain("--sy-convo-w:500px");
  });
  it("l'écran de l'espace est rendu une seule fois, à la même place, dans les deux modes", () => {
    for (const html of [render({}), render({ mode: "plein" })]) {
      expect(html.match(/id="ecran-actuel"/g)?.length).toBe(1);
      expect(html.indexOf('id="studio-main"')).toBeLessThan(html.indexOf('id="ecran-actuel"'));
    }
  });
  it("SYNA fermée sur l'installation : aucune conversation simulée, la barre ne sert qu'aux commandes d'affichage", () => {
    const html = render({ mode: "plein" }, false);
    expect(html).not.toContain('aria-controls="syna-panel"');
    expect(html).not.toContain("data-conversation-panel");
    expect(html).toContain("Commande d&#x27;affichage");
  });
  it("Personnaliser est accessible depuis l'en-tête dans les deux modes", () => {
    for (const html of [render({}), render({ mode: "plein" })]) expect(html).toMatch(/data-open-customize[^>]*aria-haspopup="dialog"[^>]*aria-controls="ss-customize"/);
  });
});

describe("garanties du code", () => {
  const shell = read("src/components/studio/syna-shell.tsx");
  it("une seule conversation, jamais recréée : un seul ConversationPanel, hors de toute branche de mode", () => {
    expect(shell.match(/<ConversationPanel /g)?.length).toBe(1);
    expect(shell).toContain('<div className="ss-panel-cmd" hidden={plein}>');
  });
  it("raccourci Ctrl / ⌘ + Maj + M ; texte et confirmation de commande partagés entre les deux places de la barre", () => {
    expect(shell).toMatch(/\(e\.ctrlKey \|\| e\.metaKey\) && e\.shiftKey && !e\.altKey && e\.key\.toLowerCase\(\) === "m"/);
    expect(shell.match(/value=\{cmdValue\} onValue=\{setCmdValue\} feedback=\{cmdFeedback\} onFeedback=\{setCmdFeedback\}/g)?.length).toBe(2);
  });
  it("les commandes d'affichage ne passent jamais par une route d'IA", () => {
    const cmd = read("src/components/studio/syna-command.tsx");
    expect(cmd).not.toMatch(/fetch\(|\/api\//);
    expect(cmd).toContain("parseSynaUiCommand");
  });
  it("les réglages s'enregistrent par la seule route des réglages d'affichage, et se resynchronisent au retour sur la page", () => {
    const prefs = read("src/components/studio/syna-prefs.tsx");
    expect([...prefs.matchAll(/fetch\(("|`)([^"`?]+)/g)].map((m) => m[2]).every((u) => u.startsWith("/api/studio/ui-prefs"))).toBe(true);
    expect(prefs).toContain('window.addEventListener("focus", again)');
    expect(prefs).toContain('document.addEventListener("visibilitychange", whenVisible)');
  });
  it("le site du client, son thème et ses exports ne lisent jamais les réglages d'affichage du Studio", () => {
    const walk = (dir: string): string[] => fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(dir, e.name)) : /\.(ts|tsx)$/.test(e.name) ? [path.join(dir, e.name)] : []);
    const files = ["src/lib/theme", "src/lib/cms-v2", "src/lib/sites", "src/app/api/projects/[id]/theme", "theme-base"].filter((d) => fs.existsSync(path.join(root, d))).flatMap(walk);
    expect(files.length).toBeGreaterThan(20);
    expect(files.filter((f) => /syna-ui|studio_ui_prefs|ui-prefs|syna-prefs/.test(read(f)))).toEqual([]);
  });
});
