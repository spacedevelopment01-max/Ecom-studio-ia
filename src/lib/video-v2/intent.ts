/**
 * Intention vidéo (sans IA) : but, public, support, format et durée attendue à partir de la demande et du projet.
 * Une demande simple (« une petite vidéo de mon produit ») reste un montage local de l'existant : jamais une
 * production complexe inutile. Ce qui n'est pas dit est déduit du projet, et chaque choix est expliqué.
 */
import type { Project } from "../projects";
import type { Complexity, VideoAspect, VideoIntent, VideoIntentKind, VideoPlatform } from "./types";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Mots-clés par intention (français et anglais), du plus spécifique au plus général. */
const RULES: { kind: VideoIntentKind; re: RegExp }[] = [
  { kind: "ugc", re: /\bugc\b|face camera|face a la camera|temoignage|avatar|influenc|createur de contenu|user[- ]generated|selfie/ },
  { kind: "product_tutorial", re: /tuto|tutoriel|tutorial|mode d'emploi|comment (utiliser|installer|monter)|how to (use|install)|etape par etape|step by step/ },
  { kind: "product_demo", re: /demo|demonstration|en action|montre(r)? comment .* fonctionne|fonctionnement|how it works/ },
  { kind: "explainer", re: /explicati|explique|explainer|pedagog|comprendre|motion design explicatif/ },
  { kind: "launch", re: /lancement|launch|nouveau produit|nouveaute|sortie|teaser|bientot disponible|coming soon/ },
  { kind: "trade_video", re: /metier|savoir[- ]faire|chantier|atelier|artisan|on the job|craft|realisations?/ },
  { kind: "service_presentation", re: /prestation|service|offre de service|nos services|intervention/ },
  { kind: "company_presentation", re: /presentation (de|d'une|de l')?\s*(l')?(entreprise|societe|equipe|activite)|qui sommes|about us|company (video|presentation)|corporate/ },
  { kind: "brand_film", re: /film de marque|brand (film|video)|manifeste|histoire de la marque|brand story|univers de (la )?marque/ },
  { kind: "lifestyle", re: /lifestyle|ambiance|art de vivre|au quotidien|in real life/ },
  { kind: "video_ad", re: /pub|publicit|annonce|\bad\b|\bads\b|campagne|spot|conversion|vendre|sell/ },
  { kind: "social_content", re: /reel|tiktok|short|story|stories|reseaux sociaux|social|post video|instagram/ },
];

const PLATFORM_RULES: { platform: VideoPlatform; re: RegExp }[] = [
  { platform: "tiktok", re: /tiktok/ },
  { platform: "reels", re: /reel|instagram|stories?|story/ },
  { platform: "shorts", re: /shorts?\b/ },
  { platform: "youtube", re: /youtube|chaine/ },
  { platform: "linkedin", re: /linkedin/ },
  { platform: "meta_feed", re: /facebook|fil d'actualite|feed/ },
  { platform: "shop_page", re: /fiche produit|page produit|boutique|product page|shop/ },
  { platform: "website", re: /site( web| internet)?|website|page d'accueil|homepage/ },
];

/** Format et durée par défaut de chaque support (limites courantes des plateformes, bornées ci-dessous). */
export const PLATFORM_SPECS: Record<VideoPlatform, { aspect: VideoAspect; defaultS: number; maxS: number; safe: { top: number; bottom: number; side: number }; label: string }> = {
  tiktok: { aspect: "9:16", defaultS: 20, maxS: 180, safe: { top: 0.1, bottom: 0.2, side: 0.06 }, label: "TikTok" },
  reels: { aspect: "9:16", defaultS: 20, maxS: 90, safe: { top: 0.12, bottom: 0.2, side: 0.06 }, label: "Instagram Reels" },
  shorts: { aspect: "9:16", defaultS: 25, maxS: 60, safe: { top: 0.1, bottom: 0.18, side: 0.06 }, label: "YouTube Shorts" },
  meta_feed: { aspect: "4:5", defaultS: 15, maxS: 120, safe: { top: 0.05, bottom: 0.08, side: 0.05 }, label: "Facebook / Instagram (fil)" },
  youtube: { aspect: "16:9", defaultS: 45, maxS: 600, safe: { top: 0.06, bottom: 0.1, side: 0.05 }, label: "YouTube" },
  linkedin: { aspect: "1:1", defaultS: 30, maxS: 600, safe: { top: 0.05, bottom: 0.08, side: 0.05 }, label: "LinkedIn" },
  shop_page: { aspect: "1:1", defaultS: 15, maxS: 60, safe: { top: 0.04, bottom: 0.06, side: 0.04 }, label: "Page produit" },
  website: { aspect: "16:9", defaultS: 30, maxS: 180, safe: { top: 0.04, bottom: 0.06, side: 0.04 }, label: "Site web" },
};

/** Durée par défaut selon l'intention (l'audience décroche vite : on reste court sauf besoin réel). */
const INTENT_DURATION: Partial<Record<VideoIntentKind, number>> = {
  video_ad: 15,
  social_content: 12,
  ugc: 20,
  product_demo: 30,
  product_tutorial: 45,
  explainer: 45,
  company_presentation: 45,
  trade_video: 35,
  service_presentation: 30,
  brand_film: 40,
  launch: 20,
  lifestyle: 20,
};

export type VideoAsk = {
  text?: string | null;
  kind?: VideoIntentKind | null;
  platform?: VideoPlatform | null;
  aspect?: VideoAspect | null;
  durationS?: number | null;
  audience?: string | null;
  /** Le client accepte des plans générés par l'IA (sinon : uniquement l'existant et le montage local). */
  allowGeneration?: boolean;
};

const DURATION_RE = /(\d{1,3})\s*(s\b|sec|secondes?|seconds?)|(\d{1,2})\s*(min|minutes?)\b/;

export function videoIntent(p: Project, ask: VideoAsk = {}): VideoIntent {
  const t = norm(ask.text ?? "");
  const reasons: string[] = [];
  const services = p.business === "services";
  let kind = ask.kind ?? RULES.find((r) => r.re.test(t))?.kind ?? null;
  if (kind) reasons.push(ask.kind ? `intention imposée : ${kind}` : `demande : « ${(ask.text ?? "").slice(0, 60)} » → ${kind}`);
  else {
    kind = services ? "service_presentation" : "video_ad";
    reasons.push(`aucune intention explicite : ${kind} (${services ? "entreprise de services" : "boutique"})`);
  }
  // Une « publicité » d'un métier du bâtiment reste une publicité ; une présentation d'une boutique reste de marque.
  if (kind === "service_presentation" && !services) kind = "product_demo";
  if (kind === "trade_video" && !services) kind = "brand_film";

  const platform = ask.platform ?? PLATFORM_RULES.find((r) => r.re.test(t))?.platform ?? (kind === "company_presentation" || kind === "explainer" || kind === "trade_video" ? "website" : kind === "product_demo" || kind === "product_tutorial" ? "shop_page" : "reels");
  const spec = PLATFORM_SPECS[platform];
  const aspect = ask.aspect ?? (/(16[:/x]9|paysage|horizontal|landscape)/.test(t) ? "16:9" : /(9[:/x]16|vertical|portrait)/.test(t) ? "9:16" : /(1[:/x]1|carre|square)/.test(t) ? "1:1" : /4[:/x]5/.test(t) ? "4:5" : spec.aspect);
  if (!ask.aspect && aspect !== spec.aspect) reasons.push(`format demandé : ${aspect}`);

  const m = t.match(DURATION_RE);
  const asked = ask.durationS ?? (m ? (m[1] ? Number(m[1]) : Number(m[3]) * 60) : null);
  const base = asked ?? INTENT_DURATION[kind] ?? spec.defaultS;
  const durationS = Math.max(6, Math.min(spec.maxS, Math.round(base)));
  if (asked && asked !== durationS) reasons.push(`durée ramenée à ${durationS} s (limite ${spec.label} : ${spec.maxS} s)`);

  // Complexité : une demande courte et modeste reste « simple » (montage local), même si l'IA est active.
  const modest = /petite?|simple|rapide|vite|quick|basique|juste|seulement|sans ia|without ai/.test(t);
  let complexity: Complexity = modest || ask.allowGeneration === false ? "simple" : durationS > 30 || kind === "ugc" || kind === "brand_film" || kind === "launch" ? "production" : "standard";
  if (kind === "ugc" && ask.allowGeneration === false) {
    // Un UGC sans génération n'existe pas (pas de personne à filmer) : vidéo sociale à la place, dit clairement.
    kind = "social_content";
    complexity = "simple";
    reasons.push("UGC impossible sans génération autorisée : contenu social monté à partir de l'existant");
  }
  reasons.push(`complexité : ${complexity}${modest ? " (demande modeste)" : ""}`);
  const goal = (ask.text ?? "").trim() || goalFor(kind, services);
  const placeholder = (x: string | null | undefined) => !x?.trim() || /\[(À|A) (compléter|définir|préciser)|\[To (complete|define|specify)/i.test(x);
  const audience = !placeholder(ask.audience) ? ask.audience!.trim() : !placeholder(p.brand?.audience) ? p.brand!.audience!.trim() : null;
  return { kind, goal, audience, platform, aspect, durationS, complexity, reasons };
}

function goalFor(kind: VideoIntentKind, services: boolean): string {
  switch (kind) {
    case "video_ad":
      return services ? "obtenir des demandes de contact" : "donner envie d'acheter";
    case "product_demo":
      return "montrer le produit en action";
    case "product_tutorial":
      return "expliquer l'utilisation pas à pas";
    case "explainer":
      return "faire comprendre l'offre";
    case "company_presentation":
    case "service_presentation":
      return "présenter l'activité et rassurer";
    case "trade_video":
      return "montrer le savoir-faire du métier";
    case "launch":
      return "annoncer la nouveauté";
    case "ugc":
      return "recommandation naturelle pour les réseaux sociaux";
    default:
      return "faire connaître la marque";
  }
}
