/**
 * Idées de prompts propres à CHAQUE produit (principal et catalogue) ou service du projet, pour aider le client à
 * décrire son visuel dans la création guidée (publication / publicité, image / vidéo). Écrites pendant la création du
 * projet : par l'IA de texte quand elle est active pour le compte (quelques centimes, dans le budget du projet), sinon
 * par le moteur local (gratuit). Jamais de personne dans les scènes (règle du propriétaire), rien d'inventé (aucun
 * chiffre, prix ni promesse) : seulement des décors, lumières, ambiances et mouvements de caméra.
 */
import crypto from "node:crypto";
import { z } from "zod";
import { json, now, one, run } from "./db";
import type { Project } from "./projects";
import { subjectOptions, type SubjectOption } from "./creative-subject";
import { C } from "./i18n-server";

export const IDEA_SURFACES = ["post_image", "ad_image", "post_video", "ad_video"] as const;
export type IdeaSurface = (typeof IDEA_SURFACES)[number];
export type PromptIdea = { title: string; prompt: string };
export type SubjectIdeas = { kind: "product" | "service"; key: string; name: string; ideas: Record<IdeaSurface, PromptIdea[]> };
export type PromptIdeas = { by: "ai" | "local"; subjects: SubjectIdeas[]; at: number };

/** Univers de décor selon le secteur (mots-clés du produit ou du service) : le point de départ des idées locales. */
const UNIVERSES: { test: RegExp; fr: string[]; en: string[] }[] = [
  { test: /sport|gourde|rando|outdoor|vélo|velo|running|fitness|camp|montagne|trek/i, fr: ["sur un rocher au sommet d'un sentier de montagne, au lever du soleil", "posé sur un banc de bois près d'un lac calme, brume du matin", "sur le sol d'une salle de sport en béton, lumière rasante de fin de journée", "dans l'herbe humide d'un chemin forestier, rayons de soleil entre les arbres"], en: ["on a rock at the top of a mountain trail at sunrise", "on a wooden bench by a calm lake, morning mist", "on the concrete floor of a gym, low evening light", "in the wet grass of a forest path, sunbeams through the trees"] },
  { test: /cosm|beaut|soin|sérum|serum|crème|creme|parfum|maquill|skin/i, fr: ["sur une dalle de marbre blanc avec des reflets d'eau, lumière douce du matin", "entouré de pétales et de gouttes d'eau, fond pastel", "sur une étagère de salle de bain en pierre claire, lumière naturelle par une fenêtre", "sur un plateau de verre au-dessus de l'eau, reflets dorés"], en: ["on a white marble slab with water reflections, soft morning light", "surrounded by petals and water drops, pastel background", "on a light stone bathroom shelf, natural window light", "on a glass tray above water, golden reflections"] },
  { test: /casque|audio|tech|électron|electron|téléphone|phone|ordinateur|montre conn|enceinte|drone|gaming/i, fr: ["en lévitation dans un studio sombre, néons de couleur sur le côté", "posé sur un bureau minimaliste en béton, lumière froide de fin de soirée", "sur un socle noir mat, contre-jour et reflets nets", "dans une rue de ville la nuit, reflets de lumières sur l'asphalte mouillé"], en: ["floating in a dark studio, coloured neon on the side", "on a minimalist concrete desk, cool late-evening light", "on a matte black plinth, backlight and crisp reflections", "in a city street at night, light reflections on wet asphalt"] },
  { test: /montre|bijou|joaill|bague|collier|luxe|horlog/i, fr: ["sur une pierre sombre, rai de lumière dorée qui balaie le produit", "sur un cuir brun patiné, lumière ambrée chaude", "sur un velours profond, reflets précieux et fond noir", "posé sur du sable fin au coucher du soleil, ombres longues"], en: ["on a dark stone, a blade of golden light sweeping the product", "on aged brown leather, warm amber light", "on deep velvet, precious reflections and black background", "on fine sand at sunset, long shadows"] },
  { test: /café|cafe|thé|the |chocolat|aliment|food|épicerie|epicerie|boisson|vin|bière|biere|miel|gourmand/i, fr: ["sur une table en bois brut avec des ingrédients autour, lumière du matin", "dans une cuisine chaleureuse, vapeur légère et lumière dorée", "sur une nappe de lin, fleurs et fruits de saison", "sur une ardoise sombre, éclairage de restaurant tamisé"], en: ["on a rough wooden table with ingredients around, morning light", "in a warm kitchen, light steam and golden light", "on a linen cloth with seasonal flowers and fruit", "on a dark slate, dim restaurant lighting"] },
  { test: /maison|déco|deco|meuble|lampe|coussin|oreiller|linge|bougie|cuisine|jardin/i, fr: ["dans un salon lumineux aux tons naturels, lumière de fin d'après-midi", "sur un lit aux draps de lin froissés, soleil du matin", "sur une étagère en bois clair avec des plantes, lumière douce", "dans un intérieur scandinave épuré, ombres de fenêtre au sol"], en: ["in a bright living room in natural tones, late-afternoon light", "on a bed with crumpled linen sheets, morning sun", "on a light wooden shelf with plants, soft light", "in a clean Scandinavian interior, window shadows on the floor"] },
  { test: /vêtement|vetement|mode|sac|chaussure|textile|t-shirt|veste|robe|maroquin/i, fr: ["posé à plat sur un fond de papier coloré, ombres franches", "suspendu dans un atelier lumineux, poussière dorée dans l'air", "sur une chaise design dans un loft, lumière latérale", "plié sur une pierre au bord de la mer, ciel doux"], en: ["laid flat on coloured paper, sharp shadows", "hung in a bright workshop, golden dust in the air", "on a design chair in a loft, side light", "folded on a stone by the sea, soft sky"] },
  { test: /chat|chien|animal|animaux|pet/i, fr: ["sur un tapis moelleux près d'une fenêtre ensoleillée", "dans un salon cosy avec un plaid, lumière chaude", "sur un parquet clair, jouets autour, lumière du jour", "sur une terrasse en bois, fin de journée"], en: ["on a soft rug by a sunny window", "in a cosy living room with a throw, warm light", "on a light wooden floor with toys around, daylight", "on a wooden deck, end of the day"] },
];
const DEFAULT_UNIVERSE = { fr: ["sur un socle épuré, lumière de studio douce et ombres nettes", "dans un décor naturel lié à son usage, lumière dorée de fin de journée", "sur une surface texturée (bois, pierre ou béton), lumière latérale", "devant un fond aux couleurs de la marque, composition graphique"], en: ["on a clean plinth, soft studio light and crisp shadows", "in a natural setting linked to its use, golden late-day light", "on a textured surface (wood, stone or concrete), side light", "in front of a background in the brand colours, graphic composition"] };
/** Services : on montre le métier par ses outils, ses matières et le résultat (jamais une personne inventée). */
const SERVICE_UNIVERSE = { fr: ["les outils du métier soigneusement disposés sur un plan de travail, lumière du matin", "le résultat du travail en gros plan : matières, finitions et détails", "le lieu d'intervention avant / après, cadrage large et lumière naturelle", "un détail technique du savoir-faire en très gros plan, fond flou"], en: ["the tools of the trade neatly laid out on a workbench, morning light", "the finished work in close-up: materials, finishes and details", "the place before / after, wide framing and natural light", "a technical detail of the craft in extreme close-up, blurred background"] };

