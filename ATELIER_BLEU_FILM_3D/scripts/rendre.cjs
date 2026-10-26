// Rendu du film image par image (30 i/s, 1080 × 1920) dans le navigateur sans écran, puis assemblage avec le son.
//   node scripts/rendre.cjs [--postes 2] [--de 0] [--a 65.84]
// Étapes : chaque poste rend une tranche → rendu/tranche-N.mp4 ; puis concaténation, normalisation du son
// (−14 LUFS, crête −1 dBTP) et assemblage → ATELIER-BLEU_film-3D_1080x1920.mp4
const fs = require("fs"), path = require("path"), { spawn, execFileSync } = require("child_process");
const { chromium } = require(require("child_process").execSync("npm root -g").toString().trim() + "/playwright");
const serve = require("./serveur.cjs");
const P = path.resolve(__dirname, "..");
const arg = (n, d) => { const i = process.argv.indexOf("--" + n); return i > 0 ? process.argv[i + 1] : d; };
const TL = JSON.parse(fs.readFileSync(path.join(P, "montage/timeline.json"), "utf8"));
const IPS = 30, DE = Number(arg("de", 0)), A = Number(arg("a", TL.duree)), POSTES = Number(arg("postes", 2));
const TOTAL = Math.round((A - DE) * IPS);
const DOSSIER = path.join(P, "rendu"); fs.mkdirSync(DOSSIER, { recursive: true });

async function tranche(n, i0, i1, url) {
  const sortie = path.join(DOSSIER, `tranche-${n}.mp4`);
  const ff = spawn("ffmpeg", ["-v", "error", "-y", "-f", "image2pipe", "-framerate", String(IPS), "-c:v", "mjpeg", "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-pix_fmt", "yuv420p", "-r", String(IPS), sortie], { stdio: ["pipe", "inherit", "inherit"] });
  const b = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on("pageerror", (e) => { console.log("ERREUR:", e.message); process.exit(1); });
  await p.goto(url + "/scene/film.html"); await p.waitForFunction(() => window.ready, null, { timeout: 300000 });
  const t0 = Date.now();
  for (let i = i0; i < i1; i++) {
    await p.evaluate((t) => window.renderAt(t), DE + i / IPS);
    const img = await p.screenshot({ type: "jpeg", quality: 94 });
    if (!ff.stdin.write(img)) await new Promise((r) => ff.stdin.once("drain", r));
    if ((i - i0) % 60 === 0) console.log(`poste ${n} : image ${i - i0}/${i1 - i0} (${((Date.now() - t0) / Math.max(1, i - i0) / 1000).toFixed(2)} s/image)`);
  }
  ff.stdin.end(); await new Promise((r) => ff.on("close", r)); await b.close();
  return sortie;
}

(async () => {
  const { server, url } = await serve();
  const part = Math.ceil(TOTAL / POSTES);
  const tranches = await Promise.all([...Array(POSTES)].map((_, n) => tranche(n, n * part, Math.min(TOTAL, (n + 1) * part), url)));
  server.close();
  fs.writeFileSync(path.join(DOSSIER, "liste.txt"), tranches.map((f) => `file '${f}'`).join("\n"));
  execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", path.join(DOSSIER, "liste.txt"), "-c", "copy", path.join(DOSSIER, "image.mp4")]);
  // son : normalisation en deux passes
  const mes = execFileSync("ffmpeg", ["-hide_banner", "-i", path.join(P, "audio/mixage.wav"), "-af", "loudnorm=I=-14:TP=-1:LRA=11:print_format=json", "-f", "null", "-"], { stdio: ["ignore", "pipe", "pipe"] }).toString() || "";
  let m; try { m = JSON.parse(execFileSync("bash", ["-c", `ffmpeg -hide_banner -i '${path.join(P, "audio/mixage.wav")}' -af loudnorm=I=-14:TP=-1:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p'`]).toString()); } catch { m = null; }
  const ln = m ? `loudnorm=I=-14:TP=-1:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true` : "loudnorm=I=-14:TP=-1:LRA=11";
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", path.join(P, "audio/mixage.wav"), "-af", `${ln},aresample=48000`, path.join(P, "audio/mixage-final.wav")]);
  const fin = path.join(P, DE === 0 && A >= TL.duree ? "ATELIER-BLEU_film-3D_1080x1920.mp4" : `rendu/extrait_${DE}-${A}.mp4`);
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", path.join(DOSSIER, "image.mp4"), "-ss", String(DE), "-t", String(A - DE), "-i", path.join(P, "audio/mixage-final.wav"), "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-shortest", "-movflags", "+faststart", fin]);
  console.log("film :", fin);
})();
