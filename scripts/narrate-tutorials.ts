/**
 * Voix off des tutoriels vidéo : une voix d'homme lit, au début de chaque étape, le texte affiché à l'écran
 * (titre et résumé à l'ouverture, consigne finale à la fin). Quand la phrase dure plus longtemps que l'étape,
 * l'image de fin d'étape est tenue le temps qu'il faut (la voix n'est jamais coupée ni accélérée) ; les débuts
 * d'étapes (liste cliquable sous la vidéo) sont recalculés.
 *
 *   PIPER=…/piper VOICE_FR=…/fr_FR-tom-medium.onnx VOICE_EN=…/en_US-ryan-high.onnx npx tsx scripts/narrate-tutorials.ts
 *   ONLY=marque,boutique LANGS=fr …            sélection ; FORCE=1 refait une vidéo qui a déjà une voix (depuis sa copie muette)
 *
 * Voix de synthèse locales (Piper, sans service en ligne) : « Tom » (français) et « Ryan » (anglais), voix d'hommes.
 * Entrée et sortie : public/tutorials/<id>[.en].mp4 et .json ; la vidéo muette d'origine est gardée en
 * scripts/tutorials/silent/ (hors du site) pour pouvoir refaire la voix.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { TUTORIALS, TUTORIAL_IDS, tutorialSlug, type TutorialId } from "../src/lib/tutorials";

const PIPER = process.env.PIPER ?? "piper";
const VOICES = { fr: process.env.VOICE_FR ?? "", en: process.env.VOICE_EN ?? "" };
const OUT = path.join(process.cwd(), "public", "tutorials");
const SILENT = path.join(process.cwd(), "scripts", "tutorials", "silent");
const ids = (process.env.ONLY?.split(",") as TutorialId[] | undefined) ?? TUTORIAL_IDS;
const langs = (process.env.LANGS?.split(",") as ("fr" | "en")[] | undefined) ?? ["fr", "en"];
/** Fin : carton « À vous de jouer » (3,2 s) et son fondu. */
const OUTRO = 3.7;
/** Respiration après chaque phrase avant l'étape suivante. */
const BREATH = 0.45;
/** Petit temps avant que la voix démarre au début d'une étape (le geste commence). */
const LEAD = 0.15;

function run(cmd: string, args: string[], input?: string) {
  return new Promise<void>((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: [input ? "pipe" : "ignore", "ignore", "pipe"] });
    let err = "";
    p.stderr?.on("data", (d) => (err = (err + d).slice(-3000)));
    p.on("error", reject);
    p.on("close", (c) => (c === 0 ? resolve() : reject(new Error(`${cmd} ${c}: ${err}`))));
    if (input) p.stdin!.end(input);
  });
}

const duration = (file: string) => Number(spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).stdout.toString().trim());
const hasAudio = (file: string) => spawnSync("ffprobe", ["-v", "error", "-select_streams", "a", "-show_entries", "stream=index", "-of", "csv=p=0", file]).stdout.toString().trim() !== "";

