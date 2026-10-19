/**
 * Outils simulés du Video Engine V2 (tests et `--check` du benchmark) : aucun appel réseau, aucune dépense.
 * Les plans « générés » sont de vrais petits MP4 (mire ffmpeg), contrôlés par des relectures simulées.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { assetData, getAsset, saveAsset } from "@/lib/library";
import type { VideoV2Deps } from "@/lib/video-v2/deps";
import { projectInventory } from "@/lib/video-v2/deps";
import { loadProject } from "@/lib/projects";
import type { ScriptDraft } from "@/lib/video-v2/script";
import type { ShotReview, VideoReview } from "@/lib/video-v2/types";
import { VIDEO_CRITERIA } from "@/lib/video-v2/types";
import { mockImage } from "./image-v2-mock";

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "v2mock-"));

/** Petit MP4 réel (mire animée), `seconds` secondes. */
export function mockMp4(seconds: number, color = "testsrc2"): Buffer {
  const d = tmp();
  const f = path.join(d, "c.mp4");
  execFileSync("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", `${color}=size=270x480:rate=12`, "-t", String(seconds), "-pix_fmt", "yuv420p", "-c:v", "libx264", "-preset", "ultrafast", f]);
  const b = fs.readFileSync(f);
  fs.rmSync(d, { recursive: true, force: true });
  return b;
}

/** Voix simulée : une seconde de silence, puis un son (le silence de début doit être retiré au mixage). */
export function mockVoice(seconds: number): Buffer {
  const d = tmp();
  const f = path.join(d, "v.wav");
  execFileSync("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", `sine=frequency=330:duration=${seconds}`, "-af", "adelay=1000|1000,volume=0.6", "-ar", "44100", f]);
  const b = fs.readFileSync(f);
  fs.rmSync(d, { recursive: true, force: true });
  return b;
}

export const goodShot = (patch: Partial<ShotReview> = {}): ShotReview => ({ score: 8.4, sameProduct: true, productAltered: false, characterConsistent: true, offTopic: false, artifacts: false, issues: [], ...patch });
export const videoReview = (n: number, patch: Partial<VideoReview> = {}): VideoReview => ({ criteria: Object.fromEntries(VIDEO_CRITERIA.map((k) => [k, n])) as VideoReview["criteria"], issues: [], fix: { target: "none", shotId: null, instruction: "" }, ...patch });

export type VideoMockLog = { scripts: number; shotReviews: number; videoReviews: number; clips: { provider: string; model: string; seconds: number; people: boolean; prompt: string }[]; images: number; voices: number };

export function mockVideoDeps(o: {
  userId: string;
  projectId: string;
  canWrite?: boolean;
  canReview?: boolean;
  generationAllowed?: boolean;
  available?: (provider: string) => boolean;
  script?: (n: number) => ScriptDraft | Error;
  shot?: (n: number, prompt: string) => ShotReview | Error;
  video?: (n: number) => VideoReview | Error;
  /** EUR micro par seconde générée (estimation et « dépense » simulée). */
  perSecondMicro?: number;
  voice?: boolean;
  noImage?: boolean;
  noStock?: boolean;
}): { deps: VideoV2Deps; log: VideoMockLog } {
  const log: VideoMockLog = { scripts: 0, shotReviews: 0, videoReviews: 0, clips: [], images: 0, voices: 0 };
  let seed = 400;
  const p = loadProject(o.projectId);
  const deps: VideoV2Deps = {
    canWrite: o.canWrite ?? false,
    canReview: o.canReview ?? true,
    generationAllowed: o.generationAllowed ?? true,
    async writeScript() {
      log.scripts++;
      const r = o.script ? o.script(log.scripts) : new Error("pas de script simulé");
      if (r instanceof Error) throw r;
      return r;
    },
    async reviewShot(_frames, _refs, _text) {
      log.shotReviews++;
      const r = o.shot ? o.shot(log.shotReviews, log.clips.at(-1)?.prompt ?? "") : goodShot();
      if (r instanceof Error) throw r;
      return r;
    },
    async reviewVideo() {
      log.videoReviews++;
      const r = o.video ? o.video(log.videoReviews) : videoReview(8.2);
      if (r instanceof Error) throw r;
      return r;
    },
    async image(req) {
      log.images++;
      if (o.noImage) return null;
      const [w, h] = req.aspect === "16:9" ? [1280, 720] : req.aspect === "1:1" ? [900, 900] : [720, 1280];
      const data = await mockImage(seed++, w, h);
      const a = await saveAsset({ projectId: o.projectId, userId: o.userId, data, name: "image-v2.jpg", mime: "image/jpeg", role: "ambiance", origin: "generated", meta: { gate: { verdict: "FINAL" } } });
      return { assetId: a.id, data };
    },
    async generateClip(req) {
      log.clips.push({ provider: req.provider, model: req.model, seconds: req.seconds, people: req.people, prompt: req.prompt });
      return mockMp4(req.seconds);
    },
    stockClip: p.business === "services" && !o.noStock ? async(req,exclude)=>{
      const a=await saveAsset({projectId:p.id,userId:p.userId,data:mockMp4(req.durationS+.2),name:`stock-simule-${exclude.size}.mp4`,mime:"video/mp4",role:"clip",origin:"import",status:"review",meta:{simulation:true,provenance:"Mire synthétique, aucun média Pixabay",durationS:req.durationS+.2,gate:{verdict:"FINAL",checked:true,fatal:false}}});
      return {assetId:a.id,durationS:req.durationS+.2};
    }:undefined,
    voice: o.voice
      ? async (text) => {
          log.voices++;
          const d=tmp(),f=path.join(d,"trim.wav");
          try {fs.writeFileSync(path.join(d,"source.wav"),mockVoice(Math.max(.6,text.length/18,text.split(/\s+/).length/2.4)));
            execFileSync("ffmpeg",["-y","-v","error","-i",path.join(d,"source.wav"),"-af","silenceremove=start_periods=1:start_threshold=-50dB",f]);
            return {data:fs.readFileSync(f),mime:"audio/wav"};
          } finally {fs.rmSync(d,{recursive:true,force:true});}
        }
      : null,
    available: o.available ?? ((x) => x === "google" || x === "fal"),
    preferred: { provider: "fal", model: "fal-ai/kling-video/v2.1/pro/image-to-video" },
    estimate: (_p, _m, seconds) => seconds * (o.perSecondMicro ?? 100_000),
    inventory: () => projectInventory(p),
    data: (id) => {
      const a = getAsset(id);
      return a ? assetData(a) : null;
    },
  };
  return { deps, log };
}

/** Short, complete phrases for orchestration tests; no creative quality is inferred. */
export const shortVideoScript = (): ScriptDraft => ({sections:[{part:"hook",voice:"Observer ici.",onScreen:"Observer"},{part:"development",voice:"Observer la matière.",onScreen:""},{part:"demonstration",voice:"Vérifier les finitions.",onScreen:""},{part:"conclusion",voice:"Voir l’ensemble.",onScreen:""},{part:"cta",voice:"Découvrir.",onScreen:"Découvrir"}]});