const pick = <T,>(xs: T[], n: number, seed: string) => {
  const h = crypto.createHash("sha1").update(seed).digest();
  return xs.map((x, i) => ({ x, k: h[i % h.length] ^ (i * 37) })).sort((a, b) => a.k - b.k).slice(0, n).map((y) => y.x);
};

/** Idées locales (gratuites) d'un produit ou service : décors du secteur, lumière, mouvement de caméra. */
export function localIdeas(p: Project, s: SubjectOption): Record<IdeaSurface, PromptIdea[]> {
  const en = p.settings?.language === "en";
  const text = `${s.name} ${s.summary} ${p.product.category ?? ""} ${p.product.sector ?? ""}`;
  const u = s.kind === "service" ? SERVICE_UNIVERSE : (UNIVERSES.find((x) => x.test.test(text)) ?? DEFAULT_UNIVERSE);
  const places = en ? u.en : u.fr;
  const mood = (p.brand?.personality ?? []).slice(0, 2).join(en ? " and " : " et ");
  const who = s.name;
  const moodLine = mood ? (en ? `, ${mood} mood` : `, ambiance ${mood}`) : "";
  const [a, b, c, d] = pick(places, 4, `${p.id}:${s.key}`);
  const img = (place: string, extra: string) => (en ? `${who} ${place}${moodLine}${extra}. No people.` : `${who} ${place}${moodLine}${extra}. Aucune personne.`);
  const vid = (place: string, move: string) => (en ? `${who} ${place}; ${move}. Slow, elegant motion, no people.` : `${who} ${place} ; ${move}. Mouvement lent et élégant, aucune personne.`);
  return {
    post_image: [
      { title: en ? "Natural setting" : "Décor naturel", prompt: img(a, en ? ", product as the hero" : ", le produit en héros") },
      { title: en ? "Close detail" : "Gros plan détail", prompt: img(b, en ? ", extreme close-up on its finishes" : ", très gros plan sur ses finitions") },
      { title: en ? "Brand colours" : "Couleurs de la marque", prompt: img(d, en ? ", palette in the brand colours" : ", palette aux couleurs de la marque") },
    ],
    ad_image: [
      { title: en ? "Premium campaign" : "Campagne premium", prompt: img(c, en ? ", high-end campaign light, room for the headline" : ", lumière de grande campagne, place pour le titre") },
      { title: en ? "Contrast" : "Contraste fort", prompt: img(b, en ? ", strong contrast and a single beam of light" : ", contraste fort et un seul rai de lumière") },
      { title: en ? "Graphic" : "Graphique", prompt: img(d, en ? ", bold graphic composition, clean background" : ", composition graphique audacieuse, fond épuré") },
    ],
    post_video: [
      { title: en ? "Slow reveal" : "Révélation lente", prompt: vid(a, en ? "a beam of light slowly reveals it as the camera moves forward" : "un rai de lumière le révèle pendant que la caméra avance") },
      { title: en ? "Orbit" : "Tour autour", prompt: vid(c, en ? "the camera slowly circles around it" : "la caméra tourne lentement autour") },
      { title: en ? "Living setting" : "Décor vivant", prompt: vid(b, en ? "leaves, water or light move gently around it" : "feuilles, eau ou lumière bougent doucement autour") },
    ],
    ad_video: [
      { title: en ? "Hero shot" : "Plan héros", prompt: vid(d, en ? "majestic push-in, the light intensifies, space kept for the logo at the end" : "poussée majestueuse, la lumière s'intensifie, place gardée pour le logo à la fin") },
      { title: en ? "Texture" : "Matière", prompt: vid(b, en ? "macro glide along the materials, highlights travelling on the edges" : "glissé en macro le long des matières, reflets qui courent sur les bords") },
      { title: en ? "Atmosphere" : "Atmosphère", prompt: vid(a, en ? "the light of the scene changes slowly, like time passing" : "la lumière de la scène change lentement, comme le temps qui passe") },
    ],
  };
}

