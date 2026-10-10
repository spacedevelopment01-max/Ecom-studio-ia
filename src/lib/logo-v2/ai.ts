/**
 * Accès à l'IA du moteur Logo V2 (injecté : réel ici, simulé dans les tests). Chaque appel a une raison :
 *  - territoires : UN appel (directeur artistique, niveau fort) pour toutes les directions ;
 *  - concept graphique du symbole : par le MODÈLE D'IMAGES choisi pour l'usage « Logos » (Administration › Images &
 *    Vidéos), seulement pour un territoire qui demande un symbole ; vectorisé ensuite (jamais livré tel quel) ;
 *  - symbole vectoriel (tâche « logo_symbol ») : FINALISATION — redessine le concept en SVG propre quand la
 *    vectorisation automatique ne suffit pas ; il ne le conçoit seul que si aucun modèle d'images n'est utilisable,
 *    et c'est alors écrit dans les notes de la série (jamais en silence) ;
 *  - relecture : une par proposition construite, sur la planche (niveau fort : c'est elle qui décide FINAL) ;
 *  - LOGO COMPLET (phase LA) : quand le modèle d'images de l'usage « Logos » sait écrire du texte, il dessine le logo
 *    entier de chaque territoire dans son style ; l'original est le livrable (artwork.ts), relu avec des critères
 *    adaptés au style.
 * Le routage passe par le Router V2 (tâche + capacité), le contexte par le scope « logo » du Project Brain.
 */
import type { JobContext } from "../jobs";
import { llmJson } from "../ai/llm";
import { imageUnavailableReason, mediaRouteFor } from "../ai/media-providers";
import { L, uiLang } from "../i18n-server";
import { STYLE_FONTS, TerritoriesSchema, type TerritoryDraft } from "./territories";
import { LogoReviewSchema } from "./quality";
import { z } from "zod";
import type { ArtworkReview, BrandBrief, LogoReview, Territory } from "./types";
import { ART_CRITERIA, LOGO_STYLES } from "./types";
import { ARTWORK_REVIEW_SYSTEM, artworkPrompt, STYLE_GUIDE } from "./artwork";

export type LogoV2Ai = {
  territories(brief: BrandBrief, n: number, avoid: string[]): Promise<TerritoryDraft[]>;
  /** Symbole SVG (tâche logo_symbol) ; `concept` : image du concept à finaliser en vectoriel. */
  drawSymbol(t: Territory, brief: BrandBrief, feedback?: string, concept?: Buffer | null): Promise<{ svg: string; idea: string }>;
  /** Concept graphique par le modèle d'images de l'usage « Logos » (raster) ; null si aucun modèle utilisable. */
  exploreSymbol(t: Territory, brief: BrandBrief, feedback?: string): Promise<Buffer | null>;
  /** Modèle d'images qui fera les concepts (ou la raison de son absence) ; absent : exploreSymbol décide seul. */
  conceptRoute?(): { provider: string; model: string } | { unavailable: string };
  review(board: Buffer, t: Territory, brief: BrandBrief, expected: string): Promise<LogoReview>;
  /** Modèle d'images capable d'écrire le nom, qui dessinera les logos complets (ou la raison de son absence). */
  artworkRoute?(): { provider: string; model: string } | { unavailable: string };
  /** Logo complet d'un territoire dessiné par le modèle d'images (image PNG telle que livrée). */
  drawArtwork?(t: Territory, brief: BrandBrief, feedback?: string): Promise<Buffer>;
  /** Relecture d'un logo complet sur sa planche, critères adaptés au style. */
  reviewArtwork?(board: Buffer, t: Territory, brief: BrandBrief, expected: { name: string; descriptor: string | null; tagline: string | null }): Promise<ArtworkReview>;
};

const score10 = z.coerce.number().min(0).max(10).catch(0);
const frac = z.coerce.number().min(0).max(1);
export const ArtworkReviewSchema = z.object({
  criteria: z.object(Object.fromEntries(ART_CRITERIA.map((k) => [k, score10])) as Record<(typeof ART_CRITERIA)[number], typeof score10>),
  textRead: z.string().max(300).catch(""),
  nameExact: z.boolean().catch(false),
  extraText: z.boolean().catch(false),
  nameBox: z.object({ x: frac, y: frac, w: frac, h: frac }).nullable().catch(null),
  clumsyCliche: z.boolean().catch(false),
  resemblesKnownBrand: z.boolean().catch(false),
  amateur: z.boolean().catch(false),
  artifacts: z.boolean().catch(false),
  issues: z.array(z.string().max(300)).max(8).catch([]),
  needsSimplifiedMark: z.boolean().catch(true),
});

const fontsList = () => Object.entries(STYLE_FONTS).map(([s, f]) => `${s} (${f.join(", ")})`).join(" ; ");

