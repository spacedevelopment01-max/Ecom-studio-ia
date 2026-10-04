import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { serviceCardPlan } from "@/lib/engine/service-media";
import { renderServiceCreatives } from "@/lib/media/creative-html";
import { withContentLang } from "@/lib/i18n-server";
import { emptyProduct } from "@/lib/project-types";

const OUT = process.argv[2];
const lang = (process.argv[3] ?? "fr") as "fr" | "en";
const withPhotos = process.argv[4] === "photos";
const photosBuf = withPhotos ? ["gant-canape.jpg", "protege-canape-chat.jpg"].map((f) => fs.readFileSync(path.join("scripts/demo-products/inputs/situations", f))) : [];
const fr = lang === "fr";
const p: any = {
  id: "x", userId: "u", name: "Atelier", business: "services",
  product: { ...emptyProduct(), name: fr ? "Cabinet Ondine Kinésithérapie" : "Ondine Physiotherapy", category: fr ? "Kinésithérapie" : "Physiotherapy", summary: fr ? "Cabinet de kinésithérapie à Lyon 3e : rééducation, sport et dos, sur rendez-vous." : "Physiotherapy practice in Lyon: rehab, sports and back care, by appointment." },
  brand: { name: "Ondine", tagline: fr ? "Retrouver le plaisir de bouger." : "Enjoy moving again.", story: "", palette: { primary: "#2F5D62", secondary: "#A7C4BC", accent: "#E0A458", light: "#F4F1EA", dark: "#14201F" }, fonts: { heading: "playfair_display_n4", body: "inter_n4" }, direction: "atelier" },
  services: { services: [
    { name: fr ? "Rééducation du dos" : "Back rehabilitation", description: fr ? "Bilan, exercices guidés et conseils pour le quotidien, adaptés à votre situation." : "Assessment, guided exercises and everyday advice tailored to you.", duration: fr ? "45 min" : "45 min" },
    { name: fr ? "Kinésithérapie du sport" : "Sports physiotherapy", description: fr ? "Accompagnement après une blessure et reprise progressive de l'activité." : "Support after an injury and a gradual return to activity.", price: "50 €" },
    { name: fr ? "Drainage lymphatique" : "Lymphatic drainage", description: "" },
  ], area: fr ? "Lyon 3e et alentours" : "Lyon and surroundings", address: "12 rue Paul Bert, 69003 Lyon", phone: "04 78 00 00 00", email: "contact@ondine.fr", hours: fr ? "Lun–Ven 8 h–19 h, sam 9 h–12 h" : "Mon–Fri 8am–7pm, Sat 9am–12pm", bookingUrl: "https://www.doctolib.fr/ondine", contactMode: "booking" },
};
await withContentLang(lang, async () => {
  const plan = serviceCardPlan(p, photosBuf.length, null);
  const cards = plan.map((x) => ({ ...x.card, photo: x.card.photo !== undefined ? photosBuf[x.card.photo] : null }));
  const r = await renderServiceCreatives({ palette: p.brand.palette, typo: { heading: "Playfair Display", body: "Inter", headingWeight: 500 }, brand: "Ondine" }, cards);
  if (!r) throw new Error("no chromium");
  fs.mkdirSync(OUT, { recursive: true });
  for (const [i, x] of r.entries()) fs.writeFileSync(path.join(OUT, `${String(i).padStart(2, "0")}-${plan[i].name}-${x.label.replace(":", "x")}.jpg`), x.jpg);
  console.log(r.length, "visuels");
});
