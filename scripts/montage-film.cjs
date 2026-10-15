// Montage d'un film vertical à partir d'une timeline JSON (FFmpeg) : plans coupés, recadrage, ralenti fluide,
// étalonnage commun, transitions, titres animés (fondu + glissé), carte finale, musique + effets, loudness réseaux
// sociaux. Modifier la timeline (plans, durées, titres, sons) puis relancer :
//   node scripts/montage-film.cjs <dossier>/projet/timeline.json
// Options d'un plan : "vitesse" (0,5 = ralenti ×2, images intermédiaires calculées), "recadrage" {x, y} entre 0 et 1
// (position du cadre vertical dans une vidéo horizontale, 0,5 = centre), "poussee" (zoom avant progressif, ex. 0,08).
// Titre : "calque" (PNG fixe, fondu + glissé) ou "sequence" (dossier d'images PNG animées 000.png, 001.png… à la
// cadence du film, jouées à partir de "entree").
const fs = require("fs"), path = require("path"), { execFileSync } = require("child_process");
const root = path.resolve(__dirname, "..");
const tlPath = path.resolve(process.argv[2] ?? "");
const T = JSON.parse(fs.readFileSync(tlPath, "utf8"));
const { largeur: W, hauteur: H, ips, duree } = T.sortie;
const abs = (p) => path.join(root, p);
const args = ["-hide_banner", "-loglevel", "error", "-y"];
const f = [];
let n = 0;
// Plans : coupés, ramenés à 1080 × 1920 (recadrage sans déformation), cadence constante, étalonnés.
for (const p of T.plans) {
  const v = p.vitesse ?? 1, r = p.recadrage ?? { x: 0.5, y: 0.5 };
  args.push("-ss", String(p.debut), "-t", String(+(p.duree * v).toFixed(3)), "-i", abs(p.fichier));
  const lent = v !== 1 ? `setpts=PTS/${v},minterpolate=fps=${ips}:mi_mode=mci:mc_mode=aobmc:vsbmc=1,` : "";
  f.push(`[${n}:v]${lent}scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H}:(iw-${W})*${r.x}:(ih-${H})*${r.y},fps=${ips},setsar=1,trim=duration=${p.duree},setpts=PTS-STARTPTS,${p.poussee ? `zoompan=z='1+${p.poussee}*on/${Math.round(p.duree * ips)}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${W}x${H}:fps=${ips},` : ""}${T.etalonnage},format=yuv420p[v${n}]`);
  n++;
}
// Enchaînement par transitions (xfade).
let cur = "v0", t = T.plans[0].duree;
T.plans.slice(1).forEach((p, i) => {
  const d = p.transition.duree;
  f.push(`[${cur}][v${i + 1}]xfade=transition=${p.transition.type}:duration=${d}:offset=${(t - d).toFixed(3)}[x${i + 1}]`);
  cur = `x${i + 1}`;
  t += p.duree - d;
});
// Carte finale noire jusqu'à la durée totale.
const cf = T.carte_finale, cardLen = duree - t + cf.transition.duree;
args.push("-f", "lavfi", "-t", cardLen.toFixed(3), "-i", `color=c=${cf.couleur}:s=${W}x${H}:r=${ips}`);
f.push(`[${n}:v]format=yuv420p,setsar=1[card]`, `[${cur}][card]xfade=transition=${cf.transition.type}:duration=${cf.transition.duree}:offset=${(t - cf.transition.duree).toFixed(3)}[base]`);
n++;
// Titres : calques PNG, fondu d'entrée/sortie et léger glissé vers le haut.
cur = "base";
T.titres.forEach((ti, i) => {
  const out = Math.min(ti.sortie, duree);
  if (ti.sequence) {
    args.push("-framerate", String(ips), "-i", path.join(abs(ti.sequence), "%03d.png"));
    f.push(`[${n}:v]format=rgba,tpad=start_duration=${ti.entree}:color=0x00000000[t${i}]`);
    f.push(`[${cur}][t${i}]overlay=x=0:y=0:eof_action=pass:format=auto[o${i}]`);
    cur = `o${i}`;
    n++;
    return;
  }
  args.push("-loop", "1", "-t", String(duree), "-i", abs(ti.calque));
  const fadeOut = out < duree ? `,fade=t=out:st=${(out - 0.4).toFixed(2)}:d=0.4:alpha=1` : "";
  f.push(`[${n}:v]format=rgba,fade=t=in:st=${ti.entree}:d=0.7:alpha=1${fadeOut}[t${i}]`);
  const y = ti.glisse ? `'if(lt(t,${ti.entree}),${ti.glisse},max(0,${ti.glisse}-(t-${ti.entree})*${ti.glisse}/0.7))'` : "0";
  f.push(`[${cur}][t${i}]overlay=x=0:y=${y}:enable='between(t,${ti.entree},${out})'[o${i}]`);
  cur = `o${i}`;
  n++;
});
// Audio : musique + effets placés au bon instant, mixés puis normalisés.
const A = T.audio, aIn = [];
args.push("-i", abs(A.musique.fichier));
aIn.push(`[${n}:a]volume=${A.musique.volume},atrim=0:${duree},apad=whole_dur=${duree}[m]`);
const mixes = ["[m]"];
n++;
let k = 0;
for (const e of A.effets) {
  for (const at of [].concat(e.a)) {
    args.push("-i", abs(e.fichier));
    aIn.push(`[${n}:a]volume=${e.volume},adelay=${Math.round(at * 1000)}:all=1[e${k}]`);
    mixes.push(`[e${k}]`);
    n++; k++;
  }
}
aIn.push(`${mixes.join("")}amix=inputs=${mixes.length}:normalize=0:duration=first,afade=t=out:st=${duree - 1.2}:d=1.2,loudnorm=I=-14:TP=-1:LRA=11,aresample=48000[a]`);
const filter = [...f, ...aIn].join(";");
fs.writeFileSync(path.join(path.dirname(tlPath), "filtre-ffmpeg.txt"), filter.replace(/;/g, ";\n"));
args.push("-filter_complex", filter, "-map", `[${cur}]`, "-map", "[a]", "-t", String(duree), "-r", String(ips), "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-profile:v", "high", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-c:a", "aac", "-b:a", "256k", abs(T.sortie.fichier));
execFileSync("ffmpeg", args, { stdio: "inherit" });
console.log("film rendu :", T.sortie.fichier);
