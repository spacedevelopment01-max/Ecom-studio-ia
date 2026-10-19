/** Réception locale : vrais MP4, fournisseurs/produits/scénarios synthétiques, aucun appel réseau. */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import sharp from "sharp";

const dir = path.resolve(process.env.DATA_DIR || "");
if (!path.basename(dir).startsWith("ecs-test-video-mission-")) throw Error("DATA_DIR de test isolé requis");
fs.mkdirSync(dir, { recursive: true });
const out = path.join(dir, "public"); fs.mkdirSync(out, { recursive: true });
globalThis.fetch = async () => { throw Error("Aucun réseau autorisé dans ce harnais vidéo"); };
const { createUser } = await import("../src/lib/auth");
const { all, now, run } = await import("../src/lib/db");
const { loadProject } = await import("../src/lib/projects");
const { enqueue, JobContext, UserFacingError } = await import("../src/lib/jobs");
const { saveAsset, getAsset, assetData } = await import("../src/lib/library");
const { seedImageFixture, seedCutout } = await import("../tests/image-v2-fixtures");
const { runThreeScenes, localScenePlan, realThreeScenesDeps } = await import("../src/lib/video-v2/three-scenes");
const { latestVideo, listVideoVersions, saveVideoVersion } = await import("../src/lib/video-v2/store");
const { getSubscription, syncAllowance } = await import("../src/lib/billing");
const { voiceAvailable } = await import("../src/lib/video-v2/voice");
const { rememberPreference } = await import("../src/lib/video-v2/creative-memory");
const { runWithLang } = await import("../src/lib/i18n-server");
type Deps = import("../src/lib/video-v2/three-scenes").ThreeScenesDeps;
const u = await createUser(`video-mission-${crypto.randomUUID()}@test.fr`, "motdepasse-test", "Compte de réception fictif");
getSubscription(u.id); run("UPDATE subscriptions SET status='active',plan='dominer',billing='monthly',owner_user_id=? WHERE user_id=?", u.id, u.id); syncAllowance(u.id);
const token = crypto.randomBytes(32).toString("base64url");
run("INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)", crypto.createHash("sha256").update(token).digest("hex"), u.id, now() + 86400000, now());
const evidence: object[] = [];
const ui: { slug: string; pid: string; token:string }[] = [];

