/**
 * Audio de la vidéo V2 : voix off (silences de début et de fin retirés), musique (composée par le studio — droits
 * du studio — ou piste de la bibliothèque AVEC licence enregistrée, jamais inventée), effets, atténuation de la
 * musique sous la voix (sidechain), normalisation à l'intensité visée (LUFS) et mesure du résultat.
 */
import fs from "node:fs";
import path from "node:path";
import { synthMusic } from "../media/video";
import { renderSong } from "../media/song";
import { timeline } from "./doc";
import type { VideoDocument } from "./types";
import { execTool } from "../exec-tool";

const exec = execTool;

export type AudioFiles = { voice: Map<string, string>; sfx: Map<string, string>; music: string | null };
export type AudioMeasure = { lufs: number | null; truePeakDb: number | null; durationS: number; silent: boolean };

/**
 * Musique composée par le studio (aucune licence tierce) : un vrai morceau joué par de vrais instruments, dans le
 * style du produit ou du métier ; à défaut (banque d'instruments absente), la musique de secours synthétisée.
 */
export async function synthTrack(doc: VideoDocument, file: string): Promise<string | null> {
  const m = doc.audio.music;
  if (!m || m.source !== "synth" || m.mood === "none") return null;
  const { starts, total } = timeline(doc);
  const style = m.style ?? (m.mood === "pulse" ? "pop" : m.mood === "warm" ? "acoustic" : "calm");
  const song = await renderSong(style, total, m.seed ?? doc.brand.name ?? "studio").catch(() => null);
  fs.writeFileSync(file, song ?? synthMusic(total, m.mood === "pulse" ? "pulse" : "calm", starts.slice(1)));
  return file;
}

/**
 * Mixe les pistes du document en un fichier WAV de la durée exacte de la vidéo. Sans aucune source : silence
 * (la vidéo garde une piste audio, attendue par les plateformes).
 */