export const TERRITORIES_SYSTEM = () => `Rôle : directeur artistique senior d'une agence de branding reconnue (niveau 2026). Avant tout dessin, tu proposes des TERRITOIRES CRÉATIFS de logo pour la marque décrite dans le contexte, comme dans une vraie présentation d'agence.
Démarche : comprends l'entreprise, son activité réelle, sa clientèle, sa personnalité, ce qui la distingue ; repère les codes visuels de son secteur ; puis invente des directions qui lui appartiennent. AUCUN style n'est privilégié ni imposé : logotype pur, monogramme, symbole, emblème, illustré, minimaliste, premium, texturé, dégradés… choisis ce qui sert CETTE marque. Aucune forme, aucun objet du métier, aucune initiale, aucune texture n'est obligatoire.
Chaque territoire est RÉELLEMENT différent des autres sur au moins trois de ces axes : style, type de marque (markType), composition, style typographique, construction graphique, niveau de sobriété. Jamais « le même logo dans une autre couleur ».
- style : ${LOGO_STYLES.join(", ")} — ${Object.entries(STYLE_GUIDE).map(([k, v]) => `${k} = ${v.split(":")[0].toLowerCase()}`).join(" ; ")} ;
- markType : wordmark (nom seul dessiné), lettermark (initiale(s) seule(s) comme marque), monogram (initiales construites + nom), symbol_wordmark (symbole + nom), abstract_mark (forme abstraite + nom), emblem (sceau / badge réunissant marque et nom) — choisis ce qui sert la marque, pas par défaut ;
- composition : horizontal, stacked, wordmark_only, badge ;
- typography.style parmi : ${fontsList()} ; weight, case, tracking ; rationale : pourquoi ce choix (pas de faux luxe, pas d'association amateur) ;
- construction : geometric, organic, typographic, modular, illustrative ;
- sobriety : 1 (très sobre) à 5 (expressif) ;
- colorRole : rôles de la palette de la marque (primary, secondary, accent, light, dark) pour l'encre du nom et l'accent ;
- symbolIdea (types à symbole ou monogramme, sinon null) : UNE idée graphique forte tirée de la logique du métier (geste, outil, matière, résultat, bénéfice). un objet ou un geste du métier de CETTE entreprise est permis s'il est intégré de façon originale et professionnelle, mais jamais exigé ; seuls les clichés MALADROITS sont à éviter (icône de banque d'images, assemblage convenu) ;
- descriptor : ligne d'activités sous le nom, en capitales, 1 à 3 activités RÉELLES de l'entreprise séparées par « • » (seulement celles du contexte), ou null ;
- distinctive : ce qui rend ce territoire mémorable ; avoid : ce qu'il faut éviter en le dessinant.
Règles : le nom de la marque sera écrit EXACTEMENT tel quel (accents compris) ; aucun slogan inventé dans le logo (un slogan n'y figure que s'il a été validé par le client) ; respecte les refus et décisions du client indiqués ; ne reproduis aucun logo existant.
Langue de « name », « concept », « whyItFits », « distinctive », « rationale » : ${uiLang() === "en" ? "English" : "français"}.`;

export const SYMBOL_SYSTEM = `Rôle : designer de marques (niveau agence). Tu dessines le SYMBOLE d'un territoire de logo déjà défini, en SVG vectoriel propre.
Le symbole traduit l'idée du territoire (symbolIdea) avec un parti pris graphique net (coupe, réserve, négatif, rythme, construction) ; il doit rester lisible à 16 px et en une seule couleur ; jamais une icône de bibliothèque ; un objet du métier est permis s'il est stylisé avec un vrai parti pris.
Règles strictes du SVG (toute entorse = refus automatique) :
- un seul <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"> ; dessin centré occupant 80 à 90 % du cadre ;
- 1 à 3 formes parmi <path>, <circle>, <ellipse>, <rect>, <polygon>, <polyline>, <line>, éventuellement dans <g> ;
- aplats ou traits épais (stroke-width de 8 à 14, linecap et linejoin « round ») ; aucun détail de moins de 6 unités ;
- fill/stroke = "currentColor", "none" ou le code exact de la couleur d'accent fournie (une forme au plus) ; jamais de blanc (découpe : fill-rule="evenodd") ;
- interdits : <text>, lettres, chiffres, <image>, <use>, <style>, <script>, <defs>, <filter>, <mask>, <clipPath>, dégradés, attributs style, class, transform, href, on…, url(…), commentaires ; au plus 600 nombres.
Si une image de CONCEPT est jointe (proposée par l'IA d'images) : c'est la référence graphique à finaliser — garde son idée, sa silhouette et son parti pris, simplifie-la en formes nettes ; ne la remplace pas par une autre idée.
Réponds { "idea": "ce que montre le symbole, une phrase", "svg": "<svg …>…</svg>" }.`;

