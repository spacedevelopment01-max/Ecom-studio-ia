import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { loadImage } from "@napi-rs/canvas";
import sharp from "sharp";
import { localServiceVideoPlan } from "@/lib/engine/service-media";
import { renderVideo } from "@/lib/media/video";
import { emptyProduct } from "@/lib/project-types";
const [out, fmt, photos] = process.argv.slice(2);
const p: any = { name: "x", business: "services", product: { ...emptyProduct(), name: "Cabinet Ondine Kinésithérapie", summary: "Cabinet de kinésithérapie à Lyon 3e : rééducation, sport et dos." }, brand: { name: "Ondine", tagline: "Retrouver le plaisir de bouger." },
  services: { services: [{ name: "Rééducation du dos", description: "Bilan et exercices guidés.", duration: "45 min" }, { name: "Kinésithérapie du sport", description: "", price: "50 €" }, { name: "Drainage lymphatique", description: "" }], area: "Lyon 3e et alentours", address: "", phone: "04 78 00 00 00", email: "", hours: "Lun–Ven 8 h–19 h", bookingUrl: "https://www.doctolib.fr/ondine", contactMode: "booking" } };
const imgs = photos ? await Promise.all(["gant-canape.jpg", "protege-canape-chat.jpg"].map(async (f) => loadImage(await sharp(`scripts/demo-products/inputs/situations/${f}`).jpeg().toBuffer()))) : [];
const spec = localServiceVideoPlan(p, fmt as any, imgs.length);
console.log(JSON.stringify(spec.scenes.map((s) => s.kind)));
const r = await renderVideo(spec, { product: null, images: imgs, clips: [], logo: null, palette: { primary: "#2F5D62", secondary: "#A7C4BC", accent: "#E0A458", light: "#F4F1EA", dark: "#14201F" }, typo: { heading: "Playfair Display", body: "Inter", headingWeight: 500 }, brand: "Ondine" }, `${out}.mp4`);
console.log(r.duration, r.width, r.height);
let t = 0;
for (const [i, s] of spec.scenes.entries()) { execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-ss", String(t + s.duration * 0.8), "-i", `${out}.mp4`, "-frames:v", "1", `${out}-f${i}.jpg`]); t += s.duration; }
