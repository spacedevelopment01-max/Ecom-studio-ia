import { FONT_HANDLES } from "../theme/render";
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
import { imageUnavailableReason, logoQualityRelay, mediaRouteFor } from "../ai/media-providers";
import { L, uiLang } from "../i18n-server";
import { STYLE_FONTS, TerritoriesSchema, type TerritoryDraft } from "./territories";
import { LogoReviewSchema } from "./quality";
import { z } from "zod";
import type { ArtworkReview, BrandBrief, LogoReview, Territory } from "./types";
import { ART_CRITERIA, LOGO_STYLES } from "./types";
import { ARTWORK_REVIEW_SYSTEM, artworkPrompt, STYLE_GUIDE } from "./artwork";
import { directionSeriesPaletteIssues } from "./direction-palette";
import { renderDirectionPreview } from "./direction-preview";
import { loadProject } from "../projects";

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
  /**
   * RELAIS DE QUALITÉ (règle du propriétaire) : modèle d'OpenAI qui redessine un logo que le contrôle a jugé
   * insuffisant (ou la raison de son absence).
   */
  relayRoute?(): { provider: string; model: string } | { unavailable: string };
  /** Logo complet redessiné par le relais de qualité (OpenAI), avec la critique du contrôle. */
  drawArtworkRelay?(t: Territory, brief: BrandBrief, feedback?: string): Promise<Buffer>;
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
  person: z.boolean().catch(false),
  issues: z.array(z.string().max(300)).max(8).catch([]),
  needsSimplifiedMark: z.boolean().catch(true),
  genericConcept: z.boolean().catch(false),
  fix: z.object({ target: z.enum(["symbol", "typography", "composition", "colour", "concept", "none"]).catch("none"), instruction: z.string().max(400).catch("") }).catch({ target: "none", instruction: "" }),
});

const fontsList = () => Object.entries(STYLE_FONTS).map(([s, f]) => `${s} (${f.join(", ")})`).join(" ; ");