for (const [slug, kind, purpose, aspect, scenes, totalS] of [
  ["produit-publicitaire", "hightech", "ad", "9:16", 4, 20],
  ["service-publicitaire", "restaurant", "ad", "4:5", 4, 20],
  ["produit-organique", "hightech", "post", "1:1", 4, 20],
  ["service-organique", "artisan", "post", "1:1", 4, 20],
] as const) {
  const u=await createUser(`video-lots-${crypto.randomUUID()}@test.invalid`,"motdepasse-test","Compte fictif isolé");
  getSubscription(u.id);run("UPDATE subscriptions SET status='active',plan='dominer',billing='monthly',owner_user_id=? WHERE user_id=?",u.id,u.id);syncAllowance(u.id);
  const token=crypto.randomBytes(32).toString("base64url");run("INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)",crypto.createHash("sha256").update(token).digest("hex"),u.id,now()+86400000,now());
  const pid = seedImageFixture(u.id, kind); ui.push({ slug, pid,token });
  rememberPreference(pid,"voice","on");rememberPreference(pid,"voiceId","ff_siwis");rememberPreference(pid,"voiceConsent","synthetic");
  const logo=await saveAsset({projectId:pid,userId:u.id,data:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="240" height="80"><rect width="240" height="80" fill="#182e25"/><text x="120" y="52" font-size="42" fill="white" text-anchor="middle">TEST</text></svg>'),name:"logo-fictif.svg",mime:"image/svg+xml",role:"logo",origin:"upload",status:"approved"});
  run("UPDATE projects SET brand_json=json_set(brand_json,'$.logo.assetId',?) WHERE id=?",logo.id,pid);
  // Les anciennes fixtures ont des noms de démos : ce sont ici des mires, jamais une instance du projet ONDE.
  run("UPDATE projects SET name=?, product_json=json_set(product_json,'$.name',?), brand_json=json_set(brand_json,'$.name',?) WHERE id=?", `TEST LOCAL ${slug}`, `Mire technique ${slug}`, "Studio de test fictif", pid);
  if (kind === "hightech") await seedCutout(u.id, pid);
  const p = loadProject(pid);
  const plan = localScenePlan(p, null, { as: purpose, scenes, totalS });
  // Titres neutres de mire : aucune qualité créative ou phrase du client n'est validée ici.
  plan.scenes.forEach((s, k) => { s.title = `TEST LOCAL ${k + 1}`; s.voice = ["Un détail à observer.","Une surface à préparer.","Des finitions à préserver.","Un ensemble à vérifier."][k]; }); plan.voiceEnd = "";
  const calls = { plan: 0, still: 0, clip: 0, stock: 0, render: 0 };
  let fail = kind === "hightech";
  const source = async (seconds: number, k: number) => {
    const f = path.join(dir, `${slug}-source-${k}.mp4`);
    execFileSync("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", `testsrc2=size=270x480:rate=12`, "-vf", `hue=h=${k * 58}`, "-t", String(seconds), "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p", f]);
    return fs.readFileSync(f);
  };
  const real = realThreeScenesDeps(null, { userId: u.id, projectId: pid }, { aiText: false });
  const deps: Deps = {
    reviewMedia:async()=>({score:9,sameProduct:true,productAltered:false,characterConsistent:null,offTopic:false,artifacts:false,personVisible:false,issues:[]}),
    writePlan: async () => { calls.plan++; return plan; },
    keyframe: async () => { calls.still++; return sharp({ create: { width: 270, height: 480, channels: 3, background: "#37526a" } }).png().toBuffer(); },
    clip: async (_im, _prompt, _aspect, seconds, key) => {
      calls.clip++;
      if (fail && key.endsWith(":1")) { fail = false; throw new UserFacingError("Interruption simulée après la deuxième image, avant son clip"); }
      return source(seconds, Number(key.split(":").at(-1)));
    },
    stock: async (_p, k, _topic, _aspect, seconds) => {
      calls.stock++;
      return { assetId: (await saveAsset({ projectId: pid, userId: u.id, data: await source(seconds + .1, k), name: `mire-${k}.mp4`, mime: "video/mp4", role: "clip", folderKey: purpose === "ad" ? "videos.ads" : "videos.social", origin: "import", status: "ready", meta: { simulation: true, provenance: "Mire locale synthétique, pas un média Pixabay" } })).id, durationS: seconds + .1 };
    },
    spentMicro: () => 0,
    render: async (...args) => { calls.render++; return real.render(...args); },
    visualCheck: false,
  };
  const job = enqueue({ userId: u.id, projectId: pid, type: "video.scenes", label: "TEST LOCAL — fournisseurs simulés", payload: {} });
  const ctx = new JobContext(job), req = { as: purpose, aspect, scenes, totalS, key: `reception:${pid}` };
  let interruption: unknown = null;
  if (kind === "hightech") {
    try { await runWithLang({ ui: "fr", content: "fr" }, () => runThreeScenes(ctx, pid, req, deps)); } catch (e) { interruption = { error: (e as Error).message, calls: { ...calls } }; }
    assert.equal(calls.still, 2); assert.equal(calls.clip, 2); assert.equal(calls.render, 0);
  }
  const result = await runWithLang({ ui: "fr", content: "fr" }, () => runThreeScenes(new JobContext(all<any>("SELECT * FROM jobs WHERE id=?", job.id)[0]), pid, req, deps));
  run("UPDATE jobs SET status='done',result=?,progress=1 WHERE id=?", JSON.stringify(result), job.id);
  const before = { ...calls }, versions = listVideoVersions(pid, result.docKey).length;
  await runThreeScenes(new JobContext(all<any>("SELECT * FROM jobs WHERE id=?", job.id)[0]), pid, req, deps);
  assert.deepEqual(calls, before); assert.equal(listVideoVersions(pid, result.docKey).length, versions);
  if (kind === "hightech") { assert.equal(calls.still, 4); assert.equal(calls.clip, 5); assert.equal(calls.plan, 1); }
  const a = getAsset(result.videoAssetId!)!, file = path.join(out, `${slug}.mp4`);
  fs.writeFileSync(file, assetData(a));
  const probe = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", file]).toString());
  const video = probe.streams.find((s: any) => s.codec_type === "video"), audio = probe.streams.find((s: any) => s.codec_type === "audio");
  assert.equal(video.codec_name, "h264"); assert.equal(audio.codec_name, "aac");
  assert(Math.abs(Number(probe.format.duration) - totalS) < .12);
  if (aspect === "9:16") { assert.equal(video.width, 1080); assert.equal(video.height, 1920); }
  execFileSync("ffmpeg", ["-v", "error", "-i", file, "-f", "null", "-"]);
  for (const [k, at] of [1, totalS * .4, totalS * .68, totalS - 1].entries()) execFileSync("ffmpeg", ["-y", "-v", "error", "-ss", String(at), "-i", file, "-frames:v", "1", path.join(out, `${slug}-${k + 1}.jpg`)]);
  const cur = latestVideo(pid, result.docKey)!;
  const { doc } = cur;
  fs.writeFileSync(path.join(out, `${slug}-document.json`), JSON.stringify({ simulation: true, ...doc }, null, 2));
  for (const sub of all<any>("SELECT * FROM assets WHERE project_id = ? AND role='subtitles'", pid)) fs.writeFileSync(path.join(out, `${slug}.${sub.mime === "text/vtt" ? "vtt" : "srt"}`), assetData(sub));
  // Protection de la dernière version client : tentative de reprise directe bloquée avant fournisseur.
  const edited = structuredClone(doc); edited.meta.source = "user"; edited.clips[0].label = "Version client à conserver";
  saveVideoVersion(pid, result.docKey, edited);
  await assert.rejects(() => runThreeScenes(null, pid, req, deps), /conservée/);
  assert.deepEqual(latestVideo(pid, result.docKey)!.doc, edited); assert.deepEqual(calls, before);
  evidence.push({ slug, simulation: true, scope: "orchestration, checkpoints natifs et encodage réel ; pas une validation créative", interruption, calls, versionsBeforeUserEdit: versions, userEditPreserved: true, completeReplayNoCalls: true, frame: { width: video.width, height: video.height, codec: video.codec_name, fps: video.r_frame_rate }, audio: { codec: audio.codec_name, ...JSON.parse(a.meta || "{}").videoV2.audio }, durationS: Number(probe.format.duration), notes: result.notes, quality: JSON.parse(a.meta || "{}").finalCheck, sha256: crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex") });
}
assert.equal(all<any>("SELECT COUNT(*) n FROM ai_calls")[0].n, 0);
fs.writeFileSync(path.join(dir, "private-ui.json"), JSON.stringify({ token, ui }), { mode: 0o600 });
fs.writeFileSync(path.join(out, "validation.json"), JSON.stringify({ simulation: true, providerCalls: 0, realProviderCostEur: 0, cpuStorageCostMeasured:false, voiceModelAvailableInThisEnvironment: voiceAvailable(), results: evidence }, null, 2));
console.log("Quatre MP4 locaux avec vraie synthèse française, références et fournisseurs images/clips/vision simulés ; aucun appel fournisseur payant, coût API réel 0 €.");
