/**
 * Vidéos UGC générées par IA : une personne générée présente le produit réel face caméra,
 * façon vidéo de créateur filmée au téléphone.
 *  1. Script (IA ou moteur local) : plans de 8 s, répliques courtes, aucune fausse expérience vécue.
 *  2. Image d'ouverture de chaque plan : personne + décor générés, produit réel donné en référence,
 *     contrôlée contre le détourage (même produit).
 *  3. Plans animés : Veo 3 (image vers vidéo, voix et son générés) ou fal.ai (sans voix).
 *  4. Montage : format vertical ou horizontal, sous-titres, carte de fin à la marque, mention
 *     « Vidéo générée par IA » incrustée pendant toute la vidéo (personne de synthèse réaliste).
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
import { hasAiCredits } from "../ai/access";
import { aiQcImage, aiUgcScript, type UgcScript } from "../ai/tasks";
import { imageProviderAvailable, ugcFrame, veoClip, falClip, videoProviderAvailable } from "../ai/media-providers";
import { brandTypo, confirmedFacts, ensureCutouts, palette } from "./images";
import { FONT_DIR, font } from "../media/fonts";
import { cleanUgcScript, ugcIssues } from "../ugc-rules";

export { cleanUgcScript, ugcIssues };

const exec = promisify(execFile);
const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "produit";

export type UgcFormat = "9:16" | "16:9";
export const UGC_SIZES: Record<UgcFormat, { w: number; h: number }> = { "9:16": { w: 1080, h: 1920 }, "16:9": { w: 1920, h: 1080 } };
/** Durée d'un plan généré (Veo 3 : 8 s). */
export const UGC_BEAT_SECONDS = 8;
const END_SECONDS = 2.5;
export const AI_LABEL = "Vidéo générée par IA";

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
};
export const UGC_TONES: Record<string, { fr: string; en: string }> = {
  enthousiaste: { fr: "enthousiaste et spontané", en: "warm, enthusiastic" },
  naturel: { fr: "naturel, comme à une amie", en: "relaxed, conversational" },
  expert: { fr: "posé et précis", en: "calm, confident" },
};
export const UGC_ANGLES: Record<string, { fr: string; actions: string[] }> = {
  deballage: { fr: "déballage : on découvre le produit", actions: ["opens a package and lifts the product toward the phone camera", "turns the product slowly in their hands to show every side", "points at a detail of the product, close to the lens", "holds the product next to their face and smiles at the camera", "places the product on the table in front of the camera"] },
  demonstration: { fr: "démonstration : on montre le produit en usage", actions: ["holds the product up to the phone camera at chest height", "uses the product naturally in the room", "shows a close-up of the product in their hands", "uses the product again, relaxed and natural", "holds the product toward the camera and nods"] },
  presentation: { fr: "présentation rapide face caméra", actions: ["holds the product beside their face, talking to the phone camera", "tilts the product to show its label to the camera", "points at the product with one finger", "holds the product with both hands toward the lens", "puts the product down and gestures toward it"] },
  probleme: { fr: "situation du quotidien puis le produit qui répond", actions: ["looks at the camera with a slightly puzzled expression, then picks up the product", "shows the product in their hands in the everyday situation", "uses the product naturally in the room", "shows a close-up of the product in their hands", "holds the product toward the camera and smiles"] },
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

/** Script sans IA : présentation à partir des seuls faits confirmés. */
export function localUgcScript(p: Project, o: UgcOptions): UgcScript {
  const n = Math.max(1, Math.min(5, o.beats));
  const name = p.product.name || p.brand?.name || "ce produit";
  const facts = confirmedFacts(p).filter((f) => !name.toLowerCase().startsWith(f.toLowerCase()));
  const angle = pick(UGC_ANGLES, o.angle, "presentation");
  const lines: string[] = [];
  lines.push(o.angle === "deballage" ? `On l'ouvre ensemble ? Voici ${name}, je vous montre tout de près.` : `Regardez bien ça : voici ${name}, je vous le montre en quelques secondes.`);
  const middles = facts.map((f, i) => (i === 0 ? `Premier détail à voir : ${f.charAt(0).toLowerCase()}${f.slice(1)}.` : `Et regardez ici : ${f.charAt(0).toLowerCase()}${f.slice(1)}.`));
  middles.push(`Regardez la forme, les finitions, la taille dans la main : tout est là.`);
  for (let i = 1; i < n - 1; i++) lines.push(middles[(i - 1) % middles.length]);
  if (n > 1) lines.push(o.url ? `Pour le découvrir, tout est sur ${o.url}.` : `Le lien pour le découvrir est juste en dessous de la vidéo.`);
  const caption = (l: string) => (l.length <= 64 ? l : `${l.slice(0, 61).replace(/\s+\S*$/, "")}…`);
  return {
    concept: `${angle.fr}, ${n} plan${n > 1 ? "s" : ""} face caméra`,
    persona: `${pick(UGC_PRESENTERS, o.presenter, "auto")} ${pick(UGC_AGES, o.age, "25-35")}, casual everyday outfit`,
    setting: pick(UGC_SETTINGS, o.setting, "salon"),
    beats: lines.slice(0, n).map((line, i) => ({ line, caption: caption(line), action: i === n - 1 && n > 1 ? angle.actions[4] : angle.actions[i % 4] })),
  };
}

export async function writeUgcScript(ctx: JobContext, projectId: string, o: UgcOptions): Promise<{ script: UgcScript; issues: string[]; engine: "ia" | "local" }> {
  const p = loadProject(projectId);
  if (llmConfigured()) {
    const presenter = `${pick(UGC_PRESENTERS, o.presenter, "auto")} ${pick(UGC_AGES, o.age, "25-35")}`;
    const r = await aiUgcScript({ userId: p.userId, projectId, jobId: ctx.job.id, usageKey: `${ctx.job.id}:ugc` }, p, { beats: o.beats, presenter, setting: pick(UGC_SETTINGS, o.setting, "salon"), tone: pick(UGC_TONES, o.tone, "naturel").fr, angle: pick(UGC_ANGLES, o.angle, "presentation").fr, url: o.url, brief: o.brief });
    const script = cleanUgcScript({ ...r, beats: r.beats.slice(0, o.beats) });
    return { script, issues: ugcIssues(script), engine: "ia" };
  }
  const script = localUgcScript(p, o);
  return { script, issues: ugcIssues(script), engine: "local" };
}

/** Prompt du plan animé : action, réplique (voix générée par Veo 3) et rendu « filmé au téléphone ». */
export function beatPrompt(script: UgcScript, i: number, o: UgcOptions, withVoice: boolean) {
  const b = script.beats[i];
  const tone = pick(UGC_TONES, o.tone, "naturel").en;
  return [
    `Vertical smartphone UGC video. ${script.persona}, in ${script.setting}, ${b.action}.`,
    withVoice ? `The person looks into the phone camera and says in French, in a ${tone} voice, with natural lip sync: "${b.line}"` : `The person talks naturally to the phone camera.`,
    `Handheld phone footage with slight natural movement, realistic hands and face, ambient room sound only, no music, no subtitles, no text on screen. The product keeps exactly the same shape, label and colors as in the first frame.`,
  ].join(" ");
}

function framePrompt(script: UgcScript, i: number) {
  const b = script.beats[i];
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

function ugcAss(cues: { start: number; end: number; text: string }[], total: number, size: { w: number; h: number }, accent: string) {
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
Dialogue: 1,${assTime(0)},${assTime(total)},Label,,0,0,0,,${AI_LABEL}
${cues.map((c) => `Dialogue: 0,${assTime(c.start)},${assTime(c.end)},Cap,,0,0,0,,${assText(c.text)}`).join("\n")}
`;
}

/** Carte de fin : produit réel, nom de la marque et appel à l'action, aux couleurs de la marque. */
export async function ugcEndCard(size: { w: number; h: number }, input: { product: Buffer; brand: string; cta: string; colors: { dark: string; light: string; accent: string }; heading: string }) {
  const c = createCanvas(size.w, size.h);
  const g = c.getContext("2d");
  const grad = g.createLinearGradient(0, 0, 0, size.h);
  grad.addColorStop(0, input.colors.dark);
  grad.addColorStop(1, "#000000");
  g.fillStyle = grad;
  g.fillRect(0, 0, size.w, size.h);
  const vertical = size.h > size.w;
  const img = await loadImage(await sharp(input.product).png().toBuffer());
  const box = vertical ? size.w * 0.62 : size.h * 0.6;
  const k = Math.min(box / img.width, box / img.height);
  const pw = img.width * k, ph = img.height * k;
  const cx = vertical ? size.w / 2 : size.w * 0.32;
  const cy = vertical ? size.h * 0.4 : size.h / 2;
  const halo = g.createRadialGradient(cx, cy, 0, cx, cy, box * 0.75);
  halo.addColorStop(0, `${input.colors.accent}55`);
  halo.addColorStop(1, "transparent");
  g.fillStyle = halo;
  g.fillRect(0, 0, size.w, size.h);
  g.drawImage(img, cx - pw / 2, cy - ph / 2, pw, ph);
  g.textAlign = vertical ? "center" : "left";
  const tx = vertical ? size.w / 2 : size.w * 0.58;
  let ty = vertical ? size.h * 0.72 : size.h * 0.44;
  g.fillStyle = input.colors.light;
  let fsz = vertical ? 92 : 84;
  g.font = font(input.heading, 600, fsz);
  const maxW = vertical ? size.w * 0.84 : size.w * 0.36;
  while (g.measureText(input.brand).width > maxW && fsz > 40) g.font = font(input.heading, 600, (fsz -= 4));
  g.fillText(input.brand, tx, ty);
  ty += vertical ? 96 : 92;
  g.font = font("Inter", 600, vertical ? 42 : 38);
  const ctaW = g.measureText(input.cta).width + 72;
  const bx = vertical ? tx - ctaW / 2 : tx;
  g.fillStyle = input.colors.accent;
  g.beginPath();
  g.roundRect(bx, ty - 50, ctaW, 80, 40);
  g.fill();
  g.fillStyle = "#FFFFFF";
  g.fillText(input.cta, vertical ? tx : tx + 36, ty + 4);
  return c.toBuffer("image/png");
}

async function hasAudio(file: string) {
  const { stdout } = await exec("ffprobe", ["-v", "error", "-select_streams", "a", "-show_entries", "stream=index", "-of", "csv=p=0", file]);
  return stdout.trim().length > 0;
}
async function duration(file: string) {
  const { stdout } = await exec("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]);
  return Number(stdout.trim()) || 0;
}

/**
 * Assemble les plans générés : recadrage au format, piste son homogène (silence si le plan n'en a pas),
 * carte de fin, sous-titres et mention IA incrustés. Retourne les durées réelles et les sous-titres.
 */
export async function assembleUgc(input: { clips: string[]; captions: string[]; endCard: Buffer; format: UgcFormat; accent: string; out: string; dir: string }) {
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
  fs.writeFileSync(ass, ugcAss(cues, total, size, input.accent));
  const esc = (p: string) => p.replace(/\\/g, "/").replace(/:/g, "\\:").replace(/'/g, "\\'");
  await exec("ffmpeg", ["-y", "-loglevel", "error", "-i", joined, "-vf", `subtitles='${esc(ass)}':fontsdir='${esc(FONT_DIR)}'`, "-c:v", "libx264", "-preset", "slow", "-crf", "21", "-pix_fmt", "yuv420p", "-c:a", "copy", "-movflags", "+faststart", input.out]);
  return { durations, total: await duration(input.out), cues };
}

// ------------------------------------------------------------------ production

export async function produceUgc(ctx: JobContext, projectId: string, req: { options: UgcOptions; script: UgcScript }) {
  let project = loadProject(projectId);
  const brand = project.brand;
  if (!brand) throw new UserFacingError("Définissez la marque avant de produire une vidéo UGC.");
  if (!hasAiCredits(project.userId)) throw new UserFacingError("La vidéo UGC est créée par l'IA : elle est disponible avec l'abonnement (crédits de création). Vos crédits sont épuisés ou vous êtes en essai gratuit.");
  const video = videoProviderAvailable();
  if (!video) throw new UserFacingError("Aucun fournisseur vidéo configuré (Google Veo ou fal.ai) : la vidéo UGC ne peut pas être générée.");
  if (!imageProviderAvailable()) throw new UserFacingError("Aucun fournisseur d'images configuré (Google Gemini ou OpenAI) : la personne de la vidéo ne peut pas être créée.");
  const script = cleanUgcScript(req.script);
  const issues = ugcIssues(script);
  if (issues.length) throw new UserFacingError(issues.join(" "));
  const o = req.options;
  const cutouts = await ensureCutouts(ctx, project);
  if (!cutouts.length) throw new UserFacingError("Importez une photo du produit : la vidéo UGC montre le produit réel.");
  project = loadProject(projectId);
  const product = assetData(cutouts[0]);
  const base = { userId: project.userId, projectId, jobId: ctx.job.id };
  const n = script.beats.length;
  const withVoice = video === "google";
  const notes: string[] = [];

  // 1. Images d'ouverture : même personne d'un plan à l'autre, produit contrôlé.
  const frameIds: string[] = [];
  for (let i = 0; i < n; i++) {
    const fid = await ctx.step(`frame:${i}`, async () => {
      ctx.progress(0.05 + (i / n) * 0.25, `Création de la personne et du décor (plan ${i + 1}/${n})`);
      const persona = frameIds[0] ? assetData(getAsset(frameIds[0])!) : undefined;
      let best: { buf: Buffer; score: number } | null = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        const buf = await ugcFrame({ ...base, usageKey: `${ctx.job.id}:frame:${i}:${attempt}` }, { prompt: framePrompt(script, i), product, persona, aspect: o.format });
        if (!llmConfigured()) {
          best = { buf, score: 10 };
          break;
        }
        const qc = await aiQcImage({ ...base, usageKey: `${ctx.job.id}:frameqc:${i}:${attempt}` }, product, buf);
        const score = qc.sameProduct ? qc.score : 0;
        if (!best || score > best.score) best = { buf, score };
        if (qc.sameProduct && qc.score >= 7) break;
      }
      const a = await saveAsset({ projectId, userId: project.userId, data: await sharp(best!.buf).jpeg({ quality: 92 }).toBuffer(), name: `${slug(project.product.name || brand.name)}-ugc-plan-${i + 1}.jpg`, mime: "image/jpeg", role: "ugc-frame", folderKey: "videos.social", origin: "generated", sourceAssetId: cutouts[0].id, meta: { recipe: "Image d'ouverture d'un plan UGC : personne et décor générés, produit réel en référence", aiGenerated: true, qcScore: best!.score }, status: "review" });
      return { id: a.id, score: best!.score };
    });
    frameIds.push(fid.id);
    if (fid.score < 7) notes.push(`Plan ${i + 1} : vérifiez que le produit est fidèle (contrôle ${fid.score}/10).`);
  }

  // 2. Plans animés.
  const clipIds: string[] = [];
  for (let i = 0; i < n; i++) {
    const cid = await ctx.step(`clip:${i}`, async () => {
      ctx.progress(0.3 + (i / n) * 0.5, `Tournage du plan ${i + 1}/${n}${withVoice ? " (image, voix et son)" : ""}`);
      const frame = assetData(getAsset(frameIds[i])!);
      const prompt = beatPrompt(script, i, o, withVoice);
      const usage = { ...base, usageKey: `${ctx.job.id}:clip:${i}` };
      const buf = video === "google"
        ? await veoClip(usage, { image: frame, prompt, aspect: o.format, people: true }, (m) => ctx.progress(0.3 + (i / n) * 0.5, `Plan ${i + 1}/${n} : ${m}`))
        : await falClip(usage, { image: frame, prompt, seconds: 10 }, (m) => ctx.progress(0.3 + (i / n) * 0.5, `Plan ${i + 1}/${n} : ${m}`));
      const a = await saveAsset({ projectId, userId: project.userId, data: buf, name: `${slug(project.product.name || brand.name)}-ugc-plan-${i + 1}.mp4`, mime: "video/mp4", role: "clip", folderKey: "videos.social", origin: "generated", sourceAssetId: frameIds[i], meta: { provider: video, recipe: withVoice ? "Plan UGC généré (image, voix et son)" : "Plan UGC généré (image, sans voix)", aiGenerated: true, line: script.beats[i].line }, status: "review" });
      return a.id;
    });
    clipIds.push(cid);
  }

  // 3. Montage.
  ctx.progress(0.85, "Montage, sous-titres et carte de fin");
  const dir = tmpDir("ugc");
  const clips = clipIds.map((id, i) => {
    const f = path.join(dir, `clip-${i}.mp4`);
    fs.writeFileSync(f, assetData(getAsset(id)!));
    return f;
  });
  const colors = palette(project);
  const endCard = await ugcEndCard(UGC_SIZES[o.format], { product, brand: brand.name, cta: o.url ? o.url : "Lien en description", colors: { dark: colors.dark, light: colors.light, accent: colors.accent }, heading: brandTypo(project).heading });
  const out = path.join(dir, "ugc.mp4");
  const r = await assembleUgc({ clips, captions: script.beats.map((b) => b.caption || b.line), endCard, format: o.format, accent: colors.accent, out, dir });

  const { stdout } = await exec("ffprobe", ["-v", "error", "-print_format", "json", "-show_streams", "-show_format", out]);
  const probe = JSON.parse(stdout);
  const v = probe.streams.find((s: any) => s.codec_type === "video");
  const audio = probe.streams.find((s: any) => s.codec_type === "audio");
  const technical = { codec: v?.codec_name, pixFmt: v?.pix_fmt, width: v?.width, height: v?.height, duration: Number(probe.format?.duration), audio: audio?.codec_name ?? null, sizeBytes: Number(probe.format?.size) };
  if (technical.codec !== "h264" || technical.pixFmt !== "yuv420p") throw new Error("Le fichier vidéo produit n'est pas au format attendu (H.264 yuv420p).");

  ctx.progress(0.95, "Rangement de la vidéo");
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
    sourceAssetId: cutouts[0].id,
    meta: {
      kind: "ugc",
      format: o.format,
      script,
      options: o,
      technical,
      issues: notes,
      aiGenerated: true,
      aiLabel: AI_LABEL,
      method: withVoice ? "Vidéo UGC générée par IA : personne, voix et décor générés, produit réel en référence" : "Vidéo UGC générée par IA : personne et décor générés, produit réel en référence (sans voix, sous-titrée)",
      delivered: `MP4 H.264 ${technical.width}×${technical.height}, ${technical.duration.toFixed(1)} s${technical.audio ? ", son AAC" : ""}`,
    },
    status: "review",
  });
  const poster = path.join(dir, "poster.jpg");
  await exec("ffmpeg", ["-y", "-loglevel", "error", "-ss", "1.2", "-i", out, "-frames:v", "1", "-q:v", "2", poster]);
  await saveAsset({ projectId, userId: project.userId, data: await sharp(poster).jpeg({ quality: 88 }).toBuffer(), name: `${name}-affiche.jpg`, mime: "image/jpeg", role: "video-poster", folderKey: "videos.social", origin: "generated", sourceAssetId: asset.id, meta: { recipe: "Image d'affiche extraite de la vidéo UGC" } });
  await saveAsset({ projectId, userId: project.userId, data: Buffer.from(ugcSrt(r.cues), "utf8"), name: `${name}.srt`, mime: "application/x-subrip", kind: "text", role: "subtitles", folderKey: "videos.social", origin: "generated", sourceAssetId: asset.id, meta: { recipe: "Sous-titres de la vidéo UGC (SRT)" } });
  fs.rmSync(dir, { recursive: true, force: true });
  return { assetId: asset.id, technical, issues: notes };
}
