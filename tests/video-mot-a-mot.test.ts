/** Rapport 09, point 7 : sous-titres mot à mot sur la voix mesurée, 2 à 4 mots par page, mot dit surligné, hors du bas. */
import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { measuredCues, voicePauses, wordPages, wordTimes, wordsFromCharacterTimes } from "@/lib/video-v2/voice";
import { absoluteCues, defaultSubtitleStyle, spokenWord } from "@/lib/video-v2/doc";

describe("sous-titres mot à mot", () => {
  const text = "Une crème légère, qui sent la fleur d'oranger. Elle fond sur la peau.";
  it("chaque mot a son heure, dans l'ordre, sur toute la durée mesurée ; tout le texte est gardé", () => {
    const w = wordTimes(text, 4, 0.2);
    expect(w.map((x) => x.text).join(" ")).toBe(text);
    expect(w[0].fromS).toBe(0.2);
    expect(w.at(-1)!.toS).toBeCloseTo(4.2, 6);
    for (let k = 1; k < w.length; k++) expect(w[k].fromS).toBeGreaterThanOrEqual(w[k - 1].fromS);
    // Un mot long dure plus qu'un mot court.
    const d = (t: string) => { const x = w.find((y) => y.text === t)!; return x.toS - x.fromS; };
    expect(d("d'oranger.")).toBeGreaterThan(d("la"));
  });
  it("pages de 2 à 4 mots, coupées après la ponctuation, jamais un mot seul", () => {
    const pages = wordPages(wordTimes(text, 4));
    expect(pages.every((p) => p.length >= 2 && p.length <= 4)).toBe(true);
    expect(pages.map((p) => p.map((w) => w.text).join(" ")).join(" ")).toBe(text);
    const cues = measuredCues("c1", text, 4, 28);
    expect(cues[0].words?.length).toBeGreaterThanOrEqual(2);
    expect(cues.every((c) => c.text === c.words!.map((w) => w.text).join(" "))).toBe(true);
  });
  it("les fins de phrase se calent sur les silences mesurés de la voix (gratuit)", async () => {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), "mots-"));
    const f = path.join(d, "v.wav");
    // 1,2 s de son, 0,5 s de silence, 1 s de son.
    execFileSync("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", "sine=frequency=300:duration=1.2", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono:d=0.5", "-f", "lavfi", "-i", "sine=frequency=300:duration=1", "-filter_complex", "[0][1][2]concat=n=3:v=0:a=1", "-ar", "44100", f]);
    const pauses = await voicePauses(f);
    fs.rmSync(d, { recursive: true, force: true });
    expect(pauses.length).toBeGreaterThanOrEqual(1);
    expect(pauses[0].start).toBeGreaterThan(1.1);
    expect(pauses[0].start).toBeLessThan(1.3);
    const w = wordTimes("Une belle matière. Elle dure.", 2.7, 0, pauses);
    const end = w.find((x) => x.text === "matière.")!;
    expect(end.toS).toBeCloseTo(pauses[0].start, 2);
  });
  it("minutage exact quand la voix donne l'heure de chaque lettre (ElevenLabs « with-timestamps »)", () => {
    const chars = [..."Un pot."];
    const w = wordsFromCharacterTimes({ characters: chars, character_start_times_seconds: chars.map((_, k) => k * 0.1), character_end_times_seconds: chars.map((_, k) => k * 0.1 + 0.1) }, 0);
    expect(w).toEqual([{ text: "Un", fromS: 0, toS: 0.2 }, { text: "pot.", fromS: expect.closeTo(0.3, 5), toS: expect.closeTo(0.7, 5) }]);
  });
  it("le mot dit est surligné à la couleur de la marque, et les sous-titres verticaux restent hors des 35 % du bas", () => {
    const style = defaultSubtitleStyle({ width: 1080, height: 1920 }, { heading: "Inter", body: "Inter" }, { primary: "#111", secondary: "#222", accent: "#e0662c", dark: "#000", light: "#fff" });
    expect(style.highlight).toBe("#e0662c");
    expect(style.position).toBe("middle");
    // Centre du bloc : milieu + décalage, au-dessus de la ligne des 65 %.
    expect(1920 / 2 + style.offsetY + style.size * 1.25).toBeLessThan(1920 * 0.65);
    const doc = { clips: [{ id: "c1", durationS: 5 }], subtitles: { style, cues: measuredCues("c1", "Un pot de crème.", 2, 28) } } as never;
    const q = absoluteCues(doc)[0];
    expect(spokenWord(q, q.words![0].start + 0.01)).toBe(0);
    expect(spokenWord(q, q.words!.at(-1)!.start + 0.01)).toBe(q.words!.length - 1);
  });
});