const IdeaSchema = z.object({ title: z.string().min(2).max(40), prompt: z.string().min(20).max(400) });
export const AiIdeasSchema = z.object({ post_image: z.array(IdeaSchema).min(2).max(4), ad_image: z.array(IdeaSchema).min(2).max(4), post_video: z.array(IdeaSchema).min(2).max(4), ad_video: z.array(IdeaSchema).min(2).max(4) });
const PEOPLE = /\b(personne|femme|homme|enfant|mannequin|modèle|main|mains|visage|person|woman|man|child|model|hands?|face)s?\b/i;
const INVENTED = /\d+\s?%|€|\$|\b(meilleur|best|garanti|guaranteed|n°\s?1|avis|reviews?)\b/i;
/** Idée de l'IA acceptée seulement sans personne ni chiffre/promesse inventés. */
export const ideaAllowed = (i: PromptIdea) => !INVENTED.test(i.prompt) && !(PEOPLE.test(i.prompt) && !/aucune personne|no people|sans personne/i.test(i.prompt));

/** Empreinte de ce qui sert aux idées : si rien n'a changé, elles ne sont pas réécrites (aucun jeton dépensé). */
export const ideasFingerprint = (p: Project) => crypto.createHash("sha1").update(JSON.stringify([subjectOptions(p).map((s) => [s.kind, s.key, s.name, s.summary]), p.brand?.name, p.brand?.personality, p.settings?.language])).digest("hex").slice(0, 16);

export type IdeaWriter = (p: Project, s: SubjectOption) => Promise<Record<IdeaSurface, PromptIdea[]> | null>;

