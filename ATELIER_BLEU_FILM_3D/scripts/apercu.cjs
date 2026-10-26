// Aperçu : rend quelques instants du film (pleine définition) et une planche réduite pour contrôle.
//   node scripts/apercu.cjs 0.5 2 3.8 …   → <scratchpad>/apercu/t<instant>.jpg et planche.jpg
const fs = require("fs"), path = require("path"), { execFileSync } = require("child_process");
const { chromium } = require(require("child_process").execSync("npm root -g").toString().trim() + "/playwright");
const serve = require("./serveur.cjs");
const OUT = process.env.APERCU || "/tmp/claude-0/-home-user-Ecom-studio-ia/f235b84b-cbbf-5d61-b99a-343925306099/scratchpad/apercu";
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const { server, url } = await serve();
  const b = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on("console", (m) => { if (m.type() !== "warning") console.log("page:", m.text()); }); p.on("pageerror", (e) => { console.log("ERREUR:", e.message, e.stack); process.exit(1); });
  await p.goto(url + "/scene/film.html"); await p.waitForFunction(() => window.ready, null, { timeout: 240000 });
  const fichiers = [];
  for (const a of process.argv.slice(2)) {
    const t = Number(a); await p.evaluate((t) => window.renderAt(t), t);
    const f = path.join(OUT, `t${t.toFixed(2)}.jpg`); await p.screenshot({ path: f, type: "jpeg", quality: 90 }); fichiers.push(f);
  }
  await b.close(); server.close();
  const n = fichiers.length, cols = Math.min(n, 6);
  const args = []; fichiers.forEach((f) => args.push("-i", f));
  const filt = fichiers.map((_, i) => `[${i}]scale=300:-1,drawtext=text='${process.argv[2 + i]}':x=8:y=8:fontsize=26:fontcolor=yellow:box=1:boxcolor=black@0.6[v${i}]`).join(";");
  const rows = Math.ceil(n / cols); let lay = [];
  for (let i = 0; i < n; i++) lay.push(`${(i % cols) * 300}_${Math.floor(i / cols) * 534}`);
  execFileSync("ffmpeg", ["-v", "error", "-y", ...args, "-filter_complex", `${filt};${fichiers.map((_, i) => `[v${i}]`).join("")}xstack=inputs=${n}:layout=${lay.join("|")}:fill=black`, path.join(OUT, "planche.jpg")]);
  console.log("planche :", path.join(OUT, "planche.jpg"));
})();
