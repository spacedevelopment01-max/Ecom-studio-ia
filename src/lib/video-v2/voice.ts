/** Voix : OpenAI sur choix explicite ; Kokoro conservé pour les anciens choix.
 * Aucune substitution de timbre ou vidéo muette si une voix demandée échoue.
 * Les sous-titres suivent la durée mesurée de la voix, mot à mot (part de chaque mot selon sa longueur, fins de phrase
 * calées sur les silences mesurés) ; exact quand la voix donne l'heure de chaque lettre.
 */
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { execTool } from "../exec-tool";
import { openaiVoiceAvailable, isOpenAIVoice } from "./openai-voice";
export const voiceAvailable = (voice?:string|null) => voice && !isOpenAIVoice(voice) ? legacyVoiceAvailable() : openaiVoiceAvailable();

export const kokoroDir = () => process.env.KOKORO_DIR || process.env.KOKORO || "";
export const legacyVoiceAvailable = () => {
  const d = kokoroDir();
  return !!d && ["model.onnx","voices.bin","tokens.txt","espeak-ng-data","dict","lexicon-us-en.txt"].every(f=>fs.existsSync(path.join(d,f))) && fs.existsSync(path.join(process.cwd(), "scripts", "tts-kokoro.py"));
};

/** Budget de mots pour une durée (55 à 75 mots pour 30 s, au prorata). */
export const wordBudget = (seconds: number, range: [number, number] = [55, 75]) => ({ min: Math.round((range[0] * seconds) / 30), max: Math.round((range[1] * seconds) / 30) });
export const countWords = (t: string) => t.split(/\s+/).filter(Boolean).length;

/** Texte prononcé : sigles épelés, guillemets retirés. */
export function speakable(text: string): string {
  return text.replace(/[«»"“”]/g, "").replace(/\bIA\b/g, "I.A.").replace(/\s+/g, " ").trim();
}

/** Synthèse d'une phrase → fichier WAV ; renvoie sa durée réelle (s). */
export async function synthLine(text: string, out: string, o: { voice: string; speed: number; lang: "fr" | "en" }): Promise<number> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn("python3", [path.join(process.cwd(), "scripts", "tts-kokoro.py"), "--model-dir", kokoroDir(), "--voice", o.voice, "--lang", o.lang === "fr" ? "fr" : "en-us", "--speed", String(o.speed), "--out", out], { stdio: ["pipe", "ignore", "pipe"] });
    let err = "";
    child.stderr.on("data", (d) => (err += String(d)));
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`voix : ${err.slice(-300)}`))));
    child.stdin.end(speakable(text));
  });
  const trimmed=`${out}.trim.wav`;
  await execTool("ffmpeg",["-y","-v","error","-i",out,"-af","silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse",trimmed]);
  fs.renameSync(trimmed,out);
  const probe = await execTool("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", out]);
  return Math.round(parseFloat(probe.stdout.trim()) * 100) / 100;
}

/**
 * Découpe un texte de sous-titre en groupes de sens (virgules, « et », points) pour tenir sur deux lignes
 * (`maxChars` par ligne) : jamais un mot coupé, jamais une ligne orpheline d'un mot.
 */
export function subtitleChunks(text: string, maxChars = 32): string[] {
  const limit = maxChars * 2;
  if (text.length <= limit) return [text];
  const parts = text.split(/(?<=[,;:.!?])\s+|\s+(?=et\s)/).filter(Boolean);
  const out: string[] = [];
  let cur = "";
  for (const part of parts) {
    if (!cur) cur = part;
    else if (`${cur} ${part}`.length <= limit) cur = `${cur} ${part}`;
    else {
      out.push(cur);
      cur = part;
    }
  }
  if (cur) out.push(cur);
  return out.flatMap((c) => {
    if (c.length <= limit) return [c];
    const chunks:string[]=[];let current="";
    for(const word of c.split(/\s+/)) {
      if(word.length>limit) throw new Error("Un mot de sous-titre dépasse la largeur lisible : adaptez le texte, aucun mot coupé.");
      if(current && `${current} ${word}`.length>limit) {chunks.push(current);current=word;}
      else current=current?`${current} ${word}`:word;
    }
    if(current) chunks.push(current);
    return chunks;
  });
}

export type WordTime = { text: string; fromS: number; toS: number };

/**
 * Minutage mot à mot sur la durée MESURÉE de la voix (rapport 09, point 7), sans transcription ni appel payant : chaque
 * mot reçoit une part de la durée selon sa longueur, une ponctuation ajoute la petite pause qu'on entend. Avec les
 * silences mesurés dans le fichier de la voix (`voicePauses`), chaque fin de phrase ou de virgule se cale sur le silence
 * le plus proche. Une voix qui donne l'heure de chaque lettre (ElevenLabs « with-timestamps ») passe par
 * `wordsFromCharacterTimes` : minutage exact.
 */