/** Texte lu : guillemets et signes typographiques retirés, abréviations dites en entier. */
function speakable(text: string, lang: "fr" | "en") {
  let s = text.replace(/[«»"“”]/g, "").replace(/\s+/g, " ").trim();
  if (lang === "fr") s = s.replace(/\bEx\. ?/g, "Par exemple, ").replace(/\bIA\b/g, "I.A.").replace(/\bUGC\b/g, "U.G.C.").replace(/\bPDF\b/g, "P.D.F.");
  else s = s.replace(/\bAI\b/g, "A.I.").replace(/\bUGC\b/g, "U.G.C.");
  return s;
}

async function say(text: string, lang: "fr" | "en", out: string) {
  await run(PIPER, ["-m", VOICES[lang], "-f", out, "--sentence-silence", "0.25", "--length-scale", lang === "fr" ? "1.0" : "1.0"], speakable(text, lang));
}

for (const lang of langs) {
  if (!VOICES[lang] || !fs.existsSync(VOICES[lang])) throw new Error(`voix ${lang} absente : VOICE_${lang.toUpperCase()}`);
  for (const id of ids) {
    const def = TUTORIALS[id];
    const name = `${tutorialSlug(id)}${lang === "en" ? ".en" : ""}`;
    const mp4 = path.join(OUT, `${name}.mp4`);
    const meta = path.join(OUT, `${name}.json`);
    const silent = path.join(SILENT, `${name}.mp4`);
    const silentMeta = path.join(SILENT, `${name}.json`);
    if (!fs.existsSync(mp4)) { console.log(`${name} : vidéo absente, ignorée`); continue; }
    fs.mkdirSync(SILENT, { recursive: true });
    if (!hasAudio(mp4)) {
      fs.copyFileSync(mp4, silent);
      fs.copyFileSync(meta, silentMeta);
    } else if (!process.env.FORCE || !fs.existsSync(silent)) {
      console.log(`${name} : a déjà une voix (FORCE=1 pour la refaire)`);
      continue;
    }
    const src = { video: silent, meta: JSON.parse(fs.readFileSync(silentMeta, "utf8")) as { duration: number; steps: number[] } };
    const total = duration(src.video) || src.meta.duration;
    const t = (fr: string, en: string) => (lang === "en" ? en : fr);

    // Segments : ouverture, une étape par consigne, fin.
    const starts = [0, ...src.meta.steps, Math.max(src.meta.steps[src.meta.steps.length - 1] + 1, total - OUTRO)];
    const texts = [
      `${t("Tutoriel", "Tutorial")} : ${def.title[lang]}. ${def.summary[lang]}`,
      ...def.steps.map((s) => s[lang]),
      t("À vous de jouer ! Revoyez ce tutoriel à tout moment avec le bouton Tutoriel, en haut de l'onglet.", "Your turn! Watch this tutorial again anytime with the Tutorial button at the top of the tab."),
    ];
    if (texts.length !== starts.length) throw new Error(`${name} : ${texts.length} textes pour ${starts.length} segments`);

    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `voix-${name}-`));
    const segs: { from: number; to: number; hold: number; wav: string; speech: number; lead: number }[] = [];
    for (let i = 0; i < starts.length; i++) {
      const wav = path.join(tmp, `s${i}.wav`);
      await say(texts[i], lang, wav);
      const speech = duration(wav);
      const from = starts[i];
      const to = i + 1 < starts.length ? starts[i + 1] : total;
      const lead = i === 0 ? 0.3 : LEAD;
      const need = lead + speech + (i + 1 < starts.length ? BREATH : 0.3);
      segs.push({ from, to, hold: Math.max(0, need - (to - from)), wav, speech, lead });
    }

    // Vidéo : chaque segment, prolongé par son image finale si la phrase est plus longue ; puis assemblage.
    const vf: string[] = [];
    const af: string[] = [];
    segs.forEach((s, i) => {
      vf.push(`[0:v]trim=start=${s.from.toFixed(3)}:end=${s.to.toFixed(3)},setpts=PTS-STARTPTS${s.hold > 0 ? `,tpad=stop_mode=clone:stop_duration=${s.hold.toFixed(3)}` : ""}[v${i}]`);
      const len = s.to - s.from + s.hold;
      af.push(`[${i + 1}:a]aresample=44100,aformat=channel_layouts=mono,adelay=${Math.round(s.lead * 1000)}:all=1,apad,atrim=0:${len.toFixed(3)}[a${i}]`);
    });
    const filter = [...vf, ...af, `${segs.map((_, i) => `[v${i}]`).join("")}concat=n=${segs.length}:v=1:a=0[v]`, `${segs.map((_, i) => `[a${i}]`).join("")}concat=n=${segs.length}:v=0:a=1,loudnorm=I=-16:TP=-1.5:LRA=7[a]`].join(";");
    const out = path.join(tmp, "out.mp4");
    await run("ffmpeg", ["-y", "-i", src.video, ...segs.flatMap((s) => ["-i", s.wav]), "-filter_complex", filter, "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-preset", "slow", "-crf", "30", "-tune", "stillimage", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "96k", "-ar", "44100", "-movflags", "+faststart", out]);
    fs.copyFileSync(out, mp4);

    // Débuts d'étapes dans la vidéo prolongée.
    const round = (x: number) => Math.round(x * 10) / 10;
    let acc = 0;
    const newStarts: number[] = [];
    segs.forEach((s) => {
      newStarts.push(acc);
      acc += s.to - s.from + s.hold;
    });
    fs.writeFileSync(meta, JSON.stringify({ duration: round(duration(mp4)), steps: newStarts.slice(1, 1 + src.meta.steps.length).map(round), voice: true }));
    fs.rmSync(tmp, { recursive: true, force: true });
    const held = segs.reduce((a, s) => a + s.hold, 0);
    console.log(`${name} ✓ voix ajoutée, ${round(duration(mp4))} s (images tenues : +${round(held)} s)`);
  }
}
