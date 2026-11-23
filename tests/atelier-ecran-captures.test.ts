/**
 * Défauts vus sur les captures de l'atelier (23 novembre 2026), corrigés à l'écran :
 *  - les boutons « Utiliser ce modèle » et « Choisir mes deux photos » étaient coupés dans les cartes étroites des
 *    vidéos (règle du propriétaire : un bouton se voit en entier) ;
 *  - le conseil de SINA finissait par « justes . » (espace avant le point) ;
 *  - un deux-points pouvait commencer une ligne (« place / : cuisine ») ;
 *  - la vidéo de « Mes créations » restait blanche avant lecture ;
 *  - un modèle de l'atelier (8 s, image fixe d'abord) ouvrait la vidéo guidée sur « clips directs » et sans durée choisie ;
 *  - le nom du produit était coupé en « B… » ; « Idées de prompts » (mot anglais).
 */
import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { conseilOutil } from "@/lib/atelier/conseil";
import { outilsPour } from "@/lib/atelier/outils";

const atelier = fs.readFileSync("src/components/studio/tab-atelier.tsx", "utf8");
const video = fs.readFileSync("src/components/studio/guided-video.tsx", "utf8");
const sujet = fs.readFileSync("src/components/studio/subject-picker.tsx", "utf8");

describe("l'atelier à l'écran, après les captures", () => {
  it("le conseil de SINA n'a jamais d'espace avant le point final", () => {
    const c = conseilOutil("scene", outilsPour("scene", () => true), "fr")!;
    expect(c).not.toMatch(/\s\.$/);
    expect(c).toMatch(/justes\.$/);
  });

  it("les boutons des cartes de vidéos passent à la ligne et grandissent au lieu d'être coupés", () => {
    expect(atelier).toMatch(/BOUTON_CARTE = "!h-auto min-h-8 w-full !whitespace-normal/);
    expect(atelier.match(/className=\{BOUTON_CARTE\}/g)?.length).toBe(2);
    expect(atelier).toContain('inline-flex min-h-9 w-full items-center justify-center rounded-full bg-ink px-3 py-1.5 text-center text-sm leading-tight');
    expect(atelier).not.toContain('inline-flex h-9 items-center rounded-full bg-ink px-3 text-sm text-paper');
  });

  it("en français, jamais un « : » seul en début de ligne", () => {
    expect(atelier).toContain('x[0].replace(/ ([:;!?»])/g, "\\u00a0$1")');
  });

  it("les modèles prêts gardent leur titre en haut de la carte", () => {
    expect(atelier).toContain('"flex h-full flex-col items-start justify-start rounded-2xl border p-3 text-left"');
  });

  it("une vidéo de « Mes créations » montre son image avant la lecture", () => {
    expect(atelier).toMatch(/<video src=\{c\.url\} poster=\{c\.thumbUrl \?\? undefined\} preload="metadata"/);
  });

  it("un modèle de l'atelier ouvre la vidéo guidée sur « images d'abord » avec sa durée choisie", () => {
    expect(video).toContain('setModele({id:m,nom:q.get("atelierNom")??m});setGeneration("staged");');
    expect(video).toContain("(DURATIONS.includes(totalS) ? DURATIONS : [...DURATIONS, totalS].sort((a, b) => a - b))");
  });

  it("le nom du produit n'est plus coupé, et aucun mot anglais sur le bouton d'idées", () => {
    expect(sujet).not.toContain('<span className="block truncate font-medium">{s.name}</span>');
    expect(sujet).toContain('{t("Idées de demandes", "Prompt ideas")}');
    expect(sujet).not.toContain('t("Idées de prompts"');
  });

  it("la page de réglage d'une vidéo tutoie et parle simplement (ni « clips », ni « image(s) », ni « marge de réservation »)", () => {
    const fr = [...video.matchAll(/\bt\(\s*(["`])((?:\\.|(?!\1).)*)\1/g)].map((m) => m[2]).join("\n");
    expect(fr).not.toMatch(/\b(vous|votre|vos)\b/i);
    expect(fr).not.toMatch(/\bclips?\b/i);
    expect(video).not.toMatch(/image\(s\)|marge de réservation|reprise ciblée|budget\.label/);
    expect(video).toContain("pluriel(plans, \"plan filmé par l’IA\", \"plans filmés par l’IA\")");
    expect(sujet).not.toMatch(/Décrivez|Votre produit|votre marque|ajoutez-en/);
  });

  it("le pourcentage s'écrit « 1 % » avec une espace insécable bien visible", async () => {
    const { formatPct } = await import("@/lib/budget-pct");
    expect(formatPct(1, "fr")).toBe("1\u00a0%");
  });

  it("l'affichage se nomme « SINA à côté » et « Grand écran », et la commande rapide tient dans sa case", () => {
    const shell = fs.readFileSync("src/components/studio/syna-shell.tsx", "utf8"), cmd = fs.readFileSync("src/components/studio/syna-command.tsx", "utf8");
    expect(shell).toContain('{t("SINA à côté", "SINA alongside")}</button>');
    expect(shell).toContain('{t("Grand écran", "Full screen")}</button>');
    expect(cmd).toContain('T("Commande rapide, ex. « Grand écran »", "Quick command, e.g. “Full screen”")');
  });

  it("un logo se voit entier dans sa vignette", () => {
    expect(fs.readFileSync("src/components/studio/common.tsx", "utf8")).toContain('a.kind === "logo" || a.role === "logo" ? "object-contain p-2" : "object-cover"');
  });
});
