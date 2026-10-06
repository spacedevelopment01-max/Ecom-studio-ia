/**
 * Vidéos UGC générées par IA : une personne générée présente le produit réel face caméra,
 * façon vidéo de créateur filmée au téléphone.
 *  1. Script (IA ou moteur local) : plans de 8 s, répliques courtes, aucune fausse expérience vécue.
 *  2. Image d'ouverture de chaque plan : personne + décor générés, produit réel donné en référence,
 *     contrôlée contre le détourage (même produit).
 *  3. Plans animés : Veo 3 (image vers vidéo, voix et son générés) ou fal.ai (sans voix).
 *  4. Montage : format vertical ou horizontal, sous-titres, carte de fin à la marque, mention
 *     « Vidéo générée par IA » incrustée pendant toute la vidéo (personne de synthèse réaliste).
 * Entreprise de services : « présentation face caméra » — la personne générée présente l'activité et
 * ses prestations à la troisième personne ; elle ne se dit ni cliente, ni le professionnel lui-même.
 */
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import sharp from "sharp";
import { assetData, getAsset, saveAsset } from "../library";
import { loadProject, type Project } from "../projects";
import { tmpDir } from "../storage";
import { UserFacingError, type JobContext } from "../jobs";
import { llmConfigured } from "../ai/llm";
import { hasAiCredits, withQuotaScope } from "../ai/access";
import { assertQuota, consumeQuota } from "../quotas";
import { aiQcImage, aiQcScene, aiUgcScript, qcPassed, qcScore, QC_MIN_SCORE, type UgcScript } from "../ai/tasks";
import { imageProviderAvailable, ugcFrame, veoClip, falClip, videoProviderAvailable } from "../ai/media-providers";
import { brandTypo, confirmedFacts, ensureCutouts, palette } from "./images";
import { FONT_DIR, font } from "../media/fonts";
import { cleanUgcScript, ugcIssues } from "../ugc-rules";
import { aiCraftReview, brandCraftBrief, craftLoop, ugcCraftIssues, ugcStructure, type CraftQuality, type UgcRole } from "./ad-craft";
import { C, L, contentLang, uiLang } from "../i18n-server";
import { activityName, contactLine, realActivityPhotos, isServices, placeLine, serviceCta, serviceItems } from "./service-media";

export { cleanUgcScript, ugcIssues };

const exec = promisify(execFile);
const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || C("produit", "product");

export type UgcFormat = "9:16" | "16:9";
export const UGC_SIZES: Record<UgcFormat, { w: number; h: number }> = { "9:16": { w: 1080, h: 1920 }, "16:9": { w: 1920, h: 1080 } };
/** Durée d'un plan généré (Veo 3 : 8 s). */
export const UGC_BEAT_SECONDS = 8;
const END_SECONDS = 2.5;
/** Mention incrustée pendant toute la vidéo (personne de synthèse réaliste), dans la langue des contenus. */
export const AI_LABELS = { fr: "Vidéo générée par IA", en: "AI-generated video" };
export const aiLabel = () => C(AI_LABELS.fr, AI_LABELS.en);

/** Choix proposés dans le studio : libellé français → description pour les modèles (anglais). */
export const UGC_PRESENTERS: Record<string, string> = {
  femme: "a woman",
  homme: "a man",
  auto: "a person whose look fits the brand's audience",
};
export const UGC_AGES: Record<string, string> = {
  "18-25": "in her or his early twenties",
  "25-35": "around thirty",
  "35-50": "in her or his forties",
  "50+": "in her or his fifties or sixties",
};
export const UGC_SETTINGS: Record<string, string> = {
  salon: "a bright, lived-in living room",
  cuisine: "a home kitchen with a wooden counter",
  "salle-de-bain": "a clean bathroom with a mirror and soft daylight",
  chambre: "a cozy bedroom near a window",
  bureau: "a home office desk",
  exterieur: "outdoors in a park, natural daylight",
  voiture: "the front seat of a parked car, daylight",
  activite: "a bright, tidy place typical of this business activity (workshop, practice room, studio, salon or office)",
};
export const UGC_TONES: Record<string, { fr: string; en: string }> = {
  enthousiaste: { fr: "enthousiaste et spontané", en: "warm, enthusiastic" },
  naturel: { fr: "naturel, comme à une amie", en: "relaxed, conversational" },
  expert: { fr: "posé et précis", en: "calm, confident" },
};
export const UGC_ANGLES: Record<string, { fr: string; en: string; actions: string[] }> = {
  deballage: { fr: "déballage : on découvre le produit", en: "unboxing: discovering the product", actions: ["opens a package and lifts the product toward the phone camera", "turns the product slowly in their hands to show every side", "points at a detail of the product, close to the lens", "holds the product next to their face and smiles at the camera", "places the product on the table in front of the camera"] },
  demonstration: { fr: "démonstration : on montre le produit en usage", en: "demo: showing the product in use", actions: ["holds the product up to the phone camera at chest height", "uses the product naturally in the room", "shows a close-up of the product in their hands", "uses the product again, relaxed and natural", "holds the product toward the camera and nods"] },
  presentation: { fr: "présentation rapide face caméra", en: "quick on-camera presentation", actions: ["holds the product beside their face, talking to the phone camera", "tilts the product to show its label to the camera", "points at the product with one finger", "holds the product with both hands toward the lens", "puts the product down and gestures toward it"] },
  probleme: { fr: "situation du quotidien puis le produit qui répond", en: "everyday situation, then the product that answers it", actions: ["looks at the camera with a slightly puzzled expression, then picks up the product", "shows the product in their hands in the everyday situation", "uses the product naturally in the room", "shows a close-up of the product in their hands", "holds the product toward the camera and smiles"] },
};