export const TERRITORIES_SYSTEM = () => `Pour chaque territoire, ajoute identity : { signature (proposition, jamais une preuve), palette: {primary,secondary,accent,light,dark} (HEX), colorRoles: {primary,secondary,accent,light,dark} (rôle détaillé), fonts: {heading,body} (identifiants de polices disponibles), tone: {voice,do:[],dont:[]}, mood, graphicLanguage, rules:[] (au moins deux), sampleText }. Polices autorisées : ${FONT_HANDLES.join(", ")}. Le nom de marque est UNIQUE et identique dans les trois directions. Palette, typographies, écriture, ambiance et langage graphique doivent former un ensemble distinct, pas une recoloration. Utilise les couleurs identity.palette dans colors et imageBrief ; utilise identity.fonts pour la typographie.
PALETTES COMPLÈTES : chaque direction possède ses propres primary, secondary ET accent, chacun distinct des deux autres dans cette direction ET du même rôle dans les autres directions. Ne partage pas un duo secondary/accent en ne changeant que primary. Justifie dans colorRoles l'accord de ces trois fonctions avec le même nom, la stratégie et l'univers proposé : signature/titres, surfaces, appels à l'action. Cherche une harmonie intentionnelle, pas une distance numérique ni des couleurs criardes. light et dark forment une base neutre claire/sombre lisible, commune aux directions ou légèrement teintée ; ce ne sont pas deux accents supplémentaires. Les rendus utiliseront primary pour les titres sur light, dark pour le texte sur light, secondary pour les surfaces avec le plus lisible de dark/light, accent pour le CTA avec le plus lisible de dark/light. Chacune de ces associations doit atteindre 4.5:1. Vérifie la cohérence et la distinction visuelle des trois ensembles avant de répondre. Aucune couleur hors palette ni correction automatique au rendu.
Rôle : directeur artistique senior, spécialiste des logos de petites entreprises, artisans, commerces et indépendants. Avant tout dessin, tu proposes des TERRITOIRES CRÉATIFS de logo pour la marque décrite dans le contexte.
Ce que veulent ces entreprises et leurs clients : un logo BEAU, soigné, chaleureux et professionnel, qui fait comprendre le métier AU PREMIER REGARD. Les éléments reconnaissables du métier (ses outils, ses matières, ses produits, son lieu, ses gestes), dessinés avec talent, sont le cœur du logo, pas des clichés à fuir. Un emblème rond ou un arc, une icône au-dessus du nom, un nom en écriture script élégante, deux couleurs franches : ce sont des solutions appréciées quand elles sont bien exécutées. Jamais un concept abstrait qu'il faudrait expliquer.
Démarche : comprends l'entreprise, son activité réelle, sa clientèle, sa personnalité ; repère les codes visuels de son secteur et sers-t'en avec un niveau de finition supérieur.
Chaque territoire est RÉELLEMENT différent des autres sur au moins trois de ces axes : style, type de marque (markType), composition, style typographique, construction graphique, niveau de sobriété. Jamais « le même logo dans une autre couleur ».
Portefeuille (style libre, au moins 3 territoires) : les TROIS PREMIERS couvrent trois familles — 1) un EMBLÈME ILLUSTRÉ : les éléments du métier (outils, matières, produits, lieu) réunis dans une composition riche et équilibrée, souvent dans un cercle ou un arc, avec le nom en grand (écriture script élégante ou capitales) en deux couleurs, la ligne d'activités et éventuellement un arc de texte ; 2) une ICÔNE + NOM : une icône du métier nette, moderne et immédiatement lisible au-dessus ou à gauche du nom en lettres franches, comme les meilleurs logos de commerce ; 3) une SIGNATURE : le nom en écriture script ou en lettrage soigné, accompagné d'un signe du métier bien dessiné (outil, trace, silhouette). Les suivants sont libres.
- style : ${LOGO_STYLES.join(", ")} — ${Object.entries(STYLE_GUIDE).map(([k, v]) => `${k} = ${v.split(":")[0].toLowerCase()}`).join(" ; ")} ;
- markType : wordmark (nom seul dessiné), lettermark (initiale(s) seule(s) comme marque), monogram (initiales construites + nom), symbol_wordmark (symbole + nom), abstract_mark (forme abstraite + nom), emblem (sceau / badge réunissant marque et nom) — choisis ce qui sert la marque, pas par défaut ;
- composition : horizontal, stacked, wordmark_only, badge ;
- typography.style parmi : ${fontsList()} ; weight, case, tracking ; rationale : pourquoi ce choix (pas de faux luxe, pas d'association amateur) ;
- construction : geometric, organic, typographic, modular, illustrative ;
- sobriety : 1 (très sobre) à 5 (expressif) ;
- colorRole : rôles de la palette de la marque (primary, secondary, accent, light, dark) pour l'encre du nom et l'accent ;
- symbolIdea (types à symbole ou monogramme, sinon null) : UNE idée graphique forte et LISIBLE tirée de la logique du métier (geste, outil, matière, lieu, résultat, bénéfice) : un client doit pouvoir dire ce qu'il voit et le relier à l'activité. Un objet ou un geste du métier de CETTE entreprise, stylisé avec talent et intégré de façon originale, est bienvenu ; seuls les clichés MALADROITS sont à éviter (icône de banque d'images, assemblage convenu) ;
- descriptor : ligne d'activités sous le nom, en capitales, 1 à 3 activités RÉELLES de l'entreprise séparées par « • » (seulement celles du contexte), ou null ;
- distinctive : ce qui rend ce territoire mémorable ; avoid : ce qu'il faut éviter en le dessinant ;
- imageBrief (EN FRANÇAIS, 60 à 110 mots, UNIQUEMENT des consignes positives et concrètes : objets, formes, matières, lumière, couleurs) : la commande passée au modèle d'images, comme un directeur artistique qui décrit précisément le logo à dessiner. Il dit : la MARQUE au centre, belle, riche et lisible de loin — ce qu'elle montre exactement (les éléments reconnaissables du métier : outils, matières, produits, lieu, réunis en une composition harmonieuse ; ou une icône nette ; ou des initiales), leur rendu (dessin net, détails soignés, matière ou texture réaliste permise) ; la composition (marque au-dessus ou à gauche du nom) ; le nom bien mis en valeur et parfaitement lisible (écriture script élégante ou capitales soignées, un mot du nom peut prendre la couleur d'accent) ; la ligne d'activités plus petite et espacée ; deux ou trois couleurs nommées avec leur code HEX. AUCUNE liste « à éviter » ni négation : décris seulement ce qu'il faut dessiner. Aucun guillemet : n'y recopie NI le nom NI la ligne d'activités en toutes lettres, écris « le nom » et « la ligne d'activités » (le studio ajoute le texte exact, seul texte entre guillemets de la commande). Fond blanc uni. Jamais d'idée qu'il faudrait expliquer pour la voir, jamais de formule générique (« logo moderne minimaliste ») ;
- colors : 2 ou 3 couleurs HEX choisies pour CETTE marque et ce territoire (accord juste avec le métier, le positionnement et la clientèle) — seulement si la palette n'est pas validée par le client, sinon [].
À NE PAS proposer : une forme banale sans rien du métier (cercle, triangle ou carré vide), une abstraction (plans, bandes, transitions, « lumière ») que personne ne peut relier au métier, une police standard posée sans composition, un dessin grossier façon clip-art bas de gamme.
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
      const proposedAlternatives = !!loadProject(b.projectId).brand?.artIdentity;
      const alternativeScope = proposedAlternatives ? "NOUVELLES PROPOSITIONS : l’identité complète déjà choisie (palette et polices verrouillées dans le contexte) reste appliquée tant que le client n’en choisit pas une autre. Cette demande autorise trois ensembles alternatifs, chacun avec sa propre palette complète et ses polices. Ne recopie pas la palette du choix précédent dans les trois propositions. Respecte toujours les interdits et les contraintes explicites du client. Aucun changement de la marque existante à cette étape." : "";
      const r = await llmJson(
        {
          task: "logo_symbol",
          ...base,
          usageKey: key("territories"),
          promptKey: "logo-v2-territories",
          system: TERRITORIES_SYSTEM(),
          context: [brief.brainContext, alternativeScope].filter(Boolean).join("\n"),
          prompt: `Nom exact de la marque : « ${brief.name} ». Activité : ${brief.activity}. Métier compris : ${brief.trade.label}${brief.trade.actions.length ? ` (gestes : ${brief.trade.actions.join(", ")})` : ""}.
