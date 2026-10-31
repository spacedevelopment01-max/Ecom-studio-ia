/**
 * SYNA lot 1 (#282) : la coquille SYNA du Studio.
 * - n'apparaît que si l'installation l'active (STUDIO_SYNA_SHELL=1), avec retour possible à l'interface actuelle ;
 * - garde tous les espaces (mêmes adresses, même règle `spaceVisible`, mêmes pastilles) ;
 * - remplace la pastille noire par la colonne SYNA et ses onglets, sans seconde conversation ;
 * - n'affiche aucun accès à SYNA quand ses drapeaux sont fermés.
 * Vrai rendu React, état d'API synthétique : aucune requête, aucun fournisseur.
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
vi.mock("@/components/studio/conversation-panel", () => ({ ConversationPanel: () => h("div", { "data-conversation-panel": "" }), ConversationDock: () => h("button", { className: "fixed bottom-24 right-4 rounded-full bg-ink" }, "SYNA") }));

import { studioShellVariant, synaShellAvailable, synaShellCookie } from "@/lib/syna-ui/studio-shell";
import { SynaStudioShell } from "@/components/studio/syna-shell";
import { StudioShell } from "@/components/studio/shell";
import { AgentUiProvider } from "@/components/studio/agent-ui-context";
import { spaceVisible } from "@/lib/studio-nav";

const root = path.resolve(import.meta.dirname, "..");
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");

function project(business: "products" | "services", direction: string | null) {
  return {
    project: { id: "p1", name: "Projet test", status: "draft", platform: "shopify", storeUrl: null, createdAt: 1, updatedAt: 1, sectorLabel: "Test", business },
    business, product: { questions: [{ q: "?", answer: "" }] }, services: { services: [{ name: "Déjeuner" }], area: "Lyon", phone: "0400000000", hours: "midi", contactMode: "booking", bookingUrl: "https://example.invalid" }, brand: { name: "SILLON" }, strategy: null, settings: {}, pipeline: null,
    active: [], counts: {}, posts: { review: 2 }, theme: direction ? { versionId: "v", number: 1, direction, summary: "", updatedAt: 1 } : null,
    logoUrl: null, coverUrl: null, cutoutUrl: null, ai: { llm: false, image: false, video: false }, credits: { usedPct: 0, alert: false, paused: false },
  };
}
function render(shell: "syna" | "classic", agentUi: boolean, business: "products" | "services" = "products", direction: string | null = null) {
  state.data = project(business, direction);
  const child = h("p", { id: "ecran-actuel" }, "Écran de l'espace");
  const inner = shell === "syna" ? h(SynaStudioShell, { projectId: "p1", children: child }) : h(StudioShell, { projectId: "p1", children: child });
  return renderToStaticMarkup(h(AgentUiProvider, { enabled: agentUi, children: inner }));
}
const navHrefs = (html: string) => {
  const nav = html.slice(html.indexOf('class="ss-nav"'), html.indexOf("ss-side-foot"));
  return [...nav.matchAll(/href="\/studio\/p1\/([\w-]+)"/g)].map((m) => m[1]);
};

describe("activation de la coquille", () => {
  it("fermée par défaut : sans STUDIO_SYNA_SHELL=1, le Studio reste celui d'aujourd'hui", () => {
    expect(synaShellAvailable({})).toBe(false);
    expect(studioShellVariant({}, "syna")).toEqual({ available: false, variant: "classic" });
    expect(studioShellVariant({ STUDIO_SYNA_SHELL: "true" }, undefined).variant).toBe("classic");
  });
  it("ouverte par l'installation, avec retour à l'interface actuelle sur cet appareil", () => {
    expect(studioShellVariant({ STUDIO_SYNA_SHELL: "1" }, undefined)).toEqual({ available: true, variant: "syna" });
    expect(studioShellVariant({ STUDIO_SYNA_SHELL: "1" }, "classic")).toEqual({ available: true, variant: "classic" });
    expect(studioShellVariant({ STUDIO_SYNA_SHELL: "1" }, "syna").variant).toBe("syna");
    expect(synaShellCookie("classic")).toBe("ecs-syna-shell=classic; path=/; max-age=31536000; samesite=lax");
  });
  it("la mise en page du projet choisit la coquille sur le serveur et propose le retour seulement si elle existe", () => {
    const layout = read("src/app/studio/[projectId]/layout.tsx");
    expect(layout).toContain("studioShellVariant(process.env");
    expect(layout).toMatch(/synaShell=\{shell\.available \? <SynaShellSwitch to="syna" \/> : undefined\}/);
    expect(layout).toContain("AgentUiProvider enabled={conversationUiEnabled()}");
  });
});

describe("tous les espaces restent accessibles", () => {
  it("boutique : chaque espace visible a son lien à son adresse actuelle, les espaces d'autres métiers restent masqués", () => {
    const html = render("syna", true, "products", null);
    const hrefs = navHrefs(html);
    for (const id of ["pilote", "produit", "strategie", "marque", "boutique", "catalogue", "rendez-vous", "images", "videos", "publications", "publicites", "blog"]) expect(hrefs, id).toContain(id);
    for (const id of ["carte", "biens", "realisations"]) expect(hrefs, id).not.toContain(id);
    expect(html).toContain('id="ecran-actuel"');
  });
  it("restaurant (Table Saison) : la Carte et les Rendez-vous apparaissent, le Catalogue non — même règle que l'interface actuelle", () => {
    const hrefs = navHrefs(render("syna", true, "services", "table-saison"));
    expect(hrefs).toContain("carte");
    expect(hrefs).toContain("rendez-vous");
    expect(hrefs).not.toContain("catalogue");
    for (const id of hrefs) expect(spaceVisible(id, { business: "services", direction: "table-saison" })).toBe(true);
  });
  it("même ensemble d'espaces que l'interface actuelle (outils avancés compris, repliés comme aujourd'hui)", () => {
    const syna = render("syna", false, "products", null), classic = render("classic", false, "products", null);
    const all = (html: string) => new Set([...html.matchAll(/href="\/studio\/p1\/([\w-]+)"/g)].map((m) => m[1]));
    expect([...all(syna)].sort()).toEqual([...all(classic)].sort());
    expect(syna).toContain("data-nav-advanced");
  });
  it("pastilles conservées : questions sans réponse, publications à valider", () => {
    const html = render("syna", true);
    expect(html).toMatch(/data-space="produit"[\s\S]*?class="ss-badge">1/);
    expect(html).toMatch(/data-space="publications"[\s\S]*?class="ss-badge">2/);
  });
  it("l'espace actif est annoncé (aria-current) et titré", () => {
    const html = render("syna", true);
    expect(html).toMatch(/aria-current="page"[^>]*data-space="boutique"/);
    expect(html).toContain('<h1 class="ss-h1">Boutique</h1>');
  });
});

describe("accès à SYNA", () => {
  it("nouvelle coquille : plus de pastille noire, un onglet signature et un onglet « Syna » au téléphone, une seule conversation", () => {
    const html = render("syna", true);
    expect(html).not.toMatch(/bg-ink[^"]*"[^>]*>SYNA</);
    expect(html).not.toContain("fixed bottom-24 right-4");
    expect(html.match(/data-variant="rail"/g)?.length).toBe(1);
    expect(html.match(/data-variant="tab"/g)?.length).toBe(1);
    expect(html).toContain('aria-controls="syna-panel"');
    expect(html).toContain('aria-expanded="false"');
    // Fermée au premier accès : la conversation n'est montée qu'à l'ouverture (comme l'interface actuelle).
    expect(html).not.toContain("data-conversation-panel");
  });
  it("drapeaux SYNA fermés : aucun accès à SYNA, aucun panneau vide (comme aujourd'hui)", () => {
    const html = render("syna", false);
    expect(html).not.toContain('id="syna-panel"');
    expect(html).not.toContain('aria-controls="syna-panel"');
    expect(html).not.toContain('data-variant="rail"');
    expect(html).not.toContain('data-variant="tab"');
    expect(html).toContain("data-mobile-nav");
  });
  it("interface actuelle (retour arrière) : la pastille d'origine est intacte", () => {
    expect(render("classic", true)).toContain("fixed bottom-24 right-4");
  });
  it("le code de la coquille réutilise la conversation existante et n'écrit pas de second moteur", () => {
    const src = read("src/components/studio/syna-shell.tsx");
    expect(src).toContain('import { ConversationPanel } from "./conversation-panel"');
    expect(src).not.toMatch(/ConversationDock|fetch\(|\/api\/studio-agent/);
    expect(src).toContain("useAgentPanel()");
  });
});

describe("téléphone et retour arrière", () => {
  it("barre basse : Syna · espace actuel · Espaces · Suivi, repérée par le Studio (data-mobile-nav)", () => {
    const html = render("syna", true);
    const bar = html.slice(html.indexOf("data-mobile-nav"));
    expect(bar).toContain('data-variant="tab"');
    expect(bar).toContain(">Boutique<");
    expect(bar).toContain(">Espaces<");
    expect(bar).toContain(">Suivi<");
  });
  it("« Interface actuelle » est proposée dans le menu et dans le pied du menu latéral", () => {
    const html = render("syna", true);
    expect(html.match(/data-syna-shell-switch="classic"/g)?.length).toBeGreaterThanOrEqual(1);
  });
  it("la coquille pose les attributs de présentation Encre (point d'extension du lot 1 bis)", () => {
    const html = render("syna", true);
    expect(html).toContain('data-syna-shell="encre"');
    expect(html).toMatch(/class="syna-ui ss-side-scope[^"]*" data-syna-mode="encre"/);
  });
});

describe("feuille de la coquille enfermée", () => {
  it("chaque sélecteur de syna-shell.css passe par .syna-ui", async () => {
    const { readCss } = await import("./syna-lot0-css");
    const sheet = readCss(path.join(root, "src/components/studio/syna-shell.css"));
    expect(sheet.rules.length).toBeGreaterThan(20);
    expect(sheet.rules.flatMap((r) => r.selectors).filter((s) => !s.includes(".syna-ui"))).toEqual([]);
    for (const k of sheet.keyframes) expect(k).toMatch(/^@keyframes ss-/);
  });
});
