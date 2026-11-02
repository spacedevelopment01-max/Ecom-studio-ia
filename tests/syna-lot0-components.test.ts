/** SYNA lot 0 (#282) : vrai rendu React des primitives présentatives, FR / EN, accessibilité, aucun euro. */
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  SYNA_STATES, SynaActionCard, SynaButton, SynaComposer, SynaCostMeter, SynaCostQuote, SynaScope, SynaSelectionChip, SynaShell,
  SynaStateBadge, SynaTrigger, formatPct, stateLabel, synaBudgetSplit,
} from "@/components/syna";

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el);
const noop = () => undefined;

describe("état unifié", () => {
  it("sept états, sept mots distincts en français et en anglais", () => {
    expect(SYNA_STATES).toEqual(["proposal", "draft", "confirmed", "running", "verified", "failed", "unavailable"]);
    for (const lang of ["fr", "en"] as const) expect(new Set(SYNA_STATES.map((s) => stateLabel(s, lang))).size).toBe(7);
    expect(stateLabel("unavailable")).toBe("Non disponible");
    expect(stateLabel("failed", "en")).toBe("Failed");
  });
  it("icône décorative + mot : la couleur n'est jamais le seul signal", () => {
    const out = html(h(SynaStateBadge, { state: "failed", detail: "1/3" }));
    expect(out).toContain('data-state="failed"');
    expect(out).toContain('aria-hidden="true"');
    expect(out).toContain(">Échec<");
    expect(out).toContain(">1/3<");
  });
});

describe("pourcentages du budget IA", () => {
  it("français avec espace fine, anglais collé, « ≈ » pour un coût probable, « < 1 % » pour un très petit coût", () => {
    expect(formatPct(6, "fr", true)).toBe("≈ 6 %");
    expect(formatPct(6, "en", true)).toBe("≈ 6%");
    expect(formatPct(0.4, "fr", true)).toBe("< 1 %");
    expect(formatPct(-3)).toBe("0 %");
    expect(formatPct(Number.NaN)).toBe("0 %");
  });
  it("répartition du budget : dépassement signalé, barre jamais au-delà de 100 %", () => {
    expect(synaBudgetSplit(46, 6)).toEqual({ used: 46, cost: 6, thisPart: 6, after: 48, over: false });
    expect(synaBudgetSplit(94, 9)).toMatchObject({ thisPart: 6, after: 0, over: true });
  });
});

describe("devis et consentement", () => {
  const quote = (p: Partial<Parameters<typeof SynaCostQuote>[0]> = {}) => html(h(SynaCostQuote, { title: "3 images", costPct: 6, usedPct: 46, ...p }));
  it("annonce le coût en % du budget, avec une barre lisible par les lecteurs d'écran, jamais en euros", () => {
    const out = quote({ details: [{ term: "Coût probable", detail: "un essai par image" }] });
    expect(out).toContain("≈ 6 %");
    expect(out).toContain("du budget IA du mois");
    expect(out).toMatch(/role="img" aria-label="Budget IA du mois : déjà utilisé 46 %, cette création ≈ 6 %, reste après ≈ 48 %\."/);
    expect(out).toContain('role="group"');
    expect(out).not.toMatch(/€|EUR/);
    expect(out).not.toContain('role="alert"');
  });
  it("prévient quand la création dépasse le budget restant", () => {
    const out = quote({ usedPct: 96, costPct: 9 });
    expect(out).toContain('role="alert"');
    expect(out).toContain("dépasse le budget restant");
    expect(out).toContain("data-over");
  });
  it("une autre possibilité n'est un bouton que si elle agit", () => {
    const out = quote({ alternatives: [{ title: "Réemployer", costPct: 0 }, { title: "1 image", costPct: 2, onChoose: noop }] });
    expect(out.match(/<button/g)?.length).toBe(1);
    expect(out).toContain('<div class="sy-alt"><b>Réemployer</b>');
  });
  it("anglais", () => {
    expect(quote({ lang: "en" })).toContain("of this month&#x27;s AI budget");
  });
});

describe("carte d'action", () => {
  it("titre relié, étapes ordonnées avec leur état, progression accessible, emplacement d'actions", () => {
    const out = html(h(SynaActionCard, {
      title: "3 images", state: "running", stateDetail: "2/3", progress: 0.5,
      steps: [{ title: "Image 1", state: "verified" }, { title: "Image 2", state: "failed", detail: "erreur 503" }],
      actions: h(SynaButton, { variant: "primary" }, "Relancer"),
    }));
    expect(out).toMatch(/<article class="sy-card" data-state="running" aria-labelledby="([^"]+)"><header class="sy-card-h"><div><h3 id="\1"/);
    expect(out).toContain('role="progressbar"');
    expect(out).toContain('aria-valuenow="50"');
    expect(out.match(/<li class="sy-step"/g)?.length).toBe(2);
    expect(out).toContain('type="button"');
    expect(out).toContain('data-variant="primary"');
  });
  it("progression indéterminée sans valeur annoncée", () => {
    const out = html(h(SynaActionCard, { title: "Export", state: "confirmed", progress: "indeterminate" }));
    expect(out).toContain("data-indeterminate");
    expect(out).not.toContain("aria-valuenow");
  });
});