Activités réelles (seules autorisées dans « descriptor ») : ${brief.activities.join(", ") || brief.activity || "[À compléter : activités]"}.
Symboles convenus du secteur (à styliser avec talent si tu les utilises, jamais en icône de banque d'images) : ${brief.cliches.slice(0, 12).join(", ")}.
${brief.style !== "auto" ? `Style choisi par le client : ${brief.style} — tous les territoires dans ce style, différents sur les autres axes.\n` : "Style : propose plusieurs styles différents, adaptés à cette entreprise.\n"}
${brief.rejectedMarkTypes.length ? `Types de logo refusés par le client (ne pas proposer) : ${brief.rejectedMarkTypes.join(", ")}.\n` : ""}${avoid.length ? `Territoires déjà montrés (ne pas reprendre) : ${avoid.join(" ; ")}.\n` : ""}${brief.fontsLocked && !proposedAlternatives ? `Typographie validée par le client (à garder) : ${brief.fontsLocked.heading}.\n` : ""}${brief.positioning ? `Positionnement : ${brief.positioning}.\n` : ""}${brief.audience ? `Clientèle : ${brief.audience}.\n` : ""}${brief.personality.length ? `Personnalité : ${brief.personality.join(", ")}.\n` : ""}${proposedAlternatives ? `${alternativeScope}\n` : brief.paletteLocked ? `Palette validée par le client (à garder, « colors » vide) : ${Object.values(brief.palette).join(", ")}. Si cette contrainte empêche trois palettes distinctes, le signaler : ne pas la contourner ni prétendre à trois ensembles valides.\n` : "Palette non validée : choisis les couleurs de chaque territoire (« colors »).\n"}Propose ${n} territoires. Réponds { "territories": [ { "name", "concept", "whyItFits", "style", "descriptor", "markType", "composition", "typography": { "style", "weight", "case", "tracking", "rationale" }, "colorRole": { "ink", "accent", "rationale" }, "sobriety", "construction", "symbolIdea", "distinctive", "avoid": [], "imageBrief", "colors": [] } ] }.`,
          maxTokens: 9000,
        },
        TerritoriesSchema.refine(v => v.territories.every(t => !!t.identity), "Chaque direction doit contenir son identité complète.").superRefine((v, ctx) => {
          if (v.territories.every(t => !!t.identity)) for (const message of directionSeriesPaletteIssues(v.territories.map(t => t.identity!))) ctx.addIssue({ code: z.ZodIssueCode.custom, message });
        }),
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
      return logoSymbolImage({ ...base, usageKey: key(`explore:${t.id}${feedback ? `:r${feedback.length}` : ""}`) }, { concept: `${t.symbolIdea}. ${t.distinctive}${feedback ? ` Corrige ces défauts de la version précédente : ${feedback}` : ""}` });
    },
    conceptRoute() {
      // Même décision que la génération (principal, secours, mode de l'usage « Logos »).
      const r = mediaRouteFor("logo");
      return r ?? { unavailable: imageUnavailableReason("logo") ?? L("aucun modèle d'images utilisable pour les logos", "no usable image model for logos") };
    },
    artworkRoute() {
      // Logo complet : le modèle doit savoir écrire le nom (même décision que la génération pour l'usage « Logos »).
      const r = mediaRouteFor("logo", { text: true });
      return r ?? { unavailable: imageUnavailableReason("logo") ?? L("aucun modèle d'images capable d'écrire le nom pour les logos", "no image model able to write the name for logos") };
    },
    relayRoute() {
      return logoQualityRelay() ?? { unavailable: L("relais OpenAI indisponible (clé OpenAI absente ou désactivée, ou tarif inconnu)", "OpenAI relay unavailable (OpenAI key missing or disabled, or unknown price)") };
    },
    async drawArtworkRelay(t, brief, feedback) {
      const { logoArtworkRelayImage } = await import("../ai/media-providers");
      return logoArtworkRelayImage({ ...base, usageKey: key(`relay:${t.id}${feedback ? `:r${feedback.length}` : ""}`) }, { prompt: artworkPrompt(t, brief, feedback) });
    },
    async drawArtwork(t, brief, feedback) {
      const { logoArtworkImage } = await import("../ai/media-providers");
      return logoArtworkImage({ ...base, usageKey: key(`art:${t.id}${feedback ? `:r${feedback.length}` : ""}`) }, { prompt: artworkPrompt(t, brief, feedback) });
    },
    async reviewArtwork(board, t, brief, expected) {
      // Même palette et mêmes associations que la carte/planche. Relecture existante,
      // sans nouvel appel séparé et toujours sous les plafonds du contrôle qualité.
      const paletteBoard = t.identity ? await renderDirectionPreview(expected.name, { id: t.id, logoId: "", label: t.name, concept: t.concept, identity: t.identity, territory: t, version: 1 }, board) : null;
      return llmJson(
        {
          task: "quality_control",
          ...base,
          usageKey: key(`art-review:${t.id}:${board.length}`),
          promptKey: "logo-v2-artwork-review",
          routing: { difficulty: "complex", deliverable: "logo_v2" },
          system: ARTWORK_REVIEW_SYSTEM(t.style),
          context: brief.brainContext,
          images: [{ data: board, label: L("planche de contrôle du logo complet", "full logo review board") }, ...(paletteBoard ? [{ data: paletteBoard, label: L("palette complète et associations réelles : fond, titres, surfaces, texte, CTA", "complete palette and actual uses: background, headings, surfaces, text, CTA") }] : [])],
          prompt: `Territoire « ${t.name} » — concept : ${t.concept}\nStyle : ${t.style} ; type : ${t.markType}.\nNom attendu (exact) : « ${expected.name} ».${expected.descriptor ? ` Ligne d'activités autorisée : « ${expected.descriptor} ».` : ""}${expected.tagline ? ` Slogan validé autorisé : « ${expected.tagline} ».` : ""}\n${paletteBoard ? "La deuxième image présente l’identité appliquée, pas un deuxième logo. Dans colour, juge l'harmonie des cinq rôles et la lisibilité des associations, leur cohérence avec le même nom et la stratégie, la distinction face aux palettes des autres directions dans le contexte. Les trois premiers rôles doivent avoir des fonctions chromatiques distinctes ; les deux derniers sont des neutres. Refuse une palette arbitrairement criarde, incohérente ou une simple variation de primary ; décris précisément le problème dans issues/fix. Ne confonds pas une distance numérique avec une qualité artistique. textRead et nameBox concernent seulement le logo original dans la première image, pas les textes d’exemple de la planche.\n" : ""}Réponds { "criteria": { ${ART_CRITERIA.map((k) => `"${k}": 0`).join(", ")} }, "textRead": "…", "nameExact": true, "extraText": false, "nameBox": { "x": 0, "y": 0, "w": 0, "h": 0 }, "clumsyCliche": false, "resemblesKnownBrand": false, "amateur": false, "artifacts": false, "person": false, "genericConcept": false, "issues": [], "fix": { "target": "symbol|typography|composition|colour|concept|none", "instruction": "…" }, "needsSimplifiedMark": true }.`,
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