export type UgcOptions = {
  format: UgcFormat;
  beats: number;
  presenter: keyof typeof UGC_PRESENTERS | string;
  age: keyof typeof UGC_AGES | string;
  setting: keyof typeof UGC_SETTINGS | string;
  tone: keyof typeof UGC_TONES | string;
  angle: keyof typeof UGC_ANGLES | string;
  url?: string;
  brief?: string;
};
export type { UgcScript };

const pick = <T,>(map: Record<string, T>, k: string, d: string) => map[k] ?? map[d];

/**
 * Script sans IA (version du studio) : structure de créateur problème → découverte → démonstration → preuve → appel,
 * condensée selon le nombre de plans, à partir des seuls faits confirmés (langue des contenus). L'accroche est un geste
 * et une phrase de 9 mots au plus ; la « preuve » est ce qu'on voit à l'image ou un fait confirmé, jamais un vécu.
 */
export function localUgcScript(p: Project, o: UgcOptions): UgcScript {
  if (isServices(p)) return localServiceUgcScript(p, o);
  const n = Math.max(1, Math.min(5, o.beats));
  const name = p.product.name || p.brand?.name || C("ce produit", "this product");
  const brand = p.brand?.name && p.brand.name !== name ? p.brand.name : "";
  const facts = confirmedFacts(p).filter((f) => !name.toLowerCase().startsWith(f.toLowerCase()));
  const angle = pick(UGC_ANGLES, o.angle, "presentation");
  const lower = (f: string) => `${f.charAt(0).toLowerCase()}${f.slice(1)}`;
  const roles = ugcStructure(n);
  const say: Record<UgcRole, string> = {
    problem: o.angle === "deballage"
      ? C(`On l'ouvre ensemble ? Dedans, il y a ${name}.`, `Let's open it together. Inside, there's ${name}.`)
      : C(`Attendez, regardez ce que j'ai dans la main : ${name}.`, `Wait, look at what's in my hand: ${name}.`),
    discovery: C(`Voici ${name}${brand ? `, de ${brand}` : ""}, je vous le montre de près.`, `This is ${name}${brand ? ` from ${brand}` : ""}, let me show you up close.`),
    demo: facts[0] ? C(`Premier détail à voir : ${lower(facts[0])}.`, `First thing to notice: ${lower(facts[0])}.`) : C(`Regardez la forme, les finitions, la taille dans la main.`, `Check out the shape, the finish, how it sits in the hand.`),
    proof: facts[1] ? C(`Et ce qu'on voit ici : ${lower(facts[1])}.`, `And what you can see right here: ${lower(facts[1])}.`) : C(`Prenez le temps de regarder chaque détail à l'image.`, `Take a moment to look at every detail on screen.`),
    cta: o.url ? C(`Pour le découvrir, tout est sur ${o.url}.`, `Want to see more? It's all on ${o.url}.`) : C(`Le lien pour le découvrir est juste en dessous de la vidéo.`, `The link to check it out is right below this video.`),
  };
  const words = (t: string) => t.split(/\s+/).filter(Boolean).length;
  const lines = roles.map((rs) => {
    // Plan qui cumule plusieurs rôles : on retire la découverte, la preuve puis la démonstration si la réplique dépasse ~20 mots (8 s).
    // L'accroche nomme déjà le produit : la découverte n'est pas répétée dans le même plan.
    let keep = rs.includes("problem") ? rs.filter((r) => r !== "discovery") : [...rs];
    for (const drop of ["discovery", "proof", "demo"] as UgcRole[]) if (keep.length > 1 && words(keep.map((r) => say[r]).join(" ")) > 20) keep = keep.filter((r) => r !== drop);
    return keep.map((r) => say[r]).join(" ");
  });
  const act: Record<UgcRole, number> = { problem: 0, discovery: 1, demo: 2, proof: 3, cta: 4 };
  const caption = (l: string) => (l.length <= 64 ? l : `${l.slice(0, 61).replace(/\s+\S*$/, "")}…`);
  return {
    concept: C(`${angle.fr}, ${n} plan${n > 1 ? "s" : ""} face caméra : accroche, découverte, démonstration, preuve visible, appel`, `${angle.en}, ${n} on-camera shot${n > 1 ? "s" : ""}: hook, discovery, demo, visible proof, call to action`),
    persona: `${pick(UGC_PRESENTERS, o.presenter, "auto")} ${pick(UGC_AGES, o.age, "25-35")}, casual everyday outfit`,
    setting: pick(UGC_SETTINGS, o.setting, "salon"),
    beats: lines.map((line, i) => {
      const main = roles[i].includes("cta") && n > 1 ? "cta" : roles[i][roles[i].length > 1 && roles[i][0] === "problem" ? 0 : roles[i].length - 1];
      return { line, caption: caption(line), action: angle.actions[act[main]], role: roles[i].join("+") };
    }),
  };
}

/** Gestes d'une présentation d'activité face caméra (aucun produit en main). */
const SERVICE_ACTIONS = [
  "talks to the phone camera with a friendly, open hand gesture",
  "gestures toward the room behind them while explaining",
  "counts on their fingers while explaining, relaxed",
  "smiles and points down toward the caption area",
  "nods warmly at the camera to close",
];

/**
 * Présentation d'une activité de services, à la troisième personne, depuis l'offre réelle :
 * « Voici {activité}… », prestations, zone, appel à prendre rendez-vous. Jamais « j'ai fait appel à… ».
 */
