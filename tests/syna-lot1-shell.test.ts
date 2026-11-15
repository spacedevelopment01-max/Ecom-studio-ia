/**
 * SINA lot 1 (#282) : la coquille SINA du Studio.
 * - est la seule interface du Studio (plus d'ancienne interface, plus de bascule) ;
 * - pendant la création, sur le tableau de bord : SINA en grand au centre, le tableau de bord à côté ;
 * - garde tous les espaces (mêmes adresses, même règle `spaceVisible`, mêmes pastilles) ;
 * - remplace la pastille noire par la colonne SINA et ses onglets, sans seconde conversation ;
 * - n'affiche aucun accès à SINA quand ses drapeaux sont fermés.
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
vi.mock("@/components/studio/syna-thread", () => ({ SynaThread: () => h("div", { "data-syna-thread-mock": "" }) }));

import { SynaStudioShell } from "@/components/studio/syna-shell";
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
function render(_shell: "syna", agentUi: boolean, business: "products" | "services" = "products", direction: string | null = null, building = false) {
  state.data = project(business, direction);
  const child = h("p", { id: "ecran-actuel" }, "Écran de l'espace");
  return renderToStaticMarkup(h(AgentUiProvider, { enabled: agentUi, children: h(SynaStudioShell, { projectId: "p1", building, children: child }) }));
}
const navHrefs = (html: string) => {
  const nav = html.slice(html.indexOf('class="ss-nav"'), html.indexOf("ss-side-foot"));
  return [...nav.matchAll(/href="\/studio\/p1\/([\w-]+)"/g)].map((m) => m[1]);
};

describe("activation de la coquille", () => {
  it("SINA est ouverte à tous : seule la valeur 0 la ferme (arrêt d'urgence)", async () => {
    const { synaAgentEnabled } = await import("@/lib/syna-agent/enabled");
    const before = process.env.STUDIO_SYNA_AGENT;
    try {
      delete process.env.STUDIO_SYNA_AGENT; expect(synaAgentEnabled()).toBe(true);
      process.env.STUDIO_SYNA_AGENT = "0"; expect(synaAgentEnabled()).toBe(false);
    } finally { if (before === undefined) delete process.env.STUDIO_SYNA_AGENT; else process.env.STUDIO_SYNA_AGENT = before; }
  });
  it("une seule interface : la mise en page du projet ne connaît que la coquille de SINA, sans bascule ni ancienne interface", () => {
    const layout = read("src/app/studio/[projectId]/layout.tsx");
    expect(layout).toContain("<SynaStudioShell projectId={projectId} building={building}");
    expect(layout).not.toMatch(/StudioShell\b(?<!SynaStudioShell)|studioShellVariant|SynaShellSwitch|STUDIO_SYNA_SHELL/);
    // L'accès à SINA suit un seul réglage : SINA ouverte ou fermée sur l'installation.
    expect(layout).toContain("AgentUiProvider enabled={synaAgentEnabled()}");
    expect(fs.existsSync(path.join(root, "src/lib/syna-ui/studio-shell.ts"))).toBe(false);
    expect(fs.existsSync(path.join(root, "src/components/studio/syna-dock.tsx"))).toBe(false);
    expect(read("src/components/studio/shell.tsx")).not.toContain("export function StudioShell");
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
  it("les outils avancés restent là, repliés", () => {
    expect(render("syna", false, "products", null)).toContain("data-nav-advanced");
  });
  it("le menu parle de « Tableau de bord » et d'« Angles » : plus de « Pilote » ni de « Stratégie »", () => {
    const html = render("syna", true);
    expect(html).toMatch(/data-space="pilote"[\s\S]*?class="ss-link-l">Tableau de bord</);
    expect(html).toMatch(/data-space="strategie"[\s\S]*?class="ss-link-l">Angles</);
    expect(html).not.toMatch(/>Pilote<|>Stratégie</);
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

describe("accès à SINA", () => {
  it("nouvelle coquille : plus de pastille noire, un onglet signature et un onglet « Sina » au téléphone, une seule conversation", () => {
    const html = render("syna", true);
    expect(html).not.toMatch(/bg-ink[^"]*"[^>]*>SINA</);
    expect(html).not.toContain("fixed bottom-24 right-4");
    expect(html.match(/data-variant="rail"/g)?.length).toBe(1);
    expect(html.match(/data-variant="tab"/g)?.length).toBe(1);
    expect(html).toContain('aria-controls="syna-panel"');
    expect(html).toContain('aria-expanded="false"');
    // Fermée au premier accès : la conversation n'est montée qu'à l'ouverture (comme l'interface actuelle).
    expect(html).not.toContain("data-syna-thread-mock");
  });
  it("drapeaux SINA fermés : aucun accès à SINA, aucun panneau vide (comme aujourd'hui)", () => {
    const html = render("syna", false);
    expect(html).not.toContain('id="syna-panel"');
    expect(html).not.toContain('aria-controls="syna-panel"');
    expect(html).not.toContain('data-variant="rail"');
    expect(html).not.toContain('data-variant="tab"');
    expect(html).toContain("data-mobile-nav");
  });
  it("le code de la coquille affiche le fil de SINA et n'écrit pas de second moteur", () => {
    const src = read("src/components/studio/syna-shell.tsx");
    expect(src).toContain('import { SynaThread } from "./syna-thread"');
    expect(src).not.toMatch(/ConversationPanel|ConversationDock|fetch\(|\/api\/studio-agent/);
    expect(src).toContain("useAgentPanel()");
  });
});

describe("téléphone et retour arrière", () => {
  it("barre basse : Sina · espace actuel · Espaces · Suivi, repérée par le Studio (data-mobile-nav)", () => {
    const html = render("syna", true);
    const bar = html.slice(html.indexOf("data-mobile-nav"));
    expect(bar).toContain('data-variant="tab"');
    expect(bar).toContain(">Boutique<");
    expect(bar).toContain(">Espaces<");
    expect(bar).toContain(">Suivi<");
  });
  it("plus de retour à une « interface actuelle » : il n'y en a qu'une", () => {
    const html = render("syna", true);
    expect(html).not.toContain("data-syna-shell-switch");
    expect(html).not.toMatch(/Interface actuelle|Nouvelle interface/);
  });
  it("la coquille pose les attributs de présentation Encre (point d'extension du lot 1 bis)", () => {
    const html = render("syna", true);
    expect(html).toContain('data-syna-shell="encre"');
    expect(html).toMatch(/class="syna-ui ss-side-scope[^"]*" data-syna-mode="encre"/);
  });
});

describe("création en cours : SINA en grand, le tableau de bord à côté", () => {
  const at = (p: string, fn: () => string) => { const before = state.path; state.path = p; try { return fn(); } finally { state.path = before; } };
  it("sur le tableau de bord d'un projet en construction : disposition « focus », sans choix de mode ni commande rapide en tête", () => {
    const html = at("/studio/p1/pilote", () => render("syna", true, "products", null, true));
    expect(html).toMatch(/data-syna-shell="encre" data-focus=""/);
    expect(html).toContain("Tableau de bord");
    expect(html).not.toContain("ss-modeswitch");
    // Pas de statut de l'ancienne création (« À démarrer ») pendant que SINA construit.
    expect(html).not.toContain("À démarrer");
    expect(html).toContain('id="ecran-actuel"');
  });
  it("le réglage « Plein cadre » ne s'applique pas à cette disposition", () => {
    state.data = project("products", null);
    const html = at("/studio/p1/pilote", () => renderToStaticMarkup(h(AgentUiProvider, { enabled: true, children: h(SynaStudioShell, { projectId: "p1", building: true, initialPrefs: { account: { mode: "plein" }, project: null, updatedAt: 1 }, children: h("p", null, "x") }) })));
    expect(html).toContain('data-syna-shell="encre"');
    expect(html).not.toContain("ss-cmd-zone");
  });
  it("dans un autre espace, ou une fois la construction finie : la disposition habituelle", () => {
    expect(render("syna", true, "products", null, true)).not.toContain("data-focus");
    expect(at("/studio/p1/pilote", () => render("syna", true, "products", null, false))).not.toContain("data-focus");
    // SINA fermée sur l'installation : jamais de disposition en grand sans conversation.
    expect(at("/studio/p1/pilote", () => render("syna", false, "products", null, true))).not.toContain("data-focus");
  });
  it("la disposition en grand a sa propre feuille, limitée à .ss-root[data-focus]", () => {
    const css = read("src/components/studio/syna-focus.css").replace(/\/\*[\s\S]*?\*\//g, "");
    const selectors = [...css.matchAll(/([^{}@]+)\{[^{}]*\}/g)].map((m) => m[1].trim()).filter(Boolean);
    expect(selectors.length).toBeGreaterThan(8);
    expect(selectors.filter((x) => !x.startsWith(".ss-root[data-focus]"))).toEqual([]);
    expect(read("src/components/studio/syna-shell.tsx")).toContain('import "./syna-focus.css";');
  });
  it("le fil dit ce que SINA note en une ligne discrète, sans vocabulaire interne", () => {
    const thread = read("src/components/studio/syna-thread.tsx");
    expect(thread).toContain("data-syna-noted");
    expect(read("src/lib/syna-agent/tools/start.ts")).not.toMatch(/summary: L\(`Étape 0/);
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
