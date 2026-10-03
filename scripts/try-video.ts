import fs from "node:fs";
import { loadImage } from "@napi-rs/canvas";
import { renderVideo, srtFromSpec, type VideoSpec } from "../src/lib/media/video";
import { logoPng } from "../src/lib/media/logo";
const S = "/tmp/claude-0/-home-user-Ecom-studio-ia/30a1ccd5-08f9-5162-80f0-38bf5e876ac5/scratchpad";
const product = await loadImage(fs.readFileSync(`${S}/c-serum-cutout.png`));
const images = [await loadImage(fs.readFileSync(`${S}/c-serum-detail0.jpg`)), await loadImage(fs.readFileSync(`${S}/c-serum-scene-window.png`))];
const logo = await loadImage(await logoPng({ name: "Maison Ondine", family: "Cormorant", weight: 500, case: "upper", tracking: 0.18, layout: "wordmark", emblem: "none", color: "#FFFFFF" }, 900));
const fmt = (process.argv[2] || "9:16") as any;
const spec: VideoSpec = { format: fmt, transition: "panel", music: "calm", captions: true, scenes: [
  { kind: "title", duration: 2.4, text: "L'éclat, sans artifice", sub: "Sérum Éclat — Maison Ondine", bg: "brand" },
  { kind: "reveal", duration: 3.2, headline: "30 ml de soin quotidien", motion: "rise" },
  { kind: "callouts", duration: 3.4, heading: "Ce qu'il contient", items: ["Niacinamide", "Acide hyaluronique", "Flacon compte-gouttes en verre ambré"] },
  { kind: "detail", duration: 2.4, image: 0, caption: "Formule détaillée sur l'étiquette" },
  { kind: "scene", duration: 2.2, image: 1 },
  { kind: "end", duration: 3, headline: "Sérum Éclat", cta: "Découvrir", url: "maison-ondine.fr" },
]};
const t = Date.now();
const r = await renderVideo(spec, { product, images, clips: [], logo, palette: { primary: "#8A4B2A", secondary: "#E9D8C4", accent: "#C9A27E", light: "#F6F1EA", dark: "#1E1612" }, typo: { heading: "Cormorant", body: "Jost", headingWeight: 500 }, brand: "Maison Ondine" }, `${S}/video-${fmt.replace(":", "x")}.mp4`);
console.log(r, (Date.now() - t) / 1000, "s");
fs.writeFileSync(`${S}/video.srt`, srtFromSpec(spec));