describe("compteur de budget", () => {
  it("lu comme un compteur, avec un niveau bas puis épuisé", () => {
    const ok = html(h(SynaCostMeter, { remainingPct: 54 }));
    expect(ok).toContain('role="meter"');
    expect(ok).toContain('aria-valuenow="54"');
    expect(ok).toContain('aria-valuetext="54 % restant"');
    expect(html(h(SynaCostMeter, { remainingPct: 12 }))).toContain('data-level="low"');
    expect(html(h(SynaCostMeter, { remainingPct: -4 }))).toContain('data-level="empty"');
  });
});

describe("puce de sélection", () => {
  it("annoncée comme élément désigné ; « retirer » seulement s'il agit, avec un nom explicite", () => {
    expect(html(h(SynaSelectionChip, { kind: "Section", name: "En-tête", where: "Accueil" }))).not.toContain("<button");
    const out = html(h(SynaSelectionChip, { kind: "Section", name: "En-tête", onClear: noop }));
    expect(out).toContain("Élément désigné :");
    expect(out).toContain('aria-label="Retirer la sélection : En-tête"');
  });
});

describe("accès à SYNA (sans pastille noire)", () => {
  it("onglet signature : état ouvert, travail en cours annoncé, point seulement pour un résultat ou un échec", () => {
    const idle = html(h(SynaTrigger, { variant: "rail", expanded: false }));
    expect(idle).toContain('aria-expanded="false"');
    expect(idle).toContain('aria-label="Ouvrir Syna"');
    expect(idle).not.toContain("sy-dot");
    expect(html(h(SynaTrigger, { variant: "rail", expanded: true }))).toContain('aria-label="Replier Syna"');
    expect(html(h(SynaTrigger, { variant: "rail", status: "working", statusText: "3 images" }))).toContain('aria-label="Ouvrir Syna — Syna travaille : 3 images"');
    expect(html(h(SynaTrigger, { variant: "rail", status: "notice", statusText: "1 image prête" }))).toContain("sy-dot");
  });
  it("barre de commande : texte visible, raccourci annoncé seulement s'il est donné", () => {
    const bar = html(h(SynaTrigger, { variant: "commandbar" }));
    expect(bar).toContain(">Demandez à Syna…<");
    expect(bar).not.toContain("<kbd");
    expect(bar).not.toContain("aria-keyshortcuts");
    const k = html(h(SynaTrigger, { variant: "commandbar", shortcut: "Ctrl K", lang: "en" }));
    expect(k).toContain('aria-keyshortcuts="Ctrl+K"');
    expect(k).toContain(">Ask Syna…<");
    expect(html(h(SynaTrigger, { variant: "commandbar", compact: true, status: "working" }))).toContain('aria-label="Ouvrir Syna — Syna travaille"');
  });
  it("aucune classe de la pastille actuelle (fond encre plein, bouton flottant)", () => {
    for (const variant of ["rail", "commandbar", "tab"] as const) expect(html(h(SynaTrigger, { variant }))).not.toMatch(/bg-ink|fixed|rounded-full/);
  });
});

describe("saisie et coquille", () => {
  it("la zone de saisie a un libellé ; « Envoyer » reste inactif tant qu'aucun envoi n'est branché", () => {
    const out = html(h(SynaComposer, { defaultValue: "Bonjour" }));
    expect(out).toMatch(/<label for="([^"]+)" class="sy-sr">Message à Syna<\/label><textarea id="\1"/);
    expect(out).toContain("disabled");
    expect(html(h(SynaComposer, { onSend: noop }))).not.toContain("disabled");
  });
  it("même balisage pour les deux modes : seul le conteneur change", () => {
    const shell = h(SynaShell, { conversation: { thread: "fil" }, workspace: { stage: "aperçu" }, commandBar: h(SynaTrigger, { variant: "commandbar" }) });
    const encre = html(h(SynaScope, { overrides: { mode: "encre" }, children: shell }));
    const plein = html(h(SynaScope, { overrides: { mode: "plein" }, children: shell }));
    const inner = (s: string) => s.slice(s.indexOf(">") + 1);
    expect(inner(encre)).toBe(inner(plein));
    expect(encre).toMatch(/^<div class="syna-ui" data-syna-mode="encre" data-syna-scheme="auto" data-syna-accent="encre"[^>]*style="--sy-convo-w:440px"/);
    expect(plein).toMatch(/^<div class="syna-ui" data-syna-mode="plein"[^>]*data-syna-accent="cobalt"[^>]*style="--sy-convo-w:420px"/);
    expect(encre).toContain('<aside class="sy-convo" aria-label="Conversation avec Syna">');
    expect(encre).toContain('<section class="sy-work" aria-label="Espace de travail">');
  });
});
