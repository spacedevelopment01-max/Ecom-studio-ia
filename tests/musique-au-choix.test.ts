/**
 * Musique au choix du client sur toutes les vidéos : vidéos en scènes (création guidée et création du projet) et
 * publications animées — avec la musique composée par le studio (par défaut) ou sans musique.
 */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

describe("Musique au choix", async () => {
  const { createUser } = await import("@/lib/auth");
  const { loadProject } = await import("@/lib/projects");
  const { seedImageFixture, seedCutout } = await import("./image-v2-fixtures");
  const { buildSceneDoc, localScenePlan } = await import("@/lib/video-v2/three-scenes");
  const { addStudioMusic } = await import("@/lib/ad-doc/animate-server");

  async function project() {
    const u = await createUser(`mu-${Date.now()}-${Math.random()}@test.fr`, "motdepasse-test", "P");
    const pid = seedImageFixture(u.id, "hightech");
    await seedCutout(u.id, pid);
    return loadProject(pid);
  }

  it("vidéo en scènes : musique par défaut, aucune si le client choisit « sans musique »", async () => {
    const p = await project();
    const plan = localScenePlan(p, null, { as: "post" });
    const clips = plan.scenes.map((_, k) => ({ assetId: `a${k}`, durationS: 5, generated: true }));
    expect(buildSceneDoc(p, clips, plan, "9:16", "post").audio.music).toBeTruthy();
    expect(buildSceneDoc(p, clips, plan, "9:16", "post", undefined, false).audio.music).toBeNull();
  });

  it("publication animée : la musique du studio est bien ajoutée à la vidéo muette", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mu-"));
    const silent = path.join(dir, "v.mp4");
    execFileSync("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", "color=c=black:s=320x320:d=2", "-c:v", "libx264", "-pix_fmt", "yuv420p", silent]);
    const streams = (f: string) => execFileSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_type", "-of", "csv=p=0", f]).toString();
    expect(streams(silent)).not.toContain("audio");
    const out = await addStudioMusic(silent, path.join(dir, "m.mp4"), 2, { style: "calm", seed: "test" });
    expect(streams(out)).toContain("audio");
    expect(streams(out)).toContain("video");
    fs.rmSync(dir, { recursive: true, force: true });
  }, 60_000);
});