export async function mixAudio(doc: VideoDocument, files: AudioFiles, out: string): Promise<string> {
  const { starts, total } = timeline(doc);
  const at = new Map(doc.clips.map((c, k) => [c.id, starts[k]]));
  const inputs: string[] = [];
  const chains: string[] = [];
  const voices: string[] = [];
  const effects: string[] = [];
  let inputCount=0;
  const cleanup:string[]=[];
  const add = (file: string,loop=false) => {
    // L'entrée doit elle-même finir : un atrim en aval n'arrête pas toujours le démultiplexeur
    // bouclé lorsque plusieurs voix et le compresseur latéral attendent sa fin.
    if(loop) inputs.push("-stream_loop","-1","-t",String(total));
    inputs.push("-i", file);
    return inputCount++;
  };
  const trim = "silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse";
  for (const v of doc.audio.voice) {
    const f = v.assetId ? files.voice.get(v.id) : undefined;
    const start = at.get(v.clipId);
    if (!f || start == null) continue;
    const i = add(f);
    const ms = Math.round((start + v.offsetS) * 1000);
    chains.push(`[${i}:a]aformat=sample_rates=44100:channel_layouts=stereo,atrim=0:${Math.max(0.1, v.durationS + 0.4)},volume=${v.gainDb}dB,adelay=${ms}|${ms}[v${voices.length}]`);
    voices.push(`[v${voices.length}]`);
  }
  for (const s of doc.audio.sfx) {
    const f = s.assetId ? files.sfx.get(s.id) : undefined;
    const start = at.get(s.clipId);
    if (!f || start == null) continue;
    const i = add(f);
    const ms = Math.round((start + s.offsetS) * 1000);
    chains.push(`[${i}:a]aformat=sample_rates=44100:channel_layouts=stereo,volume=${s.gainDb}dB,adelay=${ms}|${ms}[e${effects.length}]`);
    effects.push(`[e${effects.length}]`);
  }
  let music: string | null = null;
  if (files.music && doc.audio.music) {
    let musicFile=files.music;
    const start=doc.audio.music.source==="library"?doc.audio.music.startS??0:0;
    if(start>0) {
      const segment=`${out}.music-segment.wav`;fs.mkdirSync(path.dirname(out),{recursive:true});
      try {await exec("ffmpeg",["-y","-v","error","-ss",String(start),"-i",files.music,"-t",String(total),"-ar","44100","-ac","2",segment]);}
      catch(error){fs.rmSync(segment,{force:true});throw error;}
      musicFile=segment;cleanup.push(segment);
    }
    // Loop the finite selected file at the demuxer, not an enormous aloop filter buffer.
    const i = add(musicFile,true);
    // Piste de la banque : entrée et sortie en fondu (jamais une coupure sèche à la fin de la vidéo).
    const fades = doc.audio.music.source === "library" ? `,afade=t=in:st=0:d=0.5,afade=t=out:st=${Math.max(0, total - 1.6).toFixed(2)}:d=1.6` : "";
    // Piste de la banque : lue à partir du moment où elle est lancée (introduction calme sautée).
    chains.push(`[${i}:a]aformat=sample_rates=44100:channel_layouts=stereo,atrim=0:${total},asetpts=PTS-STARTPTS${fades},volume=${doc.audio.music.gainDb}dB[mus]`);
    music = "[mus]";
  }
  let mixInputs: string[] = [...effects];
  if (voices.length) {
    chains.push(`${voices.join("")}amix=inputs=${voices.length}:normalize=0,asplit=2[vox][vkey]`);
    mixInputs.push("[vox]");
    if (music) {
      // Atténuation de la musique sous la voix (environ `duckingDb`) : ratio dérivé de l'atténuation voulue.
      const ratio = Math.max(2, Math.min(20, Math.abs(doc.audio.duckingDb) / 1.5));
      chains.push(`${music}[vkey]sidechaincompress=threshold=0.02:ratio=${ratio}:attack=30:release=350[duck]`);
      mixInputs.push("[duck]");
    } else chains.push(`[vkey]anullsink`);
  } else if (music) mixInputs.push(music);
  if (!mixInputs.length) {
    await exec("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", `anullsrc=r=44100:cl=stereo`, "-t", String(total), out]);
    return out;
  }
  mixInputs = mixInputs.filter(Boolean);
  // Fin du mixage : aigus extrêmes coupés (15 kHz) et limiteur ferme — mesuré : sans cela, l'encodage AAC fait
  // remonter les crêtes de 4 dB au-dessus du maximum sur une musique dense (saturation audible).
  chains.push(`${mixInputs.join("")}amix=inputs=${mixInputs.length}:normalize=0,apad,atrim=0:${total},loudnorm=I=${doc.audio.loudnessLufs}:TP=-2:LRA=11,aresample=44100,lowpass=f=15000,alimiter=limit=0.55:level=false:attack=3:release=60[out]`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  // Bound the complex mix graph: multiple short voices and looping music otherwise compete for filter workers.
  try {await exec("ffmpeg", ["-y", "-v", "error", "-filter_complex_threads", "1", ...inputs, "-filter_complex", chains.join(";"), "-map", "[out]", "-t", String(total), out], { maxBuffer: 16 * 1024 * 1024 });}
  finally {for(const file of cleanup)fs.rmSync(file,{force:true});}
  return out;
}

/** Intensité intégrée (LUFS), crête vraie et durée d'un fichier (contrôle audio de la barrière). */
export async function measureAudio(file: string): Promise<AudioMeasure> {
  const { stderr } = await exec("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-af", "ebur128=peak=true", "-f", "null", "-"], { maxBuffer: 64 * 1024 * 1024 }).catch((e) => ({ stderr: String(e.stderr ?? "") }));
  const summary = stderr.slice(stderr.lastIndexOf("Summary:"));
  const lufs = Number(summary.match(/I:\s+(-?[\d.]+|-inf)\s+LUFS/)?.[1]);
  const peak = Number(summary.match(/Peak:\s+(-?[\d.]+|-inf)\s+dBFS/)?.[1]);
  const { stdout } = await exec("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file]).catch(() => ({ stdout: "0" }));
  const ok = Number.isFinite(lufs);
  return { lufs: ok ? lufs : null, truePeakDb: Number.isFinite(peak) ? peak : null, durationS: Number(stdout) || 0, silent: !ok || lufs < -60 };
}
