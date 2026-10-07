/**
 * Intent Engine (phase 3A) : ce que le client veut, sous une forme structurée et combinable.
 *
 * Déterministe d'abord :
 *  - une ACTION connue (bouton, tâche de fond, route d'API) donne son intention sans aucun appel à l'IA ;
 *  - une demande libre est d'abord lue par des règles (mots du métier, FR/EN, sans accents) ;
 *  - l'IA (classement court, sorties validées) n'est appelée que si la demande reste ambiguë ET que l'IA est
 *    active pour le compte. Sans IA (forfait Découverte) : on demande une précision, jamais d'appel payant.
 */
import { z } from "zod";

export const INTENTS = [
  "ANALYZE_PRODUCT",
  "CREATE_BRAND",
  "CREATE_LOGO",
  "IMPROVE_LOGO",
  "FIND_STOCK_IMAGE",
  "GENERATE_IMAGE",
  "WRITE_PRODUCT_COPY",
  "SEO",
  "BLOG",
  "SOCIAL",
  "CREATE_AD",
  "CREATE_VIDEO",
  "CREATE_SHOP",
  "CREATE_THEME",
  "EDIT_THEME",
  "ORGANIZE_FILES",
  "PUBLISH",
] as const;
export type Intent = (typeof INTENTS)[number];

export type IntentResult = {
  intents: Intent[];
  source: "action" | "rules" | "ai" | "none";
  confidence: number;
  /** Demande libre non comprise : question à poser au client (jamais une supposition). */
  clarification?: string;
  /** Mots qui ont déclenché chaque intention (règles), pour la trace. */
  matched?: Partial<Record<Intent, string>>;
};

/** Actions du studio (tâches de fond, boutons, routes) → intentions, sans IA. */
export const ACTION_INTENTS: Record<string, Intent[]> = {
  "pipeline.run": ["ANALYZE_PRODUCT", "CREATE_BRAND", "CREATE_SHOP"],
  "cutout.run": ["ANALYZE_PRODUCT"],
  "images.generate": ["GENERATE_IMAGE"],
  "image.single": ["GENERATE_IMAGE"],
  "stock.search": ["FIND_STOCK_IMAGE"],
  "video.render": ["CREATE_VIDEO"],
  "ugc.script": ["CREATE_VIDEO"],
  "video.ugc": ["CREATE_VIDEO"],
  "blog.write": ["BLOG"],
  "blog.generate": ["BLOG"],
  "blog.topics": ["BLOG"],
  "brand.fulllogo": ["CREATE_LOGO"],
  "brand.logo": ["IMPROVE_LOGO"],
  "brand.logo.regenerate": ["CREATE_LOGO"],
  "logo.create": ["CREATE_LOGO"],
  "brand.build": ["CREATE_BRAND"],
  "copy.build": ["WRITE_PRODUCT_COPY"],
  "seo.generate": ["SEO"],
  "shop.build": ["CREATE_SHOP"],
  "shop.direction": ["CREATE_THEME"],
  "theme.custom": ["CREATE_THEME"],
  "shop.chat": ["EDIT_THEME"],
  "calendar.plan": ["SOCIAL"],
  "post.regenerate": ["SOCIAL"],
  "social.voice": ["SOCIAL"],
  "ads.draft": ["CREATE_AD"],
  "files.classify": ["ORGANIZE_FILES"],
  "post.publish": ["PUBLISH"],
  "shopify.push": ["PUBLISH"],
  "canva.send": ["PUBLISH"],
  "canva.import": ["ORGANIZE_FILES"],
};

