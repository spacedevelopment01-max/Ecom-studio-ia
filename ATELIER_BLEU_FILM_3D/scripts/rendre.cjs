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

// Le film est découpé en morceaux de 5 s : chaque morceau terminé est gardé (rendu/morceau-NNN.mp4), un rendu
// interrompu reprend là où il s'était arrêté.
const MORCEAU = 150;
async function poste(n, file, url) {
  const b = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  let erreur = null; p.on("pageerror", (e) => { erreur = e; });
  await p.goto(url + "/scene/film.html"); await p.waitForFunction(() => window.ready, null, { timeout: 300000 });
  while (file.length) {
    const k = file.shift(), i0 = k * MORCEAU, i1 = Math.min(TOTAL, i0 + MORCEAU);
    const fin = path.join(DOSSIER, `morceau-${String(k).padStart(3, "0")}.mp4`), tmp = fin + ".tmp.mp4";
    const ff = spawn("ffmpeg", ["-v", "error", "-y", "-f", "image2pipe", "-framerate", String(IPS), "-c:v", "mjpeg", "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-pix_fmt", "yuv420p", "-r", String(IPS), tmp], { stdio: ["pipe", "inherit", "inherit"] });
    const t0 = Date.now();
    for (let i = i0; i < i1; i++) {
      await p.evaluate((t) => window.renderAt(t), DE + i / IPS);
      if (erreur) throw erreur;
      const img = await p.screenshot({ type: "jpeg", quality: 94 });
      if (!ff.stdin.write(img)) await new Promise((r) => ff.stdin.once("drain", r));
    }
    ff.stdin.end(); await new Promise((r) => ff.on("close", r)); fs.renameSync(tmp, fin);
    console.log(`poste ${n} : morceau ${k} terminé (${((Date.now() - t0) / (i1 - i0) / 1000).toFixed(2)} s/image)`);
  }
  await b.close();
}

(async () => {
  const { server, url } = await serve();
  const nb = Math.ceil(TOTAL / MORCEAU), nom = (k) => path.join(DOSSIER, `morceau-${String(k).padStart(3, "0")}.mp4`);
  const file = [...Array(nb).keys()].filter((k) => !fs.existsSync(nom(k)));
  console.log(`${nb - file.length}/${nb} morceaux déjà rendus`);
  await Promise.all([...Array(POSTES)].map((_, n) => poste(n, file, url)));
  server.close();
  const tranches = [...Array(nb).keys()].map(nom);
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