export function localServiceUgcScript(p: Project, o: UgcOptions): UgcScript {
  const n = Math.max(1, Math.min(5, o.beats));
  const brand = p.brand?.name || activityName(p);
  const items = serviceItems(p);
  const place = placeLine(p);
  const lower = (f: string) => `${f.charAt(0).toLowerCase()}${f.slice(1)}`;
  const lines: string[] = [];
  lines.push(place ? C(`Voici ${brand}, à ${place}. Je vous présente l'activité en quelques secondes.`, `Meet ${brand}, in ${place}. Here's a quick look at what they do.`) : C(`Voici ${brand}. Je vous présente l'activité en quelques secondes.`, `Meet ${brand}. Here's a quick look at what they do.`));
  const middles = items.map((s) => C(`Au programme : ${lower(s.name)}${s.duration ? `, comptez ${s.duration}` : ""}.`, `On offer: ${lower(s.name)}${s.duration ? `, about ${s.duration}` : ""}.`));
  if (!middles.length && p.product.summary) middles.push(C(`En bref : ${lower(p.product.summary.split(/(?<=[.!?])\s/)[0].replace(/[.!?]$/, ""))}.`, `In short: ${lower(p.product.summary.split(/(?<=[.!?])\s/)[0].replace(/[.!?]$/, ""))}.`));
  if (p.services?.hours) middles.push(C(`Côté horaires : ${p.services.hours}.`, `Opening hours: ${p.services.hours}.`));
  if (!middles.length) middles.push(C(`Tout est expliqué sur leur page, prestation par prestation.`, `Everything is explained on their page, service by service.`));
  for (let i = 1; i < n - 1; i++) lines.push(middles[(i - 1) % middles.length]);
  const contact = o.url || contactLine(p);
  if (n > 1) lines.push(contact ? C(`${serviceCta(p)} : ${contact}.`, `${serviceCta(p)}: ${contact}.`) : C(`${serviceCta(p)} : le lien est juste en dessous.`, `${serviceCta(p)}: the link is right below.`));
  const caption = (l: string) => (l.length <= 64 ? l : `${l.slice(0, 61).replace(/\s+\S*$/, "")}…`);
  return {
    concept: C(`Présentation de l'activité face caméra, ${n} plan${n > 1 ? "s" : ""}`, `On-camera business presentation, ${n} shot${n > 1 ? "s" : ""}`),
    persona: `${pick(UGC_PRESENTERS, o.presenter, "auto")} ${pick(UGC_AGES, o.age, "25-35")}, neat everyday outfit, friendly presenter (not a customer)`,
    setting: pick(UGC_SETTINGS, o.setting, "activite"),
    beats: lines.slice(0, n).map((line, i) => ({ line, caption: caption(line), action: i === n - 1 && n > 1 ? SERVICE_ACTIONS[4] : SERVICE_ACTIONS[i % 4] })),
  };
}