export const REVIEW_SYSTEM = `Rôle : directeur de création exigeant d'une grande agence de branding. Tu juges UNE proposition de logo avant qu'elle soit présentée au client, sur une planche : en couleur sur fond neutre, en noir seul, en blanc sur fond sombre, puis en petite taille (64 px et 24 px).
Note de 0 à 10 : relevance (évoque CETTE marque, son activité, sa clientèle), originality (pas déjà vu, pas un générateur automatique), legibility (le nom se lit d'un coup d'œil), typography (choix et dessin du texte : justes, soignés, sans faux luxe), composition, balance, memorability, smallSize (net en petit), monochrome (tient en une couleur), versatility (fonctionne sur tous les supports).
Lis le texte du logo LETTRE PAR LETTRE, accents compris, et recopie-le exactement dans « textRead ».
Défauts : « cliche » (objet attendu du métier dessiné littéralement, icône convenue), « resemblesKnownBrand » (rappelle un logo connu), « amateur » (rendu de générateur automatique, déséquilibré, daté).
Sois strict : 8 se mérite ; un logo seulement correct n'est pas présenté. « issues » : défauts concrets. « fix » : LA correction la plus utile — sa cible (typography, symbol, composition, color, spacing) et l'instruction précise (ex. « symbole intéressant mais typographie faible : passer à une linéale plus resserrée, graisse plus forte ») ; « none » si rien à corriger.
Langue de « issues » et « fix.instruction » : ${"langue de l'interface"}.`;

