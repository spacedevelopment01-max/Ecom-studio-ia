/**
 * L'onglet Marque avec la planche en vrai (25 novembre 2026, captures de Racine) : aucun identifiant technique de case
 * montré au client ; une seule section des couleurs (avec le rôle sous chaque pastille) et une seule des polices (le nom
 * écrit dans la police) ; chaque image en haute définition entière, à ses proportions, jamais recadrée ni étirée. Sans
 * planche en vrai, rien ne change. Aucun appel à l'IA.
 */
vi.mock("next/navigation", () => ({ usePathname: () => "/studio/p1/marque", useRouter: () => ({ push: () => {}, refresh: () => {}, replace: () => {} }) }));
vi.mock("@/components/studio/project-context", () => ({ useProject: () => ({ id: "p1", data: null, reload: async () => {}, error: null }), useOptionalProject: () => null }));
vi.mock("@/components/ui", async (orig) => ({ ...(await orig<any>()), useApi: () => ({ data: etatDeLEcran.sheet, reload: () => {}, error: null, loading: false }) }));
import fs from "node:fs";
import { createElement as h, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { LangProvider } from "@/components/i18n";
import TabMarque from "@/components/studio/tab-marque";
import { runWithLang } from "@/lib/i18n-server";
import { LIBELLES_DES_ELEMENTS, libelleDeLElement, sansIdentifiantsDeCase } from "@/lib/syna-agent/planche-en-vrai-libelles";
import { NOMS_DES_ELEMENTS, phraseDeLImageGardeeEnApercu, type EtatPlancheEnVrai } from "@/lib/syna-agent/planche-en-vrai";
import { avecLesRoles, vueEnVrai, type BrandSheet } from "@/lib/syna-agent/brand-sheet";
import { brandFinishContext, type Journey } from "@/lib/syna-agent/journey";

const etatDeLEcran: { sheet: BrandSheet | null } = { sheet: null };
const rendu = (el: ReactNode, lang: "fr" | "en" = "fr") => renderToStaticMarkup(h(LangProvider, { initial: lang, children: el }));

/** Les identifiants techniques des cases : les clés de cases.json (avec un tiret ou un chiffre) et les 17 images. */
const CASES = JSON.parse(fs.readFileSync("assets/planche-de-marque/cases.json", "utf8")) as { dispositions: Record<string, { cases: Record<string, unknown> }> };
const IDENTIFIANTS = [...new Set([...Object.values(CASES.dispositions).flatMap((d) => Object.keys(d.cases)), ...NOMS_DES_ELEMENTS])].filter((k) => /[-\d]/.test(k) || (NOMS_DES_ELEMENTS as string[]).includes(k));
/** Aucun identifiant de case dans un texte montré au client (ni une clé de cases.json, ni un motif « mot-chiffre »). */
function sansIdentifiant(texte: string) {
  expect(texte).not.toMatch(/[a-z]+-[0-9]/);
  for (const k of IDENTIFIANTS) expect(texte).not.toMatch(new RegExp(`(?<![\\p{L}\\p{N}_-])${k}(?![\\p{L}\\p{N}_-])`, "u"));
}
/** La phrase telle qu'elle a été enregistrée dans l'essai réel de Racine, avant cette règle. */
const ANCIENNE = "Sur ta planche en vrai, 3 images n'ont pas passé ma relecture, même refaites (ouverture-planche, produit-1, reference-6) : leurs cases gardent l'aperçu de ta planche choisie, sans fichier en haute définition. Je peux les refaire à ma charge : rien n'est compté sur ton budget.";

const etat = (): EtatPlancheEnVrai => ({
  key: "A", demo: "demo", logo: "logo", laquelle: "standard", at: 1,
  planche: { id: "planche", w: 3072, h: 4608 },
  elements: NOMS_DES_ELEMENTS.map((n, i) => (["ouverture-planche", "produit-1", "reference-6"].includes(n) ? { element: n, id: null, essais: 2 } : { element: n, id: `img${i}`, w: n === "ouverture-site" ? 1920 : n === "publication-9x16" ? 1080 : 1024, h: n === "ouverture-site" ? 720 : n === "publication-9x16" ? 1920 : 912, essais: 1, ...(n.startsWith("produit-") ? { ambiance: true } : {}) })),
  logos: [{ version: "logo-principal", id: "l1" }, { version: "logo-compact", id: "l2" }],
  palette: [{ hex: "#640B29", nom: "Bordeaux", mots: [] }, { hex: "#25583B", nom: "Vert forêt", mots: [] }, { hex: "#F7F3EC", nom: "Lin", mots: [] }],
  polices: { titres: { cle: "playfair_display", famille: "Playfair Display", fichier: "PlayfairDisplay-700.ttf", poids: 700, handle: "playfair_display_n7", lue: "Playfair Display", remplacee: false }, textes: { cle: "montserrat", famille: "Montserrat", fichier: "Montserrat-400.ttf", poids: 400, handle: "montserrat_n4", lue: "Montserrat", remplacee: false } } as never,
  symboleComplet: false, publications: [], issues: [ANCIENNE], notes: ["produit-1, essai 2 refusé : interne"],
});
const COULEURS: BrandSheet["colors"] = [{ role: "light", hex: "#F7F3EC" }, { role: "dark", hex: "#25583B" }, { role: "primary", hex: "#640B29" }, { role: "secondary", hex: "#EDDECB" }, { role: "accent", hex: "#A1B89B" }];
const feuille = (enVrai: boolean): BrandSheet => ({
  stage: "finished", name: "Racine", slogan: null, promise: null, descriptor: null, logo: "/api/files/logo", colors: COULEURS,
  fonts: { heading: { family: "Playfair Display", file: "PlayfairDisplay-700.ttf", weight: 700 }, body: { family: "Montserrat", file: "Montserrat-400.ttf", weight: 400 } },
  tone: [], houseWords: [], bannedWords: [], lines: [], toProve: [], images: { hero: null, object: null, signs: null, posts: [] }, kit: null,
  issues: [sansIdentifiantsDeCase(ANCIENNE)], esquisses: null, planches: [],
  enVrai: enVrai ? avecLesRoles(vueEnVrai(etat(), "p1", (id, d) => `/api/files/${id}${d ? "?download=1" : ""}`), COULEURS) : null,
});

describe("l'onglet Marque avec la planche en vrai", () => {
  it("chaque case a son nom lisible, en français et en anglais ; jamais un identifiant technique", () => {
    for (const n of NOMS_DES_ELEMENTS) {
      expect(LIBELLES_DES_ELEMENTS[n]).toBeTruthy();
      for (const lang of ["fr", "en"] as const) sansIdentifiant(runWithLang({ ui: lang, content: lang }, () => libelleDeLElement(n)));
    }
    expect(runWithLang({ ui: "fr", content: "fr" }, () => ["ouverture-planche", "produit-1", "reference-6"].map(libelleDeLElement))).toEqual(["Bandeau de la planche", "Produit 1", "Image de référence 6"]);
    expect(runWithLang({ ui: "en", content: "en" }, () => ["ouverture-planche", "produit-1", "reference-6"].map(libelleDeLElement))).toEqual(["Board banner", "Product 1", "Reference image 6"]);
  });

  it("ce que SINA dit d'une image gardée en aperçu nomme la case lisiblement, et une phrase déjà enregistrée est relue sans identifiant", () => {
    for (const lang of ["fr", "en"] as const) {
      const p = runWithLang({ ui: lang, content: lang }, () => phraseDeLImageGardeeEnApercu(NOMS_DES_ELEMENTS));
      sansIdentifiant(p);
      sansIdentifiant(runWithLang({ ui: lang, content: lang }, () => sansIdentifiantsDeCase(ANCIENNE)));
    }
    expect(runWithLang({ ui: "fr", content: "fr" }, () => phraseDeLImageGardeeEnApercu(["ouverture-planche", "produit-1", "reference-6"]))).toContain("(Bandeau de la planche, Produit 1, Image de référence 6)");
    expect(runWithLang({ ui: "fr", content: "fr" }, () => sansIdentifiantsDeCase(ANCIENNE))).toContain("(Bandeau de la planche, Produit 1, Image de référence 6)");
    // Un mot ordinaire n'est jamais touché.
    expect(sansIdentifiantsDeCase("le ton de la palette, en haut")).toBe("le ton de la palette, en haut");
  });

  it("partout où un texte arrive au client : la vue de l'onglet, ce que SINA lit pour lui parler, le fil", () => {
    const v = runWithLang({ ui: "fr", content: "fr" }, () => vueEnVrai(etat(), "p1", (id) => `/api/files/${id}`))!;
    for (const t of [...v.images.map((x) => x.label), ...v.sansFichier, ...v.logos.map((x) => x.label)]) sansIdentifiant(t);
    const j = { brandFinish: { at: 1, issues: [ANCIENNE] }, keep: [] } as unknown as Journey;
    sansIdentifiant(runWithLang({ ui: "fr", content: "fr" }, () => brandFinishContext(j).join("\n")));
    expect(fs.readFileSync("src/lib/syna-agent/loop.ts", "utf8")).toContain("finishIssues: (j.brandFinish?.issues ?? []).map(sansIdentifiantsDeCase)");
    expect(fs.readFileSync("src/lib/syna-agent/brand-sheet.ts", "utf8")).toContain("issues: (j?.brandFinish?.issues ?? []).map(sansIdentifiantsDeCase)");
    // L'écran entier, en français et en anglais.
    etatDeLEcran.sheet = runWithLang({ ui: "fr", content: "fr" }, () => feuille(true));
    for (const lang of ["fr", "en"] as const) sansIdentifiant(rendu(h(TabMarque), lang).replace(/<style>[^<]*<\/style>/g, " ").replace(/<[^>]*>/g, " "));
  });

  it("avec la planche en vrai : une seule section des couleurs et une seule des polices, celles du haut ; le rôle sous chaque pastille ; le nom de la police écrit dans sa police", () => {
    etatDeLEcran.sheet = runWithLang({ ui: "fr", content: "fr" }, () => feuille(true));
    const html = rendu(h(TabMarque));
    expect(html.match(/Tes couleurs/g)).toHaveLength(1);
    expect(html.match(/Tes polices/g)).toHaveLength(1);
    expect(html).not.toContain("data-brand-colors");
    expect(html).not.toContain("data-brand-fonts");
    const roles = [...html.matchAll(/data-couleur-role="[^"]*">([^<]*)</g)].map((m) => m[1]);
    expect(roles).toEqual(["Bouton", "Texte", "Fond"]);
    expect(rendu(h(TabMarque), "en")).toMatch(/data-couleur-role="[^"]*">Button</);
    // L'exemple de chaque police : son nom, dans sa police, jamais le nom de la marque.
    expect(html).toMatch(/font-family:&quot;SINA Playfair Display&quot;">Playfair Display</);
    expect(html).toMatch(/font-family:&quot;SINA Montserrat&quot;">Montserrat</);
    const polices = html.slice(html.indexOf("data-brand-envrai-polices"), html.indexOf("data-brand-envrai-images"));
    expect(polices).not.toContain("Racine");
  });

  it("sans planche en vrai, rien ne change : les couleurs avec leur rôle et les polices restent en bas", () => {
    etatDeLEcran.sheet = runWithLang({ ui: "fr", content: "fr" }, () => feuille(false));
    const html = rendu(h(TabMarque));
    expect(html).toContain("data-brand-colors");
    expect(html).toContain("data-brand-fonts");
    expect(html).not.toContain("data-brand-envrai");
  });

  it("« Tes images en haute définition » : chaque image entière, à ses proportions, sur un fond neutre ; aucun recadrage ni étirement", () => {
    etatDeLEcran.sheet = runWithLang({ ui: "fr", content: "fr" }, () => feuille(true));
    const html = rendu(h(TabMarque));
    const bloc = html.slice(html.indexOf("data-brand-envrai-images"));
    const imgs = [...bloc.matchAll(/<img [^>]*>/g)].map((m) => m[0]);
    expect(imgs.length).toBe(14);
    for (const i of imgs) {
      expect(i).toContain("object-contain");
      expect(i).toMatch(/max-h-full/);
      expect(i).toMatch(/max-w-full/);
      expect(i).not.toMatch(/object-cover|aspect-square|object-fill/);
      expect(i).toMatch(/width="\d+" height="\d+"/);
    }
    // Les vraies proportions sont données à l'image : l'ouverture du site en 1920 × 720, la story en 1080 × 1920.
    expect(bloc).toMatch(/width="1920" height="720"/);
    expect(bloc).toMatch(/width="1080" height="1920"/);
    expect(bloc).toContain("bg-[#ECECEA]");
  });
});
