/**
 * VOIX OFF des publicités vidéo (guide créatif, règle 11) : voix Kokoro (modèle ouvert Apache 2.0, calculée sur le
 * serveur, AUCUN service payant), déjà utilisée pour les tutoriels (`scripts/tts-kokoro.py`). Disponible quand le
 * modèle est installé (variable `KOKORO_DIR` ou `KOKORO` : dossier kokoro-multi-lang-v1_0 avec model.onnx) ; sinon la
 * vidéo est faite sans voix, et l'aperçu le dit.
 *
 * Texte : français naturel, phrases simples, AUCUNE marque tierce (contrôlé avant), rien d'inventé (seulement le nom,
 * la signature, les étapes et les traits écrits par le client). Environ 55 à 75 mots pour 30 s, ajusté à la durée.
 * Les sous-titres suivent la voix RÉELLEMENT générée (durée mesurée de chaque phrase), deux lignes au plus.
 */
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { execTool } from "../exec-tool";

export const kokoroDir = () => process.env.KOKORO_DIR || process.env.KOKORO || "";
export const voiceAvailable = () => {
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
    const child = spawn("python3", [path.join(process.cwd(), "scripts", "tts-kokoro.py"), "--model-dir", kokoroDir(), "--voice", o.lang === "fr" ? o.voice : "am_michael", "--lang", o.lang === "fr" ? "fr" : "en-us", "--speed", String(o.speed), "--out", out], { stdio: ["pipe", "ignore", "pipe"] });
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

/** Phrase-level timing on measured audio. Chunks are proportional, never word-aligned claims. */
export function measuredCues(clipId:string,text:string,durationS:number,maxChars=32,offsetS=.2) {
  const chunks=subtitleChunks(text,maxChars);
  const chars=chunks.reduce((n,c)=>n+c.length,0);
  let at=offsetS;
  return chunks.map((chunk,k)=>{const fromS=at;at+=durationS*chunk.length/Math.max(1,chars);return {id:`cue-${clipId}-${k}`,clipId,fromS,toS:at,text:chunk};});
}
export function projectVoice(prefs:{voice?:string;voiceId?:string;voiceConsent?:string}) {
  return prefs.voice === "on" && prefs.voiceConsent === "synthetic" && ["ff_siwis","am_michael"].includes(prefs.voiceId??"") ? prefs.voiceId! : null;
}