/** IA réelle (studio et benchmark). */
export function realLogoV2Ai(ctx: JobContext | null, b: { userId: string; projectId: string }): LogoV2Ai {
  const base = { userId: b.userId, projectId: b.projectId, jobId: ctx?.job.id ?? null };
  const key = (k: string) => (ctx ? `${ctx.job.id}:logo-v2:${k}` : undefined);
  return {
    async territories(brief, n, avoid) {
      const r = await llmJson(
        {
          task: "logo_symbol",
          ...base,
          usageKey: key("territories"),
          promptKey: "logo-v2-territories",
          system: TERRITORIES_SYSTEM(),
          context: brief.brainContext,
          prompt: `Nom exact de la marque : « ${brief.name} ». Activité : ${brief.activity}. Métier compris : ${brief.trade.label}${brief.trade.actions.length ? ` (gestes : ${brief.trade.actions.join(", ")})` : ""}.
Activités réelles (seules autorisées dans « descriptor ») : ${brief.activities.join(", ") || brief.activity || "[À compléter : activités]"}.
Symboles convenus à ne pas dessiner de façon banale : ${brief.cliches.slice(0, 12).join(", ")}.
${brief.style !== "auto" ? `Style choisi par le client : ${brief.style} — tous les territoires dans ce style, différents sur les autres axes.\n` : "Style : propose plusieurs styles différents, adaptés à cette entreprise.\n"}
${brief.rejectedMarkTypes.length ? `Types de logo refusés par le client (ne pas proposer) : ${brief.rejectedMarkTypes.join(", ")}.\n` : ""}${avoid.length ? `Territoires déjà montrés (ne pas reprendre) : ${avoid.join(" ; ")}.\n` : ""}${brief.fontsLocked ? `Typographie validée par le client (à garder) : ${brief.fontsLocked.heading}.\n` : ""}Propose ${n} territoires. Réponds { "territories": [ { "name", "concept", "whyItFits", "style", "descriptor", "markType", "composition", "typography": { "style", "weight", "case", "tracking", "rationale" }, "colorRole": { "ink", "accent", "rationale" }, "sobriety", "construction", "symbolIdea", "distinctive", "avoid": [] } ] }.`,
          maxTokens: 9000,
        },
        TerritoriesSchema,
      );
      return r.territories;
    },
    async drawSymbol(t, brief, feedback, concept) {
      return llmJson(
        {
          task: "logo_symbol",
          ...base,
          usageKey: key(`symbol:${t.id}:${feedback ? "r" : "0"}:${(feedback ?? "").length}${concept ? ":c" : ""}`),
          promptKey: concept ? "logo-v2-symbol-finalize" : "logo-v2-symbol",
          system: SYMBOL_SYSTEM,
          context: brief.brainContext,
          ...(concept ? { images: [{ data: concept, label: L("concept du symbole (IA d'images) à finaliser en vectoriel", "symbol concept (image AI) to finalize as vector") }] } : {}),
          prompt: `Territoire « ${t.name} » : ${t.concept}\nIdée du symbole : ${t.symbolIdea ?? "à tirer du concept"}\nConstruction : ${t.construction} ; sobriété ${t.sobriety}/5 ; à éviter : ${[...t.avoid, ...brief.cliches.slice(0, 6)].join(", ")}.\nCouleur d'accent (code exact) : ${brief.palette[t.colorRole.accent]}.${feedback ? `\nREPRISE CIBLÉE — la version précédente a été refusée : ${feedback}. Corrige exactement ce point, garde l'idée si elle n'est pas en cause.` : ""}`,
          maxTokens: 6000,
        },
        z.object({ idea: z.string().catch(""), svg: z.string() }),
      );
    },
    async exploreSymbol(t, _brief, feedback) {
      const { imageProviderAvailable, logoSymbolImage } = await import("../ai/media-providers");
      if (!imageProviderAvailable({ usage: "logo" }) || !t.symbolIdea) return null;
      return logoSymbolImage({ ...base, usageKey: key(`explore:${t.id}${feedback ? `:r${feedback.length}` : ""}`) }, { concept: `${t.symbolIdea}. ${t.distinctive}${feedback ? ` Fix these issues from the previous version: ${feedback}` : ""}` });
    },
    conceptRoute() {
      // Même décision que la génération (principal, secours, mode de l'usage « Logos »).
      const r = mediaRouteFor("logo");
      return r ?? { unavailable: imageUnavailableReason("logo") ?? L("aucun modèle d'images utilisable pour les logos", "no usable image model for logos") };
    },
    artworkRoute() {
      // Logo complet : le modèle doit savoir écrire le nom (même décision que la génération pour l'usage « Logos »).
      const r = mediaRouteFor("logo", { text: true, transparent: true });
      return r ?? { unavailable: imageUnavailableReason("logo") ?? L("aucun modèle d'images capable d'écrire le nom pour les logos", "no image model able to write the name for logos") };
    },
    async drawArtwork(t, brief, feedback) {
      const { logoArtworkImage } = await import("../ai/media-providers");
      return logoArtworkImage({ ...base, usageKey: key(`art:${t.id}${feedback ? `:r${feedback.length}` : ""}`) }, { prompt: artworkPrompt(t, brief, feedback) });
    },
    async reviewArtwork(board, t, brief, expected) {
      return llmJson(
        {
          task: "quality_control",
          ...base,
          usageKey: key(`art-review:${t.id}:${board.length}`),
          promptKey: "logo-v2-artwork-review",
          routing: { difficulty: "complex", deliverable: "logo_v2" },
          system: ARTWORK_REVIEW_SYSTEM(t.style),
          context: brief.brainContext,
          images: [{ data: board, label: L("planche de contrôle du logo complet", "full logo review board") }],
          prompt: `Territoire « ${t.name} » — concept : ${t.concept}\nStyle : ${t.style} ; type : ${t.markType}.\nNom attendu (exact) : « ${expected.name} ».${expected.descriptor ? ` Ligne d'activités autorisée : « ${expected.descriptor} ».` : ""}${expected.tagline ? ` Slogan validé autorisé : « ${expected.tagline} ».` : ""}\nRéponds { "criteria": { ${ART_CRITERIA.map((k) => `"${k}": 0`).join(", ")} }, "textRead": "…", "nameExact": true, "extraText": false, "nameBox": { "x": 0, "y": 0, "w": 0, "h": 0 }, "clumsyCliche": false, "resemblesKnownBrand": false, "amateur": false, "artifacts": false, "issues": [], "needsSimplifiedMark": true }.`,
          maxTokens: 3000,
        },
        ArtworkReviewSchema,
      ) as Promise<ArtworkReview>;
    },
    async review(board, t, brief, expected) {
      return llmJson(
        {
          task: "quality_control",
          ...base,
          usageKey: key(`review:${t.id}:${board.length}`),
          promptKey: "logo-v2-review",
          // La relecture décide FINAL : niveau fort directement (pas d'essai faible d'abord).
          routing: { difficulty: "complex", deliverable: "logo_v2" },
          system: REVIEW_SYSTEM,
          context: brief.brainContext,
          images: [{ data: board, label: L("planche de contrôle du logo", "logo review board") }],
          prompt: `Territoire « ${t.name} » — concept : ${t.concept}\nType : ${t.markType}, composition ${t.composition}, typographie ${t.typography.style}.\nTexte attendu (exact) : « ${expected} ».\nRéponds { "criteria": { "relevance": 0, "originality": 0, "legibility": 0, "typography": 0, "composition": 0, "balance": 0, "memorability": 0, "smallSize": 0, "monochrome": 0, "versatility": 0 }, "textRead": "…", "cliche": false, "resemblesKnownBrand": false, "amateur": false, "issues": [], "fix": { "target": "typography|symbol|composition|color|spacing|none", "instruction": "…" } }.`,
          maxTokens: 3000,
        },
        LogoReviewSchema,
      ) as Promise<LogoReview>;
    },
  };
}