export function wordTimes(text: string, durationS: number, offsetS = 0.2, pauses: { start: number; end: number }[] = []): WordTime[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (!words.length || !(durationS > 0)) return [];
  const weight = words.map((w) => w.replace(/[^\p{L}\p{N}]/gu, "").length + 2 + (/[,;:]$/.test(w) ? 3 : /[.!?…]$/.test(w) ? 5 : 0));
  const total = weight.reduce((a, b) => a + b, 0);
  let at = offsetS;
  const out = words.map((w, k) => {
    const fromS = at;
    at += (durationS * weight[k]) / total;
    return { text: w, fromS, toS: at };
  });
  // Calage sur les silences : une fin de groupe (ponctuation) prend la fin du silence mesuré le plus proche.
  const abs = pauses.map((q) => ({ start: q.start + offsetS, end: q.end + offsetS }));
  for (let k = 0; k < out.length - 1; k++) {
    if (!/[,;:.!?…]$/.test(out[k].text) || !abs.length) continue;
    const near = abs.reduce((b, q) => (Math.abs(q.start - out[k].toS) < Math.abs(b.start - out[k].toS) ? q : b));
    if (Math.abs(near.start - out[k].toS) > 0.6 || near.start <= out[k].fromS || near.end >= out[k + 1].toS) continue;
    out[k].toS = near.start;
    out[k + 1].fromS = near.end;
  }
  out[out.length - 1].toS = offsetS + durationS;
  return out.map((w) => ({ ...w, fromS: Math.round(w.fromS * 1000) / 1000, toS: Math.round(w.toS * 1000) / 1000 }));
}

/** Minutage exact à partir de l'heure de chaque lettre (ElevenLabs « with-timestamps ») : début et fin de chaque mot. */
export function wordsFromCharacterTimes(a: { characters: string[]; character_start_times_seconds: number[]; character_end_times_seconds: number[] }, offsetS = 0.2): WordTime[] {
  const out: WordTime[] = [];
  let cur: WordTime | null = null;
  a.characters.forEach((c, k) => {
    if (/\s/.test(c)) {
      if (cur) out.push(cur);
      cur = null;
      return;
    }
    if (!cur) cur = { text: "", fromS: offsetS + a.character_start_times_seconds[k], toS: 0 };
    cur.text += c;
    cur.toS = offsetS + a.character_end_times_seconds[k];
  });
  if (cur) out.push(cur);
  return out;
}

/** Silences d'une voix enregistrée (gratuit, ffmpeg) : servent à caler les fins de phrase. */
export async function voicePauses(file: string): Promise<{ start: number; end: number }[]> {
  const r = await execTool("ffmpeg", ["-hide_banner", "-i", file, "-af", "silencedetect=noise=-35dB:d=0.12", "-f", "null", "-"]).catch(() => null);
  const log = `${r?.stdout ?? ""}${(r as { stderr?: string } | null)?.stderr ?? ""}`;
  const starts = [...log.matchAll(/silence_start: ([\d.]+)/g)].map((m) => Number(m[1]));
  const ends = [...log.matchAll(/silence_end: ([\d.]+)/g)].map((m) => Number(m[1]));
  return starts.map((start, k) => ({ start, end: ends[k] ?? start })).filter((q) => q.end > q.start);
}

/** Pages de sous-titres de 2 à 4 mots (règle des vidéos courtes), coupées après une ponctuation ; jamais un mot seul. */
export function wordPages(words: WordTime[], maxWords = 4, maxChars = 28): WordTime[][] {
  const pages: WordTime[][] = [];
  let cur: WordTime[] = [];
  for (const w of words) {
    const len = [...cur, w].map((x) => x.text).join(" ").length;
    if (cur.length && (cur.length >= maxWords || len > maxChars)) (pages.push(cur), (cur = []));
    cur.push(w);
    if (cur.length >= 2 && /[,;:.!?…]$/.test(w.text)) (pages.push(cur), (cur = []));
  }
  if (cur.length) pages.push(cur);
  // Un mot seul en fin de phrase rejoint la page précédente quand elle a de la place.
  for (let k = pages.length - 1; k > 0; k--) if (pages[k].length === 1 && pages[k - 1].length < maxWords) (pages[k - 1].push(...pages[k]), pages.splice(k, 1));
  return pages;
}

/**
 * Sous-titres d'une voix mesurée : pages de 2 à 4 mots, chaque mot avec son heure (le mot dit est surligné au rendu,
 * comme dans CapCut). Tout le texte est gardé, ponctuation comprise.
 */
export function measuredCues(clipId:string,text:string,durationS:number,maxChars=32,offsetS=.2,pauses:{start:number;end:number}[]=[]) {
  const pages=wordPages(wordTimes(text,durationS,offsetS,pauses),4,Math.max(12,Math.min(maxChars,28)));
  return pages.map((page,k)=>({id:`cue-${clipId}-${k}`,clipId,fromS:page[0].fromS,toS:page[page.length-1].toS,text:page.map(w=>w.text).join(" "),words:page}));
}
export function projectVoice(prefs:{voice?:string;voiceId?:string;voiceConsent?:string}) {
  return prefs.voice === "on" && prefs.voiceConsent === "synthetic" && (["ff_siwis","am_michael"].includes(prefs.voiceId??"") || isOpenAIVoice(prefs.voiceId??"")) ? prefs.voiceId! : null;
}