/** Écrit (ou réécrit si le projet a changé) les idées de prompts de tous les produits ou services du projet. */
export async function writePromptIdeas(p: Project, writer?: IdeaWriter | null): Promise<PromptIdeas> {
  const fp = ideasFingerprint(p);
  const cur = one<{ data: string; fingerprint: string }>("SELECT data, fingerprint FROM prompt_ideas WHERE project_id = ?", p.id);
  if (cur && cur.fingerprint === fp) return json<PromptIdeas>(cur.data, { by: "local", subjects: [], at: 0 });
  let byAi = false;
  const subjects: SubjectIdeas[] = [];
  for (const s of subjectOptions(p).slice(0, 12)) {
    const local = localIdeas(p, s);
    const ai = writer ? await writer(p, s).catch(() => null) : null;
    const ideas = { ...local };
    if (ai) {
      for (const k of IDEA_SURFACES) {
        const ok = (ai[k] ?? []).filter(ideaAllowed);
        if (ok.length >= 2) {
          ideas[k] = ok.slice(0, 3);
          byAi = true;
        }
      }
    }
    subjects.push({ kind: s.kind, key: s.key, name: s.name, ideas });
  }
  const out: PromptIdeas = { by: byAi ? "ai" : "local", subjects, at: now() };
  run("INSERT INTO prompt_ideas (project_id, data, fingerprint, created_at) VALUES (?,?,?,?) ON CONFLICT(project_id) DO UPDATE SET data = excluded.data, fingerprint = excluded.fingerprint, created_at = excluded.created_at", p.id, JSON.stringify(out), fp, out.at);
  return out;
}

/** Idées enregistrées (sans rien réécrire) ; à défaut, idées locales calculées à la volée (gratuit). */
export function readPromptIdeas(p: Project): PromptIdeas {
  const cur = one<{ data: string }>("SELECT data FROM prompt_ideas WHERE project_id = ?", p.id);
  const saved = cur ? json<PromptIdeas>(cur.data, { by: "local", subjects: [], at: 0 }) : { by: "local" as const, subjects: [], at: 0 };
  // Produit ou service ajouté depuis : ses idées sont préparées par le studio (gratuit), les autres sont gardées.
  const subjects = subjectOptions(p).map((s) => saved.subjects.find((x) => x.kind === s.kind && x.key === s.key) ?? { kind: s.kind, key: s.key, name: s.name, ideas: localIdeas(p, s) });
  return { ...saved, subjects };
}

/** Rédaction par l'IA de texte (création du projet, IA active) : prompts adaptés au produit ou service et à la marque. */
export function aiIdeaWriter(base: { userId: string; projectId: string; jobId: string | null }): IdeaWriter {
  return async (p, s) => {
    const { llmJson } = await import("./ai/llm");
    const lang = p.settings?.language === "en" ? "English" : "French";
    return llmJson(
      {
        task: "copywriting",
        ...base,
        usageKey: `prompt-ideas:${p.id}:${s.kind}:${s.key}`,
        promptKey: "prompt-ideas",
        routing: { difficulty: "simple", deliverable: "ad_v2" },
        system: "You are the creative director of a top advertising agency. You write short visual briefs (prompts) a client can give to an image or video AI. Answer with JSON only.",
        prompt: `Brand: "${p.brand?.name ?? ""}" (personality: ${(p.brand?.personality ?? []).join(", ")}). ${s.kind === "service" ? "Service" : "Product"}: ${s.name} — ${s.summary.slice(0, 300)}.
Write in ${lang}, for THIS ${s.kind} only, 3 prompt ideas for each of: post_image (organic social post), ad_image (advertising image), post_video and ad_video (short 15 s videos, describe the camera movement and what moves).
Each idea: { "title": 2-4 words, "prompt": one or two sentences describing setting, light, mood${s.kind === "product" ? ", the real product as the hero" : ", the craft shown through tools, materials and results"} }.
Rules: settings that make sense for how this ${s.kind} is really used; varied ideas; NEVER any person, face, hand or body (write "${lang === "French" ? "aucune personne" : "no people"}" in each prompt); no numbers, prices, percentages, promises, awards or reviews.
Reply { "post_image": [...], "ad_image": [...], "post_video": [...], "ad_video": [...] }.`,
        maxTokens: 1400,
      },
      AiIdeasSchema,
    );
  };
}

/** Libellé de la source des idées (affiché au client). */
export const ideasSourceLabel = (i: PromptIdeas) => (i.by === "ai" ? C("Idées écrites par l'IA pour votre projet", "Ideas written by AI for your project") : C("Idées préparées par le studio pour votre projet", "Ideas prepared by the studio for your project"));