/** Intention d'une action connue (null : action inconnue, jamais devinée). */
export function intentsFromAction(action: string, payload?: { regenerate?: boolean }): Intent[] | null {
  if (action === "brand.logo" && payload?.regenerate) return ACTION_INTENTS["brand.logo.regenerate"];
  return ACTION_INTENTS[action] ?? null;
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Règles de lecture d'une demande libre (ordre = priorité d'affichage ; plusieurs intentions possibles). */
const RULES: [Intent, RegExp][] = [
  ["IMPROVE_LOGO", /\b(ameliore|retouche|modifie|change|corrige|refai[st]|improve|fix|tweak|redo)\w*\b[^.]{0,30}\blogos?\b|\blogos?\b[^.]{0,30}\b(plus|trop|moins|more|less|too)\b/],
  ["CREATE_LOGO", /\blogos?\b/],
  ["CREATE_BRAND", /\b(marque|identite|branding|brand|charte)\b/],
  ["EDIT_THEME", /\b(ameliore|modifie|change|corrige|deplace|agrandi|retouche|edit|move|change|fix)\w*\b[^.]{0,40}\b(page|section|bouton|banniere|accueil|menu|header|footer|button|banner|homepage|site)\b/],
  ["CREATE_SHOP", /\b(boutique|site|shop|store|vitrine|website)\b/],
  ["WRITE_PRODUCT_COPY", /\b(fiche produit|description|textes?|copy|copywriting|redige|redaction|product page)\b/],
  ["SEO", /\b(seo|referencement|meta|google ranking|mots?[- ]cles?|keywords?)\b/],
  ["BLOG", /\b(blog|articles?)\b/],
  ["SOCIAL", /\b(instagram|tiktok|facebook|pinterest|linkedin|publications?|posts?|reseaux sociaux|social|calendrier editorial)\b/],
  ["CREATE_AD", /\b(pub|pubs|publicites?|annonces?|ads?|campagnes?|advert\w*)\b/],
  ["CREATE_VIDEO", /\b(videos?|ugc|reels?|montage)\b/],
  ["FIND_STOCK_IMAGE", /\b(photo libre|banque d'images|stock|libre de droits|royalty[- ]free)\b/],
  ["GENERATE_IMAGE", /\b(images?|visuels?|photos?|mockups?|banniere|banner)\b/],
  ["ANALYZE_PRODUCT", /\b(analyse|analyze|comprend\w*|etudie)\b[^.]{0,30}\b(produit|product|photo|activite)\b/],
  ["PUBLISH", /\b(publie|publier|envoie sur shopify|mettre en ligne|publish|push)\b/],
];

/** Lecture déterministe d'une demande libre. */
export function intentsFromRules(text: string): IntentResult {
  const t = norm(text);
  const matched: Partial<Record<Intent, string>> = {};
  for (const [intent, re] of RULES) {
    const m = re.exec(t);
    if (m) matched[intent] = m[0].trim();
  }
  let intents = Object.keys(matched) as Intent[];
  // Une retouche de logo n'est pas une création ; une retouche de page n'est pas une nouvelle boutique.
  if (intents.includes("IMPROVE_LOGO")) intents = intents.filter((i) => i !== "CREATE_LOGO");
  if (intents.includes("EDIT_THEME")) intents = intents.filter((i) => i !== "CREATE_SHOP" && i !== "GENERATE_IMAGE");
  // Une image libre de droits demandée explicitement n'est pas une génération.
  if (intents.includes("FIND_STOCK_IMAGE")) intents = intents.filter((i) => i !== "GENERATE_IMAGE");
  // Une marque complète comprend son logo.
  if (intents.includes("CREATE_BRAND")) intents = intents.filter((i) => i !== "CREATE_LOGO");
  if (!intents.length) return { intents: [], source: "none", confidence: 0, clarification: CLARIFY };
  // Très court et très général (« le site », « des images ») : objet compris, mais pas ce qu'il faut en faire.
  const vague = intents.length === 1 && ["GENERATE_IMAGE", "CREATE_SHOP"].includes(intents[0]) && t.split(/\s+/).filter(Boolean).length <= 2;
  return { intents: order(intents), source: "rules", confidence: vague ? 0.4 : 0.85, matched };
}

const CLARIFY = "Que souhaitez-vous faire : logo, marque, boutique, textes, images, vidéo, publicité, publications ou articles ?";

/** Ordre de travail naturel (une marque avant sa boutique, des visuels avant la publicité…). */
const ORDER: Intent[] = ["ANALYZE_PRODUCT", "CREATE_BRAND", "CREATE_LOGO", "IMPROVE_LOGO", "FIND_STOCK_IMAGE", "GENERATE_IMAGE", "WRITE_PRODUCT_COPY", "SEO", "CREATE_SHOP", "CREATE_THEME", "EDIT_THEME", "BLOG", "SOCIAL", "CREATE_AD", "CREATE_VIDEO", "ORGANIZE_FILES", "PUBLISH"];
const order = (xs: Intent[]) => [...new Set(xs)].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));

export const IntentAiSchema = z.object({
  intents: z.array(z.enum(INTENTS)).max(6).catch([]),
  confidence: z.coerce.number().min(0).max(1).catch(0),
  clarification: z.string().max(300).optional().catch(undefined),
});

/** Classement par l'IA (injecté : l'appel réel vit dans classifyIntent ; les tests le simulent). */
export type IntentClassifier = (text: string) => Promise<z.infer<typeof IntentAiSchema>>;

/**
 * Intention d'une demande : action connue → sans IA ; sinon règles ; sinon (ambiguë) IA si active ; sinon question.
 * `classify` n'est appelé que pour une demande libre réellement ambiguë.
 */
export async function understand(req: { action?: string; payload?: { regenerate?: boolean }; text?: string }, opts: { aiActive: boolean; classify?: IntentClassifier }): Promise<IntentResult> {
  if (req.action) {
    const a = intentsFromAction(req.action, req.payload);
    if (a) return { intents: a, source: "action", confidence: 1 };
  }
  const text = (req.text ?? "").trim();
  if (!text) return { intents: [], source: "none", confidence: 0, clarification: CLARIFY };
  const r = intentsFromRules(text);
  if (r.intents.length && r.confidence >= 0.7) return r;
  if (!opts.aiActive || !opts.classify) return { ...r, intents: r.confidence >= 0.7 ? r.intents : [], clarification: CLARIFY };
  const ai = await opts.classify(text);
  const intents = order(ai.intents);
  if (!intents.length || ai.confidence < 0.5) return { intents: [], source: "ai", confidence: ai.confidence, clarification: ai.clarification || CLARIFY };
  return { intents, source: "ai", confidence: ai.confidence };
}

/**
 * Classement réel par l'IA (tâche « classification », niveau léger, sortie validée). Aucun contexte projet :
 * seule la phrase du client est classée. Appelé uniquement par understand() pour une demande ambiguë.
 */
export function aiIntentClassifier(b: { userId: string; projectId?: string | null; jobId?: string | null }): IntentClassifier {
  return async (text) => {
    const { llmJson } = await import("../ai/llm");
    return llmJson(
      {
        task: "classification",
        userId: b.userId,
        projectId: b.projectId,
        jobId: b.jobId,
        promptKey: "intent",
        system: `Tu classes la demande d'un client d'un studio de création (marque, logo, boutique, images, vidéos, publicités, publications, articles). Intentions possibles : ${INTENTS.join(", ")}. Plusieurs intentions si la demande en combine plusieurs. Si la demande est trop vague pour agir, aucune intention et une question courte de clarification en français. Réponds { "intents": [], "confidence": 0-1, "clarification": "" }.`,
        prompt: `Demande : « ${text.slice(0, 600)} »`,
        maxTokens: 400,
      },
      IntentAiSchema,
    );
  };
}