/** Répliques interdites pour une activité de services : se dire client(e) ou se faire passer pour le professionnel. */
const SERVICE_CLAIMS = [
  /\b(j'ai fait appel|je suis (client|cliente|allée?|passée?)|j'y (vais|suis allée?)|ils m'ont|elle m'a|il m'a|on m'a (aidé|soigné|coiffé))/i,
  /\b(mon|ma) (coach|kiné|avocat|avocate|coiffeur|coiffeuse|artisan|comptable|photographe|professeur|prof|esthéticienne)(?=[\s.,;:!?]|$)/i,
  /\b(je m'appelle|je suis (le|la|votre) (gérant|gérante|fondateur|fondatrice|praticien|praticienne|coach|kiné|avocat|avocate|artisan))/i,
  /\b(i hired|i booked|i went to|i('m| am) a (client|customer)|they helped me|my (coach|lawyer|accountant|hairdresser|therapist|plumber|photographer|teacher))\b/i,
  /\b(my name is|i('m| am) (the|your) (owner|founder|coach|therapist|lawyer|plumber))\b/i,
];
export function serviceUgcIssues(script: Pick<UgcScript, "beats">): string[] {
  const out: string[] = [];
  script.beats.forEach((b, i) => {
    if (SERVICE_CLAIMS.some((r) => r.test(b.line) || r.test(b.caption)))
      out.push(L(`Plan ${i + 1} : la personne est générée par IA ; elle présente l'activité, elle ne peut ni se dire cliente ni se présenter comme le professionnel. Reformulez à la troisième personne (« Voici… », « Au programme… »).`, `Shot ${i + 1}: the person is AI-generated; they present the business and can't claim to be a customer or the professional. Rephrase in the third person ("Meet…", "On offer…").`));
  });
  return out;
}

export async function writeUgcScript(ctx: JobContext, projectId: string, o: UgcOptions): Promise<{ script: UgcScript; issues: string[]; engine: "ia" | "local"; quality?: CraftQuality }> {
  const p = loadProject(projectId);
  const services = isServices(p);
  const check = (s: UgcScript) => [...ugcIssues(s, contentLang(), uiLang()), ...(services ? serviceUgcIssues(s) : [])];
  if (llmConfigured()) {
    const presenter = `${pick(UGC_PRESENTERS, o.presenter, "auto")} ${pick(UGC_AGES, o.age, "25-35")}`;
    const serviceBrief = services
      ? C(
          `ENTREPRISE DE SERVICES (pas de produit) : la personne présente l'activité ${activityName(p)} et ses prestations réelles (${serviceItems(p).map((s) => s.name).join(", ") || "voir le contexte"}) à la troisième personne (« Voici… », « Au programme… »). Elle n'est ni cliente ni le professionnel : jamais « j'ai fait appel », « mon coach », « je m'appelle ». Aucun produit en main ; gestes de présentation. Appel final : ${serviceCta(p)}.`,
          `SERVICE BUSINESS (no product): the person presents the business ${activityName(p)} and its real services (${serviceItems(p).map((s) => s.name).join(", ") || "see context"}) in the third person ("Meet…", "On offer…"). They are neither a customer nor the professional: never "I hired", "my coach", "my name is". No product in hand; presenting gestures. Final call to action: ${serviceCta(p)}.`,
        )
      : "";
    // Scénariste (une passe forte) → règles UGC + directeur de création (grille notée, seuil 8/10) → au plus une
    // reprise ciblée → la meilleure version est gardée. Services : présentation à la troisième personne, sans arc produit.
    const n = Math.max(1, Math.min(5, o.beats));
    const roles = services ? undefined : ugcStructure(n).map((r) => r.join("+"));
    const base = { userId: p.userId, projectId, jobId: ctx.job.id };
    const craft = brandCraftBrief(p);
    const { best, quality } = await craftLoop("ugc", {
      draft: async (feedback) => {
        const r = await aiUgcScript({ ...base, usageKey: `${ctx.job.id}:ugc${feedback ? ":r2" : ""}` }, p, { beats: o.beats, presenter, setting: pick(UGC_SETTINGS, o.setting, services ? "activite" : "salon"), tone: C(pick(UGC_TONES, o.tone, "naturel").fr, pick(UGC_TONES, o.tone, "naturel").en), angle: services ? C("présentation de l'activité face caméra", "on-camera business presentation") : C(pick(UGC_ANGLES, o.angle, "presentation").fr, pick(UGC_ANGLES, o.angle, "presentation").en), url: o.url, brief: [serviceBrief, o.brief].filter(Boolean).join(" ") || undefined, roles, craft, feedback });
        return cleanUgcScript({ ...r, beats: r.beats.slice(0, o.beats) });
      },
      lint: (sc) => [...check(sc), ...ugcCraftIssues(sc)],
      review: (sc, round) => aiCraftReview({ ...base, usageKey: `${ctx.job.id}:ugc:cd${round}` }, p, "ugc", sc, roles ? `Structure demandée, plan par plan : ${roles.map((r, i) => `${i + 1} = ${r}`).join(" ; ")}.` : "Entreprise de services : présentation de l'activité à la troisième personne (le critère « structure » juge l'enchaînement accroche → activité → prestations → infos → appel)."),
    });
    return { script: best, issues: check(best), engine: "ia", quality };
  }
  const script = localUgcScript(p, o);
  return { script, issues: check(script), engine: "local" };
}

/** Prompt du plan animé : action, réplique (voix générée par Veo 3) et rendu « filmé au téléphone ». */
export function beatPrompt(script: UgcScript, i: number, o: UgcOptions, withVoice: boolean, subject: "product" | "service" = "product") {
  const b = script.beats[i];
  const tone = pick(UGC_TONES, o.tone, "naturel").en;
  if (subject === "service")
    return [
      `Vertical smartphone video of a friendly presenter. ${script.persona}, in ${script.setting}, ${b.action}.`,
      withVoice ? `The person looks into the phone camera and says in ${C("French", "English")}, in a ${tone} voice, with natural lip sync: "${b.line}"` : `The person talks naturally to the phone camera.`,
      `Handheld phone footage with slight natural movement, realistic hands and face, ambient room sound only, no music, no subtitles, no text, no logo, no diploma or certificate on the walls.`,
    ].join(" ");
  return [
    `Vertical smartphone UGC video. ${script.persona}, in ${script.setting}, ${b.action}.`,
    withVoice ? `The person looks into the phone camera and says in ${C("French", "English")}, in a ${tone} voice, with natural lip sync: "${b.line}"` : `The person talks naturally to the phone camera.`,
    `Handheld phone footage with slight natural movement, realistic hands and face, ambient room sound only, no music, no subtitles, no text on screen. The product keeps exactly the same shape, label and colors as in the first frame.`,
  ].join(" ");
}

function framePrompt(script: UgcScript, i: number, subject: "product" | "service" = "product") {
  const b = script.beats[i];
  if (subject === "service") return `Smartphone video still of a friendly presenter introducing a local business. ${script.persona}, in ${script.setting}, ${b.action}. No product in hand.`;
  return `Smartphone video still for a UGC product video. ${script.persona}, in ${script.setting}, ${b.action}. The product from the reference image is clearly visible in the person's hands or right next to them.`;
}

// ------------------------------------------------------------------ montage

const assTime = (t: number) => {
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  return `${h}:${String(m).padStart(2, "0")}:${s.toFixed(2).padStart(5, "0")}`;
};
const assText = (t: string) => t.replace(/[{}\\]/g, "").replace(/\n/g, "\\N");
const srtTime = (t: number) => {
  const ms = Math.round(t * 1000);
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), s = Math.floor((ms % 60000) / 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms % 1000).padStart(3, "0")}`;
};

/** Sous-titres : la réplique coupée en deux moitiés si elle est longue (lecture au téléphone). */
export function ugcCues(captions: string[], durations: number[]) {
  const cues: { start: number; end: number; text: string }[] = [];
  let t = 0;
  captions.forEach((c, i) => {
    const d = durations[i];
    const words = c.split(/\s+/).filter(Boolean);
    if (words.length > 9) {
      const half = Math.ceil(words.length / 2);
      cues.push({ start: t + 0.2, end: t + d / 2, text: words.slice(0, half).join(" ") });
      cues.push({ start: t + d / 2, end: t + d - 0.15, text: words.slice(half).join(" ") });
    } else cues.push({ start: t + 0.2, end: t + d - 0.15, text: c });
    t += d;
  });
  return cues;
}

export function ugcSrt(cues: { start: number; end: number; text: string }[]) {
  return cues.map((c, i) => `${i + 1}\n${srtTime(c.start)} --> ${srtTime(c.end)}\n${c.text}\n`).join("\n");
}

function ugcAss(cues: { start: number; end: number; text: string }[], total: number, size: { w: number; h: number }, accent: string, label: string) {
  const vertical = size.h > size.w;
  const fs = vertical ? 72 : 56;
  const bgr = (hex: string) => hex.replace("#", "").match(/../g)!.reverse().join("").toUpperCase();
  return `[Script Info]
ScriptType: v4.00+
PlayResX: ${size.w}
PlayResY: ${size.h}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,Inter,${fs},&H00FFFFFF,&H00FFFFFF,&H00000000,&H64000000,1,0,0,0,100,100,0,0,1,${vertical ? 6 : 4},2,2,90,90,${vertical ? 360 : 110},1
Style: Label,Inter,${vertical ? 30 : 26},&H00FFFFFF,&H00FFFFFF,&H00${bgr(accent)},&H96000000,1,0,0,0,100,100,1,0,3,10,0,7,48,48,${vertical ? 64 : 40},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 1,${assTime(0)},${assTime(total)},Label,,0,0,0,,${assText(label)}
${cues.map((c) => `Dialogue: 0,${assTime(c.start)},${assTime(c.end)},Cap,,0,0,0,,${assText(c.text)}`).join("\n")}
`;
}

/** Carte de fin : produit réel, nom de la marque et appel à l'action, aux couleurs de la marque. */
export async function ugcEndCard(size: { w: number; h: number }, input: { product: Buffer | null; brand: string; cta: string; colors: { dark: string; light: string; accent: string }; heading: string }) {
  const c = createCanvas(size.w, size.h);
  const g = c.getContext("2d");
  const grad = g.createLinearGradient(0, 0, 0, size.h);
  grad.addColorStop(0, input.colors.dark);
  grad.addColorStop(1, "#000000");
  g.fillStyle = grad;
  g.fillRect(0, 0, size.w, size.h);
  const vertical = size.h > size.w;
  // Sans produit (services) : texte centré sur un halo de marque.
  const solo = !input.product;
  const box = vertical ? size.w * 0.62 : size.h * 0.6;
  const cx = vertical || solo ? size.w / 2 : size.w * 0.32;
  const cy = vertical ? size.h * (solo ? 0.46 : 0.4) : size.h / 2;
  const halo = g.createRadialGradient(cx, cy, 0, cx, cy, box * 0.75);
  halo.addColorStop(0, `${input.colors.accent}55`);
  halo.addColorStop(1, "transparent");
  g.fillStyle = halo;
  g.fillRect(0, 0, size.w, size.h);
  if (input.product) {
    const img = await loadImage(await sharp(input.product).png().toBuffer());
    const k = Math.min(box / img.width, box / img.height);
    const pw = img.width * k, ph = img.height * k;
    g.drawImage(img, cx - pw / 2, cy - ph / 2, pw, ph);
  }
  g.textAlign = vertical || solo ? "center" : "left";
  const tx = vertical || solo ? size.w / 2 : size.w * 0.58;
  let ty = solo ? cy : vertical ? size.h * 0.72 : size.h * 0.44;
  g.fillStyle = input.colors.light;
  let fsz = vertical ? 92 : 84;
  g.font = font(input.heading, 600, fsz);
  const maxW = vertical || solo ? size.w * 0.84 : size.w * 0.36;
  while (g.measureText(input.brand).width > maxW && fsz > 40) g.font = font(input.heading, 600, (fsz -= 4));
  g.fillText(input.brand, tx, ty);
  ty += vertical ? 96 : 92;
  g.font = font("Inter", 600, vertical ? 42 : 38);
  const ctaW = g.measureText(input.cta).width + 72;
  const bx = vertical || solo ? tx - ctaW / 2 : tx;
  g.fillStyle = input.colors.accent;
  g.beginPath();
  g.roundRect(bx, ty - 50, ctaW, 80, 40);
  g.fill();
  g.fillStyle = "#FFFFFF";
  g.fillText(input.cta, vertical || solo ? tx : tx + 36, ty + 4);
  return c.toBuffer("image/png");
}

async function hasAudio(file: string) {
  const { stdout } = await exec("ffprobe", ["-v", "error", "-select_streams", "a", "-show_entries", "stream=index", "-of", "csv=p=0", file]);
  return stdout.trim().length > 0;
}
/**
 * Contrôle d'une image générée (ouverture ou image extraite d'un plan) : même produit, non déformé (produits) ;
 * aucune personne déformée, aucun texte ni logo inventé (services). Note ramenée sur 10.
 */
async function ugcCheck(base: { userId: string; projectId: string; jobId?: string | null }, usageKey: string, services: boolean, reference: Buffer, image: Buffer): Promise<{ ok: boolean; score: number; issues: string[] }> {
  if (services) {
    const r = await aiQcScene({ ...base, usageKey }, image);
    const score = r.ok ? qcScore(r.score) : 0;
    return { ok: r.ok && score >= QC_MIN_SCORE, score, issues: r.issues };
  }
  const r = await aiQcImage({ ...base, usageKey }, reference, image);
  return { ok: qcPassed(r), score: r.sameProduct ? qcScore(r.score) : 0, issues: r.issues };
}

/** Images du milieu et de la fin d'un plan généré (le produit peut se déformer en cours de plan). */
async function clipStills(buf: Buffer, dir: string, tag: string): Promise<Buffer[]> {
  const src = path.join(dir, `${tag}.mp4`);
  fs.writeFileSync(src, buf);
  const d = await duration(src);
  const out: Buffer[] = [];
  for (const [k, t] of [d * 0.5, Math.max(0, d - 0.3)].entries()) {
    const f = path.join(dir, `${tag}-${k}.jpg`);
    await exec("ffmpeg", ["-y", "-loglevel", "error", "-ss", t.toFixed(2), "-i", src, "-frames:v", "1", "-q:v", "3", f]);
    if (fs.existsSync(f)) out.push(fs.readFileSync(f));
  }
  return out;
}

async function duration(file: string) {
  const { stdout } = await exec("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]);
  return Number(stdout.trim()) || 0;
}

/**
 * Assemble les plans générés : recadrage au format, piste son homogène (silence si le plan n'en a pas),
 * carte de fin, sous-titres et mention IA incrustés. Retourne les durées réelles et les sous-titres.
 */
export async function assembleUgc(input: { clips: string[]; captions: string[]; endCard: Buffer; format: UgcFormat; accent: string; out: string; dir: string; label?: string }) {
  const size = UGC_SIZES[input.format];
  const vf = `scale=${size.w}:${size.h}:force_original_aspect_ratio=increase,crop=${size.w}:${size.h},fps=30,setsar=1`;
  const segs: string[] = [];
  const durations: number[] = [];
  for (const [i, clip] of input.clips.entries()) {
    const d = Math.min(UGC_BEAT_SECONDS, await duration(clip)) || UGC_BEAT_SECONDS;
    const seg = path.join(input.dir, `seg-${i}.mp4`);
    const audio = await hasAudio(clip);
    await exec("ffmpeg", ["-y", "-loglevel", "error", "-i", clip, ...(audio ? [] : ["-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo"]), "-t", d.toFixed(3), "-map", "0:v:0", "-map", audio ? "0:a:0" : "1:a:0", "-vf", vf, "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-c:a", "aac", "-ar", "48000", "-ac", "2", "-b:a", "160k", "-shortest", seg]);
    segs.push(seg);
    durations.push(await duration(seg));
  }
  const cardPng = path.join(input.dir, "end.png");
  fs.writeFileSync(cardPng, input.endCard);
  const end = path.join(input.dir, "seg-end.mp4");
  await exec("ffmpeg", ["-y", "-loglevel", "error", "-loop", "1", "-i", cardPng, "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo", "-t", String(END_SECONDS), "-vf", `${vf},fade=t=in:st=0:d=0.35`, "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-c:a", "aac", "-ar", "48000", "-ac", "2", "-b:a", "160k", "-shortest", end]);
  segs.push(end);
  const list = path.join(input.dir, "list.txt");
  fs.writeFileSync(list, segs.map((s) => `file '${s.replace(/'/g, "'\\''")}'`).join("\n"));
  const joined = path.join(input.dir, "joined.mp4");
  await exec("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", joined]);
  const total = await duration(joined);
  const cues = ugcCues(input.captions, durations);
  const ass = path.join(input.dir, "subs.ass");
  fs.writeFileSync(ass, ugcAss(cues, total, size, input.accent, input.label ?? aiLabel()));
  const esc = (p: string) => p.replace(/\\/g, "/").replace(/:/g, "\\:").replace(/'/g, "\\'");
  await exec("ffmpeg", ["-y", "-loglevel", "error", "-i", joined, "-vf", `subtitles='${esc(ass)}':fontsdir='${esc(FONT_DIR)}'`, "-c:v", "libx264", "-preset", "slow", "-crf", "21", "-pix_fmt", "yuv420p", "-c:a", "copy", "-movflags", "+faststart", input.out]);
  return { durations, total: await duration(input.out), cues };
}

// ------------------------------------------------------------------ production

export async function produceUgc(ctx: JobContext, projectId: string, req: { options: UgcOptions; script: UgcScript }) {
  let project = loadProject(projectId);
  const brand = project.brand;
  if (!brand) throw new UserFacingError(L("Définissez la marque avant de produire une vidéo UGC.", "Set up the brand before producing a UGC video."));
  assertQuota(project.userId, "ugc");
  if (!hasAiCredits(project.userId)) throw new UserFacingError(L("Vous avez atteint la limite d'utilisation équitable de l'IA de votre forfait pour ce mois-ci : la vidéo UGC pourra être créée au renouvellement.", "You've reached your plan's fair-use AI limit for this month: the UGC video can be created when it renews."));
  const video = videoProviderAvailable();
  if (!video) throw new UserFacingError(L("Aucun fournisseur vidéo configuré (Google Veo ou fal.ai) : la vidéo UGC ne peut pas être générée.", "No video provider configured (Google Veo or fal.ai): the UGC video can't be generated."));
  if (!imageProviderAvailable()) throw new UserFacingError(L("Aucun fournisseur d'images configuré (Google Gemini ou OpenAI) : la personne de la vidéo ne peut pas être créée.", "No image provider configured (Google Gemini or OpenAI): the person in the video can't be created."));
  // Personne et produit sont générés par l'IA : sans IA de vision pour les contrôler, rien n'est généré ni payé.
  if (!llmConfigured()) throw new UserFacingError(L("Le contrôle des images générées n'est pas disponible : la vidéo UGC n'est pas créée, car la fidélité du produit ne pourrait pas être vérifiée.", "Checking generated images isn't available: the UGC video isn't created, because product fidelity couldn't be verified."));
  const script = cleanUgcScript(req.script);
  const services = isServices(project);
  const subject = services ? "service" : "product";
  const issues = [...ugcIssues(script, contentLang(), uiLang()), ...(services ? serviceUgcIssues(script) : [])];
  if (issues.length) throw new UserFacingError(issues.join(" "));
  const o = req.options;
  const cutouts = await ensureCutouts(ctx, project);
  if (!cutouts.length && !services) throw new UserFacingError(L("Importez une photo du produit : la vidéo UGC montre le produit réel.", "Upload a product photo: the UGC video shows the real product."));
  project = loadProject(projectId);
  // Services : la référence n'est qu'une ambiance (photo réelle du lieu, sinon nuancier de la marque).
  const pal0 = palette(project);
  const realPhoto = services ? realActivityPhotos(projectId)[0] : undefined;
  const product = cutouts[0]
    ? assetData(cutouts[0])
    : realPhoto
      ? await sharp(assetData(realPhoto)).rotate().jpeg({ quality: 88 }).toBuffer()
      : await sharp({ create: { width: 512, height: 512, channels: 3, background: pal0.light } }).composite([{ input: await sharp({ create: { width: 512, height: 256, channels: 3, background: pal0.primary } }).png().toBuffer(), left: 0, top: 256 }]).jpeg().toBuffer();
  const sourceId = cutouts[0]?.id ?? realPhoto?.id ?? null;
  const base = { userId: project.userId, projectId, jobId: ctx.job.id };
  const n = script.beats.length;
  const withVoice = video === "google";
  const notes: string[] = [];

  // 1. Images d'ouverture : même personne d'un plan à l'autre, produit contrôlé.
  const frameIds: string[] = [];
  for (let i = 0; i < n; i++) {
    const fid = await ctx.step(`frame:${i}`, async () => {
      ctx.progress(0.05 + (i / n) * 0.25, L(`Création de la personne et du décor (plan ${i + 1}/${n})`, `Creating the person and the set (shot ${i + 1}/${n})`));
      const persona = frameIds[0] ? assetData(getAsset(frameIds[0])!) : undefined;
      let best: { buf: Buffer; score: number } | null = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        const buf = await ugcFrame({ ...base, usageKey: `${ctx.job.id}:frame:${i}:${attempt}` }, { prompt: framePrompt(script, i, subject), product, persona, aspect: o.format, subject });
        const qc = await ugcCheck(base, `${ctx.job.id}:frameqc:${i}:${attempt}`, services, product, buf);
        if (!best || qc.score > best.score) best = { buf, score: qc.score };
        if (qc.ok) break;
      }
      // Deux essais refusés au contrôle : la vidéo n'est pas montée avec un produit réinventé (ni décomptée).
      if (best!.score < QC_MIN_SCORE) throw new UserFacingError(services
        ? L(`Plan ${i + 1} : l'image générée n'a pas passé le contrôle qualité (${best!.score}/10). La vidéo n'est pas créée et ne vous est pas décomptée ; relancez-la ou modifiez le décor.`, `Shot ${i + 1}: the generated image failed the quality check (${best!.score}/10). The video isn't created and isn't counted; try again or change the setting.`)
        : L(`Plan ${i + 1} : le produit n'a pas pu être reproduit fidèlement (contrôle ${best!.score}/10). La vidéo n'est pas créée et ne vous est pas décomptée ; essayez avec une autre photo du produit, nette et sur fond uni.`, `Shot ${i + 1}: the product couldn't be reproduced faithfully (check ${best!.score}/10). The video isn't created and isn't counted; try another sharp product photo on a plain background.`));
      const a = await saveAsset({ projectId, userId: project.userId, data: await sharp(best!.buf).jpeg({ quality: 92 }).toBuffer(), name: `${slug(project.product.name || brand.name)}-ugc-${C("plan", "shot")}-${i + 1}.jpg`, mime: "image/jpeg", role: "ugc-frame", folderKey: "videos.social", origin: "generated", sourceAssetId: sourceId, meta: { recipe: services ? L("Image d'ouverture d'une présentation face caméra : personne et décor générés (ni client, ni professionnel réel)", "Opening frame of an on-camera presentation: generated person and set (neither a customer nor the real professional)") : L("Image d'ouverture d'un plan UGC : personne et décor générés, produit réel en référence", "Opening frame of a UGC shot: generated person and set, real product as reference"), aiGenerated: true, qcScore: best!.score }, status: "review" });
      return { id: a.id, score: best!.score };
    });
    frameIds.push(fid.id);
    if (fid.score < 7) notes.push(L(`Plan ${i + 1} : vérifiez que le produit est fidèle (contrôle ${fid.score}/10).`, `Shot ${i + 1}: check that the product is accurate (check score ${fid.score}/10).`));
  }

  // 2. Plans animés.
  const clipIds: string[] = [];
  for (let i = 0; i < n; i++) {
    const cid = await ctx.step(`clip:${i}`, async () => {
      ctx.progress(0.3 + (i / n) * 0.5, L(`Tournage du plan ${i + 1}/${n}${withVoice ? " (image, voix et son)" : ""}`, `Shooting shot ${i + 1}/${n}${withVoice ? " (picture, voice and sound)" : ""}`));
      const frame = assetData(getAsset(frameIds[i])!);
      const prompt = beatPrompt(script, i, o, withVoice, subject);
      const usage = { ...base, usageKey: `${ctx.job.id}:clip:${i}` };
      // Le plan animé est contrôlé (milieu et fin) : un produit qui se déforme en cours de plan est refusé ; un second essai.
      let buf: Buffer | null = null;
      const qdir = tmpDir("ugcqc");
      try {
        for (let attempt = 0; attempt < 2 && !buf; attempt++) {
          const u = attempt ? { ...usage, usageKey: `${usage.usageKey}:${attempt}` } : usage;
          const b = video === "google"
            ? await veoClip(u, { image: frame, prompt, aspect: o.format, people: true }, (m) => ctx.progress(0.3 + (i / n) * 0.5, L(`Plan ${i + 1}/${n} : ${m}`, `Shot ${i + 1}/${n}: ${m}`)))
            : await falClip(u, { image: frame, prompt, seconds: 10 }, (m) => ctx.progress(0.3 + (i / n) * 0.5, L(`Plan ${i + 1}/${n} : ${m}`, `Shot ${i + 1}/${n}: ${m}`)));
          const stills = await clipStills(b, qdir, `c${attempt}`);
          let ok = stills.length > 0;
          for (const [k, st] of stills.entries()) {
            if (!ok) break;
            ok = (await ugcCheck(base, `${ctx.job.id}:clipqc:${i}:${attempt}:${k}`, services, product, st)).ok;
          }
          if (ok) buf = b;
        }
      } finally {
        fs.rmSync(qdir, { recursive: true, force: true });
      }
      if (!buf) throw new UserFacingError(L(`Plan ${i + 1} : le plan animé n'a pas passé le contrôle (produit ou personne déformés en cours de plan). La vidéo n'est pas créée et ne vous est pas décomptée.`, `Shot ${i + 1}: the animated shot failed the check (product or person distorted during the shot). The video isn't created and isn't counted.`));
      const a = await saveAsset({ projectId, userId: project.userId, data: buf, name: `${slug(project.product.name || brand.name)}-ugc-${C("plan", "shot")}-${i + 1}.mp4`, mime: "video/mp4", role: "clip", folderKey: "videos.social", origin: "generated", sourceAssetId: frameIds[i], meta: { provider: video, recipe: withVoice ? L("Plan UGC généré (image, voix et son)", "Generated UGC shot (picture, voice and sound)") : L("Plan UGC généré (image, sans voix)", "Generated UGC shot (picture, no voice)"), aiGenerated: true, line: script.beats[i].line }, status: "review" });
      return a.id;
    });
    clipIds.push(cid);
  }

  // 3. Montage.
  ctx.progress(0.85, L("Montage, sous-titres et carte de fin", "Editing, subtitles and end card"));
  const dir = tmpDir("ugc");
  const clips = clipIds.map((id, i) => {
    const f = path.join(dir, `clip-${i}.mp4`);
    fs.writeFileSync(f, assetData(getAsset(id)!));
    return f;
  });
  const colors = palette(project);
  const endCard = await ugcEndCard(UGC_SIZES[o.format], { product: services ? null : product, brand: brand.name, cta: o.url ? o.url : services ? serviceCta(project, true) : C("Lien en description", "Link in description"), colors: { dark: colors.dark, light: colors.light, accent: colors.accent }, heading: brandTypo(project).heading });
  const out = path.join(dir, "ugc.mp4");
  const r = await assembleUgc({ clips, captions: script.beats.map((b) => b.caption || b.line), endCard, format: o.format, accent: colors.accent, out, dir, label: aiLabel() });

  const { stdout } = await exec("ffprobe", ["-v", "error", "-print_format", "json", "-show_streams", "-show_format", out]);
  const probe = JSON.parse(stdout);
  const v = probe.streams.find((s: any) => s.codec_type === "video");
  const audio = probe.streams.find((s: any) => s.codec_type === "audio");
  const technical = { codec: v?.codec_name, pixFmt: v?.pix_fmt, width: v?.width, height: v?.height, duration: Number(probe.format?.duration), audio: audio?.codec_name ?? null, sizeBytes: Number(probe.format?.size) };
  if (technical.codec !== "h264" || technical.pixFmt !== "yuv420p") throw new Error(L("Le fichier vidéo produit n'est pas au format attendu (H.264 yuv420p).", "The rendered video file is not in the expected format (H.264 yuv420p)."));

  ctx.progress(0.95, L("Rangement de la vidéo", "Filing the video"));
  const name = `${slug(project.product.name || brand.name)}-ugc-${o.format.replace(":", "x")}-${Date.now().toString(36)}`;
  const asset = await saveAsset({
    projectId,
    userId: project.userId,
    data: fs.readFileSync(out),
    name: `${name}.mp4`,
    mime: "video/mp4",
    role: "video",
    folderKey: "videos.social",
    origin: "generated",
    sourceAssetId: sourceId,
    meta: {
      kind: "ugc",
      ...(services ? { business: "services", presentation: true } : {}),
      format: o.format,
      script,
      options: o,
      technical,
      issues: notes,
      aiGenerated: true,
      aiLabel: aiLabel(),
      method: services ? (withVoice ? L("Présentation face caméra générée par IA : personne, voix et décor générés (ni client, ni professionnel réel)", "AI-generated on-camera presentation: generated person, voice and set (neither a customer nor the real professional)") : L("Présentation face caméra générée par IA : personne et décor générés, sous-titrée, sans voix", "AI-generated on-camera presentation: generated person and set, subtitled, no voice")) : withVoice ? L("Vidéo UGC générée par IA : personne, voix et décor générés, produit réel en référence", "AI-generated UGC video: generated person, voice and set, real product as reference") : L("Vidéo UGC générée par IA : personne et décor générés, produit réel en référence (sans voix, sous-titrée)", "AI-generated UGC video: generated person and set, real product as reference (no voice, subtitled)"),
      delivered: `MP4 H.264 ${technical.width}×${technical.height}, ${technical.duration.toFixed(1)} s${technical.audio ? L(", son AAC", ", AAC audio") : ""}`,
    },
    status: "review",
  });
  const poster = path.join(dir, "poster.jpg");
  await exec("ffmpeg", ["-y", "-loglevel", "error", "-ss", "1.2", "-i", out, "-frames:v", "1", "-q:v", "2", poster]);
  await saveAsset({ projectId, userId: project.userId, data: await sharp(poster).jpeg({ quality: 88 }).toBuffer(), name: `${name}-${C("affiche", "poster")}.jpg`, mime: "image/jpeg", role: "video-poster", folderKey: "videos.social", origin: "generated", sourceAssetId: asset.id, meta: { recipe: L("Image d'affiche extraite de la vidéo UGC", "Poster frame taken from the UGC video") } });
  await saveAsset({ projectId, userId: project.userId, data: Buffer.from(ugcSrt(r.cues), "utf8"), name: `${name}.srt`, mime: "application/x-subrip", kind: "text", role: "subtitles", folderKey: "videos.social", origin: "generated", sourceAssetId: asset.id, meta: { recipe: L("Sous-titres de la vidéo UGC (SRT)", "UGC video subtitles (SRT)") } });
  fs.rmSync(dir, { recursive: true, force: true });
  return { assetId: asset.id, technical, issues: notes };
}
